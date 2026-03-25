// ============================================================
// app/api/search/route.js — 법제처 검색 API 프록시
// ============================================================
import { NextResponse } from "next/server";

export const runtime = "edge";
export const preferredRegion = "icn1";

const LAW_API_OC = process.env.LAW_API_OC || "";
const LAW_API_BASE = "https://www.law.go.kr/DRF";

const LAW_API_HEADERS = {
  "Accept": "application/json",
  "Referer": "https://medical-law-search.vercel.app/",
  "Origin": "https://medical-law-search.vercel.app",
};

// 직접 검색이 실패할 때 fallback으로 검색할 주요 의료 법령 목록
const FALLBACK_LAW_QUERIES = [
  "의료법",
  "의료법 시행령",
  "의료법 시행규칙",
  "응급의료에 관한 법률",
  "개인정보 보호법",
  "근로기준법",
];

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
  if (lawName.includes("응급의료")) return "의료법 계열";
  if (lawName.includes("약사법")) return "의료법 계열";
  if (lawName.includes("개인정보")) return "개인정보보호법";
  if (lawName.includes("근로기준")) return "근로기준법";
  return "기타";
}

function getPriority(lawName) {
  if (lawName.includes("의료법") || lawName.includes("응급의료") || lawName.includes("약사법")) return 1;
  if (lawName.includes("개인정보")) return 2;
  if (lawName.includes("근로기준")) return 3;
  return 4;
}

function extractFullText(articleUnit) {
  const parts = [];
  const title = articleUnit["조문제목"] || "";
  const main = articleUnit["조문내용"] || "";
  if (title) parts.push(title);
  if (main) parts.push(main);
  const subItems = toArray(articleUnit["항"] || articleUnit.항);
  for (const item of subItems) {
    const sub = item["항내용"] || "";
    if (sub) parts.push(sub);
    const hoItems = toArray(item["호"] || item.호);
    for (const ho of hoItems) {
      const hoText = ho["호내용"] || "";
      if (hoText) parts.push(hoText);
    }
  }
  return parts.join(" ");
}

function extractArticleContent(articleUnit) {
  const mainContent = articleUnit["조문내용"] || "";
  const subItems = toArray(articleUnit["항"] || articleUnit.항);
  if (!subItems.length) return mainContent;
  const subTexts = subItems
    .map((item) => item["항내용"] || "")
    .filter(Boolean)
    .join(" ");
  return mainContent ? `${mainContent} ${subTexts}` : subTexts;
}

// 법령 ID 목록을 받아 관련 조문을 검색해서 결과 배열로 반환
async function fetchArticlesFromLaws(lawList, kw) {
  const results = [];
  for (const law of lawList.slice(0, 5)) {
    const lawId = String(law["법령ID"] || "");
    const rawLawName = law["법령명"] || law["법령명한글"] || "";
    const lawName =
      typeof rawLawName === "object"
        ? String(rawLawName["#text"] || Object.values(rawLawName)[0] || "")
        : String(rawLawName);
    const effectiveDate = formatDate(law["시행일자"]);
    if (!lawId) continue;

    try {
      const articleUrl = `${LAW_API_BASE}/lawService.do?OC=${LAW_API_OC}&target=law&type=JSON&ID=${lawId}`;
      const articleRes = await fetch(articleUrl, { headers: LAW_API_HEADERS });
      if (!articleRes.ok) continue;
      const articleData = await articleRes.json();

      const lawBody = articleData?.법령 || articleData?.law || articleData;
      const 조문 = lawBody?.조문 || lawBody?.article;
      const articles = toArray(조문?.조문단위 || 조문?.articleUnit || 조문);

      let matched = articles
        .filter((a) => extractFullText(a).toLowerCase().includes(kw))
        .slice(0, 3);

      // fallback: 키워드 매칭 없으면 첫 2개
      if (!matched.length && articles.length > 0) {
        matched = articles.slice(0, 2);
      }

      for (const art of matched) {
        const articleNumber = String(
          art["@조문번호"] || art["조문번호"] || art.조문번호 || ""
        );
        const articleTitle = String(art["조문제목"] || art.조문제목 || "");
        const articleContent = extractArticleContent(art);
        const summary =
          articleContent.length > 80
            ? articleContent.slice(0, 80) + "…"
            : articleContent;

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
    } catch (err) {
      continue;
    }
  }
  return results;
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

    // ── 1단계: 키워드로 법령명 직접 검색 ──────────────────────
    const searchUrl = `${LAW_API_BASE}/lawSearch.do?OC=${LAW_API_OC}&target=law&type=JSON&query=${encodeURIComponent(keyword)}&display=5&page=1`;

    let lawList = [];
    try {
      const searchRes = await fetch(searchUrl, { headers: LAW_API_HEADERS });
      if (searchRes.ok) {
        const searchData = await searchRes.json();
        lawList = toArray(searchData?.LawSearch?.law);
      }
    } catch (e) {
      // ignore, fall through to fallback
    }

    // ── 2단계: 결과 없으면 주요 의료법령에서 조문 키워드 검색 ──
    if (!lawList.length) {
      const allFallbackLaws = [];
      for (const fbQuery of FALLBACK_LAW_QUERIES) {
        try {
          const fbUrl = `${LAW_API_BASE}/lawSearch.do?OC=${LAW_API_OC}&target=law&type=JSON&query=${encodeURIComponent(fbQuery)}&display=3&page=1`;
          const fbRes = await fetch(fbUrl, { headers: LAW_API_HEADERS });
          if (!fbRes.ok) continue;
          const fbData = await fbRes.json();
          const fbLaws = toArray(fbData?.LawSearch?.law);
          allFallbackLaws.push(...fbLaws.slice(0, 2));
        } catch (e) {
          continue;
        }
      }
      lawList = allFallbackLaws;
    }

    if (!lawList.length) return NextResponse.json([]);

    const results = await fetchArticlesFromLaws(lawList, kw);
    results.sort((a, b) => a.priority - b.priority);

    // 키워드 매칭된 결과를 우선으로 재정렬
    const keywordMatched = results.filter(r =>
      r.content.toLowerCase().includes(kw) ||
      r.title.toLowerCase().includes(kw)
    );
    const rest = results.filter(r =>
      !r.content.toLowerCase().includes(kw) &&
      !r.title.toLowerCase().includes(kw)
    );

    return NextResponse.json([...keywordMatched, ...rest].slice(0, 9));
  } catch (err) {
    return NextResponse.json(
      { error: err.message || "검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
