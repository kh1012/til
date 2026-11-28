---
type: "content"
domain: "backend"
category: "electron"
topic: "캡처 세션의 print 차단을 CSP와 CDP 두 겹으로 걸고, 가드 적용 실패 시 대상 종류에 따라 fail-open과 fail-closed를 나눈 결정"
updatedAt: "2026-11-27"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "electron"
  - "chrome-devtools-protocol"
  - "content-security-policy"
  - "fail-open-fail-closed"
  - "defense-in-depth"

relatedCategories:
  - "typescript"
---

# 캡처 세션의 print 차단을 CSP와 CDP 두 겹으로 걸고, 가드 적용 실패 시 대상 종류에 따라 fail-open과 fail-closed를 나눈 결정

> `url-capture-guard.ts`는 플러그인이 캡처 중 `window.print()`를 띄워 OS 수준 다이얼로그로 캡처 프로세스를 멈추는 걸 막는다. 헤더 기반 CSP와 CDP 스크립트 주입, 두 겹을 걸고, 가드를 못 거는 경우엔 대상이 워커인지 프레임인지에 따라 재개 여부를 다르게 정했다.

## 배경

캡처 세션 중 플러그인이 `window.print()`나 `document.execCommand("print")`를 호출하면 OS print 다이얼로그가 뜨고 캡처가 멈춘다. 처음 시도한 수정(Task 6 Fix Round 1)이 부족해 Round 2로 범위를 넓혔다 — 단일 방어가 아니라 두 겹을 걸고, 각 겹이 뚫리는 경로를 따로 막는 쪽으로 갔다.

## 핵심 내용

**1겹 — 응답 헤더에 CSP sandbox를 얹는다**: `withCaptureCsp()`가 모든 응답의 `Content-Security-Policy` 헤더에 `sandbox allow-scripts allow-same-origin`을 추가한다. 기존 CSP 값이 있으면 덮지 않고 이어 붙인다. `webRequest.onHeadersReceived`에서 걸기 때문에 페이지 스크립트가 돌기 전에 이미 적용돼 있고, `sandbox` 속성은 자식 프레임(동적으로 만든 iframe, `srcdoc` 포함)에도 상속된다.

**2겹 — CDP로 페이지 스크립트보다 먼저 JS 레벨에서 잠근다**: `PAGE_GUARD` 스크립트를 `Page.addScriptToEvaluateOnNewDocument`로 주입해, 모든 문서마다 사용자 스크립트가 돌기 전에 실행되게 한다. `window.print`를 빈 함수로 `Object.defineProperty`(`writable: false, configurable: false`)로 잠그고, `Document.prototype.execCommand`는 인자가 `"print"`일 때만 거부하도록 감싸고, `ServiceWorkerContainer.prototype.register`도 거부하게 바꾼다. ServiceWorker 등록을 막는 이유는 CSP sandbox 헤더가 ServiceWorker가 대신 응답하는 요청까지는 못 덮기 때문 — 1겹을 우회할 수 있는 구멍을 2겹에서 따로 닫은 것.

**가드를 못 걸었을 때, 대상 종류로 fail-open/fail-closed를 가른다**: `Target.attachedToTarget` 핸들러에서 `cover()`(Page 도메인 활성화 + PAGE_GUARD 주입 + 자동 attach 설정)가 실패하면, 대상이 `worker`/`shared_worker`/`service_worker`면 그래도 재개(`Runtime.runIfWaitingForDebugger`)한다 — 워커는 `Page` 도메인도 print 표면도 없어서 가드가 막을 게 원래 없기 때문이다. 반대로 프레임·페이지는 재개하지 않고 `broken = true`로 표시해 멈춰 둔다 — print 표면이 있는 대상인데 가드를 못 걸었으면, 멈춘 채 "이번 캡처는 깨짐"으로 보고하는 쪽을 택했다.

## 정리

두 겹을 겹치는 이유는 하나가 막는 경로와 다른 하나가 막는 경로가 다르기 때문이다 — CSP sandbox 헤더는 페이지 스크립트가 돌기 전에 선제 차단하지만 ServiceWorker 응답까지는 못 덮고, CDP 주입은 ServiceWorker 등록 자체를 막지만 스크립트가 실행된 뒤에야(비록 사용자 스크립트보다는 먼저) 적용된다. 가드 적용 실패 시의 처리도 "항상 멈춘다"나 "항상 재개한다"로 한 방향으로 정하지 않고, 대상이 실제로 print 표면을 가졌는지로 갈랐다 — 표면이 없는 대상(워커)을 막아 봐야 캡처만 늦어지고 얻는 게 없으니 fail-open, 표면이 있는 대상(프레임·페이지)은 가드 없이 흘려보내면 바로 사고로 이어지니 fail-closed. 방어를 겹칠 때는 겹의 개수보다 각 겹이 정확히 어떤 경로를 막는지, 그리고 실패했을 때의 기본값을 대상별로 따로 정했는지가 더 중요하다.
