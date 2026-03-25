# HANDOFF.md — MdLaw 프로젝트 인수인계 가이드

> 이 파일을 AI 대화 시작할 때 PROGRESS.md와 함께 공유하면 바로 이어서 작업할 수 있습니다.

---

## 🚀 프로젝트 빠른 시작

```
앱: MdLaw — 의료법령 검색 AI 탐색기
URL: https://medical-law-search.vercel.app
저장소: https://github.com/manofthematch89/medical-law-search
배포: Vercel (자동 배포 — main 브랜치 push 시 자동 반영)
```

---

## 📂 핵심 파일 위치

| 파일 | 역할 |
|------|------|
| `app/api/search/route.js` | 법제처 API 검색 핵심 로직 |
| `app/api/debug/route.js` | API 연결 테스트용 (개발 완료 후 삭제 예정) |
| `app/page.js` | 메인 검색 UI |
| `PROGRESS.md` | 개발 진행 현황 + 기술 메모 |
| `HANDOFF.md` | 이 파일 — 인수인계 가이드 |

---

## ⚙️ 환경 변수 (Vercel 설정)

| 변수명 | 값 | 설명 |
|--------|-----|------|
| `LAW_API_OC` | `1234` | 법제처 API 인증 코드 |

---

## 🔑 법제처 API 핵심 정보

- **엔드포인트**: `https://www.law.go.kr/DRF/`
- **법령 검색**: `lawSearch.do?OC=1234&target=law&type=JSON&query=의료법`
- **조문 조회**: `lawService.do?OC=1234&target=lsEfInfoR&type=JSON&ID={법령ID}`
- **필수**: 모든 요청에 `Referer: https://medical-law-search.vercel.app/` 헤더 포함
  - 없으면 "사용자 정보 검증에 실패하였습니다." 오류 발생
- **Edge Runtime 필수**: `export const runtime = "edge"` + `export const preferredRegion = "icn1"`
  - 이유: 서울 IP(13.209.43.211)로 요청해야 법제처 IP 인증 통과

---

## 🔄 새 대화에서 작업 이어받는 방법

1. **PROGRESS.md + HANDOFF.md 를 AI에게 공유**
2. 다음 문장으로 시작: "MdLaw 프로젝트 계속 작업하자. PROGRESS.md랑 HANDOFF.md 참고해."
3. AI가 현재 상태를 파악하고 바로 이어서 작업

---

## 📋 현재 작업 상태 (2026-03-26 기준)

### 완료
- 법제처 API 인증 해결 (OC=1234 + Referer 헤더)
- Edge Runtime 설정 (서울 IP 고정)
- 법령명으로 검색 후 조문 조회 기능 (Phase 2)

### 진행 중
- 주제어 검색 개선 (예: "진료기록부" 검색 시 관련 조문 반환)
  - 현재 문제: lawSearch.do는 법령명만 검색, 주제어 결과 없음
  - 해결 방향: 의료법 관련 법령 ID 하드코딩 후 직접 조문 검색

### 예정
- AI 요약 기능 (Claude API 또는 OpenAI API 연동)
- UI/UX 개선

---

## 🛠️ 개발 꼬임 방지 5가지 원칙

1. **Git 커밋 자주** — 기능 하나 완성할 때마다 커밋 (되돌리기 안전망)
2. **PROGRESS.md 유지** — 작업할 때마다 업데이트 (AI 인수인계용)
3. **HANDOFF.md 만들기** — 이 파일처럼 새 AI도 바로 파악할 수 있게
4. **TODO는 1개 작업만** — 여러 개 동시에 하면 꼬임. 1개 완성 후 다음
5. **폴더 구조 중간에 바꾸지 않기** — 바꾸면 import 경로 전체 수정 필요

---

## 🚨 트러블슈팅 빠른 참고

| 증상 | 원인 | 해결 |
|------|------|------|
| "사용자 정보 검증에 실패하였습니다." | Referer 헤더 누락 또는 OC 불일치 | route.js Referer 헤더 확인, OC=1234 확인 |
| 검색 결과 0개 | 주제어로 검색 (법령명 아님) | 법령명으로 검색하거나 하드코딩 방식 사용 |
| Vercel 배포 후에도 이전 버전 | 환경변수 변경 후 재배포 필요 | Vercel 대시보드에서 Redeploy |
| IP 인증 실패 | Edge Runtime 미설정 | route.js 상단에 runtime="edge" + preferredRegion="icn1" |

---

*마지막 업데이트: 2026-03-26*
