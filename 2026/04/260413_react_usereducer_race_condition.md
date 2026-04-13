---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "여러 useState의 race condition을 useReducer로 해결"
updatedAt: "2026-04-13"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "useReducer"
  - "race condition"
  - "useState"
  - "atomic state transition"
  - "cancellation token"
  - "flickering"

relatedCategories:
  - "typescript"
  - "nextjs"
---

# React에서 여러 useState가 만드는 깜빡임을 useReducer로 해결하기

> 별도 useState로 관리하는 step, readOnly, initialized가 전환 시 중간 렌더를 만들어 UI가 깜빡이는 문제를 useReducer 원자적 전환으로 해결했다.

## 배경

이미지→LaTeX 변환 도구의 폴더 페이지에서 `step`(converting/review/saving), `readOnly`, `initialized` 3개 상태를 각각 `useState`로 관리하고 있었다. "결과 보기" 같은 전환 시 `setReadOnly(true)` → `setStep('review')`를 순차 호출하는데, React가 이를 2회 렌더하면서 중간에 `readOnly=true, step='converting'` 상태가 순간 노출되어 ConvertingProgress 컴포넌트가 깜빡이는 문제가 발생했다.

병렬 에이전트 4개로 분석한 결과, 이 프로젝트에서 총 12개의 race condition / 타이밍 이슈를 발견했다.

## 핵심 내용

### 문제: 분리된 setState의 중간 렌더

```tsx
// 2개의 별도 setState → 중간 렌더 발생
onViewOnly={() => {
  setReadOnly(true);   // 렌더 1: readOnly=true, step='converting' ← 깜빡임!
  setStep('review');   // 렌더 2: readOnly=true, step='review'
}}
```

React 18의 automatic batching이 있지만, 비동기 콜백이나 이벤트 핸들러 체인에서는 보장되지 않는 경우가 있다.

### 해결 1: useReducer로 원자적 전환

```tsx
type FolderPageAction =
  | { type: 'SET_STEP'; step: FolderStep }
  | { type: 'SET_READONLY'; readOnly: boolean }
  | { type: 'ENTER_REVIEW'; readOnly?: boolean }
  | { type: 'ENTER_CONVERTING' }
  | { type: 'INIT_COMPLETE'; step?: FolderStep; readOnly?: boolean }

function folderPageReducer(state: FolderPageState, action: FolderPageAction): FolderPageState {
  switch (action.type) {
    case 'ENTER_REVIEW':
      return { ...state, step: 'review', readOnly: action.readOnly ?? state.readOnly }
    case 'ENTER_CONVERTING':
      return { ...state, step: 'converting', readOnly: false }
    // ...
  }
}

// 1회 dispatch로 step + readOnly 동시 변경 → 중간 렌더 없음
dispatch({ type: 'ENTER_REVIEW', readOnly: true })
```

### 해결 2: 비동기 작업의 cancellation token

폴더 전환 중 이전 요청의 응답이 뒤늦게 도착하면 잘못된 데이터가 로드되는 문제.

```tsx
const reqIdRef = useRef(0);

const handleCompletedView = async () => {
  const id = ++reqIdRef.current;  // 새 요청 ID 발급
  dispatch({ type: 'ENTER_REVIEW', readOnly: true });

  const session = await loadSession(folder);
  if (id !== reqIdRef.current) return;  // stale 응답 무시

  setItems(session.items);
}
```

### 해결 3: 자동저장/수동저장 경쟁 방지

debounce 자동저장(500ms)과 사용자 수동저장이 동시에 API를 호출하는 문제.

```tsx
const savingRef = useRef(false);

// 자동 저장 타이머 내
if (savingRef.current) return;  // 수동 저장 중이면 스킵
savingRef.current = true;
try { await saveSession(...); } finally { savingRef.current = false; }

// 수동 저장 전
cancelPendingSave();  // 대기 중인 debounce 취소
```

### URL-State 동기화도 단방향으로

기존에는 state → URL push → urlStep 변경 → useEffect → state 업데이트의 순환 구조였다. useReducer 도입 후 State → URL 단방향으로 정리했다.

```tsx
// State → URL 단방향 동기화
useEffect(() => {
  const url = buildUrl(step, readOnly);
  if (url !== currentUrl) router.replace(url, { scroll: false });
}, [step, readOnly]);
```

## 정리

- 관련된 상태 3개 이상이 동시에 전환되어야 하면 `useReducer`가 `useState` 여러 개보다 안전하다.
- 비동기 작업이 끼어드는 상태 전환에서는 cancellation token(reqIdRef 패턴)이 필수다.
- debounce 자동저장과 수동저장이 공존할 때는 mutex(savingRef) 또는 cancel 메커니즘이 필요하다.
- 병렬 에이전트로 코드 분석하면 혼자서는 놓치기 쉬운 edge case를 체계적으로 찾을 수 있다.
