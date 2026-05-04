---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "스트리밍 채팅 UI 도구 완료 시 발생하는 Layout Shift 분석과 해결"
updatedAt: "2026-05-04"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "layout shift"
  - "scroll anchoring"
  - "jotai"
  - "selectAtom"
  - "atomFamily"
  - "ResizeObserver"
  - "vercel ai sdk"
  - "sendAutomaticallyWhen"
  - "react"

relatedCategories:
  - "performance"
  - "ux"
  - "state-management"
---

# 스트리밍 채팅 UI 도구 완료 시점의 Layout Shift 원인과 3-pronged 해결

> Spacer 기반 상단 앵커링 + 자동 follow-up + 공유 atom 구독이 결합해 1~2 프레임 jitter 를 만드는 race condition 을 분석하고, 구독 범위 축소·헤더 height 고정·stream-end 디퍼링으로 풀어낸다.

## 배경

Vercel AI SDK 기반 채팅 UI 에서 응답 스트리밍 중 도구(tool call) 두 개 이상이 거의 동시에 완료될 때, User 메시지 버블이 잠깐 아래로 밀려났다가 다시 상단으로 snap back 되는 layout shift 가 보고됐다. 헤더 텍스트 변경, ResizeObserver 비동기 fire, Multi-step Tool Use 의 자동 follow-up, jotai `useAtom` 의 cascade re-render — 네 개의 비동기 path 가 1~2 프레임 어긋나면서 누적되는 race 였다.

단일 원인이 아니라 누적이라는 점이 중요하다. 한 곳만 고쳐도 잔여 jitter 가 남는다.

## 핵심 내용

### 1. Spacer 공식과 균형의 전제

상단 앵커링은 ChatScrollArea 마지막에 동적 spacer 한 장으로 구현된다. 핵심 공식:

```
belowUserContent = scrollHeight − (userOffsetTop + userHeight + fixedBottomSpacer + currentSpacer)
nextSpacer       = max(0, desiredBelow − fixedBelow − belowUserContent)
```

이상적으로는 assistant 가 +Δa 커지면 spacer 가 −Δa 줄어 ΔscrollHeight ≈ 0 → 사용자 시야는 안정.

전제는 **두 변화가 같은 frame 에 commit** 되는 것. 그렇지 않으면 1~2 frame 동안 scrollHeight 가 +Δa 큰 상태로 노출되고, browser 의 native scroll-anchoring(`overflow-anchor: auto` 기본값) 이 끼어들어 scrollTop 을 자체 보정 → 시각적 드롭으로 인식된다.

### 2. Cascade re-render 의 원인 — `useAtom(family)`

도구별 elapsed 영속화를 위해 jotai atomFamily(messageId) 를 도입했다. 처음엔 단순하게:

```ts
const [map, setMap] = useAtom(toolGroupElapsedAtom(messageId));
const persisted = map[groupKey] ?? 0;
```

문제는 `useAtom` 이 **map 전체** 를 구독한다는 점. 같은 message 의 group A 가 elapsed 를 atom 에 write 하면 group B 의 컴포넌트도 re-render → 두 컴포넌트가 거의 동시에 ResizeObserver 를 트리거 → ro-content tick 이 다발로 발사된다.

해결: `selectAtom` 으로 group-scoped 구독.

```ts
const familyAtom = toolGroupElapsedAtom(messageId);
const selected = useMemo(
  () => selectAtom(familyAtom, m => m[groupKey] ?? 0),
  [familyAtom, groupKey],
);
const persisted = useAtomValue(selected);
const setMap = useSetAtom(familyAtom); // 쓰기는 family atom 직접
```

`selectAtom` 의 selector 가 **동일 값을 반환하면** React re-render 가 발생하지 않는다. 다른 group 의 write 는 본 컴포넌트와 무관해진다.

### 3. 헤더 height 고정 — wrap line 차이 흡수

도구 그룹 헤더 텍스트:

- running: `"3개 도구가 실행 중 입니다."`
- done: `"3개 도구가 실행이 완료 되었습니다. 0.5s"`

좁은 viewport 에서는 wrap line 수가 1 → 2 로 변할 수 있다 (≈ 22~24px step jump). spacer 가 따라오기 전에 이 변화가 일어나면 jitter 의 크기 자체가 커진다.

해결:

```tsx
<div className="group/row flex h-7 items-center gap-2xs py-3xs cursor-pointer overflow-hidden">
  ...
  <span className="min-w-0 truncate whitespace-nowrap text-step-n1 font-medium">
    {summaryText}
  </span>
  {elapsedLabel && (
    <span className="shrink-0 whitespace-nowrap text-step-n1 text-muted-foreground">
      {elapsedLabel}
    </span>
  )}
</div>
```

- 외곽 `h-7 + overflow-hidden` 으로 1-line 슬롯 고정
- summary `min-w-0 + truncate + whitespace-nowrap`
- elapsed `whitespace-nowrap` (짧은 `0.5s` 가 줄바꿈에 끼는 것 방지)

헤더 height 가 변하지 않으므로 assistant 영역 height 변동 자체가 사라진다 — CSS containment 의 가난한 자 버전이다.

### 4. 자동 follow-up window 동안 stream-end 액션 디퍼

```ts
sendAutomaticallyWhen: lastAssistantMessageIsCompleteWithToolCalls,
```

이 옵션은 step 사이에서 `streaming → ready → streaming` transient 전이를 만든다. 매번 `stream-end` trigger 가 발사되면서 spacer 를 한 번 0 으로 collapse 시키고, 곧바로 다음 step 의 ro-content 가 다시 키운다 → 가시적 jitter.

해결: stream-end 액션을 500ms 지연하고, 그 사이 새 stream-start 가 들어오면 cancel.

```ts
const streamEndTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
const STREAM_END_DEFER_MS = 500;

useEffect(() => {
  const was = prevStreamRef.current;
  prevStreamRef.current = isStreaming;
  if (!was && isStreaming) {
    // 자동 follow-up: 직전 stream-end deferred 액션이 살아있으면 cancel.
    if (streamEndTimerRef.current) {
      clearTimeout(streamEndTimerRef.current);
      streamEndTimerRef.current = null;
    }
    return;
  }
  if (was && !isStreaming && !pendingRef.current) {
    if (streamEndTimerRef.current) clearTimeout(streamEndTimerRef.current);
    streamEndTimerRef.current = setTimeout(() => {
      streamEndTimerRef.current = null;
      computeAndApply("stream-end", false);
      afterEndRef.current = true;
    }, STREAM_END_DEFER_MS);
  }
}, [isStreaming, ...]);
```

핵심 통찰: `lastAssistantMessageIsCompleteWithToolCalls` 가 만드는 짧은 idle 은 "한 turn 내 step 전환" 이지 "turn 종료" 가 아니다. 스크롤 정책 입장에서는 동일 turn 으로 묶어야 한다.

## 정리

- Layout shift 는 보통 **단일 버그가 아니라 여러 비동기 path 의 1~2 frame race**. 한 곳만 패치해도 다른 path 가 잔여 jitter 를 만든다 — 다층 mitigation 이 정석이다.
- jotai 에서 `atomFamily` 로 per-key 데이터를 보관할 때도 `useAtom(family)` 는 map 전체 구독이라는 점을 잊기 쉽다. 다중 key 가 한 atom 에 들어있다면 `selectAtom + useAtomValue` 로 구독 범위를 좁혀야 cascade re-render 가 차단된다.
- 헤더처럼 자주 텍스트가 바뀌는 슬롯은 **컨테이너 height 를 명시적으로 고정** 해두면 컨텐츠 변동이 외부 layout 에 전파되지 않는다.
- Vercel AI SDK 의 `sendAutomaticallyWhen` 은 UI 정책 입장에서 "한 turn 의 다단계" 라는 사실을 명시적으로 인식해야 한다 — `chat.status` 만 보고 stream-end 를 즉시 처리하면 multi-step 의 시각 안정성이 깨진다.
- 마지막 수단으로 `overflow-anchor: none` 으로 browser native scroll anchoring 을 끄고 우리 formula 한 곳에 책임 집중하는 카드도 있다. 단 이는 다른 케이스(메시지 위에서 추가 로드 등)의 동작도 바꾸므로 신중히 적용.
