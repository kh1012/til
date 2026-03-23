---
draft: true
type: "content"
domain: "frontend"
category: "performance"
topic: "패널 애니메이션 프레임 드랍 — layout property vs transform GPU 가속"
updatedAt: "2026-03-23"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "framer-motion"
  - "css-transition"
  - "reflow"
  - "resize-observer"
  - "gpu-compositing"
  - "will-change"
  - "transform"
  - "spreadjs"

relatedCategories:
  - "css"
  - "react"
  - "browser"
---

# 패널 애니메이션 프레임 드랍 — layout property vs transform

> `flexGrow`, `width`, `padding`을 애니메이션하면 매 프레임 전체 DOM reflow가 발생한다. `transform`만이 GPU 합성으로 60fps를 보장한다.

## 배경

SplitPanelLayout 안에 flex로 배치된 패널들(ThreadSidePanel, InteractionPanel, InsightPanel)을 동시에 열면 심각한 프레임 드랍이 발생했다. Gemini는 같은 상황에서 버벅거림이 없는데 왜 우리만 느린지 분석했다.

## 핵심 내용

### 근본 원인: 3중 reflow 폭포

```
Frame 1~18 (300ms 애니메이션 구간):
1) framer-motion → InteractionPanel flexGrow/width/padding 변경
2) CSS transition → ThreadSidePanel width 변경
3) CSS transition → InsightPanel width 변경
4) SplitPanelLayout flex 컨테이너 전체 layout recalc
5) ResizeObserver 연쇄 → SpreadJS refresh (~18회) + Canvas 재생성
```

### GPU 가속 가능/불가 속성 분류

| 속성 | GPU 가속 | reflow 유발 |
|------|----------|------------|
| `transform` | **O** (compositor thread) | **X** |
| `opacity` | **O** | **X** |
| `width` | **X** | **O** (매 프레임) |
| `flexGrow` | **X** | **O** |
| `padding` | **X** | **O** |

`will-change: "flex-grow, width, padding"` 선언은 **무의미**. layout 속성은 GPU 합성 레이어로 승격 불가. 메모리만 낭비.

### Gemini와의 구조적 차이

| | Gemini | 우리 |
|--|--------|------|
| 채팅 목록 | `position: fixed` 오버레이 | flex 레이아웃 내 width 변경 |
| 열릴 때 reflow | **없음** | 전체 flex 트리 reflow |
| 애니메이션 속성 | `transform: translateX` | `width`, `flexGrow` |
| SpreadJS 영향 | 없음 | 매 프레임 refresh |

### ResizeObserver 폭풍

| Observer | Throttle | 문제 |
|----------|----------|------|
| SplitPanelLayout (CSS 변수 갱신) | **없음** | 매 프레임 style.setProperty |
| SpreadSheetView (workbook.refresh) | rAF | ~18회/300ms |
| CellGraphVisualization (setDimensions) | **없음** | 매 프레임 React 리렌더 |
| Virtuoso (MessageList) | **없음** | 매 프레임 스크롤 재계산 |

### Quick Win: ResizeObserver throttle/debounce

가장 적은 변경으로 가장 큰 효과:

```typescript
// SpreadSheetView: rAF → debounce 150ms + suspendPaint
const observer = new ResizeObserver(() => {
  clearTimeout(debounceRef.current);
  debounceRef.current = setTimeout(() => {
    wb.suspendPaint();
    wb.refresh();
    wb.resumePaint();
  }, 150);
});
```

- SpreadJS refresh: ~18회 → 2회
- CellGraph Canvas 재생성: 매 프레임 → 150ms 후 1회
- 크기 변화 delta > 100px(탭 전환)은 즉시 refresh, 작은 변화(패널 애니메이션)는 debounce

### 근본 해결: transform 기반 2단계 전환

```
열기: 즉시 width 설정 (reflow 1회) → transform: translateX(0) (GPU 300ms)
닫기: transform: translateX(100%) (GPU 300ms) → transitionend에서 width: 0 (reflow 1회)
```

300ms 동안 reflow 0회. 시작/종료 시 각 1회만.

## 정리

- **`width`/`flexGrow`/`padding` 애니메이션은 절대 하지 말 것** — 매 프레임 전체 DOM reflow
- **`transform`과 `opacity`만 애니메이션** — GPU compositor thread에서 처리, 메인 스레드 blocking 없음
- **`will-change`는 layout 속성에 무의미** — transform/opacity에만 효과
- **`transition-all`은 위험** — 의도치 않은 layout 속성까지 transition 걸림
- **ResizeObserver는 반드시 throttle/debounce** — 특히 SpreadJS 같은 무거운 라이브러리가 구독 중이면 필수
- **Gemini 방식(오버레이)이 정답** — 기존 콘텐츠에 reflow 영향 0
