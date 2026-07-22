---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "페이지 하네스 갤러리 Puck 편집기를 Figma급 저작 감각으로 하루 통째로 밀어올린 날. 새벽엔 전 컨테이너 정렬/분배·자식 align-self·Grid 행열 간격·다중선택 정렬(공유부모 flow 변형 8종)·이동 스마트 가이드로 캔버스 저작 능력을 얹었고, 아침엔 저장 상태 칩·단축키 치트시트·인스펙터 접이식 섹션·QuickInserter 키보드/fuzzy/recents·빈 캔버스 CTA·툴팁 통일로 발견성을 높였다. 낮엔 레이어 드래그 리프트+스프링 settle·undo 플래시 같은 모션 어휘와 스페이싱 스크럽을 넣고, 오후엔 구조 중복 3종 해체(영속화 writer 분리·라우트 레지스트리·usePage 훅), ⌘K 커맨드 팔레트, Mixed 값 멀티편집, 페이지 영역(landmark+sticky), 재사용 템플릿, 반응형 _responsive 데이터 차원, 네이티브/array 필드 폴리싱까지 관통했다"
updatedAt: "2026-07-18"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "page-harness"
  - "puck-editor"
  - "auto-layout"
  - "align-distribute"
  - "smart-guides"
  - "command-palette"
  - "quick-inserter"
  - "motion-vocabulary"
  - "inspector-polish"
  - "responsive-model"
  - "reusable-templates"
  - "architecture-cleanup"

relatedCategories:
  - "react"
  - "css"
  - "ux"
---

# 갤러리 Puck 편집기 저작·상호작용 폴리싱 하루

> 페이지 하네스 갤러리 Puck 편집기를 Figma급 저작 감각으로 하루 통째로 밀어올린 날. 캔버스 정렬/분배·스마트 가이드 같은 저작 능력, 커맨드 팔레트·QuickInserter·치트시트 같은 발견성, 드래그 리프트·undo 플래시 같은 모션 어휘, 그리고 구조 중복 해체와 반응형/템플릿 데이터 차원까지 관통했다.

## 배경

이날의 큰 갈래는 갤러리 Puck 편집기를 "쓸 만한 저작 도구"에서 "Figma처럼 손에 붙는 저작 도구"로 끌어올리는 폴리싱이었다. 하루가 하나의 흐름이었지만 그 안에 몇 개의 결이 겹쳐 있었다. 캔버스에서 무엇을 표현할 수 있는가(정렬·분배·오토레이아웃·데이터 모델), 그 표현을 어떻게 빠르게 집는가(커맨드 팔레트·QuickInserter·치트시트·빈 캔버스 CTA), 조작할 때 무슨 느낌이 드는가(드래그 리프트·스프링 settle·undo 플래시·스크럽), 그리고 이 모든 걸 떠받치는 구조가 얼마나 정리돼 있는가(영속화 분리·라우트 레지스트리·데드코드 제거).

관통한 태도는 자유값을 늘리는 대신 규격 안에서 표현력을 늘린다는 것이었다. 정렬은 자유좌표가 아니라 부모 컨테이너의 flow 변형으로, 반응형은 @media 방출이 아니라 순수 병합 리졸버로, 필드는 자유 입력이 아니라 고정 키워드 세그먼트로 풀었다. 기존 페이지가 깨지지 않도록 거의 모든 변경을 폴백과 항등으로 무회귀 처리한 것도 하루 내내 반복된 계약이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 전 컨테이너 정렬/분배 + 자식 align-self + Grid 행/열 간격
  - Stack/Grid/Frame 공용으로 교차축 align-items(시작/중앙/끝/늘이기)와 주축 justify-content(시작/중앙/끝/양끝/둘레/균등)를 세그먼트로 얹었다. 값은 자유 입력 없이 고정 CSS 키워드로 제한했다. Grid는 단일 gap을 rowGap/columnGap으로 분리하되 레거시 gap 데이터를 렌더에서 폴백 소비해 기존 페이지를 무회귀로 지켰고, 자식엔 align-self를 붙여 부모 흐름을 개별 노드가 되받을 수 있게 했다.

- Heading/Text 텍스트 정렬 + Frame radius/border/elevation 토큰화
  - Heading과 Text에 텍스트 정렬을 주고, Frame의 radius/border/elevation을 자유값 대신 토큰 세그먼트로 승격했다. 스타일 깊이를 늘리되 크롬 규격과 어긋나지 않게 값의 선택지를 토큰으로 가둔 것이다.

- 다중선택 정렬·분배 (공유부모 flow 변형, 8종 op)
  - 자유좌표를 도입하지 않고, 공유부모 컨테이너의 align/justify 한 축을 설정하는 flow 변형으로 다중선택 정렬을 표현했다. 정렬은 부모 align/justify, 분배는 주축 justify=space-between이다. 어느 prop이 그 축을 지배하는지는 컨테이너 방향으로 갈랐다(Row/Grid는 justify가 가로, Stack/Frame은 align이 가로). 전체를 단일 setData(recordHistory)로 묶어 ⌘Z 한 번에 정렬 전 align/justify가 완전 복원되게 했다.

- 이동/재정렬 스마트 가이드 (삽입 경계·균등 간격·중심/여백)
  - 노드를 이동/재정렬할 때 삽입 경계, 균등 간격, 중심/여백을 실시간으로 비추는 스마트 가이드를 CanvasOverlays에 얹었다. Figma식 스냅 감각을 캔버스에 들여온 것이다.

- 조용한 저장 상태 칩 배선 (상대시각·제목 옆 인라인)
  - 저장 상태를 요란한 토스트 대신 제목 옆 인라인 칩으로, 상대시각으로 조용히 표시하게 배선했다. 자동저장이 일어나고 있음을 방해 없이 알리는 어포던스다.

- 단축키 치트시트 완성 + 발견가능 '?' 진입점
  - 누락 단축키(묶기 ⌘G/⌘⇧G·이름바꾸기 F2·범위선택 ⇧클릭/⇧↑↓·마퀴 드래그)를 채우고, 에디터에 없는 '/' 전역 키를 가리키던 팬텀 행을 어포던스 행으로 정정했다. 상단 크롬에 'Keyboard' '?' 버튼을 붙여 발견가능하게 만들고, 열림 상태를 editor-stores로 승격해 키·버튼·Esc가 같은 토글을 공유하게 했다. cheatsheet.css도 토큰화하며 chrome:lint를 169에서 158로 낮췄다.

- 인스펙터 접이식 섹션 (표시 전용 그룹화 + localStorage 유지)
  - 인스펙터 필드를 표시 전용으로 그룹화하고 접이식 섹션으로 묶되, 열림/닫힘 상태를 localStorage에 유지해 다음 세션까지 이어지게 했다. 데이터 구조는 건드리지 않고 표시만 접은 것이다.

- QuickInserter 키보드 결과 이동 + fuzzy 랭킹 + recents
  - QuickInserter에 키보드로 결과를 오르내리는 이동, fuzzy 랭킹, 최근 사용(recents)을 붙였다. 마우스 없이도 컴포넌트를 빠르게 집어 넣는 삽입 경로를 강화했다.

- 빈 캔버스 첫 실행 중앙 CTA (컴포넌트 추가)
  - root 자식이 0인 빈 편집 캔버스에 중앙 정렬 첫 실행 어포던스(카피 한 줄 + 단일 primary 버튼)를 뒀다. 클릭은 기존 삽입 경로(requestRootInsert에서 root 끝 QuickInserter)를 그대로 재사용하고, appState 콘텐츠 길이로 반응형 게이트를 걸어 비면 나타나고 채우면 사라지게 했다. 형태는 크롬 준수(반경 4px·weight 500·유일 accent).

- 크롬 아이콘 9버튼 + 헤더 4액션 툴팁 통일 (kbd·키보드포커스, track-f)
  - 크롬 아이콘 9개와 헤더 4액션의 툴팁을 kbd 힌트와 키보드 포커스까지 포함해 하나의 규격으로 통일하고, track-f e2e(131줄)로 고정했다.

- 살아있는 사이드바 토글(.ph-dock-collapse)로 툴팁 이관
  - 툴팁을 죽은 핸들이 아니라 실제로 동작하는 사이드바 토글(.ph-dock-collapse)로 이관했다. 앞선 툴팁 통일의 후속 정리다.

- 레이어 드래그 리프트 + 스프링 settle 모션 어휘
  - 레이어 행을 잡으면 [data-overlay]로 표식해 리프트(translateY -2px + 헤어라인 + 그림자, opacity 0.9 고스트)를 주고, 놓으면 유일 승인 오버슈트 스프링(--spring-pop)으로 안착시키는 모션 어휘를 넣었다. 색은 color-mix 토큰만, box-shadow는 [data-overlay] 셀렉터 안에서만(크롬 §7.2). reduced-motion은 리프트 transform과 그림자를 걷고 opacity만 남겼으며, dnd 데이터/엔진은 건드리지 않는 추가형 CSS/DOM 변경만 했다.

- 드래그 리프트 그림자를 전역 리셋 위로 ([data-overlay] !important)
  - compose-global의 .ph-compose-left * { box-shadow:none !important } 리셋이 in-place(미포탈) 드래그 행의 리프트 그림자를 무력화한다는 리뷰 지적을 받았다. box-shadow는 §7.2상 [data-overlay]에서 legal이므로 .is-dragging[data-overlay]의 그림자를 !important로 승격해 리셋 위로 올렸다. 실브라우저 computed로 pristine=none(누수 없음), drag 시 헤어라인+소프트 그림자 렌더를 확인했다.

- undo/redo 영향 노드 좌행 + 캔버스 순간 플래시
  - undo/redo가 어떤 노드를 되돌렸는지 영향 노드를 레이어에서 좌표로 짚고 캔버스를 순간 플래시해, 되돌림의 결과가 어디서 일어났는지 눈으로 잡히게 했다.

- 스페이싱 램프 드래그-스크럽
  - 스페이싱 램프 값을 드래그로 문질러 조정하는 스크럽을 붙였다. 슬라이더 없이 숫자 필드를 좌우로 끌어 미세 조정하는 Figma식 상호작용이다.

- 인스펙터 데드코드 제거 (Selector·height.css)
  - 인스펙터의 죽은 코드(_shared의 Selector, height.css)를 걷어냈다. 표현력을 늘리는 만큼 안 쓰는 표면을 같이 줄인 것이다.

- 데드코드 제거 SidebarHandles + headerActions + barrel
  - SidebarHandles(159줄)와 headerActions, 배럴 export를 제거했다. 툴팁 통일로 역할을 다한 죽은 표면을 정리했다.

- 구조 중복 3종 해체 (영속화 writer를 scripts/page-store.mjs로 이전 + 라우트 레지스트리 + usePage 훅)
  - 하루의 큰 리팩터다. vite-plugins에 뭉쳐 있던 영속화 writer를 scripts/page-store.mjs로 떼어내(vite-plugins 403줄 감소) dev-server와 CLI가 같은 writer를 공유하게 했고, 라우트를 lib/routes.tsx 레지스트리로, 페이지 로딩을 lib/usePage 훅으로 뽑았다. DetailRoute와 ViewRoute가 같은 훅을 공유하게 해 중복 3종을 해체했다.

- 삽입선 px 갭 라벨 + 등간격 리듬 힌트
  - 삽입선에 px 갭 라벨과 등간격 리듬 힌트를 얹어, 어디에 얼마의 간격으로 꽂히는지 숫자로 보이게 했다.

- ⌘K 커맨드 팔레트
  - net-new [data-overlay] 오버레이로 ⌘K 커맨드 팔레트(427줄)를 새로 만들었다. fuzzy 검색·↑↓ 이동·Enter 실행·Esc 닫기에 정적 22개 명령과 동적 명령(turn-into·jump-to-layer·insert)을 합쳤다. 검색·키보드 디스패치·그룹화는 기존 _shared의 fuzzyRank·buildInserterIndex·node-ops.groupSelected를 재사용했고 chrome:lint는 155로 0-delta였다.

- 인스펙터 Mixed 값 멀티편집
  - 다중선택 시 값이 섞인 필드를 Mixed로 표시하고, 그 상태에서 한 번 편집하면 선택 전체에 적용되게 했다. scrub·segment·size·token·role 필드를 공통 _shared 경로로 묶어 멀티편집을 지원한 것이다.

- /p 공개 뷰 RootRender usePuck 가드 (read-only Render 대응)
  - /p 공개 뷰는 편집기가 아니라 read-only <Render>라 usePuck 컨텍스트가 없다. RootRender가 usePuck을 무조건 호출하다 공개 뷰에서 깨지는 걸, 컨텍스트 유무를 가드해 편집기와 공개 뷰 양쪽에서 동작하게 고쳤다.

- 페이지 영역 (landmark + sticky)
  - root-content 최상위 랜드마크 role(header/nav/main/footer/sidebar)을 조언 태그에서 1급 구조 슬롯으로 승격했다. 순수 레지스트리 region-resolver(각 role 최대 1개, 중첩/비-랜드마크 제외)로 <Render>가 시맨틱 랜드마크를 방출하고, header/sidebar엔 _regionSticky로 position:sticky(유일 승인 비-static)를 필드·렌더 이중 게이트로 걸었다. sanitize가 _role/_regionSticky를 왕복 무손실로 보존한다.

- 재사용 템플릿 (저장/삽입/API)
  - 선택 서브트리를 사용자 템플릿으로 저장하고 다시 삽입하는 경로를 pages와 동형으로 얹었다. 신규 파일 sink(templates.json) + dev-server GET/POST /api/templates + atomicWrite 규약을 재사용하고, 삽입 때마다 id를 reissue한다. 브라우저 없이 저장·카탈로그·구조 왕복하는 CLI(page.mjs templates)도 같은 파일락 규약으로 미러했다.

- 반응형 _responsive 데이터 차원
  - 저작 UI(뷰포트 스위처·per-bp 편집)는 별건으로 HOLD하고, 이 일감은 데이터 세트·리졸버·계약만 정의했다. 루트에 선택적 _breakpoints(모바일 375px 등)를 싣고, 노드 props._responsive?.[bpId]=Partial<StructuralProps> 오버라이드를 sanitize의 얕은 spread로 보존한다. 렌더 직전 resolveResponsiveProps로 base 위에 활성 bp를 얕게 덮되, base이거나 활성 bp가 없으면 오늘과 deep-equal 항등이라 무회귀다. @media 방출이 아니라 순수 병합인 게 핵심이다.

- 네이티브 필드 폴리싱 (fieldTypes 래퍼)
  - Puck 네이티브 필드 타입을 갤러리 규격 래퍼(fieldTypes)로 감싸 폴리싱했다. 인스펙터 전반의 필드 모양을 한 겹으로 통일한 것이다.

- array 필드 폴리싱 (추가/삭제/재정렬)
  - array 필드의 추가/삭제/재정렬 상호작용과 스타일(array-field.css 78줄)을 폴리싱해, 반복 항목을 다루는 인스펙터 경험을 다듬었다.

## 정리

하루를 관통한 계약은 "자유값을 늘리는 대신 규격 안에서 표현력을 늘린다"였다. 다중선택 정렬을 자유좌표가 아니라 공유부모의 flow 변형으로 푼 게 그 축약이다. 좌표를 흩뿌리면 순간의 편의는 있지만 컨테이너 흐름과 어긋나 나중에 무너지는데, align/justify 한 축으로 표현하니 정렬이 흐름의 일부로 남고 ⌘Z 한 번에 완전 복원됐다. 반응형을 @media 방출이 아니라 순수 병합 리졸버로 둔 것, 필드를 자유 입력이 아니라 고정 키워드 세그먼트로 가둔 것도 같은 결의 선택이었다.

두 번째로 반복된 태도는 무회귀였다. 레거시 gap을 rowGap/columnGap 폴백으로 소비하고, _responsive가 base일 때 sizeStyleFor가 deep-equal 항등이 되게 하고, _breakpoints를 defaultProps에서 빼 기존 페이지에 안 실리게 한 것 모두 "새 차원을 더해도 오늘 것은 그대로다"라는 계약을 코드로 박은 장치다. 표현력을 더하는 커밋마다 무회귀를 함께 증명한 셈이다.

세 번째는 발견성과 모션이 결국 같은 목표였다는 점이다. 커맨드 팔레트·QuickInserter·치트시트·빈 캔버스 CTA는 "무엇을 할 수 있는지 어떻게 알려주는가"였고, 드래그 리프트·스프링 settle·undo 플래시·스크럽은 "조작이 어떤 느낌으로 응답하는가"였다. 둘 다 도구를 손에 붙게 만드는 일이었고, 그 폴리싱이 규격을 벗어나지 않도록 모션은 [data-overlay] 안의 box-shadow와 color-mix 토큰만, reduced-motion 가드까지 챙겼다. 오후의 구조 중복 3종 해체(영속화 writer 분리·라우트 레지스트리·usePage 훅)와 데드코드 제거는, 이렇게 표면을 계속 더하려면 그 아래 구조가 먼저 정리돼 있어야 한다는 값이었다.
