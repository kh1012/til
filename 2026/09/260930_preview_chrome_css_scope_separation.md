---
type: "content"
domain: "frontend"
category: "css"
topic: "preview 문서와 shell chrome의 CSS 네임스페이스 충돌을 attribute 스코핑으로 분리"
updatedAt: "2026-09-30"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "css-scoping"
  - "postcss-plugin"
  - "design-tokens"
  - "portal"
  - "dark-theme"

relatedCategories:
  - "ui-ux"
  - "build-infra"
---

# preview 문서와 shell chrome의 CSS 네임스페이스 충돌을 attribute 스코핑으로 분리

> chrome 색상 선언(#404040)이 workbench 값(#374151)을 덮어써 preview 다크 모드 다이얼로그 배경이 잘못 렌더링되던 문제를, CSS 파일을 분리하고 `[data-atelier-chrome]` 속성으로 스코핑해 해결한 기록.

## 배경

atelier의 preview iframe은 shell의 chrome CSS(알림, 복구 카드, 스피너, 툴팁 등 공통 UI 조각)와 workbench CSS(실제 미리보기 대상 디자인 시스템)를 같은 문서 안에서 동시에 로드하고 있었다. 두 CSS가 같은 클래스 이름과 CSS 변수 이름을 공유하면서, 선언 순서에 따라 chrome의 다크 색상 값이 workbench 색상 값을 덮어쓰는 충돌이 발생했다. 다이얼로그 배경이 chrome 색(#404040)으로 칠해지고 workbench 색(#374151)이 적용되지 않는 식이다.

## 핵심 내용

- 해결 방향은 설계 문서(spec D8)에서 "iframe은 workbench 스타일만 로드한다"로 정했다. preview 문서 안에서 chrome 조각은 완전히 별도로 컴파일한 CSS로 칠한다.
- CSS 파일을 두 개로 쪼갰다.
  - `preview.css` — workbench 클래스와 `tokens.css`만 포함. design-system 유틸리티(`ds-color` 접두사)와 `data-theme="dark"` 규칙은 아예 포함하지 않고, 다크 모드는 `@custom-variant dark`로 처리한다. 457KB.
  - `preview.chrome.css` — chrome UI 조각 전용. `vite-preview-chrome.ts`라는 PostCSS 플러그인이 모든 선택자를 `:where([data-atelier-chrome])`로 감싸고 `@layer atelier-chrome`으로 묶는다. 127KB, 804개 선택자가 스코핑됐다.
- 스코핑이 성립하려면 chrome UI 조각의 루트 엘리먼트마다 `data-atelier-chrome` 속성을 실제로 달아야 한다. flash layer, 로딩 스피너, 크래시 카드, not-found 화면, 로딩 상태 등 preview 문서의 chrome 조각 전부에 이 속성을 붙였다.
- 문제는 포털(Radix/base-ui의 `Portal`)로 렌더링되는 요소였다. 툴팁 같은 컴포넌트는 기본적으로 `document.body`에 렌더링되는데, 그러면 `[data-atelier-chrome]` 스코프 바깥으로 빠져나가 `preview.chrome.css` 규칙이 전혀 적용되지 않는다.
  - `PortalContainerContext`와 `usePortalContainer` 훅을 새로 만들어 해결했다. preview 문서의 `main.tsx`가 chrome 컨테이너 엘리먼트를 context 값으로 제공하면, `Tooltip` 컴포넌트가 `usePortalContainer()`로 그 값을 읽어 `TooltipPrimitive.Portal`의 `container`로 넘긴다.
  - shell 쪽 컴포넌트는 이 context를 제공하지 않으므로 기존처럼 `document.body`로 기본 동작한다. 같은 컴포넌트 코드가 preview와 shell 양쪽에서 분기 없이 동작한다.
  - context 정의 파일은 React만 import하는 leaf 파일로 남겨, HMR이 context 재생성을 일으키지 않도록 했다.
- 구현 중 예상 못 한 사이드이펙트가 몇 개 나왔다.
  - 페이지 마크용 "aim" 색상이 `styles.blueprint.css`에 섞여 있어 `styles.aim.css`로 따로 뽑아냈다.
  - workbench 재-import 시 `base`(상태 변형)와 `scale`(유틸리티/z-index) skin이 설정에서 누락되는 버그를 발견해, `keepSkins` 함수로 보존 로직을 추가했다(동시에 모듈이 300줄 정책을 넘겨 `import-maxflow.skins.ts`로 분리).
  - vite import 의존성 수가 28개에서 30개(실측 29개)로 늘어나 번들 사이즈 제한값을 조정해야 했다.
- 검증은 시각 회귀 테스트로 했다. preview 다크 모드 다이얼로그 영역만 7.458% 픽셀 변화(의도한 색상 수정)가 났고, 라이트 모드와 다른 preview 컴포넌트는 0% 변화, shell 화면은 서브픽셀 수준(0.003%)만 변해 스코프가 기대한 범위 안에서만 영향을 미쳤음을 확인했다.
- 이 작업 중 workbench 다크 테마 토큰 자체에서도 별개의 문제를 발견했다. 라이트 테마 색상 값을 다크 테마에 그대로 쓴 탓에 `fg-neutral-quinary` 같은 텍스트 색이 다크 배경과 대비 1.00:1(사실상 안 보임)이 되는 경우가 여럿 있었다. input 테두리와 배경이 완전히 같은 색(#111827)이라 입력 필드 경계가 안 보이는 경우도 있었다. 이건 이번 스코핑 작업의 범위 밖으로 분류하고 별도 항목으로 남겼다.

## 정리

- CSS 네임스페이스 충돌은 "누가 먼저 로드되는가"에 좌우되는 취약한 상태다. 속성 기반 스코핑(`[data-atelier-chrome]`)과 `@layer`로 분리하면 로드 순서에 의존하지 않고 충돌을 구조적으로 막을 수 있다.
- 포털 렌더링은 CSS 스코핑을 깨는 대표적인 경로다. 스코핑 작업을 할 때는 class/attribute뿐 아니라 "이 컴포넌트가 실제로 어느 DOM 노드 밑에 마운트되는가"까지 확인해야 한다. context로 컨테이너를 주입하는 방식은 호출부 코드를 건드리지 않고 preview/shell 양쪽 동작을 분기할 수 있어 재사용성이 좋다.
- 시각 회귀 테스트에서 "의도한 영역만 변하고 나머지는 0%"를 수치로 확인하는 방식은, 스코핑처럼 영향 범위를 좁히는 작업의 검증 기준으로 적합하다.
