---
draft: true
type: "content"
domain: "frontend"
category: "jotai"
topic: "atomWithStorage hydration 타이밍 경쟁 조건과 해결 패턴"
updatedAt: "2026-04-03"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "jotai"
  - "atomWithStorage"
  - "hydration"
  - "race condition"
  - "SSR"
  - "localStorage"

relatedCategories:
  - "react"
  - "nextjs"
  - "state-management"
---

# Jotai atomWithStorage — Hydration 타이밍 경쟁 조건

> atomWithStorage의 초기값과 localStorage hydrate 사이 타이밍 갭에서 발생하는 race condition과 해결 패턴

## 배경

Client Mode를 `atomWithStorage("max:client-mode", false)`로 관리하는 프로젝트에서, Client Mode ON 상태로 새로고침하면 무한 스피너가 발생하는 버그를 발견했다. 다른 스레드를 클릭했다가 돌아오면 정상 동작.

## 핵심 내용

### 문제 구조

```typescript
// layout-atoms.ts
export const clientModeAtom = atomWithStorage("max:client-mode", false);

// use-thread-manager.ts
const clientMode = useAtomValue(clientModeAtom);
const repo = useMemo(() => createThreadRepository(clientMode), [clientMode]);
```

**타이밍 시퀀스 (새로고침 시):**

```
Render 1: clientModeAtom = false (기본값, hydrate 전)
  → repo = BackendThreadRepository
  → switchThread() → backend.getHistory() → Core API 500 → 빈 결과
  → hasMessages = false → isInitialLoad = true → 스피너 ON

Render 2: clientModeAtom = true (localStorage hydrate 완료)
  → repo = LocalThreadRepository (재생성됨)
  → BUT switchThread useEffect는 이미 실행 완료 → 재실행 안 됨
  → hasMessages 여전히 false → 스피너 계속
```

### 근본 원인

`atomWithStorage`는 **동기적으로 기본값을 반환**하고, localStorage 읽기는 **다음 렌더에서 비동기적으로 hydrate**한다. 이 1-render 갭 동안 기본값(`false`)으로 side effect가 실행되면 되돌릴 수 없다.

### 해결 1: Repository에 fallback 추가

```typescript
async listThreads(params?) {
  if (this.clientMode) return this.local.listThreads(params);
  try {
    return await this.backend.listThreads(params);
  } catch {
    // hydrate 전 backend 실패 → local fallback
    return this.local.listThreads(params);
  }
}
```

backend 호출 실패 시 local로 fallback하면 hydrate 전에도 데이터를 로드할 수 있다.

### 해결 2: 스피너 상태에 "로드 완료" 추적 추가

```typescript
// 기존: 메시지가 비면 영원히 스피너
const isInitialLoad = !!threadId && !hasMessages && !isAtomSwitching;

// 수정: switching true→false 전환을 감지하여 로드 완료 처리
const loadDoneRef = useRef(false);
if (prevSwitchingRef.current && !isAtomSwitching) {
  loadDoneRef.current = true; // 빈 결과여도 로드 완료
}
const isInitialLoad = !!threadId && !hasMessages && !loadDoneRef.current;
```

`switchThread`가 완료되면 (메시지가 비어있어도) 스피너를 해제한다.

### 일반화된 패턴

`atomWithStorage`를 side effect의 조건으로 사용할 때:

1. **기본값으로 실행되는 side effect가 안전한지 확인** — 실패해도 UX가 깨지지 않아야 함
2. **fallback 경로 보장** — 기본값 상태에서 실패해도 복구 가능하게
3. **"완료" 상태를 별도 추적** — 비동기 작업 결과가 빈 값일 수 있으므로 "데이터 없음"과 "아직 로딩 중"을 구분

## 정리

- `atomWithStorage`는 SSR/새로고침 시 1-render hydration gap이 항상 존재한다
- 이 gap 동안 기본값으로 실행되는 side effect는 race condition의 원인이 된다
- "데이터 없음" vs "아직 안 로드됨"을 구분하는 것이 핵심 — boolean 하나(`loadDoneRef`)로 해결 가능
- Zustand의 `persist` 미들웨어나 React Query의 `isLoading`/`isSuccess` 구분도 같은 맥락
