---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "에이전트 실행 로그를 다시 열었을 때 맥락이 통째로 사라지는 문제를 파고든 하루. 요소 지정 대상과 첨부 이미지는 프롬프트 문자열에만 구워져 들어가 로그에 안 남았고, 턴 소요시간은 이미 채워져 있는데 그리지만 않고 있었다. 여기에 큐 개수를 컴포넌트 로컬 state에 두어 형제 UI가 못 읽던 것, HITL 결정 후 같은 행에서 이어지지 않고 새 세션이 열리던 것까지 함께 고쳤다"
updatedAt: "2026-08-04"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "agent-run"
  - "react-context"
  - "event-sourcing"
  - "hitl"
  - "state-colocation"

relatedCategories:
  - "typescript"
  - "state-management"
---

# 프롬프트 문자열에 구워 넣으면 로그에서 사라진다

> 요소를 지정해 요청을 보내면 그 정보는 완성 프롬프트 안에만 들어가고, 실행 로그의 사용자 말풍선에는 흔적이 없었다. 첨부한 이미지도 마찬가지였다. 로그를 다시 열면 "이 요청이 무엇을 겨눴는지"가 아예 소실된다. 오늘은 이 구조를 세 군데에서 똑같이 발견하고 같은 패턴으로 고쳤다.

## 배경

전날까지 실행 로그에 사용자 말풍선을 붙여 "내가 뭘 시켰는지"를 남기게 만들어 놨다. 그런데 말풍선에 실리는 건 사용자가 타이핑한 원문(`userText`)과 뱃지로 붙인 참조뿐이었다.

문제는 요청을 구성하는 다른 입력들이었다. 크로스헤어로 화면의 요소를 찍어 지정한 대상, 작성기에 드래그해 넣은 이미지. 둘 다 요청 시점에는 화면에 잘 보이는데, 서버로 갈 때 완성 프롬프트 문자열 안으로 녹아 들어가거나(요소 지정), CLI 첨부 파일 경로로만 흘러가고(이미지) `user` 이벤트에는 구조화된 값으로 안 실렸다. 그래서 로그를 다시 열면 남아 있는 건 사람이 친 문장 한 줄뿐이다.

같은 성격의 세 번째가 턴 소요시간이었다. 이건 반대로 값은 이미 들어와 있는데 아무도 그리지 않고 있었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 요소 지정 버튼에 단축키 안내 툴팁 추가
  - 크로스헤어 버튼이 native `title`만 갖고 있어 툴팁이 늦게 뜨고 표시도 브라우저마다 달랐다. ⌘/Ctrl+Shift+E 단축키가 있다는 사실 자체를 인지할 수 없다는 지적이 나왔다.
  - 앱 공용 Tooltip 컴포넌트로 교체하고 문구에 `shortcutInlineLabel("arm-element-target")`을 넣어 단축키를 항상 노출한다. 무장 상태일 때의 문구도 취소 단축키(Esc, `shortcutInlineLabel("dismiss")`) 안내로 통일했다.
  - 고치다 보니 AgentIntentForm과 AgentRunComposer 두 곳이 완전히 같은 버튼을 각자 들고 있었다. `ElementTargetPickerButton.tsx`로 공통화했다. 300줄 정책에도 도움이 됐다.

- 세션별 자동 이어달리기 큐 개수 뱃지
  - "각 세션에 큐가 존재하면 큐 갯수만큼 숫자 뱃지를 보여 달라"는 요청.
  - 막힌 지점은 큐 상태(`queuedPrompt`)가 AgentDock의 로컬 state였다는 것이다. 뱃지를 보여야 할 곳은 사이드바(AgentRunRow)와 접힌 트레이(AgentRunTray) 둘인데, 이 둘은 AgentNav 아래 형제라 AgentDock의 state를 읽을 방법이 없다.
  - ElementTargetHost 때와 같은 패턴으로 `agent-queue-context.tsx`를 만들어 App 루트 Provider로 승격했다. `useAgentDockQueue`는 로컬 `useState` 대신 이 Context를 구독한다. AgentRunRow와 TrayRow 각각 큐 개수가 0보다 클 때만 원형 숫자 뱃지를 그린다.

- 요소 지정 뱃지를 실행 로그 말풍선에도 표시
  - 조사해 보니 `elementTarget`이 완성 프롬프트 문자열에만 구워져 들어가고 `user` 이벤트에는 구조화된 값으로 안 실려, 로그를 다시 열면 어느 요소를 겨눴는지가 구조적으로 소실되고 있었다.
  - `ElementTargetSnapshot` 타입을 `agent-types.ts`에 신설하고, `user` 이벤트와 spawn 입력 양쪽에 구조화된 필드로 추가했다.
  - 서버는 `vite-harness-api-agent-input.ts`에 `parseElementTarget` 방어적 파서를 두고, `agent-run-store.ts`가 `user` 이벤트에 함께 기록한다. `appendUserTurn`은 순환참조를 피하려고 `agent-run-store-user-turn.ts`로 분리했다(300줄 정책도 겸해서).
  - 클라이언트는 `agent-api.ts`/`agent-store.tsx`의 spawn 계약에 `elementTarget`을 추가하고, 실제 호출부(AgentDock 자동 이어달리기, 수정·분할)에서 전달한다. AgentUserMessage 말풍선에는 레퍼런스 뱃지와 같은 자리에 Crosshair 뱃지로 그린다(`formatElementTarget`).

- HITL 결정 후 터미널 세션이 새로 열리던 문제 수정
  - 사용자 보고: "새로운 컴포넌트로 생성하기"를 고르면 같은 SNB 행에서 이어지는 게 아니라 터미널에 새 세션이 열린다. 터미널 UI에서 이어주기로 했던 동작과 달랐다.
  - 원인은 spawn에 `resumeOf`(새 run 생성)를 쓰고 있던 것. 원래 달아 둔 코멘트의 논리는 "헤드리스 CLI는 매 턴 새 프로세스라 이어 붙일 살아 있는 프로세스가 없다"였는데, 이 논리는 `continueRunId` 경로(자동 이어달리기, 터미널 후속 입력)에도 똑같이 적용된다. 그쪽도 매번 새 프로세스를 fork하면서 `run.sessionId`로 `--resume`만 넘겨 AI 세션을 잇는다. 결국 "새 프로세스"와 "새 SNB 행"을 같은 것으로 오인한 게 원인이었다.
  - `resumeOf` → `continueRunId`로 교체. `pendingDecisionCandidate`(`run-target.ts`)의 "이미 결정됨" 판별은 `run.events`의 최신 done 이벤트 기준이라 같은 `run.id`를 재사용해도 안전하다(`run-target.test.ts` 31개 통과 확인). CreateComposer의 `watchedRootIds`도 `run.id` 직접 매칭이라 영향이 없었다.

- 터미널 로그 완료 줄에 턴 소요시간 표시
  - "어차피 휘발되는 데이터라 턴마다 얼마나 걸렸는지 궁금하다"는 요청.
  - 조사해 보니 done 이벤트의 `durationMs`가 Claude 어댑터에서 이미 채워지고 있었다. 렌더만 안 하고 있던 값이다. Codex는 미지원인데 optional이라 없으면 그냥 안 붙는다.
  - `relative-time.ts`에 `formatDurationMs`를 추가하고 `agent-event-line.ts`의 완료·실패 줄에 "(N.N초)"/"(N분 N초)"로 덧붙였다.

- 첨부 이미지를 실행 로그 말풍선에도 표시
  - "메시지 버블에 이미지가 첨부되면 그것도 표현해 달라"는 요청.
  - 확인해 보니 spawn의 `images` 필드는 이미 client에서 server까지 전량 연결돼 있었다(CLI 첨부 파일용, `agent-run-images.ts`). `user` 이벤트에만 안 실려 로그에서 사라지는 구조. `elementTarget` 때와 똑같은 패턴이었다.
  - `agent-types.ts`에 `SpawnImage` 타입을 신설하고 `user` 이벤트에 `images` 필드를 추가했다(`appendUserTurn`이 함께 기록). AgentUserMessage는 Composer 첨부 미리보기와 같은 Attachment/AttachmentMedia로 썸네일을 그린다. 원본 크게보기는 이번 범위 밖으로 뒀다.

## 정리

오늘 고친 여섯 개 중 셋이 **값은 이미 흐르고 있는데 로그에는 안 남는** 같은 모양이었다. 요소 지정, 첨부 이미지, 턴 소요시간.

앞의 둘은 원인이 같다. 입력을 받아 완성 프롬프트라는 **최종 문자열 하나로 압축한 다음, 그 문자열만 전달**했기 때문이다. 프롬프트를 만드는 시점에는 어느 요소를 찍었고 어떤 이미지를 붙였는지 다 알고 있는데, 압축하는 순간 그 구조가 사라진다. CLI에 넘길 때는 어차피 문자열이 되어야 하니 압축 자체가 틀린 건 아니다. 틀린 건 **압축본만 남기고 원본 구조를 버린 것**이다. 이벤트 소싱을 하겠다고 `user` 이벤트를 만들어 놓고 정작 그 이벤트가 사람이 친 문장만 담고 있었으니, 이름만 이벤트지 실제로는 로그 한 줄이었던 셈이다.

두 번째를 고칠 때가 첫 번째보다 훨씬 빨랐다. `ElementTargetSnapshot`을 넣으면서 `appendUserTurn`을 따로 떼어 놓은 자리가 그대로 `images`를 받는 자리가 됐기 때문이다. 같은 모양의 문제를 한 번 제대로 뚫어 두면 두 번째부터는 자리만 채우면 된다는 걸 하루 안에 확인했다.

세 번째(`durationMs`)는 성격이 다르다. 이건 저장도 전달도 다 되고 있는데 아무도 화면에 안 그리고 있던 값이다. **어댑터가 채워 넣는 필드와 UI가 소비하는 필드 사이에 아무 연결 검사가 없으면**, 값은 계속 흐르는데 아무도 안 보는 상태가 오래 유지된다. 없는 걸 만드는 것보다 있는 걸 찾는 게 싸다는 걸 이 건에서 다시 봤다.

나머지 둘은 **상태와 개념을 잘못된 자리에 둔 문제**였다. 큐 개수는 AgentDock 안에 두었는데 그 값을 보여줄 UI가 형제 위치에 둘이나 있었다. 상태를 컴포넌트 옆에 두는 원칙(colocation)은 그 상태를 읽는 곳이 하나일 때만 맞다. HITL 쪽은 더 미묘했는데, 코드에 남겨 둔 코멘트("이어 붙일 살아 있는 프로세스가 없다")가 사실은 맞는 문장이었고 거기서 끌어낸 결론("그러니 새 run을 만들어야 한다")만 틀렸다. 옆 경로(`continueRunId`)가 똑같이 매번 새 프로세스를 띄우면서도 같은 run을 유지하고 있었으니, 전제는 처음부터 반례를 갖고 있었던 것이다. **주석이 근거를 적어 둔 덕분에 뭐가 틀렸는지 짚을 수 있었다**는 게 이번엔 오히려 다행이었다. 근거 없이 결론만 적혀 있었으면 왜 이렇게 했는지 모른 채 그냥 두었을 것이다.
