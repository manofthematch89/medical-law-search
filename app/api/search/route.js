export const runtime = "edge";
// ============================================================
// app/api/search/route.js â ë²ì ì² ê²ì API íë¡ì (ìë²ì¬ì´ë)
//
// ì ëµ: target=law 2ë¨ê³ ê²ì (ë³ë ¬)
//   1ë¨ê³: í¤ìë + ìë£ë² ê³ì´ ë²ë ¹ëª ê²ì â ë²ë ¹ ID ëª©ë¡
//   2ë¨ê³: ê° ë²ë ¹ ì¡°ë¬¸ ì ì²´ fetch â í¤ìë í¬í¨ ì¡°ë¬¸ íí°
//   â ë²ë ¹ëªì´ ìë ì¡°ë¬¸ ë³¸ë¬¸ ê¸°ì¤ ê²ì ê°ë¥
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

function extractArticleContent(articleUnit) {
  const main = String(articleUnit["ì¡°ë¬¸ë´ì©"] || articleUnit.ì¡°ë¬¸ë´ì© || "");
  const subs = toArray(articleUnit["í­"] || articleUnit.í­);
  if (!subs.length) return main;
  const subText = subs.map((s) => String(s["í­ë´ì©"] || s.í­ë´ì© || "")).filter(Boolean).join(" ");
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
  return toArray(data?.ë²ë ¹?.ì¡°ë¬¸?.ì¡°ë¬¸ë¨ì);
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
    const kw = keyword.toLowerCase();

    // 1ë¨ê³: í¤ìë ë²ë ¹ëª ê²ì + ìë£ë² ê³ì´ í­ì í¬í¨ (ë³ë ¬)
    const [kwLaws, medLaws] = await Promise.all([
      fetchLaws(keyword, 10),
      fetchLaws("ìë£ë²", 10),
    ]);

    // ì¤ë³µ ì ê±° (ë²ë ¹ID ê¸°ì¤)
    const seen = new Set();
    const allLaws = [...kwLaws, ...medLaws].filter((law) => {
      const id = String(law["ë²ë ¹ID"] || "");
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    if (!allLaws.length) return NextResponse.json([]);

    // 2ë¨ê³: ê° ë²ë ¹ ì¡°ë¬¸ ë³ë ¬ fetch (ìµë 10ê° ë²ë ¹)
    const lawsToFetch = allLaws.slice(0, 10);
    const articleBatches = await Promise.all(
      lawsToFetch.map(async (law) => {
        const lawId = String(law["ë²ë ¹ID"] || "");
        const lawName = String(law["ë²ë ¹ëª"] || law["ë²ë ¹ëªíê¸"] || "");
        const effectiveDate = formatDate(law["ìíì¼ì"]);
        const articles = await fetchArticles(lawId).catch(() => []);
        return { lawId, lawName, effectiveDate, articles };
      })
    );

    // 3ë¨ê³: í¤ìë í¬í¨ ì¡°ë¬¸ íí° (ì¡°ë¬¸ì ëª© or ì¡°ë¬¸ë´ì©)
    const results = [];
    for (const { lawId, lawName, effectiveDate, articles } of articleBatches) {
      for (const art of articles) {
        const title = String(art["ì¡°ë¬¸ì ëª©"] || art.ì¡°ë¬¸ì ëª© || "").toLowerCase();
        const content = extractArticleContent(art).toLowerCase();
        if (!title.includes(kw) && !content.includes(kw)) continue;

        const articleNumber = String(art["@ì¡°ë¬¸ë²í¸"] || art["ì¡°ë¬¸ë²í¸"] || "");
        const fullContent = extractArticleContent(art);
        const summary = fullContent.length > 60 ? fullContent.slice(0, 60) + "â¦" : fullContent;

        results.push({
          id: `${lawId}_${articleNumber}`,
          lawName,
          article: `ì ${articleNumber}ì¡°`,
          title: String(art["ì¡°ë¬¸ì ëª©"] || art.ì¡°ë¬¸ì ëª© || ""),
          summary,
          effectiveDate,
          category: getCategoryFromLawName(lawName),
          content: fullContent,
          source: `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(lawName)}`,
          priority: getPriority(lawName),
        });
      }
    }

    results.sort((a, b) => a.priority - b.priority);
    return NextResponse.json(results.slice(0, 20));
  } catch (err) {
    console.error("[/api/search] ì¤ë¥:", err);
    return NextResponse.json(
      { error: err.message || "ê²ì ì¤ ì¤ë¥ê° ë°ìíìµëë¤." },
      { status: 500 }
    );
  }
}
