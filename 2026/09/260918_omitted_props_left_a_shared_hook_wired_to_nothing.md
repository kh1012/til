---
type: "content"
domain: "frontend"
category: "react"
topic: "훅을 import 해서 호출부까지 있어도, 그 호출부가 필수 prop을 전부 생략하면 배선은 죽어 있다"
updatedAt: "2026-09-18"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "dead-wiring"
  - "custom-hook"
  - "prop-drilling"
  - "design-doc-verification"
  - "shortcut-conflict"

relatedCategories:
  - "state-management"
  - "ui-ux"
---

# 훅을 import 해서 호출부까지 있어도, 그 호출부가 필수 prop을 전부 생략하면 배선은 죽어 있다

> maxflow의 atelier 단축키 배선 설계 문서(`2026-09-18-shortcut-scope-taxonomy-plan.md`)에서, `useElementTargetShortcut`/`useElementTargetFocusJump`가 `PageWorkspace.run-composer.tsx`에서 import되고 호출까지 되지만, 그 호출부인 `PageWorkspace.agent.tsx:240`이 `elementTarget`·`pickerArmed`·`onArmPicker`·`onDisarmPicker`·`onClearTarget` 다섯 prop을 전부 생략하고 있어 PageWorkspace 안에서는 이 배선이 실질적으로 죽어 있었다.

## 배경

- 설계 문서는 `⌘⇧V`(arm-element-target) 단축키가 `useElementTargetGlobalArm`을 통해 캔버스 위젯·작성기 셋(`AgentIntentPopover`·`AgentRunDetail.composer`·`PageWorkspace.run-composer`)·터미널 창 초점 구역 전부에서 동작한다고 서술했다.
- 이 서술을 근거로 6절에서 "V(page-select, 페이지 편집 모드 토글)를 새 조합키로 옮기려 해도 arm-element-target과 개념이 겹쳐 확정을 보류한다, 후보 ⌘⇧M"이라는 판단을 내렸다.
- 이후 배선 설계를 실제로 진행하며 코드를 다시 읽자, `useElementTargetGlobalArm`의 실제 호출처는 `AgentDock.pane.pick.ts`(터미널 독)와 `DetailRoute.canvas-target.tsx`(컴포넌트 캔버스) 둘뿐이었다.

## 핵심 내용

- `PageWorkspace.run-composer.tsx`는 `useElementTargetShortcut`/`useElementTargetFocusJump`라는 별개의 로컬 훅을 import하고 있었다. import와 호출 자체는 있어서 언뜻 배선이 살아 있는 것처럼 보인다.
- 하지만 이 훅들의 유일한 호출부인 `PageWorkspace.agent.tsx:240`이 `elementTarget`·`pickerArmed`·`onArmPicker`·`onDisarmPicker`·`onClearTarget` 다섯 prop을 전부 생략하고 있었다. prop이 없으니 훅 내부 로직이 실행될 조건 자체가 성립하지 않는다 — PageWorkspace 안에서는 이 배선이 죽어 있다.
- `TargetSource` 타입(`header-modify`·`header-split`·`header-refine`·`header-plugin`·`terminal`·`canvas`)도 전부 컴포넌트 상세·터미널 독에만 묶여 있어 PageWorkspace를 참조하는 값이 없었다. import 관계만 보고 "이 컴포넌트가 이 기능을 쓴다"고 판단하면 틀릴 수 있다는 걸 타입 쪽에서도 재확인한 셈이다.
- 결과적으로 "V는 arm-element-target과 런타임에서 충돌한다"는 원래 판단은 사실이 아니었다 — 실제로는 충돌이 없었다. 이 오판정을 근거로 세운 "확정 보류" 결정도 근거가 약했던 것으로 드러나, 사용자 결정으로 V를 `⌘⇧E`로 확정하고 6절을 갱신했다.
- 부수 작업으로 `PageWorkspace.run-composer.tsx`의 죽은 배선 정리도 결정에 추가됐다: 미사용 import(`useElementTargetShortcut`, `useElementTargetFocusJump`, `ElementTargetPickerButton`)와 미사용 prop(`elementTarget`·`pickerArmed`·`onArmPicker`·`onDisarmPicker`·`onClearTarget`) 제거.

## 정리

- 설계 문서에서 "이 컴포넌트가 이 훅/기능을 쓴다"고 적을 때는 import와 호출 존재 여부가 아니라, 그 호출부에 실제로 전달되는 prop까지 확인해야 한다. prop이 전부 생략된 호출은 코드상으로만 존재하고 런타임에는 아무 효과가 없다.
- 이런 표면적 서술 오류가 단순 오탈자로 안 끝나고, 그 오류를 근거로 내린 다른 결정(단축키 재배정 보류)까지 함께 흔들 수 있다. 설계 문서의 사실 관계를 재검증하는 작업이 그 문서가 내린 판단 자체를 뒤집을 수 있다는 걸 보여준 사례.
