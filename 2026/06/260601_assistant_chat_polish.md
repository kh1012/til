---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "어시스턴트 채팅 마감: 제목 자동생성과 진행 중 추천"
updatedAt: "2026-06-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react"
  - "ai-sdk"
  - "generateText"
  - "haiku"
  - "best-effort"
  - "markdown"

relatedCategories:
  - "typescript"
  - "css"
---

# 어시스턴트 채팅 마감: 제목 자동생성과 진행 중 추천

> 마크다운 코드/표 스타일, 진행 중 대화에서 뜨는 추천 퀵액션, Haiku로 첫 턴 제목 자동생성, thread rename/delete까지. 채팅을 "되는 것"에서 "관리되는 것"으로 넘긴 하루.

## 배경

어제까지는 채팅의 표면(렌더링, thread 전환, 진행 표시)을 안전하게 다듬었다. 오늘은 그 위에 "대화를 식별하고 이어가게" 만드는 레이어를 얹었다. thread가 늘어나면 제목 없이는 못 찾고, 빈 입력창은 다음에 뭘 물어야 할지 막막하다. 이 두 빈자리를 메우면서, 남아 있던 마크다운 코드블록/표의 잔거슬림과 thread 메뉴 정렬도 함께 정리했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- style(markdown): 코드 블록 회색 헤더·흰색 본문 분리와 표 인라인화
  - 결정 포인트는 streamdown 헤더가 이미 language span을 렌더한다는 점이었다. 커스텀 컴포넌트로 교체하지 않고 CSS만으로 처리했다.
  - 코드블록 컨테이너는 !bg-surface(흰색)로, 헤더만 !bg-muted(회색)로 분리하고 본문·pre 배경을 평탄화해 흰색이 비치게 했다. 언어 없는 fence(data-language='')는 빈 회색 바가 생겨서 숨겼다.
  - 표는 table-wrapper를 카드(bg-sidebar·p-2·border·rounded)로 감싸고, 중첩된 스크롤 div를 평탄화해 w-auto·border-collapse로 인라인화했다. 검증은 Tailwind PostCSS 컴파일로 변형 5종 CSS(빈 속성 선택자 포함)가 생성되는지 확인하는 식으로 했다.

- feat(composer): 진행 중 대화에서 클릭 시 추천 퀵액션 패널 추가
  - EmptyState의 추천 칩을 공용 AssistantSuggestionList로 추출해 대화 중에도 재사용하게 했다(두 군데서 따로 그리면 드리프트가 나므로).
  - 노출 조건이 핵심이었다. onFocus를 제거하고 "명시적 클릭 + 빈 입력"만으로 좁혔다(자동 포커스나 전송 후 복귀로 떠서 거슬렸음). 첫 타이핑에 닫히고, 전송/삭제로 비어도 재클릭 전까진 안 뜬다.
  - close-on-input은 effect setState가 lint에 걸려 onChange 핸들러로 처리했다. 칩 클릭이 textarea blur로 누락되지 않도록 패널 onMouseDown에서 preventDefault로 blur를 막았다.
  - 레이아웃은 floating 오버레이 + 세로 column + backdrop-blur/border/shadow에 최대 5개 정도 스크롤. 칩은 column에서만 축소(cn twMerge 오버라이드, EmptyState는 그대로 유지)하고, 상태는 use-composer-quick-actions 훅으로 분리했다.

- 제목 자동생성 구현
  - 가장 싼 모델(claude-haiku-4-5)로 첫 user 메시지와 응답을 3~6단어 한 줄 제목으로 요약하고 Core API에 PATCH로 저장하는 best-effort 스텝(_title.ts)을 추가했다. 첫 턴 onFinish 시점에 호출한다.
  - 어떤 실패도 삼켜서(throw 안 함) 본 채팅 응답엔 영향이 없게 했다. 실패는 trace 파일에만 남긴다.
  - 첫 교환 판별은 클라이언트 추측이 아니라 서버에서 modelMessages.length === 1로 못 박았다. 방금 저장한 user를 포함한 히스토리라 길이 1이면 첫 user 메시지뿐이다. 이 시점엔 title이 없음이 보장되므로(수동 rename은 메시지가 있어야 가능) 자동 제목이 사용자 제목을 덮지 않는다.
  - 프롬프트 입력은 비용/지연을 위해 500자로 컷, 출력은 80자(Core 계약 ASSISTANT_THREAD_TITLE_MAX_LENGTH)로 정제한다(첫 비어있지 않은 줄만, 감싼 따옴표 제거).
  - 함께 renameThread/deleteThread 훅도 추가했다. streaming 잠금과 무관하게 동작하고, 성공 후 threads 목록을 무효화해 라벨을 갱신한다. 삭제 시 활성 thread면 먼저 선택을 해제(화면 messages도 비움)한 뒤 무효화한다.

- 스타일 조정
  - thread row의 더보기 버튼에 mr-2 여백을 주고 Popover.Content props를 여러 줄로 정리했다. 제목 자동생성으로 늘어난 thread row UI(rename/delete 메뉴)의 정렬을 마감하는 후속 손질이다.

## 정리

오늘의 흐름은 "대화를 관리할 수 있게 만들기"였다. 어제까지 채팅이 잘 그려지고 안전하게 전환되게 했다면, 오늘은 그 위에 식별(제목)과 유도(추천)를 얹었다.

제목 자동생성에서 가장 신경 쓴 건 두 가지였다. 조용히 실패하기, 그리고 사용자 제목을 절대 안 덮기. LLM 호출은 부가 기능이라 본 응답 스트림을 막거나 throw하면 안 되니 모든 실패를 삼키고 trace에만 남겼다. 더 중요한 건 첫 교환 판별을 클라이언트 추측이 아니라 서버의 modelMessages.length === 1로 고정한 것이다. "수동 rename은 메시지가 있어야 가능하므로 첫 턴엔 title이 없음이 구조적으로 보장된다"는 불변식과 맞물려, 자동 제목이 사람이 붙인 제목을 덮을 위험을 원천 차단한다. 비싼 작업(LLM 요약)은 best-effort로 두되 안전 불변식은 코드 구조로 보장하는, 둘을 분리하는 감각이 핵심이었다.

추천 패널은 정반대로 "언제 보일지"가 전부였다. onFocus로 띄웠더니 자동 포커스나 전송 후 복귀 때마다 떠서 거슬렸고, 결국 "명시적 클릭 + 빈 입력"이라는 의도가 분명한 순간으로 좁혔다. 칩 클릭이 textarea blur로 사라지는 미묘한 타이밍은 onMouseDown preventDefault로 막았는데, 이 "포커스와 blur 사이를 비집는" 처리는 어제 thread 전환 가드와 같은 결의 문제다. EmptyState의 칩을 공용 리스트로 추출한 것도 같은 맥락이다. 재사용 지점이 둘이 되는 순간이 추출의 신호다. 마크다운 코드/표 스타일과 thread 메뉴 정렬 같은 잔손질까지 더해, 채팅이 "되는 것"에서 "쓸 만한 것"으로 넘어간 하루였다.
