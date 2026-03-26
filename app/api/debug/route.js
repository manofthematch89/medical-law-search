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
    const searchUrl = BASE + "/lawSearch.do?OC=" + OC + "&target=law&type=JSON&query=" + encodeURIComponent("의료법") + "&display=3";
    const searchRes = await fetch(searchUrl, { headers: LAW_HEADERS });
    const status = searchRes.status;
    const rawText = await searchRes.text();

    // Try to parse
    let parsed = null;
    let parseError = null;
    try { parsed = JSON.parse(rawText); } catch(e) { parseError = e.message; }

    return Response.json({
      httpStatus: status,
      rawLength: rawText.length,
      rawFirst500: rawText.substring(0, 500),
      parseError,
      topKeys: parsed ? Object.keys(parsed) : null,
      lawSearchKeys: parsed?.LawSearch ? Object.keys(parsed.LawSearch) : null,
      lawCount: parsed?.LawSearch?.law ? (Array.isArray(parsed.LawSearch.law) ? parsed.LawSearch.law.length : 1) : 0,
    });
  } catch (e) {
    return Response.json({ fatalError: e.message });
  }
}
