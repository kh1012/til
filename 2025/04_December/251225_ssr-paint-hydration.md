---
type: "skill"
domain: "frontend"
category: "react"
topic: "ssr-browser-paint-hydration-sequence"
updatedAt: "2025-12-25"

satisfaction:
  score: 85
  reason: SSR→페인트→하이드레이션을 시간축으로 분해해 설명 가능한 상태가 되었고, 이후 렌더링/상호작용 이슈 디버깅의 기준점을 문서로 작성했다.

keywords:
  - "SSR"
  - "Browser Rendering"
  - "First Paint"
  - "Hydration"
  - "Next.js"
  - "React18"
  - "useEffect"
  - "useLayoutEffect"

relatedCategories:
  - "nextjs"
  - "performance"
  - "rendering"
---

# SSR부터 브라우저 페인팅, React 하이드레이션까지의 실제 실행 순서

서버는 보여줄 수 있는 HTML을 먼저 내려주고, 브라우저는 JS 없이도 가능한 렌더링(페인팅)을 끝낸 뒤, 마지막에 React가 기존 DOM에 이벤트와 상태를 연결(hydration)한다.  
보이는 시점(First Paint)과 동작하는 시점(Hydration Complete)은 다르며, 이 시간차를 이해하지 못하면 화면은 보이는데 클릭이 안 되거나 스타일이 깜빡이는 문제를 반복해서 만든다.

## 전체 시퀀스

User        Browser          Server (Next.js)        React Runtime
 |             |                     |                     |
 |  URL 입력   |                     |                     |
 |------------>|                     |                     |
 |             |  HTTP 요청          |                     |
 |             |-------------------->|                     |
 |             |                     |  SSR / RSC 렌더     |
 |             |                     |-------------------->|
 |             |                     |                     |
 |             |  HTML 응답           |                     |
 |             |<--------------------|                     |
 |             |                     |                     |
 |             |  HTML 파싱           |                     |
 |             |  DOM 생성            |                     |
 |             |  CSS 다운로드        |                     |
 |             |  Layout / Paint      |                     |
 |             |  (First Paint)       |                     |
 |             |                     |                     |
 |             |  JS 번들 로드        |                     |
 |             |------------------------------------------->|
 |             |                     |                     |
 |             |                     |  Hydration 시작     |
 |             |                     |<--------------------|
 |             |                     |  이벤트 연결        |
 |             |                     |  상태 바인딩        |
 |             |                     |                     |
 |             |  상호작용 가능       |                     |
 |             |<-------------------------------------------|

## 단계별 실제 동작

### 1) 서버 사이드 (SSR)

- 요청 수신
- 라우트 및 데이터 결정
- React 트리 서버 렌더
- HTML, CSS 링크, JS 번들 로드 스크립트 전달

이 단계의 목적은 단 하나다.  
JS 없이도 브라우저가 화면을 그릴 수 있게 만드는 것.

### 2) 브라우저 렌더링 (First Paint)

- HTML 파싱 → DOM 생성
- CSS 다운로드 → CSSOM 생성
- DOM + CSSOM → Render Tree
- Layout → Paint → Composite

이 시점에서 이미 화면은 보인다.  
하지만 아직 React는 개입하지 않았다.

### 3) JavaScript 실행 & Hydration

- JS 번들 다운로드 및 실행
- React 런타임 로드
- 서버 DOM 재사용
- 이벤트 핸들러 연결
- 상태 초기화 및 바인딩

이 시점부터 실제 상호작용이 가능해진다.

## 자주 발생하는 문제와 원인

### 화면은 보이는데 클릭이 안 되는 경우

First Paint 이후 Hydration이 끝나지 않은 상태일 수 있다.  
원인은 보통 번들 과다, 하이드레이션 범위 과도, 메인 스레드 바쁨이다.

### 하이드레이션 미스매치

서버 HTML과 클라이언트 렌더 결과가 다르면 경고가 뜨거나 해당 영역이 재렌더링된다.  
대표 원인은 랜덤 값, 시간, 브라우저 API 접근, 서버/클라 조건 분기 불일치다.

### useEffect와 useLayoutEffect 타이밍 차이

- useEffect는 페인트 이후 실행되므로 “첫 화면에 반영돼야 하는 변화”를 여기서 처리하면 깜빡임이 생기기 쉽다.
- useLayoutEffect는 페인트 이전 동기 실행이라 레이아웃 보정에 유리하지만 초기 렌더를 막을 수 있다.

## Next.js 맥락 정리

use client 컴포넌트라도 서버에서 내려온 HTML과 CSS는 먼저 페인트될 수 있고, 이후 React 하이드레이션이 진행된다.  
즉 CSR 선언 여부와 First Paint는 별개다.

## 정리

렌더링 흐름을 시간 축으로 분해해두면, 문제는 감이 아니라 단계 단위로 추적 가능한 현상이 된다.  
앞으로는 “어느 단계에서 깨졌는지”를 먼저 특정하고 그 단계에 맞는 해결책을 적용하면 된다.