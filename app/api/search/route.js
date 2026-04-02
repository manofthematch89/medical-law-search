export const runtime = "edge";
// ============================================================
// app/api/search/route.js — 법제처 검색 API 프록시 (서버사이드)
//
// 전략: target=law 2단계 검색 (병렬)
//   1단계: 키워드 + 의료법 계열 법령명 검색 → 법령 ID 목록
//   2단계: 각 법령 조문 전체 fetci → 키워드 포함 조문 필터
//   → 법령명이 아닌 조문 본문 기준 검색 가능
// ============================================================
import { NextResponse } from "next/server";

export const preferredRegion = "icn1";

const LAW_API_OC = process.env.LAW_API_OC || "";
const LAW_API_BASE = "https://www.law.go.kr/DRF";

const FETCH_OPTS = {
  next: { revalidate: 3600 },
  headers: {
    Accept: "application/json",
    Referer: "https://medical-law-search.vercel.app/",
  },
};

const keywordMap = {
  "차트 보관": "진료기록부 보존기간",
  "차트 보존": "진료기록부 보존기간",
  "침대": "병상",
  "병실": "병상",
  "병실 크기": "의료기관 시설규격",
  "병실 면적": "의료기관 시설규격",
  "병실 수": "병상",
  "제출 기한": "기한",
  "제출기한": "기한",
  "마감 기한": "기한",
  "마감일": "기한",
  "비급여 고지": "비급여 진료비용 고지",
  "비급여 게시": "비급여 진료비용 고지",
  "개인정보 열람": "개인정보 열람 요청",
  "근무시간": "근로시간",
  "설명 동의": "의료행위 설명",
  "수술 동의": "의료행위 설명",
  "입원비": "입원료",
  "응급실": "응급의료",
  "구급차": "구급차등의 운용",
};

function convertKeyword(query) {
  return keywordMap[query.trim()] || query.trim();
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
  const main = String(articleUnit["조문내용"] || articleUnit.조문내용 || "");
  const subs = toArray(articleUnit["항"] || articleUnit.항);
  if (!subs.length) return main;
  const subText = subs.map((s) => String(s["항내용"] || s.항내용 || "")).filter(Boolean).join(" ");
  return main ? `${main} ${subText}` : subText;
}

async function fetchLaws(query, display = 10) {
  const url = `${LAW_API_BASE}/lawSearch.do?OC=${LAW_API_OC}&target=law&type=JSON&query=${encodeURIComponent(query)}&display=${display}&page=1`;
  const res = await fetch(url, FETCH_OPTS);
  if (!res.ok) return [];
  const data = await res.json();
  return toArray(data?.LawSearch?.law);
}

async function fetchArticles(lawId) {
  const url = `${LAW_API_BASE}/lawService.do?OC=${LAW_API_OC}&target=law&type=JSON&ID=${lawId}`;
  const res = await fetch(url, FETCH_OPTS);
  if (!res.ok) return [];
  const data = await res.json();
  return toArray(data?.법령?.조문?.조문단위);
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    if (!query.trim()) return NextResponse.json([]);

    if (!LAW_API_OC) {
      return NextResponse.json(
        { error: "LAW_API_OC 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const keyword = convertKeyword(query);
    const kw = keyword.toLowerCase();

    // 1단계: 키워드 법령명 검색 + 의료법 계열 항상 포함 (병렬)
    const [kwLaws, medLaws] = await Promise.all([
      fetchLaws(keyword, 10),
      fetchLaws("의료법", 10),
    ]);

    // 중복 제거 (법령ID 기준)
    const seen = new Set();
    const allLaws = [...kwLaws, ...medLaws].filter((law) => {
      const id = String(law["법령ID"] || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (!allLaws.length) return NextResponse.json([]);

    // 2단계: 각 법령 조문 병렬 fetch (최대 10개 법령)
    const lawsToFetch = allLaws.slice(0, 10);
    const articleBatches = await Promise.all(
      lawsToFetch.map(async (law) => {
        const lawId = String(law["법령ID"] || "");
        const lawName = String(law["법령명"] || law["법령명한글"] || "");
        const effectiveDate = formatDate(law["시행일자"]);
        const articles = await fetchArticles(lawId).catch(() => []);
        return { lawId, lawName, effectiveDate, articles };
      })
    );

    // 3단계: 키워드 포함 조문 필터 (조문제목 or 조문내용)
    const results = [];
    for (const { lawId, lawName, effectiveDate, articles } of articleBatches) {
      for (const art of articles) {
        const title = String(art["조문제목"] || art.조문제목 || "").toLowerCase();
        const content = extractArticleContent(art).toLowerCase();
        if (!title.includes(kw) && !content.includes(kw)) continue;

        const articleNumber = String(art["@조문번호"] || art["조문번호"] || "");
        const fullContent = extractArticleContent(art);
        const summary = fullContent.length > 60 ? fullContent.slice(0, 60) + "…" : fullContent;

        results.push({
          id: `${lawId}_${articleNumber}`,
          lawName,
          article: `제${articleNumber}조`,
          title: String(art["조문제목"] || art.조문제목 || ""),
          summary,
          effectiveDate,
          category: getCategoryFromLawName(lawName),
          content: fullContent,
          source: `https://www.law.go.kr/lsInfo.do?lsiSeq=${lawId}`,
          priority: getPriority(lawName),
        });
      }
    }

    results.sort((a, b) => a.priority - b.priority);
    return NextResponse.json(results.slice(0, 20));
  } catch (err) {
    console.error("[/api/search] 오류:", err);
    return NextResponse.json(
      { error: err.message || "검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
