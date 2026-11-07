---
type: "content"
domain: "frontend"
category: "testing"
topic: "macOS 접근성 권한이 막힌 Electron 앱을, orca computer-use 대신 Playwright CDP 연결로 우회 검증"
updatedAt: "2026-11-06"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "cdp"
  - "connectOverCDP"
  - "playwright"
  - "electron"
  - "macos-accessibility-permission"
  - "getbyrole-vs-getbytext"

relatedCategories:
  - "build-infra"
---

# macOS 접근성 권한이 막힌 Electron 앱을, orca computer-use 대신 Playwright CDP 연결로 우회 검증

> Plugin Builder의 FB20e 변경 사항을 화면으로 확인하려 했는데, macOS 접근성(Accessibility) 권한이 막혀 orca computer-use로 Electron 앱의 접근성 트리를 읽을 수 없었다. `chromium.connectOverCDP`로 Electron의 디버깅 포트에 직접 붙여 우회했다.

## 배경

Plugin Builder dev 앱(Electron, PID 44158, 포트 9161/9162/9163)은 정상 기동했다. 템플릿 선택, 한글 줄바꿈, 팝오버 위치 등 FB20e 결정 사항 3건을 화면으로 검증해야 했는데, orca computer-use가 접근성(AX) API를 읽으려다 1500ms 재시도 끝에 permission_denied로 막혔다. macOS 시스템 설정에서 orca computer-use의 접근성 권한을 껐다 켜야 하는 종류의 문제라 즉시 해결은 보류하고, 검증 자체를 다른 경로로 뚫어야 했다.

## 핵심 내용

**macOS 접근성 API와 Chrome DevTools Protocol(CDP)은 별개 경로다**: orca computer-use는 OS 접근성 트리를 읽어 화면 요소를 찾는데, 이 권한이 막혀도 Electron이 `--remote-debugging-port`로 열어 둔 CDP 엔드포인트는 영향받지 않는다. `/scratchpad/drive.mjs`를 만들어 `chromium.connectOverCDP("http://127.0.0.1:9339")`로 붙이면, OS 권한과 무관하게 Playwright가 페이지를 직접 조작할 수 있다.

**처음엔 타임아웃이 나서 "CDP 자체가 안 되나" 의심했다**: 연결은 성공했는데 `getByRole()`로 클릭을 시도하니 30초 타임아웃이 났다. CDP 연결 실패, 렌더러 프로세스가 CDP로 페이지를 제대로 노출하지 않음, dev 인스턴스 로딩 미완료 등 세 가지를 의심했다.

**원인은 연결이 아니라 selector 선택이었다**: `getByText()`로 바꿔서 같은 요소("이메일 로그인2")를 클릭하니 바로 동작했고, `evaluateAll()`로 화면의 버튼 텍스트 전체도 읽혔다. 즉 CDP 연결과 페이지 상태는 처음부터 정상이었고, `getByRole()`이 찾던 role/name 조합이 이 특정 Electron 렌더러의 DOM 구조와 맞지 않았을 뿐이었다. "연결이 안 된다"는 첫 가설을 selector를 바꿔보고서야 폐기할 수 있었다.

## 정리

OS 수준 권한(접근성 API)이 막혔을 때, 그 권한에 의존하지 않는 다른 프로토콜(CDP)로 같은 목적(화면 검증)을 달성할 수 있는지부터 찾아본다. 또한 자동화 스크립트가 타임아웃 났을 때 "연결 문제"로 바로 단정하지 않고, selector 전략(`getByRole` vs `getByText`)부터 바꿔 보는 편이 원인 분리가 빠르다.
