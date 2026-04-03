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

function isLikelyLawId(value) {
  const s = String(value || '').trim();
  if (!s) return false;
  // 법령ID / 법령일련번호는 숫자 기반으로 내려오는 경우가 많음.
  // 너무 짧거나(예: "1") 너무 길면 제외.
  // (조문 상세 id에 포함되는 법령ID 예시: "000218" 처럼 6자리도 존재)
  return /^\d{6,10}$/.test(s);
}

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

  // Phase 5: 별표(표/부속자료) 참조가 기사 단위에 포함되는 케이스가 있어
  // "별표*" 키를 가진 필드 문자열을 함께 붙여 검색 인덱스 누락을 완화한다.
  const extraTableParts = [];
  for (const [k, v] of Object.entries(article || {})) {
    if (!k.includes('별표')) continue;
    if (typeof v === 'string' && v.trim()) extraTableParts.push(v.trim());
    if (Array.isArray(v)) {
      for (const item of v) {
        if (typeof item === 'string' && item.trim()) extraTableParts.push(item.trim());
      }
    }
  }

  const joined = [main, subText, extraTableParts.join(' ')].filter(Boolean).join(' ');
  return joined.trim();
}

function extractRelatedLawIdsFromDetail(detail) {
  const ids = new Set();
  const seen = new WeakSet();

  // detail 구조가 케이스별로 달라 재귀적으로 "법령ID/법령일련번호" 값을 수집한다.
  const stack = [{ v: detail, depth: 0 }];
  while (stack.length) {
    const { v, depth } = stack.pop();
    if (!v || depth > 6) continue;
    if (typeof v !== 'object') continue;
    if (seen.has(v)) continue;
    seen.add(v);

    if (Array.isArray(v)) {
      for (const item of v) stack.push({ v: item, depth: depth + 1 });
      continue;
    }

    for (const [k, child] of Object.entries(v)) {
      if (k === '법령ID' || k === '법령일련번호') {
        if (isLikelyLawId(child)) ids.add(String(child));
      }
      if (child && typeof child === 'object') {
        stack.push({ v: child, depth: depth + 1 });
      }
    }
  }

  return [...ids];
}

async function collect() {
  console.log('🚀 법령 데이터 수집 및 Supabase 저장을 시작합니다...');

  // 본법 + 시행령/시행규칙을 검색 단계에서부터 시드로 넣고, 응답 JSON 전체에서 관련 ID를 추출
  const lawNameSeeds = [
    '의료법',
    '의료법 시행령',
    '의료법 시행규칙',
    '의료법시행령',
    '의료법시행규칙',
    '응급의료에 관한 법률',
    '응급의료에 관한 법률 시행령',
    '응급의료에 관한 법률 시행규칙',
  ];
  const topicKeywords = ['의료', '응급', '소방', '건축', '안전', '보건'];
  const keywords = [...new Set([...lawNameSeeds, ...topicKeywords])];

  // Phase 5: "키워드로 뜬 법령" 뿐 아니라, 법령 상세(JSON) 안에 포함된 하위/관련 법령 ID까지 확장 수집.
  const lawQueue = [];
  const seenLawIds = new Set();

  function enqueueLawIdsFromSearchRow(law) {
    let ids = extractRelatedLawIdsFromDetail(law);
    if (!ids.length) {
      const lawId = law['법령ID'] || law['법령일련번호'] || '';
      if (isLikelyLawId(lawId)) ids = [String(lawId)];
    }
    for (const lawId of ids) {
      if (!isLikelyLawId(lawId)) continue;
      const idStr = String(lawId);
      if (seenLawIds.has(idStr)) continue;
      seenLawIds.add(idStr);
      lawQueue.push(idStr);
    }
  }

  for (const kw of keywords) {
    console.log(`🔍 키워드 [${kw}] 검색 중...`);
    const laws = await fetchLawList(kw);

    if (!laws || laws.length === 0) {
      console.log(`⚠️ [${kw}] 결과 없음`);
      continue;
    }

    for (const law of laws) {
      enqueueLawIdsFromSearchRow(law);
    }
  }

  console.log(`📋 총 ${lawQueue.length}개 법령 ID를 수집 큐에 적재했습니다.`);

  while (lawQueue.length) {
    const lawId = lawQueue.shift();
    try {
      const detail = await fetchLawDetail(lawId);
      if (!detail) {
        console.warn(`  ⚠️ [${lawId}] 상세 없음`);
        continue;
      }

      // 기본정보 필드명은 케이스별로 조금 달라서 fallback을 넓게 둔다.
      const base = detail['기본정보'] || {};
      const lawName =
        base['법령명한글'] || base['법령명'] || '';
      const lawType =
        base['법령구분'] || base['법령구분명'] || '';
      const effectiveDate =
        base['시행일자'] || '';
      const lawSerialNo =
        base['법령일련번호'] || '';

      console.log(`📑 [${lawName || lawId}] 조문/연관법령 수집 중...`);

      await supabase.from('laws').upsert({
        law_id: lawId,
        law_name: lawName,
        law_type: lawType,
        effective_date: effectiveDate,
        law_serial_no: lawSerialNo,
      });

      const articles = toArray(detail['조문']?.['조문단위']);
      for (const article of articles) {
        const articleNo = String(article['@조문번호'] || article['조문번호'] || '');
        if (!articleNo) continue;
        await supabase.from('articles').upsert({
          id: `${lawId}_${articleNo}`,
          law_id: lawId,
          article_no: articleNo,
          article_title: article['조문제목'] || '',
          content: extractContent(article),
        });
      }

      // 관련/하위 법령 ID 확장 적재 (Phase 5 핵심)
      const relatedIds = extractRelatedLawIdsFromDetail(detail);
      for (const rid of relatedIds) {
        if (!isLikelyLawId(rid)) continue;
        if (rid === lawId) continue;
        if (seenLawIds.has(rid)) continue;
        seenLawIds.add(rid);
        lawQueue.push(rid);
      }

      await delay(400);
    } catch (err) {
      console.error(`❌ [${lawId}] 오류:`, err.message);
    }
  }
  console.log('✅ 모든 데이터 수집 및 저장 완료!');
}

collect().catch(console.error);