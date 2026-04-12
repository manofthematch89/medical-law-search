# 🧠 Domain Layer (Business Logic)

이 폴더는 프로젝트에서 가장 중요한 **비즈니스 규칙과 정책**이 담긴 "심장부"입니다.

### 📜 지켜야 할 규칙
1.  **순수성 유지**: DB나 외부 API 같은 외부 기술에 의존하지 마세요. (순수 자바스크립트 로직 권장)
2.  **독립성**: 다른 레이어(actions, repositories, infrastructure)를 `import` 하지 마세요. 오직 도메인 안의 정책만 다룹니다.
3.  **명칭 중심**: "백엔드 기술" 용어가 아닌, "의료/법령/사용자" 등 **비즈니스 용어**를 사용하여 함수명을 지으세요. (예: `getPriority` 대신 `getSearchPriority`)
