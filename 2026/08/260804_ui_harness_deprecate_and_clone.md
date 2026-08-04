---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "레지스트리에 쌓인 엔트리를 정리하고 복제 워크플로를 다듬은 하루. 실험용 엔트리 6개를 deprecated로 내리고, 복제로 만든 화면에 실데이터 목업을 채우고, Claude Code 스타일 텍스트 로더를 새로 만들어 그 로더를 복제 중 화면에 곧바로 써먹었다. 복제 후 이동을 클라 라우팅에서 하드 리로드로 바꿔 '컴포넌트를 찾을 수 없습니다'가 한 프레임 스치던 이중 전환을 없앴다"
updatedAt: "2026-08-04"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "registry"
  - "deprecated"
  - "clone"
  - "vite-glob"
  - "prettier"

relatedCategories:
  - "typescript"
  - "devops"
---

# 만든 걸 내리는 일과 베껴서 채우는 일

> 하네스 레지스트리는 만들기만 하고 내리는 길이 없으면 실험 잔해가 계속 쌓인다. 오늘은 라이브 테스트로 만들었던 엔트리들을 deprecated로 내리고, 반대편에서는 복제로 새 화면을 찍어 실데이터 목업을 채웠다. 복제 직후 화면이 두 번 바뀌던 문제도 이 과정에서 잡혔다.

## 배경

전날 라이브 테스트를 돌리면서 empty-state 계열과 badge, floating-help-button 같은 엔트리를 실험용으로 여럿 만들어 뒀다. 검증이 끝났으니 목록에서 내려야 하는데, 삭제까지 갈 이유는 없었다. 레지스트리 엔트리에 `meta.status`가 있으니 `active`에서 `deprecated`로 내리고 히스토리 사이드카(`*.history.jsonl`)에 이벤트를 남기는 게 맞는 처리였다.

반대쪽에서는 홈 화면 초기 상태 시안을 하나 더 만들어야 했다. 이미 있는 `home-getting-started-draft`를 클론해 변형하는 길을 전날 뚫어 놨으니 그걸 그대로 쓰면 된다. 그런데 실제로 복제를 눌러 보니 화면 전환이 매끄럽지 않았고, 그 김에 복제 중에 띄울 로더도 새로 필요해졌다.

여기에 전날 밤 병합분에서 넘어온 CI 게이트 실패(prettier, 타입에러)를 수습하는 일이 사이사이 끼어들었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- badge-cloned deprecated 처리
  - 라이브 테스트로 만들어 둔 badge-cloned 엔트리의 `meta.status`를 `deprecated`로 내리고 히스토리 사이드카에 상태 변경 이벤트를 append했다.

- floating-help-button deprecated 이벤트 기록
  - 하네스 UI에서 deprecated 전환을 눌러 보는 김에 floating-help-button에도 같은 이벤트를 남겼다. 히스토리 한 줄만 늘어나는 커밋이라 사실상 동작 확인이었다.

- empty-state 4종 데모 가로 중앙 정렬 복구
  - `empty-state-draft`를 4개로 분할하면서 데모 wrapper를 `flex-col`로 바꿨는데(하단 이벤트 텍스트를 넣으려는 목적) `items-center`를 빠뜨려 고정폭(`w-96`) 박스가 왼쪽으로 붙어 있었다.
  - 분할 전 원본은 가로 flex라 `justify-center`만으로 됐다. `flex-col`에서는 `justify-center`가 세로축이 되므로 가로 중앙은 `items-center`로 따로 잡아야 한다. 분할 과정에서 축이 바뀐 걸 놓친 자리다.

- empty-state-not-found padding 대칭 복원 기록
  - "카드 하단 padding만 없는 구조가 이상하다"는 지적에 따라 이전에 넣었던 `pb-0` 오버라이드를 걷어내 `Empty` 기본 padding(`p-8`, 상하좌우 동일)을 복원한 조치를 히스토리 사이드카에 append했다.

- 연한 파랑 배경 hex를 #F7F8FB로 정정
  - 페이지 배경 프리셋의 연한 파랑 값을 정정했다.

- empty-state-draft 편집 어댑터 타입에러 수정
  - `empty-state-draft`를 4분할하는 리팩터로 `EmptyStateSwitcher`가 제거됐는데, 페이지 하네스의 편집 어댑터가 여전히 그걸 참조해 CI 타입체크가 깨졌다.
  - 정적 쇼케이스로 바뀐 실제 컴포넌트에 맞춰 `EmptyStateDraft`로 교체했다. 라디오 전환을 전제로 적혀 있던 주석도 함께 정정했다.

- prettier baseline 미반영 파일 일괄 포맷
  - CI `format:check` 게이트가 baseline에 없는 신규 위반 15개로 실패했다. `prettier --write`로 정리하고, `--ignore-all-space` 비교로 공백·줄바꿈 diff만 있고 의미 변화가 없음을 확인했다.

- empty-state 4종(not-found, notifications, projects, team) deprecated 처리
  - 네 엔트리를 차례로 `deprecated`로 내리고 각각 히스토리에 상태 변경 이벤트를 남겼다. 엔트리 JSON을 다시 저장하는 과정에서 배열 필드가 한 줄에서 여러 줄로 다시 포매팅되는 diff가 함께 붙었다.

- Claude Code 스타일 텍스트 로더(loader-cloned) 추가
  - 로딩 문구가 순환하면서 셔머가 흐르는 로더 요청. 기존 `loader`(LoaderFive, 글자 단위 wave)와 역할이 겹친다고 알렸지만 사람이 신규 생성을 선택했다.
  - `loader-cloned`(ClaudeCodeLoader)로 별도 생성하고, `loader.history.jsonl`에는 재사용을 추천했으나 거부된 이벤트를 남겼다. 판단 자체를 기록으로 남겨 두는 쪽을 택했다.

- 야간 회귀 리포트의 '사고 추정'을 '이슈 추정'으로 완화
  - "사고"는 누군가 잘못했다는 뉘앙스가 강해서, 커밋 작성자를 지목하는 리포트·Teams 카드·GitHub Issue 문구로 쓰기엔 과했다.
  - 분류 로직(`accidental`/`intentional`)은 그대로 두고 사람이 읽는 한국어 라벨만 순화했다. 무관한 "실측된 사고"(과거 디버깅 후기) 코멘트가 있는 `capture-env.ts`/`capture-init.ts`는 손대지 않았다.

- LoaderFive에 fontWeight prop 추가
  - 기존 loader가 `font-bold` 고정이라 굵기를 못 바꿨다. `fontWeightClassMap`으로 thin~black을 열고 기본값을 `medium`으로 뒀다. 기본값과 기존 굵기(bold)를 비교하는 스토리도 함께 넣었다.

- loader-cloned 다듬기: ✻ 텍스트 span 제거, 표시명·설명 수정
  - 장식용 ✻ 문자를 넣은 span을 걷어냈다. 표시명은 "String Loader"로 정하고 각 변경마다 히스토리에 modified 이벤트를 남겼다.

- home-getting-started-draft-cloned 클론 생성
  - `home-getting-started-draft`를 클론해 새 엔트리를 만들고, 생성 이벤트를 히스토리에 남긴 뒤 표시명과 설명을 정리했다.

- home-getting-started-toolbar 검색창·버튼 높이 통일
  - "전체 프로젝트 관리" 버튼이 `size="sm"`이라 옆의 검색 인풋보다 낮았다. `size="default"`로 올려 두 요소의 높이를 맞췄다.

- 병합 후 신규 prettier 위반 3개 파일 포맷
  - 병합 뒤 baseline 밖 신규 위반이 다시 생겨 CI `format:check`가 실패했다. import 구조분해와 JSX 속성 줄바꿈 등 순수 포맷 변경이라 로직 변화는 없다.

- home-getting-started-draft / draft-cloned 표시명·설명 정리
  - 원본 draft의 summary를 기능 나열형("홈 화면에서 인사와 프로젝트 탐색, 그룹 현황...")에서 "데이터 없는 경우, 초기 상태"로 줄였다. 목록에서 두 엔트리를 구분하는 데 필요한 건 이 화면이 무슨 상태를 보여주는지지, 안에 뭐가 들었는지가 아니다.
  - 클론 쪽도 같은 기준으로 표시명·설명을 맞추고 각각 히스토리에 남겼다.

- alert 클론 생성과 즉시 revert
  - 복제 흐름을 Playwright로 실제 검증하면서 `alert-cloned` 엔트리와 히스토리 이벤트가 실제로 만들어졌다. 검증이 끝난 뒤 테스트 산출물 커밋 2건을 `git revert`로 되돌렸다.

- home-getting-started-draft-cloned 빠른 모듈 카드에 실데이터 목업 반영
  - 클론한 화면의 "빠른 모듈" 카드가 빈 껍데기라 실제로 어떻게 보일지 판단이 안 됐다. 실데이터에 가까운 목업을 채워 넣었다.

- 복제 중 화면을 로더로 교체하고 이중 전환 제거
  - 복제 중 오버레이를 RouteSkeleton에서 아침에 만든 ClaudeCodeLoader(`@maxflow/ui/staging/loader-cloned`)로 교체했다.
  - 이중 전환이 진짜 문제였다. `navigate`(클라 라우터)로 이동하면 방금 생성된 레지스트리 항목이 이 탭의 메모리(`entries`, `import.meta.glob` eager 배열)에는 아직 없어서 "컴포넌트를 찾을 수 없습니다"가 한 프레임 뜬 뒤, 서버의 파일 추가 통지가 거는 풀 리로드로 화면이 다시 바뀐다.
  - `navigate` → `window.location.assign`(하드 리로드)로 교체했다. 목적지 로드 자체가 디스크의 새 파일을 읽으므로 못 찾은 상태 없이 한 번에 도착한다.
  - Playwright로 alert를 실제 복제해 로더 표시, not-found 미노출, `alert-cloned` 직행을 확인했다.

- home-getting-started-draft-cloned 프로젝트 그룹 리스트에 실데이터 목업 반영
  - 빠른 모듈 카드에 이어 프로젝트 그룹 리스트에도 목업을 채웠다.

- 흐름 테스트 잔여물 정리와 빠른 모듈 카운트 라벨 톤 조정
  - 흐름 복제 테스트로 남은 `새-흐름.json`을 지웠다.
  - 빠른 모듈 헤더의 등록 개수 라벨이 `font-bold`라 제목보다 튀었다. `font-medium` + `text-st-muted-foreground/70`으로 내려 부가 정보 위치로 되돌렸다.

## 정리

오늘의 절반은 **레지스트리에서 뭔가를 내리는 일**이었다. 여섯 개 엔트리를 deprecated로 바꾸면서 든 생각은, 만드는 길만 뚫고 내리는 길을 안 만들면 라이브 테스트 한 번에 잔해가 그대로 목록에 남는다는 것이다. `status` 필드 하나와 히스토리 사이드카가 있어서 "삭제 아니면 방치"라는 이지선다를 피할 수 있었다. 지우면 왜 만들었는지가 사라지고, 두면 목록이 계속 더러워진다. deprecated는 그 사이에 있는 자리다.

`loader-cloned`를 만들 때 재사용을 추천했다가 거부당한 걸 히스토리에 남긴 것도 같은 맥락이다. 나중에 "왜 역할이 겹치는 로더가 둘이나 있나"라는 질문이 나올 때, 그게 못 본 결과인지 보고 내린 결정인지가 남아 있어야 한다. 그리고 이 로더는 만든 지 30분 만에 복제 중 오버레이에 실제로 쓰였다. 겹친다고 판단했던 게 실은 다른 자리를 채운 셈이라 결과적으로는 사람 판단이 맞았다.

**복제 후 이중 전환**은 오늘 가장 배운 게 많은 자리였다. `navigate`로 클라이언트 라우팅을 하면 SPA로서 당연히 맞는 선택인데, 여기서는 그 "당연함"이 틀렸다. 레지스트리 엔트리 목록이 `import.meta.glob(eager)`로 빌드 시점에 굳어 있어서, 방금 디스크에 생긴 파일은 이 탭의 메모리에 존재할 방법이 없다. 결국 서버가 파일 추가를 알리고 Vite가 풀 리로드를 걸 때까지 기다려야 하는데, 그 사이 한 프레임 동안 "컴포넌트를 찾을 수 없습니다"가 스친다. 로더를 예쁘게 바꾸는 걸로는 이게 안 없어진다. **화면을 부드럽게 만드는 것과 상태가 없는 순간을 없애는 건 다른 문제**였고, 답은 클라 라우팅을 포기하고 하드 리로드로 가는 것이었다. 어차피 리로드가 뒤따라올 거라면 처음부터 리로드로 가는 게 전환을 한 번으로 줄인다.

`empty-state` 데모 정렬이 깨진 건 작지만 전형적인 자국이다. 컴포넌트 하나를 넷으로 쪼개면서 wrapper를 `flex-col`로 바꿨는데, flex 방향을 바꾸면 `justify-center`가 가리키는 축이 바뀐다는 걸 넘겼다. 원본에서는 아무 문제가 없던 코드가 축이 뒤집히는 순간 다른 뜻이 된다. 분할 리팩터가 남긴 자국은 이것뿐이 아니라 편집 어댑터의 타입에러(`EmptyStateSwitcher` 참조 잔존)로도 나타났다. **하나를 넷으로 쪼개는 작업은 쪼갠 자리보다 그걸 참조하던 바깥에서 더 많이 터진다.**

CI 게이트로 두 번(prettier 15개, 병합 후 3개) 멈춘 것도 기록해 둔다. baseline 방식이라 기존 위반은 통과하고 신규 위반만 잡히는데, 병합할 때마다 새 위반이 유입되니 결국 병합 뒤엔 한 번씩 돌려야 한다. 실질적으로는 병합의 마무리 절차에 가깝다.
