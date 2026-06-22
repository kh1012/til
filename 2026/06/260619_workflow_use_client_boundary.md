---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "워크플로우 모듈 전반에 흩뿌려져 있던 use client 지시어를 전수 조사해 실제 클라이언트 진입점 4곳으로만 좁히고, 그 과정에서 드러난 barrel re-export 파일의 RSC 경계 함정을 되돌려 복원한 뒤, 같은 실수가 빌드까지 가지 않도록 타입체크와 eslint를 빌드 선행 단계로 묶기"

updatedAt: "2026-06-19"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "use-client"
  - "react-server-components"
  - "client-boundary"
  - "barrel-export"
  - "build-precheck"
  - "serialization-TS71007"

relatedCategories:
  - "react"
  - "typescript"
  - "refactoring"
---

# 워크플로우 모듈의 use client 경계를 진입점 4곳으로 좁히기

> "use client"가 워크플로우 모듈 곳곳에 관성으로 붙어 있었다. TS71007 직렬화 경고를 계기로 전수 조사해 실제 클라이언트 진입점이 4곳뿐임을 확인하고 나머지 20개 파일에서 지시어를 걷어냈다. 그런데 한 번에 다 걷어내자 빌드가 깨졌고, barrel re-export 파일은 Server Component가 직접 진입하는 자리라 경계가 필요하다는 걸 되돌려 배웠다. 두 파일을 복원하고, 같은 실수가 다시 빌드까지 흘러가지 않도록 타입체크와 eslint를 빌드 앞단에 묶었다.

## 배경

Next.js App Router에서 "use client"는 파일 한 줄이 아니라 모듈 그래프의 경계다. 이 지시어가 붙은 파일부터 아래로는 전부 클라이언트 번들로 내려가고, 위쪽 Server Component에서 props로 넘어오는 값은 직렬화 가능한 것만 허용된다. 그런데 워크플로우 모듈은 컴포넌트를 만들 때마다 습관적으로 맨 위에 "use client"를 적어두는 식으로 자라 있었다. 동작에는 문제가 없으니 그대로 쌓였다.

문제가 표면으로 드러난 건 TS71007 경고였다. "use client" 파일의 props에 일반 콜백을 넘기는 자리에서 직렬화가 불가능하다는 경고가 떴다. 경고 자체보다 그 경고가 가리키는 구조가 거슬렸다. 경계가 실제 필요한 곳이 아니라 아무 데나 그어져 있으니, 어디까지가 진짜 클라이언트 영역인지 코드만 봐서는 알 수 없는 상태였다. 경고를 끄는 게 아니라 경계를 사실에 맞게 다시 긋는 일이 필요했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- use client 경계를 4개 진입점으로 집중
  - 먼저 TS71007의 원인을 짚었다. "use client" 파일의 props에 Server Action이 아닌 일반 콜백을 넘기면 직렬화 불가 경고가 난다. 이때 콜백 이름에 Action suffix를 붙이면 경고가 사라지지 않겠냐는 안이 나왔지만 거부했다. Server Action이 아닌 콜백에 Action을 붙이는 건 의미를 왜곡하는 것이라, 경고를 끄려고 이름에 거짓말을 심는 셈이었다. 다음으로 lint 규칙을 비활성화할지 정리할지를 두고, 정리가 정석이라고 봤다. 내부 컴포넌트는 부모의 클라이언트 컨텍스트를 상속받으므로 스스로 경계를 선언할 필요가 없다. 그래서 전수 조사로 실제 클라이언트 진입점이 graph-page, instance-router, stage-route-shell, design-overview-page 4곳뿐임을 식별하고, 나머지 20개 파일에서 "use client"를 제거해 부모 컨텍스트 상속으로 대체했다.

- barrel 노출 컴포넌트 use client 경계 복원 및 빌드 선검사 추가
  - 전수 정리 직후 빌드가 깨졌다. useState를 Server Component 컨텍스트에서 import하려 한다는 에러였다. 원인을 따라가 보니 index.ts barrel re-export 파일이 함정이었다. barrel은 Server Component가 직접 import하는 진입 지점이 될 수 있어서, 거기로 노출되는 클라이언트 컴포넌트는 부모 상속에만 기댈 수 없고 자기 경계를 명시해야 했다. board-page와 controller-range-badges 두 파일의 "use client"를 복원했다. 같은 실수가 다시 빌드 단계까지 흘러가지 않도록, package.json의 build 스크립트가 pnpm run check(타입체크와 eslint)를 먼저 실행하도록 묶어 빌드 전에 오류를 조기 차단하게 했다.

## 정리

이날 오전 첫 줄기는 "관성으로 붙은 경계를 사실에 맞게 다시 긋기"였다. "use client"는 편의상 아무 파일에나 적어둘 수 있지만, 실제로는 모듈 그래프를 두 영역으로 가르는 약속이다. 약속이 사실과 어긋나 아무 데나 그어져 있으면, 어디까지가 클라이언트인지 코드가 스스로 말해주지 못한다. TS71007은 그 어긋남이 props 직렬화라는 형태로 비어져 나온 것이었고, 경고를 끄는 대신 경계를 좁히는 쪽을 택한 이유다. Action suffix로 이름을 속여 경고만 지우는 길을 거부한 것도 같은 판단이다.

동시에 이 작업은 전수 정리가 한 번에 옳게 끝나지 않는다는 것도 보여줬다. 20개 파일을 걷어내고 나서야 barrel re-export가 Server Component의 직접 진입점이라는 예외가 드러났다. 부모 상속이라는 일반 규칙은 맞았지만, barrel은 부모가 없는 자리라 그 규칙의 사각이었다. 한 번 걷어내 빌드를 깨뜨려 보고서야 경계가 실제로 필요한 지점이 어디인지 정확히 알 수 있었던 셈이다.

마지막에 빌드 앞단으로 check를 당긴 건 같은 실수를 사람이 아니라 파이프라인이 잡게 만든 조치다. 경계를 잘못 그으면 타입체크나 eslint 단계에서 먼저 걸리도록 순서를 바꿔, 이런 종류의 실수가 빌드까지 가는 비용을 구조적으로 줄였다. 경계를 사실에 맞추는 일과 그 사실을 자동으로 지키게 하는 일을 한 흐름에서 함께 끝냈다.
