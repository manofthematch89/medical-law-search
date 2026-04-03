import { createClient } from "@supabase/supabase-js";
import { GoogleGenAI } from "@google/genai";
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
// 로컬 스크립트이므로 server-side 키 사용을 권장하되, 기존 변수명도 호환
const GEMINI_API_KEY =
  process.env.GEMINI_API_KEY ||
  process.env.NEXT_PUBLIC_GEMINI_API_KEY ||
  "";

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error("❌ 환경변수 누락: SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}
if (!GEMINI_API_KEY) {
  console.error("❌ 환경변수 누락: GEMINI_API_KEY (또는 NEXT_PUBLIC_GEMINI_API_KEY)");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
const ai = new GoogleGenAI({ apiKey: GEMINI_API_KEY });

// 2026 기준 Gemini embedding 모델 (공식 문서)
// 필요 시 .env.local에 GEMINI_EMBEDDING_MODEL로 오버라이드
const GEMINI_EMBEDDING_MODEL = process.env.GEMINI_EMBEDDING_MODEL || "gemini-embedding-001";

function parseArgs(argv) {
  const opts = {
    limit: null,
    lawId: "",
    idPrefix: "",
  };

  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--limit") {
      const v = Number(argv[i + 1]);
      if (!Number.isNaN(v) && v > 0) opts.limit = Math.floor(v);
      i++;
      continue;
    }
    if (a === "--law-id") {
      opts.lawId = String(argv[i + 1] || "").trim();
      i++;
      continue;
    }
    if (a === "--id-prefix") {
      opts.idPrefix = String(argv[i + 1] || "").trim();
      i++;
      continue;
    }
  }
  return opts;
}

async function generateEmbeddings() {
  console.log('🚀 벡터 변환 작업을 시작합니다...');
  console.log(`[GEMINI] embedding model: ${GEMINI_EMBEDDING_MODEL}`);
  const opts = parseArgs(process.argv.slice(2));
  console.log(`[RUN] options: ${JSON.stringify(opts)}`);

  // 스키마 적용 상태에 따라 embedding_vector 컬럼이 없을 수 있어 fallback 지원
  let useEmbeddingVector = true;
  let query = supabase
    .from('articles')
    .select('id, law_id, article_title, content')
    .or('embedding.is.null,embedding_vector.is.null'); // 신규 스키마 기준

  if (opts.lawId) query = query.eq("law_id", opts.lawId);
  if (opts.idPrefix) query = query.like("id", `${opts.idPrefix}%`);
  if (opts.limit) query = query.limit(opts.limit);

  let articlesRes = await query;

  if (articlesRes.error && String(articlesRes.error.message || "").includes("embedding_vector")) {
    useEmbeddingVector = false;
    console.log("[DB] embedding_vector 컬럼 없음 → embedding 컬럼만 사용하는 fallback 모드로 진행");

    let fallbackQuery = supabase
      .from('articles')
      .select('id, law_id, article_title, content')
      .is('embedding', null);
    if (opts.lawId) fallbackQuery = fallbackQuery.eq("law_id", opts.lawId);
    if (opts.idPrefix) fallbackQuery = fallbackQuery.like("id", `${opts.idPrefix}%`);
    if (opts.limit) fallbackQuery = fallbackQuery.limit(opts.limit);

    articlesRes = await fallbackQuery;
  }

  const { data: articles, error } = articlesRes;
  if (error) throw error;
  console.log(`대상 조문: ${articles.length}개`);

  let successCount = 0;
  for (const article of articles) {
    try {
      const text = `${article.article_title} ${article.content}`;

      const result = await ai.models.embedContent({
        model: GEMINI_EMBEDDING_MODEL,
        contents: text,
      });

      // @google/genai 결과는 embeddings 배열로 내려옴
      const embedding = result?.embeddings?.[0]?.values;
      if (!Array.isArray(embedding) || embedding.length === 0) {
        throw new Error("EMPTY_EMBEDDING");
      }

      const updatePayload = useEmbeddingVector
        ? { embedding, embedding_vector: embedding }
        : { embedding };
      await supabase
        .from('articles')
        .update(updatePayload)
        .eq('id', article.id);

      console.log(`✅ 완료 (ID: ${article.id})`);
      successCount++;
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

      // 무료 할당량 초과(429) 시 계속 시도해도 전부 실패하므로 즉시 중단
      if (msg.includes('"code":429') || msg.includes("RESOURCE_EXHAUSTED") || msg.includes("Quota exceeded")) {
        throw new Error("GEMINI_QUOTA_EXCEEDED");
      }
    }
  }
  console.log(`✨ 모든 작업이 완료되었습니다. (성공 ${successCount}건)`);
}

generateEmbeddings().catch((e) => {
  if (String(e?.message || "") === "GEMINI_API_KEY_INVALID") {
    console.error("🛑 중단: Gemini API 키가 유효하지 않습니다. (.env.local의 NEXT_PUBLIC_GEMINI_API_KEY 확인)");
  } else if (String(e?.message || "") === "GEMINI_EMBEDDING_MODEL_NOT_SUPPORTED") {
    console.error("🛑 중단: 현재 설정된 embedding 모델이 v1beta에서 embedContent를 지원하지 않습니다.");
    console.error("→ `.env.local`에 `GEMINI_EMBEDDING_MODEL=embedding-001` 같은 값으로 지정 후 재시도하세요.");
  } else if (String(e?.message || "") === "GEMINI_QUOTA_EXCEEDED") {
    console.error("🛑 중단: Gemini EmbedContent 일일 할당량(무료 티어)을 초과했습니다.");
    console.error("→ 내일(쿼터 리셋 후) 같은 명령을 다시 실행하면 남은 건부터 이어서 진행됩니다.");
  } else {
    console.error("💥 스크립트 오류:", e);
  }
  // 강제 종료 시 Windows 환경에서 uv assertion 로그가 나올 수 있어 반환만 처리
  return;
});