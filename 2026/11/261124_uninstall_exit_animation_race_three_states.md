---
type: "content"
domain: "frontend"
category: "animation"
topic: "설치 제거 때 즐겨찾기 줄 · 카드 · 설치됨 수가 나가기 애니메이션보다 먼저 바뀌던 레이스 세 가지를 gone 콜백 하나로 고침"
updatedAt: "2026-11-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "exit-animation"
  - "race-condition"
  - "react-state-sync"
  - "animation-timing"
  - "useSyncExternalStore"

relatedCategories:
  - "react"
---

# 설치 제거 때 즐겨찾기 줄 · 카드 · 설치됨 수가 나가기 애니메이션보다 먼저 바뀌던 레이스 세 가지를 gone 콜백 하나로 고침

> Plugin Builder에서 설치 플러그인을 제거하면 카드가 0.9배로 줄며 옅어지는 나가기 애니메이션(`.is-leaving`, 240ms)이 돈다. 즐겨찾기 사이드바 줄 · 설치됨 격자 카드 · SNB 설치됨 수, 이 세 곳이 각자 서버 응답(`lab.installed` 갱신)에 바로 반응해 애니메이션이 끝나기 전에 먼저 사라지거나 줄었다. 세 군데 모두 "제거 막대가 끝났다"는 이벤트가 아니라 "자료가 바뀌었다"는 이벤트에 반응한 것이 원인이었다. 11-24 dev 앱(포트 9520)에서 실제 설치 제거를 해 보며 잡았다.

## 배경

설치됨 플러그인도 즐겨찾기를 할 수 있어야 한다는 요청(11-24)으로 `installed-fav.tsx`에 `withLabFavs`를 추가했다. 설치 제거 자체는 이미 있던 기능으로, server에 제거를 걸고 진행 막대가 차면(`installLanded`) 카드가 `leaveAfterBar`(`installed-exit.ts`)를 통해 나가기 애니메이션을 돈 뒤 목록에서 빠진다. 이 세 기능(즐겨찾기 줄, 카드 제거, SNB 수)이 전부 같은 "설치 제거" 흐름에 걸려 있는데도, 각각 독립적으로 `lab.installed` 배열을 보고 자기 상태를 다시 계산했다.

## 핵심 내용

**레이스 1 — 즐겨찾기 줄이 카드보다 먼저 빠짐**: `withLabFavs`는 사이드바 즐겨찾기 줄을 `d.lab.installed`에서 그 키를 찾아 풀었다. server가 제거 완료 응답을 보내 `installed[]`에서 그 유닛이 빠지면, 카드는 아직 나가기 애니메이션 중인데 즐겨찾기 줄은 이미 사라졌다. 고친 방법은 `useLabFavs`가 `leaving`(진행 막대가 안 끝났거나 `useGoing()`으로 나가는 중인 유닛 집합)을 받아, `rowOf()`가 `installed[]`에 없어도 `leaving.has(key)`면 마지막으로 본 줄(`seen` 맵)을 그대로 돌려주게 한 것 — 데이터가 아니라 애니메이션 단계를 기준으로 줄 생존을 결정한다.

**레이스 2 — 카드가 한 번 다시 보이는 20ms 깜빡임**: `leaveAfterBar`가 `exit` 단계로 240ms를 기다리는 동안, 목록을 다시 받아오는 요청이 먼저 끝나 그 유닛이 빠진 배열로 다시 그려지면 `.is-leaving` 클래스 없는 프레임이 한 번 끼었다. 고친 방법은 목록에서 빼는 동작을 `leaveAfterBar(units, { gone })`의 `gone` 콜백 안으로 옮긴 것 — 애니메이션이 다 끝나는 시점(`phase(units, null)` 바로 앞)과 목록 제거를 같은 틱에 묶어, 애니메이션 없이 보이는 프레임 자체가 생기지 않게 했다.

**레이스 3 — 앱을 켤 때마다 설치됨 수가 0에서 굴러 올라감**: `RollCount`는 수가 늘면 굴림 애니메이션을 돈다. 그런데 `lab.installed`가 아직 없을 때(`ready === false`)는 표시 수가 0이고, 처음 데이터가 오는 순간 `ready`가 `false → true`로 바뀌며 수도 0에서 실제 값으로 늘어 "늘어난 수"로 잡혀 매번 굴렀다. 고친 방법은 `rollReady(was, ready)`가 "이전에도 이미 `ready`였던 적이 있어야" 굴림을 허용하게 한 것 — 첫 수신은 무조건 `set`(움직임 없음)으로 처리한다.

## 정리

세 버그 모두 같은 모양이다: UI가 비동기 서버 상태(`lab.installed` 변화)를 직접 구독해 그 값이 바뀌는 즉시 자기 모습을 맞췄는데, 그 값은 애니메이션이 끝나는 시점과 타이밍이 다르다. 애니메이션이 걸린 화면 요소는 "데이터가 바뀜"과 "화면에서 사라져도 되는 때"를 같은 이벤트로 두면 안 된다. `useGoing()`/`leaving` 집합처럼 "지금 애니메이션 중인 키"를 따로 들고, 실제 제거·감소는 그 애니메이션의 완료 콜백(`gone`)에 묶어야 셋 다 같은 시점에 맞춰진다.
