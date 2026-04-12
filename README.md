# ⚕️ MdLaw (AI Medical Legal Intelligence)

병원 실무자를 위한 지능형 의료법령 탐색기입니다. **Next.js 14**, **Supabase Vector Search**, **Gemini 1.5 Pro** 기술을 결합하여 복잡한 법조문을 실무 인사이트로 변환합니다.

## 🏗️ Premium Architecture

본 프로젝트는 확장성과 유지보수성을 극대화하기 위해 엄격한 계층화 아키텍처를 따릅니다.

### 📁 계층 구조 (Source Directory)

소스 코드는 `src/` 폴더 내에 역할별로 격리되어 있습니다.

- **`src/app/`**: Next.js App Router 기반의 선언적 라우팅 대시보드.
- **`src/actions/`**: 서버 측 비즈니스 흐름을 제어하는 오케스트레이터 (Server Actions).
- **`src/domain/`**: 도메인 핵심 정책 및 비즈니스 규칙 (법령 우선순위, 유의어 맵 등).
- **`src/hooks/`**: 클라이언트 측 상태와 비즈니스 로직을 분리한 커스텀 훅 (`useSearch`, `useLawDetail`).
- **`src/repositories/`**: 데이터 소스 추상화 (DB, 외부 API, AI 서비스 접근 전담).
- **`src/infrastructure/`**: 최하위 기술 클라이언트 주입 (Supabase, Gemini, HTTP Clients).
- **`src/styles/`**: 전역 디자인 시스템 및 글래스모피즘 스타일링.

## ✨ Key Features

- **Smart Hybrid Search**: Gemini 1.5 임베딩을 통한 의미론적 검색과 PostgreSQL 기반의 키워드 검색 결합.
- **AI Deep Insight**: 법조문 원문을 분석하여 전문가 레벨의 '실무 시사점' 및 '한 줄 요약' 제공.
- **Premium UX**: Outfit 폰트와 글래스모피즘 테마를 적용한 현대적이고 신뢰감 있는 인터페이스.
- **Admin Scripts**: 법제처 API를 통한 자동 법령 수집 및 벡터화 관리 스크립트 제공.

## 🤖 AI Development Guidelines
이 프로젝트를 수정하는 AI 어시스턴트는 다음의 아키텍처 규칙을 반드시 엄격히 준수해야 합니다.

1.  **Strict Layering**: 하위 레이어를 건너뛰고 위계가 맞지 않는 레이어를 직접 호출하지 마세요. (예: UI 컴포넌트에서 Repository나 Infrastructure를 직접 `import` 금지)
2.  **Logic Separation**: 
    - **Business Rules**: "A는 B다" 같은 판단 로직은 무조건 `src/domain`에 작성하세요.
    - **Frontend Logic**: 페이지 컴포넌트의 State 관리와 API 호출은 반드시 `src/hooks`로 추출하세요.
3.  **Naming Convention**: 
    - **Repository/Domain**: 'Vector', 'RPC', 'JSON' 같은 기술적 용어보다 'Article', 'Insight', 'Search' 같은 도메인 용어를 사용하세요.
    - **Infrastructure**: 여기에서만 기술적 용어(Client, HttpClient 등)를 사용합니다.
4.  **Read the Instructions**: 작업을 시작하기 전, 해당 폴더 내의 `README.md` 가이드를 먼저 정독하고 그 규칙에 따라 코드를 작성하세요.

## 🚀 Getting Started

1. 환경 변수(`.env.local`) 설정: Supabase, Gemini, Law API 키 포함.
2. 의존성 설치: `npm install`
3. 개발 모드 실행: `npm run dev`

---

© 2026 MdLaw Project.
