import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

export const runtime = "edge";
export const preferredRegion = "icn1";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";

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

    if (!GEMINI_API_KEY) {
      return NextResponse.json(
        { error: "NEXT_PUBLIC_GEMINI_API_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const keyword = query.trim();
    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

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
  } catch (err) {
    console.error("[/api/search] 오류:", err);
    return NextResponse.json(
      { error: err.message || "검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
