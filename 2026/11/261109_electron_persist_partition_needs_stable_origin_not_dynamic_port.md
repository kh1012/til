---
type: "content"
domain: "backend"
category: "build-infra"
topic: "Electron persist: 파티션은 고정 origin이 필요하다 — 매 실행마다 바뀌는 포트로는 localStorage가 유지되지 않는다"
updatedAt: "2026-11-09"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "electron"
  - "session-partition"
  - "persist-partition"
  - "webview"
  - "dynamic-port"
  - "localstorage"

relatedCategories:
  - "javascript"
---

# Electron persist: 파티션은 고정 origin이 필요하다 — 매 실행마다 바뀌는 포트로는 localStorage가 유지되지 않는다

> 설치된 플러그인 실행 webview에 localStorage를 앱 재시작 후에도 남기려고 `persist:plugin-builder-installed-<id>` 파티션을 쓰려 했다. 그런데 플러그인을 실행하는 로컬 서버 포트가 매번 동적으로 할당되고 있어서, origin 자체가 실행마다 바뀌는 구조였다.

## 배경

Plugin Builder에서 설치된 플러그인은 로컬 서버(`run-hub.ts`)가 열어주는 `http://127.0.0.1:<port>` 위에서 webview로 돌아간다. 이 webview에 플러그인별로 데이터를 남기고 싶어서 Electron의 `persist:` 파티션을 쓰는 설계를 검토했다.

## 핵심 내용

**Electron의 `persist:` 파티션은 디스크에 세션을 저장하지만, 그 세션이 저장되는 키는 origin이다**: 파티션 이름 자체가 아니라 webview가 실제로 로드하는 URL의 origin(scheme+host+port) 기준으로 localStorage가 분리된다. 파티션 이름을 `plugin-builder-installed-<id>`로 고정해도, origin이 바뀌면 그 origin에 대한 저장소는 비어 있는 새 저장소다.

**포트가 `run-hub.ts`의 `launch()`에서 매번 동적으로 선택되고 있었다**: 사용 가능한 범위나 OS가 골라주는 포트를 매 실행마다 새로 받아오는 구조라, 같은 플러그인이라도 재시작할 때마다 origin이 `http://127.0.0.1:<다른 포트>`로 바뀐다. 파티션 이름은 플러그인 id로 고정돼 있었지만, 그 안에서 실제로 조회되는 origin별 저장소는 매번 새것이었다.

**이전 설계 시도(후보 B)는 `persist:<url>` 네이밍이 안정적인 포트를 전제로 했고, 그 전제가 깨져 있었다**: 포트가 고정이라면 그 방식도 동작했겠지만, 동적 포트 할당과는 애초에 맞물릴 수 없는 설계였다.

**해결은 localStorage 자체를 버리고 런타임 API로 상태를 save/load하는 방향(후보 A)으로 갔다**: 포트를 바꾸지 않아도 되는 대안이라서, 포트 할당 로직을 건드리지 않고 상태 저장 책임을 애플리케이션 레이어로 옮겼다. (대안으로 거론된 또 다른 경로는 설치된 플러그인마다 포트를 결정론적으로 고정하는 것이었지만, 채택되지 않았다.)

## 정리

브라우저·Electron 모두에서 저장소 격리 기준은 파티션 이름이 아니라 origin이다. 로컬 서버의 포트를 동적으로 할당하는 구조 위에 `persist:` 파티션으로 영속 저장소를 올리려 하면, 파티션 이름을 고정해도 origin이 흔들려서 저장소가 매번 리셋된다. 동적 포트 환경에서 영속 저장이 필요하면 포트를 결정론적으로 고정하거나, 저장소 자체를 origin에 묶이지 않는 런타임 API로 옮겨야 한다.
