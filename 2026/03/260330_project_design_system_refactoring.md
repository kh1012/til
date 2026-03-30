---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "프로젝트 페이지 디자인 시스템 리팩토링 — 토큰 확장과 컴포넌트 재사용"
updatedAt: "2026-03-30"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-tokens"
  - "tailwind-css"
  - "component-reuse"
  - "fsd-architecture"
  - "i18n"
  - "popover-menu"
  - "flex-wrap-responsive"

relatedCategories:
  - "react"
  - "nextjs"
  - "tailwind"
  - "css"
---

# 프로젝트 페이지 디자인 시스템 리팩토링

> 디자인 토큰 확장, 공유 컴포넌트 분리, 반응형 레이아웃을 통해 프로젝트 페이지의 시각적/기능적 완성도를 높인 과정.

## 배경

프로젝트 목록(/projects)과 상세(/project/[id]) 페이지의 디자인이 미완성 상태였다. Input/Textarea의 variant가 Button 대비 빈약했고, 다이얼로그 스타일이 제각각이었으며, 전역 상태 초기화 누락, 네이밍 불일치(cowork-panel) 등 기술 부채가 쌓여 있었다.

## 핵심 내용

### 1. 디자인 토큰 계층 확장

Button의 variant가 10개인 반면 Input/Textarea는 3개(default, error, ghost)뿐이었다. 실제 사용 패턴을 분석하여 `surface`, `muted`, `plain`, `success`를 추가했다. 핵심은 **Button은 배경색 기반, Input은 테두리 기반**이라는 설계 철학 차이를 유지하면서 variant 이름을 통일한 것.

```typescript
// Button: 배경색 기반
surface: "bg-surface text-surface-foreground hover:bg-surface-hover"

// Input: 테두리 기반 (같은 이름, 다른 구현)
surface: "border border-border/40 bg-surface text-surface-foreground ... focus:border-border"
```

Textarea에는 `size` prop이 없었다. Input의 `INPUT_SIZE_STYLES`에서 높이(`h-*`)를 제외하고 padding+font만 뽑은 `TEXTAREA_SIZE_STYLES`를 별도로 만들었다. Textarea는 `rows`로 높이를 결정하므로.

`label` prop도 Input/Textarea 양쪽에 추가. 사이즈별로 한 step 낮은 폰트를 매핑하는 `LABEL_SIZE_STYLES` 토큰을 만들어 자동 적용.

### 2. 다이얼로그 스타일 통일 패턴

프로젝트 내 5개 DialogOverlay 사용처의 스타일이 제각각이었다. 하나의 패턴으로 통일:

```
form.flex.flex-col.gap-4.w-96
  Input  (label, variant="surface", size="lg")
  Textarea (label, variant="surface", size="lg")
  div.flex.justify-end.gap-2
    Button (variant="ghost", shape="soft", size="lg")  // 취소
    Button (type="submit", variant="dark", shape="soft", size="lg")  // 확인
```

`<div>` 대신 `<form>`으로 감싸서 Input에서 Enter → form submit → 확인 버튼 자동 실행. Textarea는 Enter가 줄바꿈이므로 충돌 없음.

### 3. PopoverMenu의 button 중첩 문제 해결

PopoverMenu의 trigger 래퍼가 `div[role="button"]`이었고, trigger에서 `<Button>`을 넘기면 `<button>` 안에 `<button>`이 되어 HTML 규약 위반(R17). 래퍼에서 `role="button"`, `tabIndex`, 스타일 토큰을 제거하고 순수 이벤트 위임 컨테이너로 변경.

또한 외부 `div.relative`가 `display: block`이라 flex 부모에서 1px 정렬 차이 발생. `flex items-center`를 추가하여 해결.

### 4. 반응형 flex-wrap 레이아웃

프로젝트 상세 페이지의 main + aside 레이아웃:

```css
--project-sidebar-w: 400px;  /* aside 고정 */
--project-content-gap: 48px; /* gap 고정 */
```

`flex-wrap`을 적용하고 main에 `basis-(--project-main-max-w)`를 설정. 컨테이너가 main basis + gap + aside(= 1120px) 미만이면 aside가 자동으로 아래로 내려감.

### 5. 전역 상태 초기화 누락

`ClosePanelsOnMount`가 패널 열림/닫힘만 리셋하고 `activeInteractionAtom`, `interactionContentListAtom` 등은 그대로 남겨두는 문제. 새 채팅이나 프로젝트 진입 시 이전 세션의 인터랙션 상태가 잔류. 마운트 시 모두 초기화하도록 확장.

### 6. ThreadSidePanel 직접 호출 패턴

사이드바의 삭제/이름변경이 `threadCommandAtom`으로 간접 처리되었는데, 이를 소비하는 `CoworkPanel`이 프로젝트 페이지에서는 마운트되지 않아 커맨드가 무시됨. `ThreadSidePanel`에서 `threadManager`를 직접 호출하도록 변경하여 어떤 페이지에서든 동작하게 함.

### 7. Arbitrary Value 금지 규칙 대응

Tailwind arbitrary value(`[...]`) 금지 eslint 규칙이 있어서 `transition-[background-color,border-color,transform]` 사용 불가. `globals.css`에 `.transition-card` 유틸리티 클래스를 정의하여 해결.

### 8. cowork-panel → chat-panel 리네이밍

`cp -R` → 내부 파일명/import sed 치환 → 외부 참조 수정 → 기존 디렉토리 삭제. git이 rename을 자동 감지하여 히스토리 보존.

## 정리

- **토큰 설계 시 철학 차이를 명시적으로 문서화**하면 나중에 variant 추가할 때 혼란이 줄어든다 (Button: 배경 기반, Input: 테두리 기반).
- **다이얼로그를 `<form>`으로 감싸는 패턴**은 접근성과 UX 모두 개선. Enter 키 동작이 자연스러워진다.
- **전역 상태 초기화는 한 곳에서 관리**해야 한다. `ClosePanelsOnMount` 같은 게이트 컴포넌트가 적합.
- **간접 커맨드 패턴(atom 기반)은 소비자가 항상 마운트되어 있다는 전제**가 필요. 그렇지 않으면 직접 호출이 안전하다.
- 94개 파일을 한 커밋으로 묶었지만, 디자인 토큰 / 컴포넌트 재사용 / 리네이밍으로 나눴으면 리뷰가 더 편했을 것.
