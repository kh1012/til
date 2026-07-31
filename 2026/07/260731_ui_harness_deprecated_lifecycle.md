---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "어제 draft/stable/merge-candidate를 active/deprecated 둘로 줄여놓고 정작 UI에서 바꿀 방법이 없던 상태를, 상세 페이지 상태 변경 버튼과 status API로 배선한 기록. 그 과정에서 옛 3단계 상태로 필터링하던 catalog 버그를 찾았고, toast 엔트리로 왕복 토글을 여섯 번 돌려 실제로 검증했다"
updatedAt: "2026-07-31"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "component-lifecycle"
  - "deprecated"
  - "registry"
  - "audit-log"

relatedCategories:
  - "react"
  - "typescript"
---

# 상태를 둘로 줄여놓고 바꿀 방법이 없던 문제

> 어제 status를 active/deprecated 둘로 줄였는데, 정작 갤러리에서 그 값을 바꿀 방법은 없었다. 오늘 상세 페이지에 상태 변경 버튼을 붙이고 서버에 status API를 열면서, 옛 3단계 상태로 필터링해 항상 빈 목록을 반환하던 catalog 버그도 같이 나왔다. 만들고 나서는 toast 하나를 여섯 번 왕복시켜 실제로 도는지 확인했다.

## 배경

어제 status를 `draft|stable|merge-candidate|deprecated` 네 값에서 `active|deprecated` 둘로 줄였다. 이유는 명확했다. draft/stable이 코드 위치와 100% 중복이었고(draft 90개 = staging 90개), 승격 파이프라인을 접자 단계 구분이 뜻을 잃었다. 남는 뜻은 "지금 쓸 수 있나" 하나였다.

그런데 개념을 줄이는 것과 그 개념을 운용할 수 있게 만드는 건 다른 일이다. 어제는 엔트리 115개를 일괄 전환하는 마이그레이션만 했고, 앞으로 새로 생기는 폐기 결정을 어디서 내리는지는 비어 있었다. 갤러리에서 컴포넌트를 보다가 "이건 이제 안 쓴다"고 판단했을 때, 손으로 JSON을 열어 고치고 히스토리에 직접 한 줄 적어야 했다. 그러면 아무도 안 한다.

deprecated가 실제로 뜻을 가지려면 두 가지가 필요했다. 보는 자리에서 바로 바꿀 수 있을 것, 그리고 바뀐 다음에 실제로 목록에서 빠질 것.

## 핵심 내용

### 개별 작업 기록 (시간순)

- deprecated 상태 배선 + page-create catalog 필터 버그 수정
  - deprecated를 소비하는 쪽부터 손봤다. 갤러리 라이브러리에 deprecated 숨김/보기 토글을 추가하고, CommandPalette와 component-create 스킬(애니메이션 페어링, 기존 컴포넌트 수정)도 기본적으로 deprecated를 제외하게 맞췄다. 폐기한 컴포넌트가 검색 결과나 재사용 후보로 계속 튀어나오면 폐기가 아니다.
  - 그 과정에서 page.mjs catalog 버그가 나왔다. 옛 3단계 상태(stable/draft/merge-candidate)로 필터링하고 있어서, 어제 전부 active로 바뀐 뒤로는 `--all` 없이 부르면 항상 빈 목록을 반환하고 있었다. 상태값을 줄이는 마이그레이션이 코드 한 곳을 못 따라간 자리였다. active 기준으로 고쳤다.

- 상세 페이지에 deprecated 상태 변경 버튼 + 히스토리 기록
  - 상세 사이드바 "상태" 행에서 active ↔ deprecated를 바로 바꿀 수 있게 `POST /api/entry/<name>/status`를 추가했다.
  - 기존 `POST /api/restore`와 완전히 같은 규약을 따랐다. git 커밋을 남기고, `<name>.history.jsonl`에 이벤트를 append하고, 동시성 dirty 가드를 건다. 새 규약을 발명하지 않은 게 요점이다. "레지스트리를 바꾸는 서버 액션"이라는 같은 부류라 감사 로그와 커밋 방식이 갈릴 이유가 없다.
  - UI도 RestoreControl과 같은 인라인 2단계 확인 패턴을 재사용했다. 되돌리기 어려운 액션은 이 저장소에서 이미 그렇게 다루고 있었다.

- restore-test / toast 엔트리로 실제 왕복 검증
  - 만들자마자 실제로 돌려봤다. restore-test를 deprecated로 바꾸고 히스토리에 기록되는지 확인한 뒤, toast로 deprecated → active → deprecated → active를 여러 번 왕복시켰다. 매 전환마다 엔트리 JSON 변경 커밋과 history.jsonl append 커밋이 짝으로 남는지가 확인 대상이었다.
  - 왕복을 여러 번 돌린 건 단순한 반복이 아니라 동시성 dirty 가드와 append 순서를 흔들어보려는 것이었다. 한 방향만 확인하면 "되돌릴 수 있나"를 못 본다.

- 상태 표시를 배지 대신 색상 텍스트로, deprecated 액션은 destructive로
  - deprecated로 표시하는 액션 버튼(확인 버튼 포함)이 primary 색이라 "되돌리기 어려운 일"로 안 읽혔다. destructive 색으로 바꿔 눈에 띄게 했다.
  - 상태 자체의 표시는 반대로 힘을 뺐다. Badge 컴포넌트를 쓰면 배경 있는 딱지가 붙는데, 상태 행에 이미 "상태"라는 라벨이 있어 배지까지 두면 과하다. 배경 없는 색상 텍스트(active는 success, deprecated는 warning)로 바꿨다. 값을 알리는 것과 행동을 유도하는 것은 시각적 무게가 달라야 한다.

- instant-create-smoke-test deprecated 처리
  - 즉시 실행 기능을 검증하려고 만들었던 스모크 테스트용 엔트리다. 목적을 다했으므로 오늘 붙인 그 버튼으로 폐기했다. 만든 기능의 첫 실사용이 자기 자신을 검증하던 흔적을 치우는 일이었다.

## 정리

오늘 한 일은 어제 남긴 빚을 갚는 쪽에 가깝다. 개념을 줄이는 작업은 만족스럽게 끝나기 쉽지만, 줄인 개념이 실제로 굴러가려면 그걸 조작할 자리와 그 조작이 남는 자리가 있어야 한다. 어제는 115개를 일괄 전환하고 끝냈고, 그건 과거를 정리한 것이지 미래를 열어둔 게 아니었다.

catalog 필터 버그가 그걸 정확히 보여준다. 상태값을 넷에서 둘로 줄이면서 소비처 한 곳을 못 따라갔고, 결과는 조용한 실패였다. 에러가 나는 게 아니라 그냥 빈 목록이 돌아온다. `--all` 없이는 아무것도 안 나오는 상태가 하루를 갔는데도 몰랐던 건, 그 경로를 그 사이에 안 밟았기 때문이다. enum을 줄이는 변경은 타입이 잡아줄 것 같지만 문자열 비교로 필터링하는 스크립트는 타입 밖에 있다.

설계 판단으로 마음에 남는 건 status API를 restore API의 형제로 만든 것이다. 새 엔드포인트를 짤 때 "감사 로그를 남길까, git 커밋을 할까, 동시성은 어떻게 할까"를 처음부터 다시 정할 수도 있었다. 하지만 restore가 이미 그 질문들에 답해뒀고, 두 액션은 "레지스트리를 서버가 바꾼다"는 같은 부류다. 같은 부류에 다른 규약을 주면 나중에 세 번째가 생길 때 어느 쪽을 따를지 또 고민하게 된다. 규약이 하나면 세 번째는 고민 없이 붙는다.

그리고 만들자마자 toast로 왕복을 여러 번 돌린 게 좋았다. 새 API에서 가장 흔한 함정은 한 방향만 되는 것이다. deprecated로 바꾸는 건 되는데 되돌리면 히스토리가 꼬이거나 dirty 가드가 걸리거나. 실제로 왕복시켜야 그게 보인다. 마침 오늘 즉시 실행 터미널의 동시 실행을 10개로 늘려둔 참이라, 여러 run이 같은 워킹트리에서 git 커밋을 하는 상황과 이 status API의 dirty 가드가 언젠가 만날 것 같다. 그때 오늘 붙여둔 가드가 제 몫을 하는지 다시 볼 지점이다.
