"use server";

import { articleRepository } from "../repositories/articleRepository";
import { articleAnalysisRepository } from "../repositories/articleAnalysisRepository";
import { legalRepository } from "../repositories/legalRepository";
import { getCategoryByLawName, getSearchPriority, getSearchCandidates } from "../domain/lawPolicy";
import { EXTERNAL_LINKS } from "../constants";

/**
 * 의료법령 검색 액션
 * (여러 저장소와 도메인 정책을 조합하여 사용자에게 최종 검색 결과를 제공합니다.)
 */
export async function searchLawsAction(query, threshold = 0.3, count = 20) {
  if (!query?.trim()) return [];
  const keyword = query.trim();

  // 1. 검색어의 의미 분석
  let embedding = null;
  try {
    embedding = await articleAnalysisRepository.getSearchVector(keyword);
  } catch (err) {
    console.error("Vector data retrieval failed.");
  }

  // 2. 검색 수행 (의미 기반 -> 키워드 기반 순으로 보완)
  let results = [];
  if (embedding) {
    const vectorData = await articleRepository.searchArticlesByVector(embedding, threshold, count);
    if (vectorData?.length > 0) {
      results = vectorData.map(item => ({
        ...item,
        lawName: String(item.law_name || ""),
        similarity: item.similarity
      }));
    }
  }

  // 3. 키워드 기반 보조 검색 (도메인 정책 활용)
  if (results.length === 0) {
    const candidates = getSearchCandidates(keyword);
    const merged = new Map();
    
    for (const kw of candidates) {
      const rows = await articleRepository.searchArticlesByText(kw, 50);
      for (const row of rows || []) {
        if (!merged.has(row.id)) merged.set(row.id, row);
      }
      if (merged.size >= 50) break;
    }
    
    results = Array.from(merged.values()).map(row => ({
      ...row,
      lawName: String(row.law_name || ""),
      article: `제${row.article_no}조`,
      title: String(row.article_title || "")
    }));
  }

  // 4. 정보 보완 (업무 분류 등)
  const ids = results.map(r => r.id);
  const catRows = await articleRepository.getArticleCategories(ids);
  const catById = new Map(catRows?.map(r => [r.id, r.category]));

  // 5. 최종 결과 정합성 검토 및 가공
  return results.map(item => {
    const lawName = item.lawName;
    return {
      id: item.id,
      lawName,
      article: item.article || `제${item.article_no}조`,
      title: item.title || String(item.article_title || ""),
      summary: item.content?.slice(0, 60) + (item.content?.length > 60 ? "…" : ""),
      effectiveDate: String(item.effective_date || ""),
      category: String(catById.get(item.id) || "").trim() || getCategoryByLawName(lawName),
      content: item.content,
      source: item.law_serial_no 
        ? EXTERNAL_LINKS.LAW_GO_KR_DETAIL(item.law_serial_no) 
        : EXTERNAL_LINKS.LAW_GO_KR_SEARCH(lawName),
      priority: getSearchPriority(lawName),
      similarity: item.similarity || 0,
    };
  })
  .sort((a, b) => (a.priority - b.priority) || (b.similarity - a.similarity))
  .slice(0, 20);
}

/**
 * 조문 상세 정보 조회 액션
 */
export async function getLawDetailAction(id) {
  if (!id) return null;
  const [lawId, articleNo] = id.split("_");
  
  const lawDetail = await legalRepository.getLawDetail(lawId);
  if (!lawDetail) return null;

  const articles = [].concat(lawDetail.조문?.조문단위 || lawDetail.조문?.조문 || []);
  const target = articles.find(a => (a.조문번호 || a["@번호"]) === articleNo);
  if (!target) return null;

  const lawName = lawDetail.기본정보?.법령명한글 || "법령명 없음";
  const lawSeq = lawDetail.기본정보?.법령일련번호 || "";

  return {
    id,
    lawName,
    article: `제${articleNo}조`,
    title: target.조문제목 || "제목 없음",
    content: (target.조문내용 || "") + "\n" + [].concat(target.항 || []).map(c => String(c.항내용 || "")).join("\n"),
    effectiveDate: lawDetail.기본정보?.시행일자 || "",
    source: EXTERNAL_LINKS.LAW_GO_KR_DETAIL(lawSeq),
  };
}

/**
 * AI 기반 조문 분석 요약 액션
 */
export async function getAiSummaryAction(lawTitle, lawContent) {
  return await articleAnalysisRepository.analyzeArticle(lawTitle, lawContent);
}
