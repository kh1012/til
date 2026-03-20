---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "React + SVG로 외부 라이브러리 없이 인터랙티브 차트 구현하기"
updatedAt: "2026-03-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "svg"
  - "react"
  - "chart"
  - "tooltip"
  - "hover"
  - "data-visualization"
  - "no-dependency"

relatedCategories:
  - "typescript"
  - "css"
  - "performance"
---

# React + SVG로 외부 라이브러리 없이 인터랙티브 차트 구현하기

> Chart.js나 Recharts 없이 순수 SVG + React state로 호버 툴팁이 있는 스택 바 차트, 빈도 그래프, 타임라인을 구현한 경험 정리.

## 배경

AI SDK 스트리밍 디버그 패널의 Visualization 탭에 SSE 이벤트 타입별 분포, 시간축 빈도 그래프, 타임라인 바를 추가해야 했다. 외부 차트 라이브러리를 쓰면 번들 사이즈가 불필요하게 커지고, 디버그 도구 특성상 가벼워야 하므로 순수 SVG로 구현하기로 결정했다.

## 핵심 내용

### 1. SVG viewBox + preserveAspectRatio로 반응형 처리

```tsx
<svg
  viewBox={`0 0 ${W} ${H}`}
  className="w-full cursor-crosshair"
  style={{ height: 100 }}
  preserveAspectRatio="none"
>
```

- `viewBox`로 내부 좌표계를 고정 (예: 1000×120)하고, CSS `width: 100%`로 컨테이너에 맞춤
- `preserveAspectRatio="none"`이면 가로/세로 비율 무시하고 늘어남 — 바 차트에 적합
- `style={{ height }}`로 실제 렌더링 높이만 지정

### 2. 호버 시 마우스 → 데이터 매핑 패턴

SVG `<title>`만으로는 표현력이 부족하다. React state + 절대위치 div 오버레이가 훨씬 유연하다.

```tsx
const containerRef = useRef<HTMLDivElement>(null);
const [hover, setHover] = useState<HoverInfo | null>(null);

const handleMouseMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const xRatio = (e.clientX - rect.left) / rect.width;

  // xRatio → 데이터 인덱스 또는 시간값으로 변환
  const bucketIndex = Math.floor(xRatio * BUCKET_COUNT);

  // 컨테이너 기준 상대 좌표 계산 (툴팁 위치용)
  const containerRect = containerRef.current?.getBoundingClientRect();
  setHover({
    x: e.clientX - containerRect.left,
    y: e.clientY - containerRect.top,
    data: buckets[bucketIndex],
  });
}, [buckets]);
```

핵심 포인트:
- **SVG의 `getBoundingClientRect()`로 마우스 비율 계산** → viewBox 좌표계와 무관하게 동작
- **컨테이너 기준 상대 좌표**로 툴팁 위치 지정 → `position: absolute` 활용
- `useCallback`으로 매 렌더링마다 새 함수 생성 방지

### 3. 공통 ChartTooltip 컴포넌트

```tsx
function ChartTooltip({ x, y, visible, children }) {
  if (!visible) return null;
  return (
    <div
      className="pointer-events-none absolute z-50"
      style={{ left: x + 12, top: y - 8 }}
    >
      {children}
    </div>
  );
}
```

- `pointer-events-none` — 툴팁이 마우스 이벤트를 가로채지 않음
- 오프셋 `+12, -8` — 커서와 겹치지 않도록
- `children`으로 차트별 다른 내용 렌더링

### 4. 스택 바 차트에서 호버 강조 패턴

```tsx
{typeCounts.map((tc) => (
  <div
    style={{
      flexGrow: tc.pct,
      backgroundColor: tc.color,
      opacity: hover === null || hover.item.type === tc.type ? 1 : 0.4,
      transform: hover?.item.type === tc.type ? "scaleY(1.3)" : "scaleY(1)",
    }}
    onMouseEnter={(e) => handleSegmentEnter(e, tc)}
    onMouseMove={(e) => handleSegmentMove(e, tc)}
    onMouseLeave={handleMouseLeave}
  />
))}
```

- 호버 대상만 `opacity: 1`, 나머지 `0.4`로 dimming
- `scaleY(1.3)` 으로 호버 세그먼트 시각적 강조
- `flexGrow`로 비율 기반 너비 — `width` 퍼센트 계산 불필요

### 5. 타임라인에서 "가장 가까운 이벤트" 찾기

```tsx
const targetTime = minTime + xRatio * range;
let closest = entries[0];
let closestDist = Math.abs(closest.hrTime - targetTime);
for (const entry of entries) {
  const dist = Math.abs(entry.hrTime - targetTime);
  if (dist < closestDist) {
    closest = entry;
    closestDist = dist;
  }
}
```

이벤트가 불규칙하게 분포하므로 인덱스 기반이 아닌 시간 기반 최근접 탐색이 필요하다. 2000개 이하라 선형 탐색으로 충분하지만, 대량이면 이진 탐색으로 전환 가능.

### 6. 빈 상태 처리: null 반환 vs placeholder

```tsx
// Bad — 데이터 없어도 "대기 중..." 표시
if (!tokenUsage) {
  return <div>대기 중...</div>;
}

// Good — 데이터 없으면 섹션 자체를 숨김
if (!tokenUsage && !modelId && !finishReason) {
  return null;
}
```

빈 상태 메시지는 최상위 컨테이너에서 한 번만 표시하고, 하위 컴포넌트는 데이터 없으면 `null` 반환이 깔끔하다.

## 정리

- 디버그 도구처럼 가벼워야 하는 UI에서는 Chart.js/Recharts 대신 **순수 SVG**가 번들 사이즈 0 추가로 충분히 실용적이다.
- SVG `viewBox` + CSS `width: 100%`로 반응형이 자연스럽고, `getBoundingClientRect()` 비율 계산으로 마우스-데이터 매핑이 간단하다.
- 호버 툴팁은 SVG `<title>` 대신 **React state + absolute div** 패턴이 스타일링과 콘텐츠 자유도가 훨씬 높다.
- `pointer-events-none`은 오버레이 UI의 필수 속성 — 없으면 마우스 이벤트를 가로채서 flickering 발생.
