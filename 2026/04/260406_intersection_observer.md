---
draft: true
type: "content"
domain: "frontend"
category: "javascript"
topic: "IntersectionObserver API 기본 사용법과 옵션"
updatedAt: "2026-04-06"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "IntersectionObserver"
  - "viewport"
  - "lazy loading"
  - "scroll detection"
  - "threshold"

relatedCategories:
  - "browser-api"
  - "performance"
  - "react"
---

# IntersectionObserver API

> 요소가 뷰포트(또는 특정 컨테이너)에 들어오고 나가는 것을 비동기적으로 감지하는 브라우저 API

## 배경

스크롤 이벤트 없이 요소의 가시성을 효율적으로 감지하고 싶어서 학습했다. 무한 스크롤, lazy loading, 애니메이션 트리거 등에 두루 쓰인다.

## 핵심 내용

### 기본 사용법

```js
const observer = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      console.log('요소가 화면에 보임:', entry.target);
    }
  });
});

observer.observe(document.querySelector('#target'));
```

### 옵션

```js
const observer = new IntersectionObserver(callback, {
  root: null,
  rootMargin: '0px',
  threshold: 0,
});
```

| 옵션 | 기본값 | 설명 |
|------|--------|------|
| `root` | `null` | 교차를 판단할 기준 요소. `null`이면 브라우저 뷰포트 |
| `rootMargin` | `"0px"` | root의 마진. CSS margin 문법과 동일. `"100px 0px"`처럼 미리 감지 영역을 확장할 수 있다 |
| `threshold` | `0` | 콜백 실행 기준 비율. `0`은 1px이라도 보이면, `1.0`은 완전히 보여야 실행. 배열로 여러 단계 지정 가능 |

### threshold 예시

```js
// 25% 단위로 콜백 실행
const observer = new IntersectionObserver(
  (entries) => {
    entries.forEach((entry) => {
      console.log(`가시 비율: ${entry.intersectionRatio}`);
    });
  },
  { threshold: [0, 0.25, 0.5, 0.75, 1.0] }
);
```

### entry 객체 주요 속성

| 속성 | 설명 |
|------|------|
| `isIntersecting` | 현재 교차 상태 여부 |
| `intersectionRatio` | 교차 비율 (0~1) |
| `target` | 관찰 대상 요소 |
| `boundingClientRect` | 대상 요소의 사각형 정보 |
| `rootBounds` | root 요소의 사각형 정보 |

### 정리 (cleanup)

```js
// 특정 요소 관찰 중지
observer.unobserve(element);

// 모든 관찰 중지
observer.disconnect();
```

### 실습 아티팩트

https://claude.ai/public/artifacts/f85d91b1-6e2f-42eb-9a3b-f37d0117c892

## 정리

- `scroll` 이벤트 대비 성능이 좋다 — 브라우저가 비동기로 최적화해서 처리
- `rootMargin`으로 미리 감지하면 lazy loading이 자연스러워진다
- `threshold` 배열로 세밀한 스크롤 애니메이션 제어가 가능하다
