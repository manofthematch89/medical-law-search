# 🏥 MdLaw — 의료법령 검색 AI 탐색기 개발 진행 현황

이 파일은 AI와 작업할 때마다 업데이트하세요.
새 대화 시작 시 이 파일을 공유하면 이전 맥락을 바로 이어받을 수 있습니다.

---

## 📌 프로젝트 기본 정보

| 항목 | 내용 |
|------|------|
| 앱 이름 | MdLaw |
| 프로젝트명 | 의료법령 검색 AI 탐색기 |
| 플랫폼 | 웹 (React / Next.js) |
| 배포 | Vercel — medical-law-search.vercel.app |
| 저장소 | GitHub — manofthematch89/medical-law-search |
| 법제처 API OC | 1234 |
| Vercel 서울 IP | 13.209.43.211 |

---

## 🔑 법제처 API 핵심 (반드시 기억)

- 모든 요청에 `Referer: https://medical-law-search.vercel.app/` 헤더 필수
  - 없으면 "사용자 정보 검증에 실패하였습니다." 오류
- Edge Runtime 필수: `export const runtime = "edge"` + `export const preferredRegion = "icn1"`
  - 서울 IP(13.209.43.211)로만 법제처 IP 인증 통과
- 환경 변수: `LAW_API_OC=1234` (Vercel에 설정됨)

---

## 📋 현재 상태 (2026-03-26 기준)

### ✅ 완료된 것
- 법제처 API 인증 완전 해결 (OC=1234 + Referer 헤더 + Edge Runtime)
- **Phase 3 롤백 완료** — route.js를 깨끗한 Phase 2 로직으로 복원
  - 전: 161줄, Phase 3 함수 7개 (convertKeyword, getCategoryFromLawName 등)
  - 후: 84줄, GET 함수 1개 (Phase 2 순수 로직)
- PROGRESS.md + HANDOFF.md 최신화

### 🔧 알려진 한계 (다음 작업)
- **주제어 검색 미지원**: "진료기록부" 같은 키워드 검색 시 결과 0개
  - 원인: lawSearch.do는 법령명만 검색 (조문 내용 검색 불가)
  - 해결 방향: 의료법 관련 법령 ID 하드코딩 → 조문 직접 검색
- AI 요약 기능 미구현 (Phase 3 예정)

### 📅 다음 Phase 3 계획
1. 주제어 검색 개선 (법령 ID 하드코딩 방식)
2. AI 요약 기능 (Claude API 또는 OpenAI API)
3. UI/UX 개선

---

## 🗂️ 핵심 파일

| 파일 | 역할 | 상태 |
|------|------|------|
| `app/api/search/route.js` | 법제처 API 검색 로직 | ✅ Phase 2 정상 |
| `app/api/debug/route.js` | API 연결 테스트용 | 삭제 예정 |
| `app/page.js` | 메인 검색 UI | 정상 |
| `PROGRESS.md` | 이 파일 | 최신 |
| `HANDOFF.md` | AI 인수인계 가이드 | 최신 |

---

## 🛠️ 개발 꼬임 방지 5가지 원칙

1. **Git 커밋 자주** — 기능 하나 완성할 때마다 커밋
2. **PROGRESS.md 유지** — 작업할 때마다 업데이트
3. **HANDOFF.md 만들기** — 새 AI도 바로 파악할 수 있게
4. **TODO는 1개 작업만** — 1개 완성 후 다음
5. **폴더 구조 중간에 바꾸지 않기** — import 경로 전체 수정 필요

---

## 📅 작업 로그

### 2026-03-26
- Phase 3에서 망가진 검색 기능 확인
- Phase 3 코드 롤백: route.js 161줄 → 84줄 (Phase 2 순수 로직 복원)
- 롤백 후 필수 수정 사항 유지: Referer 헤더, Edge Runtime
- PROGRESS.md + HANDOFF.md 업데이트

### 2026-03-25
- 법제처 API "사용자 정보 검증에 실패" 문제 원인 파악
- Referer 헤더 누락이 핵심 원인으로 확인
- OC=1234, Referer 헤더, Edge Runtime(서울 IP) 모두 적용
- HANDOFF.md 최초 생성
# 🏥 MdLaw — 의료법령 검색 AI 탐색기 개발 진행 현황

> 이 파일은 AI와 작업할 때마다 업데이트하세요.
> 새 대화 시작 시 이 파일을 공유하면 이전 맥락을 바로 이어받을 수 있습니다.

---

## 📌 프로젝트 기본 정보

| 항목 | 내용 |
|------|------|
| 앱 이름 | **MdLaw** |
| 프로젝트명 | 의료법령 검색 AI 탐색기 |
| 플랫폼 | 웹 (React / Next.js) |
| 배포 | Vercel — medical-law-search.vercel.app |
| 저장소 | GitHub — manofthematch89/medical-law-search |
| 법제처 API | ✅ 연동 완료 (OC: **1234**, IP: 13.209.43.211 등록) |
| AI API | **미결정** (Claude API 또는 OpenAI API) |

---

## ⚠️ 현재 알려진 이슈

| 번호 | 내용 | 상태 |
|------|------|------|
| 1 | 법제처 검색: 법령명 직접 입력 시만 결과 나옴 | 🔧 Phase 3 개선 필요 |
| 2 | 주제어(예: "진료기록부") 검색 시 0건 반환 | 🔧 법령ID 하드코딩으로 해결 예정 |
| 3 | AI 요약 버튼은 더미 텍스트 상태 | ⬜ Phase 3에서 처리 |

---

## 🔑 법제처 API 핵심 기술 메모

```
OC 값: 1234  (환경변수 LAW_API_OC=1234)
서버 IP: 13.209.43.211  (Vercel Edge, 서울 리전)
Referer 헤더: https://medical-law-search.vercel.app/  ← 필수! 없으면 검증 실패
runtime: edge + preferredRegion: icn1  ← 서울 리전 강제
```

**⚠️ 중요:** 법제처 API는 OC + IP + Referer 헤더 3가지를 모두 체크합니다.
fetch 호출 시 반드시 Referer/Origin 헤더를 포함해야 합니다.

---

## 🗺️ 전체 개발 단계 (Phase)

| Phase | 명칭 | 핵심 작업 | 상태 |
|-------|------|-----------|------|
| Phase 1 | MVP (더미 데이터) | UI 전체 구성, 더미 JSON으로 화면 완성 | ✅ 완료 |
| Phase 2 | API 연동 | 법제처 Open API 실제 연결 | ✅ 완료 |
| Phase 3 | AI 연동 | Claude/GPT 연결, 조문 기반 요약 | 🔧 법제처 API 수정 완료, AI 연동 대기 |
| Phase 4 | 고도화 | 즐겨찾기, 키워드 사전, UI/UX 정리 | ⬜ 대기 중 |

---

## ✅ Phase 2 세부 작업 체크리스트

- [x] 법제처 Open API 승인 완료 (OC: 1234)
- [x] Vercel 환경변수 설정 — `LAW_API_OC=1234`
- [x] `lib/lawApi.js` — USE_DUMMY=false로 전환
- [x] `app/api/search/route.js` 생성 — 법제처 검색 API 프록시
- [x] `app/api/article/route.js` 생성 — 법제처 조문 상세 API 프록시
- [x] Vercel 배포 완료 ✅

---

## 🔧 Phase 3 — 법제처 API 수정 (완료된 부분)

- [x] Edge Runtime + preferredRegion=icn1 적용 (서울 리전)
- [x] Vercel 환경변수 OC 수정: motm2014 → 1234
- [x] **Referer 헤더 추가** — 법제처 도메인 검증 핵심 수정
- [x] 법제처 서버장비 IP 등록 (13.209.43.211)
- [ ] 주제어 검색 개선 (의료법 법령ID 하드코딩)
- [ ] AI API 연동 (Claude/GPT 결정 후)

---

## 📝 작업 로그

| 날짜 | 세션 | 한 일 | 다음 할 일 |
|------|------|--------|-----------| 
| 2026-03-24 | Phase 1 | UI 전체 구성 완료, Vercel 배포 성공 | Phase 2 |
| 2026-03-25 | Phase 2 | 법제처 API 연동 완료, OC=motm2014 | Phase 3 AI 연동 |
| 2026-03-25~26 | Phase 3 수정 | OC=1234로 수정, Referer 헤더 추가로 API 검증 해결 | 주제어 검색 개선, AI 연동 |

---

## 🛡️ 개발 프로젝트 꼬이지 않는 핵심 5가지

1. **Git commit 자주** — 기능 하나 완성할 때마다 커밋. 되돌아갈 지점 확보
2. **PROGRESS.md 유지** — 작업 끝날 때마다 상태 업데이트. AI에게 컨텍스트 전달용
3. **HANDOFF.md 만들기** — "지금 어디까지 됐고 다음에 뭘 해야 하는지" 요약본
4. **TODO는 항상 1개 작업만** — 동시에 여러 개 건드리면 반드시 꼬임
5. **폴더 구조는 중간에 바꾸지 않기** — 처음 구조 잘 잡고 그대로 유지

---

## 🔑 기술 스택 요약

```
Frontend: Next.js (React) + Tailwind CSS
Backend: Next.js API Routes (Edge Runtime, Seoul)
API: 법제처 Open API ✅ (OC: 1234)
AI: Claude API 또는 OpenAI API (미결정)
Deploy: Vercel
Repo: GitHub (manofthematch89/medical-law-search)
```

---

## 📎 핵심 원칙 (잊지 말 것)

1. **검색 먼저, AI는 뒤에** — AI가 조문 없이 단독으로 법 내용을 생성하면 안 됨 (RAG 구조)
2. **원문 출처 필수** — 법령명 + 조문번호 + 시행일 + 원문 링크 항상 함께 표시
3. **면책 문구 고정** — AI 답변 모든 화면에서 숨기기 불가
4. **`lawApi.js` 분리** — API 교체 시 이 파일만 수정하면 되도록

---

*마지막 업데이트: 2026-03-26 — Phase 3 법제처 API 수정 완료 (OC/Referer 헤더). 주제어 검색 개선 필요. AI 연동 대기 중*
