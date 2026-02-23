---
type: "content"
domain: "frontend"
category: "javascript"
topic: "virtualizer"
updatedAt: "2026-02-23"

satisfaction:
  score: 100
  reason: "가상화의 기본!"

keywords:
  - "performance"
  - "DOM"
  - "Virtualizer"

relatedCategories:
  - "javascript"
  - "typescript"
  - "react"
  - "tanstack-query"
---

# Virtualizer (가상화)

## 목차

1. [가상화란 무엇인가?](#1-가상화란-무엇인가)
2. [왜 가상화가 필요한가?](#2-왜-가상화가-필요한가)
3. [가상화의 핵심 원리](#3-가상화의-핵심-원리)
4. [TanStack Virtual 라이브러리](#4-tanstack-virtual-라이브러리)

---

## 1. 가상화란 무엇인가?

### 일반적인 리스트 렌더링의 문제

일반적으로 리스트를 화면에 보여줄 때, 우리는 모든 데이터를 한 번에 DOM에 렌더링한다.

```tsx
// 일반적인 방식: 1000개 코인이면 1000개의 <CoinRow>가 전부 DOM에 생성됨
{coins.map((coin) => (
  <CoinRow key={coin.id} coin={coin} />
))}
```

이 방식은 데이터가 적을 때는 문제가 없다.  
하지만 1,000개, 10,000개의 아이템이 있다면? 브라우저는 그 수만큼의 DOM 노드를 생성하고 관리해야 한다.  
사용자가 실제로 **화면에서 보고 있는 것은 10~20개 정도**인데도 말이다.

### 가상화의 아이디어

**가상화(Virtualization)** 는 이 문제를 해결하는 기법이다.  
핵심 아이디어는 단순하다.
> **화면에 보이는 아이템만 실제 DOM에 렌더링하고, 나머지는 렌더링하지 않는다.**

1,000개의 데이터가 있어도,   
사용자가 스크롤해서 실제로 볼 수 있는 건 10~15개뿐이다.  
가상화는 그 10~15개 + 약간의 여유분(overscan)만 실제 DOM에 만들어 둔다.   
사용자가 스크롤하면, 화면 밖으로 나간 아이템은 DOM에서 제거되고, 새로 보여야 할 아이템이 DOM에 추가된다.

```
전체 리스트 (1000개)        실제 DOM (약 15~20개만)
┌──────────────┐
│  item 0      │           (렌더링 안 함)
│  item 1      │           (렌더링 안 함)
│  ...         │           (렌더링 안 함)
│  item 48     │           ← overscan 영역
│  item 49     │           ← overscan 영역
├──────────────┤ ◄── 뷰포트 상단
│  item 50     │           ← 화면에 보임
│  item 51     │           ← 화면에 보임
│  item 52     │           ← 화면에 보임
│  ...         │           ← 화면에 보임
│  item 59     │           ← 화면에 보임
├──────────────┤ ◄── 뷰포트 하단
│  item 60     │           ← overscan 영역
│  item 61     │           ← overscan 영역
│  item 62     │           (렌더링 안 함)
│  ...         │           (렌더링 안 함)
│  item 999    │           (렌더링 안 함)
└──────────────┘
```

---

## 2. 왜 가상화가 필요한가?

### 성능 관점

| 항목 | 가상화 없음 (1,000개) | 가상화 적용 |
|------|----------------------|------------|
| DOM 노드 수 | ~1,000개 | ~20개 |
| 초기 렌더링 시간 | 느림 | 빠름 |
| 메모리 사용량 | 높음 | 낮음 |
| 스크롤 성능 | 프레임 드랍 발생 가능 | 부드러움 |
| 리렌더링 비용 | 전체 리스트 대상 | 보이는 영역만 대상 |

### 구체적인 문제 상황

1. **초기 로딩 지연**: 수천 개의 DOM 노드를 한 번에 생성하면 페이지가 멈춘 것처럼 보인다.
2. **메모리 폭증**: 각 DOM 노드는 메모리를 차지한다. 이미지가 포함되면 더 심각하다.
3. **스크롤 버벅임**: 브라우저가 수천 개 노드의 레이아웃을 계산하느라 60fps를 유지하지 못한다.

---

## 3. 가상화의 핵심 원리

가상화가 동작하려면 몇 가지 핵심 구성 요소가 필요하다.

### 3-1. 스크롤 컨테이너 (Scroll Container)

스크롤이 발생하는 부모 요소이다. 이 요소에 `overflow: auto`(또는 `scroll`)가 설정되어 있어야 한다.

```
┌─────────────────────┐ ◄── 스크롤 컨테이너 (고정 높이, overflow: auto)
│                     │
│  (보이는 영역)       │     사용자가 실제로 보는 부분
│                     │
└─────────────────────┘
```

코드에서는 `parentRef`가 이 역할을 한다:

```tsx
<div ref={parentRef} className="h-full overflow-auto">
```

### 3-2. 전체 높이를 가진 내부 컨테이너 (Total Size Container)

가상화의 **트릭**이 여기에 있다. 실제로는 20개만 렌더링하지만,  
전체 1,000개가 있는 것처럼 **스크롤바 높이를 유지**해야 한다.  
이를 위해 내부에 전체 리스트의 총 높이만큼의 빈 컨테이너를 배치한다.

```
스크롤 컨테이너
┌─────────────────────┐
│ 내부 컨테이너         │  height = 아이템 개수 × 아이템 높이
│ (예: 82,000px)       │  예: 1000개 × 82px = 82,000px
│                     │
│  실제 아이템들은       │  이 안에 absolute로 배치
│  여기 안에 떠 있음     │
│                     │
└─────────────────────┘
```

코드에서는:

```tsx
<div
  style={{
    height: `${virtualizer.getTotalSize()}px`,  // 전체 높이 (예: 82,000px)
    width: '100%',
    position: 'relative',  // 자식의 absolute 배치 기준
  }}
>
```

### 3-3. 절대 위치로 배치된 아이템 (Absolutely Positioned Items)

각 아이템은 `position: absolute`로 배치된다. 일반적인 문서 흐름(flow)을 따르지 않고, 정확한 `Y` 위치에 직접 배치된다.

```
내부 컨테이너 (position: relative)
┌─────────────────────────────┐  0px
│                             │
│                             │
│  ┌───────────────────────┐  │  4100px  ← translateY(4100px)
│  │  item 50              │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │  4182px  ← translateY(4182px)
│  │  item 51              │  │
│  └───────────────────────┘  │
│  ┌───────────────────────┐  │  4264px  ← translateY(4264px)
│  │  item 52              │  │
│  └───────────────────────┘  │
│                             │
│                             │
└─────────────────────────────┘  82000px
```

코드에서는:

```tsx
<div
  style={{
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    transform: `translateY(${virtualItem.start}px)`,  // Y 위치 지정
  }}
>
```

> **왜 `top`이 아니라 `transform: translateY`를 사용하는가?**
>
> `top` 속성을 바꾸면 브라우저가 **레이아웃(layout)** 단계를 다시 수행한다.   
> 반면 `transform`은 **합성(compositing)** 단계에서만 처리되므로 GPU 가속을 받아 훨씬 빠르다.   
> 스크롤할 때마다 위치가 바뀌므로, 이 성능 차이가 체감된다.  

### 3-4. 스크롤 이벤트 감지와 재계산

사용자가 스크롤하면:

1. 스크롤 컨테이너의 `scrollTop` 값을 읽는다.
2. 현재 뷰포트에 보여야 할 아이템의 인덱스 범위를 계산한다.
3. 해당 범위의 아이템만 렌더링한다 (+ overscan).
4. 각 아이템의 `translateY` 값을 계산하여 올바른 위치에 배치한다.

이 모든 과정을 TanStack Virtual 라이브러리가 자동으로 처리해준다.

---

## 4. TanStack Virtual 라이브러리

### 소개

`@tanstack/react-virtual`은 React용 가상화 라이브러리이다.   
`useVirtualizer`라는 훅(Hook)을 제공하며, 이 훅이 "어떤 아이템을 어디에 렌더링해야 하는지"를 계산해준다.

### useVirtualizer 훅의 설정

```tsx
const virtualizer = useVirtualizer({
  count: data.length,                    // 전체 아이템 수
  getScrollElement: () => parentRef.current, // 스크롤 컨테이너 DOM 참조
  estimateSize: () => COIN_ROW_HEIGHT.base,  // 각 아이템의 예상 높이 (82px)
  overscan: 5,                            // 뷰포트 밖에 추가로 렌더링할 개수
});
```

각 옵션을 상세히 살펴보자:

#### `count`

```tsx
count: data.length
```

가상화할 전체 아이템의 수이다.  
라이브러리는 이 값을 기반으로 전체 리스트의 총 높이를 계산한다.

- 예: `count = 1000`, `estimateSize = 82px` → 총 높이 = 82,000px

#### `getScrollElement`

```tsx
getScrollElement: () => parentRef.current
```

스크롤 이벤트를 감지할 DOM 요소를 반환하는 함수이다.   
라이브러리는 이 요소의 `scrollTop`, `clientHeight` 등을 읽어 현재 보이는 영역을 파악한다.

#### `estimateSize`

```tsx
estimateSize: () => COIN_ROW_HEIGHT.base  // 82px
```

각 아이템의 **예상 높이**를 반환하는 함수이다.  
"예상"인 이유는, 실제 렌더링 전에는 정확한 높이를 알 수 없기 때문이다.  
이 값은 초기 계산과 아직 측정되지 않은 아이템의 위치를 결정하는 데 사용된다.

> 프로젝트에서는 `COIN_ROW_HEIGHT`를 `{ base: 82, sm: 86, lg: 90 }`으로 정의하고 있다.  
> 반응형 디자인에서 화면 크기에 따라 행 높이가 달라질 수 있음을 의미한다.  
> 가상화에는 `base(82px)`를 예상 높이로 사용한다.

#### `overscan`

```tsx
overscan: 5
```

뷰포트 위/아래에 **추가로 렌더링**할 아이템 수이다.  
이것이 없으면 스크롤 시 아이템이 나타나기 전에 빈 공간이 잠깐 보일 수 있다(플리커링).  
overscan은 이를 방지하는 **버퍼** 역할을 한다.

```
overscan = 5일 때:

  item 45  ─┐
  item 46   │ 위쪽 overscan (5개)
  item 47   │ 아직 화면에 안 보이지만 미리 렌더링
  item 48   │
  item 49  ─┘
  ──────────── 뷰포트 상단 ──────────
  item 50   │
  item 51   │ 실제로 보이는 영역
  item 52   │
  ...       │
  item 59   │
  ──────────── 뷰포트 하단 ──────────
  item 60  ─┐
  item 61   │ 아래쪽 overscan (5개)
  item 62   │ 아직 화면에 안 보이지만 미리 렌더링
  item 63   │
  item 64  ─┘
```

### virtualizer가 반환하는 핵심 값들

#### `virtualizer.getVirtualItems()`

현재 렌더링해야 할 **가상 아이템 목록**을 반환한다.  
각 가상 아이템은 다음 정보를 가진다:

```tsx
interface VirtualItem {
  index: number;  // 원본 배열에서의 인덱스 (예: 50)
  start: number;  // 이 아이템의 Y 시작 위치 (예: 4100px)
  size: number;   // 이 아이템의 높이 (예: 82px)
  end: number;    // 이 아이템의 Y 끝 위치 (예: 4182px)
  key: string;    // 고유 키
}
```

코드에서는:

```tsx
const virtualItems = virtualizer.getVirtualItems();

// 각 virtualItem을 순회하며 렌더링
{virtualItems.map((virtualItem) => {
  const coin = coins[virtualItem.index];  // index로 원본 데이터 접근
  // ...
  transform: `translateY(${virtualItem.start}px)` // start로 위치 지정
})}
```

#### `virtualizer.getTotalSize()`

모든 아이템의 총 높이를 반환한다. 내부 컨테이너의 `height`에 사용된다.

#### `virtualizer.measureElement`

실제 DOM에 렌더링된 아이템의 **실제 높이를 측정**하는 함수이다. `ref`로 전달하면 해당 요소가 DOM에 마운트/업데이트될 때 자동으로 높이를 측정한다.

```tsx
<div
  ref={virtualizer.measureElement}   // 이 요소의 실제 높이를 측정
  data-index={virtualItem.index}     // measureElement가 어떤 아이템인지 알려줌
>
```

> **왜 측정이 필요한가?**
>
> `estimateSize`는 말 그대로 "추정값"이다.  
> 실제 렌더링된 높이와 다를 수 있다 (예: 긴 텍스트로 인한 줄바꿈, 반응형 디자인 등).  
> `measureElement`는 실제 높이를 측정해서 정확한 위치 계산에 반영한다.  
> `data-index` 속성을 통해 라이브러리가 어떤 가상 아이템의 높이인지 식별한다.

---

간단하지만, 참 강력하다.  
사람이 보이는 영역에 집중하는게 마치, 4k 이상의 화질을 사람의 눈으로 볼 수 없다는 것과 비슷한 느낌이랄까  
모니터로 인해 제한된 뷰포트 영역에 `집중`하는 것과 같다는 느낌을 받았다.  
translateY를 통해 GPU 가속을 이용한다는 점이 새롭게 알게 된 포인트인 듯 하다.  
목록 형태의 노드에는 무한스크롤(Intersection Observer API)와 결합하여 자연스러운 성능을 이끌어낼 수 있겠다.  
