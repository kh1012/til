---
type: "content"
domain: "frontend"
category: "typescript"
topic: "selector-button API 리네임에서 갤러리 프리뷰 소비처만 못 옮겼는데 loose ambient shim이라 타입체크가 못 잡은 문제"
updatedAt: "2026-08-26"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "api-rename-missed-consumer"
  - "loose-ambient-module-shim"
  - "typecheck-blind-spot"
  - "gallery-preview-desync"
  - "misdirected-bug-report"

relatedCategories:
  - "react"
  - "build-infra"
---

# selector-button API 리네임에서 갤러리 프리뷰 소비처만 못 옮겼는데 loose ambient shim이라 타입체크가 못 잡은 문제

> maxflow ui-harness에서 "quantity-stepper 페이지가 안 뜬다"는 버그 리포트를 받았는데, 실측해보니 그 페이지 자체는 콘솔 에러 0으로 멀쩡했다. 진짜 깨진 건 `/components` 목록의 selector-button 카드 프리뷰였고, 원인은 직전 커밋이 `label`+`menuContent` prop을 `items`로 리네임하면서 실제 소비처 두 곳과 스토리는 옮겼지만 갤러리 프리뷰 컴포넌트 한 곳만 빠뜨린 것이었다. `@maxflow/ui/*`가 `ui-shims.d.ts`로 느슨하게 타입 선언되어 있어서 이 미스가 타입체크에 걸리지 않았다.

## 배경

사용자가 준 URL(`/c/quantity-stepper-719700`)을 새 브라우저로 직접 로드해 콘솔 error/pageerror/4xx·5xx를 전부 확인했지만 0건이었다. 스토리 3종(Default/Bounds/Controlled) 전환, 설계도 오버레이, 상세 정보 4탭, 1440×900/900×700 뷰포트, 다크 테마, 라이브러리 카드 썸네일까지 다 정상이었다 — 즉 사용자가 지목한 URL 자체는 깨져 있지 않았다. 리포트가 가리킨 대상과 실제 결함의 위치가 어긋나 있었던 것.

## 핵심 내용

**실제 결함은 `/components` 목록의 selector-button 카드였다.** "프리뷰 없음 · 렌더 중 오류가 나 안전하게 내렸습니다"라는 안전장치 메시지 뒤에 `TypeError: Cannot read properties of undefined (reading 'length') at SelectorButton (selector-button.tsx:82)`가 찍혀 있었다.

**원인은 직전 커밋의 리네임 누락이었다.** 커밋 `c0bb3e0a87`이 selector-button의 API를 `label` + `menuContent`에서 `items`로 바꾸면서, 실제 소비처인 ai-rule-console과 file-deliverables-dropdown, 그리고 스토리 파일은 전부 새 API로 옮겼다. 그런데 `maxflow/packages/ui-harness/gallery/src/preview/preview-components.tsx`의 갤러리 프리뷰 호출부 한 곳만 옛 prop을 그대로 남겨뒀고, 결과적으로 `items`가 `undefined`로 들어가 `items.length`에서 터졌다.

**이 미스가 타입체크로 안 잡힌 이유는 `@maxflow/ui/*`가 `ui-shims.d.ts`로 느슨하게 앰비언트 선언되어 있기 때문이다.** 실제 컴포넌트의 정확한 prop 타입이 아니라 느슨한 shim 타입을 참조하다 보니, prop 이름이 바뀌었는데도 컴파일러가 조용히 통과시켰다. 리네임할 때 "grep으로 찾은 소비처를 다 고쳤다"와 "타입체크가 통과했다"가 둘 다 "다 옮겼다"를 보장해주지 못하는 상황이었던 셈이다.

**고치는 김에 의도된 에러와 진짜 버그를 구분해뒀다.** `/pages`의 `sim-scratch-broken-on-first-load` 페이지 오류는 reload-guard e2e 테스트용 고의 픽스처라 건드리지 않았다 — 오류 로그가 보인다고 전부 고칠 대상은 아니라는 걸 재확인한 것.

## 정리

버그 리포트가 가리키는 화면과 실제 결함이 있는 화면은 다를 수 있다 — 리포트된 URL을 그대로 재현하기 전에 "정확히 뭐가 안 뜨는지" 한 줄을 더 물어보는 대신, 먼저 그 URL 자체를 실측하고 콘솔이 깨끗하면 주변(같은 커밋이 건드린 다른 소비처)으로 탐색 범위를 넓히는 편이 더 빨랐다. 그리고 컴포넌트 라이브러리의 public API를 리네임할 때 grep으로 소비처를 찾아 옮기는 방식은, 그 컴포넌트의 타입이 `ui-shims.d.ts` 같은 느슨한 앰비언트 선언 뒤에 숨어 있으면 타입체크가 최후 방어선이 되어주지 못한다는 걸 보여준 사례다. 소비처 목록을 grep 외에 스토리/갤러리 등록부처럼 "직접 import하지 않는 간접 소비처"까지 체크리스트로 짚어야 한다.
