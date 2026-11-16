---
type: "content"
domain: "frontend"
category: "css"
topic: "카테고리 탭 넘침 판정에서 scrollWidth 비교를 마지막 자식의 실제 경계 비교로 바꾼 결정"
updatedAt: "2026-11-15"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "overflow-detection"
  - "scrollwidth"
  - "getboundingclientrect"
  - "absolute-positioning"
  - "popover"

relatedCategories:
  - "ui-ux"
---

# 카테고리 탭 넘침 판정에서 scrollWidth 비교를 마지막 자식의 실제 경계 비교로 바꾼 결정

> `shell/src/home/cat-tabs.tsx`의 카테고리 탭 줄은 넘침 여부를 `el.scrollWidth <= el.clientWidth`로 판정해 "..." 메뉴로 접었다. 정렬 기준 팝오버를 열면 팝오버가 탭 줄 안에 절대 위치로 떠서 `scrollWidth`를 부풀렸고, 실제 탭들은 자리가 남아 있는데도 넘침으로 오판되어 탭이 접혔다. 판정 기준을 `scrollWidth` 비교에서 마지막 in-flow 자식의 `getBoundingClientRect()` 우측 경계와 컨테이너 우측 경계(패딩 제외) 비교로 바꿔 고쳤다.

## 배경

카테고리 탭 줄은 공간이 모자르면 뒤쪽 탭들을 "..." 메뉴로 접는 컴포넌트다. 넘침 여부는 지금까지 `scrollWidth <= clientWidth`로 봤다 — 실제 콘텐츠 너비가 보이는 너비보다 크면 넘친 것으로 본다는, 흔히 쓰는 방식이다. 그런데 정렬 기준 버튼을 눌러 팝오버가 열리면, 그 팝오버가 탭 줄 엘리먼트 안에 `position: absolute`로 떠서 자리를 잡는다. `scrollWidth`는 절대 위치 자식도 포함해서 측정하기 때문에, 팝오버가 줄 오른쪽 밖으로 삐져나가 있으면 `scrollWidth`가 실제 탭들의 너비와 무관하게 커진다. 그 결과 탭들 자체는 자리가 남는데도 "넘쳤다"고 판정되어 "사내" 같은 탭이 "..." 뒤로 숨었다.

## 핵심 내용

**`scrollWidth`는 in-flow와 절대 위치를 구분하지 않는다**: `scrollWidth`는 엘리먼트 안에 렌더링된 모든 콘텐츠(절대 위치 자식 포함)가 차지하는 전체 너비를 센다. 넘침을 판정하려는 대상이 "줄 안에 순서대로 나열된 탭들"인데, 측정 대상은 "줄 안의 모든 자식"이라 둘이 어긋났다. 팝오버·툴팁처럼 레이아웃 흐름에서 빠져나와 떠 있는 요소가 하나라도 있으면 `scrollWidth` 기반 판정은 그 요소의 위치에 흔들린다.

**고친 기준은 "마지막으로 줄에 서 있는 자식이 컨테이너 경계를 넘는가"**: `rowOverflows(el)` 함수를 새로 만들어, 마지막 자식(실제로 줄에 쌓이는 in-flow 탭)의 `getBoundingClientRect()` 우측 좌표를 컨테이너의 우측 좌표(패딩 뺀 값)와 비교한다. 이 값은 절대 위치 자식이 몇 개 떠 있든, 어디에 떠 있든 영향을 받지 않는다 — in-flow 레이아웃 흐름만 본다.

**단위 테스트로 두 경우를 가른다**: `cat-tabs.fit.test.ts`에 `getBoundingClientRect()`와 `getComputedStyle()`을 모킹해서, (1) `scrollWidth`가 520~600으로 부풀어도 마지막 자식이 컨테이너 안(480 경계)에 있으면 넘침이 아님, (2) 마지막 자식이 경계를 1px만 넘어도 넘침, (3) 자식이 없거나 패딩을 못 읽으면 0으로 처리, 세 경우를 확인한다. 테스트는 DOM 없이 좌표값만 모킹해서 돌아간다.

## 정리

컨테이너 하나의 "넘침"을 하나의 스칼라 값(`scrollWidth` vs `clientWidth`)으로 재려 하면, 그 컨테이너 안에 레이아웃 흐름을 벗어난 자식(절대 위치, 트랜스폼 등)이 있는 순간 그 값은 더 이상 "원하는 콘텐츠의 넘침"을 가리키지 않는다. 넘침을 가려야 할 대상이 명확하면(여기서는 "마지막 in-flow 탭"), 그 대상의 실제 경계를 직접 재는 쪽이 안전하다. 팝오버·배지·툴팁처럼 떠 있는 요소를 같은 컨테이너에 넣는 레이아웃을 짤 때 다시 떠올릴 지점이다.
