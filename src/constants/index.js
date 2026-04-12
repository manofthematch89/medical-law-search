/**
 * 애플리케이션 전반에서 사용되는 고정 상수 모음
 */

// 조문 분류 및 필터링 순서
export const CATEGORY_ORDER = [
  "전체",
  "시설/환경",
  "인력/면허",
  "원무/행정",
  "응급/특수",
  "의료법 계열",
  "개인정보보호법",
  "근로기준법",
  "기타"
];

// 최근 검색어 최대 보관 개수
export const MAX_RECENT_SEARCHES = 10;

// 외부 링크 포맷
export const EXTERNAL_LINKS = {
  LAW_GO_KR_SEARCH: (query) => `https://www.law.go.kr/lsSc.do?query=${encodeURIComponent(query)}`,
  LAW_GO_KR_DETAIL: (seq) => `https://www.law.go.kr/lsInfo.do?lsiSeq=${seq}`,
};
