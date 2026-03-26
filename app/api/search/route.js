export const runtime = "edge";
export const preferredRegion = "icn1";

const OC = process.env.LAW_API_OC || "1234";
const BASE = "https://www.law.go.kr/DRF";

const HEADERS = {
  "Accept": "application/json",
  "Referer": "https://medical-law-search.vercel.app/",
  "Origin": "https://medical-law-search.vercel.app",
};

function getCategoryFromLawName(name) {
  if (!name) return "기타";
  if (name.includes("의료법") || name.includes("보건의료") || name.includes("응급의료") || name.includes("약사법") || name.includes("의원") || name.includes("병원")) return "의료법 계열";
  if (name.includes("개인정보")) return "개인정보보호법";
  if (name.includes("근로기준")) return "근로기준법";
  return "기타";
}

function formatDate(d) {
  if (!d) return "";
  const s = String(d);
  if (s.length !== 8) return s;
  return s.slice(0,4) + "-" + s.slice(4,6) + "-" + s.slice(6,8);
}

function lawNamePriority(lawName, query) {
  if (lawName === query) return 0;
  if (lawName.startsWith(query)) return 1;
  if (lawName.includes(query)) return 2;
  return 3;
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get("query")?.trim() || "";
  if (!query) return Response.json([], { status: 400 });

  try {
    // 1. 법령 목록 검색 (display=20 으로 더 많이 가져와서 정렬)
    const searchUrl = BASE + "/lawSearch.do?OC=" + OC + "&target=law&type=JSON&query=" + encodeURIComponent(query) + "&display=20";
    const searchRes = await fetch(searchUrl, { headers: HEADERS });
    const searchData = await searchRes.json();

    const laws = searchData?.LawSearch?.law;
    if (!laws) return Response.json([]);

    const rawList = Array.isArray(laws) ? laws : [laws];

    // 2. 쿼리와 이름 일치도로 정렬 후 상위 5개 사용
    const lawList = rawList
      .slice()
      .sort((a, b) => {
        const nameA = String(a["법령명한글"] || "");
        const nameB = String(b["법령명한글"] || "");
        return lawNamePriority(nameA, query) - lawNamePriority(nameB, query);
      })
      .slice(0, 5);

    const allArticles = [];

    for (const law of lawList) {
      const lawId  = String(law["법령ID"] || law.법령ID || "");
      const lawSeq = String(law["법령일련번호"] || law.법령일련번호 || "");
      const lawName = String(law["법령명한글"] || law.법령명한글 || "");
      const effectiveDate = formatDate(law["시행일자"] || law.시행일자);
      if (!lawId || !lawSeq) continue;

      try {
        // 3. 조문 목록 조회
        const articleUrl = BASE + "/lawService.do?OC=" + OC + "&target=law&type=JSON&ID=" + lawId;
        const articleRes = await fetch(articleUrl, { headers: HEADERS });
        const rawText = await articleRes.text();
        let articleData;
        try { articleData = JSON.parse(rawText); } catch(e) { continue; }

        // 최상위 키가 한국어 (예: "법령") 이므로 동적 접근
        const lawContent = Object.values(articleData)[0];
        const articles =
          lawContent?.조문단위 ||
          lawContent?.조문?.조문단위 ||
          lawContent?.조문;

        if (!articles) continue;
        const articleList = Array.isArray(articles) ? articles : [articles];

        for (const art of articleList) {
          const articleNumber = String(art["조문번호"] || art.조문번호 || "");
          const title   = String(art["조문제목"] || art.조문제목 || "");
          const content = String(art["조문내용"] || art.조문내용 || "");
          if (!articleNumber || !content) continue;

          const id = lawId + "_" + articleNumber;
          const summary = content.length > 80 ? content.slice(0, 80) + "…" : content;

          allArticles.push({
            id,
            lawName,
            lawId,
            article: "제" + articleNumber + "조",
            title,
            summary,
            effectiveDate,
            category: getCategoryFromLawName(lawName),
            content,
            source: "https://www.law.go.kr/lsInfo.do?lsiSeq=" + lawSeq,
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
