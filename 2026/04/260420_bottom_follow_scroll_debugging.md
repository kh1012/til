---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Bottom follow 스크롤 디버깅 — 순수 distance 기반 단순화와 HMR 관성의 함정"
updatedAt: "2026-04-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "scroll follow"
  - "scrollTop"
  - "scrollHeight"
  - "HMR"
  - "useEffect"
  - "히스테리시스"

relatedCategories:
  - "nextjs"
  - "debugging"
  - "chat-ui"
---

# Bottom follow 스크롤 디버깅 — 순수 distance 기반 단순화와 HMR 관성의 함정

> 로그를 추가했더니 동작한다? 코드 동등성은 함정일 수 있다. 판정 조건을 단순화하고, 실제로 먹히는지 계측하라.

## 배경

Claude/ChatGPT 스타일의 채팅 UI에서 Assistant 스트리밍 중 **bottom follow**를 구현하고 있었다. User 메시지는 viewport 상단에 앵커되고, Assistant가 자라면서 viewport 하단을 넘어가면 자동으로 scrollTop을 따라가 최신 토큰이 보이도록 하는 동작이다.

초기 구현은 "spacer 게이트 + distance" 조합이었다. spacer(User 아래 공백)가 크면 "User 상단 고정 의도"로 해석해 follow를 차단하고, spacer가 거의 0이 되면 follow를 활성화하는 방식. 테스트는 다 녹색이고 로직도 맞아 보이는데 브라우저에서는 동작하지 않았다.

## 핵심 내용

### 1. spacer 임계값 판정의 함정

처음 설계는 이랬다.

```ts
const spacerJustDepleted = prevSpacer > 0 && currentSpacer === 0;
if (currentSpacer > 0) {
  following = false;
} else {
  if (spacerJustDepleted) following = true;
  else if (distanceFromBottom <= 100) following = true;
  else if (distanceFromBottom > 500) following = false;
}
```

문제는 "정확히 0" 도달이었다. 실측에서 spacer는 415 → 341 → 312 → 40 → ... 로 감소하다가 **정확히 0에 도달하기 전에 스트리밍이 끝났다**. 33ms 폴링으로는 0 전환 순간을 놓치기 쉽고, 놓치면 follow가 영구 false로 잠긴다.

임계값을 `<= 30`으로 완화해도 여전히 조기 안착(spacer=40, 67)하는 케이스에서 follow 진입을 막았다.

### 2. 해결 — 순수 distance 기반 단순화

결국 spacer 조건을 **전부 제거**했다.

```ts
useEffect(() => {
  if (!isStreaming) return;
  let following = false;
  const interval = setInterval(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;
    const d = scroller.scrollHeight - scroller.scrollTop - scroller.clientHeight;
    if (d <= 100) following = true;
    else if (d > 500) following = false;
    // 100 ~ 500: 이전 상태 유지 (히스테리시스)
    if (!following) return;
    scroller.scrollTop = scroller.scrollHeight;
  }, 33);
  return () => clearInterval(interval);
}, [isStreaming, scrollerRef]);
```

근거는 간단하다. 초기 User 상단 앵커는 smooth scroll이 담당하고 있고, smooth가 완료되기 전엔 d가 커서 follow=false 유지된다. smooth가 끝나면 d가 작아져 자연히 follow=true. 이후 Assistant가 viewport 밖으로 자라면 d가 다시 커져야 할 텐데 이미 follow=true라 scrollTop이 따라가서 d=0이 유지된다. spacer의 상태는 이 흐름에 개입할 이유가 없다.

### 3. 로그를 추가하니 동작하는 미스터리

"단순화"를 한 뒤에도 사용자는 "여전히 안 된다"고 했다. 그래서 `scrollTop = scrollHeight` 할당이 실제로 먹히는지 확증하는 로그를 주입했다.

```ts
const before = scroller.scrollTop;
scroller.scrollTop = scroller.scrollHeight;
const after = scroller.scrollTop;
console.log("[follow-apply]", {
  before,
  assigned: scroller.scrollHeight,
  after,
  applied: after > before ? after - before : 0,
  clampedBy: scroller.scrollHeight - after,
  d_after: scroller.scrollHeight - after - scroller.clientHeight,
});
```

그런데 "**로그를 추가하니 잘 되네?**" 라는 반응이 돌아왔다. 수치도 완벽했다.

| Turn | before → after | applied | clampedBy | d_after |
|------|---------------|---------|-----------|---------|
| 1 | 153.5 → 218.5 | 65 | scrollH-maxScrollTop | 0 |
| 2 | 1009 → 1090 | 81 | 동상 | 0 |
| 3 | 1351 → 1433.5 | 82.5 | 동상 | 0 |

즉 scrollTop 할당은 **정상적으로 먹히고 있었고**, 브라우저가 `scrollHeight`를 `scrollHeight - clientHeight`(maxScrollTop)로 clamp한 값까지 이동한 뒤 이후엔 applied=0(이미 바닥)이었다.

### 4. 왜 코드 동등한데 이제야 동작했을까

추정되는 원인 셋.

1. **HMR 누적 상태**: 개발 중 Fast Refresh가 반복되면서 useEffect cleanup이 불완전하게 일어나고, `setInterval` 또는 ref가 stale 상태로 남았을 가능성. 하드 리프레시로 해소됐다.
2. **effect deps 재평가로 fresh mount**: 로그를 추가하면서 함수 내부가 바뀌었고, 이게 effect를 완전히 재생성하는 계기가 됐을 수 있다.
3. **병행 작업의 구조 정리 기여**: 같은 시점에 다른 세션이 ChatArea 컴포넌트를 분할했다. scroller 경로 자체가 더 명확해졌을 가능성이 있다.

어느 쪽이든 실제 확증은 **"할당이 실효하는지 계측"**으로만 가능했다. 로그가 원인이 아니라, 로그가 원인을 보게 해줬다.

### 5. 계측 로그 템플릿

scroll 관련 버그에서 자주 쓰게 될 패턴이라 기록해 둔다.

- `event=start`: scroller DOM 정보 (tagName, className 일부, computed overflowY, 초기 scrollH/clientH/scrollTop, maxScrollTop) — **올바른 요소인지 + 실제로 overflow 가능한지**
- `event=transition`: 상태 전이 순간만 기록 (on/off 진입 시점)
- `apply` 계열: `before → assigned → after`, `applied`, `clampedBy`, `d_after` — **할당이 먹히는지 vs clamp만 일어나는지**
- 스팸 방지: 전이 직후 1회 + N회(예: 10회)에 1번만 출력

## 정리

- **임계값 기반 판정은 "연속 값이 임계에 정확히 수렴"하는 가정에 약하다.** 폴링 간격에서 놓치면 잠기는 조건은 피한다. 가능하면 히스테리시스 있는 단일 축 판정이 낫다.
- **"코드 동일한데 왜 이제 되지?"의 답은 대부분 실행 환경**이다. HMR/Fast Refresh는 개발 중 상태를 누적시키고, 테스트가 녹색이어도 브라우저 동작은 다를 수 있다. 의심이 생기면 하드 리프레시.
- **스크롤 버그는 "할당이 실효하는지"를 먼저 확증한다.** `scrollTop` 대입은 브라우저가 조용히 clamp하거나, 엉뚱한 요소에 적용되거나, 다른 곳에서 덮어쓰일 수 있다. before/after/clampedBy 삼총사로 계측.
- **테스트 통과 ≠ 동작한다.** jsdom 기반 hook 테스트는 scrollTop 할당이 그대로 반영되지만 실제 브라우저는 다르다. 실측 로그가 단위 테스트보다 강한 증거다.
