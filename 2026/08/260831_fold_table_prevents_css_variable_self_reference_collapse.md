---
type: "content"
domain: "frontend"
category: "ui-ux"
topic: "Figma가 background 패밀리에서 Color/ 접두사를 제거했을 때, fold table이 없었다면 value 레이어와 utility 레이어 변수명이 겹쳐 Tailwind에서 색이 투명하게 무너졌을 문제"
updatedAt: "2026-08-31"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-tokens"
  - "css-custom-properties-self-reference"
  - "tailwind-theme-inline-layer-order"
  - "figma-naming-convention-migration"
  - "backward-compatible-fold-rule"

relatedCategories:
  - "css"
  - "build-infra"
---

# Figma가 background 패밀리에서 Color/ 접두사를 제거했을 때, fold table이 없었다면 value 레이어와 utility 레이어 변수명이 겹쳐 Tailwind에서 색이 투명하게 무너졌을 문제

> 디자이너가 Figma에서 `Color/Background/*` 경로의 `Color/` 접두사를 다른 패밀리(`text`, `icon`, `border`)와 맞추려고 지웠다. 토큰 생성 스크립트(`ds-figma-colors.tokens.mjs`)의 fold table에 새 규칙 하나를 추가하는 것으로 끝났지만, 이 fold table이 애초에 왜 존재하는지 다시 들여다보니 "value 레이어와 utility 레이어의 CSS 변수명이 우연히 같아지면 `--x: var(--x)` 형태의 자기 참조가 생기고, Tailwind의 레이어 순서 때문에 이게 조용히 `rgba(0,0,0,0)`으로 무너진다"는, 에러 로그 한 줄 없이 터지는 버그를 막기 위한 안전장치였다.

## 배경

이 프로젝트의 색상 토큰 파이프라인은 2단계 구조다. `:root` / `[data-theme=*]`에 정의되는 **value 레이어**는 Figma 변수 경로를 그대로 보존해서(`--color-background-primary`) Dev Mode 핸드오프 코드를 번역 없이 그대로 붙여넣을 수 있게 하고, `@theme inline`에 정의되는 **utility 레이어**는 Tailwind가 쓸 짧은 이름(`--color-surface-primary`)을 만든다. 이 둘을 연결하는 게 `ds-figma-colors.tokens.mjs`의 `FOLD` 테이블이다.

8월 31일, 디자이너가 Figma에서 `background` 계열 변수 경로의 `Color/` 접두사를 지웠다(`Color/Background/Primary` → `Background/Primary`). `text`, `icon`, `border` 패밀리는 이미 접두사 없이 단일 레벨이었는데 `background`만 예외였던 걸 맞춘 것이다. 이 변경 자체는 사소해 보였지만, 토큰 생성 스크립트 입장에서는 fold 규칙의 첫 세그먼트 매칭 대상이 `color`에서 `background`로 바뀌는 것이라 새 규칙이 필요했다.

## 핵심 내용

**fold table이 존재하는 진짜 이유는 네이밍 정리가 아니라 자기 참조 방지다.** `colors.css`는 `tokens.json`에서 생성되는 파일인데, 만약 utility 레이어 변수명이 value 레이어와 똑같다면 (예: 둘 다 `--color-background-primary`라면) 결과적으로 `--color-background-primary: var(--color-background-primary)`라는 자기 참조 선언이 생긴다. 개별 브라우저는 이걸 즉시 에러로 보여주지 않고, Tailwind의 레이어 순서(`@theme inline`이 나중에 평가됨) 때문에 이 값이 조용히 무너져 최종 색상이 `rgba(0,0,0,0)`, 즉 완전 투명이 되어버린다. 콘솔에 에러가 없으니 "왜 배경색이 갑자기 안 보이지?"로만 보고되는 버그다. `text→ink`, `border→line`, `color/background→surface` 같은 fold 규칙들은 결국 value 레이어와 utility 레이어의 이름이 절대 겹치지 않도록 강제하는 장치였다.

**대응은 새 규칙을 앞에, 레거시 규칙을 뒤에 추가하는 것이었다.**
```js
const FOLD = [
  { head: ["background"], to: "surface" },        // 신규: Figma 신규 경로
  ...
  { head: ["color", "background"], to: "surface" }, // 레거시: Color/ 접두사 붙은 구 스냅샷
];
```
`foldUtility`는 첫 세그먼트부터 순서대로 매칭하는 첫 번째 규칙을 쓰므로, 두 규칙은 `parts[0]`이 각각 `"background"`/`"color"`로 갈려서 충돌하지 않는다. 이렇게 하면 새 Figma 스냅샷과 아직 마이그레이션 전인 옛 스냅샷을 동시에 지원할 수 있다 — 어느 한쪽을 깨뜨리지 않고 넘어가는 하위 호환 규칙 추가 패턴이다.

**영향 범위 스캔이 먼저였다.** `--write`로 실제 반영하기 전에, `--color-background-*`를 직접 참조하는 코드가 있는지부터 확인했다(미리보기 모드로 226건의 토큰 변경 diff 확인). 결과는 컴포넌트 코드(`ui/src`)에는 value 레이어 이름을 직접 쓰는 곳이 0건이었고 — 컴포넌트는 항상 안정적인 utility 레이어(`bg-surface-*`)만 참조하도록 설계돼 있었다 — 대신 갤러리 하니스와 Docker 브랜딩 커스터마이징 레이어(총 59곳: CSS 19곳 + TS/TSX 40곳)에만 value 레이어 이름이 하드코딩돼 있었다. 즉 "프로덕션 컴포넌트는 안 깨지고, 하니스/문서/브랜딩만 고치면 된다"는 걸 코드를 고치기 전에 먼저 확인하고 시작했다.

## 정리

디자인 토큰 파이프라인에서 value 레이어와 utility 레이어를 분리하는 이유는 "이름을 예쁘게 정리하기 위해서"가 아니라, 둘의 이름이 우연히 같아지는 순간 CSS 변수 자기 참조로 색이 조용히 사라지는 걸 막기 위해서였다 — 이 인과관계는 실제로 fold table 코드를 짜본 사람이 아니면 코드만 보고 바로 알기 어렵다. 그리고 상류(Figma)의 네이밍 변경에 대응할 땐 기존 규칙을 새 규칙으로 덮어쓰기보다, 매칭 조건이 겹치지 않는 새 규칙을 앞에 추가하고 레거시 규칙을 남겨두는 편이 안전하다 — 마이그레이션 시점이 서로 다른 스냅샷들이 공존할 수 있기 때문이다. 코드를 고치기 전에 "실제로 이 이름을 직접 참조하는 곳이 있는가"부터 전수 스캔한 것도, 변경 범위를 추측이 아니라 사실로 확정하고 나서 손을 대는 순서였다.
