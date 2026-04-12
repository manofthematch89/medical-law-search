# ⚖️ MdLaw (의료법령 검색 AI 탐색기)

의료 현장에서 필요한 법령(의료법, 시행령, 시행규칙)을 빠르고 정확하게 찾고, AI가 핵심 내용을 요약해주는 스마트 법령 보조 도구입니다.

## ✨ 주요 기능

1.  **스마트 하이브리드 검색**:
    *   **의미 기반 검색 (Vector Search)**: "병실 크기"라고 검색해도 "병상 면적" 관련 조문을 찾아내는 AI 벡터 검색.
    *   **키워드 검색 (Text Search)**: 정확한 단어 매칭을 통한 신속한 검색 지원.
2.  **AI 조문 분석**: Gemini 1.5 엔진을 활용해 복잡한 법조문을 한 줄 요약 및 핵심 포인트로 분석.
3.  **방대한 데이터 커버리지**: 의료법뿐만 아니라 시행령, 시행규칙, 별표 데이터까지 포함한 종합 검색.
4.  **실무 친화적 카테고리**: 시설/환경, 인력/면허, 원무/행정 등 실무 단위의 카테고리 필터 제공.

## 🛠 기술 스택

*   **Frontend**: Next.js 14 (App Router)
*   **Backend**: Server Actions (Node.js Edge Runtime)
*   **Database**: Supabase (PostgreSQL + pgvector)
*   **AI**: Google Gemini AI (Embedding & Analysis)
*   **Styling**: Tailwind CSS

## 🚀 빠른 시작

### 1. 환경 변수 설정
`.env.local` 파일을 생성하고 다음 정보를 입력합니다:
```bash
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
NEXT_PUBLIC_GEMINI_API_KEY=your_gemini_key
LAW_API_OC=your_law_go_kr_oc_code
```

### 2. 의존성 설치 및 실행
```bash
npm install
npm run dev
```

### 3. 데이터 수집 및 가공 (선택 사항)
법령 데이터를 DB에 채우기 위해 다음 스크립트를 실행합니다:
```bash
node scripts/collect-laws.mjs      # 법령 수집
node scripts/generate-embeddings.mjs # AI 벡터 생성
```

## 📂 프로젝트 구조

*   `app/`: 페이지 및 레이아웃 구성.
*   `actions/lawActions.js`: 백엔드 로직이 통합된 **서버 액션** 파일.
*   `components/`: UI 부품 (검색 카드, AI 분석 패널 등).
*   `scripts/`: 데이터 관리용 SQL 및 자동화 스크립트.

## 📄 라이선스
이 프로젝트는 교육 및 실무 보조용으로 제작되었습니다. 실제 법적 판단은 반드시 전문가와 상의하시기 바랍니다.
