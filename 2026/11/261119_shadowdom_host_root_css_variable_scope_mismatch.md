---
type: "content"
domain: "frontend"
category: "css"
topic: "ShadowDOM 경계에서 :host 와 하위 CSS 변수 스코프가 갈려 테마 색상이 전달되지 않은 버그 수정"
updatedAt: "2026-11-19"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "shadow-dom"
  - "css-custom-properties"
  - "css-cascade"
  - "theme"
  - "regression-test"

relatedCategories:
  - "javascript"
---

# ShadowDOM 경계에서 :host 와 하위 CSS 변수 스코프가 갈려 테마 색상이 전달되지 않은 버그 수정

> plugin-builder 테마 샘플에서 버튼 색이 투명하게 나왔다. 버튼 컴포넌트가 `var(--color-primary)`를 직접 읽도록 Kit 라이브러리가 바뀌었는데, 서버가 테마 색을 주입하는 자리(`.ks-root`)와 버튼이 실제로 렌더되는 자리(ShadowDOM `:host`) 사이에 CSS 변수가 전달되지 않았다.

## 배경

Kit 1.7.0부터 버튼 컴포넌트가 `var(--color-primary)`를 직접 참조하도록 바뀌었다. 테마 샘플은 서버에서 생성한 CSS로 `.ks-root`에 테마 색상 변수를 선언해 두는 구조였는데, 이 변경 이후 샘플의 primary·secondary 버튼이 전부 투명하게 나오는 버그가 생겼다.

## 핵심 내용

**ShadowDOM 경계는 `:host`에서 끊긴다**: ShadowDOM 안의 요소는 바깥 문서의 CSS를 상속받지 못한다. 커스텀 프로퍼티(CSS 변수)도 예외가 아니다 — 변수가 선언된 위치가 ShadowDOM 경계 바깥이거나, 경계 안이라도 실제로 그 값을 읽는 요소의 상위 체인에 없으면 변수는 보이지 않고 `var()`는 기본값(없으면 미지정)으로 떨어진다.

**문제는 ":host 안인가 밖인가"가 아니라 "그 변수를 읽는 요소의 조상인가"였다**: `.ks-root`는 ShadowDOM 안에 있었지만 `:host` 요소 자체의 하위가 아니라 형제 위치에 가까운 구조였다. 즉 `.ks-root`에 선언한 변수는 `.ks-root` 자신과 그 자손에게만 보이고, `:host`를 거쳐 렌더되는 버튼 쪽 CSS 트리에는 전달되지 않았다.

**수정은 변수 선언 위치를 버튼이 실제로 상속받는 자리로 옮기는 것**: 서버 쪽 샘플 CSS 생성기(`sampleThemeOf`)가 테마 색상 변수 대입을 `.ks-root` CSS 규칙 자체에 포함하도록 고쳤다. 라이트·다크 두 샘플 모두에서 버튼 색이 정상으로 돌아왔다.

**재발 방지는 수치로 테스트에 박았다**: e2e 테스트에 라이트 테마 primary 버튼 색상 값(`#4156f2`)과 전체 샘플 개수(52→64, BT3 테마 추가분 포함)를 직접 검증하도록 추가했다. 색상값을 스냅샷이 아니라 명시적 비교로 넣어, 같은 종류의 스코프 누락이 다시 생기면 투명 버튼이 아니라 테스트 실패로 먼저 드러나게 했다.

## 정리

ShadowDOM 안에서 CSS 변수가 전달되지 않을 때, 원인을 "ShadowDOM이라 막혔다"로 뭉뚱그리면 안 된다. 변수를 선언한 요소와 그 값을 읽는 요소 사이에 실제 조상-자손 관계가 있는지를 DOM 트리 기준으로 확인해야 한다. 라이브러리가 CSS 변수를 직접 참조하도록 바뀌는 시점은 이런 스코프 가정이 깨지기 가장 쉬운 지점이다 — 기존에는 다른 방식(인라인 스타일, 클래스 토글 등)으로 값이 전달되다가 변수 참조로 바뀌면서 비로소 스코프 문제가 드러난다.
