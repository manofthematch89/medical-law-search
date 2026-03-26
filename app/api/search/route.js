export const runtime = "edge";
export const preferredRegion = "icn1";

// ============================================================
// app/api/search/route.js — 법제처 검색 API 프록시 (서버사이드)
//
// 역할: 브라우저 → Next.js API Route → 법제처 API
// CORS 문제 없이 법제처 API를 안전하게 호출
// ============================================================

import { NextResponse } from "next/server";

// 법제처 API는 한국 IP에서만 접근 가능 → 서울 리전 고정
export const preferredRegion = "icn1";

const LAW_API_OC = process.env.LAW_API_OC || "";
const LAW_API_BASE = "https://www.law.go.kr/DRF";

const keywordMap = {
  "차트 보관": "진료기록부 보존기간",
  "차트 보존": "진료기록부 보존기간",
  "병실 크기": "의료기관 시설규격",
  "병실 면적": "의료기관 시설규격",
  "비급여 고지": "비급여 진료비용 고지",
  "비급여 게시": "비급여 진료비용 고지",
  "개인정보 열람": "개인정보 열람 요청",
  "근무시간": "근로시간",
  "설명 동의": "의료행위 설명",
  "수술 동의": "의료행위 설명",
};

function convertKeyword(query) {
  const trimmed = query.trim();
  return keywordMap[trimmed] || trimmed;
}

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function formatDate(dateStr) {
  if (!dateStr || String(dateStr).length !== 8) return String(dateStr || "");
  const s = String(dateStr);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

function getCategoryFromLawName(lawName) {
  if (lawName.includes("의료법")) return "의료법 계열";
  if (lawName.includes("개인정보")) return "개인정보보호법";
  if (lawName.includes("근로기준")) return "근로기준법";
  if (lawName.includes("응급의료")) return "의료법 계열";
  if (lawName.includes("약사법")) return "의료법 계열";
  return "기타";
}

function getPriority(lawName) {
  if (lawName.includes("의료법") || lawName.includes("응급의료") || lawName.includes("약사법")) return 1;
  if (lawName.includes("개인정보")) return 2;
  if (lawName.includes("근로기준")) return 3;
  return 4;
}

function extractArticleContent(articleUnit) {
  const mainContent = articleUnit["조문내용"] || articleUnit.조문내용 || "";
  const subItems = toArray(articleUnit["항"] || articleUnit.항);
  if (!subItems.length) return mainContent;
  const subTexts = subItems.map((item) => item["항내용"] || item.항내용 || "").filter(Boolean).join(" ");
  return mainContent ? `${mainContent} ${subTexts}` : subTexts;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";

    if (!query.trim()) return NextResponse.json([]);

    if (!LAW_API_OC) {
      return NextResponse.json({ error: "LAW_API_OC 환경변수가 설정되지 않았습니다." }, { status: 500 });
    }

    const keyword = convertKeyword(query);
    const searchUrl = `${LAW_API_BASE}/lawSearch.do?OC=${LAW_API_OC}&target=law&type=JSON&query=${encodeURIComponent(keyword)}&display=5&page=1`;
    const searchRes = await fetch(searchUrl, { next: { revalidate: 3600 }, headers: { "Accept": "application/json", "Referer": "https://medical-law-search.vercel.app/" } });

    if (!searchRes.ok) throw new Error(`법제처 검색 API 오류: ${searchRes.status}`);

    const searchData = await searchRes.json();
    const lawList = toArray(searchData?.LawSearch?.law);
    if (!lawList.length) return NextResponse.json([]);

    const results = [];
    const kw = keyword.toLowerCase();

    for (const law of lawList.slice(0, 3)) {
      const lawId = String(law["법령ID"] || "");
      const lawName = String(law["법령명"] || law["법령명한글"] || "");
      const effectiveDate = formatDate(law["시행일자"]);
      if (!lawId) continue;

      const articleUrl = `${LAW_API_BASE}/lawService.do?OC=${LAW_API_OC}&target=law&type=JSON&ID=${lawId}`;
      const articleRes = await fetch(articleUrl, { next: { revalidate: 3600 }, headers: { "Accept": "application/json", "Referer": "https://medical-law-search.vercel.app/" } });
      if (!articleRes.ok) continue;

      const articleData = await articleRes.json();
      const articles = toArray(articleData?.법령?.조문?.조문단위);

      const matchedArticles = articles.filter((a) => {
        const title = String(a["조문제목"] || a.조문제목 || "").toLowerCase();
        const content = String(a["조문내용"] || a.조문내용 || "").toLowerCase();
        return title.includes(kw) || content.includes(kw);
      }).slice(0, 3);

      for (const art of matchedArticles) {
        const articleNumber = String(art["@조문번호"] || art["조문번호"] || art.조문번호 || "");
        const articleTitle = String(art["조문제목"] || art.조문제목 || "");
        const articleContent = extractArticleContent(art);
        const summary = articleContent.length > 60 ? articleContent.slice(0, 60) + "…" : articleContent;

        results.push({
          id: `${lawId}_${articleNumber}`,
          lawName,
          article: `제${articleNumber}조`,
          title: articleTitle,
          summary,
          effectiveDate,
          category: getCategoryFromLawName(lawName),
          content: articleContent,
          source: `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(lawName)}`,
          priority: getPriority(lawName),
        });
      }
    }

    results.sort((a, b) => a.priority - b.priority);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[/api/search] 오류:", err);
    return NextResponse.json({ error: err.message || "검색 중 오류가 발생했습니다." }, { status: 500 });
  }
}
