---
type: "content"
domain: "backend"
category: "javascript"
topic: "순환 import에서 const 화살표 함수는 호이스팅되지 않아 undefined가 될 수 있다"
updatedAt: "2026-09-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "circular-import"
  - "hoisting"
  - "const-arrow-function"
  - "module-initialization-order"
  - "typescript"

relatedCategories:
  - "typescript"
  - "build-infra"
---

# 순환 import에서 const 화살표 함수는 호이스팅되지 않아 undefined가 될 수 있다

> `function isEntry() {}`는 순환 import에서도 안전하지만 `const isEntry = () => {}`는 참조 시점에 초기화가 끝나 있다는 보장이 없다. 계획 단계에서 import 방향을 미리 그려보고 함수 정의 위치를 정했다.

## 배경

atelier의 design-foundation 토큰 쓰기 API(`patch.ts`)를 구현하는 계획을 실행 직전 사전 점검(pre-flight validation)하던 중, 계획서에 적힌 파일 분리안이 순환 import를 만든다는 것을 발견했다.

원래 계획:
- `patch.ts`가 `./patch.refs`를 import
- `patch.refs.ts`가 다시 `./patch`를 import

`isEntry`는 `const isEntry = (v: unknown): v is Entry => ...` 형태의 화살표 함수였다. `function` 선언과 달리 화살표 함수를 담은 `const`는 호이스팅되지 않는다 — 모듈 로드 순서에 따라 아직 초기화되지 않은 모듈의 값을 참조하면 `undefined`가 된다. 순환 import 상황에서는 어느 모듈이 먼저 평가되느냐에 따라 이 참조가 실제로 깨질 수 있었다.

## 핵심 내용

- 두 파일을 가른 이유 자체는 정당했다: `patch.ts`는 "연산 하나를 그룹에 적용", `patch.refs.ts`는 "그룹 전체를 훑어 참조·충돌을 찾는다" — 바뀌는 이유가 다르고 합치면 300줄을 넘어간다.
- 해결은 `isEntry` 정의 위치를 옮기는 것이었다: `patch.ts`가 아니라 `patch.refs.ts`에 두고, import 방향을 한쪽으로만 고정했다.
  - `patch.ts → patch.refs.ts → read.ts`
- 실제 구현된 `patch.refs.ts`에는 이 판단을 코드 주석으로 남겨뒀다:
  > `isEntry`가 여기 산다 - `patch.ts`가 이 파일을 부르므로, 반대 방향으로 다시 `patch.ts`를 불러오면 순환 import가 생긴다. 방향은 하나다 - `patch.ts → patch.refs.ts → read.ts`.
- 사전 점검에서 잡아낸 덕분에, 실행 단계 계획(Task 3/4)도 그에 맞춰 조정했다 — Task 3에서 `isEntry`를 일단 `patch.ts`에 두고, Task 4에서 `patch.refs.ts`로 옮기며 `patch.ts`에 import를 추가하는 순서로 분리했다.

## 정리

- `function` 선언은 순환 import에서도 먼저 호이스팅되어 안전하지만, `const` + 화살표 함수는 모듈 평가 순서에 종속된다. 두 모듈이 서로를 import하는 구조를 설계할 때는 화살표 함수/화살표 상수를 어느 쪽에 둘지가 곧 "어느 방향이 순환을 만드는가"의 문제가 된다.
- 파일을 가르는 기준(책임 분리)과 import 방향(순환 회피)은 별개의 결정이다. 책임은 옳게 갈랐어도 방향을 잘못 잡으면 런타임에만 터지는 버그가 된다 — 코드를 실행하기 전, import 그래프를 먼저 손으로 그려보는 사전 점검이 이런 걸 잡아낸다.
