---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "React URL-State 동기화 시 race condition 패턴과 해결"
updatedAt: "2026-04-13"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react"
  - "useCallback"
  - "stale closure"
  - "race condition"
  - "url state sync"
  - "useRef"
  - "next.js"
  - "searchParams"

relatedCategories:
  - "nextjs"
  - "typescript"
---

# React URL-State 동기화 시 race condition 패턴과 해결

> URL query string과 React state를 양방향 동기화할 때 발생하는 stale closure, 중복 호출, 무한 루프 문제를 useRef 패턴으로 해결한다.

## 배경

Next.js App Router에서 `?step=converting&mode=readonly&dialog=recovery` 같은 query string으로 페이지 상태를 관리하면서, 브라우저 히스토리(뒤로가기)와도 동기화해야 하는 요구사항이 있었다. `useState` + `router.push/replace` + `useEffect` 조합에서 여러 race condition이 발생했다.

## 핵심 내용

### 1. stale closure로 인한 URL 덮어쓰기

`setReadOnly(true)` → `setStep('review')`를 연속 호출하면, 각 함수가 `buildUrl`을 호출할 때 이전 state 값을 클로저로 참조한다.

```typescript
// 문제: setReadOnly가 step='converting'을 URL에 넣고,
// setStep이 readOnly=false를 URL에 넣음
const setStep = useCallback((s) => {
  _setStep(s);
  router.push(buildUrl({ step: s })); // readOnly는 이전 값
}, [buildUrl]); // buildUrl이 readOnly에 의존

const setReadOnly = useCallback((v) => {
  _setReadOnly(v);
  router.replace(buildUrl({ mode: v ? 'readonly' : null })); // step은 이전 값
}, [buildUrl]);
```

**해결: useRef로 최신 값 보장**

```typescript
const stepRef = useRef(step);
const readOnlyRef = useRef(readOnly);
stepRef.current = step;
readOnlyRef.current = readOnly;

const setStep = useCallback((s) => {
  _setStep(s);
  stepRef.current = s;
  router.push(buildUrl(s, readOnlyRef.current));
}, [router, buildUrl]);

const setReadOnly = useCallback((v, skipUrl?) => {
  _setReadOnly(v);
  readOnlyRef.current = v;
  if (!skipUrl) router.replace(buildUrl(stepRef.current, v));
}, [router, buildUrl]);
```

### 2. 비동기 작업 중 URL sync effect 충돌

dialog 상태(`pendingCompleted` 등)를 null로 설정한 후 비동기 작업(API 호출)을 수행하면, sync effect가 URL에서 `dialog` 파라미터를 제거하고, 그로 인해 step이 `converting`으로 리셋된다.

```typescript
// 문제: pending을 먼저 해제하면 dialog sync가 URL을 덮어씀
const handleReconvert = async () => {
  setPendingCompleted(null); // dialog sync effect 트리거
  setPendingFolder('');
  await clearCompleted(folder); // 비동기 작업
  // ... setStep('review') 하지만 이미 URL이 step=converting으로 변경됨
};
```

**해결: pending 해제를 비동기 작업 완료 후로 이동**

```typescript
const handleReconvert = async () => {
  await clearCompleted(folder);
  await acquireLock(folder, nickname);
  setStep('review'); // 먼저 step 설정
  setPendingCompleted(null); // 그 다음 pending 해제
  setPendingFolder('');
};
```

### 3. 콜백 함수의 매 렌더 재생성으로 인한 debounce 무효화

`useEffect` deps에 매 렌더 새로 생성되는 함수 참조가 포함되면, effect가 매번 재실행되어 debounce timeout이 리셋된다.

```typescript
// 문제: onSessionSaved가 매 렌더 새 참조
useEffect(() => {
  timerRef.current = setTimeout(async () => {
    await saveSession(...);
    onSessionSaved?.(); // 이 함수가 deps에 있으면 매 렌더 timeout 리셋
  }, 500);
}, [items, onSessionSaved]); // onSessionSaved가 매번 변경 → 500ms 절대 완료 안 됨
```

**해결: ref로 콜백 안정화**

```typescript
const onSessionSavedRef = useRef(onSessionSaved);
onSessionSavedRef.current = onSessionSaved;

useEffect(() => {
  timerRef.current = setTimeout(async () => {
    await saveSession(...);
    onSessionSavedRef.current?.(); // ref는 deps에 불필요
  }, 500);
}, [items]); // onSessionSaved 제거
```

### 4. useCallback deps에 의한 이중 호출

`pendingFolder`가 deps에 있는 `useCallback`에서 `setPendingFolder('')`를 호출하면, 리렌더 시 새 클로저가 생성되어 함수가 다시 호출될 수 있다.

```typescript
// 문제: 첫 호출에서 setPendingFolder('') → 리렌더 → 새 클로저에서 folder=''로 두 번째 호출
const handleAction = useCallback(async () => {
  const folder = pendingFolder;
  setPendingFolder('');
  await someAsyncWork(folder); // folder='' 두 번째 실행
}, [pendingFolder]);
```

**해결: early return 가드**

```typescript
const handleAction = useCallback(async () => {
  if (!pendingFolder) return; // 가드
  const folder = pendingFolder;
  // ...
}, [pendingFolder]);
```

## 정리

URL과 React state의 양방향 동기화는 단순해 보이지만, 비동기 작업과 결합되면 예측하기 어려운 race condition이 발생한다. 핵심 패턴:

- **useRef로 최신 값 참조**: `useCallback` 클로저의 stale 문제 해결
- **skipUrl 옵션**: 연속 호출 시 중간 URL 변경 방지
- **pending 해제 타이밍**: 비동기 작업 완료 후로 지연
- **콜백 ref 패턴**: deps에서 불안정 참조 제거
- **early return 가드**: 이중 호출 방지
