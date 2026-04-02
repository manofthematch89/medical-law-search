import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

// .env.local 직접 로드 (process.cwd() 기준 — Windows 한글 경로 대응)
try {
  const envPath = join(process.cwd(), '.env.local');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim();
    if (key && !process.env[key]) process.env[key] = val;
  }
  console.log('[ENV] LAW_API_OC =', process.env.LAW_API_OC);
} catch (e) { console.error('[ENV] .env.local 로드 실패:', e.message); }

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

const HEADERS = {
  'Referer': 'https://medical-law-search.vercel.app/',
  'Accept': 'application/json',
};

async function fetchLawList(keyword) {
  const url = `https://www.law.go.kr/DRF/lawSearch.do?OC=${process.env.LAW_API_OC}&target=law&type=JSON&query=${encodeURIComponent(keyword)}`;
  const res = await fetch(url, { headers: HEADERS });
  const text = await res.text();
  console.log(`[DEBUG] status=${res.status} body=${text.slice(0, 300)}`);
  let data;
  try { data = JSON.parse(text); } catch { return []; }
  const laws = data.LawSearch?.law;
  if (!laws) return [];
  return Array.isArray(laws) ? laws : [laws];
}

async function fetchLawDetail(lawId) {
  const url = `https://www.law.go.kr/DRF/lawService.do?OC=${process.env.LAW_API_OC}&target=law&type=JSON&ID=${lawId}`;
  const res = await fetch(url, { headers: HEADERS });
  const buffer = await res.arrayBuffer();
  const text = new TextDecoder('utf-8').decode(buffer);
  const data = JSON.parse(text);
  return data.법령; // ← data.Law → data.법령
}

function toArray(val) {
  if (!val) return [];
  return Array.isArray(val) ? val : [val];
}

function extractContent(article) {
  const main = String(article['조문내용'] || '');
  const subs = toArray(article['항'] || article.항);
  const subText = subs.map(s => String(s['항내용'] || '')).filter(Boolean).join(' ');
  return main ? `${main} ${subText}`.trim() : subText;
}

async function collect() {
  console.log('🚀 법령 데이터 수집 및 Supabase 저장을 시작합니다...');
  const keywords = ['의료', '응급', '소방', '건축', '안전', '보건'];

  for (const kw of keywords) {
    console.log(`🔍 키워드 [${kw}] 검색 중...`);
    const laws = await fetchLawList(kw);

    if (!laws || laws.length === 0) {
      console.log(`⚠️ [${kw}] 결과 없음`);
      continue;
    }

    for (const law of laws) {
      // 실제 필드명: 법령명한글, 법령구분명, 법령ID, 시행일자, 법령일련번호
      const lawName = law['법령명한글'] || law['법령명'] || '';
      const lawId   = law['법령ID']    || law['법령일련번호'] || '';
      console.log(`📑 [${lawName}] 수집 및 저장 중...`);
      try {
        const detail = await fetchLawDetail(lawId);
        if (!detail) { console.warn(`  ⚠️ 상세 없음`); continue; }

        await supabase.from('laws').upsert({
          law_id:        lawId,
          law_name:      lawName,
          law_type:      law['법령구분명'] || '',
          effective_date: law['시행일자']  || '',
          law_serial_no: law['법령일련번호'] || '',
        });

        const articles = toArray(detail['조문']?.['조문단위']);
        for (const article of articles) {
          const articleNo = String(article['@조문번호'] || article['조문번호'] || '');
          await supabase.from('articles').upsert({
            id:            `${lawId}_${articleNo}`,
            law_id:        lawId,
            article_no:    articleNo,
            article_title: article['조문제목'] || '',
            content:       extractContent(article),
          });
        }
        await delay(400);
      } catch (err) {
        console.error(`❌ [${lawName}] 오류:`, err.message);
      }
    }
  }
  console.log('✅ 모든 데이터 수집 및 저장 완료!');
}

collect().catch(console.error);