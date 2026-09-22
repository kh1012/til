---
type: "content"
domain: "frontend"
category: "react"
topic: "컴포넌트 요소를 읽기 전용으로 식별할 때, data-slot 체인보다 React fiber의 _debugStack이 더 정확한 파일 경계를 준다는 것을 실측으로 검증한 사례"
updatedAt: "2026-09-21"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react-fiber"
  - "_debugStack"
  - "element-targeting"
  - "data-slot"
  - "mcp"
  - "read-vs-write"

relatedCategories:
  - "design-system"
  - "mcp"
---

# 컴포넌트 요소를 읽기 전용으로 식별할 때, data-slot 체인보다 React fiber의 _debugStack이 더 정확한 파일 경계를 준다는 것을 실측으로 검증한 사례

> atelier의 컴포넌트 화면에서 「고르기」로 찍은 요소가 어떤 파일의 어떤 컴포넌트에 속하는지 가르는 문제. 기존 `data-slot` 체인은 소스 자리의 이름표가 아니라 같은 컴포넌트를 두 번 쓰면 값이 같아진다. React 19 fiber의 `_debugStack`이 이미 다른 목적(설계도 화면)으로 쓰이고 있었고, 그 필드가 읽기 전용 요소 식별에도 더 정확한 경계를 준다는 것을 코드만 보고 판단하지 않고 Playwright 프로브로 직접 쟀다.

## 배경

atelier 화면과 컴포넌트를 다른 코드베이스로 이식할 때 쓸 전달 수단(MCP·예제 프롬프트)을 설계하면서, 「고르기」로 찍은 요소 하위만 좁혀 넘기는 기능(R3·R4)이 걸렸다. 페이지 쪽은 `data-nid`를 서버가 소스에 직접 박아서 정확했지만, 컴포넌트 쪽은 `data-slot` 체인 + 자식 순번뿐이었다 — 같은 컴포넌트를 두 번 쓰면 체인이 같아 소스 자리를 구분 못 한다.

그런데 설계도(blueprint) 화면이 이미 `shell/src/lib/blueprint-author.ts`에서 React 19 fiber의 `_debugStack`을 읽고 있었다. `authorFileOf(fiber)`(JSX를 쓴 파일), `ownerEntryOf(fiber, index)`(소유자 사슬의 첫 레지스트리 엔트리) 같은 함수가 이미 있었다. 스택 줄 원문은 `파일:줄:칸`을 다 들고 있는데, 설계도 화면은 파일만 필요해서 `:줄:칸`을 일부러 떼고 있었다(`.replace(/:\d+:\d+$/, "")`).

이 기존 코드를 읽고 "읽기 전용 식별에도 쓸 수 있겠다"는 가정을 세웠지만, 그 가정을 코드 근거만으로 문서에 못 박지 않고 Playwright로 직접 재는 프로브(P1~P4)를 먼저 돌렸다.

## 핵심 내용

- **미리보기는 iframe이었다.** 처음엔 "iframe이 아니라 같은 React 트리"라고 서술했는데 실측으로 정반대임이 드러났다. `PreviewFrame.tsx`가 `<iframe src=":9742/preview.html?...">`를 그리고, DOM 노드→fiber로 건너가는 길은 같은 문서 안에서만 열린다 — shell에서는 iframe 안의 fiber에 손이 안 닿는다. 그래서 fiber를 읽는 일 자체는 iframe 안(preview)에서 돌고 결과만 기존 다리(`preview-bridge.work.ts`)로 건너와야 한다.
- **P1 (fiber에서 파일:줄:칸이 나오는가) 판정 넷 중 셋만 통과.** `_debugStack`은 있고 `파일:줄:칸`도 실려 있고 JSX를 쓰는 컴포넌트에서는 워크벤치 파일이 정확히 나온다. 다만 줄·칸은 JSX 한 줄이 아니라 그 JSX를 만든 함수 선언 자리를 가리켰다(판정 4 실패). 처음 고른 시험 대상(`atomic-badge`·`atomic-select`)이 base-ui의 `useRender`로 그려지는 예외 케이스였다는 것도 재보고서야 드러났다 — 워크벤치 컴포넌트 291개 중 `useRender`는 7개뿐이고 280개는 JSX를 쓴다.
- **판정 4가 실패해도 원래 목적(R4, 요소 경계 추출)은 안 막혔다.** 필요한 건 컴포넌트 경계이지 JSX 한 줄의 정확한 위치가 아니었다. 문서에 처음 적었던 분기(줄·칸이 없으면 되돌아간다)는 애초에 잘못된 전제 위에 서 있었다.
- **P2로 경계 후보를 검증.** `ownerEntryOf` 대신 `_debugStack`이 주는 파일 경로(`components/<entry>/`)로 경계를 갈랐을 때, `designed-data-table`은 자기 것 52/82, `designed-error-state`는 7/19처럼 이름 안 잡히는 칸이 대부분 base-ui 내부(경계 아래라 안 펴는 게 맞는 동작)였다. `ownerEntryOf` 자체는 중간 껍데기가 레지스트리에 없으면 사슬이 그 칸을 건너뛰어 손자를 제 것으로 올리는 오탐이 실측 80개 중 6건 있었다 — 그래서 최종 결정은 `ownerEntryOf`가 아니라 파일 경로.
- **P3으로 빌드 앱 폴백 범위를 확정.** 빌드 번들을 정적으로 검사하니 `react-stack-top-frame` 문자열이 0건 — React가 `_debugStack` 값을 아예 안 만든다. `data-slot`·`data-entry` 폴백 표식은 살아 있으므로, 빌드 앱에서는 기존 `disabledReason` 선례를 따라 잠그고 이유를 말하면 된다.

## 정리

- 기존 코드가 이미 하고 있는 일(fiber 읽기)을 다른 목적(읽기 전용 식별)에 재사용할 수 있다는 판단은, 코드를 읽는 것만으로는 못 박지 않는다 — 실제로 돌려서 판정 기준을 먼저 세우고(P1의 판정 넷) 쟀다.
- 그 과정에서 문서에 적었던 서술 두 개가 실측으로 뒤집혔다: "iframe이 아니라 같은 React 트리"는 반대였고, "판정 4가 실패하면 되돌아간다"는 분기는 애초에 R4가 그 정밀도를 요구하지 않아 불필요했다. 가정을 코드로 세운 뒤에도 실측 결과가 나오면 처음 가정 자체를 다시 봐야 한다.
- 판정 기준을 미리 숫자·불리언으로 쪼개 두면(P1의 넷, P2의 자기것/전체 비율) 실측 결과가 나왔을 때 "쓸 만한가"를 다시 주관적으로 판단하지 않고 그대로 다음 결정으로 넘어갈 수 있다.
