---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "AI 스트리밍 응답의 사고 과정(Intent/Loop/Chat)을 카드 적층 UI로 재설계"
updatedAt: "2026-04-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "SSE"
  - "Vercel AI SDK"
  - "Jotai atomFamily"
  - "FSD"
  - "Tailwind v4"
  - "i18n"
  - "Design Tokens"
  - "Agent Loop UI"

relatedCategories:
  - "typescript"
  - "tailwindcss"
  - "testing"
---

# Loop Timeline v2 — AI 스트리밍 사고 과정 카드 적층 UI

> AI 에이전트의 Intent → Loop(Planner/Executor/Judge) → Chat 흐름을 카드 3종으로 재설계한 하루치 기록. BE 계약 전환, 세션 교차 오염 버그, inline span의 w/h 무시, transition-all 깜빡임, 공용 컴포넌트 재사용과 i18n까지 한 번에 쏟아진 이슈를 정리했다.

## 배경

기존에는 단일 `LoopBlock` 하나로 intent·loop·tool·chat을 섞어 렌더하고 있었다. 스트리밍 도중 계속 늘어나는 노드와 상태 전이가 하나의 큰 박스 안에 쌓이니 "지금 뭐 하는 중인지" 읽히지 않고, agent가 다시 돌면(retry loop) 같은 박스가 비대해지는 문제가 있었다.

FE/BE 모두 v2 설계로 넘어가기로 했다:

- **BE**: `data-agent-event`, `data-intent-result`, `data-planner-result`, `data-executor-result`, `data-judge-result`, `data-tool-event`, `data-tool-result`, `data-chat-result` 를 emit
- **FE**: `messageStepsAtom(messageId)` 에 `MessageStep[]` (`intent | loop | chat | post-tool`)를 누적하고, `MessageSteps` 라우터가 `IntentCard`, `LoopCard`, `ChatCoordinator`로 분기 렌더

이번 세션은 S7(런타임 연결) 이후 실제로 BE를 붙여 돌려보며 생기는 예상 못 한 이슈를 연달아 해결한 기록이다.

## 핵심 내용

### 1) 세션 교차 오염 — `PROCESSOR_SESSIONS` 전수 순회 버그

첫 번째 assistant 응답이 끝난 뒤 사용자가 HITL에서 "예"를 눌러 두 번째 응답이 스트리밍되자, **첫 번째 메시지의 Intent/Loop 카드 내용이 두 번째 응답의 내용으로 바뀌어 버렸다**. 두 메시지가 같은 내용을 중복 렌더하는 것처럼 보였다.

원인은 `interceptChunkForSteps`:

```ts
// BAD — 모든 세션에 새 chunk를 apply
for (const session of PROCESSOR_SESSIONS.values()) {
  processChunk(session, store, chunk);
}
```

후속 chunk가 들어오면 `PROCESSOR_SESSIONS` Map 전체를 순회하며 이전 세션(`msg-A`)에도 새 chunk를 apply했다. 결과적으로 `messageStepsAtom(msg-A)` 가 `msg-B`의 내용으로 **덮어 쓰였다**.

해결은 "현재 활성 세션 1개" 포인터 도입:

```ts
let currentSessionId: string | null = null;

export function interceptChunkForSteps(store, chunk) {
  if (chunk.type === "start" && chunk.messageId) {
    currentSessionId = chunk.messageId;
    const s = getOrCreateSession(chunk.messageId);
    processChunk(s, store, chunk);
    return;
  }
  if (!currentSessionId) return;
  const s = PROCESSOR_SESSIONS.get(currentSessionId);
  if (s) processChunk(s, store, chunk);
}
```

교훈: `atomFamily` 같은 구조에서 **후속 chunk의 라우팅**은 "last start" 포인터로 명시적으로 고정해야 한다. 전수 순회는 "단일 스트림 컨텍스트" 가정이 깨지는 순간 조용히 망한다.

### 2) BE 계약 문서 ≠ 실제 emit 상태

핸드오프 문서는 "`data-agent-event` 등이 이미 emit된다" 전제로 작성됐지만, 실제 raw SSE를 찍어보니 여전히 `dynamic-tool { toolName: "intent_analysis" }`, `dynamic-tool { toolName: "agent_orchestration_log" }` 같은 **레거시 포맷만** 흐르고 있었다.

BE 전환을 기다리는 대신 몇 가지 옵션을 저울질했다:

- **A. BE 전환 대기** — 가장 깔끔하지만 ETA 불확실
- **B. FE adapter** — legacy chunk를 new shape로 합성. 단일 Intent만이면 쉽지만 Loop iteration 경계 유추는 위험
- **C. BE 구현**

며칠 뒤 BE가 새 스키마로 전환돼 A로 해결했지만, **"계약 문서를 쓴 시점 = 구현 완료 시점"이 아니라는 당연한 사실**을 다시 맞았다. 설계 문서는 계약이고, 계약과 현실은 wire에서 찍어봐야 안다.

### 3) `data-gen-nx-fetch-progress`는 tool event가 아니다

Executor 단계에서 도구 활동 박스(`└ gen_nx_mcp ("load_data") · 검색 중…`)가 안 보였다. 이유: BE가 GEN NX 모델 데이터 수집을 `data-tool-event` / `data-tool-result`로 보내지 않고 **`data-gen-nx-fetch-progress`라는 별도 포맷**으로 snapshot emit.

FE processor 스위치에 이 케이스가 없어 무시됐고, `executor.toolActivities`가 영구히 빈 배열이라 박스 렌더 조건이 불충족.

임시 adapter로 해결:

```ts
function handleGenNxProgress(s, store, data) {
  const p = GenNxFetchProgressSchema.safeParse(data);
  // ...
  const loading = p.data.steps?.find(st => st.status === "loading");
  const callId = "gen-nx-fetch-progress";  // 고정 ID로 upsert
  const activity = {
    callId, tool: "gen_nx_mcp",
    query: loading?.label ?? lastDone?.label,
    status: allDone ? "success" : "running",
  };
  // ... executor.toolActivities upsert
}
```

여러 progress snapshot이 올 때마다 "loading step의 label"을 query로 갱신해 **한 줄짜리 라이브 표시**로 매핑. BE가 나중에 `data-tool-event`로 통일하면 제거 예정인 adapter임을 주석에 명시.

### 4) ShapeBullet이 안 보인 이유 — inline span의 w/h 무시

IntentCard에 bullet을 감싸는 래퍼 span을 추가했더니 bullet이 렌더 크기 0으로 사라졌다.

```tsx
// BAD
<div className="flex justify-center">
  <span className="relative z-10 bg-surface">
    <ShapeBullet />  {/* size-2 w/h가 적용 안 됨 */}
  </span>
</div>
```

CSS에서 **inline span은 `width`/`height`가 무시**된다. LoopCard의 AgentRunNode에서는 `<div className="flex">` 직하의 `<ShapeBullet>` 이 **flex item으로 승격**돼 w/h가 적용됐는데, IntentCard는 중간에 inline `<span>`을 끼운 순간 ShapeBullet이 flex item이 아닌 inline span 자식이 되며 크기 계산 대상에서 빠졌다.

수정은 래퍼를 flex container로 승격:

```tsx
<span className="relative z-10 inline-flex items-center bg-surface">
  <ShapeBullet />
</span>
```

`inline-flex`가 된 span이 flex container가 되면서 ShapeBullet이 flex item으로 승격, w/h 적용. **flex layout에서 "flex item 승격" 조건을 중간 래퍼가 깰 수 있다**는 건 생각보다 자주 놓치는 함정이다.

### 5) `transition-all`과 border 깜빡임

CycleCardHeader(아코디언 버튼) 토글 시, 열림 방향으로 하단 border가 순간적으로 **검정으로 깜빡**였다가 `border-subtle` 색으로 수렴했다.

원인:

- Button 공용 컴포넌트의 base class에 `transition-all duration-(--duration-fast)`
- 닫힘→열림 순간 `border-b border-border-subtle` 클래스가 추가
- `transition-all`이 border-bottom-width를 `0 → 1px`로 애니메이션하는데, 이때 border-color의 초기값이 정의되지 않아 브라우저가 **`currentColor`(검정) 기본값**으로 transition을 시작

수정은 단순히 버튼에서 transition 비활성:

```tsx
className={cn(
  "...",
  "transition-none",
  open && "border-b border-border-subtle",
)}
```

아코디언 body는 이미 `max-h + opacity` transition으로 피드백을 주고 있으니 header의 transition은 과잉. `transition-all`은 **border-width·border-style까지 전부** 애니메이션 대상으로 잡아서, 시각적 "중간 상태"가 의도치 않은 기본값으로 잠깐 새어 나오는 것을 늘 주의해야 한다.

### 6) 공용 컴포넌트 재사용 — `Button variant="transparent"` + `Tag size="bare-xs"`

처음 CycleCardHeader는 "커스텀 `<button>` + 여러 `<span>` + 특수 클래스"로 직접 썼다. 공용 Button 컴포넌트의 기존 variant(accent/ghost/...)가 안 맞을 것 같았지만, 실제로 `control-tokens.ts` 를 다시 보니 이미 존재:

```ts
transparent: "bg-transparent text-foreground",
```

이걸 base로 쓰고 `size="bare-md"`(height 없음, text + gap만), `shape="square"`(라운드 없음) 조합하면 정확히 헤더 컨테이너가 된다. Pill도 `Tag variant="transparent" size="bare-xs" shape="soft"` + `className` overlay로 특수 색만 덧붙여 재사용 가능.

`cn()`이 `tailwind-merge` 기반이라 **className overlay는 class group 단위로 variant default를 override**한다는 게 공용 컴포넌트를 쓰기 편하게 해주는 핵심이다.

### 7) CardRail의 bullet 중심 정렬 — 0.5px 오차 찾기

세로 타임라인 레일이 bullet 중심과 "살짝" 어긋나 보였다. 수치를 따져보면:

- grid 컬럼 `[1rem 1fr]` → bullet 컬럼 16px
- `size-2` bullet을 `justify-center`로 배치 → bullet 중심 **x=8px**
- rail `left-2 w-px` → 선의 좌측 edge가 8px, **선 중심 x=8.5px**

**0.5px 어긋남**이 subpixel 렌더링에서 흐릿한 위치 이슈로 나타났다. 수정은 `-translate-x-1/2` 1개 추가:

```tsx
<div className="absolute left-2 w-px -translate-x-1/2 bg-border" />
```

선 중심이 정확히 `left-2`(8px)에 오게 되어 bullet 중심과 완전 일치. **"px 단위로 정렬이 맞냐"는 css 디버깅에서 가장 자주 귀찮은 이슈**지만, 수치로 따지면 답은 단순하다. translate-x로 box를 reference line 기준으로 재정렬하는 패턴은 timeline/ruler류 UI에서 특히 유용.

### 8) i18n: "안 한 건 아니지?"

`경량 답변`, `구조화 답변`, `· 실패` 같은 한글을 코드에 박아두고 지나갔는데 한 마디에 들켰다. 이 프로젝트는 `ko/en/ja/zh` 4 locale로 운영되며, `useTranslation()` 훅 + `locales/*.json` 키 구조를 쓴다.

일괄 i18n화 포인트:

- `loop.responseMode.{lite, template}` — OutcomeBadge
- `loop.runningAgent.{planner, executor, judge}` — LoopCard shimmer 라벨
- `loop.marker.{pending, failed}` — AgentRunNode 우측 마커
- `loop.card.failedSuffix` — CycleCardHeader
- `loop.outcome.{complete, continue, unresolvable, maxIter}` — OutcomeBadge
- `loop.defaultTitle`, `loop.runningTitle`, `loop.toolActivity.{...}`

순수 함수(`markerForRun`)도 훅을 직접 쓸 수 없어 시그니처에 `t` 파라미터를 주입해서 호출부에서 `useTranslation().t`를 전달.

**테스트 주의**: vitest 환경에서 translation atom이 실제로 ko locale로 로드되어 동작한다. i18n key fallback(key 자체 반환)이 아니라 번역된 문자열이 나오므로, 테스트 assertion을 한글로 작성해야 한다. 이건 처음 만나면 꽤 헷갈린다.

### 9) 레거시 제거 범위 판단

마지막 "S7-c: 레거시 파일/atom/registry 제거" 작업에서, 핸드오프 문서의 공격적 제거 목록을 그대로 따르면 **기존 DB 저장 메시지의 parts가 legacy 포맷이라 기존 히스토리가 broken**. DB 마이그레이션이 없으면 `IntentIndicator`/`OrchestratorLogIndicator`/`renderMessageChunks` 는 legacy fallback 경로로 유지할 필요가 있었다.

보수적 옵션(A)을 골라 다음만 제거:

- `LoopContextSchema` (z.object)
- `isLoopContext` / `LoopContext` 타입
- 위 2개의 barrel export
- `chunk-display-registry` 의 `loop-block` 엔트리 (componentPath가 없는 파일 가리키던 stale 정의)

**레거시 정리는 "더 이상 참조되지 않는 것"과 "deprecated지만 여전히 경로에 필요한 것"을 구분**해야 한다. 한 번에 다 지우기는 쉽지만, 기존 사용자 데이터 호환을 깨는 게 더 비싸다.

## 정리

하루 종일 한 프레임의 세로 레일 위에 bullet 4개와 pill 4개, 카드 3종, 아이콘 2종을 다른 높이·다른 색·다른 위치로 정렬하고 있었다. 표면적으로는 UI 디테일이지만, 뒤에서는

- 스트리밍 **세션 라우팅** 방식
- **SSE 계약** 문서와 실제 wire의 불일치
- **flex layout / transition / subpixel** 같은 CSS 기본기
- **공용 컴포넌트 variant 체계**의 재사용 한계와 extension 패턴
- **i18n 도입 시점**과 테스트 환경의 translation 동작
- **레거시 제거 vs 호환** 보수성 trade-off

가 거의 한 번에 올라왔다.

가장 크게 남은 건 "계약은 결국 wire에서 맞춰봐야 끝난다"는 것과, "inline span은 조용히 w/h를 무시한다"는 것. 전자는 수십 번 겪어도 다시 당하고, 후자는 이번에 처음 정면으로 맞았다.

전반적으로 Agent loop UI 같은 실시간 스트리밍 UI는 **"지금 뭐 하는 중인지 한 줄로 읽힘 > 화려한 인터랙션"** 이라는 원칙이 더욱 중요하다. 카드가 접히고 펴지는 아코디언·shimmer·chevron 같은 디테일보다, **bullet 하나가 어느 순간 검정이 되고 어느 순간 pulse 하는지**가 사용자에게 전달하는 정보량이 훨씬 크다는 걸 새삼 느낀다.
