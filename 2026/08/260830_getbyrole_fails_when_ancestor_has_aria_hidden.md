---
type: "content"
domain: "frontend"
category: "testing"
topic: "대규모 디자인 토큰 마이그레이션 중 E2E 실패를 회귀로 의심했지만, 실제 원인은 aria-hidden 조상이 getByRole 접근성 트리 조회를 막은 것이었던 문제"
updatedAt: "2026-08-30"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "playwright-getbyrole"
  - "aria-hidden-accessibility-tree"
  - "false-positive-regression"
  - "dom-locator-fallback"
  - "git-blame-timeline-triage"

relatedCategories:
  - "e2e-test"
  - "accessibility"
---

# 대규모 디자인 토큰 마이그레이션 중 E2E 실패를 회귀로 의심했지만, 실제 원인은 aria-hidden 조상이 getByRole 접근성 트리 조회를 막은 것이었던 문제

> 394개 파일에 3,097건의 색상 토큰 치환을 실행한 직후 E2E 테스트 하나가 실패했다. 마이그레이션이 범인처럼 보였지만, 실제로는 `aria-hidden="true"`가 걸린 `<main>` 아래에서 `getByRole`이 DOM에 실재하는 링크를 찾지 못한 것이었고, 그 근본 원인은 이틀 전 컴포넌트 레지스트리 순서 변경이었다.

## 배경

`st-*` 토큰 체계를 새 시맨틱 토큰(`--color-*`)으로 옮기는 대규모 마이그레이션을 실행했다(27개 안전 페어, 394개 파일, 3,097건 치환). 마이그레이션 후 전체 검증에서 유닛 테스트 1,388개는 모두 통과했지만 E2E 테스트 중 `V-N1`("상세의 이전/다음이 목록 순서를 따른다")이 실패했다. 색상 토큰을 3천 곳 넘게 바꾼 직후였으니 가장 먼저 의심되는 건 당연히 이 마이그레이션이었다.

## 핵심 내용

**1차 조사: 마이그레이션이 무관하다는 것부터 증명해야 했다.** `git log`로 타임라인을 재구성하니 `library-nav.spec.ts`는 8/26에 마지막으로 수정됐고, 컴포넌트 레지스트리 순서(모달 `quick-task-add-dialog`가 목록 맨 앞으로 이동)는 8/28에 바뀌었으며, 토큰 마이그레이션은 8/30에 실행됐다. 즉 테스트가 깨질 씨앗은 마이그레이션보다 이틀 먼저 심어져 있었다 — CSS 토큰 치환은 DOM 구조나 `aria-hidden` 속성에 손댈 수 없으므로 시간순으로도 무관함이 증명됐다.

**2차 조사: `getByRole`이 "없다"고 한 요소가 실제로는 DOM에 있었다.** Playwright의 `getByRole('link', { name: '...' })`는 0건을 반환했지만, 같은 페이지에서 `querySelectorAll('a[aria-label^="..."]')`로 조회하면 링크가 2개 존재했다. 두 결과가 갈리는 이유는 `getByRole`이 raw DOM이 아니라 **접근성 트리**를 조회하기 때문이다. 부모 체인을 추적해보니 `<main aria-hidden="true">`가 전체 콘텐츠 영역을 감싸고 있었고, 이 속성이 걸리면 `display`나 `visibility`가 정상이어도 자식 전체가 접근성 트리에서 사라져 `getByRole` 기반 단언이 전부 실패한다.

**모달 감지 타이밍까지 겹쳐서 디버깅이 두 단계로 늘어났다.** 처음엔 모달이 마운트 직후 비동기로 열리기 때문에 `aria-hidden` 체크가 너무 일찍 실행돼 모달을 놓치는 문제로 착각했다("모달 마운트→오픈→aria-hidden 적용" 순서, 실측으로 한 번 확인). 타이밍을 고쳐도 여전히 실패해서, 진짜 원인이 "모달 스킵 로직"이 아니라 "모달이 아닌 컴포넌트에도 걸리는 접근성 트리 문제"라는 걸 4개 컴포넌트를 직접 순회 검사하고 나서야 확정할 수 있었다.

**해결은 쿼리 전략을 접근성 트리 의존에서 raw DOM 의존으로 바꾸는 것이었다.** `getByRole('heading', { level: 1 })` 대신 모든 컴포넌트 프리뷰에 공통으로 붙는 `.preview-surface` 클래스를 `page.locator()`로 직접 잡도록 바꿨다. DOM 로케이터는 `aria-hidden` 여부와 무관하게 요소를 찾아내므로, 모달이든 아니든 동일한 동기화 전략을 쓸 수 있었다. 수정 후 6개 테스트 전부 통과(기존 1 실패·5 통과 → 6 통과, 실행 시간도 8초 단축).

## 정리

`getByRole`은 접근성 트리 기준으로 동작하기 때문에, 요소가 CSS로는 멀쩡히 보여도 조상 어딘가에 `aria-hidden="true"`가 걸리면 조용히 "없음"으로 처리된다 — 에러 없이 그냥 0건이라 회귀로 오인하기 쉽다. 이런 실패를 만나면 `querySelectorAll` 같은 raw DOM 조회로 요소가 실재하는지부터 대조해 접근성 트리 문제인지 진짜 부재인지 가른다. 그리고 "직전에 큰 변경을 했다"는 사실 자체가 인과관계를 보장하지 않는다는 것도 다시 확인했다 — `git log`로 관련 파일들의 실제 수정 시점을 나란히 놓고 보는 것이, 심증만으로 최근 변경을 범인으로 지목하는 것보다 훨씬 빠르고 확실했다.
