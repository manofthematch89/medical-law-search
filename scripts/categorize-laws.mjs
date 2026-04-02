import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";
import { join } from "path";

// ---------------------------------------------
// .env.local 로드 (collect-laws.mjs와 동일 방식)
// ---------------------------------------------
try {
  const envPath = join(process.cwd(), ".env.local");
  const lines = readFileSync(envPath, "utf-8").split("\n");
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
  console.log("[ENV] loaded from .env.local");
} catch (e) {
  console.error("[ENV] .env.local 로드 실패:", e.message);
}

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ 환경변수 누락: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
try {
  const host = new URL(SUPABASE_URL).host;
  console.log(`[ENV] SUPABASE_URL host: ${host}`);
} catch {
  console.log(`[ENV] SUPABASE_URL: ${SUPABASE_URL}`);
}

const delay = (ms) => new Promise((r) => setTimeout(r, ms));

function broadCategoryFromLawName(lawName) {
  const name = String(lawName || "");
  // app/api/search/route.js의 getCategoryFromLawName 규칙을 그대로 사용
  if (name.includes("의료법")) return "의료법 계열";
  if (name.includes("응급의료")) return "의료법 계열";
  if (name.includes("약사법")) return "의료법 계열";
  if (name.includes("개인정보")) return "개인정보보호법";
  if (name.includes("근로기준")) return "근로기준법";
  return "기타";
}

const WORK_CATEGORY_RULES = [
  {
    name: "시설/환경",
    // 사용자 요청 키워드 우선 + keywordMap에서 쓰이던 확장 단어(최소) 반영
    keywords: [
      "시설",
      "면적",
      "병상",
      "소방",
      "안전",
      "규격",
      "병실",
      "의료기관 시설규격",
    ],
  },
  {
    name: "인력/면허",
    keywords: ["의료인", "정원", "의사", "간호사", "면허", "자격", "배치", "인력"],
  },
  {
    name: "원무/행정",
    keywords: ["진료기록", "서류", "보존", "영수증", "제증명", "보고", "게시"],
  },
  {
    name: "응급/특수",
    keywords: ["응급의료", "혈액", "마약", "특수장비", "구급차"],
  },
];

function pickWorkCategory(text) {
  const t = String(text || "");

  let best = null;
  let bestScore = 0;
  for (const rule of WORK_CATEGORY_RULES) {
    let score = 0;
    for (const kw of rule.keywords) {
      if (kw && t.includes(kw)) score += 1;
    }
    if (score > bestScore) {
      best = rule.name;
      bestScore = score;
    }
  }

  return bestScore > 0 ? best : "";
}

async function main() {
  console.log("🚀 categorize-laws 시작");

  const batchSize = 60;
  let totalUpdated = 0;

  while (true) {
    const { data, error } = await supabase
      .from("articles")
      .select("id,law_id,article_title,content,category")
      // category가 비어있는 조문만 대상으로 (null 또는 빈 문자열)
      .or("category.is.null,category.eq.")
      .order("id", { ascending: true })
      .range(0, batchSize - 1);

    if (error) throw error;
    if (!data || data.length === 0) break;

    const lawIds = [...new Set(data.map((r) => String(r.law_id || "")))].filter(Boolean);
    const { data: lawRows, error: lawErr } = lawIds.length
      ? await supabase.from("laws").select("law_id,law_name").in("law_id", lawIds)
      : { data: [], error: null };
    if (lawErr) throw lawErr;

    const lawNameById = new Map();
    for (const lr of lawRows || []) lawNameById.set(String(lr.law_id), lr.law_name);

    const updates = [];
    for (const row of data) {
      const lawName = lawNameById.get(String(row.law_id || "")) || "";
      const broad = broadCategoryFromLawName(lawName);

      const combinedText = `${row.article_title || ""}\n${row.content || ""}`;
      const work = pickWorkCategory(combinedText);

      // category 컬럼 목적(업무 분류) 기준으로 우선 workCategory를 사용,
      // 매칭이 없으면 기존 lawName 기반 broadCategory로 fallback.
      const newCategory = work || broad;

      if (!newCategory) continue;
      updates.push({ id: row.id, category: newCategory });
    }

    if (updates.length) {
      const { error: upErr } = await supabase
        .from("articles")
        .upsert(updates, { onConflict: "id" });
      if (upErr) throw upErr;
      totalUpdated += updates.length;
    }

    await delay(250);
    console.log(`... progress: updated=${totalUpdated}`);
  }

  console.log(`✅ categorize-laws 완료: totalUpdated=${totalUpdated}`);
}

main().catch((e) => {
  const msg = String(e?.message || "");
  // Supabase DB에 schema가 아직 적용되지 않은 경우
  if (e?.code === "42703" && msg.includes("articles.category")) {
    console.error("💥 categorize-laws 오류: `articles.category` 컬럼이 Supabase에 없습니다.");
    console.error("아래 SQL을 Supabase SQL Editor에서 실행한 뒤 다시 시도하세요.");
    console.error("----");
    console.error("ALTER TABLE articles ADD COLUMN IF NOT EXISTS category TEXT;");
    console.error("CREATE INDEX IF NOT EXISTS idx_articles_category ON articles(category);");
    console.error("----");
  } else {
    console.error("💥 categorize-laws 오류:", e);
  }
  // 프로세스를 강제 종료하지 않아서, Windows/Node 종료 타이밍에서 발생할 수 있는
  // UV assertion 로그를 줄입니다.
  return;
});

