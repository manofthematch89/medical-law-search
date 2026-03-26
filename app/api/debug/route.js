export const runtime = "edge";
export const preferredRegion = "icn1";

const OC = process.env.LAW_API_OC || "1234";
const BASE = "https://www.law.go.kr/DRF";

const LAW_HEADERS = {
  "Accept": "application/json",
  "Referer": "https://medical-law-search.vercel.app/",
  "Origin": "https://medical-law-search.vercel.app",
};

export async function GET() {
  try {
    // Step 1: Search for 의료법
    const searchUrl = BASE + "/lawSearch.do?OC=" + OC + "&target=law&type=JSON&query=" + encodeURIComponent("의료법") + "&display=3";
    const searchRes = await fetch(searchUrl, { headers: LAW_HEADERS });
    const searchStatus = searchRes.status;
    const searchText = await searchRes.text();

    let searchParsed = null, searchParseError = null;
    try { searchParsed = JSON.parse(searchText); } catch(e) { searchParseError = e.message; }

    const laws = searchParsed?.LawSearch?.law;
    const lawList = Array.isArray(laws) ? laws : (laws ? [laws] : []);

    if (lawList.length === 0) {
      return Response.json({ step: "search", searchStatus, searchParseError, searchFirst500: searchText.substring(0, 500) });
    }

    const firstLaw = lawList[0];
    const lawSeq = firstLaw.법령일련번호;

    // Step 2: Fetch articles using MST
    const articleUrl = BASE + "/lawService.do?OC=" + OC + "&target=law&type=JSON&MST=" + lawSeq;
    const articleRes = await fetch(articleUrl, { headers: LAW_HEADERS });
    const articleText = await articleRes.text();

    let articleParsed = null, articleParseError = null;
    try { articleParsed = JSON.parse(articleText); } catch(e) { articleParseError = e.message; }

    const topKeys = articleParsed ? Object.keys(articleParsed) : null;
    const lawContent = articleParsed ? Object.values(articleParsed)[0] : null;
    const articleKeys = lawContent ? Object.keys(lawContent) : null;
    const hasJomun = !!(lawContent?.조문단위 || lawContent?.조문);

    return Response.json({
      firstLaw: { lawSeq, lawName: firstLaw.법령명한글 },
      articleUrl,
      articleStatus: articleRes.status,
      rawFirst300: articleText.substring(0, 300),
      articleParseError,
      topKeys,
      articleKeys,
      hasJomun,
    });
  } catch (e) {
    return Response.json({ fatalError: e.message });
  }
}
