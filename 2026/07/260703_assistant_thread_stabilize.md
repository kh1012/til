---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "MAX Assistant 위젯에서 stale thread id로 인한 403 에러 토스트를 자가 치유로 잡고, 검색창 높이를 헤더 컨트롤과 통일한 안정화 기록"
updatedAt: "2026-07-03"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "assistant"
  - "thread"
  - "localStorage"
  - "error-handling"
  - "403"
  - "input-group"

relatedCategories:
  - "typescript"
  - "css"
---

# MAX Assistant 위젯: stale thread 403 자가 치유와 헤더 컨트롤 정합

> localStorage에 남은 stale thread id가 계정 전환·DB 리셋 후 403을 유발하며 매번 전역 에러 토스트로 새던 문제를 자가 치유로 잡고, 검색창 높이를 헤더의 다른 컨트롤과 통일한 소소하지만 확실한 안정화.

## 배경

Assistant 위젯은 활성 thread id를 localStorage에 들고 다니는데, DB 리셋이나 계정 전환처럼 소유 관계가 바뀌면 그 id가 남의 project/user 소유가 된다. 기존 정리 로직은 404(없는 thread)만 처리하고 있어서, 백엔드가 접근 거부로 403을 던지는 경우엔 stale id가 지워지지 않은 채 매 요청마다 전역 에러 토스트로 새고 있었다. 헤더 쪽에서는 검색창만 다른 컨트롤보다 4px 크게 떠 있어 정합이 어긋나 있었다. 둘 다 데모나 실사용에서 눈에 띄는 잔거슬림이라 이날 마무리로 정리했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 검색창 높이를 헤더 컨트롤과 통일
  - 실측해 보니 검색 InputGroup은 32px(h-8)인데 thread-select 트리거는 28px(h-7)이었고, 헤더 내 4개 컨트롤(dock 토글/닫기/새 대화/thread-select)은 이미 28px로 통일돼 있었다. ThreadSelect를 32px로 올릴지 검색창을 28px로 내릴지 두고, 변경 범위가 최소이고 기존 헤더 컨벤션을 유지하는 쪽으로 검색창을 28px로 축소하기로 결정했다. InputGroup className에 h-7 오버라이드를 주고, 내부 InputGroupInput에 h-full을 추가해 기본 h-8 Input이 32px로 남는 걸 막았다.

- thread 접근 거부(403)도 stale thread id 정리 대상에 포함
  - localStorage에 남은 활성 thread id가 DB 리셋·계정 전환 등으로 다른 project/user 소유가 되면 백엔드가 403(Assistant thread access denied.)을 반환하는데, 기존 정리 로직은 404만 처리해 stale id가 안 지워지고 매번 전역 에러 토스트로 샜다. 403도 404와 동일하게 forget() 처리해 다음 진입 때 자가 치유되도록 고쳤다.

## 정리

이날의 두 커밋은 규모는 작지만 성격이 분명하다. 403 처리는 "정상 상태 코드만 처리하고 있던 정리 로직"에 하나의 실패 경로가 빠져 있던 문제였다. 404는 서버에 thread가 없다는 뜻이고 403은 있지만 내 것이 아니라는 뜻이지만, 클라이언트 입장에서 "이 stale id는 더 못 쓰니 잊어라"는 대응은 완전히 같다. 실패 경로를 넓게 잡아 자가 치유되게 만드는 편이, 사용자에게 정체 모를 토스트를 반복해서 던지는 것보다 낫다는 걸 다시 확인했다.

검색창 높이 통일은 결정 자체보다 결정의 근거를 실측으로 잡은 게 포인트였다. 두 컨트롤 중 무엇을 기준으로 맞출지 감으로 정하지 않고, 헤더 4개 컨트롤이 이미 28px로 수렴해 있다는 사실을 근거로 검색창을 내리는 쪽을 택했다. 그리고 InputGroup 겉에 h-7만 주면 내부 Input이 기본 h-8로 남는 함정을 h-full로 막은 것처럼, 래퍼 높이만 바꿔선 안 되고 내부 요소까지 함께 맞춰야 실제 높이가 따라온다는 CSS의 기본을 잊지 않는 게 여전히 중요하다.
