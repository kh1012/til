---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Next.js App Router 스레드 전환 시 스크롤·Spacer 타이밍 제어"
updatedAt: "2026-04-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "useLayoutEffect"
  - "useRef"
  - "next.js"
  - "app-router"
  - "scroll"
  - "jotai"

relatedCategories:
  - "nextjs"
  - "typescript"
---

# Next.js App Router 스레드 전환 시 스크롤·Spacer 타이밍 제어

> URL 변경만으로 클라이언트 컴포넌트가 재마운트되지 않는 App Router에서, 비동기 상태 전이를 신호로 삼아 DOM 안정 시점을 찾는 방법.

## 배경

채팅 UI에서 사이드바 스레드를 클릭하거나 `/chat/<id>`로 직접 접속할 때 두 가지 증상이 반복됐다.

1. **Spacer가 0이 되지 않고 748px처럼 잔존** — 메시지가 뷰포트 아래로 밀려 보이지 않음.
2. **scrollTop이 "기억"된 상태** — 이전 스레드의 위치가 새 스레드에도 그대로 남음.

처음엔 단순 React state 갱신 문제로 보였는데, 파고 들수록 **App Router의 재마운트 정책 + 비동기 messages 로드 + useLayoutEffect 실행 순서**가 얽힌 타이밍 문제였다.

## 핵심 내용

### 1. `useRef(prop)`의 초기값 함정

`prevThreadIdRef = useRef(threadId)`로 현재 prop 값을 초기값으로 쓰면, **첫 mount에서 `current === threadId`**가 된다. 그 결과 `if (prev === threadId) return`으로 조기 종료되어 원하는 로직이 한 번도 실행되지 않는다.

```ts
// Bad — 첫 mount가 항상 "변화 없음"으로 판정됨
const prevThreadIdRef = useRef(threadId);
useLayoutEffect(() => {
  if (prevThreadIdRef.current === threadId) return;
  // ... 이 블록은 threadId가 "바뀐 후"부터만 실행
}, [threadId]);

// Good — 센티넬 값으로 첫 mount도 "변경"으로 판정
const prevThreadIdRef = useRef<string | null | undefined>(undefined);
useLayoutEffect(() => {
  if (prevThreadIdRef.current === threadId) return;
  prevThreadIdRef.current = threadId;
  // ... 첫 mount + 모든 변경에서 실행됨
}, [threadId]);
```

prop 타입이 `string | null`이면 `undefined`가 자연스러운 센티넬이다.

### 2. `useLayoutEffect` 선언 순서 = 실행 순서

같은 렌더 사이클 안에서 두 prop(`threadId`, `lastUserMessageId`)이 동시에 바뀌는 경우, React는 **선언된 순서대로 effect를 실행**한다. "pending flag를 먼저 세우고, 그 뒤 로직이 flag를 읽어야 한다"는 의존성이 있다면 선언 순서를 맞춰야 한다.

```ts
// threadId 감지가 lastUserMessageId 감지보다 먼저 선언되어야
// 같은 렌더에서 pending=true가 recompute 호출 전에 세워진다.
useLayoutEffect(() => { /* threadId 감지 — pending=true */ }, [threadId]);
useLayoutEffect(() => { /* lastUserMessageId — recompute */ }, [lastUserMessageId]);
```

### 3. App Router dynamic segment는 재마운트하지 않는다

`/chat/[id]`에서 `id`만 바뀌는 이동은 서버 컴포넌트는 재실행되지만 **클라이언트 컴포넌트는 동일 인스턴스로 유지**된다. 즉 `scrollerRef` DOM 요소도 재생성되지 않아 `scrollTop`이 이전 값 그대로 남는다. "기억 현상"의 실체가 이것.

### 4. `scrollTo(scrollHeight)`는 절대 픽셀이다

`el.scrollTo({ top: el.scrollHeight })`는 호출 시점의 `scrollHeight`를 기준으로 **절대 위치로 이동**한다. 이후 DOM이 커져도 스크롤 위치는 재조정되지 않는다. MessageList가 dynamic import로 뒤늦게 렌더되거나 Spacer가 조정되면, 처음 호출한 `scrollTo`는 "중간 위치"에 멈춘 것처럼 보인다.

### 5. 비동기 상태 전이를 타이밍 신호로

해법은 **"DOM이 진짜 안정된 순간"이 언제인지 다른 신호로 알아내는 것**이다. 이 프로젝트에서는 Jotai `threadSwitchingAtom`이 그 역할을 한다.

```ts
// switchThread의 흐름
setThreadSwitching(true);
await repo.getHistory(threadId);
setMessages(newMessages);
await fetch(`/api/threads/${threadId}`);  // 소유권 확인
setThreadSwitching(false);  // ← 이 시점이 "모든 상태가 반영된 안정 시점"
```

`isThreadChanging` prop의 `true → false` 전이를 기준으로 scrollTo를 실행하면, messages가 교체되고 소유권도 확인된 상태에서 시작할 수 있다.

```ts
const pendingInitialScrollRef = useRef(true);
// threadId 변경 시 플래그 세움
useLayoutEffect(() => {
  if (prevThreadIdForScrollRef.current !== threadId) {
    prevThreadIdForScrollRef.current = threadId;
    pendingInitialScrollRef.current = true;
  }
}, [threadId]);

// isThreadChanging=false 상태에서만 실제 scrollTo 루프
useLayoutEffect(() => {
  if (isThreadChanging) return;
  if (!pendingInitialScrollRef.current) return;
  if (messages.length === 0) return;
  // scrollHeight 안정화까지 rAF 루프로 scrollTo 반복
  pendingInitialScrollRef.current = false;
  // ...
}, [isThreadChanging, messages.length, threadId]);
```

### 6. 진단 로그로 수치 확증

타이밍 문제는 "느낌"으로는 원인 파악이 불가능하다. `scrollTop`, `scrollHeight`, `clientHeight`, `attempts`, `stableFrames`를 매 step마다 찍어보면 "바닥 도달"의 기준이 명확해진다.

```
[init-scroll:step] attempts: 1, beforeTop: 696, afterTop: 696, scrollH: 1471, clientH: 775
```

`afterTop === scrollH - clientH`면 바닥. 이 수치가 맞으면 "중앙에 멈춘 것처럼 보이는" 건 UI 레벨이 아니라 **별도의 페이지 스크롤(상위 AppShell overflow)** 등 다른 원인임을 배제할 수 있다.

## 정리

이번 디버깅에서 가장 크게 배운 건 두 가지다.

- **React 훅의 동작은 "선언 순서 + 초기값"이 전부**다. `useRef`의 초기값 하나, effect의 선언 위치 하나가 전혀 다른 결과를 만든다. 타이밍 문제를 추적할 때 이 두 축을 가장 먼저 본다.
- **비동기 상태 머신의 "끝"을 신호로 삼아라**. DOM이 안정화되는 순간은 우리 눈에는 보여도 코드에는 보이지 않는다. 대신 그 순간 직전까지 `true`였다가 `false`가 되는 Jotai atom, Promise의 `finally`, `isPending === false` 같은 **관찰 가능한 전이**가 있다면 그것이 타이밍의 닻이 된다.

또 부산물처럼 얻은 교훈: **진단 로그는 "원인을 해결하는" 것이 아니라 "해결됐음을 증명하는" 데 가장 큰 가치가 있다**. 수치가 맞으면 "잘된다"는 주관 판단을 수치 판단으로 바꿀 수 있다.
