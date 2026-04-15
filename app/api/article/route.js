// ============================================================
// app/api/article/route.js — Supabase 조문 상세 조회 (Phase 5~)
//
// 역할: articles 테이블에서 id로 단건 조회 + laws 조인
// 사용법: GET /api/article?id={lawId}_{articleNumber}
// ============================================================

import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const runtime = "edge";
export const preferredRegion = "icn1";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

function getCategoryFromLawName(lawName) {
  if (lawName.includes("의료법")) return "의료법 계열";
  if (lawName.includes("개인정보")) return "개인정보보호법";
  if (lawName.includes("근로기준")) return "근로기준법";
  if (lawName.includes("응급의료")) return "의료법 계열";
  if (lawName.includes("약사법")) return "의료법 계열";
  return "기타";
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id") || "";

    if (!id.trim()) return NextResponse.json(null, { status: 400 });

    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
      return NextResponse.json(
        { error: "SUPABASE_URL / SUPABASE_ANON_KEY 환경변수가 설정되지 않았습니다." },
        { status: 500 }
      );
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

    const { data, error } = await supabase
      .from("articles")
      .select(`
        id,
        law_id,
        article_no,
        article_title,
        content,
        category,
        laws (
          law_name,
          effective_date,
          law_serial_no
        )
      `)
      .eq("id", id)
      .single();

    if (error || !data) return NextResponse.json(null, { status: 404 });

    const lawName = String(data.laws?.law_name || "");
    const effectiveDate = String(data.laws?.effective_date || "");
    const lawSerialNo = data.laws?.law_serial_no;
    const fullContent = String(data.content || "");
    const summary = fullContent.length > 60 ? fullContent.slice(0, 60) + "…" : fullContent;
    const dbCategory = String(data.category || "").trim();

    return NextResponse.json({
      id: data.id,
      lawName,
      article: `제${data.article_no}조`,
      title: String(data.article_title || ""),
      summary,
      effectiveDate,
      category: dbCategory || getCategoryFromLawName(lawName),
      content: fullContent,
      source: `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(lawName)}`,
      priority: 1,
    });
  } catch (err) {
    console.error("[/api/article] 오류:", err);
    return NextResponse.json(
      { error: err.message || "조문 조회 중 오류가 발생했습니다." },
      { status: 500 }
    );
  }
}
