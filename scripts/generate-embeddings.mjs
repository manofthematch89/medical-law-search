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
const model = genAI.getGenerativeModel({ model: "text-embedding-004" });

async function generateEmbeddings() {
  console.log('🚀 벡터 변환 작업을 시작합니다...');

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
    }
  }
  console.log('✨ 모든 작업이 완료되었습니다.');
}

generateEmbeddings().catch((e) => {
  if (String(e?.message || "") === "GEMINI_API_KEY_INVALID") {
    console.error("🛑 중단: Gemini API 키가 유효하지 않습니다. (.env.local의 NEXT_PUBLIC_GEMINI_API_KEY 확인)");
  } else {
    console.error("💥 스크립트 오류:", e);
  }
  process.exit(1);
});