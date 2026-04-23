---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "스크롤 정책에서 metrics polling vs user-intent 채널 분리"
updatedAt: "2026-04-23"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react"
  - "scroll"
  - "useeffect"
  - "scroll-anchoring"
  - "bottom-follow"

relatedCategories:
  - "javascript"
  - "browser"
---

# 스크롤 정책에서 metrics polling vs user-intent 채널 분리

> 같은 동작이라도 어느 신호 채널을 듣느냐에 따라 정확도와 회귀 위험이 갈린다. viewport 변동을 polling하던 spacer 감소 로직을 user-intent emit으로 옮기면서 "채널 자체를 바꾸는 것이 곧 정의를 바로잡는 일"임을 배웠다.

## 배경

채팅 화면에 `Spacer`가 있다. 새 user 메시지를 보내면 그 메시지를 viewport 상단에 앵커링하기 위해 Spacer가 큰 값으로 부풀어 오르고, 응답 스트리밍이 흘러 들어오면서 콘텐츠 증가량만큼만 줄어드는 1:1 보존 채널이다.

그런데 사용자가 `ChatScrollIndicator`를 클릭해 bottom-follow를 켠 상태에서 새 프롬프트를 보내면, 응답이 한 글자도 안 들어왔는데 Spacer가 1px씩 점진적으로 깎여 0이 되는 버그가 있었다. 콘텐츠 증가가 0인데 Spacer는 줄어든다 — 정의 자체가 위반되는 상황.

## 핵심 내용

### 진단 — 디버그 계측 먼저

수정에 손대기 전에 **디버그 로그부터 부었다**. tick 단위 델타 측정, post-apply rAF로 commit 후 잔차(residual) 측정, viewport bottom 변동량 추적 등 5종 로그를 추가하고 실제 사용자 세션을 반복 재현했다. 그 결과 세 가지 원인이 수치적으로 드러났다.

1. `progressive-shrink` effect가 `metrics.viewportBottom` 1px 미세 감소를 감지하면 그만큼 Spacer를 깎음
2. anchor-formula의 monotonic guard와 `progressive-shrink`의 단조 감소 정책이 같은 ms에 충돌
3. `bottom-follow:grow-scrollTo`가 매 ResizeObserver tick마다 `scrollTo(scrollHeight, instant)`를 발사 → scrollTop 점프 → 1번을 자가 트리거

핵심은 (1)이다. browser scroll-anchoring이 만드는 sub-pixel scrollTop 보정, follow의 자체 scrollTo, spacer rAF batch commit 사이의 미세 변동을 모두 "사용자가 위로 스크롤했다"로 오인하고 있었다.

### 잘못된 채널을 듣고 있었다

`useEffect([metrics, cmd], () => { ... })` 패턴은 React 사람이라면 자연스럽게 떠올린다. metrics가 변하면 effect가 돈다. 그런데 metrics는 **모든 변동의 합**이다 — 사용자 의도, 시스템 동작, 브라우저 보정이 다 한 채널로 들어온다. 정책 효과는 그중 한 가지(사용자 의도)에만 반응하고 싶은데, 채널이 합쳐진 상태에서는 분기를 후처리로 만들 수밖에 없다.

ScrollController에는 이미 `subscribeUserIntent("scroll-up")`이라는 별도 채널이 있었다. wheel/touch/keydown(ArrowUp, PageUp, Home)을 캡처해 emit하는 구조로, `bottom-follow`의 cancel 로직이 이미 사용 중이었다. progressive-shrink만 metrics polling을 고집하고 있었던 셈.

### 수정 — 채널 자체를 옮긴다

```ts
// Before — metrics 폴링 (모든 변동에 반응)
useEffect(() => {
  if (!metrics) return;
  const viewportBottom = metrics.scrollTop + metrics.clientHeight;
  const delta = prevVB - viewportBottom;
  if (delta > 0) cmd.setSpacerHeight(spacer - delta);
}, [metrics, cmd]);

// After — user-intent 채널 (명시적 의도만)
useEffect(() => {
  if (!ctx) return;
  const unsub = ctx.controller.subscribeUserIntent((intent) => {
    if (intent !== "scroll-up") return;
    const live = cmd.measureNow();
    if (!live) return;
    const delta = (lastIntentScrollTopRef.current ?? live.scrollTop) - live.scrollTop;
    lastIntentScrollTopRef.current = live.scrollTop;
    if (delta <= 0) return;
    cmd.setSpacerHeight(Math.max(0, spacerRef.current - delta));
  });
  return unsub;
}, [ctx, cmd]);
```

deps는 `[metrics, cmd]` → `[ctx, cmd]`. metrics 의존성이 사라지면서 polling effect도 사라진다. 채널을 옮기는 것 자체가 단일 책임 회복이다.

### 부수적 패치 — bottom-follow의 self-trigger 끊기

원인 (3)은 follow가 `cmd.scrollTo(scrollHeight, "instant")`를 발사한 직후 `prevScrollHeightRef`를 broadcast 시점의 `metrics.scrollHeight`로 갱신하는 게 문제였다. spacer rAF batch가 같은 frame 후반에 commit되면 다음 broadcast의 scrollHeight가 더 커져서 `grew=true`로 다시 인식, 또 scrollTo 발사 → 자가진동.

`cmd.scrollTo(...)` 직후 `cmd.measureNow()`로 라이브 scrollHeight를 재측정해 `prevScrollHeightRef`에 저장하면 다음 tick에서는 `grew=false`가 된다. 5줄 변경이지만 자가진동이 끊긴다.

### 검증

단위 테스트는 두 hook 각각에 신규 케이스를 추가했다. 핵심 케이스는 `"intent 없이 metrics만 변동(viewportBottom 감소)해도 spacer는 변하지 않는다"` — 이게 본 fix의 본질을 직접 검증한다. 회귀 시나리오 4종(일반 스트리밍/HITL/thread switch/mount 직후)은 수동 QA 매트릭스로 정리.

## 정리

이 버그는 결국 "어느 신호를 들어야 하는가"의 문제였다. metrics를 듣고 있던 정책을 user-intent로 옮기는 한 줄짜리 결정이 코드의 단일 책임도 회복시키고 회귀도 막았다.

세 가지 교훈:

1. **신호 채널 자체를 의심하라.** `useEffect(deps)`로 polling하는 정책이 미세한 노이즈에 흔들린다면, deps를 정교화하기 전에 "내가 지금 잘못된 채널을 듣고 있는 건 아닌가"를 물어야 한다. 이미 의도 채널(intent emit, event subscription)이 있다면 그쪽이 정답일 가능성이 높다.

2. **수정 전에 계측하라.** 디버그 로그 5종을 먼저 깔아두고 수치 잔차로 원인을 좁힌 게 컸다. "어쩐지 spacer가 줄어든다" 가설로 시작했으면 다른 곳을 만지다 회귀를 만들었을 것이다. residual ≈ 0이 깨지는 지점을 측정으로 잡는 게 정공법.

3. **자가진동 패턴을 의심하라.** 컴포넌트가 자기가 발사한 명령의 결과를 다시 입력으로 받아 또 명령을 발사하는 구조는 잠재 버그다. follow가 scrollTo를 쏘고 그 결과 broadcast가 또 follow를 트리거하는 식의 self-trigger 루프는 baseline 갱신 시점을 한 박자 미루는 것만으로 끊을 수 있다.

작업 시간 대비 진단의 비중이 70%, 수정은 30%였다. 그게 정상이다 — 잘 진단된 버그는 수정이 짧다.
