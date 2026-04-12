import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("⚠️ Supabase 환경 변수가 설정되지 않았습니다.");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
