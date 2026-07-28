---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "도면 정리 노드가 부모 리렌더만으로 이미 로딩한 DXF를 매번 다시 읽던 버그를 추적한 기록. next-intl useTranslations를 타고 매 렌더 새 참조가 되는 translateAdapterError가 useMemo deps에 들어가 있어 API 세션 객체가 재생성되고, 그 아래 autoLoad effect가 재실행되며 folderLoadStart가 상태를 초기화하는 연쇄였다. lazy useState로 최초 마운트 값을 캡처해 identity를 고정했다"
updatedAt: "2026-07-28"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "cad-web"
  - "referential-identity"
  - "useMemo"
  - "lazy-useState"
  - "next-intl"
  - "dxf"
  - "keep-alive"
  - "effect-rerun"

relatedCategories:
  - "typescript"
  - "design-system"
---

# 함수 참조 하나가 흔들려서 DXF가 매 렌더 다시 로딩되던 버그

> 도면 정리 노드가 이미 읽어둔 DXF를 부모 리렌더만으로 매번 리셋했다. 원인은 next-intl `useTranslations` 참조를 타고 매 렌더 새 함수가 되는 `translateAdapterError`가 `useMemo` deps에 들어 있었던 것. lazy `useState`로 최초 마운트 값을 캡처해 identity를 고정했다.

## 배경

`CadKeepAliveSlot`은 이름 그대로 CAD 세션을 살려두는 장치다. 노드를 오가더라도 이미 로딩한 도면을 유지하는 게 목적인데, 실제로는 부모가 리렌더될 때마다 DXF가 처음부터 다시 읽혔다. 세션 유지 장치가 있는데도 세션이 유지되지 않는 상황이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 도면 정리 노드가 재렌더마다 DXF를 다시 로딩하는 문제 수정
  - 연쇄를 거꾸로 따라갔다. 화면에서 보이는 증상은 "이미 로딩한 도면이 리셋됨"이고, 그 직전 원인은 `folderLoadStart`가 `drawings`/`floorStates`를 초기화하는 것이다. `folderLoadStart`는 `openFolder`에서 호출되고, `openFolder`는 autoLoad effect가 부른다. 그 effect는 `resolvedApi`가 바뀌면 재실행된다. `resolvedApi`는 `useMemo`다.
  - `resolvedApi`의 deps에 `translateAdapterError`가 있었다. 이 함수는 상위에서 next-intl `useTranslations` 결과를 참조해 만들어지는데, `useTranslations`가 참조를 갱신하면 매 렌더 새 함수가 된다. 즉 부모가 리렌더되기만 해도 `resolvedApi`가 새로 만들어지고, `createWorkspaceCadApi`로 CAD API 세션이 통째로 재생성되고, autoLoad effect가 다시 돌고, 로딩해둔 도면이 날아간다.
  - `translateAdapterError`를 lazy `useState` 초기화(`useState(() => translateAdapterError)`)로 최초 마운트 시점 값에 고정하고, `useMemo`와 `createWorkspaceCadApi`가 이 안정 참조를 쓰게 했다. `CadKeepAliveSlot`의 `activated` latch가 이미 쓰고 있던 "한 번 캡처하고 재활성화까지 유지"와 같은 패턴이라, 주석으로 그 대응 관계를 남겨뒀다.
  - 회귀 테스트를 추가했다. `translateAdapterError`가 매번 다른 함수 참조로 주입되는 상황을 rerender로 재현하고, `createWorkspaceCadApi`가 한 번만 호출되는지와 `useCadWeb`에 넘어가는 `api`가 최초 참조와 동일한지를 검증한다. 기존 테스트에서 `translateError: props.translateAdapterError`로 참조 동일성을 단언하던 부분은 더 이상 성립하지 않으므로, `expect.any(Function)`으로 바꾸고 호출 결과가 같은지를 별도로 확인하게 고쳤다.

## 정리

버그의 본질은 로직이 아니라 **참조 동일성**이었다. 코드만 보면 `useMemo` deps는 정직하게 다 채워져 있고 exhaustive-deps도 만족한다. 문제는 deps에 들어간 값 중 하나가 "논리적으로는 변하지 않는데 물리적으로는 매 렌더 변하는" 함수였다는 점이다. lint는 이런 걸 잡아주지 못한다. deps에 넣으라는 규칙은 지켰는데, 넣은 값이 안정적인지는 규칙의 관심사가 아니기 때문이다.

특히 i18n 번역 함수가 이 함정에 잘 걸린다. 의미상 완전히 정적인 값(로케일이 안 바뀌면 결과도 안 바뀜)인데 구현상으로는 훅 호출 결과라 참조가 흔들린다. 그리고 이런 값은 보통 "에러 메시지 번역기" 같은 부수적인 역할로 깊은 곳까지 prop drilling되기 때문에, 정작 그 함수가 세션 생성 같은 무거운 작업의 deps에 끼어 있다는 사실을 놓치기 쉽다.

고칠 때의 판단 기준은 "이 값이 바뀌면 정말 재생성해야 하나?"였다. 답이 아니오라면 deps에서 빼는 게 아니라(그건 lint를 속이는 것이다) 값 자체를 안정화하는 게 맞다. lazy `useState`로 마운트 시점 값을 캡처하는 방식은 그 의도가 코드에 그대로 드러난다는 게 좋았다. `useRef` + effect 갱신이었다면 "언제 갱신되는가"라는 질문이 남지만, lazy `useState`는 "최초 값에서 절대 안 바뀐다"가 타입과 형태로 명시된다.

같은 리포에서 이날 하루 종일 `eslint-disable` 없이 exhaustive-deps를 만족시키려고 ref 스냅샷을 쓴 것과 결이 같은 문제였다. deps 규칙을 우회하지 않으면서 "이 변화로는 재실행하지 않는다"를 표현하는 방법이 필요했고, 그 답이 참조 고정이었다.
