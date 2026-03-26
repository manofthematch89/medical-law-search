// Phase 2 + Essential Fixes
// - Edge Runtime (서울 IP 고정)
// - Referer 헤더 (법제처 도메인 인증 필수)
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
  // keyword는 별도로 넘어올 때만 필터링에 사용 (없으면 전체 조문 반환)
  const keyword = searchParams.get("keyword")?.trim() || "";

  if (!query) {
    return Response.json([], { status: 400 });
  }

  try {
    // Step 1: 법령명으로 검색
    const searchUrl = `${BASE}/lawSearch.do?OC=${OC}&target=law&type=JSON&query=${encodeURIComponent(query)}&display=10`;
    const searchRes = await fetch(searchUrl, { headers: LAW_HEADERS });
    const searchData = await searchRes.json();

    const laws = searchData?.LawSearch?.law;
    if (!laws) {
      return Response.json([]);
    }

    const lawList = Array.isArray(laws) ? laws : [laws];

    // Step 2: 각 법령의 조문 가져오기
    const allArticles = [];
    for (const law of lawList.slice(0, 5)) {
      const lawId = law.법령ID;
      const lawName = law.법령명한글;
      if (!lawId) continue;

      try {
        const articleUrl = `${BASE}/lawService.do?OC=${OC}&target=lsEfInfoR&type=JSON&ID=${lawId}`;
        const articleRes = await fetch(articleUrl, { headers: LAW_HEADERS });
        const articleData = await articleRes.json();

        const articles = articleData?.LawService?.조문단위;
        if (!articles) continue;

        const articleList = Array.isArray(articles) ? articles : [articles];

        for (const article of articleList) {
          const title = article.조문제목 || "";
          const content = article.조문내용 || "";

          // keyword가 있을 때만 필터링, 없으면 전체 반환
          if (keyword && !title.includes(keyword) && !content.includes(keyword)) {
            continue;
          }

          allArticles.push({
            lawName,
            lawId,
            articleTitle: title,
            articleNumber: article.조문번호 || "",
            content,
          });
        }
      } catch (e) {
        continue;
      }
    }

    // 배열 직접 반환 (search/page.js 호환)
    return Response.json(allArticles);
  } catch (error) {
    return Response.json(
      { error: "검색 중 오류가 발생했습니다.", detail: error.message },
      { status: 500 }
    );
  }
}
