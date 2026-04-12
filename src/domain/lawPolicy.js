/**
 * 의료법령 서비스의 핵심 비즈니스 정책을 정의합니다.
 */

// 검색어 의미 보완을 위한 키워드 맵 (도메인 지식)
const KEYWORD_SYNONYM_MAP = {
  "병실 크기 기준": "의료기관 시설규격", "병실 면적": "의료기관 시설규격",
  "병실": "병상", "침대": "병상", "시설 기준": "의료기관의 시설기준",
  "면적": "의료기관의 시설기준", "시설규칙": "의료기관 시설규격",
  "의료기관의 시설기준": "시설규격", "인력": "의료인 정원",
  "정원": "의료인 정원", "배치 기준": "의료인 정원",
};

/**
 * 법령 명칭을 기반으로 업무 분야별 카테고리를 추론합니다.
 */
export function getCategoryByLawName(lawName) {
  if (lawName.includes("의료법")) return "의료법 계열";
  if (lawName.includes("개인정보")) return "개인정보보호법";
  if (lawName.includes("근로기준")) return "근로기준법";
  if (lawName.includes("응급의료")) return "의료법 계열";
  if (lawName.includes("약사법")) return "의료법 계열";
  return "기타";
}

/**
 * 검색 결과의 중요도를 결정하는 우선순위 정책입니다. (의료 관련법 우선)
 */
export function getSearchPriority(lawName) {
  if (lawName.includes("의료법") || lawName.includes("응급의료") || lawName.includes("약사법")) return 1;
  if (lawName.includes("개인정보")) return 2;
  if (lawName.includes("근로기준")) return 3;
  return 4;
}

/**
 * 검색 누락을 방지하기 위해 유의어 및 토큰 기반의 대체 검색어 목록을 생성합니다.
 */
export function getSearchCandidates(query) {
  const trimmed = String(query || "").trim();
  if (!trimmed) return [];
  
  const tokens = trimmed.split(/\s+/).map(t => t.trim()).filter(t => t.length >= 2);
  const candidates = [trimmed];
  
  const pushMapped = (key) => {
    const mapped = KEYWORD_SYNONYM_MAP[key];
    if (mapped && mapped !== key) candidates.push(mapped);
  };

  pushMapped(trimmed);
  for (const t of tokens) pushMapped(t);
  candidates.push(...tokens);
  
  // 중복 제거 및 길이순 정렬 (긴 검색어 우선)
  return Array.from(new Set(candidates)).sort((a, b) => b.length - a.length);
}
