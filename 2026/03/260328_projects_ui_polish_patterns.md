---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "Projects UI 폴리싱 — 디자인 시스템 일관성 패턴"
updatedAt: "2026-03-28"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-system"
  - "tailwind-css"
  - "semantic-tokens"
  - "bg-surface"
  - "component-reuse"

relatedCategories:
  - "react"
  - "ui-ux"
---

# Projects UI 폴리싱 — 디자인 시스템 일관성 패턴

> 새 기능의 UI가 기존 디자인 시스템과 이질적으로 보일 때, 기존 패턴을 기준 삼아 통일하는 실전 가이드

## 배경

Projects 기능을 구현했더니 기존 UI와 색상/여백/모달 사이즈가 전부 불일치했다. 새 컴포넌트를 만들면서 기존 패턴을 참고하지 않고 임의로 스타일을 지정한 결과, 앱 전체에서 이질적으로 튀는 UI가 됐다.

## 핵심 내용

### 1. 레이어별 배경색 구분 — background vs surface

```
background (가장 바깥) → surface (카드/섹션) → surface-hover (인터랙션)
```

- 페이지 전체 배경: `bg-background`
- 카드/섹션 영역: `bg-surface` + `border border-border/40` + `rounded-lg`
- hover 상태: `hover:bg-surface-hover`

**실수**: `hover:bg-muted-hover`를 쓰면 surface 위에 muted가 올라가서 색감이 뒤틀린다. 내부 영역에서는 반드시 `surface-hover`를 써야 시각적 계층이 유지된다.

### 2. 기존 컴포넌트에서 패턴 추출하는 방법

새 UI를 만들기 전에 반드시 기존 유사 컴포넌트의 스타일을 조사:

```
ThreadItem → 리스트 항목 패턴
  px-2xs py-3xs, text-step-n2, hover:bg-ground-hover

MessageInput → 입력 영역 패턴
  rounded-xl, border-surface-floating-border

DialogOverlay → 모달 패턴
  panelClassName으로 사이즈 제어
```

**도구**: grep으로 `className=` 패턴 수집 → 비교표 작성 → 불일치 항목 수정

### 3. 모달 사이즈/여백 통일

프로젝트에서 4개의 모달이 각각 다른 사이즈와 여백을 사용하고 있었다:

```
Before: max-w-xl, max-w 미지정, p-m gap-s (fluid)
After:  전부 max-w-lg, p-4 gap-3 (고정)
```

**교훈**: 모달/팝오버 같은 오버레이 UI에는 fluid spacing(`p-m`, `gap-s`)을 쓰면 뷰포트에 따라 과도하게 커진다. 고정값(`p-4`, `gap-3`)이 적절하다.

### 4. 페이지 전환 시 패널 닫기

프로젝트 진입 시 기존 패널(insightPanel, interactionPanel)이 열린 상태로 남아있었다. 해결:

```typescript
// ClosePanelsOnMount — 마운트 시 패널 닫기 + fade-in
export function ClosePanelsOnMount({ children }) {
  const needsWait = insightOpen || interactionOpen;
  setInsight(false);
  setInteraction(false);
  // 패널 전환 300ms 대기 후 opacity 0→1
}
```

**핵심**: 에러가 발생해도 패널이 닫히도록 page 레벨에서 처리. 컴포넌트 내부 useEffect에 의존하면 렌더 에러 시 실행 안 됨.

### 5. 사이드바는 단순하게

초기에 사이드바에 프로젝트 하위 목록을 넣고, project 모드 전환까지 구현했지만 결국 다 제거했다:

```
Before: ProjectSection (114줄) — starred/unstarred 목록 + sidebarViewAtom 전환
After:  ProjectSection (37줄) — SidebarButton 하나만 → 클릭 시 랜딩페이지로 이동
```

**교훈**: 랜딩 페이지가 있으면 사이드바에 같은 정보를 중복할 필요 없다. 진입점 하나면 충분하다.

## 정리

- **새 기능 UI를 만들 때**: 먼저 기존 유사 컴포넌트의 className을 grep으로 수집하고, 같은 패턴을 적용해야 한다
- **bg-surface 계층**: background → surface → surface-hover 순서로 깊이를 표현. muted와 섞지 않기
- **모달은 고정 spacing**: fluid 토큰은 페이지 레이아웃 전용, 오버레이는 고정값
- **side effect(패널 닫기)는 page 레벨에서**: 컴포넌트 렌더 에러에 영향받지 않는 위치에 배치
- **중복 제거**: 사이드바와 랜딩페이지가 같은 정보를 보여주면 사이드바를 줄이기
