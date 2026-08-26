---
type: "content"
domain: "frontend"
category: "ui-ux"
topic: "컴포넌트 프리뷰 하네스에서 Dialog가 자동으로 열려 타겟 지정을 막는 문제를 iframe 격리 여부 논의로 풀다"
updatedAt: "2026-08-25"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "component-preview-harness"
  - "iframe-sandbox-isolation"
  - "portal-leakage"
  - "media-query-breakpoint"
  - "fidelity-vs-boundary-tradeoff"

relatedCategories:
  - "css"
  - "react"
---

# 컴포넌트 프리뷰 하네스에서 Dialog가 자동으로 열려 타겟 지정을 막는 문제를 iframe 격리 여부 논의로 풀다

> 컴포넌트 갤러리에서 Dialog 스토리를 열면 화면을 바로 덮어버려서 그 아래 요소를 타겟 지정할 수 없었다. "iframe으로 프리뷰 영역의 경계를 나누면 되지 않을까"라는 질문에서 출발해, 실제로는 Dialog 하나의 문제가 아니라 프리뷰 하네스 전체가 갖고 있던 경계 누수(포털, 미디어쿼리, 전역 리스너) 문제라는 게 드러났다.

## 배경

`http://localhost:9221/c/atomic-dialog` 갤러리 화면에서 atomic-dialog 스토리가 기본 상태로 바로 열려 있어서, 화면을 막고 그 아래 요소를 클릭으로 지정하는 게 불가능했다. "보통 이런 Preview 영역은 iframe으로 샌드박스 경계를 만들고 타겟 지정을 그 범위 밖으로 잡는 게 맞지 않나?"라는 질문에서 세션이 시작됐다.

## 핵심 내용

**증상은 Dialog였지만 원인은 iframe이 아니라는 사실 자체였다.** `container` prop으로 같은 문서 안에서 프리뷰 범위를 잡는 방식은 "그 prop을 읽어주는 컴포넌트"에만 통한다. base-ui 계열 컴포넌트는 협조적이라 문제없지만, 전역 `keydown` 리스너·`document.title` 변경·`:root`에 쓰는 CSS 변수·`createPortal(x, document.body)` 직접 호출처럼 협조하지 않는 코드는 경계를 그대로 새어 나간다. 구멍을 하나씩 막는 방식이라 컴포넌트가 늘수록 구멍도 늘어난다.

**이미 틀리고 있던 다른 것 — 미디어쿼리였다.** 실제 뷰포트는 1600px인데 프리뷰 틀은 1296px였다. `container` 범위 안에 그려지는 모든 것이 미디어쿼리 질문에 "1600"이라는 (frame 크기가 아닌 실제 뷰포트) 답을 듣고 있었다. staging 컴포넌트·스토리 중 48개 파일이 `sm:`/`md:`/`lg:`를 쓰고, 뷰포트 단위를 쓰는 곳 4곳, `matchMedia`/`@media`를 직접 쓰는 곳도 5곳 있어서, 패널을 좁히거나 `previewZoom`을 줄여도 브레이크포인트가 따라오지 않았다 — 좁은 화면 반응형을 이 하네스로는 볼 방법이 없었다. iframe은 이걸 별도 작업 없이 고쳐준다(진짜 `100vh`, 갤러리에 안 새는 스크롤 락, CSS 리셋/토큰 충돌 차단, 진짜 모바일/태블릿 반응형 프리셋).

**`modal={false}`로 우회하지 않은 이유 — 하네스의 존재 이유가 충실도이기 때문이다.** 그 순간 프리뷰에 있는 건 진짜 Dialog가 아니라 "모달성을 뗀 변종"이 되어 포커스 트랩·스크롤 락이 실제로 도는지를 하네스에서 볼 수 없게 된다. 경계 문제를 풀겠다고 검증 대상 자체의 충실도를 깎는 건 본말전도라고 판단했다.

**iframe 전환 비용은 유계라는 것도 확인했다.** 설계도(blueprint) HUD가 DOM 노드의 `__reactFiber$` 키를 훑어 fiber를 잡는 방식인데, same-origin iframe이면 부모가 `contentDocument` 노드의 그 키를 그대로 읽을 수 있어 크로스 렐름이어도 깨지지 않는다. 손봐야 할 지점은 rect에 iframe `boundingClientRect` 오프셋을 더하는 것, `instanceof Element`를 `contentWindow.Element` 기준으로 바꾸는 것, `ElementPicker`의 `document` 리스너를 iframe document에도 다는 것 정도로 국한된다. 진짜 결정거리는 "같은 번들을 iframe 안에서 다시 부팅"(Storybook 방식, 완전 격리·비용 높음)과 "부모 렐름에서 iframe document로 렌더"(비용 낮음) 중 하나였는데, 후자는 `FloatingPortal`이 `document.body`를 하드코딩해 포털이 iframe 밖으로 새어버리므로 애초에 경계를 사는 목적을 못 이룬다 — 경계를 사려면 전자여야 한다는 결론.

**그럼에도 지금 당장은 iframe으로 가지 않기로 했다.** iframe이 방향은 맞지만 문제는 순서였다 — 지금 제품 코드에 프리뷰 전용 컨텍스트를 심으면 나중에 iframe으로 옮길 때 그 코드를 되돌려야 한다. 그래서 당장은 제품 코드에 손대지 않는 선에서만 막기로 했다: `atomic-dialog.stories.tsx`의 초기 상태를 `useState(true)`에서 `false`로 바꿔, 스토리가 자동으로 열리지 않고 트리거를 눌러야 열리게 했다. 이건 매복이 아니라 사용자가 고른 결과가 된다. 같은 처방이 필요한 다른 자동 열림 스토리(alert-dialog, drawer/sheet 등)도 같은 기준으로 찾아 정리 대상에 올렸다.

## 정리

경계가 새는 증상 하나(Dialog가 화면을 막음)를 표면적으로 고치기 전에, "이 경계는 원래 얼마나 새는가"를 먼저 물었다. `container` prop 같은 부분적 봉합은 협조적인 컴포넌트에만 통하고, 미디어쿼리처럼 애초에 손댈 수 없는 채널은 프레임 크기가 아니라 실제 뷰포트를 그대로 본다 — 이 둘은 컴포넌트를 추가할 때마다 구멍이 늘어나는 종류의 문제라 iframe 전면 격리가 정답 방향이라는 걸 먼저 확정했다. 그런 다음에도 "지금 당장 그 방향으로 갈지"는 별개의 질문으로 두고, 비용(제품 코드에 프리뷰 컨텍스트를 심었다가 되돌려야 하는 손실)과 순서를 근거로 임시방편을 선택했다. 근본 해법의 방향을 확정하는 것과, 그 방향으로 지금 움직일지를 정하는 것은 분리해서 판단해야 한다는 게 이 세션의 핵심이었다.
