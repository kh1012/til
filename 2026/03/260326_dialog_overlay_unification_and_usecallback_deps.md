---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "DialogOverlay 통합과 useCallback 의존성 불안정 버그"
updatedAt: "2026-03-26"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react"
  - "useCallback"
  - "dialog"
  - "component-composition"
  - "referential-stability"
  - "framer-motion"

relatedCategories:
  - "typescript"
  - "nextjs"
  - "css"
---

# DialogOverlay 통합과 useCallback 의존성 불안정 버그

> 동일한 오버레이 패턴을 공통 컴포넌트로 추출하고, 커스텀 훅이 매 렌더마다 새 객체를 반환하여 발생한 스켈레톤 깜빡임 버그를 수정한 경험.

## 배경

프로젝트에 `ConfirmDialog`(전체 삭제 확인)와 `FilePreviewModal`(파일 첨부 미리보기)이 각각 portal, backdrop, ESC 키 처리, 스크롤 잠금, framer-motion 애니메이션을 독립적으로 구현하고 있었다. 동일 패턴의 중복이 명확했고, 헤더 바 스타일도 일관성이 없었다.

동시에, 스레드 목록에서 아이템을 클릭할 때마다 스켈레톤 UI가 깜빡이는 버그가 있었다. 이미 데이터를 불러온 상태인데 매번 로딩 상태가 재진입하는 이상 현상이었다.

## 핵심 내용

### 1. DialogOverlay 공통 컴포넌트 추출

두 다이얼로그가 공유하는 로직을 `shared/ui/DialogOverlay.tsx`로 추출:

- `createPortal` + `AnimatePresence` + `motion.div` backdrop/panel
- ESC 키 리스너 (document level)
- 오버레이 클릭 닫기 (`e.target === e.currentTarget`)
- `document.body.style.overflow` 잠금/복원
- 공통 헤더 바: 타이틀 + `headerActions` slot + X 닫기 버튼

```tsx
<DialogOverlay
  open={open}
  onClose={close}
  title="파일명.pdf"
  headerActions={<DownloadButton />}
  backdrop="heavy"        // "default" | "heavy"
  panelClassName="w-full max-w-sm"
>
  {children}
</DialogOverlay>
```

`ConfirmDialog`는 title/description/buttons, `FilePreviewModal`은 title/download+viewer로 각각 children만 달라진다.

### 2. FilePreviewModal 작은 콘텐츠 스타일 수정

기존 문제: 모달 패널에 `maxWidth: 90vw`, `min-h-60`만 있고 min-width가 없어서, FileInfoCard 같은 작은 콘텐츠가 좁은 박스 안에 어색하게 배치됨.

수정: 콘텐츠 타입별 패널 크기 분기:

```tsx
panelClassName={cn(
  isSmallContent
    ? "w-full max-w-sm"                                        // 작은 콘텐츠: 고정 폭
    : "max-w-[var(--modal-max-size)] max-h-[var(--modal-max-height)]",  // 큰 콘텐츠: 뷰포트 비례
)}
```

### 3. useCallback 의존성 불안정 버그 (핵심)

**증상**: 스레드 아이템 클릭 → 스켈레톤 깜빡임

**원인 추적**:

```
ThreadItem 클릭
→ threadCommandAtom: { type: "switch" }
→ CoworkPanel에서 switchThread() 호출
→ currentThreadIdAtom 변경
→ ThreadSidePanel 리렌더
→ useThreadManager() 내부의 useThreadPagination(repo)가 새 객체 반환
→ loadThreadList의 useCallback deps에 pagination 객체 포함
→ loadThreadList 참조 변경
→ ThreadSidePanel의 useEffect([expanded, loadThreadList]) 재실행
→ setThreadListLoading(true) → 스켈레톤!
```

**핵심 문제**: `useThreadPagination`이 매 렌더마다 `{ loadMoreThreads, resetThreadSkip, ... }` 새 객체를 반환. 이 객체를 통째로 `useCallback`의 deps에 넣으면 매번 무효화.

**수정**: 객체 대신 개별 함수/상수로 분해:

```tsx
// Before
const pagination = useThreadPagination(repo);
const loadThreadList = useCallback(async () => {
  // ...pagination.THREAD_PAGE_SIZE, pagination.resetThreadSkip...
}, [repo, ..., pagination]); // pagination이 매번 새 참조

// After
const { resetThreadSkip, THREAD_PAGE_SIZE, ... } = useThreadPagination(repo);
const loadThreadList = useCallback(async () => {
  // ...THREAD_PAGE_SIZE, resetThreadSkip...
}, [repo, ..., resetThreadSkip, THREAD_PAGE_SIZE]); // 각각 안정적 참조
```

`resetThreadSkip`은 `useCallback(fn, [])`이라 참조가 안정적이고, `THREAD_PAGE_SIZE`는 상수. 분해만으로 의존성 체인이 안정화됨.

## 정리

- **커스텀 훅에서 객체를 반환할 때는 참조 안정성을 항상 고려해야 한다.** `useMemo`로 감싸거나, 소비 측에서 필요한 값만 분해하여 사용.
- 객체 하나를 deps에 넣으면 그 안의 모든 프로퍼티가 동일해도 매번 `useCallback`이 무효화된다. "의존성에 객체를 넣지 말 것"이 실전 규칙.
- 공통 UI 패턴(portal + backdrop + animation + keyboard)은 조기에 추출해두면 이후 다이얼로그 추가 시 children만 작성하면 된다.
- `useEffect` → `useCallback` → 커스텀 훅 반환값 순으로 참조 체인을 따라가면 불필요한 재실행 원인을 찾을 수 있다.
