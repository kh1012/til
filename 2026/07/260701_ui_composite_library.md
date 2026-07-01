---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "wiki 디자인 컨셉을 packages/ui 공용 컴포지트(PopoverList·EmptyFileUpload·AdapterLayout·ToggleSelector/Docking)와 토큰(st-canvas·st-dock)으로 승격"
updatedAt: "2026-07-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "composite-component"
  - "storybook-anatomy"
  - "design-token"
  - "adapter-layout"
  - "popover-list"
  - "empty-primitive"

relatedCategories:
  - "react"
  - "css"
  - "typescript"
---

# packages/ui 공용 컴포지트·토큰 라이브러리 확장

> 손으로 반복 구현하던 팝오버·파일 업로드·어댑터 레이아웃·토글/도킹 UI를 wiki 디자인 컨셉과 Figma를 근거로 packages/ui 공용 컴포지트로 추출하고, 그 과정에서 필요한 토큰(st-canvas, st-dock)을 신설한 하루의 상향식 작업 기록.

## 배경

오늘 하루의 큰 줄기는 apps 곳곳에 손으로 흩어져 있던 UI 패턴을 packages/ui의 재사용 가능한 컴포지트로 끌어올리는 것이었다. 팝오버, 파일 업로드 빈 화면, adaptor 레이아웃, 뷰어 상단 토글/도킹까지 서로 다른 소비처(apps/web, design-web, cad-web)가 제각기 비슷한 걸 다시 만들고 있었다. 이걸 공용 레이어에서 한 번만 정의하고, 각 앱은 조합만 하도록 방향을 잡았다.

작업은 대체로 "Storybook anatomy/스토리로 모양을 먼저 세우고 → 공용 컴포지트로 추출하고 → 실제 소비처에 적용"하는 순서로 진행했다. 공용 레이어라 특정 i18n이나 앱 전용 토큰에 종속되지 않게 하는 것이 반복되는 제약이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 팝오버 디자인 컨셉 anatomy 스토리 추가
  - SettingsLanguageSelector(컨테이너·여백·제목·리스트형 라디오)와 WorkflowStageProductSelector(설명·하단 Action 바)를 st-*/accent 토큰으로 정규화해 합성한 팝오버 기본 컨셉을 Storybook anatomy로 시각화했다. 공용 컴포지트를 만들기 전에 "무엇을 추출할지"를 눈으로 확정하는 단계.

- 팝오버 anatomy 스토리 보강 + sds-web 개발 가이드 문서 추가
  - anatomy 스토리를 더 다듬고, 별도로 sds-web 개발 가이드 문서를 정리해 넣었다. 컨셉을 코드로 옮기기 전에 기준 문서를 남겨두는 성격.

- PopoverList 컴포지트 추가
  - wiki의 popover-default-design-concept를 기준으로 팝오버 컨셉(SettingsLanguageSelector 컨테이너·여백·라디오 리스트 + WorkflowStageProductSelector 설명·하단 Action 바 + ProductConnectionRow 카드형 액션 리스트)을 packages/ui 공용 컴포지트로 추출했다. Content/Header/RadioGroup·RadioItem/CardGroup·CardItem·CardItemAction/ActionBar·ActionButton API. 여기서 중요한 결정은 accent 대신 st-primary를 쓴 것인데, accent는 apps/web 전용 토큰이라 다른 소비처에서 미정의로 깨질 수 있어서였다.

- SettingsLanguageSelector에 PopoverList 적용
  - 손으로 짜뒀던 팝오버 컨테이너·제목·라디오 리스트 마크업을 방금 만든 PopoverList(Content/Header/RadioGroup/RadioItem)로 교체했다. role="menuitemradio", aria-checked 같은 동작·접근성 속성은 그대로 유지.

- sideOffset prop으로 Header 팝오버 위치 개별 조정
  - Header 팝오버 5개를 조사한 결과 위치 지정은 공용 Popover.Content 한 곳(sideOffset 하드코딩 8)뿐이라 인스턴스별 오버라이드가 불가능했다. "앱 전체 기본값 1줄을 바꿀지 vs Header만 조정할지"를 놓고, 기본값 8은 유지한 채 sideOffset optional prop을 신설해 Header 팝오버(project-selector/files-popover/notification-bell/user-avatar)에만 4를 적용하는 쪽을 골랐다.

- PopoverList에 SwitchGroup/SwitchItem 추가, ToggleSelector가 재사용
  - PopoverList에 스위치 기반 on/off 리스트(SwitchGroup+SwitchItem)를 추가해 레거시 TogglePanel의 "전체" select-all 개념을 대응했다. 뒤에서 만든 ToggleSelector의 드롭다운 패널도 기본 Popover.Content 대신 PopoverList.Content를 쓰도록 바꿔, 소비처가 Header/SwitchGroup/RadioGroup을 그대로 조합해 넣을 수 있게 했다.

- Empty 프리미티브 기반 파일 업로드 composite 추가
  - EmptyFileUpload composite. accent 버튼 클릭 시 네이티브 파일 탐색기를 열고, idle/uploading 두 상태를 Empty 프리미티브 하나로 전환한다. Showcase의 Empty States와 Misc/FileUpload 패턴을 결합한 것.

- EmptyFileUpload에 uploaded 상태·기본 아이콘 변경
  - 기본 아이콘을 CloudUploadIcon에서 PlusIcon으로 바꾸고, status에 "uploaded"를 더해 완료 상태(체크 아이콘 + Replace Files)를 표현했다. Uploaded·UploadedMultipleFiles·SelectDrawingFolder(실제 도면 폴더 선택 카피) 스토리를 추가하고 Interactive 데모가 uploaded까지 흐르도록 갱신.

- EmptyFileUpload에 원형 진행률·error 상태·완료 체크 애니메이션 추가
  - uploading에 progress prop(원형 CircularProgress + 중앙 퍼센트/라벨, rounded linecap)을 붙여 Showcase/Charts BrowserShare의 도넛+중앙값 패턴을 적용했다. status에 "error"까지 더해 idle/uploading/uploaded/error의 완전한 상태 세트로 추상화했고, uploaded 아이콘은 새로 만든 CompletionCheck(그리기 애니메이션 체크)를 기본값으로 썼다.

- CompletionCheck 원형 제거하고 plain Check로, 크기 확대
  - 원 안에 체크가 든 배지 형태를 걷어내고 lucide Check 그대로의 형태만 그려지게 단순화했다. 기본 크기는 키우되, EmptyFileUpload의 uploaded 아이콘은 다른 아이콘들과 규격(size-4)을 맞추도록 명시 오버라이드.

- EmptyFileUpload uploaded 아이콘·SelectDrawingFolder 카피 폭 조정
  - uploaded 기본 아이콘을 CircleCheckIcon에서 CheckIcon으로 바꿔 idle의 PlusIcon과 톤을 맞췄다. SelectDrawingFolder 스토리의 문장형 설명이 350px Gallery에서 3줄로 감기던 걸 WideGallery(440px)로 옮겨 의도한 2줄로 보이게 했다.

- EmptyFileUpload 폴더 선택 지원 + EmptyTitle 컬러 누락 수정
  - directory prop 추가. webkitdirectory는 표준 React 속성이 아니라 FolderOpenButton과 동일하게 ref로 직접 부여했다. 또 EmptyTitle에 명시적 text-st-foreground가 없어 앰비언트 텍스트 색을 안 주는 호스트(cad-web playground 등)에서 제목이 배경에 묻히던 문제를 EmptyDescription과 동일하게 명시 색을 줘 고쳤다.

- EmptyDescription 줄바꿈(\n) 미표시 문제 수정
  - text-sm/relaxed만 있어 white-space 기본값(normal)이 문자열 내 \n을 공백으로 무시하던 것을, whitespace-pre-line을 더해 실제 줄바꿈으로 렌더되게 했다.

- AdapterLayout 컴포지트 추가
  - apps/web 이하 Adaptor 패턴(design-web/sds-web/cad-web) 화면을 감싸는 공통 2/3-Col 레이아웃 프레임. 컬럼 경계는 pointer 드래그로 리사이즈 가능하고, 맨 우측 Panel은 기존 Aside 프리미티브를 감싸 collapse까지 지원한다. left(필수)/center(선택, 존재 여부로 2-Col/3-Col 결정)/panel(필수) 3-slot API, Panel 기본폭 384px·최대 512px, useAdapterLayoutPanel() 훅으로 collapse 상태만 노출하고 트리거 UI는 소비처 책임으로 뒀다.

- AdapterLayout Header 슬롯 + 뷰 모드 스위처 + 성능/스타일 개선
  - headerLeft/headerRight 슬롯과 center prop 존재 시 자동 노출되는 내장 뷰 모드 스위처(단일/좌우/상하 + swap)를 넣었다. Figma 컨셉을 TabsList w-full + TabsTrigger flex-1 등간격으로 재구성. split-vertical(상하 스택)을 신규 지원하려고 리사이즈 훅을 axis(horizontal/vertical)로 일반화했고, 드래그 중엔 ref로 DOM을 직접 mutate하고 pointerup에만 React state로 커밋해 매 프레임 re-render를 없앴다(design-web Pipeline과 동일 기법). 교차검증에서 나온 hasCenter Boolean 가드, swap 시 min-size 동반 스왑, view-mode 런타임 가드도 함께 반영.

- AdapterLayout에 경량 locale 분기 도입 (ko/en)
  - packages/ui는 apps/web(next-intl)과 design-web(자체 useDesignWebI18n) 등 서로 다른 i18n을 쓰는 곳에서 공용으로 쓰이므로 특정 라이브러리에 종속될 수 없다. 그래서 소비처가 이미 들고 있는 raw locale 문자열을 그대로 받는 locale?: string prop을 추가하고, en으로 시작할 때만 영문 라벨로 분기하는 resolveAdapterLayoutLabels를 신설했다. 리사이즈 디바이더/펼치기 버튼/뷰 모드 스위처에 하드코딩돼 있던 한국어를 전부 labels 참조로 교체.

- AdapterLayout 뷰모드 탭 아이콘 제거 + Header 여백 + Panel 순서 조정
  - 단일/좌우/상하 탭에서 아이콘을 빼고 각 탭에 px-3을 줬다. Header 상단 바의 h-10 고정을 없애고 py-3로 여백을 확보. 우측 Panel 리사이즈 디바이더 위치는 브라우저로 실측해 좌측 디바이더와 정확히 중앙 정렬됨(코드 결함 아님)을 확인했다.

- AdapterLayout Header 뷰모드 스위처를 absolute로 항상 정중앙 배치
  - headerLeft/headerRight 콘텐츠 폭이 서로 달라도 flex-1 여백 방식은 그 사이 빈 공간의 중앙일 뿐 헤더 전체 중앙이 아니었다. absolute + translate로 스위처가 헤더 바 정중앙에 고정되게 바꿨다.

- Panel collapsed 시 여백 제거 + 펼치기 핸들이 카드 경계에 걸치도록
  - 접혔을 때 gap-2를 빼서 콘텐츠 카드가 남는 폭을 다 채우게 하고, 펼치기 핸들(세로 pill)은 absolute + translate로 카드 우측 경계에 절반쯤 걸치게 배치. 기존엔 핸들 양옆에 8px씩 죽은 여백이 있었다.

- Panel collapsed 핸들이 우측 끝까진 안 닿게 여백 확보
  - 여백을 완전히 없앴더니 핸들이 카드뿐 아니라 컴포넌트 자체의 우측 경계까지 침범해 붙어 보였다. pr-2로 작은 여백을 되살려 카드 경계에서는 튀어나오되 컴포넌트 끝에는 안 닿도록 미세 조정.

- ToggleSelector·Docking composite Storybook 추가
  - viewer(2D/3D) 상단 헤더의 Toggle+Selector와 우측/하단 도킹 UI를 공용 Composite로 승격하기 위한 1단계로 스토리부터 구성했다. ToggleSelector는 토글(on/off) + 드롭다운 셀렉터 결합 컨트롤(Toggle+Popover 조합, ToggleSelectorGroup으로 단일 오픈 아코디언). Docking은 Rail(아이콘 레일)·Bar(하단 pill)·Zoom을 네임스페이스로 제공하고 배치는 소비처 책임. Figma 도킹 톤에 맞춘 st-dock-surface/st-dock-surface-foreground 토큰(라이트/다크 불변)을 apps/web과 packages/ui 이중 소스에 동시 반영.

- st-canvas 토큰 추가, /projects 계열 하드코딩 #F8FAFC 대체
  - /ko/projects와 /ko/projects/workflows 배경이 bg-[#f8fafc]로 하드코딩돼 있던 걸 새 토큰 st-canvas로 교체했다. accent라는 이름이 이미 두 의미(shadcn st-accent=무채색 hover, apps/web accent=브랜드 CTA)로 쓰이고 있어 세 번째 의미를 얹지 않고 새 이름을 골랐다. 라이트값 oklch(0.984 0.003 247.858)이 Tailwind slate-50과 동일함을 node_modules theme.css로 확인했고, 다크는 st-background에 alias해 기존 폴백 동작을 유지. SSOT(apps/web)와 packages/ui 사본(st.css) 양쪽에 반영.

## 정리

오늘 packages/ui 쪽 작업을 관통하는 원칙은 두 가지였다. 하나는 "공용 레이어는 소비처의 환경을 가정하지 않는다"는 것. PopoverList가 accent 대신 st-primary를 쓴 것, AdapterLayout이 특정 i18n 대신 raw locale 문자열만 받는 것, ToggleSelector/Docking 토큰을 apps/web과 packages/ui 양쪽에 동시 반영한 것 모두 같은 이유에서 나왔다. 공용으로 쓰려면 다른 소비처에서 미정의로 깨질 여지를 처음부터 없애야 한다.

다른 하나는 "모양을 먼저 세우고 나중에 추출한다"는 순서다. 팝오버도 EmptyFileUpload도 ToggleSelector도, anatomy/스토리로 상태 세트와 API 표면을 눈으로 확정한 다음에야 컴포지트로 굳혔다. 특히 EmptyFileUpload는 idle에서 시작해 uploaded, 원형 진행률, error까지 하나씩 상태를 붙여가며 완전한 상태 머신으로 자라났는데, 이렇게 스토리 위에서 먼저 키우면 실제 소비처(cad-web)에 붙일 때 남는 건 조합뿐이라는 걸 다시 확인했다.

토큰 이름을 새로 만들 때 accent의 전례가 좋은 교훈이었다. 하나의 이름에 의미가 겹겹이 쌓이면 소비처마다 다르게 해석돼 결국 하드코딩으로 되돌아간다. st-canvas라는 별도 이름을 준 건 그 반복을 끊기 위한 선택이었다.
