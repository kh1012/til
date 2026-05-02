---
draft: false
type: "retrospective"
domain: "frontend"
category: "ai-assisted-development"
topic: "2026-03-26 일일 회고 — Orchestrator 병렬 UI 폴리싱 + 무한 스크롤"
updatedAt: "2026-03-26"

satisfaction:
  score: 4
  reason: "7개 세션 병렬 완주 + LHCI 75→87 + 무한 스크롤 2종 구현. 하루 밀도가 높았다."

keywords:
  - "orchestrator-mode"
  - "infinite-scroll"
  - "design-token"
  - "useCallback"
  - "performance"

relatedCategories:
  - "react"
  - "css"
  - "performance"
---

# 2026-03-26 일일 회고

> Orchestrator Mode로 7개 세션 병렬 UI 개선, 무한 스크롤 2종 구현, 디자인 토큰 정비까지 — 하루의 기록.

## 오늘 한 일 (TIL 5건)

| # | 주제 | 핵심 한 줄 |
|---|------|-----------|
| 1 | [채팅 버블 가로폭 + 런타임 디버깅](260326_chat_bubble_width_and_runtime_debugging.md) | 유저/어시스턴트 버블은 별도 레이아웃 전략이 필요하다 |
| 2 | [Orchestrator 병렬 UI 폴리싱](260326_claude_orchestrator_parallel_ui_polish.md) | tmux 4-pane으로 7세션 병렬 실행, LHCI 75→87 달성 |
| 3 | [DialogOverlay 통합 + useCallback deps 버그](260326_dialog_overlay_unification_and_usecallback_deps.md) | 커스텀 훅이 매번 새 객체를 반환하면 useCallback 체인이 전부 무효화된다 |
| 4 | [hover-overlay 토큰 + 스크롤바 CLS 방지](260326_hover_overlay_and_scrollbar_cls.md) | 반투명 오버레이 하나로 모든 배경의 hover를 해결, overflow 토글 대신 thumb 투명도로 CLS 제거 |
| 5 | [Virtuoso 역방향 무한 스크롤 + IO 무한 스크롤](260326_virtuoso_reverse_infinite_scroll.md) | firstItemIndex 감소 패턴으로 prepend 시 스크롤 유지, IntersectionObserver sentinel로 하향 페이지네이션 |

## 오늘의 숫자

- **병렬 세션**: 7개 (tmux 4-pane × 2 Phase)
- **LHCI Performance**: 75 → 87 (+12)
- **LCP**: 4,369ms → 2,127ms (-51%)
- **Speed Index**: 1,438ms → 582ms (-60%)
- **번들 크기**: 6.2MB → 3.9MB (-37%)
- **설계→검증 루프**: 같은 날 3바퀴

## 잘한 것

**1. Orchestrator Mode로 하루에 7개 세션 완주**
독립성이 높은 작업(API 리네이밍, 폰트 진단, 버블 Footer, 파일 미리보기)을 Phase로 나눠 병렬 실행한 것이 핵심이었다. 순차로 했으면 이틀은 걸릴 양.

**2. "눈에 보이는 것만 바꾸고 레이아웃은 건드리지 않는다" 원칙 발견**
hover-overlay(색상만 변경, 레이아웃 불변)와 스크롤바 CLS(thumb 투명도만 변경, overflow 고정) 두 건에서 동일한 원칙이 관통했다. 이 원칙은 앞으로 CLS 관련 이슈 전반에 적용 가능.

**3. useCallback 의존성 체인 디버깅 정석 확립**
`useEffect → useCallback → 커스텀 훅 반환값` 순서로 참조 체인을 추적하면 불필요 재실행의 원인을 체계적으로 찾을 수 있다. "의존성에 객체를 넣지 말 것"이라는 실전 규칙도 명확해졌다.

## 아쉬운 것

**1. 워커 프롬프트 시행착오**
긴 프롬프트를 `tmux load-buffer + paste-buffer`로 보내면 bkit의 AskUserQuestion이 먼저 가로채는 문제를 겪었다. 짧고 명확하게 보내는 게 맞다는 걸 알았지만, 첫 Phase에서 시간을 좀 낭비했다.

**2. 완료 판단 오류**
`❯` 프롬프트가 보인다고 완료로 판단했다가, 중간에 끊긴 세션이 있었다. grep/diff로 실제 결과물을 검증하는 습관이 아직 완전히 자리잡지 않았다.

**3. Gap Analysis 100%인데 브라우저 검증에서 이슈 발견**
Portal 전환으로 렌더링 멈춤, `blob:` URL CSP 차단 등은 코드 레벨 분석만으로 잡을 수 없었다. 코드 분석과 시각 검증은 별개 레이어라는 걸 다시 확인.

## 내일 이어갈 것

- 무한 스크롤 구현 마무리 (메시지 리스트 역방향 + 스레드 목록 하향)
- 브라우저 시각 검증 루프 한 바퀴 더
- Orchestrator Mode 프롬프트 템플릿을 짧은 버전으로 표준화

## 오늘의 원칙 3개

1. **"눈에 보이는 것만 바꾸고 레이아웃은 건드리지 않는다"** — CLS 방지의 핵심
2. **"useCallback deps에 객체를 넣지 마라"** — 참조 안정성의 실전 규칙
3. **"코드 분석 ≠ 시각 검증"** — 둘 다 해야 한다, 하나만으로는 부족하다
