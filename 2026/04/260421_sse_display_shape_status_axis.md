---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "AI 응답 시각화에서 Shape × Status 직교 축으로 디자인 토큰 분리"
updatedAt: "2026-04-21"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-system"
  - "shape-family"
  - "status-color"
  - "sse-display"
  - "fsd"
  - "indicator-timeline-row"

relatedCategories:
  - "react"
  - "typescript"
  - "tailwind"
---

# SSE 응답 시각화 — Shape × Status 직교 축 디자인

> 구조공학 AI 어시스턴트의 SSE 응답 컴포넌트 5종(Intent / Orchestrator / GenNxProgress / Tool / DesignArtifact)을 재설계하며 얻은 교훈. "도메인 신호"와 "시간축 신호"를 독립 축으로 분리하면 토큰 체계가 극적으로 단순해진다.

## 배경

AI 채팅 UI에서 백엔드가 SSE로 내려주는 이벤트는 본질적으로 **도메인(무엇)**과 **상태(언제/어디까지)** 두 축의 곱이다.

- 도메인 축: "이게 의도 분석인가, 도구 호출인가, 산출물인가"
- 상태 축: "실행 중인가, 완료인가, 실패인가"

1차안은 이 둘을 섞어서 표현했다 — 좌액센트 색상이 도메인을, 박스의 평면/카드 위계가 상태를 나타냈다. 결과는 "변별력 부족 + 디자인 빈약". Designer 3명이 같은 결론에 수렴했다.

원인: **두 축을 하나의 시각 수단에 겹치면**, 각 축의 표현력이 절반으로 준다. 도메인이 7개이고 상태가 4개면 7 × 4 = 28개 조합이 있는데 색상 하나로 감당할 수 없다.

## 핵심 내용

### 1. Shape Family × Status 직교 체계 (Option A Category)

도메인을 **형태(Shape)**로, 상태를 **색상·애니메이션(Status)**로 분리했다.

```
Shape (도메인, 색맹 대응)
  Diamond  ◆  → Meta / Planning     (Intent)
  Dot      ●  → Process / Loop      (Orchestrator, GenNxProgress)
  Square   ▢  → Action / 호출 중    (ToolActivity — outline)
  Filled ■    → Artifact / 완성물   (DesignArtifact)

Status (시간축, shape와 독립)
  running → bg-accent + animate-progress-blink
  done    → bg-border (경계 수준 희미)
  error   → bg-destructive
  idle    → bg-muted-foreground/40
```

두 축을 직교시키면 4 shape × 4 status = 16 조합을 **단일 `ShapeBullet` 컴포넌트**로 표현할 수 있다.

```tsx
type Shape = "diamond" | "dot" | "square" | "filled-square";
type Status = "idle" | "running" | "done" | "error";

function ShapeBullet({ shape, status, emphasized }: Props) {
  const s = STATUS_STYLES[status]; // bg / border / pulse
  const base = cn(emphasized ? "size-2.5" : "size-2", s.pulse && "animate-progress-blink");
  if (shape === "dot") return <span className={cn(base, "rounded-pill", s.bg)} />;
  if (shape === "square") return <span className={cn(base, "border bg-background", s.border)} />;
  // ...
}
```

### 2. 직교 축 설계의 4가지 장점

**장점 1 — 색맹 대응**: 도메인을 shape로 구분하므로 색각 이상자도 diamond/dot/square를 구분할 수 있다. Nielsen H6 (Recognition over recall)의 shape family 원칙.

**장점 2 — 신규 도메인 추가 비용 제로**: 새 도메인이 생기면 Shape 카테고리(Meta/Process/Action) 중 어디 속하는지 결정하고 매핑만 추가하면 된다. 상태 축은 건드릴 필요 없다.

```ts
export const SHAPE_BY_DOMAIN = {
  intent: "diamond",
  orchestrator: "dot",
  genNxProgress: "dot",
  toolActivity: "square",
  designArtifact: "filled-square",
} as const satisfies Record<string, Shape>;
```

**장점 3 — 기억 부담 감소**: 사용자가 외울 규칙이 "모양 3개 + 색 4개 = 7개"로 평평해진다. 1차안처럼 "도메인 7개 × 상태 4개 = 28조합"을 색으로만 구분하려던 시도는 애초에 불가능.

**장점 4 — 디자인 토큰 추가 불필요**: 시맨틱 토큰(`status-info`, `accent`, `border`, `destructive`)을 그대로 재사용한다. 신규 CSS 변수 0개.

### 3. FSD에서 공용 추상화 배치 경계

공용 추상화 3종을 FSD 레이어에 어떻게 배치할지 고민했다.

| 파일 | 레이어 | 이유 |
|------|-------|------|
| `ShapeBullet.tsx` | `shared/ui/primitives/` | 도메인 지식 없는 순수 시각 primitive |
| `IndicatorTimelineRow.tsx` | `shared/ui/primitives/` | Shape/Status를 소비하지만 도메인 몰라도 동작 |
| `domain-visual-theme.ts` | `entities/message/ui/` | 도메인(Intent/Orch...) ↔ Shape 매핑은 비즈니스 |

원칙: **"이 모듈이 'Intent' 같은 도메인 이름을 알아야 하는가?"**

- 알아야 하면 → `entities/` 이상
- 몰라도 되면 → `shared/`

Shape/Status union type은 `shared`에서 소유(값 기반), 도메인 매핑은 `entities`에서 소유(의미 기반). 양방향 의존 없음.

### 4. IndicatorTimelineRow의 sublines vs children 배타 슬롯

공통 헤더(bullet + title + time + meta + chevron)는 항상 같고, 확장 영역만 컴포넌트마다 다르다. 두 가지 확장 모드를 지원했다.

```ts
type Props = {
  sublines?: SubItem[]; // 간단 리스트 (text + time)
  children?: ReactNode; // 복잡 콘텐츠 (NotebookPipelineTabBody 등)
  // ...
};
```

**sublines** — SubLine 래퍼 + 각 항목 `text` / `ml-auto mono time` 자동 렌더. 대부분의 Indicator가 이 경로.

**children** — DesignArtifactCard는 fetchState 4분기별로 다른 UI를 렌더하므로 자유도 필요.

두 슬롯을 동시 사용하지 않는다는 "배타 원칙"을 내부에서 `children !== undefined ? children : sublines`로 처리. 타입에서 강제하지 않고 규약으로만 규정 (compound component 패턴).

### 5. R9 150줄 제약이 준 부가 효과

"파일당 150줄 이내" 규칙 때문에 IntentIndicator(159줄), OrchestratorLog(157줄)를 훅으로 분리해야 했다. 부산물:

- `use-intent-edit.ts` — draft/save/cancel 상태 기계 (25줄)
- `use-orchestrator-activities.ts` — myActivities 윈도우 (29줄)
- `use-orchestrator-label.ts` — phaseSuffix/label 조립 (46줄)

이들이 순수 함수/순수 훅으로 분리되면서 **TDD 적용 가능성**이 생겼다. 결과: `renderHook` 기반 19개 테스트를 RED→GREEN으로 작성하고 기존 snapshot test와 함께 회귀 방지망을 만들었다.

즉 "150줄 제약"은 단순 스타일 룰이 아니라 **"SRP를 강제하는 도구"**였다. 제약이 없었다면 훅 분리 없이 159줄 그대로 IndicatorTimelineRow만 얹었을 것이고, 테스트 가능성은 확보되지 않았을 것.

## 정리

이번 작업에서 얻은 가장 중요한 깨달음:

**"두 축을 섞지 마라"** — 디자인 신호(도메인, 상태, 진행률, 강조 등)가 서로 독립적이라면 각자 다른 시각 수단(shape, color, size, animation)에 배정해야 한다. 하나에 겹치면 표현력이 곱하기가 아니라 나누기가 된다.

추가 교훈 3가지:
1. **Designer 3명의 수렴은 경고 신호** — 사전에 "다양성 강제" 지시를 주지 않으면 세 명 모두 가장 안전한 선택지로 수렴한다. 이번에는 "본질적으로 다른 방향성" + "레퍼런스 5개 이상" + "최소 4안"을 지시하여 12개 안 풀을 얻었다.
2. **Mockup으로 합의한 뒤 실제 컴포넌트에 적용하는 2단계 작업이 비용 대비 효과 큼** — mockup은 150줄 이내 독립 파일이라 빠르게 반복 가능, 실제 컴포넌트는 R33 테스트 회귀 때문에 신중해야 한다. 두 층을 분리하면 디자인 결정과 구현 회귀를 독립적으로 관리할 수 있다.
3. **i18n key 추가는 4 locale 동시 업데이트가 규칙** — `intent.label` 하나 추가할 때 ko/en/ja/zh 네 파일 모두 건드려야 한다. 일부 누락 시 런타임 key 그대로 노출된다. grep으로 같은 위치에 정확히 추가하는 게 안전.

## 참고 링크

관련 디자인 제안서:

https://github.com/anthropics/claude-code

(내부 문서: `docs/02-design/dgn-260421-141143-sse-display-redesign-v2.md`)
