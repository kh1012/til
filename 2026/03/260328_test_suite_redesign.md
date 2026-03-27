---
draft: true
type: "content"
domain: "frontend"
category: "testing"
topic: "단위 테스트 전면 재설계 — 양에서 질로 전환"
updatedAt: "2026-03-28"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "vitest"
  - "test-data-factory"
  - "data-testid"
  - "playwright"
  - "page-object-model"
  - "pure-function-testing"

relatedCategories:
  - "react"
  - "playwright"
  - "ci-cd"
---

# 단위 테스트 전면 재설계 — 768개에서 550개로 줄이고 품질 올리기

> 테스트 수를 30% 줄이면서 핵심 비즈니스 로직 커버리지를 0%에서 100%로 올린 과정

## 배경

MAXYS Frontend-3 프로젝트에서 768개 테스트 중 25개가 상시 실패하고 있었다. 코드를 변경할 때마다 CSS 셀렉터나 하드코딩된 한국어 문자열에 의존하는 테스트가 깨지면서 CI 신뢰도가 바닥이었다. 정작 에러 처리(format-chat-error), 메시지 변환(thread-message-helpers), 유니코드 정리(sanitize-surrogates) 같은 핵심 비즈니스 로직에는 테스트가 하나도 없었다.

## 핵심 내용

### 1. 삭제 기준 정립이 핵심

"어떤 테스트를 남길 것인가"보다 "어떤 테스트를 버릴 것인가"가 더 중요했다. 삭제 기준 4가지:

1. `querySelector(".css-class")` 사용 — 스타일 변경 시 100% 깨짐
2. `vi.mock()` 5개 이상 — 유지보수 비용이 테스트 가치를 초과
3. 단일 `getByText`만 검증 — "렌더링된다" 수준은 가치 없음
4. 모킹된 컴포넌트만 확인 — 실제 동작이 아닌 mock 동작을 테스트

이 기준으로 52개 파일(218 케이스)을 삭제했다.

### 2. 순수 함수 우선 테스트 전략

Tier 1으로 분류한 5개 파일이 모두 **순수 함수**였다는 점이 핵심이었다:

- `formatChatError(error, t)` — Error → 사용자 메시지 변환 (18개 패턴)
- `isJsonRelatedError(msg)` / `stripBrokenToolParts(messages)` — JSON 에러 감지+제거
- `buildRequestBody(params)` — API 요청 본문 구성
- `sanitizeSurrogates(str)` / `sanitizeDeep(value)` — 유니코드 정리
- `extractTextFromMessage(msg)` — UI↔History 변환

mock이 필요 없으니 테스트가 깨질 이유가 없다. **mock 없는 테스트가 가장 강건하다.**

### 3. Test Data Factory 패턴

```typescript
// 인라인 mock 데이터 (나쁜 예)
const msg = { id: "1", role: "user", parts: [{ type: "text", text: "hi" }], createdAt: new Date() };

// Factory 패턴 (좋은 예)
import { createUIMessage } from "@test";
const msg = createUIMessage({ parts: [{ type: "text", text: "hi" }] });
```

`@test` alias로 `src/__test-utils__/`를 import하는 패턴. factory 4개(message, error, tool-call, request)로 테스트 데이터 생성을 일관되게 만들었다.

### 4. data-testid 전략

CSS 셀렉터 대신 `data-testid`를 사용하면 스타일 리팩토링에 테스트가 영향받지 않는다:

```typescript
// 나쁜 예 — 스타일 변경 시 깨짐
container.querySelector("svg.animate-spin")

// 좋은 예 — 스타일과 무관
screen.getByTestId("tool-state-running")
```

10개 data-testid를 6개 컴포넌트에 추가했다. "인터랙션/상태 식별이 필요한 요소에만" 추가하는 것이 규칙.

### 5. E2E로 이관할 것과 삭제할 것의 구분

삭제된 56개 파일 중 E2E로 이관한 것은 5개뿐이다. 나머지 51개는 그냥 삭제. 이관 기준:

- **E2E 이관**: CSS 애니메이션, 패널 토글, 실제 라이브러리(react-markdown 등) 동작 검증
- **그냥 삭제**: BrandLogo 렌더링, Tooltip hover, 개발자 전용 패널 등

### 6. vitest.setup.ts i18n mock 개선

기존 mock이 `t(key) => ko.json[key] ?? key`만 반환하여 파라미터 치환이 안 되었다. `{count} 토큰` 같은 텍스트가 `"{count} 토큰"`으로 렌더링되어 테스트가 깨지는 원인이었다.

```typescript
// 개선: 파라미터 치환 지원
t: (key, params?) => {
  let text = ko[key] ?? key;
  if (params) Object.entries(params).forEach(([k, v]) => {
    text = text.replace(`{${k}}`, String(v));
  });
  return text;
}
```

## 정리

- **테스트 수는 줄이되, 핵심 로직 커버리지는 올려라.** 768→550이지만 실질적 안전망은 훨씬 강해졌다.
- **순수 함수를 먼저 테스트하라.** mock 없는 테스트가 가장 유지보수 비용이 낮다.
- **CSS 셀렉터에 의존하는 테스트는 부채다.** data-testid로 전환하거나 E2E로 이관.
- **"렌더링된다" 수준의 테스트는 삭제 대상이다.** 행동(behavior)을 검증하지 않는 테스트는 가치가 없다.
- **Test Data Factory는 투자 대비 효과가 크다.** 일관된 테스트 데이터 + `@test` alias로 모든 테스트에서 재사용.
