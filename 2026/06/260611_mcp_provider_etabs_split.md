---
draft: true
type: "content"
domain: "frontend"
category: "refactoring"
topic: "max-lines 해소는 줄 쪼개기가 아니라 응집 단위와 협업 경계를 같이 판단하는 일"
updatedAt: "2026-06-11"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "max-lines"
  - "module-split"
  - "barrel-export"
  - "public-surface"
  - "code-ownership"
  - "refactoring"

relatedCategories:
  - "code-quality"
  - "architecture"
---

# max-lines를 줄일 때 묻는 두 가지: 무엇을 빼낼까, 누구 파일을 건드릴까

> mcp-provider가 max-lines(150)를 넘겨서 모듈을 분리했다. 단순히 줄을 잘라 다른 파일로 옮기는 작업처럼 보이지만, 실제로는 "어떤 단위로 빼낼지"와 "누구 소유의 파일을 손대도 되는지"를 같이 따져야 했다.

## 배경

assistant 툴 카탈로그의 mcp-provider.ts가 170줄로 max-lines(150) 규칙을 위반했다. 줄 수만 보면 아무거나 다른 파일로 밀어내면 되는 것 같지만, max-lines 위반을 풀 때 진짜 결정은 두 가지다. 하나는 "이 파일에서 무엇이 한 덩어리로 빠져나갈 응집 단위인가", 다른 하나는 "내가 손대도 되는 파일은 어디까지인가"이다. 후자는 협업 경계의 문제라 줄 수와는 무관하게 신경 써야 한다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- ETABS 플러밍 모듈 분리로 max-lines 해소
  - ETABS 관련 상수/env, client 헬퍼, 카탈로그 매핑을 한 덩어리로 보고 `mcp-provider-etabs.ts`로 추출했다. 결과적으로 mcp-provider.ts는 170줄에서 93줄로 줄었다. "ETABS 연동 플러밍"이라는 명확한 응집 단위가 있었기 때문에 임의 분할이 아니라 의미 있는 경계로 나눌 수 있었다.
  - 어느 파일을 손댈지에서 한 번 멈췄다. 같은 디렉토리의 `_recommend-tools.ts`도 후보였지만, 이 파일은 커밋 writer가 shpark였다. "커밋 writer에 shpark가 있으면 그 파일은 건드리지 않는다"는 협업 규칙을 적용해 _recommend-tools.ts는 보류하고 mcp-provider.ts만 처리했다.
  - public surface를 유지했다. 배럴에서는 여전히 `mcpToolCatalogProvider`만 노출되도록 두어, 내부 구조는 두 파일로 갈라졌어도 외부에서 보는 표면과 동작은 그대로다.
  - 검증으로 두 파일 모두 eslint exit 0, tsc 신규 에러 0을 확인했다.

## 정리

max-lines 같은 정량 규칙은 "줄을 줄여라"라고만 말하지만, 실제로 그걸 푸는 과정에는 규칙이 말해주지 않는 판단이 두 개 끼어든다.

첫째는 응집 단위다. 그냥 아래쪽 70줄을 잘라 옮기면 줄 수는 통과하지만, 의미 없는 경계로 쪼개면 다음 사람이 두 파일을 오가며 읽어야 한다. ETABS 플러밍이라는 자연스러운 덩어리가 있었기에 분리가 정당했다. 빼낼 게 한 덩어리로 안 잡히면 분리 자체를 다시 생각해야 한다는 신호다.

둘째는 협업 경계다. _recommend-tools.ts를 건드렸으면 줄 수는 더 깔끔하게 정리됐을지 모르지만, 다른 사람이 작성한 파일을 리팩토링 김에 손대는 건 충돌과 책임 소재를 흐린다. shpark 소유 파일은 비켜 가고 내 작업 범위 안에서만 정리한 게 맞는 선택이었다. 그리고 배럴 export를 그대로 둬서 public surface를 유지한 덕분에, 내부를 두 조각으로 나눴어도 이 변경은 외부에 동작 변경 0으로 닫힌다. 리팩토링이 "안전하다"고 말할 수 있으려면 표면이 안 변했다는 보장이 필요하다.
