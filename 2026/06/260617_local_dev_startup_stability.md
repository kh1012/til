---
draft: true
type: "content"
domain: "devops"
category: "dev-environment"
topic: "design-core를 dev 병렬 실행에 추가하고, db:start 전에 Docker 데몬을 자동 기동하게 만들고, electron이 서버를 직접 띄우는 A 모드와 외부 서버에 붙는 B 모드를 공존시키며 기동 진단 로그를 심어 창이 늦게 뜨는 원인을 가시화하기"

updatedAt: "2026-06-17"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "monorepo-dev"
  - "parallel-dev"
  - "docker-daemon"
  - "startup-instrumentation"
  - "electron-supervise"
  - "separation-of-concerns"
  - "diagnostic-log"

relatedCategories:
  - "infra"
  - "monorepo"
  - "electron"
---

# 로컬 기동을 두 갈래로 나누고, 늦게 뜨는 원인을 로그로 드러내기

> 로컬 개발 기동이 가끔 첫 줄에서 죽거나 창이 늦게 떠서, 원인을 추측이 아니라 로그로 보이게 만드는 데 시간을 썼다. db:start 앞에 Docker 데몬을 자동으로 깨우고, design-core를 dev 병렬에 합류시키고, electron이 서버를 직접 supervise하는 모드와 외부 서버에 붙는 모드를 둘 다 살려 협업과 단순함을 모두 챙겼다. 그리고 서비스별 ready/타임아웃을 찍는 진단 로그를 심어, 무엇이 기동을 잡고 있는지 눈으로 보게 했다.

## 배경

로컬 기동이 두 가지로 불안정했다. 하나는 강제 종료 후 다시 띄울 때 Docker 데몬이 꺼져 있으면 db:start가 첫 줄 "Cannot connect to docker daemon"에서 바로 죽는 것이었다. 다른 하나는 창이 늦게 뜨거나 api가 안 떠 있을 때 원인을 짐작만 할 뿐 무엇이 기동을 붙잡는지 안 보이는 것이었다. 추측으로 디버깅하면 매번 헛다리를 짚게 되므로, 오늘은 "기동 과정을 관측 가능하게 만들기"를 주제로 잡았다.

여기에 더해 협업 환경에서 기동 방식을 둘로 나눠야 할 필요가 있었다. electron이 모든 서버를 직접 띄우는 방식은 토큰이 자동 주입되고 단순하지만, 서버와 데스크톱을 따로 굴리고 싶은 협업·빌드 상황엔 안 맞는다. 그래서 두 모드를 충돌 없이 공존시키는 것도 함께 풀었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- dev/dev:full-web에 design-core 병렬 실행 추가
  - design-core 서버가 dev에서 같이 떠야 해서 병렬 목록에 합류시켰다. dev를 `--filter desktop`에서 `--parallel -F desktop -F design-core`로 바꾸고, dev:full-web의 parallel 목록 끝에도 -F design-core를 추가했다. design-core dev는 자체완결이라(uvicorn :9215 --reload, env 주입 불필요) 필터만 추가하면 됐다. design-web은 desktop predev의 build:lib로 이미 임베드되므로 dev 서버가 따로 필요 없어 제외했다.

- db:start에 Docker 데몬 자동 기동 추가
  - db:start가 데몬 부재로 첫 줄에서 죽는 문제를 근본에서 막았다. db:start 앞에 ensure-docker.mjs를 두고, docker info로 상태를 보고 죽어 있으면 open -a Docker로 깨운 뒤 ready까지 폴링(최대 120초)하게 했다. darwin·win·linux를 분기 처리했고, node_modules 없이 내장 모듈만 써서 의존성을 안 늘렸다. 강제 종료 후 재실행 시나리오에서 데몬을 사람이 손으로 깨우던 단계를 없앴다.

- dev A/B 모드 공존 + 기동 진단 로그 추가
  - 기동 방식을 두 갈래로 명시하고, 그 위에 계측을 얹었다.
    - A 모드(pnpm dev): electron이 workflow-runtime·design-core까지 5개 서버를 직접 spawn하고 supervise한다. 단순하고 토큰이 자동 주입된다.
    - B 모드(dev:desktop:external): 서버는 pnpm parallel로 띄우고 electron은 셸로 외부 서버에 붙는다. 협업과 관심사 분리에 유리하다.
    - 결정: 둘 중 하나로 통일하지 않고 A를 기본, B를 옵션으로 공존시켰다. 협업·관심사 분리엔 B가, 단순함·토큰 자동엔 A가 맞아서 양쪽 다 살릴 가치가 있었다.
    - 진단 로그: [startup] 계측을 넣어 서비스별 ready/타임아웃을 초 단위로 찍게 했다. 창이 늦게 뜨거나 api가 안 떠 있을 때 원인을 눈으로 보게 하려는 것이다.
    - 부수 발견: DATABASE_URL host의 localhost 정규화를 넣었는데, 간헐 실패의 주원인은 host가 아니라 docker 부재로 판명됐다. 정규화 자체는 무해해서 남겼다.
    - free-ports: external 모드에선 외부 서버를 보존하려고 skip하게 하고, design-core 9215 포트를 정리 대상에 추가했다.

## 정리

오늘의 한 줄은 "기동을 관측 가능하게 만들고, 방식은 하나로 강제하지 않기"다.

가장 효과가 컸던 건 진단 로그였다. 그동안 창이 늦게 뜨면 어느 서버가 잡고 있는지 짐작으로 디버깅했는데, 서비스별 ready/타임아웃을 초 단위로 찍게 하니 추측할 거리가 사라졌다. 실제로 DATABASE_URL host 정규화를 의심하고 손댔지만, 로그로 보니 간헐 실패의 진짜 원인은 docker 데몬 부재였다. 관측 장치를 먼저 깔지 않으면 멀쩡한 곳을 고치느라 시간을 버린다는 걸 한 번 더 확인했다. 그래서 host 정규화는 무해하니 남기되, 실제 해결은 ensure-docker로 데몬을 자동 기동하는 쪽에서 났다.

A/B 모드를 공존시킨 결정도 마음에 든다. 보통은 "둘 중 뭐가 맞냐"를 정해 하나로 통일하려 들지만, A(단순·토큰 자동)와 B(협업·관심사 분리)는 서로 다른 상황에서 각각 옳았다. 하나로 강제했으면 다른 상황에서 매번 우회를 만들었을 것이다. 대신 free-ports가 external 모드에서 외부 서버를 건드리지 않게 하는 식으로, 두 모드가 서로의 발을 밟지 않을 경계만 명확히 그었다. 선택지를 줄이는 게 항상 단순함은 아니고, 충돌만 막으면 두 길을 함께 두는 게 더 단순할 때도 있다.
