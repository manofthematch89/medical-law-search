# Phase 5: 시행규칙 수집 및 데이터 고도화 계획

## 🎯 목표
1. 본법(Law) 외에 시행령, 시행규칙(Enforcement Rule)까지 수집 범위 확대.
2. '별표' 데이터 누락 문제 해결을 위한 법령 ID 트래킹 로직 개선.
3. KeywordMap 확장을 통한 검색 정확도 향상.

## 🛠 기술적 요구사항

### 1. 데이터 수집 로직 수정 (scripts/collect-laws.mjs)
- **부모-자식 법령 매핑:** 특정 키워드(예: 의료법) 검색 시 반환되는 본법 ID뿐만 아니라, 그에 종속된 시행령, 시행규칙 ID를 함께 추출하도록 수정.
- **API 호출 전략:** `lawSearch.do` 결과에서 상위 법령뿐만 아니라 관련 법령 리스트 전체를 파싱할 것.
- **별표 데이터 처리:** 조문 내용 중 "별표 X"를 참조하는 경우, 해당 텍스트를 검색 인덱스에 포함하거나 별표 링크를 생성할 수 있는 기반 마련.

### 2. DB 스키마 보완 (scripts/schema.sql)
- `laws` 테이블에 `law_type` (본법, 시행령, 시행규칙 등) 필드 추가.
- `articles` 테이블의 검색 성능 유지를 위해 GIN 인덱스 재점검.

### 3. 검색 로직 고도화 (app/api/search/route.js)
- **KeywordMap 추가:** - "면적", "시설 기준" -> "의료기관의 시설기준", "시설규칙" 매핑 추가.
  - "인력", "정원" -> "의료인 정원", "배치 기준" 매핑 추가.

## ✅ 체크리스트
- [x] `scripts/schema.sql`: `articles.category` 컬럼 및 `idx_articles_category` 인덱스 추가
- [x] collect-laws.mjs: `lawService.do` 상세(JSON) 내부의 하위/관련 법령 ID를 재귀 추출해 수집 큐를 확장하고, 조문 content에 `별표` 관련 문자열을 함께 결합 (DB 적재 “검증”은 아직)
- [x] `scripts/categorize-laws.mjs`: `articles.category` 비어있는 조문을 키워드 규칙으로 분류 후 upsert (`totalUpdated=2820`)
- [x] 검색 UI: 검색 결과 `category`를 동적으로 추출해 필터 버튼으로 노출하고 클릭 시 필터링 작동
- [x] `scripts/generate-embeddings.mjs`: Gemini 임베딩 생성 후 `articles.embedding` 채우기 (실행 완료)
- [x] `app/api/search/route.js`: Gemini 임베딩 + `match_articles` RPC 기반 의미검색 전환
- [x] 검색 fallback: 벡터 결과 0건일 때 토큰 분해 기반 텍스트 fallback 적용
- [ ] 검색 결과에서 본법과 시행규칙이 명확히 구분되어 표시되는가?
- [ ] "병실 면적" 검색 시 관련 시행규칙 조문이 상단에 노출되는가?