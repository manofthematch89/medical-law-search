import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

export const runtime = "edge";
export const preferredRegion = "icn1";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

const keywordMap = {
  "차트 보관": "진료기록부 보존기간",
  "차트 보존": "진료기록부 보존기간",
  "침대": "병상",
  "병실": "병상",
  "병실 크기": "의료기관 시설규격",
  "병실 면적": "의료기관 시설규격",
  "병실 수": "병상",
  "제출 기한": "기한",
  "제출기한": "기한",
  "마감 기한": "기한",
  "마감일": "기한",
  "비급여 고지": "비급여 진료비용 고지",
  "비급여 게시": "비급여 진료비용 고지",
  "개인정보 열람": "개인정보 열람 요청",
  "근무시간": "근로시간",
  "설명 동의": "의료행위 설명",
  "수술 동의": "의료행위 설명",
  "입원비": "입원료",
  "응급실": "응급의료",
  "구급차": "구급차등의 운용",
};

function convertKeyword(query) {
  return keywordMap[query.trim()] || query.trim();
}

function getCategoryFromLawName(lawName) {
  if (lawName.includes("의료법")) return "의료법 계열";
  if (lawName.includes("개인정보")) return "개인정보보호법";
  if (lawName.includes("근로기준")) return "근로기준법";
  if (lawName.includes("응급의료")) return "의료법 계열";
  if (lawName.includes("약사법")) return "의료법 계열";
  return "기타";
}

function getPriority(lawName) {
  if (lawName.includes("의료법") || lawName.includes("응급의료") || lawName.includes("약사법")) return 1;
  if (lawName.includes("개인정보")) return 2;
  if (lawName.includes("근로기준")) return 3;
  return 4;
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get("query") || "";
    if (!query.trim()) return NextResponse.json([]);

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "SUPABASE_URL / SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const keyword = convertKeyword(query);
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    // 의미(임베딩) 검색 모드: /api/search?query=...&ai=1
    const useAi = searchParams.get("ai") === "1";
    if (useAi) {
      if (!GEMINI_API_KEY) {
        return NextResponse.json(
          { error: "GEMINI_API_KEY (또는 NEXT_PUBLIC_GEMINI_API_KEY) 환경변수가 설정되지 않았습니다." },
          { status: 500 }
        );
      }

      const threshold = Number(searchParams.get("th") || "0.3");
      const count = Number(searchParams.get("k") || "20");

      const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });
      const embedRes = await ai.models.embedContent({
        model: GEMINI_EMBEDDING_MODEL,
        contents: keyword,
      });
      const embedding = embedRes?.embeddings?.[0]?.values;
      if (!Array.isArray(embedding) || embedding.length === 0) {
        return NextResponse.json({ error: "임베딩 생성 실패" }, { status: 500 });
      }

      const { data: vectorResults, error: vecErr } = await supabase.rpc("match_articles", {
        query_embedding: embedding,
        match_threshold: threshold,
        match_count: count,
      });
      if (vecErr) {
        console.error("[/api/search] match_articles 오류:", vecErr.message);
        return NextResponse.json({ error: vecErr.message }, { status: 500 });
      }

      const results = (vectorResults || []).map((item) => {
        const fullContent = String(item.content || "");
        const summary = fullContent.length > 60 ? fullContent.slice(0, 60) + "…" : fullContent;
        const lawName = String(item.law_name || "");
        const dbCategory = String(item.category || "").trim();
        return {
          id: item.id,
          lawName,
          article: `제${item.article_no}조`,
          title: String(item.title || ""),
          summary,
          effectiveDate: String(item.effective_date || ""),
          category: dbCategory || getCategoryFromLawName(lawName),
          content: fullContent,
          source: `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(lawName)}`,
          priority: getPriority(lawName),
          similarity: item.similarity,
        };
      });

      results.sort((a, b) => (a.priority - b.priority) || ((b.similarity || 0) - (a.similarity || 0)));
      return NextResponse.json(results.slice(0, 20));
    }

    // 1) RPC로 검색 (id/법령/조문/본문 반환)
    const { data, error } = await supabase.rpc("search_articles", {
      kw: keyword,
      lmt: 50,
    });

    if (error) {
      console.error("[/api/search] Supabase RPC 오류:", error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    if (!data || !data.length) return NextResponse.json([]);

    // 2) category는 RPC 결과에 없으므로, articles에서 id로 조회해 함께 내려준다.
    const ids = data.map((row) => row.id).filter(Boolean);
    const { data: catRows } = ids.length
      ? await supabase.from("articles").select("id,category").in("id", ids)
      : { data: [] };

    const catById = new Map((catRows || []).map((r) => [r.id, r.category]));

    const results = data.map((row) => {
      const summary = row.content?.length > 60 ? row.content.slice(0, 60) + "…" : row.content || "";
      const dbCategory = String(catById.get(row.id) || "").trim();
      const effectiveCategory = dbCategory || getCategoryFromLawName(row.law_name || "");

      return {
        id: row.id,
        lawName: row.law_name,
        article: `제${row.article_no}조`,
        title: row.article_title,
        summary,
        effectiveDate: row.effective_date || "",
        category: effectiveCategory,
        content: row.content,
        source: row.law_serial_no
          ? `https://www.law.go.kr/lsInfo.do?lsiSeq=${row.law_serial_no}`
          : `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(row.law_name)}`,
        priority: getPriority(row.law_name || ""),
      };
    });

    results.sort((a, b) => a.priority - b.priority);
    return NextResponse.json(results.slice(0, 20));
  } catch (err) {
    console.error("[/api/search] 오류:", err);
    return NextResponse.json(
      { error: err.message || "검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
