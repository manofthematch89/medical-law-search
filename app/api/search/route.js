export const runtime = "edge";
// ============================================================
// app/api/search/route.js — Supabase 기반 조문 검색 (Phase 3)
//
// 전략: Supabase PostgreSQL + pg_trgm GIN 인덱스
//   1. keywordMap으로 일반어 → 법령 용어 변환
//   2. supabase.rpc('search_articles') 로 조문 본문 + 제목 검색
//   3. 의료법 계열 우선 정렬 (RPC 함수 내 처리)
//
// 필수 환경변수:
//   SUPABASE_URL         — Vercel 환경변수
//   SUPABASE_ANON_KEY    — Vercel 환경변수 (읽기 전용 anon key)
// ============================================================
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const preferredRegion = "icn1";

const SUPABASE_URL      = process.env.SUPABASE_URL      || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

const keywordMap = {
  "차트 보관":   "진료기록부 보존기간",
  "차트 보존":   "진료기록부 보존기간",
  "침대":        "병상",
  "병실":        "병상",
  "병실 크기":   "병상",
  "병실 면적":   "병상",
  "병실 수":     "병상",
  "제출 기한":   "기한",
  "제출기한":    "기한",
  "마감 기한":   "기한",
  "마감일":      "기한",
  "비급여 고지": "비급여 진료비용 고지",
  "비급여 게시": "비급여 진료비용 고지",
  "개인정보 열람": "개인정보 열람 요청",
  "근무시간":    "근로시간",
  "설명 동의":   "의료행위 설명",
  "수술 동의":   "의료행위 설명",
  "입원비":      "입원료",
  "응급실":      "응급의료",
  "구급차":      "구급차등의 운용",
};

function convertKeyword(query) {
  return keywordMap[query.trim()] || query.trim();
}

function getCategoryFromLawName(lawName) {
  if (lawName.includes("의료법"))   return "의료법 계열";
  if (lawName.includes("응급의료")) return "의료법 계열";
  if (lawName.includes("약사법"))   return "의료법 계열";
  if (lawName.includes("개인정보")) return "개인정보보호법";
  if (lawName.includes("근로기준")) return "근로기준법";
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

    // Supabase RPC — schema.sql의 search_articles() 함수 호출
    const { data, error } = await supabase.rpc("search_articles", {
      kw:  keyword,
      lmt: 50,           // 여유있게 가져온 뒤 클라이언트에서 20개로 제한
    });

    if (error) {
      console.error("[/api/search] Supabase 오류:", error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    if (!data || !data.length) return NextResponse.json([]);

    // LawCard.js가 기대하는 형식으로 변환 (기존 필드명 유지)
    const results = data.map((row) => {
      const summary =
        row.content.length > 60
          ? row.content.slice(0, 60) + "…"
          : row.content;

      return {
        id:            row.id,
        lawName:       row.law_name,
        article:       `제${row.article_no}조`,
        title:         row.article_title,
        summary,
        effectiveDate: row.effective_date || "",
        category:      getCategoryFromLawName(row.law_name),
        content:       row.content,
        source:        row.law_serial_no
          ? `https://www.law.go.kr/lsInfo.do?lsiSeq=${row.law_serial_no}`
          : `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(row.law_name)}`,
        priority:      getPriority(row.law_name),
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
