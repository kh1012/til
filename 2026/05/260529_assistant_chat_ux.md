---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "어시스턴트 채팅 UX와 마크다운 렌더링 개선"
updatedAt: "2026-05-29"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react"
  - "ai-sdk"
  - "useChat"
  - "streaming"
  - "markdown"
  - "tooltip"

relatedCategories:
  - "typescript"
  - "css"
---

# 어시스턴트 채팅 UX와 마크다운 렌더링 개선

> markdown 렌더링 버그부터 thread 전환, 응답 진행 표시, 스트리밍 중 충돌 가드까지, 사용자가 실제로 보는 채팅 경험을 다듬은 하루.

## 배경

컨텍스트 토대를 정리한 뒤에는 사용자가 직접 마주하는 표면을 손봤다. 한글 볼드가 안 그려지는 markdown 버그, 정리 안 돼 보이는 코드 블록, 패널에 가려지는 툴팁, 그리고 thread 목록과 응답 진행 표시. 마지막에는 "스트리밍 중에 새 대화를 열면 진행 중 응답이 빈 화면에 쏟아진다"는 구조적 버그까지 다뤘다.

## 핵심 내용

### 개별 커밋 기록 (시간순)

- `f9af906e4` fix(markdown): 한글 볼드 미렌더 CJK 버그 수정
  - 원인: CommonMark의 right-flanking 규칙 탓에 닫는 `**` 앞에 구두점이 오고 뒤에 한글이 붙으면 강조 짝이 깨졌다(예: `"123"**으로`에서 `**`가 그대로 노출).
  - 해결: remark-cjk-friendly를 Streamdown의 plugins.cjk.remarkPluginsBefore에 주입해 gfm 앞단에서 flanking을 완화. remarkPlugins prop을 직접 주입하면 기본 remark-gfm을 덮어써 표/취소선이 깨지므로 공식 plugins.cjk 경로를 채택. CjkPlugin.remarkPlugins는 deprecated이나 타입상 required라 빈 배열로 충족.

- `a59408762` style(markdown): 코드 블록을 단색 단일 박스로 평탄화
  - streamdown이 code-block > body > pre로 박스를 3겹 중첩하는데, 서로 다른 회색과 3중 패딩이 "정리 안 된" 느낌의 원인이었다.
  - 바깥 래퍼만 단일 박스(border + muted)로 쓰고 안쪽 body/pre의 배경/테두리/패딩을 평탄화. shiki가 인라인으로 박는 토큰 color는 foreground 단색으로 덮어 모노톤화(!important).

- `53af78024` fix(tooltip): 툴팁이 패널 위에 뜨도록 z-index를 Positioner로 이동
  - z-tooltip을 Popup에만 두면 Positioner가 z-auto라 fixed z-40 패널이나 z-popover 뒤로 가려졌다.
  - z-index를 루트 stacking 참여자인 Positioner로 이동(Popover와 동일 규칙).

- `9abf3788e` feat(assistant): 응답 진행 상태 atom 다리와 RNB 진입 스피너 추가
  - chat status를 Provider 밖(RNB의 RailTrigger)에서 구독하려고 busyAtom으로 다리를 놓았다. busy는 submitted(첫 토큰 대기) + streaming을 "진행 중"으로 묶는다.
  - 진입 아이콘과 스피너를 opacity로 crossfade하고 scale 튕김은 globals의 keyframe(in/out)이 그린다. 패널 ON이면 accent-steel로 물든다(currentColor 상속). composerFocusAtom도 같은 "트리 밖 잇기" 패턴으로 함께 정의(소비는 후속).

- `976b2b5eb` feat(assistant): thread 목록 개편과 새 대화 컴포저 포커스 추가
  - 새 대화 퀵버튼을 목록 밖으로 분리해 숨어 있던 동작을 표면화하고, List 트리거는 현재 대화 라벨을 겸하게 했다.
  - 목록을 생성 시각 내림차순으로 정렬하고 formatRelativeTime으로 상대 시각을 표기. 새 대화 시작 시 composerFocusAtom(+1 nonce)으로 컴포저 textarea에 포커스(다른 트리라 atom 경유). noThreads 빈 상태 문구 추가.

- `0c5f598c7` fix(assistant): 스트리밍 중 thread 전환 잠금으로 응답 덮어쓰기 방지
  - 원인: useChat id가 projectId로 고정(:default)이라 모든 thread가 단일 messages 버퍼를 공유한다. thread 전환이 그 버퍼를 setMessages로 덮는데, 스트리밍 중 새 대화를 열면 진행 중 응답이 빈 화면에 다시 그려졌다.
  - 고민: stop(중단) vs 비활성? 진행 스트림을 보존하려고 비활성을 택했고 응답이 끝나면 자동 해제된다. 새 대화뿐 아니라 목록 선택도 같은 충돌이라 전환 전체를 가드. chat.ts(isStreaming 시 무시)와 UI 비활성의 이중 가드. 새 대화 버튼은 disabled 대신 aria-disabled + dim으로(disabled면 pointer-events가 죽어 안내 툴팁이 안 뜸).
  - 완전 분리(thread별 useChat 인스턴스)는 별도 작업으로 보류. BFF 저장은 코드상 정상으로 추론되나 런타임 확인 권장.

- `8f2e7e7bc` fix(tooltip): delay를 Provider로 이동해 지연 시간 적용 정상화
  - base-ui v1.4.1에서 delay는 Root/Trigger가 아닌 Provider의 prop이라 Provider로 이동. undefined를 명시 전달하면 exactOptionalPropertyTypes에 걸리므로 지정됐을 때만 spread하고, 미지정 시 기본 600ms 폴백이 동작하게 했다.

- `d1b7924b5` style(assistant): 메시지 타임스탬프 글자 크기 한 단계 확대
  - 메시지 타임스탬프를 text-step-n3에서 n2로 한 단계 키워 가독성 보강.

## 정리

오늘 표면 작업을 관통하는 키워드는 "겹쳐 있는 것을 제대로 분리하기"였다. markdown 코드 블록은 박스가 3겹으로 겹쳐 지저분했고, 툴팁은 stacking 컨텍스트가 어긋나 패널에 겹쳐 가렸다. 둘 다 z나 박스를 더 쌓는 게 아니라 어느 레이어가 진짜 책임자인지(Positioner, 바깥 래퍼)를 찾아 거기로 옮기는 식으로 풀렸다.

가장 묵직했던 건 스트리밍 가드다. 증상은 "새 대화에 응답이 덮인다"였지만 뿌리는 useChat 인스턴스 하나가 모든 thread의 messages 버퍼를 공유한다는 설계였다. 진행 중 스트리밍 세션과 화면에 보여줄 thread가 같은 버퍼라 전환이 곧 충돌이 된다. 이번에는 끊지 않고 보존하는 쪽으로 비활성 가드를 넣어 막았지만, 근본 해결(thread별 인스턴스 분리)은 첫 전송 시 인스턴스 교체로 스트림이 끊기는 케이스 때문에 미뤘다. 핫픽스로 출혈을 막되 근본 원인과 그 해결 비용을 분리해서 기록해두는 습관이 이런 데서 값을 한다. tooltip delay나 busy atom 같은 작은 패턴들도 결국 "Provider 밖에서 상태를 구독한다", "라이브러리가 정한 prop 위치를 따른다"처럼 경계가 어디인지를 정확히 아는 문제였다.
