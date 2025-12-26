---
type: "skill"
domain: "frontend"
category: "css"
topic: "flex"
updatedAt: "2025-12-27"

keywords:
  - "flex"
  - "flex-grow"
  - "flex-shrink"
  - "flex-basis"
  - "flex: 1"
  - "min-width: 0"
  - "ellipsis"
  - "layout"

relatedCategories:
  - "ui-ux"
  - "responsive"
  - "layout"
---

# Flex (CSS Flexbox)

## 요약

Flexbox는 “남는 공간 분배”와 “부족한 공간 축소”를 같은 규칙으로 처리하는 레이아웃 모델이다.
실무에서 문제를 만드는 포인트는 대부분 `flex` 단축 속성의 기본값(특히 basis)과 `min-width: auto` 기본값이다.
균등 분배가 목적이면 `flex: 1 1 0`을 쓰고, 텍스트가 안 줄어들면 `min-width: 0`을 먼저 의심한다.

## 본론

### 1) Flex의 기본 구조와 축

- `display: flex`가 선언된 부모: Flex Container
- 그 직계 자식: Flex Item
- main axis: `flex-direction` 방향(row면 가로, column이면 세로)
- cross axis: main axis에 수직인 방향

```css
.container {
  display: flex;
  flex-direction: row;
  justify-content: flex-start; /* main axis 정렬 */
  align-items: stretch;        /* cross axis 정렬 */
  gap: 12px;
}
```

### 2) flex 단축 속성: grow / shrink / basis

`flex: <grow> <shrink> <basis>`

- grow: 남는 공간이 생기면 얼마나 늘어날지(비율)
- shrink: 공간이 부족하면 얼마나 줄어들지(비율)
- basis: 계산 시작점(초기 크기)

```css
.item-a { flex: 0 1 auto; } /* 콘텐츠/width를 기준으로, 부족하면 줄어듦 */
.item-b { flex: 1 1 0; }    /* 균등 분배에 유리: 시작점을 0으로 두고 분배 */
.item-c { flex: 0 0 200px; }/* 고정: 늘지도 줄지도 않음 */
```

### 3) 자주 헷갈리는 것: flex: 1 vs 1 1 0

사람들이 “flex: 1이면 1:1:1로 나뉜다”고 착각하는데,
정확히는 basis가 무엇이냐에 따라 결과가 바뀐다.

#### 3-1) 균등 분배가 목표면: flex: 1 1 0

- basis를 0으로 두면 콘텐츠 길이에 덜 끌려간다
- “남는 공간”을 비율대로 분배하는 데 집중한다
- 카드/컬럼을 동일 폭으로 나누는 레이아웃에 적합

```css
.col {
  flex: 1 1 0;
}
```

#### 3-2) 콘텐츠를 어느 정도 존중하고 싶으면: flex: 1 1 auto

- basis가 auto면 콘텐츠/width를 먼저 확보한다
- 텍스트가 긴 요소가 기본적으로 더 크게 먹고 들어갈 수 있다

```css
.item {
  flex: 1 1 auto;
}
```

정리:
- “무조건 같은 폭”이 목적이면 `flex: 1 1 0`
- “콘텐츠 크기도 의미가 있다”면 `flex: 1 1 auto`

### 4) 레이아웃이 깨지는 진짜 원인: min-width: auto

Flex item의 기본 `min-width`는 `auto`라서,
콘텐츠가 길면 “그 콘텐츠보다 더 작아지지 않겠다”가 기본 동작이다.
그래서 아래 같은 현상이 생긴다.

- 텍스트가 줄어들지 않음
- `text-overflow: ellipsis`가 안 먹힘
- overflow가 무시되는 것처럼 보임

해결은 대부분 `min-width: 0` 한 줄이다.

```css
.item {
  flex: 1 1 0;
  min-width: 0;
}

.title {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
```

실무 규칙:
- “flex인데 말줄임이 안 된다” = 거의 항상 `min-width: 0` 누락이다

### 5) 실전 패턴 모음

#### 5-1) 좌측 고정 + 우측 유동(나머지 채우기)

```css
.left {
  flex: 0 0 240px;
}

.right {
  flex: 1 1 0;
  min-width: 0;
}
```

#### 5-2) 버튼은 고정, 인풋은 확장

```css
.input {
  flex: 1 1 0;
  min-width: 0;
}

.button {
  flex: 0 0 auto;
}
```

#### 5-3) 동일 비율 카드 3개(간격 포함)

```css
.container {
  display: flex;
  gap: 12px;
}

.card {
  flex: 1 1 0;
  min-width: 0;
}
```

### 6) 디버깅 체크리스트

- “동일 비율 분배”가 목적이면 `flex: 1 1 0`으로 고정했나?
- 텍스트/콘텐츠 때문에 안 줄어들면 `min-width: 0`이 들어갔나?
- 어떤 아이템을 고정하고 싶으면 `flex: 0 0 <size>`로 명시했나?
- cross axis에서 원치 않는 stretch가 있으면 `align-items`를 확인했나?
- overflow/ellipsis 문제는 컨테이너가 아니라 “줄어들어야 하는 아이템”에 원인이 있는가?