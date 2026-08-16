---
type: "content"
domain: "frontend"
category: "ui-ux"
topic: "Figma-코드 shape drift 감사에서 '없음'과 '한 값으로 못 정함'을 구분하기"
updatedAt: "2026-08-15"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-tokens"
  - "design-system"
  - "figma"
  - "drift-detection"
  - "corner-radius"
  - "false-positive"

relatedCategories:
  - "css"
  - "build-infra"
---

# Figma-코드 shape drift 감사에서 '없음'과 '한 값으로 못 정함'을 구분하기

> 버튼 그룹처럼 바깥쪽만 둥글고 안쪽은 각진 컴포넌트는 Figma의 `cornerRadius`가 숫자가 아니라 `"mixed"`를 반환한다 — 이걸 단일 값 비교로 감사하면 실제로는 정상인 디자인이 전부 drift로 잡힌다.

## 배경

maxys_proto의 ui-harness 디자인 시스템에서 Figma 컴포넌트 50개와 코드 구현(`packages/ui/src/staging`) 사이의 shape 정합성을 감사하는 파이프라인(`ds-shape.mjs`, `ds-figma-components.mjs`)을 돌렸다. 1차 감사 결과는 45개 중 36개(80%) 일치 — 9개 컴포넌트에서 radius/font drift가 잡혔다. Field, Item, Alert dialog, Accordion 같은 진짜 측정 오류(placeholder 프레임 누락, 잘못된 radius 값)는 고쳤지만, Button group을 고치고 나서도 여전히 drift로 잡히는 게 있었다.

## 핵심 내용

**원인**: Button group처럼 바깥 모서리는 둥글고 안쪽 경계는 각진 컴포넌트는 Figma에서 코너마다 radius 값이 다르다. 이런 노드를 Figma API로 읽으면 `cornerRadius` 속성이 숫자 하나가 아니라 문자열 `"mixed"`로 나온다. 기존 drift 감사 로직은 이 값을 코드의 단일 radius 값과 비교하려 했고, 비교 자체가 성립하지 않으니 항상 불일치로 보고됐다 — **디자인 의도(코너마다 다른 값)를 측정 오류(값이 없거나 틀림)로 오분류**한 것이다.

**고친 방식**: `ds-shape.mjs`에 `mixedCorners` 플래그를 추가해서, `cornerRadius === "mixed"`인 컴포넌트는 radius drift 리포트 대상에서 아예 제외했다. 그리고 이 판단을 한 줄로 정리해뒀다:

> "없는 것"과 "한 값으로 말할 수 없는 것"은 다르다.

같은 원리로 컬러 피커의 스와치처럼 의도적으로 정사각형인 요소, 이름 규칙으로 스냅샷 추출에서 제외되는 placeholder 프레임도 "누락"이 아니라 "애초에 감사 대상이 아님"으로 명시적으로 구분했다.

**한 번 더 걸린 함정**: `mixedCorners` 플래그를 개별 variant 노드에는 달았지만, variant들을 하나로 합쳐 export하는 `ds-figma-components.mjs`의 병합 로직에서는 이 플래그가 전파되지 않아 합성된(composite) 컴포넌트에서 다시 false positive가 났다. variant 병합 시 "하위 variant 중 하나라도 `mixedCorners=true`면 합성 결과도 `mixedCorners=true`"로 전파하는 로직을 추가하고 나서야 Button group의 false positive가 완전히 사라졌다(89%→91%).

**남은 진짜 drift 처리**: 이후 Color picker, Combobox, Navigation menu, Sidebar 4곳은 코드를 직접 열어 확인했더니 실제로 Figma 스펙과 다른 게 맞았다 — 다만 참조용 컴포넌트이거나 의도된 variant 차이였다. 이런 경우는 "고쳐야 할 버그"가 아니라 "documented, non-blocking 차이"로 리포트에 명시하고, 나머지 2건(Color picker radius 12→8, Combobox chip 누락)만 실제로 디자인을 코드에 맞춰 고쳐 최종 45/45(100%) 일치를 달성했다.

## 정리

drift 감사 도구를 짤 때 "값이 다르다 = 버그"로 단순화하기 쉽지만, 실제로는 세 가지 경우를 구분해야 한다: ① 진짜 측정 오류(고쳐야 함), ② 도구가 표현 못 하는 디자인 의도(mixed corners처럼 감사 대상에서 제외해야 함), ③ 의도된 코드-디자인 차이(리포트엔 남기되 액션 아이템은 아님). 이 구분을 안 하면 감사 통과율을 억지로 100%로 만들려고 정상적인 디자인을 계속 고치게 되거나, 반대로 진짜 버그를 "그런갑다" 하고 넘기게 된다. 그리고 플래그 하나를 추가할 때는 그 플래그가 파이프라인의 병합/합성 단계를 거치면서도 살아남는지까지 확인해야 한다 — 개별 노드엔 달았는데 합성 단계에서 사라지면 같은 false positive가 다른 이름으로 재발한다.
