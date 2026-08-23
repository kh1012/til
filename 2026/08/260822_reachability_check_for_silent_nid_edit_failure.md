---
type: "content"
domain: "frontend"
category: "state-management"
topic: "컴포넌트 호출로 가려진 data-nid는 편집이 씹힌다 — reachability 분석으로 명시적 422로 바꾸기"
updatedAt: "2026-08-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "jsx-ast-parsing"
  - "silent-failure"
  - "reachability-analysis"
  - "conservative-detection"
  - "false-positive"

relatedCategories:
  - "typescript"
  - "testing"
---

# 컴포넌트 호출로 가려진 data-nid는 편집이 씹힌다 — reachability 분석으로 명시적 422로 바꾸기

> maxflow의 페이지 편집기는 JSX 소스에 `data-nid`를 찍어 캔버스 클릭과 소스 위치를 연결한다. 그런데 `<Bar data-nid="b" />`처럼 컴포넌트 호출부에 nid가 찍히고, `Bar` 내부가 그 props를 스프레드로 전달받지 않으면 서버는 편집을 200으로 받아 파일까지 써주지만 DOM은 절대 바뀌지 않는다 — 완전한 침묵 실패였다.

## 배경

96건의 고위험 edge case를 root-cause로 재검증하던 중 발견된 케이스다. `<Bar data-nid="b" />`는 파싱상 존재하는 nid이지만, `Bar()` 함수가 `props`를 펼치지 않으면 그 nid는 실제 DOM 어디에도 렌더링되지 않는다. 사용자가 캔버스에서 그 자리를 클릭해 편집해도 API는 성공(200)을 반환하고 소스 파일도 실제로 바뀌지만, 화면은 그대로다. 토스트도 없고 에러도 없다 — 파일과 화면이 divergence난 채로 사용자만 "왜 안 바뀌지"를 반복하게 되는 구조.

같은 세션에서 JSX 파서 자체의 선행 버그도 발견됐다: 태그 이름 추출이 `open.name?.name` 한 줄로 짜여 있어서 `<Foo>`(JSXIdentifier)는 되지만 `<Popover.Content>`(JSXMemberExpression)나 `<svg:use>`(JSXNamespacedName)는 빈 문자열로 떨어졌다. `stampNids`는 `tag.length`로 삽입 위치를 계산하므로, tag가 빈 문자열이면 `data-nid`가 엉뚱한 위치에 꽂혀 JSX가 조용히 깨졌다. Radix/Headless UI 같은 네임스페이스 컴포넌트를 쓰는 페이지 전반이 영향권이었다.

## 핵심 내용

**"어디에 있는지"보다 "DOM에 그려지는지"를 물어야 했다.** 소스에 nid가 존재하는 것과 그 nid가 실제로 렌더링되는 것은 다른 질문이다. `unreachableNids()`는 이 둘의 간극을 좁히는 함수로, 세 조건을 모두 만족할 때만 "unreachable"로 판정한다: (1) 태그가 대문자로 시작하는 컴포넌트 호출이고, (2) 그 컴포넌트가 같은 페이지 안에서 정의되어 있고, (3) 그 정의 안에 스프레드 문법(`{...props}`)이 없다. 외부 라이브러리 컴포넌트는 분석할 수 없으니 무조건 reachable로 간주하고, 스프레드가 있으면 어디로 전달되는지 몰라도 reachable로 간주한다 — false negative(진짜 문제를 놓치는 것)보다 false positive(정상 편집을 막는 것)를 더 무겁게 본 conservative 전략이다.

**첫 구현은 컴포넌트 경계를 고정폭 윈도우로 잘라서 오탐이 났다.** 스프레드 여부를 확인하려고 컴포넌트 정의 뒤 400~2000자를 슬라이스했는데, 이웃 컴포넌트의 스프레드 문법을 자기 것으로 잘못 주워버렸다. `ProjectPicker` 옆에 있는 다른 컴포넌트가 `{...props}`를 쓴다는 이유로 `ProjectPicker`가 unreachable로 오판된 것. 고정폭 대신 정규식으로 "이 컴포넌트 정의 시작 ~ 다음 컴포넌트 정의 시작"을 정확히 경계 지어서 해결했다 (gnb-only-page 11→9건, analysis-condition-preset 3→2건으로 오탐 감소).

**그 다음엔 컴포넌트 정렬 순서 자체가 문제였다.** `findComponentRoots`가 반환하는 배열은 파스 순서일 뿐 소스 위치 순서가 아니었다. 경계를 `[i, i+1]`로 자르는 로직이 이 순서를 소스 순서라고 가정하고 있어서, 순서가 뒤바뀌면 `source.slice(from, to)`가 역방향이거나 빈 문자열이 되어 스프레드 탐지가 조용히 실패했다. 시그니처를 전부 모아서 위치로 정렬한 뒤 스캔하도록 고쳐서 해결.

**검증은 phantom nid와 real nid를 나란히 놓고 했다.** `<Bar data-nid="ghost" />`(props 전달 안 함)는 편집 API가 422로 거부하며 "이 자리는 화면에 안 그려집니다 — 컴포넌트 안의 요소를 고르세요"라는 명시적 에러를 반환했고, `Bar()` 정의 내부의 `<header data-nid="bar">`는 정상적으로 200과 함께 적용됐다. 침묵 실패가 명시적 실패로 바뀐 것을 end-to-end로 확인.

## 정리

같은 소스 위치라도 "AST에 존재한다"와 "런타임에 렌더링된다"는 별개의 사실이다. 이 간극이 조용히 무시되면 사용자에게는 "편집이 씹힌다"는 가장 나쁜 형태의 버그로 나타난다 — 에러도 없고 재현 방법도 모호하다. 이런 종류의 정적 분석을 짤 때는 판정 기준을 보수적으로 잡는 것(불확실하면 reachable로 간주)도 중요하지만, 그 판정을 뒷받침하는 경계 계산(어디부터 어디까지가 "이 컴포넌트"인지) 자체도 별도로 검증해야 한다는 걸 두 번의 오탐 수정에서 확인했다 — 판정 로직이 옳아도 입력 경계가 틀리면 결과가 흔들린다.
