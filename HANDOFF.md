# HANDOFF.md — MdLaw 프로젝트 인수인계 가이드

> 이 파일을 AI 대화 시작할 때 PROGRESS.md와 함께 공유하면 바로 이어서 작업할 수 있습니다.
> **마지막 업데이트: 2026-04-02 (Phase 5 진행)**

---

## 🚀 프로젝트 빠른 시작

```
앱: MdLaw — 의료법령 검색 AI 탐색기
URL: https://medical-law-search.vercel.app
저장소: https://github.com/manofthematch89/medical-law-search
배포: Vercel (자동 배포 — main 브랜치 push 시 자동 반영)
```

---

## 🚧 Phase 5 진행 (2026-04-02)
시행규칙/별표 누락을 줄이기 위해 수집 단계 DB 적재를 고도화했습니다.

- **`scripts/collect-laws.mjs`**: `lawService.do` 상세(JSON) 내부에서 `법령ID`/`법령일련번호`가 등장하는 연관(하위) 법령 ID를 재귀적으로 추출해 수집 큐에 추가(시행령/시행규칙 등 확장)
- **`scripts/collect-laws.mjs`**: 조문 본문(content) 생성 시 `별표*` 관련 필드(키에 `별표` 포함)를 함께 합쳐 인덱스 누락 완화
- **`scripts/schema.sql`**: Supabase `laws/articles` 스키마 + `search_articles()` RPC를 main에 추가(Phase 3 기반)
- **`scripts/schema.sql`**: `articles.category` 컬럼 + `idx_articles_category` 인덱스 추가
- **`scripts/categorize-laws.mjs`**: `articles.category` 비어있는 조문을 텍스트 키워드 규칙으로 분류 후 upsert (실행 결과: `totalUpdated=2820`)

> 남은 검증 필요: 실제로 “시행규칙 조문”이 DB에 적재되고 “병실 면적” 검색 우선 노출까지 되는지 `node scripts/collect-laws.mjs` 재수집 후 검색 결과에서 확인

## ✅ Phase 4 완료 (2026-04-02)

원문 보기 버튼 source URL 통일 수정.

- **버그**: 검색 카드 "원문 ↗"는 정상, 상세 페이지 "법제처 원문 보기" + AI 요약 "원문 ↗" 모두 `lsSc.do?query=`(빈 쿼리)로 연결
- **원인**: `lawService.do` API의 `기본정보`에 `법령명` / `법령명한글` 필드가 없어 `lawName = ""` → source URL 공란
- **수정**: `LawCard.js`에서 이미 올바른 source URL을 `?src=` 파라미터로 상세 페이지에 전달, `article/[id]/page.js`에서 `useSearchParams`로 읽어 사용
- **변경 파일**: `components/LawCard.js`, `app/article/[id]/page.js`

---

## ✅ Phase 3 완료 (2026-04-01)

Supabase 로컬 검색 전환 완료. 현재 main 브랜치 기준으로 Supabase 검색 작동 중.

### 데이터 재수집이 필요한 경우
```bash
# 프로젝트 루트에서 실행
node scripts/collect-laws.mjs
```

---

## 📂 핵심 파일 위치

| 파일 | 역할 |
|------|------|
| `app/api/search/route.js` | 검색 핵심 (현재: 구 법제처 API / 워크트리: Supabase 버전) |
| `app/api/article/route.js` | 조문 상세 조회 (법제처 API, 그대로 유지) |
| `scripts/schema.sql` | Supabase DB 스키마 (테이블 + 인덱스 + RPC) |
| `scripts/collect-laws.mjs` | 법제처 API → Supabase 데이터 수집 스크립트 |
| `app/api/debug/route.js` | API 테스트용 (삭제 예정) |
| `lib/lawApi.js` | 클라이언트 진입점 (USE_DUMMY=false 유지) |
| `PROGRESS.md` | 세션별 작업 내역 |

---

## 🌐 환경 변수

| 변수 | 설명 | 위치 |
|------|------|------|
| `LAW_API_OC` | 법제처 OC 인증값 (`1234`) | `.env.local` ✅ |
| `SUPABASE_URL` | Supabase 프로젝트 URL | `.env.local` ✅ / Vercel ✅ |
| `SUPABASE_ANON_KEY` | Supabase 읽기용 키 | `.env.local` ✅ / Vercel ✅ |
| `SUPABASE_SERVICE_ROLE_KEY` | collect-laws.mjs 쓰기용 키 | `.env.local` ✅ (Vercel 불필요) |

> `collect-laws.mjs`는 `--env-file` 없이 `node scripts/collect-laws.mjs`만으로 실행 가능
> (스크립트 내부에서 `.env.local` 자동 로드, Referer 헤더 자동 포함)

---

## 🔍 검색 구조 변천사

### 현재 방식 — Supabase 검색 (2026-04-01 ~)
```js
// 사전 적재된 DB에서 즉시 검색
keywordMap 변환 → supabase.rpc('search_articles', { kw, lmt: 50 })
→ PostgreSQL ILIKE + GIN 인덱스 → 정렬 → 최대 20건
```

### 구 방식 — 실시간 법제처 API (~ 2026-03-27)
```js
// 매 요청마다 법제처 API 2단계 호출
fetchLaws(keyword) + fetchLaws("의료법")  // 법령 목록
→ fetchArticles(lawId) × 최대 10개        // 조문 전체 fetch
→ 키워드 포함 조문 필터 → 최대 20건
```
폐기 이유: 느림, 응답 불안정, target=lc Vercel에서 불가

---

## 🔌 법제처 API (collect-laws.mjs에서만 사용)

```
BASE: https://www.law.go.kr/DRF
법령명 검색: /lawSearch.do?OC={OC}&target=law&type=JSON&query={query}
조문 조회:   /lawService.do?OC={OC}&target=law&type=JSON&ID={lawId}
```

- `LAW_API_OC=1234` (본인이 직접 설정한 값, 정상)
- `target=lc` (조문 내용 검색): Vercel에서 EMPTY_RESPONSE → 사용 불가

---

## ⚠️ 과거 버그 기록 (재발 방지)

### 1. UTF-8 한글 깨짐 (빌드 5회 실패 원인)
```js
// ❌ atob()는 Latin-1 → 한글 깨짐
const content = atob(b64);

// ✅ 올바른 방법
const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
const content = new TextDecoder('utf-8').decode(bytes);
```

### 2. 조문 데이터 파싱 (항 구조 있는/없는 경우 모두 처리)
```js
function extractArticleContent(articleUnit) {
  const main = String(articleUnit["조문내용"] || "");
  const subs = toArray(articleUnit["항"] || articleUnit.항);
  const subText = subs.map(s => String(s["항내용"] || "")).join(" ");
  return main ? `${main} ${subText}` : subText;
}
```

### 3. GitHub 에디터 코드 주입 (CM6)
```js
const view = document.querySelector('.cm-content')?.cmView?.view
          || document.querySelector('.cm-content')?.cmTile?.view;
view.dispatch({ changes: { from: 0, to: view.state.doc.length, insert: newContent } });
```

---

## 🔴 알려진 한계

1. **시행규칙/별표 미포함**: `collect-laws.mjs`는 본법 조문만 수집. 시행규칙 별표(예: 병실 면적 기준)는 별도 법령명으로 수집 필요.
2. **수집 키워드 6개**: 현재 의료/응급/소방/건축/안전/보건. 더 넓히려면 `collect-laws.mjs`의 `keywords` 배열에 추가.
3. **캐시 없음**: Supabase 검색은 실시간. Vercel edge 캐시 없으므로 필요 시 추가.
