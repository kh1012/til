---
type: "content"
domain: "frontend"
category: "animation"
topic: "필터링 후 재인덱싱이 외부 index 공간과 어긋나는 stagger 애니메이션 버그"
updatedAt: "2026-11-10"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "stagger-animation"
  - "index-drift"
  - "array-filter"
  - "electron-ipc"
  - "animation-timing"

relatedCategories:
  - "javascript"
---

# 필터링 후 재인덱싱이 외부 index 공간과 어긋나는 stagger 애니메이션 버그

> shell이 계산해 둔 stagger 타이밍 배열은 measured 배열의 원래 index로 접근해야 하는데, guest 쪽에서 DOM 연결 여부로 필터링한 뒤 새로 매긴 index를 그대로 썼다. 필터링 중 요소가 하나라도 사라지면 그 뒤 모든 요소의 stagger 타이밍이 어긋났다.

## 배경

Plugin Builder의 FM9 캔버스 모핑 애니메이션은 shell과 guest(electron preload) 두 레이어가 index로 묶여 움직인다. shell이 `fast.blocks` 응답으로 요소들을 측정해 `measured[]` 배열을 만들고, 그 index 순서대로 stagger 타이밍 배열을 계산해 넘긴다. guest는 `fast-morph-reveal.ts`에서 이 타이밍 배열을 받아 각 요소에 `revealOf(i, stagger)`로 애니메이션을 건다.

## 핵심 내용

**버그**: guest 쪽 `morphReveal()`이 `measured[]`를 순회하며 `b.el.isConnected`로 DOM에서 사라진 블록을 걸러냈는데, 그 결과 배열에 새로 매겨진 index `i`를 그대로 `revealOf(i, stagger)`에 넘겼다.

- `measured[]`의 index 5가 reveal 시작 전에 DOM에서 제거됐다고 하면, 필터링된 배열에서는 그 자리가 index 4가 된다.
- 하지만 shell이 계산해 둔 stagger 배열은 여전히 "원래 index 5"를 기준으로 타이밍을 갖고 있다.
- guest는 필터링 후의 index 4로 그 타이밍을 조회하므로, 이후 모든 요소가 한 칸씩 밀린 타이밍으로 애니메이션됐다.

**고친 방식**: 필터링하면서 원래 index를 같이 들고 다니게 바꿨다.

```ts
blocks.flatMap((b, i) => (b.el.isConnected ? [{ ...b, i }] : []))
```

`revealOf()`는 이 `b.i`(measured 순서의 원래 index)를 쓰고, 종료 시점을 계산하는 `morphEndOf()`도 필터링된 배열 길이(`blocks.length`)가 아니라 원래 전체 길이(`measured.length`)를 기준으로 삼도록 바꿨다. 애니메이션이 중간에 몇 개 빠지더라도, 전체 시퀀스가 끝나는 시점 계산이 짧아지지 않게 하기 위해서다.

## 정리

두 레이어(shell/guest)가 배열 index를 공유 키로 쓰는 구조에서는, 한쪽이 그 배열을 필터링하는 순간 index 공간이 깨진다. `filter()`나 조건부 `flatMap()`으로 배열을 줄이면 반드시 새 index가 생기는데, 그 새 index를 외부에서 받은 타이밍·좌표·id 같은 값을 조회하는 키로 재사용하면 안 된다. 필터링 전의 원래 index를 요소마다 같이 들고 다니거나, 필터링 자체를 하지 않고 조건 분기만 두는 쪽이 안전하다.
