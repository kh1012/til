---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "react-virtuoso 스크롤 제어 함정과 탈가상화 전략"
updatedAt: "2026-04-15"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react-virtuoso"
  - "scrollIntoView"
  - "scrollend"
  - "followOutput"
  - "chat-ui"
  - "virtualization"

relatedCategories:
  - "css"
  - "nextjs"
  - "performance"
---

# react-virtuoso 스크롤 제어 함정과 채팅 UI 탈가상화 전략

> Virtuoso의 `style` prop paddingBottom은 box-sizing:border-box에서 content area를 축소시켜 scrollToIndex가 동작하지 않는다. 채팅 UI에서 100개 이하 메시지는 가상화가 오버엔지니어링일 수 있다.

## 배경

AI 채팅 앱에서 "User 메시지를 뷰포트 상단에 고정하고, 응답이 아래로 스트리밍되는" UX를 구현하려 했다. 기존 react-virtuoso 기반 MessageList에서 paddingBottom으로 스크롤 공간을 확보하려 했으나, 근본적으로 동작하지 않는 문제에 부딪혔다.

## 핵심 내용

### 1. Virtuoso `style` prop paddingBottom 함정

Virtuoso의 `style` prop으로 `paddingBottom`을 주면, `box-sizing: border-box` 하에서 **content area가 0px로 축소**된다.

```
scrollHeight === clientHeight === paddingBottom
→ scrollToIndex가 아무 동작도 하지 않음
```

디버깅 로그로 확인한 증거:
```
Phase2 ACTIVATED -> {paddingBottom: '1279px', scrollHeight: 1279, clientHeight: 1279, scrollTop: 0}
Phase2 POST-SCROLL -> {scrollTop: 0}  // 스크롤 안 됨!
```

**해결**: Virtuoso Footer(BottomSpacer) 컴포넌트의 `minHeight`로 스크롤 공간을 확보하면 Virtuoso 내부 가상화 엔진이 정상적으로 scrollHeight를 계산한다.

### 2. followOutput suppress 시 자동 추적 완전 차단

Virtuoso의 `followOutput` 콜백에서 `return false`를 하면 스트리밍 중 자동 하단 추적이 완전히 멈춘다. "user msg 상단 고정"을 위해 suppress를 걸었다가 스트리밍 추적까지 죽이는 사이드이펙트 발생.

```tsx
// 이렇게 하면 스트리밍 중 자동 추적도 같이 죽음
if (suppressFollowRef.current) return false;
```

### 3. scrollend 이벤트로 smooth scroll 완료 감지

`scrollToIndex({ behavior: "smooth" })` 후 정확한 시점에 측정하려면 `scrollend` 이벤트가 가장 신뢰적이다. setTimeout이나 rAF 체인보다 정확하다.

```tsx
el.addEventListener("scrollend", () => {
  // smooth scroll 완료 → 여기서 측정하면 정확
  const footerRect = footer.getBoundingClientRect();
  const needed = clientHeight - (footerRect.top - scrollerRect.top);
}, { once: true });
```

### 4. Claude.ai / Gemini는 가상화를 사용하지 않는다

Claude.ai DOM 구조:
```html
<div class="flex-1 flex flex-col max-w-3xl mx-auto">
  <div><!-- msg 1 --></div>
  <div><!-- msg 2 --></div>
  <div class="h-12"></div>
  <div aria-hidden style="height: 790px;"></div>  <!-- JS 동적 계산 -->
</div>
```

- 모든 메시지를 DOM에 직접 렌더링
- spacer는 JS로 정확히 계산된 inline height
- `flex-col` + `scrollIntoView`로 스크롤 제어
- 가상화 없이도 일반 채팅 대화에서 성능 문제 없음

### 5. 채팅 UI에서 가상화의 비용 대비 효과

| 항목 | 가상화 (Virtuoso) | DOM 직접 렌더 |
|------|-------------------|---------------|
| 스크롤 제어 | scrollToIndex + triple rAF + scrollend | scrollIntoView (네이티브) |
| spacer 구현 | Footer context 전달 + 복잡한 계산 | 같은 컴포넌트 내부에서 직접 |
| 자동 추적 | followOutput 콜백 | ResizeObserver + nearBottom 체크 |
| 코드 복잡도 | 높음 (5+ 파일) | 낮음 (1-2 파일) |
| 100개 메시지 성능 | 불필요 (10K DOM 노드는 브라우저 한계 대비 여유) | 충분 |

**결론**: 100개 이하 메시지에서는 가상화의 복잡성 비용이 성능 이점을 초과한다.

## 정리

- `paddingBottom`으로 Virtuoso 스크롤 공간을 확보하려면 **Footer 컴포넌트 내부**에서 해야 한다. `style` prop은 함정.
- 디버깅 로그를 추가하고 런타임 값을 공유하는 방식이 스크롤 문제 해결에 가장 효과적이었다.
- 채팅 UI에서 "당연히 가상화"라고 가정하기보다, 실제 메시지 수와 복잡도를 기준으로 판단해야 한다.
- Claude.ai, Gemini 등 실제 서비스의 DOM 구조를 분석하면 검증된 패턴을 발견할 수 있다.
