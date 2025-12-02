---
type: "content"
domain: "frontend"
category: "testing"
topic: "e2e-test"
updatedAt: "2025-11-30"

satisfaction:
  score: 60
  reason: "테스트 전략 개요와 최소 셋업 가이드 정리, 실제 구현은 미완성"

keywords:
  - "Playwright"
  - "Vitest"
  - "Testing-Library"
  - "E2E"
  - "unit-test"
  - "component-test"
  - "MSW"

relatedCategories:
  - "react"
  - "typescript"
---

# Frontend Testing 전략

E2E 테스트(Playwright)와 Unit/Component 테스트(Vitest + Testing Library)의 최소 셋업을 정리한다.  
시나리오 기반 UI 테스트의 한계를 극복하고, 로컬에서 빠르게 효과를 볼 수 있는 테스트 구조를 구성한다.

## 테스트 구성 요소

- E2E 러너 Playwright
- 컴포넌트/유닛 Vitest + Testing Library
- 폴더/네이밍 tests/e2e/_.spec.ts, src/\*\*/**tests**/_.test.tsx
- DOM 셀렉터 정책, getByRole 우선, 불가 시 data-testid
- 실행 스크립트: test:unit, test:e2e, test, test:watch

## 설치 (yarn 기준)

(A) E2E - Playwright

```bash
$ yarn create playwright
$ yarn playwright install
```

(B) Unit/Component - Vitest + RTL

```bash
$ yarn add -D vitest @testing-library/react @testing-library/user-event @testing-library/jest-dom jsdom
```

(C) moking - MSW

```bash
$ yarn add -D msw
```

아오 너무 많다.  
간단하게 다시 생각해보자.

> 개발 서버를 띄우고, 브라우저 자동으로 열어서 홈이 뜨는지와 핵심 버튼 하나가 클릭되는지만 확인하는 스모크 1개 구성해보자.

(1) Playwright로 로컬 스모크 1개

```bash
$ yarn add -D @playwright/test
$ yarn playwright install
```

(2) 테스트 파일 생성
`tests/e2e/smoke.spec.ts`

```ts
import { test, expect } from "@playwright/test";

test("홈 진입 & 주요 CTA 동작", async ({ page }) => {
  // 개발 서버가 :3000에서 뜬다고 가정 (다르면 아래 URL 수정)
  await page.goto("http://localhost:3000/");

  // 화면에 핵심 헤딩(또는 서비스 로고 텍스트) 보이는지
  await expect(page.getByRole("heading")).toBeVisible();

  // "Get Started" 같은 주요 CTA 링크/버튼이 있다면 눌러보고
  const cta = page
    .getByRole("link", { name: /get started/i })
    .or(page.getByRole("button", { name: /get started/i }));
  if (await cta.count()) {
    await cta.first().click();
    await expect(page).toHaveURL(/.+/); // 라우팅이 실제로 바뀌면 정교화
  }
});
```

(3) 최소 설정
