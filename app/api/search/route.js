// Phase 2 + Essential Fixes
// - Edge Runtime (서울 IP 고정)
// - Referer 헤더 (법제처 도메인 인증 필수)
// - Fix: use dynamic top-level key for lawService JSON response
export const runtime = "edge";
export const preferredRegion = "icn1";

const OC = process.env.LAW_API_OC || "1234";
const BASE = "https://www.law.go.kr/DRF";

const LAW_HEADERS = {
  "Accept": "application/json",
  "Referer": "https://medical-law-search.vercel.app/",
  "Origin": "https://medical-law-search.vercel.app",
};

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "";
  const keyword = searchParams.get("keyword")?.trim() || "";

  if (!query) return Response.json([], { status: 400 });

  try {
    const searchUrl = `${BASE}/lawSearch.do?OC=${OC}&target=law&type=JSON&query=${encodeURIComponent(query)}&display=10`;
    const searchRes = await fetch(searchUrl, { headers: LAW_HEADERS });
    const searchData = await searchRes.json();

    const laws = searchData?.LawSearch?.law;
    if (!laws) return Response.json([]);

    const lawList = Array.isArray(laws) ? laws : [laws];
    const allArticles = [];

    for (const law of lawList.slice(0, 5)) {
      const lawSeq = law.법령일련번호;
      const lawName = law.법령명한글;
      if (!lawSeq) continue;

      try {
        const articleUrl = `${BASE}/lawService.do?OC=${OC}&target=law&type=JSON&MST=${lawSeq}`;
        const articleRes = await fetch(articleUrl, { headers: LAW_HEADERS });
        const rawText = await articleRes.text();

        let articleData;
        try { articleData = JSON.parse(rawText); } catch(e) { continue; }

        // lawService.do returns Korean top-level key (e.g. "법령"), not "LawService"
        // Use dynamic access: get first top-level value regardless of key name
        const lawContent = Object.values(articleData)[0];

        // Articles may be at different nesting levels
        const articles =
          lawContent?.조문단위 ||
          lawContent?.조문?.조문단위 ||
          lawContent?.조문 ||
          articleData?.LawService?.조문단위;

        if (!articles) continue;

        const articleList = Array.isArray(articles) ? articles : [articles];

        for (const article of articleList) {
          const title = article.조문제목 || "";
          const content = article.조문내용 || "";
          if (keyword && !title.includes(keyword) && !content.includes(keyword)) continue;
          allArticles.push({
            lawName,
            lawId: lawSeq,
            articleTitle: title,
            articleNumber: article.조문번호 || "",
            content,
          });
        }
      } catch (e) {
        continue;
      }
    }

    return Response.json(allArticles);
  } catch (error) {
    return Response.json(
      { error: "검색 중 오류가 발생했습니다.", detail: error.message },
      { status: 500 }
    );
  }
}
