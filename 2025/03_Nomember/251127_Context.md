---
type: "content"
domain: "frontend"
category: "javascript"
topic: "execution-context"
updatedAt: "2025-11-27"

keywords:
  - "execution-context"
  - "lexical-environment"
  - "scope-chain"
  - "hoisting"
  - "tanstack-query"
  - "mutate"
  - "tailwindcss"
  - "@theme"
  - "@layer"

relatedCategories:
  - "react"
  - "tanstack-query"
  - "tailwindcss"
---

# Execution Context

깊이를 알기 위해선, 기본에 집중해야 맞다.  
데이터 타입, 복사에 대한 메모리 개념, 참조형과 기본형, 그리고 컨텍스트 레벨까지.  
어찌보면 간단해 보이는 개념이 기초가 되면, 복잡한 수준의 문제를 해결하는데 이해가 수반된다.

## 1) 실행 컨텍스트 관점 재정리

- 실행 컨텍스트는 결국 "함수를 실행하기 위해 필요한 모든 환경 정보"를 한데 묶어둔 공간이다.
- LexicalEnvironment 안에서 `environmentRecord`(호이스팅 결과)와 `outerEnvironmentReference`(스코프 체인)가 분리되어 있다는 점이 핵심 포인트.
- 스코프 체인은 항상 가까운 컨텍스트부터 탐색하고, 첫 번째로 발견한 변수를 즉시 반환한다.
- 결국 함수의 실행 흐름을 읽을 때 **데이터 타입 이해 + 실행 컨텍스트 구조** 이 조합이 사고를 깔끔하게 만든다.

## 2) tanstack-query mutate 옵션 이해

- 전역 onSuccess는 mutate가 몇 번 호출되든 “각 resolve마다” 전부 실행된다.
- 반면 `mutate(todo, { onSuccess })` 형태로 넣는 local 옵션은 **마지막 호출된 요청 하나만** 실행된다.
- 즉, 동시 호출을 하든 비동기든 동기든, “local 옵션은 마지막 것만 유효하다”는 점이 중요.
- 사용 시점에 따라 전역/요청별/마지막 요청만 실행되는 흐름을 정확히 구분해둬야 한다는 걸 느낌.

## 3) Tailwind를 바라보는 관점이 완전히 바뀐 날

- 이전엔 그냥 유틸리티 클래스 조합 정도로만 생각했는데, @theme와 @layer 구조를 뜯어보면서 완전히 다른 의미를 봤다.
- “팀 전체의 스타일 시스템”을 만드는 언어로 확장할 수 있다는 점이 가장 큰 전환.
- 디자인 토큰을 @theme로 정의하고, @layer를 통해 커스텀 유틸리티를 시스템적으로 관리할 수 있다는 걸 깨달음.
- CVA + plop + Storybook 연결까지 머릿속에서 하나의 그림으로 붙으니, “팀 전체가 같은 규칙으로 컴포넌트를 만든다”는 환경이 현실적인 가능성으로 보이기 시작했다.
- 오늘은 Tailwind가 단순한 CSS 유틸이 아니라, 프론트엔드 개발팀의 문화와 체계를 만들 수 있는 기반이라는 걸 명확히 이해한 날.

## 4) Tailwind 함수/지시어 명확히 정리

- `@import` → CSS 파일을 인라인으로 가져올 때 사용.
- `@theme` → 폰트/색상/spacing/breakpoint 등 디자인 토큰 정의.
- `theme()` 함수 → `@theme`에서 정의한 토큰을 불러올 때 사용.
- `var()` 함수 → CSS 커스텀 프로퍼티 조회. 같은 토큰이라도 목적이 다름.
  - theme: 디자인 토큰 시스템
  - var: 실제 CSS 계산 시점에 사용하는 변수
- `@layer utilities` → 커스텀 유틸리티 클래스 정의 공간.  
  문서상 명확히 존재하는 Tailwind 공식 기능.  
  다만 WebStorm에서 타입힌트가 안 뜨는 건 IDE가 Tailwind 내부 프리셋만 파악하기 때문.

## 5) 오늘 느낀 점

- 단순히 지식을 늘린 게 아니라, “읽는 관점 자체”가 몇 군데에서 확실히 바뀌었다.
- 특히 Tailwind는 그냥 편한 CSS가 아니라, 팀 전체 작업 방식을 표준화하는 기초 구조가 될 수 있다는 걸 확인.
- JS 쪽은 실행 컨텍스트/스코프 체인의 구조가 다시 머릿속에서 정리되면서, 복잡한 함수 흐름을 읽을 때 기준점이 생겼다.
- tanstack-query도 옵션 우선순위를 정확히 이해한 덕분에, 실수할 여지가 줄어들었다고 느낌.
