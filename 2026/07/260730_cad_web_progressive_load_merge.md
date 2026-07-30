---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "CAD 점진 로딩(folderLoad·detectionProgress) 진행 모델이 들어온 origin/main 을 진입 스켈레톤(probing) 작업 브랜치에 병합하며 충돌 7건과 세만틱 충돌 1건을 해소한 기록. 겹치는 두 진행 모델 중 하나를 채택하고 나머지를 그 위에 얹는 방식으로 정리했다"
updatedAt: "2026-07-30"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "merge-conflict"
  - "cad-web"
  - "progressive-loading"
  - "semantic-conflict"

relatedCategories:
  - "typescript"
  - "testing"
---

# 두 개의 진행 모델이 만난 병합, 하나를 고르고 나머지를 얹기

> origin/main 에 CAD 점진 로딩이 들어오는 동안 작업 브랜치에서는 probing 진입 화면을 만들고 있었다. 둘 다 "로딩 중 진행 상태를 어떻게 표현할 것인가"를 건드려 충돌 7건과 세만틱 충돌 1건이 났다. 진행 모델은 origin 쪽을 채택하고 진입 스켈레톤을 그 위에 얹는 방향으로 정리했다.

## 배경

작업 브랜치에서는 CAD 웹 진입 시 아무것도 없는 화면 대신 스켈레톤을 보여 주는 probing 상태를 만들고 있었다. 그 사이 origin/main 에는 CAD 점진 로딩이 머지됐다. 파일 전체를 한 번에 파싱하는 대신 폴더 단위로 나눠 읽고 진행률을 노출하는 작업이다.

두 작업이 겹치는 지점은 명확하다. 둘 다 "로딩 중에 사용자가 무엇을 보는가"를 다룬다. 브랜치에는 `autoProgress` 라는 자체 진행 표현이 있었고, origin 에는 `folderLoad` 와 `detectionProgress` 로 나뉜 더 세분화된 진행 모델이 들어왔다. 같은 자리에 두 모델이 놓여 있으니 기계적으로 합칠 수 없었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- origin/main 병합, CAD 점진 로딩과 probing 진입 화면 통합
  - 진행 모델은 origin/main 쪽을 채택했다. `cad-state-load-reducer`, `use-cad-web-controller`, `use-cad-folder-actions` 세 곳에서 `folderLoad`·`detectionProgress` 진행 모델을 받고, 브랜치의 probing(진입 스켈레톤)을 그 위에 얹었다. 제거된 `autoProgress` 참조도 함께 정리했다.
  - `workspace-cad-api` 는 양쪽을 살렸다. origin 의 `session.getFullScene`(캐시와 abort 지원)을 채택하면서, 브랜치가 갖고 있던 404 응답을 사용자 문구로 변환하는 `withDrawingFileGuard` 는 유지했다. 하나는 데이터 획득 방식이고 하나는 오류 표현이라 서로 배타적이지 않다.
  - `cad-entry-transition.test` 는 `autoProgress` 계약으로 쓰여 있어 `folderLoad` 계약으로 이식했다. 테스트가 사라진 개념을 검증하고 있으면 통과해도 의미가 없다.
  - `ui-harness/package.json` 은 합집합으로 처리했다. test 글롭(gallery/lib), page 스크립트, `@xyflow/react`, `test:coverage`, vitest 를 모두 남긴다. 스크립트와 의존성은 둘 중 하나를 고를 이유가 없는 종류의 충돌이다.
  - `page-create/GUIDE.md` 는 브랜치의 §10 본문을 유지하되 경로만 ui-harness 로 맞췄고, `pnpm-lock.yaml` 은 재생성했다.
  - 세만틱 충돌도 하나 있었다. `shared/api/client.ts` 에서 `requestHeaders` 가 중복 선언됐다. 양쪽 모두 각자 헤더 구성 로직을 추가했는데 텍스트 위치가 달라 git 은 충돌로 잡지 않고 그냥 둘 다 남겨 놨다.
  - 검증은 `pnpm run check` 통과, `check:source-size` 통과(violations=0), cad/web·ui-harness·cad-web 테스트 통과까지 확인했다.

- feature/kh1012/maxflow-init 풀 리퀘스트 병합과 원격 추적 브랜치 재병합
  - 오전 병합분을 PR 로 반영하고, 오후에 다시 origin/main 을 작업 브랜치로 가져왔다. 두 번째 병합은 충돌 없이 지나갔다.

## 정리

병합에서 가장 오래 걸린 건 충돌 표시가 난 7곳이 아니라, git 이 아무 말도 하지 않은 1곳이었다. `requestHeaders` 중복 선언은 양쪽이 같은 목적의 코드를 서로 다른 줄에 추가한 경우다. 텍스트가 겹치지 않으니 git 은 둘 다 살려 놓는데, 결과물은 컴파일조차 되지 않는다. **git 이 조용하다는 것과 코드가 온전하다는 것은 다른 이야기다.** 그래서 충돌 해소 후 `pnpm run check` 를 반드시 통과시키는 절차가 실제로 값을 한다.

충돌 해소 방침도 정리해 두면 좋겠다. 이번엔 세 가지 유형이 섞여 있었다.

첫째, 같은 문제에 대한 두 개의 답(진행 모델). 이건 하나를 골라야 한다. origin 의 `folderLoad`/`detectionProgress` 가 더 세분화돼 있으니 그쪽을 채택하고 브랜치의 probing 을 그 위에 얹었다. 반반 섞으면 둘 중 어느 쪽도 아닌 것이 된다.

둘째, 서로 다른 문제에 대한 두 개의 답(`getFullScene` vs `withDrawingFileGuard`). 하나는 데이터를 어떻게 가져오는가, 하나는 실패를 어떻게 보여주는가다. 충돌 표시는 났지만 실제로는 배타적이지 않으니 둘 다 살린다.

셋째, 고를 이유가 없는 것(package.json 스크립트, 의존성). 합집합이 답이다.

그리고 테스트를 잊지 않는 것. `cad-entry-transition.test` 는 `autoProgress` 라는 사라진 개념을 검증하고 있었다. 병합 후 테스트가 초록이어도, 그 테스트가 이미 존재하지 않는 계약을 보고 있으면 아무것도 지켜주지 않는다. 개념을 바꿀 때 테스트도 같이 이식해야 한다는 걸 다시 확인했다.
