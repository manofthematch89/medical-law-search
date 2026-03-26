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
    // 1. lawSearch 원본 응답
    const searchUrl = BASE + "/lawSearch.do?OC=" + OC + "&target=law&type=JSON&query=" + encodeURIComponent("의료법") + "&display=3";
    const searchRes = await fetch(searchUrl, { headers: LAW_HEADERS });
    const searchRaw = await searchRes.text();
    const searchData = JSON.parse(searchRaw);

    const laws = searchData?.LawSearch?.law;
    const lawList = !laws ? [] : Array.isArray(laws) ? laws : [laws];
    const firstLaw = lawList[0] || null;

    // 2. 첫 법령의 lawService 원본 응답 (있으면)
    let serviceData = null;
    if (firstLaw) {
      const lawId = firstLaw["법령ID"] || firstLaw.lawId || firstLaw.MST || Object.values(firstLaw)[0];
      const serviceUrl = BASE + "/lawService.do?OC=" + OC + "&target=lsEfInfoR&type=JSON&ID=" + lawId;
      const serviceRes = await fetch(serviceUrl, { headers: LAW_HEADERS });
      serviceData = await serviceRes.json();
    }

    return Response.json({
      searchKeys: searchData ? Object.keys(searchData) : null,
      lawSearchKeys: searchData?.LawSearch ? Object.keys(searchData.LawSearch) : null,
      lawCount: lawList.length,
      firstLawKeys: firstLaw ? Object.keys(firstLaw) : null,
      firstLawValues: firstLaw,
      serviceKeys: serviceData ? Object.keys(serviceData) : null,
      lawServiceKeys: serviceData?.LawService ? Object.keys(serviceData.LawService) : null,
    });
  } catch (e) {
    return Response.json({ error: e.message, stack: e.stack?.substring(0, 200) });
  }
}
