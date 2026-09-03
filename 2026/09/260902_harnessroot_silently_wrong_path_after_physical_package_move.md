---
type: "content"
domain: "devops"
category: "build-infra"
topic: "atelier 서버 코드를 apps/atelier로 물리 이동했을 때, harnessRoot가 조용히 apps/atelier 내부를 가리켜 pages·flows·avatars 경로가 틀렸던 문제"
updatedAt: "2026-09-02"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "monorepo-package-relocation"
  - "silent-path-resolution-bug"
  - "existence-based-path-test"
  - "vite-config-closure-isolation"
  - "import-meta-url-resolution"

relatedCategories:
  - "testing"
  - "javascript"
---

# atelier 서버 코드를 apps/atelier로 물리 이동했을 때, harnessRoot가 조용히 apps/atelier 내부를 가리켜 pages·flows·avatars 경로가 틀렸던 문제

> `gallery/lib/**`·`vite-harness-api*.ts`·`server/**` 286개 파일을 `apps/atelier/`라는 독립 패키지로 물리 이동(S8 단계)한 뒤, 상대 경로로 계산되던 `harnessRoot`가 조용히 새 패키지 안쪽을 가리키게 됐다. 경로가 틀려도 아무 것도 던지지 않아 어떤 게이트도 이 문제를 걸러내지 못했고, 발견은 `server/paths.test.ts`를 문자열 비교에서 "그 경로에 실제로 무엇이 있는지 확인"하는 방식으로 바꾸고 나서였다.

## 배경

이 프로젝트는 gallery의 Vite 플러그인 안에 인라인으로 있던 harness API 서버 코드를 `node:http` 기반 standalone 서버로 떼어내는 다단계 작업(S1~S8)을 진행 중이었다. S1~S7은 기존 파일 위치를 그대로 두고 기능만 분리했고, S8에서 처음으로 `server/`·`vite-harness-api*.ts`·`gallery/lib/**`를 `apps/atelier/`라는 새 패키지로 실제로 옮겼다(24,725줄, 커밋 `932a43ba70`). 내부 상대 import 172개를 한 줄도 고치지 않기 위해 디렉터리 구조를 신중하게 골랐지만, `harnessRoot`처럼 "코드 파일 위치를 기준으로 프로젝트 루트를 역산하는" 경로 계산 로직까지는 그 신중함이 미치지 못했다.

## 핵심 내용

**옮기기 전에는 어떤 게이트도 이 경로 계산을 검증하지 않았다.** `harnessRoot`는 그 아래로 `pages`·`flows`·`avatars` 같은 실제 데이터 디렉터리가 달리는 기준점인데, 물리 이동 이후 이 값이 원래 프로젝트 루트가 아니라 새로 옮겨진 `apps/atelier` 패키지 내부의 상대 위치를 가리키게 됐다. 문제는 이 경로가 **틀려도 아무 것도 예외를 던지지 않는다**는 점이다 — 파일시스템 API는 존재하지 않는 경로에 대해 빈 목록이나 ENOENT를 조용히 반환할 뿐이고, 타입 검사도 그냥 `string`이라 통과한다. 그 결과 물리 이동 커밋 자체는 아무 테스트도 실패시키지 않고 그린으로 통과했다.

**기존 `server/paths.test.ts`는 계산된 경로 문자열이 기대한 문자열과 같은지만 비교하고 있었다.** 이 방식은 정확히 이번 같은 사고를 못 잡는다 — 코드 이동으로 기준점(`import.meta.url` 등)이 바뀌면 "계산된 문자열"과 "기대한 문자열"이 **둘 다 함께** 달라지므로 비교 자체는 여전히 통과한다. 고친 방식은 문자열을 비교하는 대신 **그 경로 자리에 실제로 무엇이 있는지**를 확인하는 것이었다(5건) — 예를 들어 `harnessRoot`가 가리키는 곳 아래에 실제 `pages` 디렉터리가 존재하는지, 알려진 시드 데이터가 그 자리에서 읽히는지를 검증한다. 문자열 동등성은 계산 로직이 바뀌어도 함께 바뀔 수 있지만, 파일시스템 존재 여부는 계산 로직과 독립적인 사실이라 실제 배선이 끊어졌을 때만 실패한다.

**이 이동은 같은 부류의 문제를 한 번 더 드러냈다** — `new URL(spec, import.meta.url)` 형태로 적힌 네 자리는 반드시 그 모양을 유지해야 했는데, 패키지 지정자(`import "@pkg/x"`)로 바꾸면 Vite의 설정 로더가 설정 파일들을 임시 파일로 묶어 번들링하는 과정에서 `import.meta.url`**만** 원본 파일 위치로 되돌려주고 패키지 지정자는 그 임시 파일 위치 기준으로 풀려 `Cannot find package`로 죽었다. 물리적 코드 이동은 "상대 경로로 적힌 곳"과 "코드가 실행되는 실제 위치 사이의 관계를 가정하는 모든 곳"을 함께 확인해야 하는 작업이라는 뜻이다.

## 정리

경로 계산 로직을 검증하는 테스트를 짤 때 "계산된 값이 기대값과 같다"는 문자열/설정 비교는, 계산 로직 자체가 물리적 위치 변경으로 함께 틀어지는 시나리오를 원천적으로 못 잡는다 — 두 값이 같은 방식으로 틀려버리면 비교는 여전히 통과하기 때문이다. 이런 경로는 계산된 자리에 **실제로 기대하는 것이 존재하는지**를 확인하는 존재-기반 검증이어야 물리 이동 같은 사고를 잡아낸다. 그리고 대규모 파일 이동을 할 때는 "이 코드가 어디 있다고 가정하고 있는가"를 import 문뿐 아니라 `import.meta.url` 기반 경로 역산, 번들러의 설정 로더가 파일을 임시 위치로 옮겨 실행하는 특수 케이스까지 함께 점검해야 한다는 것도 이번에 다시 확인됐다.
