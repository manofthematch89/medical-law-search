// ============================================================
// collect-laws.mjs — 법제처 법령/조문 전수 수집 → Supabase 저장
//
// 실행 전 준비:
//   npm install @supabase/supabase-js
//   .env.local에 아래 3개 변수 설정:
//     LAW_API_OC=<법제처 OC코드>
//     SUPABASE_URL=https://xxxx.supabase.co
//     SUPABASE_SERVICE_ROLE_KEY=<service_role 키 — 쓰기 권한>
//
// 실행:
//   node --env-file=.env.local scripts/collect-laws.mjs
// ============================================================

import { createClient } from "@supabase/supabase-js";

// ── 환경변수 ────────────────────────────────────────────────
const LAW_API_OC           = process.env.LAW_API_OC            || "";
const LAW_API_BASE         = "https://www.law.go.kr/DRF";
const SUPABASE_URL         = process.env.SUPABASE_URL          || "";
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!LAW_API_OC || !SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("❌ 환경변수 누락: LAW_API_OC / SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

// ── 수집 대상 키워드 ─────────────────────────────────────────
// 각 키워드로 법령명 검색 → 본법 + 시행령 + 시행규칙 모두 포함됨
const SEARCH_KEYWORDS = ["의료", "응급", "소방", "건축", "안전", "보건"];
const DISPLAY_PER_KEYWORD = 100; // 법령명 검색 결과 수
const API_DELAY_MS = 400;        // 법제처 API rate limit 대응

// ── 유틸 함수 ────────────────────────────────────────────────
function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function formatDate(dateStr) {
  if (!dateStr || String(dateStr).length !== 8) return String(dateStr || "");
  const s = String(dateStr);
  return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
}

// ── 핵심: UTF-8 안전 fetch (과거 atob() 버그 방지)
// res.json()은 내부적으로 인코딩 추론 오류 가능 → arrayBuffer 경유로 강제 UTF-8
async function fetchJson(url) {
  const res = await fetch(url, {
    headers: {
      Accept: "application/json",
      Referer: "https://medical-law-search.vercel.app/",
    },
  });
  if (!res.ok) throw new Error(`HTTP ${res.status} — ${url}`);

  // UTF-8 강제 디코딩 (과거 atob() 한글 깨짐 재발 방지)
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder("utf-8").decode(buffer);
  return JSON.parse(text);
}

// ── 법제처 API 래퍼 ──────────────────────────────────────────
async function fetchLawList(query, display = DISPLAY_PER_KEYWORD) {
  const url =
    `${LAW_API_BASE}/lawSearch.do` +
    `?OC=${LAW_API_OC}&target=law&type=JSON` +
    `&query=${encodeURIComponent(query)}&display=${display}&page=1`;
  const data = await fetchJson(url);
  return toArray(data?.LawSearch?.law);
}

async function fetchLawArticles(lawId) {
  const url =
    `${LAW_API_BASE}/lawService.do` +
    `?OC=${LAW_API_OC}&target=law&type=JSON&ID=${lawId}`;
  const data = await fetchJson(url);
  return {
    articles: toArray(data?.법령?.조문?.조문단위),
    serialNo: String(data?.법령?.기본정보?.법령일련번호 || ""),
  };
}

// ── 조문 내용 추출 (항 포함) ─────────────────────────────────
function extractContent(articleUnit) {
  const main = String(articleUnit["조문내용"] || "");
  const subs = toArray(articleUnit["항"]);
  const subText = subs
    .map((s) => String(s["항내용"] || ""))
    .filter(Boolean)
    .join(" ");
  return main ? `${main} ${subText}`.trim() : subText.trim();
}

// ── Supabase upsert ──────────────────────────────────────────
async function upsertLaw(law, serialNo) {
  const { error } = await supabase.from("laws").upsert(
    {
      law_id:        String(law["법령ID"] || ""),
      law_name:      String(law["법령명한글"] || law["법령명"] || ""),
      law_type:      String(law["법령구분"] || ""),
      effective_date: formatDate(law["시행일자"]),
      law_serial_no: serialNo,
    },
    { onConflict: "law_id" }
  );
  if (error) console.warn("  ⚠ laws upsert 오류:", error.message);
}

async function upsertArticles(lawId, articles) {
  const rows = articles
    .map((art) => {
      const articleNo = String(art["@조문번호"] || art["조문번호"] || "");
      if (!articleNo) return null;
      return {
        id:            `${lawId}_${articleNo}`,
        law_id:        lawId,
        article_no:    articleNo,
        article_title: String(art["조문제목"] || ""),
        content:       extractContent(art),
      };
    })
    .filter(Boolean);

  if (!rows.length) return;

  const { error } = await supabase
    .from("articles")
    .upsert(rows, { onConflict: "id" });
  if (error) console.warn("  ⚠ articles upsert 오류:", error.message);
}

// ── 메인 수집 루프 ───────────────────────────────────────────
async function main() {
  console.log("🚀 법령 데이터 수집 시작\n");

  // 1단계: 키워드별 법령 목록 수집 → 중복 제거
  const lawMap = new Map(); // law_id → law object

  for (const kw of SEARCH_KEYWORDS) {
    console.log(`🔍 키워드 "${kw}" 법령 검색 중...`);
    try {
      const laws = await fetchLawList(kw);
      for (const law of laws) {
        const id = String(law["법령ID"] || "");
        if (id && !lawMap.has(id)) lawMap.set(id, law);
      }
      console.log(`   → ${laws.length}개 법령 발견 (누적 ${lawMap.size}개)`);
    } catch (e) {
      console.warn(`   ⚠ "${kw}" 검색 실패:`, e.message);
    }
    await sleep(API_DELAY_MS);
  }

  const allLaws = [...lawMap.values()];
  console.log(`\n📋 총 ${allLaws.length}개 법령 수집 → 조문 fetch 시작\n`);

  // 2단계: 각 법령의 조문 전체 수집 → Supabase 저장
  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < allLaws.length; i++) {
    const law = allLaws[i];
    const lawId   = String(law["법령ID"] || "");
    const lawName = String(law["법령명한글"] || law["법령명"] || "");
    const lawType = String(law["법령구분"] || "");

    process.stdout.write(
      `[${i + 1}/${allLaws.length}] ${lawName} (${lawType}) ... `
    );

    try {
      const { articles, serialNo } = await fetchLawArticles(lawId);

      await upsertLaw(law, serialNo);
      await upsertArticles(lawId, articles);

      console.log(`✅ 조문 ${articles.length}건 저장`);
      successCount++;
    } catch (e) {
      console.log(`❌ 실패 — ${e.message}`);
      failCount++;
    }

    await sleep(API_DELAY_MS);
  }

  console.log(`\n✅ 수집 완료 — 성공: ${successCount}개 / 실패: ${failCount}개`);
}

main().catch((e) => {
  console.error("💥 스크립트 오류:", e);
  process.exit(1);
});
