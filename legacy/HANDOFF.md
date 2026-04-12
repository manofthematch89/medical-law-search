# HANDOFF.md — MdLaw 프로젝트 인수인계 가이드

> 이 파일을 AI 대화 시작할 때 PROGRESS.md와 함께 공유하면 바로 이어서 작업할 수 있습니다.
> **마지막 업데이트: 2026-04-12 (Server Actions 리팩토링 및 아키텍처 단순화)**

---

## 👥 작업 분담 (사용자 vs AI)

| 담당 | 할 일 |
|------|--------|
| **사용자** | 로컬에서 `node scripts/*.mjs` 실행 (`collect-laws`, `categorize-laws`, `generate-embeddings`). `.env.local` 유지·키 발급. Supabase SQL Editor에서 `scripts/schema.sql` 반영 여부 확인·적용. Vercel 대시보드에 배포용 환경 변수 설정. Gemini 쿼터·비용 관리. |
| **AI (코드 에이전트)** | 저장소 내 코드·스키마·문서 수정, 커밋/푸시(요청 시), 버그 원인 분석 및 패치 제안. **사용자 PC에서 스크립트를 대신 실행하지 않음** — API 호출·DB 쓰기·쿼터 소모는 사용자 환경에서만 수행 가능. |

---

## 🚀 프로젝트 빠른 시작

```
앱: MdLaw — 의료법령 검색 AI 탐색기
URL: https://medical-law-search.vercel.app
저장소: https://github.com/manofthematch89/medical-law-search
배포: Vercel (자동 배포 — main 브랜치 push 시 자동 반영)
```

---

## 🚧 Phase 5 완료 및 리팩토링 (2026-04-12)

기존의 파편화된 API 구조를 **Next.js Server Actions** 중심으로 통합하여 보안과 가독성을 높였습니다.

- **`actions/lawActions.js`**: 모든 서버 측 로직(DB 검색, 법제처 상세 조회, Gemini AI 요약)이 통합된 핵심 파일입니다. `"use server"` 지시어로 보호됩니다.
- **아키텍처 변경**: `app/api/...` 엔드포인트와 `lib/lawApi.js` 헬퍼를 모두 제거하고 화면에서 서버 액션을 직접 호출합니다.
- **AI 요약 실질화**: `components/AiSummaryPanel.js`가 더미 데이터 대신 실제 Gemini 1.5 분석 결과를 출력합니다.
- **데이터 수집 고도화**: `scripts/collect-laws.mjs`를 통해 본법 뿐만 아니라 시행령, 시행규칙까지 재귀적으로 수집하여 DB에 적재했습니다.

---

## 📂 핵심 파일 위치

| 파일 | 역할 |
|------|------|
| **`actions/lawActions.js`** | **검색/조회/AI 핵심 서버 액션** (가장 중요한 파일) |
| `app/search/page.js` | 검색 결과 목록 화면 |
| `app/article/[id]/page.js` | 조문 상세 조회 화면 |
| `components/AiSummaryPanel.js` | AI 기반 법령 분석 패널 |
| `scripts/schema.sql` | Supabase DB 스키마 (테이블 + 인덱스 + RPC) |
| `scripts/collect-laws.mjs` | 법제처 API → Supabase 데이터 수집 스크립트 |

---

## 🌐 환경 변수

| 변수 | 설명 | 위치 |
|------|------|------|
| `LAW_API_OC` | 법제처 OC 인증값 | `.env.local` |
| `SUPABASE_URL` | Supabase 프로젝트 URL | `.env.local` / Vercel |
| `SUPABASE_ANON_KEY` | Supabase 읽기용 키 | `.env.local` / Vercel |
| `SUPABASE_SERVICE_ROLE_KEY` | 데이터 수집(write)용 키 | `.env.local` |
| `NEXT_PUBLIC_GEMINI_API_KEY` | AI 임베딩 & 요약 생성용 | `.env.local` / Vercel |

---

## 🔍 검색 구조 변천사

### 현재 방식 — Server Actions + Hybrid Search (2026-04-12 ~)
```js
// actions/lawActions.js 내에서 실행
Gemini Embedding 시도 -> (성공 시) supabase.rpc('match_articles') 벡터 검색
                    -> (실패/결과0 시) 'search_articles' 텍스트 검색
-> 결과 정렬 및 우선순위 부여 -> UI 반환
```

### 구 방식 — API Routes 구조 (~ 2026-04-12)
- `app/api/search/route.js`를 거쳐가는 3단계 구조였으나 파편화 문제로 폐기.

---

## 🔌 법제처 API (collect-laws.mjs 및 actions.js에서 사용)

- `Referer: https://medical-law-search.vercel.app/` 헤더 필수 (차단 방지)
- `target=law`: 법령 목록 검색
- `target=lc`: 조문 내용 검색 (Vercel Edge에서 불안하여 DB 사전 적재 방식으로 전환)
