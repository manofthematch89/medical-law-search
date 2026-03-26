// ============================================================
// app/api/article/route.js — 법제처 조문 상세 API 프록시 (서버사이드)
//
// 역할: 브라우저 → Next.js API Route → 법제처 API
// 사용법: GET /api/article?id={lawId}_{articleNumber}
// ============================================================

import { NextResponse } from "next/server";

const LAW_API_OC = process.env.LAW_API_OC || "";
const LAW_API_BASE = "https://www.law.go.kr/DRF";

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
    const id = searchParams.get("id") || "";

    if (!id.trim()) return NextResponse.json(null, { status: 400 });

    if (!LAW_API_OC) {
      return NextResponse.json({ error: "LAW_API_OC 환경변수가 설정되지 않았습니다." }, { status: 500 });
    }

    // id 형식: {lawId}_{articleNumber} (예: "219997_22")
    const underscoreIndex = id.indexOf("_");
    if (underscoreIndex === -1) {
      return NextResponse.json({ error: "잘못된 id 형식입니다." }, { status: 400 });
    }

    const lawId = id.slice(0, underscoreIndex);
    const articleNumber = id.slice(underscoreIndex + 1);

    const url = `${LAW_API_BASE}/lawService.do?OC=${LAW_API_OC}&target=law&type=JSON&ID=${lawId}`;
    const res = await fetch(url, { next: { revalidate: 3600 } });

    if (!res.ok) throw new Error(`법제처 API 오류: ${res.status}`);

    const data = await res.json();
    const lawInfo = data?.법령?.기본정보;
    if (!lawInfo) return NextResponse.json(null, { status: 404 });

    const rawLawName = lawInfo["법령명"];
    const lawName = typeof rawLawName === "object" ? rawLawName?.["#text"] || "" : String(rawLawName || "");
    const effectiveDate = formatDate(lawInfo["시행일자"]);

    const articles = toArray(data?.법령?.조문?.조문단위);
    const article = articles.find((a) => {
      const num = String(a["@조문번호"] || a["조문번호"] || a.조문번호 || "");
      return num === articleNumber;
    });

    if (!article) return NextResponse.json(null, { status: 404 });

    const articleTitle = String(article["조문제목"] || article.조문제목 || "");
    const articleContent = extractArticleContent(article);
    const summary = articleContent.length > 60 ? articleContent.slice(0, 60) + "…" : articleContent;

    return NextResponse.json({
      id,
      lawName,
      article: `제${articleNumber}조`,
      title: articleTitle,
      summary,
      effectiveDate,
      category: getCategoryFromLawName(lawName),
      content: articleContent,
      source: `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(lawName)}`,
      priority: 1,
    });
  } catch (err) {
    console.error("[/api/article] 오류:", err);
    return NextResponse.json({ error: err.message || "조문 조회 중 오류가 발생했습니다." }, { status: 500 });
  }
}
