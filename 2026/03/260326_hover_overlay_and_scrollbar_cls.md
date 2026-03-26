---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "범용 hover-overlay 토큰과 스크롤바 CLS 방지"
updatedAt: "2026-03-26"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-token"
  - "hover-overlay"
  - "oklch"
  - "CLS"
  - "scrollbar"
  - "tailwind-css-v4"

relatedCategories:
  - "design-system"
  - "ux"
---

# 범용 hover-overlay 토큰과 스크롤바 CLS 방지

> 배경별 hover 색상을 각각 정의하는 대신 반투명 오버레이 한 장으로 통일하고, overflow 토글 대신 thumb 투명도로 스크롤바 CLS를 제거한 기록.

## 배경

프로젝트의 디자인 토큰이 레이어별로 잘 정리되어 있었지만 두 가지 불편함이 있었다.

**hover 색상 문제**: `--ground-hover`, `--surface-hover`, `--muted-hover` 등 배경마다 hover 절대값을 별도 정의해야 했다. 새 배경(예: user-message 버블)이 추가될 때마다 대응하는 hover 변수가 필요했고, 빠지면 hover 효과를 줄 수 없었다.

**스크롤바 CLS 문제**: 사이드바 채팅 목록이 `overflow-y-hidden hover:overflow-y-auto` 패턴을 사용해서, 마우스 호버 시 스크롤바(6~8px)가 나타나며 콘텐츠를 좌측으로 밀어내는 레이아웃 시프트가 발생했다.

## 핵심 내용

### 1. hover-overlay: 범용 반투명 오버레이 토큰

어떤 배경 위에든 깔면 "한 단계 위" 효과를 내는 반투명 색상을 하나 정의했다.

```css
/* Light */
--hover-overlay: oklch(0.50 0.03 250 / 0.06);

/* Dark */
--hover-overlay: oklch(0.70 0.03 250 / 0.08);
```

설계 포인트:
- **hue 250** (파란끼 회색) — 프로젝트 전체 색상 시스템의 기본 hue와 동일
- **낮은 chroma** (0.03) — 배경색을 덮지 않고 톤만 살짝 올림
- **낮은 alpha** (6~8%) — 어떤 배경 위에서든 자연스러운 한 단계 차이
- 다크모드에서 alpha를 살짝 올린 이유: 어두운 배경에서는 같은 투명도가 덜 보이기 때문

적용 사례 — user-message 버블:
```tsx
// Before: 파란 배경 + 흰 글씨 (전용 토큰 필요)
"bg-user-message text-user-message-foreground"

// After: 현재 배경에 오버레이 + 기본 글씨 (범용)
"bg-hover-overlay text-foreground"
```

기존 `*-hover` 변수들은 유지하되, 새 곳에서는 `bg-hover-overlay`를 우선 사용하는 방식으로 점진 적용.

### 2. 스크롤바 CLS 제거: overflow 토글 → thumb 투명도

**Before** — overflow 토글 방식:
```tsx
// 호버 시 overflow가 바뀌면서 스크롤바 공간이 갑자기 생김 → CLS
className="overflow-y-hidden hover:overflow-y-auto custom-scrollbar"
```

**After** — 항상 auto + thumb만 호버 시 표시:
```css
.custom-scrollbar {
  scrollbar-width: thin;
  scrollbar-color: transparent transparent;  /* 평소: thumb 투명 */
}
.custom-scrollbar:hover {
  scrollbar-color: var(--scrollbar-thumb) transparent;  /* 호버: thumb 표시 */
}

/* Webkit */
.custom-scrollbar::-webkit-scrollbar-thumb {
  background: transparent;  /* 평소: 투명 */
}
.custom-scrollbar:hover::-webkit-scrollbar-thumb {
  background: var(--scrollbar-thumb);  /* 호버: 표시 */
}
```

핵심 원리:
- `overflow-y: auto`를 항상 유지 → 스크롤바 **공간**은 항상 확보됨
- thumb의 **색상**만 투명↔불투명으로 전환
- 스크롤이 없으면 thumb 자체가 없으므로 시각적 차이 없음
- 22개 사용처에 클래스명 변경 없이 자동 적용됨

## 정리

- 반투명 오버레이는 "배경을 모르는 상태에서도 hover를 표현"할 수 있는 유일한 방법이다. 절대값 hover 토큰을 매번 만드는 것보다 확장성이 좋다.
- 스크롤바 CLS는 `overflow` 속성을 토글하는 한 피할 수 없다. overflow는 고정하고 시각적 요소(thumb 색상)만 제어하는 게 정답.
- 두 사례 모두 "눈에 보이는 것만 바꾸고 레이아웃은 건드리지 않는다"는 동일한 원칙을 따른다.
