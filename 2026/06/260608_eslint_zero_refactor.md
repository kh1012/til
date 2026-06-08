---
draft: true
type: "content"
domain: "frontend"
category: "refactoring"
topic: "ESLint 에러·warning 0 만들기 - 규칙의 의도를 기준으로 적용/예외/skip 판단"
updatedAt: "2026-06-08"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "eslint"
  - "no-multi-comp"
  - "max-lines"
  - "container-presentational"
  - "re-export"
  - "lint-zero"
  - "refactoring"

relatedCategories:
  - "react"
  - "code-quality"
  - "architecture"
---

# ESLint를 0으로 만들되, 규칙이 아니라 규칙의 의도를 따른다

> lint 0은 목표였지만 수단은 "무조건 규칙 준수"가 아니었다. 규칙이 왜 존재하는지를 기준으로 어디는 분리하고, 어디는 예외를 두고, 어디는 그냥 skip할지를 매번 판단했다.

## 배경

assistant 위젯을 중심으로 ESLint error가 쌓여 있었고, 이걸 한 번에 0으로 정리하기로 했다. 단순히 빨간 줄을 없애는 작업처럼 보이지만, 막상 손을 대보면 "이 규칙을 여기서도 곧이곧대로 지키는 게 맞나"라는 질문이 계속 나온다. lint 규칙은 응집·가독성 같은 목적을 위해 존재하는데, 일회용 데모 코드나 단순 데이터 파일에까지 같은 잣대를 들이대면 오히려 의미 없는 파일 쪼개기만 늘어난다. 그래서 오늘 작업의 실제 주제는 "에러를 없애는 법"이 아니라 "규칙의 의도를 어디까지 적용할지 선을 긋는 법"이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- search-view를 Body/Container 2파일로 분리
  - `react/no-multi-comp`(한 파일에 컴포넌트 2개 이상이면 걸리는 규칙) error를 해소했다.
  - 순수 UI를 그리는 부분(AssistantSearchViewBody)을 별도 파일로 떼어내고, 컨텍스트 주입만 담당하는 컨테이너(AssistantSearchView)만 원본 파일에 남겼다.
  - Storybook 2곳의 import 경로를 새 파일에 맞게 갱신했다.
  - 이 "presentational(Body)과 container 분리" 구조가 이후 전체 정리에서 그대로 답습할 분리 패턴의 선례가 됐다.

- ESLint 에러·warning 전량 0으로 정리
  - error 15건이 전부 widgets/assistant에 몰려 있었고, 크게 두 부류였다. stories의 arbitrary value(임의 클래스값)를 inline style로 바꾸는 것, 그리고 no-multi-comp 해소.
  - 판단 1 (stories는 예외 처리): stories의 no-multi-comp는 파일을 쪼개지 않고 eslint config 예외로 처리했다. R005 ignores에 `*.stories.tsx`를 추가. 근거는 R005가 노리는 게 프로덕션 코드의 응집인데, stories의 일회용 데모 래퍼는 애초에 그 대상이 아니라는 점이다. 규칙 자체가 아니라 규칙의 목적을 보고 예외를 뒀다.
  - 프로덕션 컴포넌트 5개는 search-view 선례를 그대로 따라갔다. presentational한 XxxView를 `-view.tsx`로 분리하고 container는 원본 파일에 유지. 덕분에 외부에서 쓰는 공개 import 경로는 바뀌지 않았다.
  - 판단 2 (max-lines는 실익 있는 것만): max-lines warning 27건을 전부 분리할지 고민했는데, 실익 있는 것만 쪼갰다. 데이터성 파일(schema, prompt, openapi, route) 17개는 길이가 길어도 로직이 아니라 나열이라 쪼갤 의미가 없어서 skip 주석으로 남겼다.
  - 로직 분리로 신규 12개 파일이 생겼다. 핵심은 공개 export 이름을 re-export로 보존해서 외부 import를 한 줄도 바꾸지 않은 것. 작업은 디렉토리별로 subagent 3팀을 병렬로 돌려 처리했다.
  - 검증: lint error/warning 0/0, src typecheck 0. (.next/types 3건은 이미 삭제된 @modal 라우트를 참조하는 잔재라 이번 변경과 무관하다고 확인하고 넘어갔다.)

## 정리

오늘 작업을 관통하는 한 줄은 "lint 0을 맞추되 규칙의 노예가 되지 않는다"였다.

no-multi-comp 하나만 봐도 대응이 세 갈래로 갈렸다. 프로덕션 컴포넌트는 presentational/container로 진짜 분리했고, stories는 config에서 예외로 빼버렸고, max-lines가 걸린 데이터성 파일은 그냥 skip했다. 같은 종류의 경고라도 그 파일이 무엇을 하는 코드냐에 따라 답이 달라진다. 규칙을 기계적으로 적용하면 이 셋을 다 "파일 쪼개기"로 처리했을 텐데, 그러면 의미 없는 래퍼 파일만 잔뜩 늘었을 것이다. 규칙이 지키려는 목적(프로덕션 코드의 응집)으로 돌아가서 보니 예외와 skip의 경계가 분명해졌다.

또 하나 배운 건 큰 리팩토링을 안전하게 굴리는 장치다. 컴포넌트와 로직을 12개 파일로 흩뿌리면서도, 공개 export 이름을 re-export로 보존하니 외부에서 import하는 쪽은 변화를 전혀 느끼지 못했다. "내부 구조는 자유롭게 바꾸되 공개 표면은 고정한다"는 원칙 하나로 변경 범위가 디렉토리 안에 갇혔고, 그래서 subagent 3팀을 병렬로 돌려도 서로 충돌 없이 합칠 수 있었다. 분리의 기준이 search-view라는 작은 선례에서 출발해 전체로 일관되게 퍼진 것도, 패턴을 먼저 하나 검증한 뒤 확장하는 게 안전하다는 걸 다시 확인시켜줬다.
