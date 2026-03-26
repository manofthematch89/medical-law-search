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
| 법제처 API | 완전 작동 (OC: 1234, IP: 13.209.43.211 등록) |
| AI API | 미결정 (Claude API 또는 OpenAI API) |

---

## 🔑 법제처 API 핵심 (반드시 기억)

- 모든 요청에 Referer 헤더 필수: https://medical-law-search.vercel.app/
  - 없으면 "사용자 정보 검증에 실패하였습니다." 오류
- Edge Runtime 필수: export const runtime = "edge" + export const preferredRegion = "icn1"
  - 서울 IP(13.209.43.211)로만 법제처 IP 인증 통과
- 환경 변수: LAW_API_OC=1234 (Vercel에 설정됨)
- lawService.do?type=JSON 응답의 최상위 키는 한국어 (예: 법령), 영문 LawService 아님
  - 반드시 Object.values(articleData)[0] 으로 동적 접근

---

## 📋 현재 상태 (2026-03-26 기준)

### 완료된 것

- 법제처 API 인증 완전 해결 (OC=1234 + Referer 헤더 + Edge Runtime)
- 검색 기능 완전 작동 — /api/search?query=의료법 에서 실제 조문 반환 확인
- 한국어 최상위 키 버그 수정 — Object.values(articleData)[0] 동적 접근으로 해결 (commit 7af212a)
- 메인 페이지 한글 깨짐 수정 — atob() 방식에서 TextDecoder 방식으로 수정 (commit aac1060)
- debug route 중복 export 오류 수정 (빌드 실패 원인 제거)

### 🔧 다음 작업 (Phase 3)

- 주제어 검색 미지원: "진료기록부" 같은 키워드 검색 시 결과 0개
  - 원인: lawSearch.do는 법령명만 검색 (조문 내용 검색 불가)
  - 해결 방향: 의료법 관련 법령 ID 하드코딩 → 조문 직접 검색
- AI 요약 기능 미구현 (Claude API 또는 OpenAI API 연동 예정)

---

## 🗺️ 전체 개발 단계 (Phase)

| Phase | 명칭 | 상태 |
|-------|------|------|
| Phase 1 | MVP (더미 642데이터) | 완료 |
| Phase 2 | API 연동 | 완료 |
| Phase 3 | AI 연동 + 검색 개선 | 진행 중 |
| Phase 4 | 고도화 (즐겨찾기 등) | 대기 중 |

---

## 🗂️ 핵심 파일

| 파일 | 역할 | 상태 |
|------|------|------|
| app/api/search/route.js | 법제처 API 검색 로직 | 정상 snote |
| app/api/debug/route.js | API 연결 테스트횩 | 젥상 (좭제 가능) |
| app/page.js | 메인 검색 UI | 젥상 |
| PROGRESS.md | 이 파일 | 최신 |
| HANDOFF.md | AI 인수인계 가이하 | 최신 |

---

## 📅 작동 작업

### 2026-03-26 (세션 3)
- lawService.do?type=JSON 최상위 키� 한국어임을 PowerShell로 확인
- Object.values(articleData)[0] 동적 접근으로 검색 수정 (commit 7af212a)
- debug route 중��� export 제거 — 빌드 실패 최거
- /api/search?query=의료범 실제 조문 발환 확인 완료

### 2026-03-26 (세션 2)
- Phase 3짐섄 망가 검색 기능 확인
- Phase 3 코드 롤백: route.js 161�$ → 84줄 (Phase 2 순수 로질 로직 복원)
- 메인 페이지 한글 깨짐 수정: atob() → TextDecoder (commit aac1060)
- target=lsEfInfoR (집행 메타데이터) → target=law + MST=법령일련번호 로 수정

### 2026-03-25
- 법제처 API 사용자 정보 검증에 실패 원인 파악
- Referer 헤더 누락이 핵심 원인으로 확인
- OC=1234, Referer 헤더, Edge Runtime(서울 IP) 모두 적용
- HANDOFF.md 최초 생성

---

## 🛡️ 개발 꼬임 방지 5가지 원칙

1. Git commit 자주 — 기능 하나 완성할 때마다 커밋
2. PROGRESS.md 유지 — 작업 끝날 때마다 상태 업데이트
3. HANDOFF.md 만들기 — 새 AI도 바로 파악할 수 있게
4. TODO는 1개 작업만 — 1개 완성 후 다음
5. 폴더 구조 중간에 바꾸지 않기 — import 경로 전체 수정 필요

---

마지막 업데이트: 2026-03-26 — 검색 완전 작동 확인. 주제어 검색 개선 및 AI 연동 대기 중

---

## 2026-03-26 세션 3 업데이트

- 검색 기능 완전 작동 확인: /api/search?query=의료법 → 실제 조문 반환
- Object.values(articleData)[0] 동적 키 접근으로 lawService.do JSON 파싱 수정 (commit 7af212a)
- debug route 중복 export 제거 (빌드 오류 해결)
- 메인 페이지 한글 깨짐 수정: atob → TextDecoder (commit aac1060)
