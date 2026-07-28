---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "page-harness 편집기와 갤러리 전반을 '실패해도 복구 가능한 표면'으로 다시 손본 하루. ResizeObserver 진단 하네스의 수명주기를 증명하고, 캔버스 안전영역·선택 오버레이 기하를 단일 모듈로 모으고, 편집기 오버레이 스택과 Escape 우선순위·포커스 가림 판정 계약을 세웠다. 레이어 아웃라인에 접근 가능한 생산성 조작을 붙이고, 새 페이지 프리셋 선택과 상세의 계보 wayfinding을 검토 가능한 흐름으로 바꿨으며, 목록 라우트를 skeleton·에러·시맨틱·bounded rendering·반응형 검색까지 한 바퀴 정리했다"
updatedAt: "2026-07-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "page-harness"
  - "puck"
  - "accessibility"
  - "error-recovery"
  - "overlay-stack"
  - "safe-area"
  - "resize-observer"
  - "bounded-rendering"
  - "optimistic-concurrency"

relatedCategories:
  - "react"
  - "accessibility"
  - "testing"
---

# 실패와 좁은 화면과 250개를 견디게, 편집기와 갤러리를 한 바퀴 돈 날

> ResizeObserver 진단부터 캔버스 안전영역, 오버레이 Escape 스택, 레이어 아웃라인 조작, 프리셋 선택 흐름, 목록 라우트 정리까지. 새 기능보다 "잘못됐을 때 어떻게 되는가"를 채워 넣은 하루였다.

## 배경

page-harness 편집기는 그동안 기능이 빠르게 붙었다. 캔버스, 레이어 패널, 인스펙터, 히스토리, 프리셋, 상세 페이지, 목록. 각각은 행복 경로에서 잘 동작한다. 문제는 행복하지 않은 경로였다.

캔버스가 준비되지 않으면 어떻게 되나. 목록 로드가 실패하면 화면이 통째로 비나. 오버레이가 겹쳐 있을 때 Escape는 어느 것을 닫나. 포커스가 dock 뒤로 숨으면 사용자는 어디에 있는지 알 수 있나. 결과가 250개면 브라우저가 버티나. 좁은 화면에서 검색창이 다른 걸 밀어내지는 않나. 프리셋을 한 번 클릭했을 뿐인데 페이지가 만들어져 버리지는 않나.

오늘은 이 질문들에 하나씩 답을 채워 넣는 날이었다. 공통점은 전부 **"상태가 하나 더 있다"**는 것이다. loading 말고 timed-out, error 말고 transientError와 notFound, 성공 말고 stale-but-usable. 이 상태들을 이름 붙여 표면에 드러내는 게 오늘 작업의 대부분이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- ResizeObserver 진단 하네스의 수명주기 증명
  - E2E에서 `ResizeObserver loop` 경고를 추적하는 진단 도구가 있었는데, 이게 정작 자기 자신의 수명주기를 보장하지 못했다. 리스너를 붙였는지, init script를 설치했는지, 레지스트리를 정리했는지, dispose가 끝났는지를 아무도 확인하지 않았다.
  - 진단 타입에 `resources` 필드를 넣어 `listenersAttached`, `bindingInstalled`, `initScriptInstalled`, `registryDisposed`, `disposed`를 명시적으로 노출하고, `pendingCaptures`와 `disposables`를 붙잡아 정리를 강제했다. 이벤트에 `documentId`와 `deliveryTurn`을 추가해 어느 문서의 몇 번째 배달 턴에서 난 경고인지 구분할 수 있게 했다.
  - `RuntimeNotification`에서 `frame`, `url`, `lastDeliverySeq`, `deliveryTurn`, `candidates`를 옵셔널에서 필수로 승격시켰다. 진단 정보가 "있을 수도 있다"면 실패를 분석할 때마다 결국 없는 쪽에 걸린다. `duplicateKey`를 넣어 같은 원인의 반복 경고를 접었다.
  - 진단 도구가 스스로를 정리하지 못하면 테스트 간섭이 생기고, 그럼 진단이 만들어낸 실패인지 코드가 만든 실패인지 구분할 수 없게 된다. 진단 하네스는 무엇보다 자기 자신에 대해 결백해야 한다.
- 캔버스 내비게이션과 선택 오버레이 기하 통합
  - `canvas-navigation.ts`를 새로 만들어 `getCanvasSafeArea`를 단일 출처로 뒀다. 캔버스 위에 떠 있는 크롬(nametag, dock, host actionbar)의 실제 rect를 읽어 캔버스 rect에서 빼고, 최소 8px inset을 더해 안전영역을 계산한다. 크롬 높이를 상수로 박아두면 크롬이 바뀔 때마다 어긋나므로 실측으로 갔다.
  - `fitPageToView`도 여기로 옮겼다. 아트보드 크기(iframe이면 `contentWindow.innerWidth`/`body.scrollHeight`, 아니면 Puck preview frame의 offset)를 구해 안전영역에 맞는 zoom을 계산하고, 안전영역의 중심에 스크롤을 맞춘다. 캔버스 rect 중심이 아니라 **안전영역 중심**에 맞추는 게 포인트다. dock에 가려진 만큼 콘텐츠가 위로 올라와야 실제로 "화면에 맞춘" 느낌이 난다.
  - `CanvasOverlays.tsx`가 684줄 규모로 재작성되면서 선택 오버레이 기하도 여기 계산을 쓰게 됐다. 노드 요소를 찾을 때 호스트 document와 모든 iframe의 contentDocument를 함께 훑는다. 편집기가 iframe 안에 캔버스를 띄우므로, 두 좌표계를 오가는 지점이 오버레이 정합성이 깨지는 주된 원인이었다.
- 캔버스 리뷰 피드백 R2 반영
  - 오버레이 rect 검증 허용 오차를 1px 이하로 조였다. 느슨한 허용 오차는 "정합성 테스트가 있다"는 안심만 주고 실제 어긋남은 통과시킨다.
  - E2E 커버리지를 넓히고, 툴팁에 스타일을 입히고, jitter 임계값을 조정했다. `IframeBridge`와 `zoom-control`도 함께 손봤다.
- 편집기 내 복구 표면·패널 설정·캔버스 준비 회복력
  - 편집기 진입 시 캔버스가 준비되지 않는 경우를 다뤘다. `canvas-readiness` 수명주기를 두고 2초 타임아웃 후 `timed-out` 상태로 전이하게 했다. 그리고 슬러그가 바뀌면 이전 키의 콜백을 취소한다. 페이지를 빠르게 옮겨다닐 때 이전 페이지의 타임아웃이 새 페이지에서 터지는 걸 막기 위해서다.
  - 복구를 편집기 껍데기 **안에서** 하도록 했다. 실패했다고 전체 화면 에러로 튕기면 사용자는 열어둔 패널 상태를 다 잃는다. `EditorSkeleton`을 손봐 로딩과 실패가 같은 껍데기 안에서 표현되게 했다.
  - `panelPreferences.ts`로 좌/우 패널 폭과 접힘 상태를 localStorage에 저장하되, storage 접근을 전부 try/catch로 감싸고 실패하면 기본값(좌 360, 우 240)을 낸다. 폭은 200~520으로 clamp한다. 저장된 값이 깨져 있어도(NaN, 음수, 문자열) 유한하고 양수인지 확인 후 clamp를 거친다. 개인 설정 하나 때문에 편집기가 안 열리는 일은 없어야 한다.
  - `HistoryPanel`도 316줄 규모로 손봤다.
- 리뷰 피드백 라운드 1 반영
  - 랜드마크 포커스, 트리거 포커스 복귀, 로드 루프, 타임아웃 E2E를 고쳤다. 특히 로드 루프는 상태 전이 조건이 스스로를 다시 트리거하는 형태였는데, 이런 건 리뷰가 아니면 잘 안 잡힌다.
- 편집기 오버레이·키보드 접근성 계약
  - `overlay-stack.ts`로 열려 있는 오버레이를 모듈 스코프 스택으로 추적한다. 종류별 우선순위를 두고(dialog 40 > rename 35 > command-palette 30 > context-menu 20 > popover 10 > drag 5), **Escape 한 번은 최상위 항목 하나만** 닫는다. 스택이 비면 Escape가 선택 해제(secondary → primary)로 흘러내린다.
  - 호스트와 iframe의 키 이벤트가 같은 스택을 공유하게 해서 이중 처리를 막았다. iframe 경계가 있는 편집기에서 Escape가 두 번 처리되면 다이얼로그와 선택이 동시에 날아간다.
  - `focus-obscured.ts`로 포커스된 컨트롤이 크롬(topbar, dock, left pill, dialog, menu, listbox) 뒤에 완전히 가려졌는지 판정하는 헬퍼를 만들었다. 안전 경계 안에서 1px이라도 보이면 가려지지 않은 것으로 본다. 캔버스 대상은 `getCanvasSafeArea`를 재사용한다. 앞서 만든 안전영역 계산이 여기서 두 번째 소비자를 얻었다.
  - 패널 스플리터에도 접근성 계약(`splitter-a11y.ts`)을 붙여 키보드로 패널 폭을 조정할 수 있게 했다. `Toolbar`, `editor-globals`, `panels`가 함께 갱신됐다.
- 레이어 아웃라인 접근 가능한 생산성 계약
  - `LayersPanel.tsx`를 828줄 규모로 재작성했다. 접힘 상태(`collapsed-store`), 호버 미리보기(`hover-preview-store`), 스크린리더 안내(`announce-store`)를 각각 분리된 스토어로 뺐다.
  - `node-ops.ts`에 `getValidParentDestinations`를 추가했다. 드래그 없이 키보드로 노드를 다른 부모로 옮길 수 있게 하려면 "옮길 수 있는 곳" 목록이 필요한데, 여기서 자기 자신의 자손을 전부 수집해 제외한다. 자기 자손 안으로 자신을 넣으면 트리가 순환한다. 드래그 UI에서는 물리적으로 어려운 조작이 키보드 목록에서는 그냥 한 항목이 되므로, 명시적으로 걸러야 한다.
  - 잠긴 부모 아래로의 이동도 걸렀고, 루트("페이지")를 항상 첫 항목으로 뒀다. `context-menu`, `ComponentOverlay`, `CommandPalette`도 같은 조작을 노출하게 맞췄고 `chrome/layers.css`를 새로 뒀다.
- eslint-disable 제거와 Puck 타입 명시
  - 위 작업에서 남았던 `collapsed-store.ts`의 `eslint-disable`을 걷어내고 Puck 타입을 명시했다. `any`로 넘어간 자리에 disable 주석을 남기면 그게 그 파일의 기준선이 된다.
- 새 페이지 프리셋 선택을 검토 가능한 흐름으로 개편
  - 가장 중요한 변화는 **프리셋 옵션을 한 번 클릭해도 POST가 나가지 않는다**는 것이다. 이전에는 선택이 곧 생성이라 되돌릴 수 없었다. 이제 선택 후 제목을 입력하고 "페이지 만들기"를 명시적으로 눌러야 요청이 나간다. E2E에서 단일 클릭 시 `postCallCount === 0`을 직접 검증한다.
  - `slug.ts`로 제목에서 슬러그를 만들고 제목 유효성(최대 100자, 공백 전용 거부)을 검사하는 헬퍼를 뺐다. 사용자가 제목을 정할 수 있게 되면서 슬러그 생성 규칙이 필요해졌다.
  - `personal-state.ts`로 최근 사용 프리셋 5개와 즐겨찾기를 localStorage에 저장한다. 여기도 storage 실패는 전부 삼키고 빈 배열로 폴백한다. 최근 목록은 읽을 때 유효한 프리셋 id 집합으로 한 번 거른다. 프리셋이 삭제되면 최근 목록에 유령 항목이 남기 때문이다.
  - `PresetPicker.tsx`가 859줄 규모로 커졌다. 다이얼로그 하나에 프리셋 그리드, 제목 입력, 검증, 최근/즐겨찾기, 오류 복구가 다 들어간 결과다.
- 페이지 상세의 오류 복구·미리보기·계보 wayfinding 개편
  - `usePage.ts`를 손봐 DetailRoute와 ViewRoute가 각자 구현하던 로더를 하나로 합쳤다. 핵심은 **page GET과 list GET의 상태를 분리**한 것이다. 이전에는 에러가 하나였는데, 페이지는 잘 읽혔지만 목록만 실패한 경우와 페이지 자체가 없는 경우를 같이 취급하면 화면이 통째로 에러가 된다.
  - `PageStatus`를 `loading | notFound | transientError | ready`로 나눴다. 404(없는 페이지)와 일시적 네트워크 오류는 사용자가 취할 행동이 전혀 다르다. 전자는 목록으로 돌아가야 하고 후자는 재시도하면 된다.
  - seq 가드로 슬러그가 바뀌거나 재로드가 겹칠 때 가장 최근 요청의 응답만 반영하게 했고, `usePagesChanged`로 파일이 외부(다른 사용자, AI 스킬)에서 바뀌면 자동으로 다시 읽는다. page와 list 각각 별도 seq를 둔다.
  - `DetailLineageSection`으로 계보를 표면화했다. eject된 페이지가 원본과 버전이 어긋났는지(`hasVersionMismatch`), 원본이 사라진 고아인지(`isOrphan`)를 판정해 배너로 알린다. 고아 판정은 목록 로드가 `ready`일 때만 내린다. 목록이 아직 로딩 중인데 "원본이 없다"고 단정하면 거짓 경보가 된다.
  - `DetailPreviewSurface`와 `CopyValueButton`도 함께 추가했다.
- 목록 skeleton 정리
  - 여기서부터 목록 라우트(`IndexRoute.tsx`)를 한 바퀴 도는 작업이다. 검색·필터 같은 **로컬 변환**에도 skeleton이 뜨던 걸 없애고, skeleton은 초기 로드에만 쓰게 했다. refresh는 인라인 progress로 표시한다.
  - 로컬에서 배열을 거르는 데 skeleton을 띄우면 이미 화면에 있던 콘텐츠가 사라졌다 돌아온다. 데이터를 기다리는 것과 데이터를 다시 그리는 것은 다른 일이다.
- 목록 로드 실패의 두 갈래 처리
  - 최초 로드 실패는 이름 있는 에러와 재시도 버튼을 낸다. 보여줄 게 아무것도 없으니 에러가 주인공이 되는 게 맞다.
  - refresh 실패는 다르다. **직전에 성공한 데이터(last-good)를 그대로 유지**하고 stale 배너만 띄운다. 새로고침이 실패했다고 이미 보고 있던 목록을 지워버리면, 사용자는 새로고침을 누른 대가로 정보를 잃는다.
- 목록/not-found의 route-reflecting document.title
  - 라우트에 맞는 `document.title`과 고지를 붙였다. 상세는 `DetailRoute`에 위임해 중복 설정과 stale title을 제거했다. 두 곳에서 title을 쓰면 순서에 따라 이전 페이지 제목이 남는다.
- 빈 상태 CTA와 공유 create 트리거
  - 페이지가 하나도 없을 때 "첫 페이지 만들기" CTA를 낸다. `create-trigger.ts`로 트리거를 공유해서, 어디서 눌러도 PresetPicker가 열리고 제목 입력에 포커스가 간다. 빈 상태에서 "없습니다"만 보여주고 다음 행동을 안 주면 사용자가 막힌다.
- 목록 결과를 시맨틱 컬렉션으로
  - 결과를 이름 있는 `ul > li` 컬렉션으로 바꾸고 항목은 native link/button 시맨틱을 쓰게 했다. `listbox`/`grid` role은 금지했다.
  - 이건 의도적인 판단이다. `listbox`나 `grid` role을 선언하면 그 role이 요구하는 키보드 상호작용 모델(방향키 내비게이션, 활성 자손 관리)을 전부 구현해야 한다. 페이지 목록은 그냥 링크 목록이므로 native 시맨틱이 정확하고, 브라우저가 이미 제공하는 동작을 다시 만들 이유가 없다.
- 250개 초과 결과의 bounded rendering
  - `bounded-list.ts`로 250개를 넘으면 잘라서 렌더하고 "더 보기"로 50개씩 늘린다. **순서·전체 개수·포커스를 보존**하는 게 조건이다. 더 보기를 눌렀을 때 위치가 튀거나 전체 개수가 잘린 수로 바뀌면 목록이 얼마나 있는지 알 수 없게 된다.
  - 가상 스크롤 대신 명시적인 "더 보기"로 간 건, 목록에 포커스 이동과 앵커 링크가 걸려 있어서다. 가상화는 DOM에 없는 항목을 만들어내므로 이 둘과 충돌한다.
- 좁은 화면 검색을 trigger → full-width surface로
  - `use-media-query.ts`를 만들고, 좁은 화면에서는 검색 입력을 항상 펼쳐두는 대신 trigger 버튼으로 접어뒀다가 누르면 전체 폭 surface로 펼치게 했다. 좁은 폭에서 검색창이 툴바를 밀어내 overflow가 나던 걸 막는다.
  - 중요한 건 넓은 화면과 좁은 화면이 **같은 `q` 상태와 같은 단축키를 공유**한다는 점이다. 표현만 다르고 상태는 하나다. 반응형이라고 상태를 두 벌 만들면 화면 크기를 바꿀 때마다 검색어가 사라진다.
- 페이지 카드의 일관된 rename·duplicate·star·metadata 작업 모델
  - grid와 list가 각자 갖고 있던 카드 조작을 공용 `PageActionMenu`(base-ui DropdownMenu) 하나로 합쳤다. 두 뷰에서 **항목과 순서가 동일**하다(이름 변경… / 복제 / 즐겨찾기·해제 / stage별 프롬프트 복사). preview와 primary open은 메뉴 밖에 남겼다. 주 동작을 메뉴 안에 숨기면 클릭이 한 번 늘어난다.
  - Arrow/Home/End/typeahead/Escape와 트리거 포커스 복귀는 프리미티브가 제공하므로 직접 구현하지 않았다. 다이얼로그를 여는 항목에만 말줄임표를 붙였다.
  - `RenameDialog`는 GET 후 title-only 낙관적 저장을 한다. 공백·최대 길이 검증은 인라인으로 하고, 409 충돌이면 입력을 유지한 채 최신 title/version/actor를 보여주고 "최신본 불러오기"와 "취소"를 준다. 충돌했다고 사용자가 친 글자를 날리면 안 된다. 이를 위해 `Conflict` 타입과 서버 409 응답에 `current.title`을 추가했다.
  - `duplicatePage`는 원본 full을 읽어 새 draft v1.0.0을 만들고 `data`와 `presetId`만 복사한다. 원본의 history와 `derivedFrom`은 **재사용하지 않는다**. 그래서 원본은 바이트 단위로 변하지 않고, 새 페이지는 `created` 한 건만 기록한다. 복제가 원본의 계보를 물려받으면 "누가 무엇에서 나왔는지"가 뒤엉킨다.
  - 페이지 즐겨찾기는 per-user 로컬 상태로 두고 storage 실패 시 in-memory 폴백을 뒀다. 즐겨찾기 스코프 필터와 starred-first 정렬을 붙이고, 없어지거나 삭제된 slug는 자동으로 무시한다.
  - dev-server 요약에 `presetLabel`(presets.json 매핑)과 `pageSize`를 추가했다. full data는 포함하지 않는다. 카드에 메타를 보여주자고 요약 응답에 문서 전체를 실으면 목록이 무거워진다. legacy나 없는 값은 "미지정"으로 표시한다.
  - 프롬프트 복사 로직은 `usePromptCopy` 훅으로 빼서 기존 clipboard 성공/실패 처리와 history 기록을 그대로 유지했다.

## 정리

오늘 손댄 지점은 캔버스, 오버레이, 레이어 패널, 프리셋 다이얼로그, 상세, 목록으로 흩어져 있지만 실제로는 같은 질문 하나를 계속 물었다. **"이 화면에 상태가 몇 개인가?"**

거의 모든 경우 답은 "생각보다 하나 더"였다. 캔버스는 loading과 ready 사이에 timed-out이 있었다. 페이지 로드는 error 안에 notFound와 transientError가 섞여 있었다. 목록 실패는 최초 로드 실패와 refresh 실패가 완전히 다른 처방을 요구했다. 계보는 정상과 고아 사이에 "아직 판정할 수 없음"이 있었다. 이 하나 더 있는 상태를 이름 붙여 분리하는 것만으로 화면 대부분이 나아졌다. 반대로 이름이 없으면 개발자는 그걸 인접한 상태 중 아무 데나 밀어 넣고, 사용자는 잘못된 처방을 받는다.

두 번째 줄기는 **판정의 근거를 실측으로 옮긴 것**이다. 캔버스 안전영역을 크롬 높이 상수가 아니라 실제 rect에서 계산했고, 포커스 가림 판정도 같은 계산을 재사용했다. 상수로 박은 값은 박은 순간부터 틀리기 시작하지만 실측은 크롬이 바뀌어도 따라온다. 아침에 만든 `getCanvasSafeArea`가 저녁의 `focus-obscured`에서 그대로 쓰인 게 이 방향이 맞았다는 신호였다.

세 번째는 **되돌릴 수 있게 만드는 일**이다. 프리셋 클릭이 곧 생성이던 걸 명시적 제출로 바꾼 것, rename 409에서 사용자 입력을 유지한 것, refresh 실패에 last-good을 남긴 것, 복제가 원본을 바이트 단위로 건드리지 않게 한 것. 전부 "잘못 눌렀을 때 원래대로 돌아갈 수 있는가"에 대한 답이다. 특히 프리셋은 코드로 보면 한 줄짜리 변경이지만 사용자 경험에서는 성격이 다른 기능이 된다.

마지막으로, 오늘 여러 번 "이미 있는 걸 다시 만들지 않는다"를 택했다. 목록에 `listbox` role 대신 native `ul > li`와 링크를 쓴 것, 드롭다운의 키보드 내비게이션을 프리미티브에 맡긴 것, 가상 스크롤 대신 명시적 "더 보기"를 쓴 것. role을 선언한다는 건 그 role이 약속하는 상호작용을 전부 구현하겠다는 뜻이고, 지키지 못할 약속은 안 하는 게 접근성에는 더 낫다.
