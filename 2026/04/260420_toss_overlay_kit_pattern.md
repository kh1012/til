---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Toss overlay-kit 스타일 명령형 useOverlay 훅"
updatedAt: "2026-04-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react"
  - "jotai"
  - "overlay"
  - "dialog"
  - "custom-hook"
  - "typescript"

relatedCategories:
  - "jotai"
  - "typescript"
  - "design-system"
---

# Toss overlay-kit 스타일 명령형 useOverlay 훅

> `overlay.open(({ isOpen, close }) => <Dialog />)` 한 줄로 모달을 여는 패턴을 30줄대 커스텀 훅으로 구현한 기록.

## 배경

모달을 띄울 때마다 `useState(false)` + 여는 handler + 닫는 handler를 세트로 만들고, 거기에 Dialog 컴포넌트까지 JSX에 배치하는 게 정석이었다. 그런데 한 페이지에 모달 3~4개가 공존하면 이 boilerplate가 빠르게 누적된다. 특히 릴리즈 노트 "더보기" 같은 일회성 모달은 state를 컴포넌트에 붙들어두는 게 과잉이다.

Toss의 [overlay-kit](https://overlay-kit.slash.page/)은 이 문제를 `overlay.open()` 명령형 API로 정리했다. 소비자는 **render 함수**만 전달하고, `isOpen`과 `close`는 컨트롤러가 주입한다.

```tsx
// Before — 컴포넌트에 state가 상주
const [isOpen, setIsOpen] = useState(false);
<Button onClick={() => setIsOpen(true)}>열기</Button>
<ReleaseNotesDialog isOpen={isOpen} onClose={() => setIsOpen(false)} />

// After — state 제거, 한 줄
const overlay = useOverlay();
<Button onClick={() => {
  overlay.open(({ isOpen, close }) => (
    <ReleaseNotesDialog isOpen={isOpen} onCloseAction={close} />
  ));
}}>열기</Button>
```

외부 라이브러리를 추가하지 않고 Jotai atom + 기존 Dialog 컴포넌트만으로 같은 패턴을 구현할 수 있는지 확인해보고 싶었다.

## 핵심 내용

### 1. 상태 모델 — atom 1개가 전부다

stack을 배열로 들고 있다. 각 노드는 `id`, `render` 함수, `isOpen` 플래그만 갖는다.

```ts
// shared/model/overlay-atoms.ts
import { atom } from "jotai";
import type { ReactNode } from "react";

export type OverlayControls = {
  isOpen: boolean;
  close: () => void;
};

export type OverlayRender = (controls: OverlayControls) => ReactNode;

export type OverlayNode = {
  id: string;
  render: OverlayRender;
  isOpen: boolean;
};

export const overlayStackAtom = atom<OverlayNode[]>([]);
```

### 2. 훅 — `useSetAtom`으로 구독 없이 쓰기만

`useAtom` 대신 `useSetAtom`을 쓰면 훅 호출부는 리렌더 트리거를 구독하지 않는다. 호출부가 overlay.open을 부르는 Button 같은 컴포넌트라 값을 읽을 필요가 없기 때문.

```ts
// shared/lib/use-overlay.ts
import { useMemo } from "react";
import { useSetAtom } from "jotai";
import { overlayStackAtom, type OverlayRender } from "@/shared/model/overlay-atoms";

const EXIT_DURATION_MS = 300;

export function useOverlay() {
  const setStack = useSetAtom(overlayStackAtom);
  return useMemo(() => ({
    open: (render: OverlayRender) => {
      const id = crypto.randomUUID();
      setStack((prev) => [...prev, { id, render, isOpen: true }]);
      const close = () => {
        setStack((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isOpen: false } : n)),
        );
        setTimeout(() => {
          setStack((prev) => prev.filter((n) => n.id !== id));
        }, EXIT_DURATION_MS);
      };
      return { id, close };
    },
    closeAll: () => setStack([]),
  }), [setStack]);
}
```

포인트 3가지:
- **`crypto.randomUUID()`**: Node 19+, 브라우저, Next.js "use client"에서 폴리필 없이 동작.
- **2단계 close**: 즉시 `isOpen=false`로 바꿔 exit animation 시작 → 300ms 후 stack에서 remove. DialogOverlay의 exit duration과 맞추면 자연스럽다.
- **useMemo**: 컨트롤러 참조 안정화. `setStack`은 Jotai가 안정적으로 주는 함수라 deps는 한 개면 충분.

### 3. Renderer — stack 순회만

OverlayRenderer는 atom을 읽고 각 노드의 render 함수를 호출한다. Portal/애니메이션/ESC는 render 함수가 반환하는 Dialog(여기선 기존 DialogOverlay)에 위임한다.

```tsx
// shared/ui/overlay/OverlayRenderer.tsx
"use client";
import { Fragment, useMemo } from "react";
import { useAtomValue, useSetAtom } from "jotai";
import { overlayStackAtom } from "@/shared/model/overlay-atoms";

const EXIT_DURATION_MS = 300;

export function OverlayRenderer() {
  const stack = useAtomValue(overlayStackAtom);
  const setStack = useSetAtom(overlayStackAtom);

  const closeById = useMemo(() => (id: string) => {
    setStack((prev) =>
      prev.map((n) => (n.id === id ? { ...n, isOpen: false } : n)),
    );
    setTimeout(() => {
      setStack((prev) => prev.filter((n) => n.id !== id));
    }, EXIT_DURATION_MS);
  }, [setStack]);

  return (
    <>
      {stack.map((node) => (
        <Fragment key={node.id}>
          {node.render({
            isOpen: node.isOpen,
            close: () => closeById(node.id),
          })}
        </Fragment>
      ))}
    </>
  );
}
```

### 4. Provider는 단순 wrapper

Context API는 필요 없다. JotaiProvider 내부에 OverlayRenderer 하나만 마운트하면 끝.

```tsx
// shared/ui/overlay/OverlayProvider.tsx
"use client";
import type { ReactNode } from "react";
import { OverlayRenderer } from "./OverlayRenderer";

export function OverlayProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <OverlayRenderer />
    </>
  );
}
```

### 5. TDD — 훅은 반환 타입부터 고정

훅을 만들 때 제일 먼저 한 일은 **테스트에 반환 shape을 박아두는 것**이었다. 구현 중에 시그니처가 바뀌면 리팩토링으로 GREEN이 깨진다. 그래서 8개 it 블록을 먼저 썼다.

```tsx
// shared/lib/__tests__/use-overlay.test.tsx
import { renderHook, act } from "@testing-library/react";
import { Provider, createStore } from "jotai";
import { overlayStackAtom } from "@/shared/model/overlay-atoms";

function makeWrapper() {
  const store = createStore();
  const Wrapper = ({ children }) => (
    <Provider store={store}>{children}</Provider>
  );
  return { store, Wrapper };
}

it("open() 호출 시 stack에 노드가 push되고 isOpen=true이다", () => {
  const { store, Wrapper } = makeWrapper();
  const { result } = renderHook(() => useOverlay(), { wrapper: Wrapper });
  act(() => { result.current.open(() => null); });
  expect(store.get(overlayStackAtom)).toHaveLength(1);
  expect(store.get(overlayStackAtom)[0].isOpen).toBe(true);
});

it("close() 후 exit 지연 시간이 지나면 stack에서 제거된다", () => {
  vi.useFakeTimers();
  // ... open + close
  act(() => { vi.advanceTimersByTime(500); });
  expect(store.get(overlayStackAtom)).toHaveLength(0);
});
```

`vi.useFakeTimers()`로 setTimeout을 결정적으로 검증하는 게 핵심. 300ms 기다리는 테스트는 flaky하다.

### 6. 실제 사용

릴리즈 노트 "더보기" 버튼을 이 패턴으로 교체했다.

```tsx
// shared/ui/feedback/ReleaseNotesInline.tsx
const overlay = useOverlay();

const handleShowMore = () => {
  overlay.open(({ isOpen, close }) => (
    <ReleaseNotesDialog
      isOpen={isOpen}
      onCloseAction={close}
      entries={entries}
    />
  ));
};
```

`expanded` state가 사라졌다. "더보기 state"가 어느 컴포넌트 것이냐는 고민도 사라졌다.

## 정리

- **라이브러리 없이도 충분**: atom 1개 + 훅 1개 + renderer 1개로 약 90줄. overlay-kit 의존성을 추가할 만큼 크지 않다.
- **기존 자산 재발견의 중요성**: DialogOverlay가 이미 portal + AnimatePresence + ESC + backdrop blur를 전부 가지고 있었다. OverlayRenderer는 stack을 순회하기만 하면 된다는 사실을 PM 단계에서 인벤토리 조사로 먼저 확인했더니 구현이 극적으로 단순해졌다.
- **render prop이 state를 소멸시킨다**: `isOpen` state를 보유자에서 컨트롤러로 옮기면, 소비자는 "언제 여나"만 결정하고 "어떻게 닫히나"는 신경 안 쓴다. 이게 overlay-kit의 핵심 아이디어인 것 같다.
- **TDD로 시그니처 먼저**: 훅은 반환 shape이 API 계약이다. 테스트가 그 계약을 먼저 박아두면 구현이 흔들려도 GREEN이 계약을 지킨다. 8개 it 블록이 8번의 리팩토링을 통과해줬다.
- **stack 2+ 시나리오는 유예**: ESC가 최상위 모달만 닫게 하려면 DialogOverlay에 `closeOnEsc` prop 추가가 필요한데, 현 사용 사례는 depth 1이라 Nice-to-have로 남겼다. 요구가 생기는 날 옵셔널 prop 1개 추가하면 끝.

결국 "작은 추상화가 큰 DX 개선"이라는 교훈은 너무 자주 듣지만, 실제로 해보고 나서야 체감된다. `useState(false)` 세 쌍을 한 줄로 줄인 건 코드량보다도 **"이 state는 어디에 있어야 하지?"** 라는 고민 자체를 없앴다는 게 가장 큰 수확이다.
