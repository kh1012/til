---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "뷰스위처를 다이나믹 아일랜드풍 여백 가로선으로 재설계하고, 워크플로우 상태를 클라이언트 전역 저장소로 임시 관리하며, RPM Day 데모를 겨냥해 앱 셸(헤더·워크스페이스 패널·env 플래그)을 정비한 기록"
updatedAt: "2026-07-03"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "adapter-layout"
  - "view-switcher"
  - "framer-motion"
  - "layout-projection"
  - "z-index"
  - "jotai"
  - "atomWithStorage"
  - "workflow-state"

relatedCategories:
  - "react"
  - "css"
  - "typescript"
---

# 뷰스위처 재설계와 워크플로우 전역 상태, RPM Day 데모용 앱 셸 정비

> 뷰어 위 오버레이 아이콘이던 뷰스위처를 여백 가로선 기반의 다이나믹 아일랜드풍 컨트롤로 재설계하고, 아직 백엔드가 정리되지 않은 워크플로우 상태를 클라이언트 전역 저장소로 임시 관리하며, RPM Day 데모를 겨냥해 헤더·워크스페이스 패널·env 플래그까지 손본 하루.

## 배경

RPM Day 데모를 앞두고 앱 셸 전반을 데모에서 자연스럽게 보이도록 다듬는 게 오늘의 다른 한 축이었다. 아침에는 헤더 간격, 워크스페이스 패널 버튼, RPM Day 목업 강제 env 플래그처럼 셸 주변을 가볍게 손봤고, 오후에는 뷰 전환 UI(뷰스위처)를 큰 폭으로 재설계했다. 뷰스위처는 modeler·analysis-review·excel-calc-sheet가 공유하는 adapter-layout의 요소라, 여기 손대는 건 곧 데모에 등장하는 모든 뷰의 인상을 바꾸는 일이었다.

또 하나는 워크플로우 상태 문제였다. 백엔드 상태 정의가 아직 정리되기 전이라, 데모에서 노드가 승인 완료로 보이고 연동 확정이 상태에 반영되려면 클라이언트가 임시로 상태를 들고 있어야 했다. 그래서 전역 저장소를 도입해 데모가 성립하게 만들되, 백엔드 정리 이후 걷어낼 수 있도록 임시 성격을 분명히 남겼다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 헤더 간격 및 프로젝트 셀렉터 버튼 스타일 조정
  - HeaderIdentity 간격을 gap-2에서 개별 ml로 바꿔 브레드크럼 간격을 넓히고, "새 프로젝트" 버튼을 ghost에서 primary로 올리며 패딩·정렬을 조정했다. 데모에서 상단 셸이 또렷하게 보이도록 하는 셸 폴리싱.

- RPM Day 목업 강제 플래그 예시 추가(env)
  - NEXT_PUBLIC_RPM_DAY_MOCKUP 환경변수 예시를 추가했다. 풍하중/지진하중 노드 승인을 고정하는 용도이며, RPM Day 이후 제거 예정임을 주석으로 명시했다.

- 워크스페이스 패널 아이콘 버튼을 text variant로 교체
  - size-8 ghost 버튼을 size-7 text(Button 신규 variant)로 통일하고 import 정렬을 정리했다. 앞서 cad-web 작업에서 추가한 text variant(배경/보더 없이 텍스트만 전이)를 워크플로우 패널에도 적용해 톤을 맞춘 것.

- 뷰스위처 접힘을 여백 가로선으로 이전 + 도킹 이동·명시적 접기·툴팁·숨김 옵션
  - 접힘 표현을 뷰어 위 오버레이 아이콘칩에서 콘텐츠 위/아래 회색 여백의 얇은 가로선으로 옮겼다(우측 패널 접힘 핸들과 같은 두께·톤). hover는 하이라이트(길이·primary색)만, 클릭해야 펼치도록 패널 핸들과 동작을 맞췄다. 펼침 pill에는 도킹 위치 이동(↑/↓)을 추가해 뷰어 상/하단 컨트롤을 안 가리도록 스위처를 반대 여백으로 옮길 수 있게 했다(dockPosition controlled/uncontrolled). mouse-leave 자동 접힘을 없애고 명시적 접기 버튼(−)·Escape·외부클릭으로만 접히게 했다. 각 아이콘 버튼에 툴팁을 붙이면서 공용 Tooltip에 side prop을 추가해 도킹 방향에 따라 상/하로 뒤집어 잘림을 막았다. hideViewSwitcher prop을 추가하고 소비처에서 NEXT_PUBLIC_RPM_DAY_MOCKUP로 게이팅했다.

- 툴팁 호버 딜레이 제거해 즉시 표시로 변경
  - 뷰스위처 툴팁을 붙이면서 딜레이가 거슬려 조사해 보니, canonical Tooltip만 delay 미지정 시 base-ui Provider 기본값(600ms)으로 폴백하고 있었다(primitives/tooltip은 이미 delay=0). delay 파라미터 기본값을 0으로 바꾸고, exactOptionalPropertyTypes 우회용 조건부 spread를 제거해 항상 Provider에 delay를 전달하도록 정리했다. 명시 지정한 곳(terms=0, info-help=150, 스토리=200)은 그대로 유지되고, 미지정 사용처(adapter-layout, permission-guard, docking 등)만 600ms에서 0ms로 전환됐다.

- 뷰스위처 z-index를 z-tooltip(최상단)로 + 소비처 hide 활성화 제거
  - 스위처 래퍼 z-index를 z-20에서 z-tooltip(60, 디자인 시스템 z 스케일 최상단)으로 올려, 뷰어 내 도킹/HUD 등 어떤 플로팅 요소보다 위에 떠 접힘 라인·펼침 pill이 가려지지 않게 했다. 접힘을 여백으로 옮긴 뒤로는 뷰어를 가리지 않아 숨길 필요가 없어졌으므로, 소비처 3곳(modeler·analysis-review·excel-calc-sheet)의 hideViewSwitcher 활성화와 방금 추가했던 rpmDayMockupEnabled 상수/import를 모두 제거했다. hideViewSwitcher prop·렌더 옵션 자체는 배치 전환이 불필요한 소비처용으로 유지했다.

- 워크플로우 상태 클라이언트 전역 저장소 도입
  - 백엔드 상태 정리 전까지 클라이언트가 임시로 상태를 들고 있는 전역 저장소를 추가했다. 모델링 5개 노드(해석조건/중력하중/풍하중/지진하중/하중조합)는 최초 진입 시 승인 완료로 자동 세팅하고, 상태 개념이 불필요한 해석 모델 내보내기는 워크플로우 트리에서 완전히 제거했다. cad-web/design-web/Excel계산서 연동 확정(onConfirm) 시 전역 상태를 갱신해 보드·노드상세 양쪽에 반영하고, FAB(WorkflowController) 재생 완료 시 최종 상태도 같은 저장소에 커밋해 유지하게 했다. 영속화는 atomWithStorage(localStorage)로 새로고침 후에도 유지. 여기서 seed 이펙트가 atomWithStorage 마운트 직후 stale 기본값 기준으로 write해 FAB 커밋 데이터를 지우는 레이스를 발견해 getOnInit: true로 해결했다. 도면기반모델링/해석결과검토/바닥판해석(SDS)은 패키지에 확정 이벤트 자체가 없어 이번 범위에서 제외하고 하네스에 후속 기록으로 남겼다.

- 뷰스위처 펼침 시 y-shift 애니메이션 추가
  - 펼치면 pill이 접힘 위치(gutter)에서 뷰어 쪽으로 10px(접힘 5.5 ↔ 펼침 3 spacing 차이) 더 다가오도록 y 모션값을 추가해, 다이나믹 아일랜드처럼 커지며 다가오는 느낌을 줬다. 이때 shell(layout prop)에 animate={{ y }}를 직접 얹으면 framer-motion의 layout-projection 트랜스폼과 뒤섞여 목표 px가 절반 이하로 감쇠되는 걸 확인했다. layout이 없는 별도 motion.div로 y-shift를 분리해 정확한 px가 그대로 적용되도록 구조를 바꿨다.

- 노드 카드 삭제 기능 추가(컨텍스트 메뉴 + 호버 아이콘 + 삭제 모션)
  - 컨텍스트 메뉴에 "삭제" 항목과 카드 좌상단 호버 X 아이콘을 추가하고, 백엔드 워크플로우 정의 자식 목록 갱신(persistWorkflowChildOrder)과 Step Instance 삭제를 연결했다. 확인은 신규 packages/ui 컴포지트 NodeDeleteDialog(AlertDialog 기반)로 처리하고, 삭제 대기 중엔 카드에 blur+로더 데코레이터를, 실제 제거 시엔 framer-motion으로 scale-down+opacity fade 종료 애니메이션을 재생하도록 했다.

## 정리

오늘 뷰스위처 작업의 핵심 깨달음은 framer-motion에서 layout projection과 수동 animate가 같은 요소에서 충돌한다는 점이었다. layout prop이 붙은 shell에 animate={{ y }}를 직접 얹으면 projection 트랜스폼이 내 y값을 절반 이하로 깎아먹는다. 해결은 단순했다. 책임을 분리해서, 레이아웃 전환은 layout이 담당하고 정밀한 px 이동은 layout 없는 별도 motion.div가 담당하게 나누면 각자 의도대로 동작한다. 애니메이션이 "왜 이만큼 안 움직이지"일 때 projection 개입을 먼저 의심하는 습관이 생겼다.

뷰스위처를 오버레이에서 여백 가로선으로 옮긴 건 표현 방식만 바꾼 게 아니라 상호작용 모델 전체를 우측 패널 접힘 핸들과 동일하게 맞춘 결정이었다. 그 덕에 뷰어를 가릴 일이 없어졌고, 아침에 급하게 넣었던 hideViewSwitcher 게이팅과 rpmDayMockupEnabled 상수를 오후에 스스로 걷어내게 됐다. 데모용 임시 게이팅을 넣더라도 근본 설계가 문제를 없애면 그 게이팅은 사라진다는, 조금은 다행스러운 되돌림이었다.

워크플로우 전역 상태는 명백히 임시방편이지만, 그 임시방편에서도 제일 손이 많이 간 건 atomWithStorage의 초기화 타이밍이었다. seed 이펙트가 마운트 직후 stale 기본값으로 write하면서 localStorage에 커밋된 FAB 데이터를 덮어쓰는 레이스를 만든 게 대표적이다. getOnInit: true로 초기 진입 때 저장값을 먼저 읽게 해 풀었는데, 영속 저장소를 seed 로직과 섞을 때는 "언제 저장값이 준비되는가"를 항상 먼저 확인해야 한다는 걸 다시 배웠다. 백엔드 상태가 정리되면 이 저장소는 걷어낼 대상이고, 그 사실을 코드에 임시 성격으로 남겨둔 것도 나중의 나를 위한 안전장치다.
