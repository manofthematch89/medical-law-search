export const runtime = "edge";
// ============================================================
// app/api/search/route.js â ë²ì ì² ì¡°ë¬¸ ê²ì API íë¡ì (ìë²ì¬ì´ë)
//
// ì­í : ë¸ë¼ì°ì  â Next.js API Route â ë²ì ì² API
// CORS ë¬¸ì  ìì´ ë²ì ì² APIë¥¼ ìì íê² í¸ì¶
// target=lc ë¡ ì¡°ë¬¸ ë´ì©ì ì§ì  ê²ì (target=law ë ë²ë ¹ëª ê²ìì´ë¼ ë¶ì í©)
// ============================================================
import { NextResponse } from "next/server";

// ë²ì ì² APIë íêµ­ IPììë§ ì ê·¼ ê°ë¥ â ìì¸ ë¦¬ì  ê³ ì 
export const preferredRegion = "icn1";

const LAW_API_OC = process.env.LAW_API_OC || "";
const LAW_API_BASE = "https://www.law.go.kr/DRF";

const keywordMap = {
  "ì°¨í¸ ë³´ê´": "ì§ë£ê¸°ë¡ë¶ ë³´ì¡´ê¸°ê°",
  "ì°¨í¸ ë³´ì¡´": "ì§ë£ê¸°ë¡ë¶ ë³´ì¡´ê¸°ê°",
  "ë³ì¤ í¬ê¸°": "ìë£ê¸°ê´ ìì¤ê·ê²©",
  "ë³ì¤ ë©´ì ": "ìë£ê¸°ê´ ìì¤ê·ê²©",
  "ë¹ê¸ì¬ ê³ ì§": "ë¹ê¸ì¬ ì§ë£ë¹ì© ê³ ì§",
  "ë¹ê¸ì¬ ê²ì": "ë¹ê¸ì¬ ì§ë£ë¹ì© ê³ ì§",
  "ê°ì¸ì ë³´ ì´ë": "ê°ì¸ì ë³´ ì´ë ìì²­",
  "ê·¼ë¬´ìê°": "ê·¼ë¡ìê°",
  "ì¤ëª ëì": "ìë£íì ì¤ëª",
  "ìì  ëì": "ìë£íì ì¤ëª",
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
  if (lawName.includes("ìë£ë²")) return "ìë£ë² ê³ì´";
  if (lawName.includes("ê°ì¸ì ë³´")) return "ê°ì¸ì ë³´ë³´í¸ë²";
  if (lawName.includes("ê·¼ë¡ê¸°ì¤")) return "ê·¼ë¡ê¸°ì¤ë²";
  if (lawName.includes("ìê¸ìë£")) return "ìë£ë² ê³ì´";
  if (lawName.includes("ì½ì¬ë²")) return "ìë£ë² ê³ì´";
  return "ê¸°í";
}

function getPriority(lawName) {
  if (lawName.includes("ìë£ë²") || lawName.includes("ìê¸ìë£") || lawName.includes("ì½ì¬ë²")) return 1;
  if (lawName.includes("ê°ì¸ì ë³´")) return 2;
  if (lawName.includes("ê·¼ë¡ê¸°ì¤")) return 3;
  return 4;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    if (!query.trim()) return NextResponse.json([]);

    if (!LAW_API_OC) {
      return NextResponse.json(
        { error: "LAW_API_OC íê²½ë³ìê° ì¤ì ëì§ ìììµëë¤." },
        { status: 500 }
      );
    }

    const keyword = convertKeyword(query);

    // target=lc: ì¡°ë¬¸ ë´ì© ì§ì  ê²ì (í ë²ì API í¸ì¶ë¡ ì¡°ë¬¸ ê²°ê³¼ ë°í)
    const searchUrl = `${LAW_API_BASE}/lawSearch.do?OC=${LAW_API_OC}&target=lc&type=JSON&query=${encodeURIComponent(keyword)}&display=20&page=1`;

    const searchRes = await fetch(searchUrl, {
      next: { revalidate: 3600 },
      headers: {
        "Accept": "application/json",
        "Referer": "https://medical-law-search.vercel.app/",
      },
    });

    if (!searchRes.ok) throw new Error(`ë²ì ì² ê²ì API ì¤ë¥: ${searchRes.status}`);

    const searchData = await searchRes.json();
    const articleList = toArray(searchData?.LawSearch?.law);

    if (!articleList.length) return NextResponse.json([]);

    const results = articleList.map((item) => {
      const lawId = String(item["ë²ë ¹ID"] || "");
      const lawName = String(item["ë²ë ¹ëªíê¸"] || item["ë²ë ¹ëª"] || "");
      const articleNumber = String(item["ì¡°ë¬¸ë²í¸"] || item["@ì¡°ë¬¸ë²í¸"] || "");
      const articleTitle = String(item["ì¡°ë¬¸ì ëª©"] || "");
      const articleContent = String(item["ì¡°ë¬¸ë´ì©"] || "");
      const effectiveDate = formatDate(item["ìíì¼ì"]);
      const summary =
        articleContent.length > 60
          ? articleContent.slice(0, 60) + "â¦"
          : articleContent;

      return {
        id: `${lawId}_${articleNumber}`,
        lawName,
        article: `ì ${articleNumber}ì¡°`,
        title: articleTitle,
        summary,
        effectiveDate,
        category: getCategoryFromLawName(lawName),
        content: articleContent,
        source: `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(lawName)}`,
        priority: getPriority(lawName),
      };
    });

    results.sort((a, b) => a.priority - b.priority);
    return NextResponse.json(results);
  } catch (err) {
    console.error("[/api/search] ì¤ë¥:", err);
    return NextResponse.json(
      { error: err.message || "ê²ì ì¤ ì¤ë¥ê° ë°ìíìµëë¤." },
      { status: 500 }
    );
  }
}
