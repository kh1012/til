---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "팝오버를 모달처럼 — backdrop 패턴과 Dialog 공존 전략"
updatedAt: "2026-04-09"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "popover"
  - "modal"
  - "backdrop"
  - "useClickOutside"
  - "ESC key"
  - "z-index"

relatedCategories:
  - "css"
  - "ux"
  - "accessibility"
---

# 팝오버를 모달처럼 — backdrop 패턴과 Dialog 공존 전략

> useClickOutside 훅 대신 투명 backdrop을 깔면 팝오버가 모달처럼 동작하면서 Dialog와도 자연스럽게 공존한다.

## 배경

PlusMenu 팝오버에서 Settings 아이콘을 클릭하면 Dialog가 열리는 구조였는데, 두 가지 문제가 있었다:

1. Dialog가 portal로 렌더링되어 `useClickOutside`가 "바깥 클릭"으로 감지 → 팝오버가 닫힘
2. 팝오버가 열린 상태에서 뒤쪽 UI 요소를 조작할 수 있음 (모달성 부재)

## 핵심 내용

### 1. useClickOutside의 한계

`useClickOutside`는 `ref.contains(event.target)`으로 판단한다. Dialog가 portal(`document.body` 하위)로 마운트되면 팝오버의 containerRef 바깥이므로 무조건 닫힌다.

```tsx
// 기존: Dialog 열리면 팝오버가 닫히는 문제
useClickOutside(containerRef, close, isOpen);
```

### 2. 투명 backdrop으로 전환

`useClickOutside`를 제거하고, 팝오버가 열릴 때 `fixed inset-0` 투명 레이어를 깔면:

- backdrop 클릭 = 팝오버 닫기 (기존 outside click 역할)
- backdrop이 뒤쪽 UI 조작을 차단 (모달성 확보)
- Dialog는 backdrop보다 높은 z-index에서 독립적으로 동작

```tsx
{isOpen && (
  <>
    <div className="fixed inset-0 z-40" onClick={close} />
    <div className="absolute bottom-full z-50">
      {/* 팝오버 내용 */}
    </div>
  </>
)}
```

### 3. Dialog 공존을 위한 suspended 패턴

Dialog가 열려있는 동안 ESC 키가 팝오버를 닫지 않도록 `suspended` 플래그를 둔다:

```tsx
function usePlusMenuState(suspended = false) {
  useEffect(() => {
    if (!isOpen || suspended) return;
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsOpen(false);
      }
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, suspended]);
}

// 사용처
const dialogOpen = webSearchModalOpen || kdsModalOpen;
const { isOpen, close, toggle } = usePlusMenuState(dialogOpen);
```

흐름: 팝오버 열림 → 설정 클릭 → Dialog 열림(suspended=true) → Dialog의 ESC는 Dialog만 닫음 → suspended 해제 → 팝오버의 ESC 다시 활성화

### 4. z-index 레이어 설계

```
z-40  backdrop (투명, 클릭 차단)
z-50  팝오버 패널
z-50+ Dialog (portal, 자체 overlay 포함)
```

## 정리

- `useClickOutside`는 단독 팝오버에선 편하지만, portal 기반 Dialog와 공존할 때 깨지기 쉽다
- 투명 backdrop 한 장이 outside-click 감지와 모달성을 동시에 해결한다
- Dialog와 팝오버가 겹칠 때는 `suspended` 플래그로 이벤트 우선순위를 제어하는 게 깔끔하다
- 이 패턴은 Radix UI의 `<Popover.Overlay>`나 Headless UI의 접근법과 동일한 원리다
