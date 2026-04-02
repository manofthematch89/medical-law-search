import { createClient } from "@supabase/supabase-js";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { readFileSync } from "fs";
import { join } from "path";

// .env.local 직접 로드 (collect-laws.mjs / categorize-laws.mjs와 동일 방식)
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
const GEMINI_API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY || "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ 환경변수 누락: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error("❌ 환경변수 누락: NEXT_PUBLIC_GEMINI_API_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

// Gemini embedding 모델은 계정/버전(v1beta)별로 가용 모델명이 다를 수 있어
// 환경변수로 오버라이드 가능하게 두고, 기본값은 보수적으로 설정합니다.
// 예: GEMINI_EMBEDDING_MODEL=embedding-001
const GEMINI_EMBEDDING_MODEL =
  process.env.GEMINI_EMBEDDING_MODEL ||
  process.env.NEXT_PUBLIC_GEMINI_EMBEDDING_MODEL ||
  "embedding-001";

const model = genAI.getGenerativeModel({ model: GEMINI_EMBEDDING_MODEL });

async function preflightListModels() {
  // listModels()는 계정에 따라 실패할 수 있으므로 best-effort로만 사용
  try {
    const res = await genAI.listModels();
    const models = res?.models || [];
    const embedCapable = models
      .filter((m) => Array.isArray(m.supportedGenerationMethods) && m.supportedGenerationMethods.includes("embedContent"))
      .map((m) => m.name);

    console.log(`[GEMINI] embedding model: ${GEMINI_EMBEDDING_MODEL}`);
    if (embedCapable.length) {
      console.log(`[GEMINI] embedContent 지원 모델 예시: ${embedCapable.slice(0, 8).join(", ")}`);
    } else {
      console.log("[GEMINI] embedContent 지원 모델을 listModels에서 찾지 못했습니다.");
    }
  } catch (e) {
    console.log(`[GEMINI] embedding model: ${GEMINI_EMBEDDING_MODEL}`);
    console.log("[GEMINI] listModels 생략(권한/환경 이슈 가능):", String(e?.message || e));
  }
}

async function generateEmbeddings() {
  console.log('🚀 벡터 변환 작업을 시작합니다...');
  await preflightListModels();

  const { data: articles, error } = await supabase
    .from('articles')
    .select('id, article_title, content')
    .is('embedding', null); // 아직 변환 안 된 것만

  if (error) throw error;
  console.log(`대상 조문: ${articles.length}개`);

  for (const article of articles) {
    try {
      const text = `${article.article_title} ${article.content}`;
      const result = await model.embedContent(text);
      const embedding = result.embedding.values;

      await supabase
        .from('articles')
        .update({ embedding })
        .eq('id', article.id);

      console.log(`✅ 완료 (ID: ${article.id})`);
      // 무료 티어 속도 제한 방지 (1초 대기)
      await new Promise(resolve => setTimeout(resolve, 1000));
    } catch (e) {
      const msg = String(e?.message || "");
      console.error(`❌ 실패 (ID: ${article.id}):`, msg);

      // API 키가 잘못된 경우, 계속 시도해봐야 전부 실패하므로 즉시 중단
      if (msg.includes("API_KEY_INVALID") || msg.includes("API key not valid")) {
        throw new Error("GEMINI_API_KEY_INVALID");
      }

      // 모델 미지원/미존재(404)도 계속 시도해봐야 전부 실패 → 즉시 중단
      if (
        msg.includes("404") &&
        (msg.includes("is not found") || msg.includes("not supported for embedContent"))
      ) {
        throw new Error("GEMINI_EMBEDDING_MODEL_NOT_SUPPORTED");
      }
    }
  }
  console.log('✨ 모든 작업이 완료되었습니다.');
}

generateEmbeddings().catch((e) => {
  if (String(e?.message || "") === "GEMINI_API_KEY_INVALID") {
    console.error("🛑 중단: Gemini API 키가 유효하지 않습니다. (.env.local의 NEXT_PUBLIC_GEMINI_API_KEY 확인)");
  } else if (String(e?.message || "") === "GEMINI_EMBEDDING_MODEL_NOT_SUPPORTED") {
    console.error("🛑 중단: 현재 설정된 embedding 모델이 v1beta에서 embedContent를 지원하지 않습니다.");
    console.error("→ `.env.local`에 `GEMINI_EMBEDDING_MODEL=embedding-001` 같은 값으로 지정 후 재시도하세요.");
  } else {
    console.error("💥 스크립트 오류:", e);
  }
  process.exit(1);
});