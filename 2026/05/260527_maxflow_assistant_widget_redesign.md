---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "MAX 어시스턴트 위젯 UI 전면 개편 (빈 상태부터 RNB hover 패널까지)"
updatedAt: "2026-05-27"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "assistant widget"
  - "hover panel"
  - "layout shift"
  - "truncate"
  - "min-w-0"
  - "custom scrollbar"

relatedCategories:
  - "css"
  - "ux"
  - "typescript"
---

# MAX 어시스턴트 위젯 UI 전면 개편

> 빈 상태 컴포넌트 정비에서 시작해 자잘한 말줄임/스크롤 버그를 잡고, 로딩 깜빡임을 없앤 뒤, 끝내 4모서리 FAB 모델을 우측 RNB hover 패널로 재설계한 하루.

## 배경

MAX 어시스턴트 위젯의 UI를 손보는 작업이었다. 처음에는 빈 상태/아바타/추천 프롬프트 같은 구성 요소를 정비하는 정도였는데, 다듬는 과정에서 말줄임(truncate)이 안 먹는 버그, 스크롤바 부재, 로딩 전환 시 깜빡임 같은 결이 거친 부분들이 연달아 드러났다. 마지막에는 기존 4모서리 FAB + 코너 카드라는 인터랙션 모델 자체가 한계라고 판단해, motiv.ai식 우측 RNB hover 패널 + 도킹 모드로 구조를 갈아엎었다.

## 핵심 내용

### 개별 커밋 기록 (시간순)

- `4640d2dfb` feat(assistant): MAX 어시스턴트 위젯 UI 개편
  - 빈 상태 컴포넌트(orb 헤더 + 환영 문구 + 도메인 추천 프롬프트 칩), 응답 실패 안내(error-notice), 첨부 이미지 라이트박스를 추가했다.
  - FAB orb를 재활용한 공용 아바타 컴포넌트를 만들어 메시지/타이핑/빈 상태가 같은 비주얼을 공유하게 했다.
  - 추천 프롬프트 키 모델(suggestions)과 ko/en i18n 문구를 정의하고, composer·message-bubble·tool-call 등 기존 컴포넌트를 함께 정비했다. 이날 작업의 출발점.

- `c34440d53` fix(assistant): 스레드 선택 트리거/목록 말줄임 미동작 수정
  - shared Button(@base-ui/react/button)이 children을 클래스 없는 wrapper span으로 한 겹 감싸는데, 이 span이 inline-flex 버튼의 flex 자식이면서 min-w-0이 없어 shrink 체인이 끊겼다. 그 탓에 max-w-40과 truncate가 모두 무력화되고 라벨이 367px까지 늘어났다.
  - 트리거를 plain button + getButtonClassName으로 교체해 wrapper span을 제거하고 min-w-0 체인을 버튼까지 직접 연결했다(user-avatar.tsx와 동일 패턴). 팝오버 목록 항목 span에도 min-w-0을 추가해 flex-1 truncate가 동작하게 보정.

- `ce983c033` style(assistant): 빈 상태 컨테이너 너비 w-full로 변경
  - 빈 상태 컨테이너 폭을 w-full로 맞춰 레이아웃을 정리.

- `f77e74f8b` fix(assistant): 스레드 목록 행 말줄임 미동작 수정
  - grid 컨테이너의 item(스레드 행 button)은 기본 min-width가 auto(=min-content)라 콘텐츠 폭 아래로 줄지 않아, 내부 truncate span도 함께 동작하지 않았다.
  - button에 min-w-0를 추가해 트랙 최소 너비를 풀어 truncate가 작동하게 했다. trigger(max-w-40)와 newThread(block 부모)는 원래 정상이었고, grid 컨텍스트인 목록 행만 문제였다. (c34440d53이 잡은 것과 같은 "min-w-0 체인 끊김" 유형이지만 이번엔 grid 트랙 쪽 원인.)

- `10d359c86` style(assistant): composer 포커스/호버 강조 제거
  - 상단 border만 그려진 컨테이너에 hover/focus-within 색 변경과 ring을 함께 걸어, 포커스·호버 시 상단 한 줄만 진해지고 outline이 잡히는 게 어색했다.
  - 강조를 유지하거나 ring만 빼는 안 대신, 강조 자체를 제거하는 방향을 선택. 드래그 드롭 강조(isDragOver)는 별개 피드백이라 유지.

- `140b23d77` style(assistant): custom-scrollbar 이식 및 composer·스레드목록 적용
  - frontend-3의 hover-reveal 커스텀 스크롤바(평소 thumb 투명, hover 시 노출, 6px→8px)를 globals.css로 이식. 소스의 --scrollbar-thumb 토큰이 이 프로젝트엔 없어, 모노크롬 토큰 체계에 맞춰 평소 --border, thumb hover --muted-foreground로 매핑했다.
  - composer 에디터는 overflow-hidden이라 max-h 초과 입력이 잘려 안 보였는데 overflow-y-auto로 바꿔 길어지면 스크롤되게 했다. 메시지 목록은 진행 중인 별도 리팩토링과 한 파일에 얽혀 있어 이번 커밋에선 제외.

- `b62745516` fix(assistant): 로딩 전환 깜빡임 제거 및 브랜드 응답 로더 적용
  - 스레드 전환: activeThreadId는 즉시 바뀌지만 setMessages 적용은 한 커밋 뒤라, 히스토리 마운트와 하단 정렬 과정이 그대로 노출됐다. messages가 반영된 loadedThreadId를 기준으로 로딩 구간을 잡아 그동안 콘텐츠를 opacity 0으로 가리고 스피너를 띄운 뒤, 하단 정렬이 끝나면 페이드인하게 했다.
  - 응답 스트리밍: submitted skeleton 노드와 streaming 버블 노드가 분리돼 이중 fade-in으로 아바타가 재마운트되며 반짝였다. 빈/콘텐츠 버블을 단일 노드로 통합해 아바타를 고정하고, 첫 토큰 전에는 아바타 둘레에 로더 링만 돌리다 텍스트가 차오르면 같은 노드에서 이어지게 했다(Gemini식).
  - 로더 링은 MAX 로고의 blue→cyan 그라데이션이 도는 혜성형 링. 탁한 navy는 빼고 알파로 부드럽게 페이드하며 등장·소멸 모두 opacity로 전환.

- `936338fa0` feat(assistant): 우측 RNB hover 패널 + 도킹 모드로 재설계
  - 기존 4모서리 FAB + 코너 카드 모델을 motiv.ai식 우측 패널로 교체. app-shell 본문 우측에 상시 RNB(세로 바) + AI 아이콘을 두고, hover 시 floating 패널을 펼친다.
  - Docking 토글로 floating ↔ docked 전환. docked는 본문만 좌측으로 push하고 헤더는 full-width 유지(헤더 아래 본문 row 구조), 항상 열림.
  - 스마트 닫힘: 트리거(RNB)와 패널이 서로 다른 DOM 트리라 enter/leave 카운팅이 둘 사이에서 어긋나 안 닫히는 문제가 있었다. document pointermove로 커서가 패널/RNB(+여백·갭) 위인지 직접 판정하는 방식으로 전환하고, 유지 영역을 RNB 전체와 패널 둘레까지 넓혀 "아이콘에서 아래로 이동 시 즉시 닫힘" 문제를 해결.
  - busy(응답 중)·portal popover(thread-select·add-menu)·컴포저 미전송 초안은 useAssistantCloseGuard로 닫힘을 막는다. 아바타를 MAX 로고로 교체하고, 폭은 좌측 엣지 리사이저로 단순화. 기존 4모서리 dock/드래그/코너 리사이즈와 미사용 FAB 비주얼(wave·reactor·fab-variant)을 제거.

## 정리

하루의 흐름을 관통하는 키워드는 두 가지였다. 하나는 **shrink 체인**, 다른 하나는 **렌더 타이밍**이다.

말줄임 버그(`c34440d53`, `f77e74f8b`)는 둘 다 "flex/grid에서 자식이 min-content 아래로 줄지 않아 truncate가 무력화된다"는 같은 뿌리에서 나왔지만 원인 지점이 달랐다. 하나는 base-ui Button이 끼워넣는 wrapper span에서 min-w-0이 빠진 것이고, 다른 하나는 grid 트랙의 기본 min-width: auto였다. 공용 컴포넌트가 한 겹 감싸는 wrapper가 레이아웃 계약(min-w-0 전파)을 조용히 끊을 수 있다는 걸 다시 확인했다. 그래서 트리거를 plain button으로 내려 체인을 직접 연결한 선택이 맞았다.

로딩 깜빡임(`b62745516`)은 상태 변수(activeThreadId)와 실제 콘텐츠(messages) 사이의 한 커밋 시차, 그리고 skeleton/실제 노드의 분리에서 나온 재마운트 문제였다. "노드를 통합해 아바타를 고정하고, 데이터가 실제 반영된 시점(loadedThreadId)을 기준으로 가림막을 친다"는 접근이 핵심이었다. 보이는 깜빡임은 대개 별개 노드의 마운트/언마운트거나 상태-콘텐츠 시차라는 점을 다시 새겼다.

마지막 RNB 재설계(`936338fa0`)에서 가장 까다로웠던 건 닫힘 판정이었다. 트리거와 패널이 다른 DOM 트리에 있으면 mouseenter/leave 카운팅이 근본적으로 어긋난다. DOM 이벤트 버블링에 기대지 말고 document pointermove로 좌표를 직접 판정하는 게 이런 분리된 hover 영역에선 더 견고했다. 작은 정비로 시작해 결국 인터랙션 모델 전체를 바꾸게 된 날이라, "다듬다 보니 구조가 한계"라는 신호를 일찍 인정하고 갈아엎은 게 결과적으로 옳았다.
