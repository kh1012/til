---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "컴포넌트 갤러리와 페이지 갤러리를 형제 제품으로 대칭화한 하루. Puck 기반 페이지 에디터 크롬을 사용자 피드백으로 반복 하드닝하고(캔버스 프레이밍, 헤더 2줄에서 1줄 병합, 툴팁 안 보이는 버그 추적), harness에서 create·component-*로 스킬·디렉터리·런처를 일괄 개명하고, 페이지 에디터가 컴포넌트를 편집하게 하는 합성 가능성 계약(설계 문서 + 레지스트리 메타 84종 + 편집 어댑터 65종)을 깔았다"
updatedAt: "2026-07-12"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "page-editor"
  - "puck"
  - "dual-gallery"
  - "harness-rename"
  - "composability"
  - "editable-adapter"
  - "tooltip-debugging"
  - "storybook-taxonomy"
  - "component-gallery"
  - "drag-resize"

relatedCategories:
  - "react"
  - "typescript"
---

# 두 갤러리 대칭화: 페이지 에디터 하드닝부터 하네스 개명과 합성 계약까지

> 컴포넌트 갤러리와 페이지 갤러리를 형제 제품으로 맞춘 하루. Puck 페이지 에디터 크롬을 사용자 피드백으로 반복 하드닝하고, harness에서 create·component-*로 스킬과 구조를 일괄 개명하고, 페이지 에디터가 컴포넌트를 편집하게 하는 합성 가능성 계약을 깔았다.

## 배경

며칠간 ui-harness를 세워 컴포넌트 갤러리를 팀 실사용 단계까지 올린 뒤였다. 오늘의 큰 그림은 여기에 짝이 되는 페이지 쪽, 즉 Puck 기반 페이지 에디터와 페이지 갤러리를 컴포넌트 갤러리와 대칭인 형제 제품으로 정돈하는 것이었다.

그 대칭화는 세 방향으로 진행됐다. 첫째, 페이지 에디터의 크롬과 상호작용을 컴포넌트 갤러리 톤에 맞춰 사용자 피드백대로 반복 하드닝했다(여백 프레이밍, 헤더 병합, 툴팁, GUI 편집). 둘째, 스킬·명령·디렉터리·런처의 네이밍을 harness에서 create와 component-*로 일괄 개명하고 두 갤러리를 하나의 런처가 함께 띄우도록 구조를 재편했다. 셋째, 페이지 에디터에서 컴포넌트를 실제로 편집할 수 있게 하는 합성 가능성(composability) 계약을 설계 문서와 레지스트리 메타로 깔았다. 하루의 리듬은 사용자 지적을 근거로 재설계하고 브라우저와 타입체크로 즉시 검증하는 루프가 계속 도는 형태였다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 캔버스를 '워크스페이스 위 문서'로 프레임 (R29)
  - 사용자 지적: 캔버스 여백이 근거 없어 보이고 컴포넌트 갤러리 대비 정갈함이 뒤진다. 콘텐츠를 틴트 워크스페이스 위 흰 문서 카드로 감싸 여백에 "워크스페이스 마진 더하기 문서 마진"이라는 근거를 부여했다. 편집 전용 `.ph-editor` 스코프라 view 라우트에는 영향이 없고, 다크는 elevation이 반전(card가 muted보다 어두움)되므로 워크스페이스를 가장 어두운 background로 둬 페이지가 양 테마 모두 위로 뜨게 했다.

- 크롬 일관성, 상호작용, 레이아웃 피드백 6건 배치 (R30)
  - 핵심 버그는 Puck 루트가 100vh라 앱바 제외 영역을 45px 넘쳐 전체 페이지 스크롤이 생긴 것이었다. 루트를 height 100%로 가두고 `.ph-editor`에 overflow hidden을 걸어 없앴다(검증: docScrollHeight가 clientHeight와 일치). 히스토리 버튼만 h-8에 큰 폰트였던 걸 dense prop으로 편집 앱바 idiom(h-7)에 통일하고, undo/redo 아이콘을 20에서 16px로 줄이고, 팔레트와 핸들의 hover translate·scale을 제거해 갤러리 톤에 맞췄다.

- 헤더 토글을 아이콘 전용 ghost 버튼 + 설명 툴팁으로
  - 사용자: 토글이 무슨 기능인지 인지가 안 된다. 텍스트 라벨을 떼고 아이콘 전용 ghost로 바꾼 뒤 title 툴팁과 aria-label로 설명을 붙였다(그리드/와이어프레임/라벨). R26에서 넣었던 3D 리프트도 중화해 움직임을 없앴다.

- 새 페이지 버튼 아이콘화 + 미리보기 로고 불일치 제거
  - 새 페이지 버튼을 아이콘 전용(FilePlus2) primary CTA로 바꿨다. 미리보기(/p) 헤더의 큰 검정 'HARNESS' 워드마크가 앱 아이덴티티('PAGE GALLERY')와 충돌한다는 지적에 따라, 'Page Gallery'를 primary 틴트 배지 로고로 격상하고 죽은 로고 import를 정리했다.

- 헤더 토글에 즉시 표시 커스텀 툴팁(data-tip) 도입
  - native title 툴팁이 지연·누락으로 안 보인다는 피드백에, CSS `::after` 기반 data-tip으로 즉시 뜨는 툴팁을 넣었다(aria-label 유지). 다만 창 리사이즈가 불안정해 호버 스크린샷 검증이 막혔다고 본문에 남겼는데, 이게 곧 안 보이는 버그의 씨앗이 된다.

- 헤더 병합 1/2: undo/redo를 Puck 밖 앱바로 포털
  - PuckUndoRedo가 usePuck history(hasPast/hasFuture)를 reactive로 읽어, 실행취소와 다시실행 버튼을 EditRoute 앱바의 `#ph-header-undo` 슬롯으로 createPortal했다. 토글 3종은 스토어 기반이라 export만 해두고 다음 단계에서 앱바에 직접 렌더하기로 했다. 검증: 프레시 상태에선 둘 다 disabled, 삽입하면 undo 활성, 되돌리면 원복.

- 헤더 병합 2/2: 두 줄에서 한 줄 단일 헤더 완성
  - Puck 기본 헤더를 CSS로 숨기고 모든 컨트롤을 EditRoute 앱바 한 줄로 통합했다(좌: 목록·제목·slug, 우: undo·redo·줌, 그리드·와이어·라벨, 저장칩·히스토리·미리보기·저장하기). 이 도구는 발행이 아니라 디스크 저장이라는 지적에 따라 Publish를 '저장하기'로 rename하고, primary 버튼이 onChange가 캐시한 latestDataRef로 onPublish를 호출하게 했다.

- import 복사 버튼 높이 h-9 통일
  - 상세 페이지 액션 행에서 import 복사만 h-7이던 원인은 CopyButton을 size 없이 넣어 기본값 sm이 적용된 것이었다. 이웃과 같은 size lg(h-9, 즉 36px)로 맞췄다. 검증은 브라우저 getBoundingClientRect로 5개 버튼 모두 36px임을 확인했다.

- 컴포넌트 갤러리 헤더·툴바·필터 정리 + 분류순 스크롤 성능 개선
  - 헤더는 테마·도움말 버튼을 ghost로 통일하고 페이지 갤러리 전환 버튼을 우측 끝에 뒀다. 툴바의 정렬·카드모드는 컴팩트 Selector 팝오버로 바꾸고, 카테고리(Animations/Composite/System)는 상단 필터 행으로 통합했다(개수 뱃지, 단일 선택 칩). 성능 핵심은 scroll-spy를 CategoryRail 자식으로 분리하고 min-1560px에서만 관찰하게 한 것이다. 좁은 노트북에서 섹션 경계마다 카드 102개를 리렌더하던 낭비를 없애고, ComponentCard/Row에 React.memo, 썸네일에 content-visibility auto를 걸었다.

- 커스텀 툴팁(data-tip)이 안 보이던 버그: 애니메이션 제거
  - 툴팁 사가의 진단 단계다. hover로 생성되는 `::after`에 `animation: ph-tip-in ... both`가 걸려 시작 프레임의 opacity 0에 고정된 채 재생되지 않아 투명하게 렌더된 것이 원인이었다. `::after`를 강제 표시하면 z-index 100에서도 정상이라, 클리핑이 아니라 애니메이션이 범인임을 특정했다. animation을 제거해 즉시 표시로 고치고 중복 keyframe도 삭제했다. 다만 이 방식 자체가 곧 폐기된다.

- 페이지 갤러리 앱을 gallery/ 하위 디렉터리로 이동
  - index.html·src·public·tsconfig·vite.config를 `packages/page-harness/gallery/`로 옮겼다(23파일 순수 rename). package.json·scripts·pages·skills는 패키지 최상위에 남겼다. 내용 변경은 없고, 수정분은 후속 커밋으로 분리해 rename과 로직 변경을 섞지 않았다.

- gallery/ 이동 후속 경로 보정
  - tsconfig extends, vite pkgDir, registry import.meta.glob을 gallery 깊이만큼 한 단계 올리고, styles.css의 theme.css @import를 세 단계 up, index.html title을 'PAGE GALLERY'로, package.json vite 스크립트를 gallery 지정으로 맞췄다. 동작은 불변이다.

- 컴포넌트 GUI 편집 강화: 편집 어댑터 + 폭·열스팬 사이징
  - `editable/` 어댑터(editableAdapters·hasEditableAdapter)로 컴포넌트에 실제 편집 필드(섹션 배열 등)를 주입하고, 없으면 데모로 폴백하게 했다. 모든 노드에 `_width·_colSpan` 필드와 sizeStyleFor를 넣어 부모 flex/grid 안 레이아웃 박스를 GUI로 사이징할 수 있게 했다. 기본이 auto와 span1이면 아무 래핑도 하지 않아 무회귀. 이 시점 어댑터는 accordion 1종뿐이다.

- 헤더 툴팁을 @maxflow/ui Tooltip 컴포넌트로 전환
  - 툴팁 사가의 종결이다. animation opacity 0 고정 버그 때문에 CSS `::after`(data-tip) 방식 자체를 폐기하고, 컴포넌트 갤러리와 같은 base-ui portal 기반 `@maxflow/ui` Tooltip으로 교체했다. 헤더 아이콘 버튼 7종의 툴팁이 정상 출력됨을 확인했고, 텍스트 라벨이 있는 '저장하기'는 data-tip을 제거했다.

- 페이지 갤러리 포그라운드 기동 래퍼(page-gallery.mjs) 추가
  - ui-harness의 gallery.mjs와 동형으로, 포트를 확보한 뒤 rounded 박스 로그를 출력하고 vite gallery를 포그라운드로 기동한다. 루트 ui:page-gallery와 ui-harness dev.mjs가 이걸 참조한다.

- /page-harness를 /page-create로 개명 + /ui-harness에서 /component-create 위임 정리
  - 스킬명과 위임 대상 개명을 코드·문서·시드 전반에 반영했다. install-skills.mjs는 page-create 디렉터리로 설치하고 구명 page-harness 스텁을 제거하며, presets.json·sample-composed.json의 Placeholder 라벨도 /component-create로 바꿨다.

- 헤더 중앙 검색 도입 + 새 페이지 제목 입력을 프리셋 모달로
  - IndexRoute를 갤러리식 헤더 포털 검색(debounce, 히어로, 전체(n) 칩)으로 개편해 컴포넌트 갤러리와 UX를 대칭으로 맞췄다. 헤더가 검색에 넘어가면서 제목 입력은 PresetPicker 모달로 옮겼다.

- 편집기 런타임 페이지 사이드카를 gitignore
  - pages/*.history.jsonl(undo/redo 사이드카)과 자동명명 pages/page-*.json(스크래치)을 무시했다. 편집기 런타임 산출물이라 소스 커밋 대상이 아니다.

- 스킬 리네임: ui-harness/ui-curate/ui-apply를 component-create/curate/apply로
  - SKILL.md 정본, 설치 스크립트, 갤러리 UI·프롬프트·주석 참조를 새 스킬명으로 일괄 갱신했다. install-skills.mjs에 구명 스텁 제거 로직도 넣었다. page-create 개명과 대칭이다.

- ui:harness 런처에 페이지 갤러리(9222) 추가 + 컴포넌트 갤러리 리브랜드
  - dev.mjs가 세 번째 서비스(페이지 갤러리)를 순차 기동하도록 하고, 'UI 하네스 갤러리'를 '컴포넌트 갤러리'로 명칭 통일했다. 두 갤러리가 하나의 런처로 함께 뜨는 핵심 대칭화 지점이다.

- 갤러리 헤더 뱃지 광택 + 형제 갤러리 전이 애니메이션 CSS
  - `.badge-glass`(뱃지 유리 광택)와 `.anim-nav-enter/exit`(page와 components 갤러리 이동 전이)를 추가했다. 이미 커밋된 App.tsx가 참조하는 CSS를 뒤이어 채워 넣은 것이다.

- Storybook staging 카테고리 분리 + ui-valid 게이트 확장
  - registry.ts storybookUrlFor가 `Staging/<Category>/<Pascal>`을 생성하고, ui-valid.mjs scanStoryTitles가 그 컨벤션을 강제하도록 했다. ui-valid에 팔레트색·oklch·arbitrary 차단 축도 추가해 린트 게이트를 넓혔다.

- 레지스트리 requestedBy 표기를 component-create로 정규화
  - 구 명칭 `ui-harness//ui-harness`를 `component-create//component-create`로 통일했다(layer-list·scroll-area 엔트리의 provenance 메타).

- StatefulButton min-width를 arbitrary 값에서 스케일 유틸로
  - `min-w-[120px]`를 `min-w-30`(Tailwind 스케일 30은 7.5rem, 곧 120px로 시각 등가)으로 정리해 arbitrary 값을 축출했다. ui-valid의 arbitrary 차단 축과 같은 방향의 위생 작업이다.

- ModelViewer 원격 모델 에셋을 jsDelivr로 교체
  - 죽은 glTF-Sample-Models(raw.githubusercontent, 503)를 이전된 glTF-Sample-Assets(jsDelivr CDN)의 TOY_CAR URL로 교체하고 주석을 남겼다. 아래 title 재분류와 얽혀 있어 그 커밋만 분리했다.

- Storybook staging 스토리 title을 3개 카테고리로 재분류
  - `Staging/X`를 `Staging/<Category>/X`로 일괄 재분류했다(Animations·Composite·System). 순수 title 변경 76개 파일이며, 게이트가 강제하는 컨벤션에 실제 데이터를 맞춘 것이다. model-viewer는 에셋 fix와 함께 별도 커밋으로 분리했다.

- 스킬명 리네이밍 반영 문서 스윕
  - AGENTS.md, docs/ui-harness/* 다수, packages/README 등 문서·메타 13개의 용어를 component-create/curate/apply, ui:gallery에서 ui:components-gallery로 치환했다.

- 페이지 에디터 합성 가능성(composability) 설계·핸드오프 스펙 추가
  - Puck 에디터에서 컴포넌트를 편집 가능하게 만드는 `meta.editable` 계약, Phase 0에서 3까지의 로드맵, curate에서 review, promote로 이어지는 게이트를 담은 신규 설계 문서(278줄)를 넣었다. 오늘 만든 editable 어댑터와 뒤이을 레지스트리 계약이 전부 이 문서를 근거로 한다.

- 컴포넌트별 편집 어댑터 대량 확장(65종) + 경계선 드래그 리사이즈
  - editable/ 어댑터를 accordion 1종에서 65종으로 확장해(각 gallery 컴포넌트에 실제 편집 필드 주입, 7306줄) 오전에 깐 어댑터 인프라를 대규모로 채웠다. config.tsx에는 선택 노드 우측(폭)과 하단(높이) 경계 드래그 리사이즈를 추가했다(스냅 ¼·⅓·½·⅔·¾·가득, 높이는 px 램프).

- 레지스트리 엔트리에 페이지 에디터 editable 계약 메타 추가
  - harness/registry/entries/*.json 84종에 editable{kind·renderStrategy·source·importFrom} 계약을 추가했다(composability 설계 5장, 5700줄). ui-harness registry.ts에 EditableContract 타입을 정의했고, 리뷰 데스크 배지와 승격 게이트가 이 메타를 읽는다. 앞선 설계 문서의 실체화다.

- dashboard 데모 페이지 갱신 (v5)
  - 편집기로 구성한 대시보드 데모를 갱신했다(situational-alert·flowing-menu·Row·accordion 추가, '페이지 갤러리' 리브랜드 텍스트, updatedBy를 seed에서 kh1012로, version 1에서 5로). 에디터가 실제로 쓸 만해졌음을 자기 도구로 증명하는 도그푸딩 성격이다.

- GUIDE.md에 스킬 개명 반영
  - page-create와 component-{apply,create,curate} GUIDE.md의 스킬명·경로·명령 참조를 갱신했다. 평소 GUIDE.md는 커밋하지 않는 규율이 있는데, 이번 건은 사용자 명시 승인으로 한 번만 override했다.

- 분류 필터 칩 3종을 뱃지 fade-up 팝오버로 통합
  - Composite/Animations/System 칩 3개를 단일 「분류」 트리거 뱃지와 팝오버(CategoryBadgePopover)로 통합했다. 일반 리스트박스가 아니라는 요구에 따라, 뱃지가 트리거 하단에서 아래에서 위로 fade-up(ui-fade-up)하며 45ms stagger로 생성된다. 기존 Selector/HistoryPopover의 바깥클릭·Esc 닫기 패턴과 ui-fade-up 키프레임을 그대로 재사용했다. 검색 0건 분류는 숨기되 현재 선택은 유지해 락트랩을 막았다. 검수는 9221 브라우저 실검수(?cat 필터와 해제 복귀), tsc 통과, 콘솔 에러 0으로 닫았다.

## 정리

오늘 서른세 개 커밋을 하나로 꿰는 건 "컴포넌트 갤러리와 페이지 갤러리를 형제 제품으로 대칭화한다"는 상위 서사다. 오전에는 페이지 에디터의 크롬을 컴포넌트 갤러리 톤에 맞춰 여백·헤더·버튼 하나까지 근거를 붙여 하드닝했고, 오후 3시 30분 무렵 한 번의 큰 버스트로 네이밍(harness에서 create·component-*), 디렉터리(gallery/ 서브), 런처(듀얼 기동), provenance 메타까지 구조를 대칭으로 맞췄다. 저녁에는 편집 어댑터를 1종에서 65종으로, 레지스트리 editable 계약을 84종으로 채워 "컴포넌트를 페이지 에디터에서 편집 가능하게" 만드는 합성 가능성의 다리를 실제로 놓았다. rename을 순수 이동 커밋과 로직 변경 커밋으로 쪼개고 대량 메타·어댑터 확장을 따로 뗀 것처럼, 한 커밋에 한 관심사만 담는 규율이 하루 내내 일관됐다.

가장 배운 게 컸던 건 툴팁 디버깅 사가다. native title이 지연·누락으로 안 보여서 커스텀 CSS `::after` data-tip을 직접 만들었는데, hover로 생성되는 pseudo-element에 keyframe을 both fill로 걸면 시작 프레임의 opacity 0에 고정된 채 재생되지 않는다는 걸 만나서야 알았다. 강제 표시로 클리핑이 아니라 애니메이션이 범인임을 특정한 진단 과정은 좋았지만, 결론은 CSS 트릭 자체를 폐기하고 컴포넌트 갤러리가 이미 쓰던 base-ui portal 기반 공용 Tooltip으로 수렴하는 것이었다. 세 커밋에 걸쳐 "직접 만든 트릭보다 검증된 공용 컴포넌트 재사용이 옳았다"로 되돌아온 셈이다. 대칭화가 단지 이름을 맞추는 일이 아니라, 한쪽에서 검증된 해법을 다른 쪽이 그대로 쓸 수 있게 만드는 일이라는 걸 이 사가가 잘 보여줬다.

또 하나 남는 건 거의 모든 커밋이 사용자 지적에서 시작해 브라우저 실측으로 닫힌다는 점이다. 전체 페이지 스크롤은 docScrollHeight가 clientHeight와 같은지로, 버튼 높이는 getBoundingClientRect로 5개 모두 36px인지로, 필터 팝오버는 실제 ?cat 필터와 해제 복귀로 확인했다. 여백이 왜 이만큼인지, 버튼이 왜 이 높이인지까지 근거를 요구하는 성향이 컴포넌트 갤러리에서 다진 습관 그대로 페이지 에디터에도 적용됐고, 그 습관이 두 갤러리를 톤까지 같은 제품으로 묶는 실질적 힘이었다.
