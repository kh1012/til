---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "n8n 기반 워크플로우 실행 엔진 — Clean Architecture + EventBus 패턴"
updatedAt: "2026-04-08"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "workflow engine"
  - "DAG topological sort"
  - "EventBus"
  - "HITL deferred promise"
  - "clean architecture"
  - "strategy pattern"
  - "reactflow"

relatedCategories:
  - "typescript"
  - "react"
  - "design-patterns"
---

# n8n 기반 워크플로우 실행 엔진 — Clean Architecture + EventBus

> Engine Layer(순수 TS)와 React Layer를 EventBus로 분리하면 58개 테스트를 vitest만으로 검증 가능하다.

## 배경

MAX 프론트엔드에 n8n 스타일 캔버스 에디터(26개 모듈)가 구현되어 있었지만, 실행 엔진이 없어서 노드를 배치만 할 수 있었다. PRD에서 도출된 4가지 핵심 질문(실행 엔진, 데이터 흐름, HITL, 직렬화)을 해결하기 위해 Clean Architecture(Option B)를 선택했다.

## 핵심 내용

### 1. Engine Layer는 React에 의존하지 않는다

```
execution/ (Pure TS)          hooks/ (React Bridge)
├── engine.ts    ──events──→  useExecution.ts
├── event-bus.ts              ├── bus.on() → setState
├── dag-resolver.ts           └── start/stop → engine.method()
├── hitl-controller.ts
└── mock-executor.ts
```

Engine → UI: EventBus로 이벤트 발행. UI → Engine: 메서드 직접 호출. 이 분리 덕분에 엔진 코어의 39개 테스트를 jsdom 환경 없이도 실행할 수 있었다.

### 2. DAG 검증은 이중 알고리즘

- **순환 감지**: DFS 3-color marking (white → gray → black, gray→gray = cycle)
- **위상 정렬**: Kahn 알고리즘 (in-degree 0부터 BFS)
- 정렬 결과 길이 !== 노드 수 → 순환 존재로 추가 검증

n8n은 LIFO(DFS) 순서로 실행하지만, MAX는 FIFO(BFS)를 선택했다. 이유: 캔버스에서 좌→우로 배치된 노드가 좌→우 순서로 실행되는 것이 사용자에게 더 직관적.

### 3. HITL은 Deferred Promise가 핵심

```typescript
function createDeferred<T>() {
  let resolve, reject;
  const promise = new Promise<T>((res, rej) => { resolve = res; reject = rej; });
  return { promise, resolve, reject };
}
```

실행 루프에서 `await deferred.promise`로 중지되고, UI에서 `deferred.resolve(response)`를 호출하면 재개된다. 서버 없이 FE-only로 pause/resume을 구현하는 깔끔한 패턴.

### 4. Strategy Pattern으로 실행기 교체 가능

```typescript
type NodeExecutor = {
  execute: (nodeId, nodeType, inputData, signal) => Promise<NodeExecutionData[]>;
};
```

현재는 `createMockExecutor()`(setTimeout + mock data)를 사용하지만, 추후 AI API 연동 시 executor만 교체하면 된다. AbortSignal을 인자로 받아서 중지도 깔끔하게 처리.

### 5. abort 후 상태 관리 함정

`engine.stop()` → `setStatus("idle")` 후, while 루프 밖에서 `setStatus(finalStatus)`가 다시 호출되어 idle이 completed로 덮어씌워지는 버그가 있었다. 해결: `if (this._status !== "idle")` 가드 추가.

### 6. HITL UI shared 추상화 — 래퍼 패턴

기존 도메인 컴포넌트(`HitlConfirmCard`, `MultiChoiceHitlCard`)를 삭제하지 않고, 내부를 shared 컴포넌트 호출로 교체. 기존 import 경로(`@/features/workflow`)가 유지되어 회귀 0%.

## 정리

- **Clean Architecture + EventBus**는 "순수 로직"과 "React UI"를 완전히 분리하는 가장 효과적인 방법이다. 테스트 작성이 극적으로 쉬워진다.
- **Deferred Promise**는 FE-only 환경에서 비동기 중지/재개를 구현하는 핵심 빌딩 블록이다. HITL뿐 아니라 사용자 입력 대기, 승인 플로우 등에 범용 활용 가능.
- **FIFO vs LIFO 실행 순서**는 UX 관점에서 결정해야 한다. 알고리즘적으로는 동일하지만 사용자 체감이 다르다.
- Module 단위 `--scope`로 세션을 나누면 커밋 단위가 깔끔해지고, 중간에 중단해도 이전 모듈은 안전하다.
