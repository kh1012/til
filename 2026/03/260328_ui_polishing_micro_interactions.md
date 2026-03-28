---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "UI 마이크로 인터랙션 폴리싱 — 애니메이션·kbd 스타일·검색 UX·클라이언트 모드 분기"
updatedAt: "2026-03-28"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "framer-motion"
  - "stagger-animation"
  - "ResizeObserver"
  - "kbd-styling"
  - "client-mode"
  - "ConfirmDialog"
  - "Tailwind CSS v4"

relatedCategories:
  - "css"
  - "animation"
  - "ux"
  - "typescript"
---

# UI 마이크로 인터랙션 폴리싱 하루 회고

> 하루 동안 13건의 커밋으로 사이드바, 검색, 퀵 액션, 토스트, 스레드 삭제 등 전반적인 UI 디테일을 개선하며 배운 것들을 정리한다.

## 배경

AI 구조공학 어시스턴트(MAXYS)의 프론트엔드가 기능적으로 동작하지만, 마이크로 인터랙션 수준의 폴리싱이 부족했다. 사이드바 단축키 표시, 검색 다이얼로그 높이 전환, 빈 화면 퀵 액션 등장 효과 등을 하루에 집중적으로 다듬었다.

## 핵심 내용

### 1. framer-motion stagger 애니메이션 패턴

퀵 액션 버튼들이 순차적으로 fade-in + slide-up되는 효과:

```tsx
const containerVariants: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.06, delayChildren: 0.15 },
  },
};

const itemVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1, y: 0,
    transition: { duration: 0.35, ease: [0.25, 0.46, 0.45, 0.94] },
  },
};
```

- `staggerChildren`으로 각 아이템 간 시차를 주고, `delayChildren`으로 전체 시작을 지연
- cubic-bezier ease로 자연스러운 감속 곡선 적용

### 2. ResizeObserver로 컨텐츠 높이 애니메이션

검색 결과 영역의 높이가 부드럽게 전환되어야 했는데, framer-motion의 `layout` prop이 `overflow-y-auto + max-h` 조합에서 동작하지 않았다.

**해결**: `ResizeObserver`로 실제 콘텐츠 높이를 측정하고 `animate={{ height }}`로 명시적 전환:

```tsx
const ro = new ResizeObserver(() => {
  setHeight(Math.min(el.scrollHeight, MAX_H));
});
ro.observe(el);
```

**교훈**: `layout` prop은 만능이 아니다. `overflow` + `max-height` 제약이 있으면 직접 측정이 더 확실하다.

### 3. kbd 스타일링 — Unicode 문자 높이 불일치

`⇧`(U+21E7) 같은 Unicode 화살표 기호는 일반 알파벳보다 글리프가 커서 `kbd` 요소 높이가 들쭉날쭉해진다.

**해결**:
- `⇧` 대신 `"Shift"` 텍스트로 교체
- 각 키를 개별 `<kbd>`로 분리
- `h-5 leading-none inline-flex items-center justify-center`로 고정 높이 확보

### 4. CSS @keyframes wiggle + hover 트리거

```css
@keyframes wiggle {
  0%, 100% { transform: rotate(0deg); }
  20% { transform: rotate(-12deg); }
  40% { transform: rotate(10deg); }
  60% { transform: rotate(-6deg); }
  80% { transform: rotate(4deg); }
}
.animate-wiggle:hover {
  animation: wiggle 0.5s ease-in-out;
}
```

기존 `IconLabelButton`의 `iconHoverWiggle` (CSS transform)과 별개로, 독립 아이콘 버튼용 CSS 애니메이션. `:hover`에서 트리거되어 5단계 감쇠 진동을 만든다.

### 5. 클라이언트 모드 스레드 격리

`clientMode=true`일 때 `CompositeThreadRepository` 대신 `LocalThreadRepository`만 반환하도록 팩토리 분기:

```typescript
export function createThreadRepository(clientMode = false): ThreadRepository {
  if (clientMode) return new LocalThreadRepository();
  return new CompositeThreadRepository();
}
```

서버 없이 프론트엔드만 개발할 때 불필요한 API 호출을 완전히 차단한다.

### 6. 150줄 제한 하에서 컴포넌트 추출 전략

ESLint `max-lines: 150` 규칙 때문에 기능 추가 시 자주 파일이 넘친다. 대응 패턴:
- **커스텀 훅 추출**: `useSearchItems` — 필터링 로직 분리
- **하위 컴포넌트 추출**: `SearchResultList` — 렌더링 + 높이 애니메이션 분리
- **상태 통합**: 두 개의 `ConfirmDialog`를 `deleteTarget: "all" | threadId | null` 하나로 통합

## 정리

- **`layout` prop 한계**: overflow 컨테이너에서는 `ResizeObserver` + 명시적 height 애니메이션이 더 신뢰할 수 있다.
- **Unicode 글리프 크기 주의**: 키보드 단축키 UI에서 특수 기호는 높이 불일치를 유발할 수 있으므로 텍스트 대체 + 고정 높이가 안전하다.
- **150줄 규칙의 장점**: 강제로 추출하다 보면 자연스럽게 관심사 분리가 이루어진다. 처음엔 귀찮지만 결과적으로 더 깔끔한 구조가 된다.
- **하루 13커밋 회고**: 기능 구현보다 폴리싱에 시간이 더 걸리지만, 사용자 경험 차이는 여기서 나온다.
