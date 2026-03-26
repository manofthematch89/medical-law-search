# MdLaw 진행 상황

## 최근 수정 (2026-03-26)

### 수정된 버그 - app/api/search/route.js

#### 1. /article/undefined 링크 문제 - 수정 완료
- **원인**: search/route.js가 LawCard.js가 기대하는 id 필드 대신 lawId 를 반환
- **수정**: id = 법령ID + "_" + 조문번호 형식으로 반환 (article/route.js와 동일)
- **결과**: 상세 보기 링크가 /article/001788_1 형식으로 정상 작동

#### 2. 원문 링크 없는 문제 - 수정 완료
- **원인**: search/route.js가 source 필드를 반환하지 않음
- **수정**: source: "https://www.law.go.kr/lsInfo.do?lsiSeq=" + 법령일련번호 추가
- **결과**: 원문 링크가 법제처로 정상 연결

#### 3. 잘못된 필드명 - 수정 완료
- **원인**: articleTitle, articleNumber 등 LawCard.js가 기대하지 않는 이름으로 반환
- **수정**: title, article: '제X조', category, effectiveDate, summary 올바른 필드명으로 통일

#### 4. 검색 결과에 해당 법령 안 나오는 문제 - 수정 완료
- **원인**: display=10에서 상위 5개만 사용, 정렬 없이 API 순서 그대로 사용
- **수정**: display=20으로 확장 후 검색어와 정확히 일치하는 법령명 우선 정렬
- **결과**: 의료법 검색 시 의료법, 의료법 시행령, 의료법 시행규칙이 최상단 (총 433개)

#### 5. 한국어 최상위 JSON 키 대응 - 수정 완료 (이전 세션)
- **원인**: lawService.do?type=JSON 응답 최상위 키가 한국어 '법령'으로 반환됨
- **수정**: Object.values(articleData)[0] 로 동적 접근

---

## 현재 앱 상태 (검증 완료)

- 검색: 의료법 입력 시 의료법 자체가 첫 번째 결과 표시 ✅
- 상세 보기: /article/{lawId}_{articleNumber} 형식으로 정상 라우팅 ✅
- 원문: https://www.law.go.kr/lsInfo.do?lsiSeq=... 정상 링크 ✅
- 필드: id, lawName, article, title, summary, content, source, category, effectiveDate 모두 정상 ✅

## 커밋 이력

- Fix: search/route.js - correct field names (id, source, category) for LawCard
- Fix: prioritize exact law name match in search results
