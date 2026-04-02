import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function collect() {
  console.log('🚀 법령 데이터 수집을 시작합니다...');
  
  const keywords = ['의료', '응급', '소방', '건축', '안전', '보건'];
  
  for (const kw of keywords) {
    console.log(`🔍 키워드 [${kw}] 수집 중...`);
    // 법제처 API 호출 및 Supabase 저장 로직 (생략 - 안티그라비티가 작성한 전체 코드를 여기에 넣으시면 됩니다)
    // 인호님 파일 탐색기에 있는 collect-laws.mjs 내용을 여기로 복사해오세요!
  }
}

collect().catch(console.error);