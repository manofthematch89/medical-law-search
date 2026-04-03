import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";

export const runtime = "edge";
export const preferredRegion = "icn1";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";
const GEMINI_EMBEDDING_MODEL = "gemini-embedding-001";
const keywordMap = {
  "병실 크기 기준": "의료기관 시설규격",
  "병실 면적": "의료기관 시설규격",
  "병실": "병상",
  "침대": "병상",
  "시설 기준": "의료기관 시설규격",
};

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

function buildFallbackKeywords(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return [];

  const mapped = keywordMap[trimmed] || "";
  const tokens = trimmed
    .split(/\s+/)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);

  const candidates = [trimmed];
  if (mapped && mapped !== trimmed) candidates.push(mapped);
  candidates.push(...tokens);

  // 중복 제거 (길이가 긴 키워드 우선)
  const unique = Array.from(new Set(candidates));
  unique.sort((a, b) => b.length - a.length);
  return unique;
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
      console.error(
        "[/api/search] match_articles 오류 (embedding_vector/RPC 미적용 시 텍스트 검색으로 대체):",
        vecErr.message
      );
    }

    const vectorMapped = vecErr
      ? []
      : (vectorResults || []).map((item) => {
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

    if (vectorMapped.length > 0) {
      vectorMapped.sort((a, b) => (a.priority - b.priority) || ((b.similarity || 0) - (a.similarity || 0)));
      return NextResponse.json(vectorMapped.slice(0, 20));
    }

    // Fallback: 의미검색 결과가 0건일 때는 텍스트 검색 RPC로 보강
    const fallbackKeywords = buildFallbackKeywords(keyword);
    const merged = new Map();

    for (const kw of fallbackKeywords) {
      const { data: rows, error: textErr } = await supabase.rpc("search_articles", {
        kw,
        lmt: 50,
      });
      if (textErr) {
        console.error("[/api/search] fallback search_articles 오류:", textErr.message, "kw=", kw);
        continue;
      }
      for (const row of rows || []) {
        if (!merged.has(row.id)) merged.set(row.id, row);
      }
      if (merged.size >= 50) break;
    }

    const textRows = Array.from(merged.values());
    if (!textRows || !textRows.length) return NextResponse.json([]);

    const ids = textRows.map((row) => row.id).filter(Boolean);
    const { data: catRows } = ids.length
      ? await supabase.from("articles").select("id,category").in("id", ids)
      : { data: [] };
    const catById = new Map((catRows || []).map((r) => [r.id, r.category]));

    const fallbackResults = textRows.map((row) => {
      const fullContent = String(row.content || "");
      const summary = fullContent.length > 60 ? fullContent.slice(0, 60) + "…" : fullContent;
      const lawName = String(row.law_name || "");
      const dbCategory = String(catById.get(row.id) || "").trim();
      return {
        id: row.id,
        lawName,
        article: `제${row.article_no}조`,
        title: String(row.article_title || ""),
        summary,
        effectiveDate: String(row.effective_date || ""),
        category: dbCategory || getCategoryFromLawName(lawName),
        content: fullContent,
        source: row.law_serial_no
          ? `https://www.law.go.kr/lsInfo.do?lsiSeq=${row.law_serial_no}`
          : `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(lawName)}`,
        priority: getPriority(lawName),
      };
    });
    fallbackResults.sort((a, b) => a.priority - b.priority);
    return NextResponse.json(fallbackResults.slice(0, 20));
  } catch (err) {
    console.error("[/api/search] 오류:", err);
    return NextResponse.json(
      { error: err.message || "검색 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
