---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "어제 추출한 packages/ui 공용 컴포지트(AdapterLayout·Docking·ToggleSelector)를 cad-web·modeler·viewer·analysis-review 실제 앱에 이식하고, Tailwind 파이프라인·포털 스코프·테마 톤을 함께 정합시킨 하향식 적용 기록"
updatedAt: "2026-07-02"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "adapter-layout"
  - "docking"
  - "toggle-selector"
  - "tailwind-source"
  - "portal-scope"
  - "theme-scope"
  - "design-token"

relatedCategories:
  - "react"
  - "css"
  - "typescript"
---

# packages/ui 공용 레이아웃·도킹 시스템의 실제 앱 이식과 정합

> 어제 상향식으로 추출한 AdapterLayout·Docking·ToggleSelector 컴포지트를 cad-web·modeler·viewer-review·analysis-review 실제 소비처에 붙이고, 그 과정에서 드러난 Tailwind @source 누락, 포털 스코프 이탈, 슬롯별 테마 충돌, 레이아웃 시프트를 하나씩 근본 원인까지 파고들어 정합시킨 하루의 기록.

## 배경

어제까지가 apps 곳곳에 흩어진 UI 패턴을 packages/ui 공용 컴포지트로 끌어올리는 상향식 작업이었다면, 오늘은 그 컴포지트를 실제 소비처에 붙이는 하향식 적용이 큰 줄기였다. cad-web의 CadWorkspace/ToolDock/PaneHeader, modeler의 자체 SplitLayout, viewer-review와 analysis-review의 playground까지 제각기 다른 레이아웃과 도킹 UI를 갖고 있었고, 이걸 AdapterLayout/Docking/ToggleSelector라는 공용 소스 하나로 수렴시켰다.

공용 컴포넌트를 만드는 것과 실제로 붙이는 것은 다른 문제였다. 붙이자마자 Tailwind가 소비처 소스를 스캔하지 못해 클래스가 조용히 무시되거나, base-ui 팝오버 포털이 테마 스코프 밖으로 올라가 토큰이 안 잡히거나, 캔버스처럼 항상 어두운 콘텐츠가 라이트 프레임과 부딪히는 문제들이 연쇄로 튀어나왔다. 하루의 절반은 이 정합 문제를 근본 원인까지 파는 데 썼다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- cad-web CadWorkspace 우측 패널 래핑을 AdapterLayout으로 통일
  - SceneCanvas(좌) + AlignPanel/InspectorPanel(우) 2컬럼 구성을 AdapterLayout(left/panel, center 없음)으로 교체했다. 두 패널이 각자 갖던 자체 Aside 래핑은 AdapterLayout의 panel Aside와 중첩되므로 제거하고 공용 카드 border/rounded로 대체. no-scene/로딩/에러 상태는 패널 개념 자체가 없으므로 AdapterLayout 밖에 그대로 둬 회귀를 막았다.

- AdapterLayout panel prop을 optional로 변경
  - analysis-review처럼 우측 Aside 패널 자체가 없는 소비처를 지원하려고 panel을 필수에서 선택으로 바꿨다. 생략 시 패널 컬럼(Aside/리사이즈 디바이더/expand handle)을 아예 렌더하지 않는다. 기존 소비처가 없어 breaking change는 아니었다.

- AdapterLayout에 left:center 초기 분할비율(defaultSplitRatio) 추가
  - 드래그 전 primarySize=null일 때 항상 50:50으로 고정되던 걸, defaultSplitRatio(0~1, 기본 0.5)로 컨테이너 폭 측정 없이 CSS flex-grow 비율만으로 초기 배치가 되게 했다. 드래그하면 기존과 동일하게 실측 px로 고정된다.

- analysis-review 3D:표 초기 분할비율을 원래값(42:58)으로 복원
  - AdapterLayout 통일 때 50:50으로 바뀌었던 걸 방금 추가한 defaultSplitRatio(0.42)로 원래 비율로 되돌렸다.

- modeler 자체 SplitLayout을 AdapterLayout으로 통일
  - 3D(StructureViewer)+2D(PlanViewer)+속성 3분할 자체 구현(CSS Grid 기반 SplitLayout)을 AdapterLayout(left/center/panel)으로 교체했다. 공개 API(RightPanelCollapseButton/useRightPanelCollapse)는 시그니처를 유지하는 호환 셔틀로 재구현해 호스트를 무변경으로 두고, 뷰모드탭(단일/좌우/상하)+스왑은 기존에 없던 새 기능으로 그대로 노출했다. SplitLayout.tsx는 삭제.

- Docking을 cad-web ToolDock 정밀 톤으로 통일 + popover 아이템 + Context 추가
  - cad-web ToolDock이 이미 같은 Figma 소스를 참조한 정밀 색상(FLOATING_TONE 등)을 쓰고 있어, Docking "default" variant를 그 값으로 통일했다(surface #607085→#475569 등, shadow를 variant별로 분리). DockingRailItem에 네 번째 타입 "popover"를 추가해 "중심선 검출"처럼 복합 팝오버(제목+CTA+폼)를 배열로 선언 가능하게 하고, 모드별 컨텍스트 줄을 위한 Docking.Context, Zoom의 onFit도 신설. Tooltip으로 감싸면 base-ui Popover.Trigger가 주입하는 onClick/aria-expanded가 사라지는 버그를 title 속성으로 대체해 우회했다.

- modeler 플레이그라운드에 Tailwind 로드
  - SplitLayout(자체 CSS-in-JS) 시절엔 필요 없던 Tailwind가, AdapterLayout으로 통일된 뒤엔 헤더/뷰모드탭/스왑/분할 전부 유틸리티 클래스에 의존하게 됐다. 플레이그라운드에 Tailwind가 없어 flex-row 등이 안 먹혀 3D/2D가 세로로 스택되던 걸, theme.css 소비자 레시피(@tailwindcss/vite + @source + data-skin/data-theme)로 해결했다.

- ToggleSelector에 shadow-sm 추가
  - Docking 컨테이너와 동일하게 View/Lock/Label/Snap 헤더 바 컨트롤에도 은은한 그림자를 줘 배경과의 구분을 명확히 했다.

- AdapterLayout 헤더에 min-h-14로 p-3 여백 보장
  - 뷰모드 스위처(32px)가 absolute라 헤더 in-flow 높이에 안 잡혀서, headerLeft/Right가 둘 다 없는 소비처(analysis-review/excel-calc-sheet/modeler)에서 헤더가 padding 이하로 찌그러들어 스위처가 카드 테두리 위아래로 3px씩 튀어나왔다. min-h-14(56px)로 헤더 높이를 보장해 p-3가 실제로 보이게 했다. 컴포넌트 자체 수정이라 소비처는 무변경.

- cad-web ToolDock·ZoomControl을 Docking composite로 이식
  - 로컬 DockButton/Divider 헬퍼를 걷어내고 Docking.Rail(toggle/action/popover)로 재작성했다. "중심선 검출"은 popover 아이템으로, 모드별 컨텍스트 줄은 Docking.Context로 이식. Zoom 라벨을 하드코딩 대신 zoomOutLabel/zoomInLabel prop으로 받아 cad-web i18n으로 대체할 수 있게 해 EN 로케일에서 한국어 고정되는 문제를 막았다. variant="default"라 색상은 원본과 완전히 동일.

- Docking popover 아이템의 색상 불일치 근본 원인 수정 (포털 스코프 이탈)
  - base-ui Popover.Content가 Portal로 data-skin/data-theme가 전혀 없는 html 바로 밑까지 올라가 렌더되면서, Docking 컨테이너의 스킨 스코프를 못 물려받았다. st-primary는 전역 정의라 파란 CTA만 정상 노출되고 st-popover/accent/muted/border는 안 잡혀 팝오버가 무너지니 "보라색이 너무 많다"는 시인성 문제로 나타났다. PopoverList.Content에 variant를 넘기면 포털 경계와 무관하게 그 팝오버 DOM 노드에 토큰을 직접 재정의하도록 하고, Docking이 자기 variant를 자동으로 넘기게 배선했다.

- viewer-core/2d/3d/modeler Tailwind @source 누락 수정
  - modeler와 apps/web의 Tailwind 설정이 자기 src만 스캔해서, viewer-2d/3d가 쓰는 임의값 클래스(Docking.Rail 포지셔닝용 right-[22px] 등)의 CSS 룰이 생성되지 않아 에러 없이 조용히 무시됐다. "도킹이 왼쪽에 있다"는 리포트의 원인이 이거였다. 소비처의 @source에 viewer-2d/3d 경로를 추가해 우측 22px 정상 복귀를 확인했다.

- 가로 Docking.Rail을 pill(rounded-full) 모양으로
  - 세로 레일(우측 아이콘 컬럼)은 각진 rounded-[10px] 그대로 두고, 가로 레일(orientation="horizontal")만 Docking.Bar와 같은 캡슐 모양으로 통일했다. cad-web ToolDock이 좌우 각진 모서리로 보이던 걸 해결.

- cad-web PaneHeader를 ToggleSelector로 이식
  - ToggleSelector에 variant를 추가(기본 "gray"로 하위호환 무영향)하고, 내부 PopoverList.Content에도 그대로 넘겨 팝오버가 열리자마자 Docking과 같은 톤으로 뜨게 해 포털 스코프 문제를 애초에 안 만들었다. PaneHeader(View/Lock/Label/Snap)의 hand-rolled 팝오버를 ToggleSelector×4로 재작성. 넷 다 독립 on/off 없는 순수 설정 드롭다운이라 pressed/onPressedChange를 menuOpen과 동일시해 기존 "버튼=트리거" 동작을 보존했다.

- AdapterLayout에 slot별 leftTheme/centerTheme/panelTheme 추가
  - 3D/CAD 캔버스처럼 콘텐츠가 항상 어두운 슬롯을 감쌀 때, 카드 프레임(border/bg-st-card)이 앰비언트(라이트) 테마로 남아 다크 콘텐츠와 부딪히는 문제를 해결했다. 각 슬롯에 data-theme을 지정하면 AdapterLayout이 그 슬롯의 카드 wrapper 자체에 얹어 프레임과 콘텐츠 밝기가 이어지게 하고, swap 시 슬롯 테마도 함께 따라간다. 생략하면 기존처럼 앰비언트 상속.

- cad-web leftTheme="dark"로 캔버스 프레임과 다크 콘텐츠 대비 해소
  - 검정 캔버스가 라이트 프레임 안에 박혀 보이던 걸 leftTheme="dark"로 프레임 자체를 다크 스코프로 옮겨 자연스럽게 이었다. 기존에 캔버스 내부 div에 직접 걸던 data-theme="dark"는 조상에서 상속되므로 제거(중복 방지). 우측 패널은 의도대로 라이트 유지.

- sds-web Windows 감지 강화 + mock 판정 이유 콘솔 노출
  - isWindows()가 userAgentData.platform ?? ... 체인이라 platform이 ""/"Unknown"(하드닝 브라우저/웹뷰)일 때 실제 Windows를 놓쳐 mock으로 오판할 수 있었다. 세 신호(uaData.platform/platform/userAgent) 중 하나라도 win이면 Windows로 보게 바꿨다. 또 왜 mock인지 알 수 없던 문제로 런타임 모드 결정 시 reason(non-windows/backend-offline/fes-missing)과 health 실패 에러를 콘솔에 남겼다.

- snb 상태 톤을 danger/muted/disabled 3종으로 정리
  - 미사용이던 accent 톤을 제거하고, blocked(선행 작업 대기, 지금은 조작 불가)를 muted에서 신규 disabled 톤으로 분리해 70% 불투명도로 흐리게 표시했다.

- 라이트 테마 muted-foreground 대비 개선
  - slate-400(#94a3b8)이 배경(paper) 대비 낮아 연해 보이던 걸 slate-500(#64748b)으로 톤업했다. foreground(#475569)와는 구분을 유지. 다크 테마는 어두운 배경 대비 이미 충분해 미변경.

- muted-foreground 0.5단계 추가 톤업
  - 앞선 개선 뒤에도 더 진하게 해달라는 피드백을 받아 slate-500과 600의 중간값(#56647a)으로 한 번 더 올렸다.

- AdapterLayout 최외곽에 기본 p-2 추가
  - 루트 래퍼에 패딩이 없어 헤더/콘텐츠 카드가 뷰포트 가장자리에 바로 붙어 rounded corner가 안 보이던 걸, p-2로 기본 여백을 줘 카드 프레임이 시각적으로 분리되게 했다. 소비처가 className으로 다른 패딩을 주면 tailwind-merge가 덮어써 오버라이드 가능.

- SNB Status Icon을 packages/ui StatusIcon 컴포지트로 승격
  - apps/web 전용이고 백엔드 WorkflowItemStatus 타입에 결합돼 있던 SnbStatusIcon을 도메인 중립 StatusIcon으로 승격했다. variant 어휘를 범용화(todo/review/invalid/running/approved/blocked/error)해 cad-web/design-web도 재사용 가능하게 하고, apps/web은 WorkflowItemStatus→variant 매핑을 통해 소비하도록 했다.

- ToggleSelector에 checkOnPressed 도입 (선택 시 좌측 아이콘 CompletionCheck 전환)
  - opt-in prop checkOnPressed를 추가해, 켜진 인스턴스가 pressed false→true로 전환되는 순간 CompletionCheck 그리기 애니메이션으로 좌측 아이콘을 체크로 스왑하게 했다(끄면 원래 아이콘 복귀). 기본 false라 기존 소비처(가역 설정 토글)는 무변경. 전이 감지는 WorkflowNodeStatusIndicator와 동일한 렌더 중 state 조정 + key remount 패턴을 재사용했다.

- checkOnPressed 체크 크기를 토글 아이콘 기본 크기에 맞춰 레이아웃 시프트 제거
  - Toggle primitive는 size 클래스 없는 아이콘에 default=size-4/sm=size-3.5를 적용하는데, 체크를 size-3.5로 고정해 둬서 default 토글(16px)에서 2px 시프트가 났다. 체크 크기를 primitive 규칙과 동일하게 미러링해 원래 아이콘 폭을 그대로 가져가게 했다.

- viewer-review playground에 Tailwind CSS 파이프라인 추가
  - @maxflow/ui 컴포넌트(Docking/ToggleSelector/AdapterLayout)가 Tailwind 유틸리티로 스타일링되는데 viewer-review playground엔 빌드 파이프라인이 아예 없어 클래스가 스타일 없이 렌더되던 문제를, viewer/3d와 동일 패턴으로 이식했다.

- checkOnPressed 기본 활성화 + 오버레이로 레이아웃 시프트 완전 제거
  - checkOnPressed 기본값을 true로 바꿔 모든 ToggleSelector가 켜질 때 좌측 아이콘을 체크로 자동 전환하게 하고(원래 아이콘 유지가 필요하면 opt-out), 아이콘 슬롯을 오버레이 구조로 바꿨다. 원래 icon을 항상 렌더해 박스를 고정(pressed면 invisible로 자리만 유지)하고 체크를 absolute inset-0 size-full로 겹쳐, 소비처가 어떤 크기를 주든 체크가 그 박스를 승계해 시프트 0px가 되게 했다.

- viewer-review playground에 라이트 모드 스코프·3d 소스 스캔 누락 보완
  - data-skin/data-theme가 없어 색 토큰이 스코프되지 않아 Docking/ToggleSelector가 다크 기본값으로 보이던 문제, 그리고 @source가 review 자신의 src만 스캔해 StructureViewer(viewer-3d)의 포지셔닝 클래스가 생성되지 않아 Docking.Rail이 좌측 하단에 떨어지던 문제를 함께 수정했다.

- viewer-core 헤더 오버레이 우측 여백을 다른 docking 위젯과 통일
  - ToggleSelectorGroup 컨테이너의 right가 12px로, 다른 플로팅 위젯의 22px 기준과 달라 우상단 툴바만 가장자리에 더 붙어 보이던 걸 22px로 통일했다.

- analysis-review playground 신규 구성 (Gen 백엔드 없이 mock 미리보기)
  - analysis-review는 독립 실행 환경이 없어 apps/web 노드로만 확인 가능했고, AnalysisResultReviewView가 내부에서 MIDAS Gen 사이드카가 필요한 BFF를 직접 호출하는 구조라 props 주입이 안 통했다. window.fetch를 가로채는 방식으로 playground를 구성했다. 모델+변위표만 mock하고 세부 결과표는 의도적으로 501을 반환해 앱의 "Gen 실시간 연결 필요" 폴백 카드를 그대로 보여주게 했다.

- popover-list SwitchListOnly 스토리 톤 초안 정렬
  - SwitchListOnly가 다른 스토리와 톤/여백/폰트가 달라 혼자 튀던 걸 재확인. SwitchGroup은 실제 뷰어 View 드롭다운에서 쓰이므로 컴포넌트를 바꾸면 프로덕션도 같이 커진다는 걸 확인하고, 세 옵션(컴포넌트 전체/스토리만/유지)을 제시한 뒤 이 스토리만 우선 정렬하기로 했다. 커스텀 타이틀+Divider와 SwitchItem className="py-3" 로컬 오버라이드로 공용 컴포넌트는 무변경 유지.

- analysis-review 3D 툴바 버튼을 Docking 디자인으로 통일
  - StructureViewer의 vtoolExtra 슬롯에 legacy chrome.tsx CSS 클래스를 쓴 raw button 4개(다크 슬레이트+보라색 active)가 이미 @maxflow/ui로 마이그레이션된 Docking.Rail 사이에서 튀어 보였다. DockingRailItem toggle에 optional ref(외부클릭 감지용)를 추가하고 renderDockingItem을 export해, 4개 버튼을 표준 DockingRailItem[] + renderDockingItem(variant="gray") 조합으로 재작성했다. 동작은 유지하고 시각 스타일만 통일.

- popover-list SwitchGroup 톤을 실제 뷰어에도 적용
  - 스토리에서 확정한 디자인을 실제 뷰어에 반영. SwitchItem 기본 padding을 py-2→py-3로 컴포넌트 레벨로 승격하고 스토리의 오버라이드는 제거했다. PaneHeader View/Lock 패널은 SwitchGroup title/onSelectAll 대신 Header+Divider 패턴으로 교체하고, 2단 계층인 Snap 패널은 구조는 유지한 채 padding 개선만 자동 적용했다.

## 정리

오늘 하루를 관통한 건 "공용 컴포넌트를 만드는 것과 실제 소비처에 붙이는 것은 다른 문제"라는 감각이었다. 어제 anatomy/스토리 위에서 완성했다고 생각한 AdapterLayout/Docking/ToggleSelector가, 실제 앱에 붙자마자 앱마다 다른 문제를 냈다. 대부분은 컴포넌트의 결함이 아니라 소비처의 환경이 공용 컴포넌트의 가정을 못 맞추는 데서 왔다.

특히 두 부류의 문제가 반복됐다. 하나는 Tailwind가 클래스를 조용히 무시하는 것. 소비처의 @source가 컴포넌트 소스를 스캔하지 않으면 임의값 클래스(right-[22px] 등)는 DOM에 붙어도 대응 CSS 룰이 안 만들어져 에러 없이 사라진다. "도킹이 왼쪽에 있다"는 리포트가 세 번쯤 다른 앱에서 반복됐는데 전부 같은 원인이었다. 다른 하나는 스코프 이탈. base-ui 팝오버 포털은 data-skin/data-theme가 없는 html 밑까지 올라가 토큰을 못 물려받고, 캔버스 다크 콘텐츠는 라이트 프레임과 부딪힌다. 전자는 팝오버 자신의 DOM에 토큰을 직접 재정의해서, 후자는 슬롯 단위 테마(leftTheme 등)로 프레임을 콘텐츠와 같은 스코프로 옮겨서 풀었다.

결국 공용 레이어의 실제 가치는 추출 시점이 아니라 이식 시점에 증명됐다. 한 곳에서 근본 원인을 파악하면(포털 토큰 재정의, @source 추가, 슬롯 테마) 나머지 소비처는 같은 패턴으로 빠르게 정합됐고, 이게 어제 상향식 추출이 오늘 하향식 적용으로 이어진 흐름의 보상이었다.
