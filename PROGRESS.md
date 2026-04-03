# MdLaw 진행 상황

---

## ✅ 완료 (2026-04-03) — 임베딩 스크립트 샘플링·쿼터·스키마 fallback

### 문제
- 로컬에서만 수정된 `generate-embeddings.mjs`가 커밋되지 않아 원격과 불일치

### 수정 (핀포인트)
| 파일 | 변경 내용 |
|---|---|
| `scripts/generate-embeddings.mjs` | `--limit`, `--law-id`, `--id-prefix` 샘플링 옵션 |
| `scripts/generate-embeddings.mjs` | 429/쿼터 시 중단 메시지 |
| `scripts/generate-embeddings.mjs` | `embedding_vector` 없을 때 `embedding`만 대상으로 하는 fallback |

### 배포
- `main` 푸시 완료 (커밋 `e174c83`)

## ✅ 완료 (2026-04-02) — 검색 API 의미검색 전환 + 긴 문장 fallback 보강

### 문제
- 긴 문장 검색에서 벡터 결과가 0건일 때 화면에 결과가 비어 보이는 문제가 있었음

### 원인
- 검색 API를 의미검색으로 전환한 뒤, fallback이 문장 전체 1회 텍스트 검색이라 긴 질의에서 매칭률이 낮았음

### 수정 (핀포인트)
| 파일 | 변경 내용 |
|---|---|
| `app/api/search/route.js` | Gemini 임베딩 + `match_articles` RPC 기반 의미검색으로 전환 |
| `app/api/search/route.js` | 벡터 결과 0건 시 `search_articles` fallback 추가 |
| `app/api/search/route.js` | fallback에서 긴 문장을 토큰 분해/키워드 매핑해 다중 검색 후 결과 병합 |

### 배포
- `main` 푸시 완료 (Vercel 자동 배포 트리거)

## ✅ 완료 (2026-04-02) — 임베딩 생성 (`articles.embedding`)

### 문제
- 조문 유사도 검색/벡터 기반 기능을 위해 `articles.embedding` 컬럼에 임베딩 벡터를 채워야 했음

### 원인
- Gemini 임베딩 모델/SDK가 업데이트되며 기존 모델명(`text-embedding-004`, `embedding-001`)이 v1beta에서 404로 실패하는 이슈가 발생

### 수정 (핀포인트)
| 파일 | 변경 내용 |
|---|---|
| `scripts/generate-embeddings.mjs` | `.env.local` 직접 로드 + `@google/genai` 기반 `gemini-embedding-001`로 임베딩 생성 후 `articles.embedding` 업데이트 |

### 실행 결과
- `node scripts/generate-embeddings.mjs` 실행 완료 (터미널: `✨ 모든 작업이 완료되었습니다.`)

## ✅ 완료 (2026-04-02) — `articles.category` 자동 분류

### 문제
- `articles.category` 기반 업무 분류 필터링을 위해, DB에 비어있는 조문들의 category를 채워야 했음

### 원인
- 스키마 확장(`articles.category`) 이후, 실제 데이터에 category 값 적재가 필요했음

### 수정 (핀포인트)
| 파일 | 변경 내용 |
|---|---|
| `scripts/categorize-laws.mjs` | `articles.category`가 `NULL/빈 문자열`인 조문만 조회해 `article_title+content` 키워드 규칙으로 분류 후 upsert |
| `scripts/schema.sql` | `articles.category` 컬럼 + `idx_articles_category` 인덱스 추가 |

### 실행 결과
- `node scripts/categorize-laws.mjs` 실행: `totalUpdated=2820`

## 🚧 진행 (2026-04-02) — Phase 5 시작: 하위 법령 ID 확장 수집 + 별표 인덱싱 보강

### 문제
- 시행규칙/별표(예: “병실 면적” 관련 기준표) 검색 품질이 본법 중심 적재만으로는 충분하지 않았음

### 원인
- `lawService.do` 상세(JSON) 안에 하위/관련 법령 ID가 포함되는데, 기존 수집은 “키워드로 뜬 법령”만 조문을 가져오는 방식이었음
- 조문 본문 생성 시 `별표*` 참조 텍스트가 일부 케이스에서 검색 인덱스에 덜 포함될 수 있었음

### 수정 (핀포인트)
| 파일 | 변경 내용 |
|---|---|
| `scripts/collect-laws.mjs` | 상세(JSON) 내부에서 `법령ID`/`법령일련번호`를 재귀 추출해 수집 큐에 추가(시행령/시행규칙 등 확장) |
| `scripts/collect-laws.mjs` | 조문 content 생성 시 `별표`를 포함하는 필드 문자열을 함께 결합해 검색 인덱스 누락 완화 |
| `scripts/schema.sql` | Supabase `laws/articles` 스키마 + `search_articles()` RPC를 main에 추가(Phase 3 기반) |
| `scripts/schema.sql` | `articles.category` 컬럼 및 `idx_articles_category` 인덱스 추가 |

### 미해결
- 실제 `node scripts/collect-laws.mjs` 실행 후 “시행규칙 조문 적재 여부”와 “병실 면적” 우선 노출을 검증해야 함

## ✅ 완료 (2026-04-02) — 원문 보기 source URL 버그 수정 (Phase 4 최종)

### 문제
- 검색 카드 "원문 ↗"는 정상 작동
- 상세 페이지 "법제처 원문 보기 ↗", AI 요약 "원문 ↗" → `lsSc.do?query=`(빈 쿼리) → law.go.kr 메인만 열림

### 원인 (브라우저로 API 응답 직접 확인)
- `/api/article?id=000218_26` 응답: `lawName: ""`, `source: "https://www.law.go.kr/lsSc.do?query="`
- `lawService.do` API `기본정보`에 `법령명` / `법령명한글` 필드 자체가 없음 → 어떤 코드 수정으로도 lawName 복구 불가

### 수정 (핀포인트)
| 파일 | 변경 내용 |
|---|---|
| `components/LawCard.js` | 상세 보기 Link에 `?src=${encodeURIComponent(law.source)}` 파라미터 추가 |
| `app/article/[id]/page.js` | `useSearchParams`로 `src` 읽어 `law.source` 대신 사용, AiSummaryPanel에도 전달 |

### 중간 실패 이력 (재발 방지)
- `lsInfo.do?lsiSeq=lawId` 시도 → `법령ID` ≠ `lsiSeq(법령일련번호)` → 양쪽 다 깨짐 → 즉시 롤백
- `법령명한글` 필드 fallback 추가 → `기본정보`에 해당 필드 없음 → 여전히 공란

---

## ✅ 완료 (2026-04-01) — Supabase 로컬 검색 전환 (Phase 3)

### 배경
- 법제처 실시간 API 방식 한계 (매 요청마다 10개 법령 × 조문 전체 fetch → 느림, 불안정)
- Supabase DB에 조문 전체 사전 적재 → `search_articles()` RPC로 빠른 검색으로 전환

### 완료된 작업

| 항목 | 상태 |
|---|---|
| `scripts/schema.sql` 작성 | ✅ |
| `scripts/collect-laws.mjs` 작성 및 버그 수정 | ✅ |
| `app/api/search/route.js` Supabase 버전 (워크트리) | ✅ |
| `collect-laws.mjs` 실행 → Supabase 데이터 적재 | ✅ |
| 워크트리 → main 머지 + Vercel 배포 | ✅ |

### collect-laws.mjs 수정 이력 (2026-04-01 디버깅)

| 문제 | 원인 | 수정 |
|---|---|---|
| 결과 없음 | `--env-file` Node 20.6+ 전용 → OC 값 미로드 | `readFileSync`로 `.env.local` 직접 파싱 |
| 결과 없음 | `Referer` 헤더 없음 → 법제처 API 차단 | `Referer: https://medical-law-search.vercel.app/` 추가 |
| `[undefined]` 오류 | `law.법령명칭` 없음 (실제: `법령명한글`) | 필드명 수정 |
| 조문 파싱 오류 | `data.Law` 없음 (실제: `data.법령`) | `fetchLawDetail` 반환값 수정 |
| 항 내용 누락 | `article.조문내용`만 저장 | `extractContent()` 추가 (항 내용 합산) |

### 실행 방법 (재수집 필요 시)
```bash
# 반드시 프로젝트 루트에서 실행
node scripts/collect-laws.mjs
```
- `.env.local` 자동 로드 (스크립트 내부에서 처리)
- 키워드: 의료, 응급, 소방, 건축, 안전, 보건 (각 최대 10개 법령)
- 약 400ms 딜레이 × 법령 수 → 수분 소요

### 새 Supabase 검색 구조

```
collect-laws.mjs 실행 (1회성 or 법령 개정 시)
  법제처 API → laws 테이블 (법령 메타) + articles 테이블 (조문 본문)

검색 요청 시
  keywordMap 변환 → supabase.rpc('search_articles', { kw, lmt: 50 })
  → PostgreSQL ILIKE + GIN 인덱스 → 결과 반환
```

---

## ✅ 완료 (2026-03-27)

### 검색 API 구조 전면 교체 — app/api/search/route.js

#### 문제: target=law는 법령명 검색이라 일반 키워드에 무용지물
- "침대", "병실", "제출 기한" 등 일반 키워드 → 결과 0건
- 기존 구조: 법령명 검색 → 상위 3개 법령 → 각 조문 재검색 (최대 9건)
- `target=lc` (조문 직접 검색) 시도 → Vercel에서 EMPTY_RESPONSE (미지원)

#### 해결: 2단계 병렬 검색으로 교체
```
1단계: fetchLaws(keyword) + fetchLaws("의료법") — 병렬 실행
       → 중복 제거 (법령ID 기준)
2단계: 최대 10개 법령 조문 전체 fetch — 병렬 실행
       → 문제 포함 조문 필터 (제목 OR 본문)
최종:  우선순위 정렬 → 최대 20건 반환
```
- 어떤 키워드에도 의료법 계열 항상 포함됨

#### UTF-8 인코딩 버그 수정
- `atob()`는 Latin-1 디코딩 → 한글 깨짐 → 빌드 5회 연속 실패 원인
- `new TextDecoder('utf-8').decode(Uint8Array.from(atob(b64), c => c.charCodeAt(0)))` 로 수정

#### keywordMap 확장 (일반어 → 법령 용어)
| 입력 키워드 | 법령 용어 | 비고 |
|---|---|---|
| 침대 | 병상 | 법령에서 "병상" 사용 |
| 병실 | 병상 | 법령에서 "병상" 사용 |
| 제출 기한 / 마감일 | 기한 | 조문 내 실제 단어 |
| 응급실 | 응급의료 | |
| 구급차 | 구급차등의 운용 | |
| 설명 동의 / 수술 동의 | 의료행위 설명 | |

#### 검색 결과 확인 (4개 대표 키워드)
| 키워드 | 결과 | 대표 조문 |
|---|---|---|
| 침대 | 8건 ✅ | 응급의료에 관한 법률 / 권역응급의료센터의 지정 |
| 병실 | 8건 ✅ | 응급의료에 관한 법률 / 예비병상의 확보 |
| 진료 | 20건 ✅ | 고엽제후유의증 등 환자지원 법률 |
| 제출 기한 | 2건 ✅ | 응급의료에 관한 법률 / 미수금의 대지급 |

#### 최종 배포
- 배포 ID: `7XgHcFDcP` (Current · Ready)
- 커밋: `f4f7342` — fix: 병실→병상, 제출기한→기한 매핑 수정

---

## ✅ 이전 완료 (2026-03-26)

### 수정된 버그 — app/api/search/route.js

#### 1. /article/undefined 링크 문제 — 수정 완료
- **원인**: search/route.js가 LawCard.js가 기대하는 id 필드 대신 lawId 를 반환
- **수정**: id = 법령ID + "_" + 조문번호 형식으로 반환 (article/route.js와 동일)
- **결과**: 상세 보기 링크가 /article/001788_1 형식으로 정상 작동

#### 2. 원문 링크 없는 문제 — 수정 완료
- **원인**: search/route.js가 source 필드를 반환하지 않음
- **수정**: source: "https://www.law.go.kr/lsInfo.do?lsiSeq=" + 법령일련번호 추가
- **결과**: 원문 링크가 법제처로 정상 연결

#### 3. 잘못된 필드명 — 수정 완료
- **원인**: articleTitle, articleNumber 등 LawCard.js가 기대하지 않는 이름으로 반환
- **수정**: title, article: '제X조', category, effectiveDate, summary 올바른 필드명으로 통일

#### 4. 검색 결과에 해당 법령 안 나오는 문제 — 수정 완료
- **원인**: display=10에서 상위 5개만 사용, 정렬 없이 API 순서 그대로 사용
- **수정**: display=20으로 확장 후 검색어와 정확히 일치하는 법령명 우선 정렬
- **결과**: 의료법 검색 시 의료법이 최상단에 노출

---

## 🔴 알려진 한계 (미해결)

1. **시행규칙/별표 미포함**: `lawService.do`는 본법 조문만 반환. 시행규칙 별표(병실 면적 기준표 등)는 별도 법령 ID로 검색 필요.
2. **"병실" 결과가 응급의료법**: 의료법 본법에 "병상" 직접 등장 안 함. 의료법 시행규칙 포함 시 개선 가능.
3. **"제출 기한" 결과 2건**: 법령 조문에 "기한"이 드물게 등장. 더 구체적인 맥락 필요.
4. **캐시 TTL 1시간**: `revalidate: 3600`. 법령 개정 시 최대 1시간 지연.

---

## 📌 다음 작업 후+��

- [ ] 의료법 시행규칙 법령 ID 고정 포함 (fetchLaws 결과와 별도)
- [ ] keywordMap 지속 확장 (실사용 키워드 수집 후 추가)
- [ ] 검색 결과 UI — 법령별 그룹핑 표시
- [ ] app/api/debug/route.js 삭제 (운영 불필요)
