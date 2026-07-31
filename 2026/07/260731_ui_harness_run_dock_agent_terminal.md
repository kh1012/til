---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "어제 붙인 '즉시 실행'을 하루 만에 상주 작업대로 키운 기록. 터미널 독 UI 셸을 복합 컴포넌트로 떼어내고, Codex를 두 번째 어댑터로 붙이고, 8방향 도킹·투명도·동시 실행 10개·Thinking Shimmer·프롬프트 히스토리(IndexedDB)·참조 컴포넌트 지목까지 얹으면서 중첩 포털과 큐 정체 같은 함정을 걷어냈다"
updatedAt: "2026-07-31"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "headless-agent"
  - "codex-cli"
  - "indexeddb"
  - "portal"
  - "cross-spawn"

relatedCategories:
  - "react"
  - "typescript"
  - "css"
---

# 하루 만에 터미널을 작업대로 키운 날

> 어제 만든 즉시 실행은 "프롬프트를 복사하지 않아도 된다"까지였다. 오늘은 그 터미널 앞에 실제로 앉아서 일해봤고, 앉자마자 걸리는 것들을 하나씩 뜯어고쳤다. 창은 화면 어디에 붙일지 고를 수 있어야 하고, 한 번에 한 개만 돌면 답답하고, 돌고 있는지 눈으로 알아야 하고, 보낸 프롬프트는 남아야 하고, CLI도 하나로 묶여 있으면 곤란하다.

## 배경

어제 갤러리 안에서 Claude Code를 헤드리스로 spawn하는 즉시 실행을 붙였다. 그때의 목표는 명확했다. 프롬프트를 복사해 터미널 창으로 옮기고 붙여넣는 손동작을 없애는 것. 그건 됐다.

그런데 하루를 그 터미널로 일해보니 다른 층위의 문제가 드러났다. 손동작은 사라졌는데 이번엔 그 터미널 자체가 작업대로서는 미성숙했다. 화면 하단 중앙에 고정돼 미리보기를 가리고, 한 번에 한 개만 돌아서 다음 프롬프트를 큐에 넣어놓고 기다려야 하고, 돌고 있는 건지 멈춘 건지 점 하나로는 잘 안 읽히고, 실행이 끝나면 방금 보낸 프롬프트가 그대로 증발한다. CLI도 Claude Code 하나에 묶여 있었다.

즉, 어제는 "복사 대신 실행"이었다면 오늘은 "실행을 오래 지켜보고 계속 시킬 수 있는 자리"를 만드는 날이었다. 시작점은 그 UI 셸부터 제대로 된 컴포넌트로 떼어내는 일이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- CommandPalette 소스 크기 정책 위반 해소(300줄 초과)
  - 어제 검색 팔레트에 무한 스크롤을 도입하면서 300줄 제한을 넘겼는데 그걸 모르고 지나갔다. 오늘 run-dock 작업 중에 발견해 결과 행 렌더링을 CommandPaletteRow로 분리했다. 정책은 자동으로 지켜지지 않고, 다른 작업 중에 걸려 넘어져야 알게 된다.

- run-dock 복합 컴포넌트 생성
  - "즉시 실행 Terminal을 복합 컴포넌트로 만들어서 packages/ui로 분리하자"는 요청에서 출발했다. 갤러리 안에만 있던 AgentDock/AgentRunRow를 라이브러리 자산으로 승격하는 작업이다.
  - 어디까지 옮길지가 첫 결정이었다. 백엔드 연동 로직(agent-api의 fetch·spawn, agent-store의 상태 관리와 자동 이어달리기)까지 통째로 옮기면 `@maxflow/ui`가 갤러리 전용 API를 알게 된다. 그래서 UI 셸만 분리하고 실행·삭제·이름변경은 `action` prop으로 소비처가 꽂는 쪽을 택했다.
  - 원본의 손맛은 그대로 옮겼다. 목록 접기, 헤더 높이 리사이즈, 목록↔상세 폭 리사이즈, 상태 점, 우클릭 이름 바꾸기, X 버튼 정리까지. 반대로 로그와 컴포저처럼 내용이 소비처마다 다른 상세 영역은 `renderDetail` 슬롯으로 뺐다. "구조는 라이브러리가, 내용은 소비처가"라는 어제 타임라인 통합과 같은 갈라짐이다.

- Dialog에 좌하단 정렬 옵션 추가, 터미널 독을 좌하단으로
  - Dialog는 화면 하단 중앙만 알고 있었다. 도킹 패널은 중앙이 아니라 모서리에 붙는 게 자연스러운데 표현할 방법이 없어서 `align="bottom-left"`를 추가했다.

- 즉시 실행에 Codex 어댑터 추가 + Windows spawn 안전성
  - 어제 어댑터 인터페이스를 분리해 뒀는데 실제 구현체는 Claude Code 하나뿐이었다. 인터페이스가 하나만 있는 상태에서는 그게 진짜 추상화인지 그냥 한 겹 감싼 것인지 알 수 없다. `codex exec --json`을 두 번째 어댑터로 구현해 그 질문에 답했다.
  - Windows에서 npm 전역 CLI는 `.cmd` shim으로 설치되는데 `spawn(shell:false)`은 그걸 못 찾는다. 아직 Windows에서 돌려보진 않았지만 예방 차원에서 cross-spawn으로 교체했다.
  - CLI 선택은 실행마다 바꿀 수 있어야 해서 FeedbackComposer의 leading 슬롯에 드롭다운을 넣었다. 셰브론 없이 lobehub/icons의 ClaudeCode/Codex 브랜드 아이콘만 보여주고, 고른 값은 localStorage에 기억한다.
  - 정직하게 남길 것도 있었다. codex 어댑터의 `item.type` 매핑은 미인증 환경에서 로그만 보고 설계한 것이라 실사용 스모크 테스트가 없었다. 그 사실을 cross-platform-notes.md에 명시했다.

- 터미널 독 8방향 위치 셀렉터·투명도 슬라이더, 초기 높이 2배
  - 좌하단 하나로는 부족했다. 어떤 컴포넌트를 보느냐에 따라 독이 가리는 자리가 달라지니 Dialog의 align을 8방향(top/top-left/top-right/left/right/bottom/bottom-left/bottom-right)으로 넓히고, 헤더에 3x3 그리드 팝오버 셀렉터를 붙여 즉시 옮길 수 있게 했다.
  - 그 왼쪽에는 전체 투명도 슬라이더를 붙였다. 새로 만들지 않고 `@maxflow/ui`의 Scrubber를 `variant="minimal"`로 확장해 재사용했다. 라벨도 숫자도 없이 트랙 길이로만 값을 전달하고 뜻은 툴팁이 밝힌다. 재생성이 아니라 prop 확장으로 간 게 중요한 지점이다.
  - 헤더와 셀렉터는 각각 AgentDock.header.tsx, AgentDock.position-selector.tsx로 분리해 300줄 정책을 지켰다.
  - 초기 높이는 기존 기본값의 2배로 늘렸다. 다만 리사이즈 최소값은 예전 기본 높이 그대로 뒀다. 늘려놓되 되돌릴 길은 남겨두는 쪽이다.

- codex 로그인 안내 + file_change 스키마 실측 보정
  - 미인증 상태에서 codex를 돌리면 WS에서 HTTPS로 폴백하며 재연결을 10번 넘게 시도하고 매번 error 라인을 뱉는다. 진짜 원인인 401이 그 잡음에 파묻혀 로그만 봐서는 뭐가 잘못됐는지 알 수 없었다. 재시도 잡음은 버리고 "Codex CLI 로그인이 필요합니다" 한 줄로 치환했다.
  - 인증된 세션으로 실제 성공 턴을 실측했다. 갤러리 실행 1회와 격리된 scratchpad 파일 생성 1회. 그 결과 `file_change`가 추정과 달랐다. `path`가 최상위에 있는 게 아니라 `changes:[{path,kind}]` 배열 안에 들어 있었다. 문서만 보고 짠 매핑은 이런 식으로 틀린다.

- 위치 셀렉터 글리프를 앵커 바 모양으로, 투명도 슬라이더 pill화
  - 3x3 그리드의 각 칸을 점 하나로 표시했더니 밋밋하고 무엇을 뜻하는지 안 읽혔다. Figma나 Sketch의 앵커 피커처럼 실제 도킹되는 모양으로 다시 그렸다. 모서리는 작은 블록, 변은 그 변을 따라 누운 긴 막대다. 형태가 결과를 미리 보여준다.
  - 팝오버에 fade-up 진입 애니메이션을 붙이고, 선택 상태는 브랜드색 대신 모노톤 링으로 바꿨다. 터미널 독 전체가 무채색 톤이라 여기만 인디고가 뜨면 튄다.
  - 투명도 슬라이더는 그라디언트 채움이 화면 톤과 안 어울려 연한 회색 단색 pill(rounded-full, h-1.5)로 바꿨다. default variant는 그라디언트를 그대로 둬 다른 소비처는 영향이 없다.

- 자동 이어달리기 큐 정체 수정
  - `continueRunId`로 세션을 이어가면 같은 `run.id`가 재사용되는데, 자동 발사 표시(`firedRef`)를 spawn 완료 후 해제하지 않고 있었다. 그래서 같은 run.id는 세션당 딱 한 번만 자동 실행되고, 이후 큐에 쌓인 프롬프트는 앞 실행이 done/error가 돼도 영영 시작되지 않았다. 4줄짜리 수정인데 증상은 "큐가 조용히 멈춘다"라 원인 찾기가 더 오래 걸렸다.

- 프롬프트 히스토리 버튼 추가(IndexedDB 로컬 기록)
  - 즉시 실행으로 보낸 프롬프트가 실행이 끝나면 증발한다. 비슷한 지시를 다시 보내려면 처음부터 타이핑해야 했다. 헤더 "즉시 실행 로그" 옆에 "프롬프트 히스토리" 버튼을 추가해 복사·개별 삭제·일괄 삭제를 할 수 있게 했다.
  - 저장은 로컬 IndexedDB에만 한다(서버 전송 없음, 최대 100개). 기존 idb.ts KV 스토어를 그대로 재사용했다.
  - 캡처 지점은 agent-store의 spawn 콜백 한 곳으로 모았다. 신규 실행·독 Composer 이어달리기·resume까지 모든 전송 경로가 그 한 곳을 지나므로 여기서 fire-and-forget으로 잡으면 빠지는 경로가 없다.
  - 팝오버는 LibraryHistoryPopover와 같은 자체 relative/absolute 패턴을 따랐다. 이 패키지에 base-ui Popover가 없어서다.

- 기존 lint/format 위반 2건 정리
  - 프롬프트 히스토리를 커밋하기 전 `pnpm run check`로 이번 변경과 무관한 사전 위반 2건이 잡혔다. run-dock.stories.tsx가 render 함수 안에서 useState를 직접 호출해 react-hooks/rules-of-hooks를 어겼고(대문자 컴포넌트로 분리), use-library-list.ts의 긴 의존성 배열 한 줄 표기가 prettier와 어긋났다(줄바꿈만).

- 터미널 Composer에 Claude Code 스타일 Thinking Shimmer
  - `status === "running"`일 때 대기열 줄 위에 반짝이는 동사 텍스트와 진행 시간, 모델을 보여준다. 모델은 CLI의 `system`/`init` stream-json 이벤트가 보고하는 값을 새로 파싱해 run에 저장했다.
  - effort와 토큰 수는 일부러 뺐다. 헤드리스 모드에서 CLI가 보고하지 않고, effort는 직접 지정하면 실행 동작 자체가 바뀌므로 표시용으로 지정할 수 없다. 보여줄 수 없는 값은 추정해서 채우지 않는다.

- 동시 실행 한도 1개에서 10개로 확대
  - `activeId` 단일값을 `activeIds` Set으로 바꿔 최대 10개 run이 동시에 running일 수 있게 했다. 초과분은 기존과 동일하게 큐잉되고 하나가 끝나면 다음이 이어진다.
  - 알면서 남긴 위험이 있다. 여러 run이 같은 워킹트리를 동시에 건드리므로 git 커밋/스테이징처럼 프로세스 격리가 안 되는 지점에 레이스가 남는다. 우선 열어두고 실제로 문제가 관찰되면 그때 worktree 격리를 검토하기로 했다.

- run-dock 데모 다듬기 두 번
  - 데모 하단 입력을 임시 입력창에서 실제 feedback-composer로 교체했다. 그리고 데모 폭을 1.5배로 넓히고 composer 그림자를 뺐다. 라이브러리 데모는 실제 사용 모습과 같아야 카드에서 판단이 된다.

- Thinking Shimmer 아이콘을 Loader로, 속도를 0.4배로
  - Sparkle + pulse가 너무 들떠 보여 lucide Loader + spin으로 바꿨다. 동사 교체 주기(2000ms→5000ms)와 shimmer CSS 애니메이션(1.8s→4.5s)도 0.4배속으로 늦췄다. 오래 지켜보는 표면이라 빠른 모션은 피로해진다.

- 프롬프트 히스토리 액션 뱃지/사용자 원문 캡처(1/2, 2/2)
  - 히스토리에 담기던 게 CLI에 실제로 보낸 전체 프롬프트라, 팝오버를 열면 컴포넌트 경로와 규칙 문단이 앞을 다 차지하고 정작 내가 뭘 시켰는지가 안 보였다. 그래서 `userText`(템플릿 감싸기 전 사용자 원문)와 `action`(modify/split/create/feedback)을 spawn에 함께 실어 보내도록 캡처 지점을 넓혔다. 전체 프롬프트는 참고용으로 계속 보관한다.
  - 1/2는 즉시 실행 3곳(InstantRunActions의 runModify·runSplit, CreateComposer.handleSubmit, PagePlaygroundFeedbackPanel.runFeedback), 2/2는 AgentDock의 이어달리기 2곳(자동 발사, Composer 즉시 제출)이다. 같은 파일들을 참조 컴포넌트 피커 작업과 동시에 편집 중이라 hunk 단위로만 반영해 서로 뒤섞이지 않게 했다.
  - 뱃지 색은 저장소에 이미 있는 토큰만 재사용했다. 전에 `text-step-n3` 미정의로 겪은 함정을 뱃지 색에서 반복하지 않으려는 것이다.
  - 빈 제출(피드백 재실행 시 추가 지시 없이 보내는 경우)은 원문이 비므로 label로 대체해 빈 줄이 뜨지 않게 했다.

- 참조 컴포넌트 지목 피커 추가
  - Composer에서 기존 컴포넌트를 검색해 "재사용 기반"으로 지목하면, 프롬프트 앞에 그 컴포넌트들의 이름·분류·요약·import·props가 담긴 섹션이 붙는다. 새로 만들지 말고 이걸 가져다 조합하라는 지시다. 지목한 것은 뱃지 줄로 보이고 각 뱃지의 X로 개별 제거한다.
  - 페이지 플레이그라운드의 ComponentPicker와 목적은 같은데 렌더 셸을 그대로 못 가져왔다. SearchPalette는 `Popover.Root`로 body에 포털하는데, 이 피커가 이미 AnchoredPopover(포털) 안에 중첩되는 자리(CreateComposer·AgentIntentForm)에서는 포털이 두 겹으로 겹쳐 안쪽 클릭이 바깥 클릭으로 오인되고 부모 팝오버가 닫혀버린다. 오늘 AgentChoiceSelector를 로컬 드롭다운으로 만든 것과 같은 사정이다.
  - 그래서 팝오버 껍데기 없이 검색·섹션·커서 로직만 있는 SearchPalettePanel/useSearchPaletteState를 가져다 로컬 셸에 얹고, `portal` prop으로 두 모드를 갈랐다. 터미널 독의 AgentRunComposer는 반대로 `overflow-hidden` Dialog 안이라 로컬 드롭다운이 패널 경계에서 잘리므로 `portal=true`로 띄운다. 로컬 모드는 뷰포트 충돌을 스스로 피하지 않으므로 화면 경계에 닿으면 반대쪽으로 뒤집는 계산을 직접 넣었다.
  - 뱃지는 테두리를 주지 않았다. 세 Composer 중 라벨 칩에 테두리가 없는 곳(AgentIntentForm의 plain span)이 있어, 테두리를 넣으면 그 옆에서 이 뱃지만 튄다.

- 실행 중 점 표시 깜빡임 속도 개선(2s → 0.8s)
  - 헤더 배지와 실행 목록 행의 "실행 중" 점이 Tailwind 기본 `animate-pulse`를 그대로 쓰고 있었다. 그건 스켈레톤 로딩용 2초 템포라 실제로 돌고 있는지 체감이 안 됐다. 전용 `status-pulse` 키프레임(0.8s)을 분리해 실행 표시만 빠르게 깜빡이게 하고 스켈레톤 쪽 `animate-pulse`는 그대로 뒀다. 같은 애니메이션이라도 뜻이 다르면 템포도 달라야 한다.

## 정리

오늘 터미널에 붙은 것들은 하나하나 보면 잡다한 UX 조정이지만, 관통하는 축은 "이 창 앞에 오래 앉아 있게 됐다"는 사실이다. 어제까지 즉시 실행은 눌러서 결과만 확인하는 버튼에 가까웠다. 오늘은 그게 상주하는 작업대가 됐고, 상주하는 표면에는 다른 요구가 붙는다. 자리를 옮길 수 있어야 하고(8방향 도킹), 뒤가 비쳐야 하고(투명도), 여러 개를 병렬로 돌려야 하고(동시 10개), 살아 있음이 눈에 읽혀야 하고(Shimmer, 0.8초 점), 지나간 것이 남아야 한다(프롬프트 히스토리).

기술적으로 오늘 가장 반복해서 걸린 건 중첩 포털이었다. AgentChoiceSelector가 로컬 드롭다운으로 우회했고, 참조 피커도 같은 이유로 SearchPalette의 셸을 못 쓰고 패널 로직만 떼어다 썼다. 포털은 "부모의 overflow에서 탈출한다"는 이점 때문에 쓰는데, 이미 포털 안에 있는 자리에서는 그 이점이 오히려 outside-click 판정을 망가뜨린다. 결국 팝오버 컴포넌트를 만들 때 껍데기(포털·바깥클릭·앵커링)와 알맹이(검색·커서·섹션)를 처음부터 나눠 내보내야 이런 자리에서 재사용이 된다는 게 오늘의 교훈이다. SearchPalettePanel/useSearchPaletteState가 이미 그렇게 나뉘어 있었던 게 운이 좋았다.

또 하나는 실측의 값어치다. codex 어댑터의 `file_change` 스키마는 문서와 추정만으로 짜서 필드 위치가 틀려 있었고, 실제 인증 세션으로 한 턴 돌려본 뒤에야 `changes:[{path,kind}]` 배열이라는 걸 알았다. 반대로 아직 실측 못 한 부분(Windows spawn, codex의 나머지 item.type)은 코드에 자신 있게 적는 대신 cross-platform-notes.md에 "아직 검증 안 됨"으로 남겼다. 검증하지 않은 걸 검증한 척 적는 게 나중에 더 비싸다.

마지막으로 run-dock 분리는 어제 timeline을 분리할 때와 같은 판단을 반복한 셈이다. 구조와 리듬은 라이브러리로, 내용과 연동은 소비처로. 다른 점은 timeline은 children으로 갈랐고 run-dock은 `renderDetail` 슬롯과 `action` prop으로 갈랐다는 것뿐이다. 두 번 같은 모양으로 갈라졌다는 건 이게 이 저장소에서 복합 컴포넌트를 떼어내는 기본 절단면이라는 뜻 같다.
