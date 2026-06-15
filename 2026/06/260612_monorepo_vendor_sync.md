---
draft: true
type: "content"
domain: "frontend"
category: "monorepo"
topic: "외부 작업 레포의 최신 변경을 모노레포로 동기화하면서 로컬 적응 파일만 지켜내기, 그리고 타입·ESLint 정합성 정비"

updatedAt: "2026-06-12"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "monorepo"
  - "vendoring"
  - "rsync"
  - "useSyncExternalStore"
  - "noUncheckedIndexedAccess"
  - "set-state-in-effect"
  - "build-verification"

relatedCategories:
  - "react"
  - "typescript"
  - "build-system"
---

# 외부 레포 변경을 모노레포로 동기화하면서 로컬 적응만 지켜내기

> design 패키지는 별도 레포에서 개발되고 maxflow 모노레포로 끌어와 쓴다. 그 사이에 쌓인 외부 변경을 한 번에 가져오는데, maxflow에만 있는 임베드 적응 파일은 덮이면 안 됐다. 받아들일 변화와 지켜낼 변화 사이에 선을 긋는 하루였다.

## 배경

design-web/design-core는 어제 maxflow 안에 임베드 가능한 라이브러리로 만들어둔 패키지다. 다만 실제 기능 개발은 별도 작업 레포(max-dgn)에서 진행되고, maxflow로는 그 결과물을 동기화해서 쓴다. 그동안 max-dgn 쪽에 3400줄이 넘는 변경(뷰어, import 화면, 리포트 렌더러 등)이 쌓였고, 이걸 maxflow로 가져와야 했다.

문제는 maxflow에만 존재하는 적응(adaptation) 파일이다. 임베드를 위해 client.ts의 VITE 환경변수 주입, Radix 포털 스코핑, uiHooks lint 정리 같은 6개 파일을 maxflow 쪽에서만 손봐뒀는데, 외부 변경을 그냥 덮으면 이 적응이 통째로 날아간다. 그래서 오전의 실제 주제는 "최신을 받아들이되 우리 적응만 보존하는 동기화"였다. 오후에는 그와 별개로 타입체커와 ESLint가 잡아낸 정합성 문제를 정리했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- design 패키지를 외부 레포 최신으로 동기화
  - 방식: max-dgn HEAD를 rsync로 가져오되, maxflow 적응 6파일(client.ts VITE 주입, 포털 스코핑 4파일, uiHooks lint)은 동기화 대상에서 제외했다.
  - 막혔던 점과 결정: 1차 sync가 적응 파일까지 덮어버렸다. 여기서 덮인 부분만 골라 되돌리는 surgical 복구 대신, reset으로 깨끗이 되돌린 뒤 제외 규칙을 다시 걸어 클린 재sync 했다. 부분 복구는 빠뜨릴 위험이 있는데, 이 패키지가 아직 실사용 전 단계라 클린 재sync의 리스크가 더 낮다고 판단했다.
  - 근거: 클린 재sync가 안전한 건 "max-dgn이 그 적응 6파일을 건드리지 않았다"는 전제가 성립할 때뿐이다. 이걸 마커 기반으로 확정했기 때문에, 제외해도 외부의 신규 작업이 누락되지 않는다는 보장이 섰다.
  - 백엔드 7파일은 적응이 없고 상대 import만 쓰므로 전량 그대로 반영했다.
  - 검증: build:lib 성공, 백엔드 compileall OK, useDesignScope 4개와 VITE_DESIGN_API_URL 주입이 동기화 후에도 살아있는지 확인했다.

- design-core env-example 추가
  - 동기화된 패키지가 요구하는 환경변수를 design-core의 .env.example에 예시로 명시했다. 받아온 코드가 기대하는 설정 표면을 문서 쪽에도 맞춰둔 것이다.

- README·버전·import 화면 갱신
  - README를 갱신하고 apps/web과 루트 package.json 버전을 올렸다. 동기화 과정에서 ModelImportScreen과 분석 탭(TabAnalysis)도 소소하게 손봤다.

- 타입 체크·ESLint 에러 수정
  - 분석 플랜 코드에서 sortedRules[0]이 undefined일 수 있다는 경고가 떴다. 인덱스 접근 대신 slice(0,1)로 바꿔 요소 타입을 보존했다. 런타임 동작은 동일하면서 noUncheckedIndexedAccess를 만족시키는 방식이다.
  - 스키마 테스트의 properties.formData도 undefined 가능성이 있어 옵셔널 체이닝으로 막았다.
  - project-create-page의 set-state-in-effect 2건을 해소했다. canUseNativeWorkspacePicker는 window에 의존하는 값이라 useSyncExternalStore로 옮겨 SSR에서도 안전하게 만들었고, intakeWorkspaceStatus는 초기값을 preparing으로 잡아 effect 안에서 동기 setState 하던 것을 아예 없앴다.
  - max-lines 등 ESLint warning 44건은 보류했다. 경고를 없애려면 거대 파일을 쪼개야 하는데, 분할은 회귀 위험이 커서 지금 일괄로 손댈 일이 아니라고 봤다.

## 정리

오늘 한 일을 한 줄로 줄이면 "외부에서 흘러들어오는 코드를 받아들이면서 우리 쪽 적응만 지켜낸 것"이다. 동기화라는 게 단순히 파일을 덮어쓰는 작업처럼 보이지만, 막상 해보면 "무엇을 받아들이고 무엇을 지킬지"를 한 파일 단위로 결정하는 일이라는 게 드러난다.

가장 신경 쓴 판단은 1차 sync가 적응을 덮었을 때 부분 복구가 아니라 클린 재sync를 고른 것이다. 부분 복구는 손이 덜 가 보이지만 빠뜨림이 생기면 조용히 적응이 사라진다. 반대로 클린 재sync는 "외부가 그 파일들을 안 건드렸다"는 확정만 있으면 누락 위험 자체가 없다. 그래서 복구 방식을 고르기 전에, 마커로 외부 변경 범위를 먼저 확정하는 게 핵심이었다. 안전한 전략은 전략 자체보다 그 전략이 성립하는 전제를 검증하는 데서 나온다.

오후의 set-state-in-effect 해소도 같은 결의 작업이었다. window 의존값을 렌더 중에 읽으면 SSR에서 깨지니 useSyncExternalStore로 외부 소스를 구독하는 게 정석이고, effect로 set 하던 값은 초기값으로 끌어올릴 수 있으면 effect 자체를 지우는 게 낫다. 외부에서 들어오는 값(브라우저 환경)을 React 렌더 모델에 어떻게 안전하게 합류시키느냐는 점에서, 오전의 벤더 동기화와 다르지 않은 문제였다. ESLint 44건을 일부러 보류한 것도 마찬가지다. 기계적으로 경고 0을 만드는 것보다 회귀 위험과 저울질해 받아들일 변화의 범위를 긋는 게 맞다고 판단했다.
