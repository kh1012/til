---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "모바일 Pure Push 사이드바 + CSS 아키텍처 전략"
updatedAt: "2026-04-05"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "mobile-responsive"
  - "pure-push-sidebar"
  - "tailwind-v4"
  - "css-custom-variant"
  - "css-custom-utility"
  - "jotai"
  - "fsd-architecture"
  - "ios-safari"

relatedCategories:
  - "css"
  - "react"
  - "tailwindcss"
  - "mobile"
---

# 모바일 Pure Push 사이드바 + CSS 아키텍처 전략

> 데스크톱 레이아웃 zero regression을 보장하면서 모바일 전용 레이아웃을 Clean Architecture로 분리하고, CSS 변수 시스템을 고정/유동(fluid) 이중 구조로 재설계한 경험

## 배경

MAXYS(AI 구조공학 어시스턴트)는 Next.js 16 + Electron 하이브리드 앱으로, 데스크톱 전용 `AppShell` 레이아웃이었다. 모바일(iPhone 17 Pro Max, 440px)에서 접속하면 좌측 사이드바(256px)가 화면의 58%를 점유하여 채팅이 불가능했다. Claude iOS 앱 스타일의 Push 사이드바를 구현하되, 데스크톱에는 일절 영향이 없어야 했다.

## 핵심 내용

### 1. Clean Architecture: MobileAppShell 완전 분리

데스크톱 `AppShell`을 수정하지 않고 `MobileAppShell`을 완전히 별도로 만들어서, `(tabs)/layout.tsx`에서 `isMobileAtom` 기반으로 분기하는 전략을 선택했다.

```tsx
// (tabs)/layout.tsx
if (isMobile) {
  return <MobileAppShell sidebar={...} mobileHeader={...} content={...} />;
}
return <AppShell sidebar={...} content={...} panels={...} />;
```

**장점**: 데스크톱 AppShell에 한 줄도 안 건드려서 regression 위험 제로. 모바일 레이아웃을 독립적으로 발전시킬 수 있다.

**단점**: 파일 수 증가 (7개 신규). 하지만 각 파일이 30~60줄로 150줄 제한을 쉽게 준수.

### 2. Pure Push: translateX + will-change-transform

오버레이 드로어가 아닌 "콘텐츠를 밀어내는" Push 방식:

```
[닫힘] Content 전체화면
[열림] Sidebar(80vw) | Content(밀림, blur+dim)
```

- `MobileSidebar`: `fixed left-0 w-4/5`, `translateX(-full)` ↔ `translateX(0)`
- `MobileContentWrapper`: `translateX(0)` ↔ `translateX(80vw)` (커스텀 유틸리티)
- `MobileOverlay`: 콘텐츠 내부 `absolute`, `bg-white/60` opacity (blur 아님)

`will-change-transform` + `translateX`만 사용하여 layout reflow 없이 60fps 보장.

### 3. CSS 변수 이중 구조: 고정 + Fluid

원래 `--step-*`에 `clamp()`가 적용되어 뷰포트에 따라 폰트가 줄어들었는데, 모바일에서 사이드바 텍스트가 너무 작아지는 문제가 있었다. 이를 **고정/유동 이중 구조**로 해결:

```css
/* 기본: PC 기준 고정값 */
--step-n2: 0.8rem;
--step-n1: 1rem;

/* Fluid: clamp 버전 (필요한 곳에서만) */
--step-fluid-n1: clamp(0.8333rem, 0.7754rem + 0.2896vw, 1rem);
```

```css
/* 사용: weatherGreeting만 fluid 적용 */
@utility text-fluid-n2 {
  font-size: var(--step-fluid-n2);
  @media (max-width: 440px) {
    font-size: clamp(1.3888rem, 1.3204rem + 0.3414vw, 1.6rem); /* 2배 보정 */
  }
}
```

### 4. text-step-up: CSS 변수 캐스케이드로 폰트 일괄 증가

모바일 사이드바 내부의 모든 텍스트를 한 단계 키우기 위해, 컨테이너에서 CSS 변수를 시프트하는 유틸리티를 만들었다:

```css
@utility text-step-up {
  --step-n2: 1rem;      /* 원래 n1 값 */
  --step-n1: 1.25rem;   /* 원래 0 값 */
  --step-0: 1.5625rem;  /* 원래 1 값 */
}
```

```tsx
<MobileSidebar className="text-step-up">
  {/* 내부 모든 text-step-* 클래스가 자동으로 한 단계 커짐 */}
</MobileSidebar>
```

개별 컴포넌트를 수정하지 않고 CSS 변수 캐스케이드로 일괄 처리. 매우 강력한 패턴.

### 5. FSD 레이어 규칙과 충돌 해결

`useCurrentThreadTitle` 훅을 처음에 `shared/lib`에 만들었다가 ESLint `no-restricted-imports` 규칙에 걸렸다 (shared -> entities import 금지). 해결:

- `useCurrentThreadTitle` -> `entities/thread/model/`로 이동
- `MobileHeader` -> `widgets/mobile-header/`로 승격 (entities import 필요)

**교훈**: FSD에서 shared 레이어는 다른 레이어의 atom/store를 읽을 수 없다. 상위 레이어(entities, widgets)에서만 하위(shared)를 import 가능.

### 6. iOS Safari input focus 확대 방지

모바일 Safari에서 input에 focus하면 자동 확대되는 문제. Next.js의 `Viewport` export로 해결:

```tsx
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};
```

### 7. 순차 전환: 사이드바 닫기 -> 페이지 전환

모바일에서 스레드 클릭 시 사이드바가 닫히면서 동시에 페이지가 전환되면 어색하다. `useMobileNavigate` 훅으로 순차 처리:

```tsx
const mobileNavigate = useCallback((path: string) => {
  if (isMobile) {
    setDrawerOpen(false);
    setTimeout(() => router.push(path), 300); // 트랜지션 대기
  } else {
    router.push(path);
  }
}, [isMobile, setDrawerOpen, router]);
```

### 8. 절대 중앙 배치 패턴

flex 3-column에서 좌우 버튼 크기가 다를 때 중앙 요소가 정확히 가운데에 오지 않는 문제. `absolute` 중앙 배치로 해결:

```tsx
<header className="relative flex items-center justify-between">
  <Button>{/* 좌측 */}</Button>
  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
    {/* 정확히 중앙 */}
  </div>
  <Button>{/* 우측 */}</Button>
</header>
```

## 정리

- **Clean Architecture 분리**가 모바일 대응의 핵심. 데스크톱 코드를 건드리지 않으니 regression 걱정이 없다.
- **CSS 변수 캐스케이드** (`text-step-up`)는 컴포넌트 수정 없이 하위 트리 전체의 폰트를 조절하는 강력한 패턴이다.
- **고정/Fluid 이중 구조**로 "기본은 고정, 필요한 곳만 유동"이 모바일 타이포그래피의 정답이었다.
- Tailwind v4의 `@utility` 안에 `@media`를 중첩할 수 있어서 반응형 유틸리티를 깔끔하게 만들 수 있다. 단, `@custom-variant`와 JSX prefix(`mobile:`)를 함께 쓰면 Turbopack 파싱 에러가 발생할 수 있으니 주의.
- FSD에서 레이어 간 import 규칙은 절대적이다. 타협하지 말고 파일 위치를 옮기는 게 정답.
