---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "워크플로우 상태 바의 상태별 카운트 아이콘에서 toSnbStatus 변환과 done 전용 Check 분기를 걷어내고, SnbStatusIcon에 WorkflowItemStatus를 직접 넘겨 한 갈래로 통일하기"

updatedAt: "2026-06-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "snbstatusicon"
  - "status-mapping-layer"
  - "refactoring"
  - "lucide-react"
  - "single-source"

relatedCategories:
  - "typescript"
  - "refactoring"
---

# 상태 바 아이콘도 SnbStatus 변환을 걷어내고 직결로

> 며칠 전 SNB 트리에서 걷어냈던 toSnbStatus 중간 변환과 done 전용 Check 분기가 워크플로우 상태 바에는 그대로 남아 있었다. 이날 그 자리도 마저 정리해, 상태 카운트 아이콘이 WorkflowItemStatus를 SnbStatusIcon에 직접 넘기는 한 갈래로 통일됐다.

## 배경

워크플로우 상태 바는 stage 안의 항목들이 어떤 상태에 몇 개씩 있는지 카운트로 보여주는 영역이고, 각 카운트 앞에는 상태를 나타내는 작은 아이콘이 붙는다. 이 아이콘을 그릴 때 상태 바는 두 단계를 거치고 있었다. WorkflowItemStatus를 toSnbStatus()로 한 번 변환한 다음, 그 결과가 done이면 lucide의 Check 아이콘을, 그 외에는 SnbStatusIcon을 쓰는 분기였다.

문제는 이 변환과 분기가 이제는 잉여라는 점이었다. 앞서 SNB 트리 쪽에서 toSnbStatus 중간 레이어를 걷어내고 WorkflowItemStatus를 직접 받게 정리하면서 SnbStatusIcon이 도메인 상태를 그대로 받아 그릴 수 있게 됐는데, 상태 바는 그 정리에서 빠진 채 옛 방식을 그대로 들고 있었다. done일 때만 Check를 따로 그리던 분기도 SnbStatusIcon이 done을 포함한 상태를 다 그릴 수 있게 된 지금은 특별 대접일 뿐이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 상태 바 카운트 아이콘에서 변환과 분기를 제거하고 SnbStatusIcon 직결로 통일
  - `workflow-status-bar.tsx`의 StatusCount에서 `toSnbStatus(status)` 변환을 없애고, done일 때 lucide Check를 쓰고 아니면 SnbStatusIcon을 쓰던 삼항 분기를 걷어냈다. 대신 `<SnbStatusIcon status={status} />`로 WorkflowItemStatus를 그대로 넘겨 어떤 상태든 한 컴포넌트가 책임지게 했다. 더 쓰이지 않게 된 Check와 toSnbStatus의 import도 함께 정리했다. 결과적으로 아이콘을 고르는 if/삼항 로직이 사라지고, 상태에서 아이콘으로 가는 경로가 SnbStatusIcon 한 곳으로 좁혀졌다.

## 정리

이 변경은 며칠 전 SNB 트리에서 했던 정리를 상태 바에 마저 적용한, 같은 정리의 뒤늦은 연장이다. 그때 toSnbStatus라는 중간 환승역을 걷어내 SNB가 도메인 상태를 직접 받게 했는데, 상태 바는 그 청소가 닿지 않은 채 옛 변환과 done 전용 Check 분기를 그대로 안고 있었다. 같은 의미의 아이콘을 두 자리에서 서로 다른 방식으로 그리고 있었던 셈이다.

핵심은 "상태를 아이콘으로 바꾸는 규칙을 한 곳에만 둔다"는 것이다. 변환 레이어와 done 특례가 끼어 있으면, 상태 표현이 바뀔 때 SnbStatusIcon만 고쳐서는 끝나지 않고 이 분기까지 같이 손봐야 하는 숨은 빚이 생긴다. SnbStatusIcon에 status를 직접 넘기게 하자 그 빚이 사라지고, done에 대한 특별 대접도 다른 상태와 같은 줄에 서게 됐다. 작은 한 컴포넌트의 몇 줄 삭제지만, 같은 일을 다르게 하던 두 자리를 한 규칙으로 모은다는 점에서 SNB 정리와 한 줄기에 놓인다.
