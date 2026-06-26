---
draft: true
type: "content"
domain: "frontend"
category: "git"
topic: "origin/main에 쌓인 동료들의 대규모 변경을 내 작업 브랜치로 두 차례 통합한 날. 1차는 vworld 지오코딩·토지이용 API와 location-map 피처, 문서 분석 개선을 충돌 없이 받아들였고, 2차는 어제 내가 손댔던 workflow-controller 영역이 동료의 컴포넌트 리네이밍과 정면으로 부딪혀 다섯 파일의 충돌을 정리했다"

updatedAt: "2026-06-26"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "git-merge"
  - "merge-conflict"
  - "feature-branch"
  - "origin-main"
  - "workflow-controller"

relatedCategories:
  - "storybook"
  - "react"
---

# origin/main 두 번 통합하면서 workflow-controller 충돌 정리하기

> 오늘은 새 기능을 쌓은 날이 아니라, origin/main에 모여든 동료들의 변경을 내 작업 브랜치(maxflow-init)로 끌어와 정렬한 통합의 날이었다. 오전 1차 병합은 vworld API와 location-map 피처를 충돌 없이 받았고, 오후 2차 병합은 어제 내가 만지던 workflow-controller 영역이 동료의 컴포넌트 리네이밍과 부딪혀 다섯 파일의 충돌을 풀어야 했다.

## 배경

여러 사람이 같은 maxflow 레포에 동시에 올라타 있다 보니, 내 feature 브랜치(maxflow-init)는 며칠만 떨어져 있어도 origin/main과 멀어진다. 멀어진 채로 두면 나중에 한 번에 합칠 때 충돌이 커지므로, 일찍 자주 당겨오는 편이 안전하다. 오늘은 그 정렬 작업을 두 번에 나눠서 했다.

특히 어제 작업이 변수였다. 어제 나는 WorkflowController를 부위별로 분해해 보여주는 Anatomy 스토리를 세우면서 workflow-controller 계열 파일들을 여럿 만졌다. 그런데 origin/main 쪽에서도 동료가 거의 같은 컴포넌트들을 리네이밍하고 anatomy 스토리를 추가하는 작업을 올려둔 상태였다. 같은 영역을 양쪽에서 동시에 건드린 셈이라, 통합할 때 충돌은 예고된 일이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 오전 1차 병합 (origin/main을 maxflow-init으로 통합, 충돌 없음)
  - 이 병합은 충돌 메시지 없이 깔끔하게 들어왔다. 받아온 변경의 큰 줄기는 vworld 쪽 백엔드 라우트가 한꺼번에 들어온 것이다. geocode, land-use, nearby, wmts 타일 라우트와 각 테스트가 추가됐고, 이를 화면에서 쓰는 location-map 피처(vworld 주소 지도, 지도 렌더러, 위치 쿼리)도 함께 들어왔다.
  - 그 외에 projects/analyze의 문서 분석 경로가 보강됐고(table-select-fields, analyze-documents), auth 메시지 묶음이 정리되며 core·project 메시지가 새로 자리잡았다. globals.css도 적지 않게 바뀌었다.
  - 같은 영역을 내가 동시에 건드리지 않았기 때문에 이 1차는 그냥 받아들이면 되는, 통합이라기보다 수신에 가까운 병합이었다.

- 오후 2차 병합 (origin/main 재통합, workflow-controller 다섯 파일 충돌 해소)
  - 오후에 다시 당겨왔을 때 충돌이 났다. 충돌 파일은 모두 내가 어제 만진 영역과 겹쳤다. workflow-controller-parts, workflow-controller-range-markers, workflow-controller-repeat-node-picker, workflow-controller.anatomy.stories, 그리고 workflow-status-bar 다섯 개였다.
  - 원인은 명확했다. 동료가 origin/main에서 workflow 컴포넌트들을 리네이밍하고 anatomy 스토리를 손본 변경과, 어제 내가 같은 컴포넌트들에 Anatomy 스토리를 세운 변경이 같은 줄을 두고 부딪힌 것이다. 두 작업의 방향이 사실상 같았기에(둘 다 anatomy 구조를 드러내는 일), 내 쪽 흔적을 고집하기보다 origin/main에 정리된 형태를 기준으로 충돌을 맞췄다.
  - 함께 들어온 변경으로는 storybook-anatomy 공용 유틸, document-analysis의 추출 소스 패널과 파일 드롭존 개선, design-overview 분석 응답 픽스처가 있었다. workflow-controller의 range·repeat·collapsed 같은 하위 파트들도 리네이밍 흐름에 맞춰 함께 정렬됐다.

## 정리

오늘은 코드를 새로 쓴 양으로 보면 거의 비어 있지만, 협업이라는 관점에서는 꽤 의미 있는 하루였다. 같은 레포에서 여러 사람이 같은 컴포넌트를 동시에 손대면 충돌은 사고가 아니라 일상이라는 걸 다시 확인했다.

특히 어제 작업과 오늘 통합이 같은 workflow-controller anatomy를 두고 정면으로 만난 게 인상적이었다. 같은 목표를 향한 두 갈래의 작업이 합류 지점에서 충돌로 드러난 것인데, 이럴 때는 내가 먼저 썼다고 내 버전을 끝까지 끌고 가기보다, 더 많은 사람이 공유할 origin/main의 정리된 형태에 맞추는 쪽이 뒤탈이 적다. 충돌 해소는 결국 누구 코드가 옳냐의 문제가 아니라, 앞으로 모두가 딛고 설 바닥을 어느 쪽으로 고를지의 문제라는 감각이 남았다.

브랜치를 오래 묵히지 말고 일찍 자주 당겨오자는 평범한 교훈도 다시 새겼다. 오전과 오후에 나눠 두 번 통합한 덕에, 1차에서 큰 수신을 먼저 소화하고 2차에서 충돌이라는 핵심에만 집중할 수 있었다. 한 번에 몰아 합쳤다면 vworld 대규모 변경과 workflow 충돌이 뒤엉켜 원인을 가려내기 더 힘들었을 것이다.
