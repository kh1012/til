---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Framer Motion AnimatePresence + createPortal 조합과 글래스모피즘 모달 패턴"
updatedAt: "2026-03-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "framer-motion"
  - "AnimatePresence"
  - "createPortal"
  - "glassmorphism"
  - "backdrop-filter"
  - "accessibility"

relatedCategories:
  - "css"
  - "nextjs"
  - "accessibility"
---

# Framer Motion AnimatePresence + createPortal 조합과 글래스모피즘 모달 패턴

> AnimatePresence는 React 가상 DOM 트리 기준으로 동작하므로, createPortal 경계를 넘어도 exit 애니메이션을 정상 추적한다.

## 배경

파일 첨부 프리뷰 모달에 "Frosted Glass" vivid 디자인을 적용하면서, 기존 `createPortal` 기반 모달에 Framer Motion `AnimatePresence`를 결합해야 했다. QA 과정에서 "Portal 내부 컴포넌트는 AnimatePresence가 exit를 감지하지 못할 수 있다"는 우려가 제기되어 이 부분을 검증했다.

## 핵심 내용

### 1. AnimatePresence + createPortal은 정상 동작한다

```tsx
// 부모 컴포넌트 (UserFileCards)
<AnimatePresence>
  {selectedFile && (
    <FilePreviewModal key="file-preview-modal" ... />
  )}
</AnimatePresence>

// 자식 컴포넌트 (FilePreviewModal) — 내부에서 Portal 사용
export function FilePreviewModal({ filePart, onClose }) {
  return createPortal(
    <motion.div variants={backdropVariants} initial="hidden" animate="visible" exit="exit">
      ...
    </motion.div>,
    document.body
  );
}
```

**이유**: `AnimatePresence`는 **React의 가상 DOM 트리** 기준으로 자식의 mount/unmount를 감지한다. `createPortal`은 **실제 DOM 렌더링 위치**만 변경할 뿐, React 컴포넌트 트리에서는 여전히 `AnimatePresence`의 직계 자식이다. 따라서 `selectedFile`이 null이 되면 AnimatePresence가 unmount를 감지하고, `exit` variant를 재생한 후 DOM에서 제거한다.

### 2. 이중 Portal 제거 패턴

기존에 부모(`UserFileCards`)에서 `createPortal`로 감싸고, 자식(`FilePreviewModal`) 내부에서도 다시 `createPortal`을 호출하는 이중 Portal이 있었다. 기능상 문제는 없지만, AnimatePresence 도입 시 부모 쪽 Portal을 제거하고 자식 내부의 Portal만 유지하는 것이 깔끔하다.

### 3. 글래스모피즘 모달 구현 공식

```
백드랍: bg-black/60 + backdrop-blur-xl
헤더:   bg-surface/30 + backdrop-blur-xl + border-b border-border/20
카드:   bg-white/40 + backdrop-blur-md + shadow-card (라이트)
        bg-white/[0.08] + backdrop-blur-md (다크)
```

프로젝트에 이미 `backdrop-blur`를 사용하는 컴포넌트(헤더, AppToaster)가 있었으므로, "새로운 디자인 개념 도입"이 아니라 "기존 디자인 언어의 확장"으로 자연스럽게 적용할 수 있었다.

### 4. motion.div variants 패턴 (ease-claude 커브)

```typescript
const contentVariants: Variants = {
  hidden: { opacity: 0, scale: 0.92, y: 20 },
  visible: {
    opacity: 1, scale: 1, y: 0,
    transition: { duration: 0.3, ease: [0.165, 0.85, 0.45, 1] }, // ease-claude
  },
  exit: {
    opacity: 0, scale: 0.95, y: 10,
    transition: { duration: 0.15 }, // 퇴장은 빠르게
  },
};
```

진입은 0.3s로 여유있게, 퇴장은 0.15s로 빠르게 처리하는 것이 체감 품질에 큰 차이를 만든다.

### 5. 모달 접근성 체크리스트

```tsx
<motion.div
  role="dialog"
  aria-modal="true"
  aria-label={filename || "File preview"}
>
```

- `role="dialog"` + `aria-modal="true"`: 스크린 리더가 모달로 인식
- body scroll lock: `useEffect`로 `document.body.style.overflow = "hidden"` 토글
- ESC 키 + 백드랍 클릭 닫기 유지
- 버튼에 `aria-label` 명시 (아이콘만 있는 버튼)

## 정리

- **AnimatePresence + Portal은 안전하다** — React 가상 DOM 기준 동작이므로 Portal 경계와 무관하게 exit 애니메이션이 작동한다. 이 사실을 알면 "Portal을 제거해야 하나?" 고민 없이 기존 Portal 구조를 유지하면서 애니메이션만 추가할 수 있다.
- **글래스모피즘은 기존 토큰만으로 충분하다** — `backdrop-blur`, `shadow-card/lg`, `duration-fast`, `ease-claude` 등 이미 정의된 토큰을 조합하면 새 토큰 없이 vivid 효과를 구현할 수 있다.
- **"vivid but not loud"** — 채팅 UI에서 첨부파일은 보조 요소이므로, 과한 글로우나 FLIP 애니메이션보다 절제된 글래스 + scale/fade 트랜지션이 적절하다.
