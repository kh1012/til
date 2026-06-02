---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "shadcn preset 색만 떼어 독립 토큰(--sc-*)으로 이식하기"
updatedAt: "2026-06-02"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "shadcn"
  - "design-tokens"
  - "css-variables"
  - "base-ui"
  - "theming"

relatedCategories:
  - "css"
  - "tailwindcss"
---

# shadcn preset 색만 떼어 독립 토큰으로 이식하기

> 우리 컴포넌트 베이스가 shadcn이 아니어도, preset의 색 변수만 독립 prefix로 떼어내면 기존 토큰을 건드리지 않고 새 스킨을 입힐 수 있다.

## 배경

assistant 위젯에 shadcn preset의 색감을 입히고 싶었다. 그런데 우리 컴포넌트는 shadcn이 기반으로 삼는 Radix가 아니라 `@base-ui/react` 위에 올라가 있다. preset을 통째로 끌어오면 베이스 구조가 안 맞아 깨진다. 그래서 "구조는 두고 색(CSS 변수)만 이식한다"는 방향을 먼저 정해야 했다. 더해서 globals.css는 건드리지 않고, 나중에 한 번에 적용하거나 되돌릴 수 있는 형태로 가져가야 한다는 제약이 있었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- shadcn preset 독립 토큰 스킨 적용
  - 베이스부터 확인했다. 컴포넌트 기반이 Radix가 아닌 `@base-ui/react`라서 preset 전체가 아니라 색(CSS 변수)만 떼어 이식하기로 했다. 색 정의 자체는 base/radix 어느 쪽이냐와 무관해서, `shadcn init --preset {id} --base base`로 색 토큰만 추출했다.
  - 토큰 전략을 두 번 바꿨다. 처음에는 `[data-skin]` 스코프 오버라이드로 특정 영역에서만 색을 갈아끼우려 했다. 그런데 "globals.css는 무수정으로 두고 나중에 일괄 적용하고 싶다"는 요구에 맞춰, 기존 변수를 덮어쓰는 대신 독립 `--sc-*` prefix로 색을 따로 들고 가는 방식으로 전환했다. 기존 토큰과 충돌하지 않으니 globals.css를 손대지 않아도 됐다.
  - 스코프 방식에는 함정이 있었다. 검색 드롭다운이나 popover처럼 portal로 빠지는 요소는 `[data-skin]` 컨테이너 바깥에 렌더되므로, 스코프 오버라이드 색이 cascade를 타고 내려가지 못했다. prefix를 `:root`와 `[data-theme]` 전역에 선언하니 portal 요소까지 색이 닿았고, 그 결과 `data-skin`과 `SkinScopeProvider` 자체를 제거할 수 있었다.
  - 컴포넌트 교체는 assistant ui와 `shared/ui/v2`의 색 클래스를 전부 sc-prefix로 바꾸는 일이었다. 파일이 많아 perl로 일괄 치환을 시도했다.
  - UI도 함께 다듬었다. empty-state는 shadcn의 `Empty`를 써서 아이콘 박스를 걷어냈고, 추천 항목은 회색 secondary로, thread 행/add 메뉴/케밥은 `DropdownMenu` 스타일로 통일했다. 검색창은 오버레이를 빼고 흰 배경으로 바꿨다.

## 정리

핵심 결정은 "preset을 통째로 받지 않고 색만 떼어 독립 prefix로 들고 간다"였다. 베이스(Radix vs base-ui)가 달라도 색 변수는 구조와 독립적이라, 이 분리 덕분에 기존 디자인 토큰과 globals.css를 전혀 건드리지 않고 새 스킨을 얹을 수 있었다. 덮어쓰기가 아니라 병렬로 두는 전략이라 적용과 롤백 모두 가볍다.

스코프 오버라이드에서 전역 prefix로 옮긴 것도 배운 점이다. portal로 빠지는 요소는 DOM 트리상 스코프 바깥에 있어서 CSS 변수 cascade가 끊긴다. 색 토큰을 영역에 가두려다 오히려 popover 색이 새는 문제를 만났고, 전역에 선언하는 쪽이 portal까지 일관되게 닿았다. 영역 격리가 항상 정답은 아니고, 변수가 어디까지 흘러야 하는지를 먼저 봐야 한다.

함정도 두 가지 남길 만하다. 하나는 CSS 주석 안에 들어간 `*/`가 주석을 예정보다 일찍 닫아 빌드가 깨진 것이다. 같은 실수를 두 번 반복했는데, 주석에 토큰 표기를 넣을 때는 `*/` 시퀀스가 끼지 않는지 봐야 한다. 다른 하나는 shell 변수에 파일 목록을 담아 perl에 넘기는 방식이 환경에 따라 실패한 것인데, `find -exec`로 파일을 직접 넘기니 안정적으로 처리됐다.
