---
type: "content"
domain: "devops"
category: "build-infra"
topic: "설치 파일 kill-switch용 gate.json을 비공개 저장소에 두면 앱이 인증 없이 읽을 수 없다는 걸 raw.githubusercontent.com 요청으로 실측하고 공개 저장소로 바꾼 사례"
updatedAt: "2026-10-29"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "github-raw-content"
  - "private-repo-access"
  - "kill-switch"
  - "version-revocation"
  - "unauthenticated-fetch"

relatedCategories:
  - "ci"
---

# 설치 파일 kill-switch용 gate.json을 비공개 저장소에 두면 앱이 인증 없이 읽을 수 없다는 걸 raw.githubusercontent.com 요청으로 실측하고 공개 저장소로 바꾼 사례

> plugin-builder 배포 설치 파일이 유출됐을 때 외부에서 그 버전을 막을 방법을 설계하면서, atelier 쪽에 이미 있던 `atelier-ops` 공개 저장소의 `gate.json` 패턴을 그대로 옮기려 했다. 그런데 새로 만든 `plugin-builder-ops` 저장소를 비공개로 둔 채 `raw.githubusercontent.com`에서 인증 없이 요청해보니 404가 돌아왔고, 같은 방식으로 공개 상태인 `atelier-ops`는 200이 돌아왔다. 저장소를 공개로 바꾼 뒤에야 설치된 앱이 토큰 없이 `gate.json`을 읽을 수 있었다.

## 배경

atelier는 배포 PC가 사내망을 벗어나 내부 `/health` 엔드포인트에 닿지 못하는 상황을 위해, 2026-10-02에 보조 수단을 만들어 뒀다 — 내부 서버 응답이 없으면 공개 GitHub 저장소(`atelier-ops`)의 `gate.json`을 대신 읽는 2단계 확인 구조다. `gate` 불리언으로 설치 파일을 통째로 막거나(kill-switch), `maintenance`로 점검 모드를 걸거나, `graceHours`로 유예 시간을 두는 식이다. 신뢰는 암호 서명이 아니라 그 저장소에 쓰기 권한을 가진 사람으로 한정하는 것에 의존한다.

plugin-builder 쪽도 설치 파일이 유출됐을 때 외부에서 특정 버전을 막을 방법이 필요해지면서, 이 패턴을 그대로 가져와 `plugin-builder-ops` 저장소를 새로 만들었다. 저장소를 비공개로 만들어 두고 다음 단계(공개 여부, 토큰 방식)를 M9에서 정하기로 했었다.

## 핵심 내용

**비공개 저장소는 raw 파일도 인증 없이 못 읽는다**: `plugin-builder-ops`에 `gate.json`을 커밋해 둔 뒤, 토큰 없이 `https://raw.githubusercontent.com/.../gate.json`을 요청하면 HTTP 404가 돌아왔다. 같은 요청을 공개 상태인 `atelier-ops`의 `gate.json`에 보내면 HTTP 200이 돌아온다. GitHub API만 비공개 저장소를 막는 게 아니라, raw 콘텐츠 엔드포인트도 동일하게 막는다는 걸 직접 요청으로 확인한 것이다.

**설치 파일에 토큰을 넣는 대신 저장소를 공개로 바꾸는 쪽을 택했다**: gate.json을 읽는 주체는 이미 배포돼 사용자 손에 있는 설치 파일이다. 여기에 읽기 전용 토큰을 심어 비공개 저장소에 접근하게 할 수도 있지만, 토큰은 설치 파일 안에 그대로 노출되고 만료 주기를 관리해야 하며 만료되면 사내망 밖의 모든 설치본이 한꺼번에 gate.json을 못 읽게 된다. `gh repo edit --visibility public`으로 저장소를 공개로 바꾸는 쪽이 이 위험을 통째로 없앤다 — README에도 "토큰을 담지 않는다"는 설계를 명시해 뒀다.

**gate.json 자체는 민감하지 않다는 전제가 이 결정을 떠받친다**: 공개로 바꿔도 되는 이유는 이 파일에 `gate`/`maintenance`/`graceHours`처럼 설치 파일의 동작 플래그만 담겨 있고, 내부 서버 주소나 인증 정보가 들어있지 않기 때문이다. 파일 내용 자체가 공개 가능한지 먼저 따져야, 저장소 공개 여부를 안전하게 결정할 수 있다.

## 정리

GitHub 저장소를 비공개로 두면 웹 UI나 API 접근만 막힌다고 생각하기 쉽지만, `raw.githubusercontent.com`을 통한 원본 파일 접근도 똑같이 막힌다. 배포된 바이너리가 외부에서 설정 파일을 읽어야 하는 구조(원격 kill-switch, 피처 플래그, 원격 설정)를 만들 때는 "그 파일을 누가, 어떤 인증 수단으로 읽는가"를 먼저 정하고 저장소 가시성을 거꾸로 결정해야 한다. 토큰을 설치 파일에 심는 선택지는 토큰 유출·만료라는 새 위험을 들여오므로, 파일 내용이 공개돼도 안전하다면 저장소를 공개로 두는 쪽이 운영 부담이 적다.
