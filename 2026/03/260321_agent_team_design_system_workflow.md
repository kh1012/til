---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "Agent Team 기반 디자인 시스템 워크플로우 — /cmd-dgn에서 R7 추상화까지"
updatedAt: "2026-03-21"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "claude-code"
  - "agent-team"
  - "design-system"
  - "design-tokens"
  - "oklch"
  - "tailwind-v4"
  - "fsd"
  - "accessibility"
  - "component-abstraction"

relatedCategories:
  - "react"
  - "css"
  - "ux"
  - "ai-tooling"
---

# Agent Team 기반 디자인 시스템 워크플로우

> Claude Code의 Agent Team 패턴(/cmd-dgn, /cmd-plan, /cmd-dev)으로 디자인 리서치 → 계획 → 구현 → QA를 파이프라인화한 하루 기록.

## 배경

Chat 페이지의 좌측 사이드바, 상단 헤더, 탭 영역의 디자인과 색상톤이 일관적이지 않다는 피드백에서 출발. 단순 CSS 수정이 아닌 "디자인 시스템 관점의 체계적 접근"이 필요했다.

기존에 /cmd-anal(리서치), /cmd-plan(계획), /cmd-dev(구현) 3단계 워크플로우가 있었지만, **디자인 전용 리서치 커맨드**가 없어 새로 만들었다.

## 핵심 내용

### 1. /cmd-dgn 커맨드 설계

3명의 디자이너 Agent가 서로 다른 관점에서 병렬 조사:
- **디자이너 A (UX/사용성)**: Nielsen 휴리스틱, 접근성, 사용자 플로우
- **디자이너 B (비주얼/브랜드)**: 색상 토큰, 타이포, 간격, 레퍼런스 리서치
- **디자이너 C (기술/구현)**: 기존 컴포넌트 감사, FSD 구조, 성능 영향

핵심 차별점: `/cmd-pm`의 R1~R13 감사 규칙을 내재화하여, 제안 단계에서 토큰 위반을 원천 차단.

### 2. Vivid Focus 디자인 (안 2) 구현

ThreadSidebar에 적용한 핵심 변경:
- 탭 인디케이터: `bg-muted` → `bg-brand` (브랜드 강조)
- 활성 탭 텍스트: `text-foreground/70` → `text-primary-foreground`
- 사이드바 배경: gradient → `bg-muted` (토큰 정합)
- 모든 불투명도 수정자(`/70`, `/60`) 제거 → 시맨틱 토큰으로 대체
- ARIA: `role="tablist"`, `role="tab"`, `aria-selected`, `aria-expanded` 일괄 추가

InsightPanel에도 동일 톤 적용 (Symmetric Muted):
- 좌(`bg-muted`) + 중앙(`bg-background`) + 우(`bg-muted`) = 중앙 부각 "채널" 구조
- HistoryCard: `bg-primary/5` → `bg-surface` (muted 위에 흰 카드)
- 활성 Interaction: `bg-brand/10` → `bg-surface border-l-2 border-brand`

### 3. R7 순수 HTML 노드 전수 조사 + 추상화

22건 위반 발견 → 17건 해소, 5건 면제(디버그 패널 3 + 카드형 1 + hidden input 1)

**신규 컴포넌트 `ListItemButton`**:
```tsx
interface ListItemButtonProps {
  isActive?: boolean;
  activeStyle?: "brand-left" | "brand-fill" | "none";
  shape?: ControlShape;
}
```
- `brand-left`: `bg-surface border-l-2 border-brand shadow-sm` (ThreadItem, InteractionsSection)
- `brand-fill`: `bg-brand-subtle font-semibold text-brand` (FileTreeNode 파일)
- `none`: className으로 직접 제어

**토큰 확장 `INPUT_VARIANT_STYLES.ghost`**:
```tsx
ghost: "border-0 bg-transparent text-foreground outline-none"
```
→ MessageInput, LibraryChatPanel의 `<textarea>` → `<Textarea variant="ghost" autoResize />`

### 4. 교훈: Worktree Agent의 아키텍처 드리프트

worktree 격리 모드로 3명의 시니어 개발자를 병렬 실행했을 때, **Senior A가 기존 props 기반 아키텍처를 Jotai atom 기반으로 완전 재작성**하는 문제 발생. CSS 클래스 치환만 해야 하는데 전체 구조를 바꿈.

대응: 이후 작업에서는 CSS/스타일 변경처럼 범위가 명확한 경우 **직접 구현 + QA 검증** 방식으로 전환. worktree는 로직 변경이 크고 파일 간 충돌이 우려될 때만 사용.

### 5. oklch 토큰 체계의 장점

프로젝트의 색상 체계가 oklch 기반이라 라이트/다크 모드 전환이 자연스러움:
- `bg-muted`: Light oklch(0.96), Dark oklch(0.20) — 양 모드에서 "한 톤 낮은 배경" 역할 유지
- `bg-surface`: Light white, Dark oklch(0.18) — 양 모드에서 "떠있는 카드" 역할 유지
- `bg-brand`: Light oklch(0.62 0.19 250), Dark oklch(0.70 0.17 250) — 채도+밝기가 모드별로 조정

## 정리

- **Agent Team 워크플로우**가 디자인 시스템 작업에 효과적. 특히 /cmd-dgn의 3관점 병렬 리서치로 UX+비주얼+기술 트레이드오프를 한 번에 파악 가능.
- **토큰 내재화**(/cmd-pm R1~R13)가 핵심. 제안 단계에서 arbitrary value를 걸러내면 구현 시 토큰 위반이 원천 차단됨.
- **ListItemButton 같은 도메인 프리미티브**가 기존 Button보다 적합한 경우가 많음. Button은 `justify-center`가 기본이라 리스트 아이템에 쓰면 매번 오버라이드 필요.
- worktree agent는 **"무엇을 변경하지 말 것"**을 명확히 제한해야 함. 그렇지 않으면 아키텍처 드리프트 발생.
