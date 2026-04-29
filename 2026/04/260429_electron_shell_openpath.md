---
draft: true
type: "content"
domain: "frontend"
category: "electron"
topic: "Electron에서 macOS 외부 GUI 앱 실행 — child_process.spawn 대신 shell.openPath"
updatedAt: "2026-04-29"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "electron"
  - "macos"
  - "child_process"
  - "shell.openPath"
  - "LaunchServices"
  - "ipc"

relatedCategories:
  - "macos"
  - "ipc"
  - "desktop-app"
---

# Electron에서 macOS 외부 GUI 앱 실행 — child_process.spawn 대신 shell.openPath

> Electron main process에서 `child_process.spawn`으로 macOS GUI 앱을 띄우면 spawn은 성공(`ok:true`, pid 정상)하는데 정작 앱 윈도우가 안 뜬다. 자식이 LaunchServices의 GUI launch session에 attach되지 않기 때문이다. 정답은 Electron 내장 `shell.openPath`.

## 배경

설정 → 커넥터 → Midas Gen DetailView에 "실행 경로" 등록 + PlusMenu '실행' 카테고리에서 클릭 → OS별로 외부 앱을 실행하는 기능을 만들었다. macOS에서 테스트용으로 `/Applications/Calculator.app`을 입력했는데 클릭해도 Calculator 창이 안 떴다.

콘솔 로그를 보면 분명 IPC는 정상 응답이었다.

```text
[ExecuteRow] click {connectorId: 'midasGen', state: 'idle'}
[useExecuteWithFeedback] execute called {path: '/Applications/Calculator.app'}
[useExecuteWithFeedback] invoking IPC launchExecutable
[useExecuteWithFeedback] IPC response {ok: true, pid: 83522}
```

`spawn("open", ["-a", path], { detached: true })`로 호출했고 pid도 받았는데 화면에는 아무 변화도 없었다. 같은 명령을 터미널에서 직접 실행하면 정상적으로 Calculator가 뜬다.

## 핵심 내용

### 단계 1 — `not-found` 회귀 (Sonoma+ 시스템 앱 위치 변경)

macOS Sonoma 이상부터 시스템 앱들이 `/System/Applications/`로 이동했다. `/Applications/Calculator.app`을 입력했을 때 `fs.existsSync` 가드가 false를 반환해 `not-found`로 끝났다.

LaunchServices는 alias를 자동으로 해소해주므로 macOS의 `.app` 번들에 한해서는 `fs.existsSync` 체크를 스킵하는 게 맞다.

```ts
const isMacApp = process.platform === "darwin"
  && (exe.endsWith(".app") || exe.includes(".app/"));

/* macOS .app 번들은 LaunchServices가 alias를 해소하므로 fs.existsSync 가드를 스킵 */
if (!isMacApp && !fs.existsSync(exe)) {
  return { ok: false, reason: "not-found", message: exe };
}
```

이걸로 IPC는 `ok:true, pid: 80006`을 반환했지만 — Calculator 윈도우는 여전히 안 떴다.

### 단계 2 — IPC ok:true인데 GUI는 안 보이는 정체

`ps aux | grep Calculator`로 봐도 프로세스가 떠 있지 않거나, 떠 있어도 윈도우가 없는 상태였다. `open -na`(new instance 강제)로 바꿔도 마찬가지.

원인: **Electron이 spawn한 자식 프로세스는 macOS LaunchServices의 GUI launch session에 attach되지 않는다.** Electron 자체는 GUI app으로 launched되어 있지만, 그 자식이 launch context를 상속하지 않아 LaunchServices가 "이 프로세스가 frontmost로 와야 하는 GUI 앱"이라고 인식해주지 않는다.

다음과 같은 흐름이다.

- 터미널에서 직접 `open -na /Applications/Calculator.app` → Terminal.app의 GUI launch context 상속 → 정상 동작
- Electron main process에서 `spawn("open", ["-na", path])` → Electron의 launch context는 자식에게 자동 전파되지 않음 → spawn은 성공하지만 GUI session이 없어 윈도우 미생성

### 단계 3 — `shell.openPath`가 정답

Electron은 이런 케이스를 위해 `shell.openPath()`를 제공한다. 이건 내부적으로 LaunchServices를 직접 호출하므로 **Finder에서 더블클릭한 것과 동일하게** 동작한다.

```ts
import { shell } from "electron";

case "darwin": {
  if (isMacApp) {
    const appBundle = exe.match(/.*\.app/)?.[0] ?? exe;
    /* child_process.spawn은 Electron의 launch context에 attach되지 않아
       자식이 background process로 떠 있고 GUI 윈도우가 안 뜨는 케이스가 발생한다.
       shell.openPath는 LaunchServices를 직접 호출하므로 Finder 더블클릭과 동일하게
       frontmost activate가 보장된다. 빈 문자열 반환 = 성공, 그 외 = 에러 메시지. */
    const errMsg = await shell.openPath(appBundle);
    if (errMsg) {
      return { ok: false, reason: "spawn-failed", message: errMsg };
    }
    return { ok: true, pid: -1 };
  }
  /* 일반 실행 파일은 spawn 직접 */
  const child = spawn(exe, [], { detached: true, stdio: "ignore" });
  child.unref();
  return { ok: true, pid: child.pid ?? -1 };
}
```

`shell.openPath`의 반환은 `Promise<string>`이고, **빈 문자열이면 성공, 그 외는 에러 메시지**다. pid는 외부 프로세스라 받을 수 없으므로 `-1`로 반환했다.

전환 후 Calculator가 즉시 frontmost로 떴다.

### OS별 분기 정리

이번 케이스에서 정착시킨 OS별 외부 앱 실행 매트릭스.

| OS | 케이스 | 호출 방식 | 비고 |
|---|---|---|---|
| macOS | `.app` 번들 | `await shell.openPath(appBundle)` | LaunchServices가 alias 자동 해소, frontmost 보장 |
| macOS | 일반 실행 파일 | `spawn(exe, [], { detached, stdio:"ignore" })` | `fs.existsSync` 가드 적용 |
| Windows | `.exe` 등 | `spawn(exe, [], { detached, stdio:"ignore", shell: false })` | `shell:false`로 공백 path 안전 처리 |
| Linux | 일반 실행 파일 | `spawn(exe, ...)` + `error` 시 `shell.openPath(exe)` 폴백 | xdg-open 자동 폴백 |
| 기타 | unsupported | `{ ok: false, reason: "unsupported" }` | discriminated union으로 UI 분기 |

### 디버깅이 길어진 이유

콘솔 로그가 `ok: true`라서 "IPC는 잘 도달했고 spawn도 됐다"는 잘못된 안심을 줬다. 실제로는 `pid`만 받았을 뿐 GUI session attach 여부는 아무것도 보장하지 않았다. spawn이 성공했다는 건 자식 프로세스가 떴다는 의미고, 그 프로세스가 사용자에게 보이는 윈도우를 띄우는 건 별개다.

`-na` flag도, `open -a path`로 바꾸는 것도, fs.existsSync 가드 스킵도 — 모두 spawn 단의 인자 문제로 접근한 시도였고 정작 핵심은 "spawn으로는 GUI launch context를 못 얻는다"는 단의 다른 차원 이슈였다.

## 정리

- Electron main process에서 외부 GUI 앱(특히 macOS `.app`)을 띄울 때는 **`shell.openPath` 우선**, `child_process.spawn`은 CLI/headless 실행에만 쓴다.
- IPC가 `ok:true`라고 해서 사용자에게 보이는 결과까지 보장되지는 않는다. 디버깅할 때 "성공한 것처럼 보이는데 결과는 다른" 케이스는 한 단 더 깊은 차원(이번에는 LaunchServices launch session)에 원인이 있을 수 있다.
- macOS 시스템 앱은 Sonoma+에서 위치가 바뀌었지만 LaunchServices가 alias를 해소하므로 `fs.existsSync`로 걸러내면 안 된다.
- OS 분기는 case별로 호출 방식 자체가 다를 수 있다 (macOS .app은 shell, 일반 실행 파일은 spawn). 단일 spawn으로 통합하려고 하지 말 것.
