---
type: "content"
domain: "devops"
category: "build-infra"
topic: "atelier 서버를 ATELIER_WORKBENCH 없이 맨몸으로 재기동하자, 코드가 조용히 유도한 기본 workbench가 화면이 보던 workbench와 달라져 같은 이름의 레지스트리 두 벌이 갈라진 채 저장이 계속된 사례"
updatedAt: "2026-09-08"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "silent-env-default"
  - "registry-split-brain"
  - "optimistic-update-masking"
  - "workbench-root-resolution"
  - "atelier-server-restart"

relatedCategories:
  - "testing"
---

# atelier 서버를 ATELIER_WORKBENCH 없이 맨몸으로 재기동하자, 코드가 조용히 유도한 기본 workbench가 화면이 보던 workbench와 달라져 같은 이름의 레지스트리 두 벌이 갈라진 채 저장이 계속된 사례

> "atelier 실행 후 컴포넌트 하나 열었는데 API 오류가 생긴 것 같다"는 보고로 시작해, 직전에 장애 복구용으로 `node scripts/atelier-server.mjs`를 환경변수 없이 맨몸으로 띄운 조치 자체가 원인임을 역추적했다. 서버와 화면이 서로 다른 레지스트리 디렉터리를 보고 있었고, 그 상태에서 태그를 지운 것이 엉뚱한 사본에서만 지워졌다.

## 배경

atelier 워크벤치는 온보딩에서 `decideWorkbench`로 워크벤치 위치를 사용자에게 직접 물어 정한다. 그런데 이번엔 화면이 아니라 서버 쪽 장애를 복구하려고 `scripts/atelier-server.mjs`를 터미널에서 직접 실행했다 — `ATELIER_WORKBENCH` 환경변수를 넘기지 않은 채로.

## 핵심 내용

두 곳이 각자 말없이 다른 값으로 정했다.

| | `ATELIER_WORKBENCH` | 실제 registryDir |
|---|---|---|
| 화면 vite(앱이 띄움) | `.../packages/atelier-workbench` | `atelier-workbench/registry` |
| 맨몸으로 띄운 서버 | 없음 | `ui/harness/registry` |

- `server/root.ts`의 `workbenchRootOf`는 환경변수가 없으면 코드 위치에서 워크벤치 루트를 유도한다 — 이번엔 `maxflow`로 떨어졌다.
- `maxflow`에는 `.atelier/config.json`이 없어서, `server/config.ts:151`의 기본값 `packages/ui/harness/registry`를 그대로 썼다.
- 두 레지스트리에는 **같은 이름의 엔트리 260개가 각각 존재**했다 — 겉보기엔 하나의 데이터로 보였다.

이 상태에서 태그 두 개(`feedback-composer`의 `required`, `settings-panel-398109`의 `기획 완료`)를 지웠는데, 지워진 곳은 화면이 실제로 읽는 `atelier-workbench` 쪽이 아니라 `ui/harness` 쪽이었다. 그런데도 화면 레일에서는 즉시 사라졌다 — `DetailRoute.header.meta.ts`의 `applyEntryMetaLocal`이 낙관적 갱신을 걸어 둔 탓이다. 서버가 정상 200을 냈으니 `refreshEntries`로 되돌리는 경로도 걸리지 않았다. 재시작하면 화면은 다시 자신이 보는 워크벤치 json을 읽으므로 지운 태그가 되살아나는 것처럼 보인다.

## 정리

기본값 유도 지점이 코드에 두 군데 있었다 — `workbenchRootOf`(환경변수 없으면 코드 위치로), `server/config.ts:151`(`.atelier/config.json` 없으면 `packages/ui/harness/registry`로). 둘 다 "못 정했다"는 상태를 "이걸로 정했다"로 조용히 바꾼다. 이 앱은 워크벤치를 사용자에게 직접 묻는 온보딩 화면을 이미 갖고 있는데, 서버는 그 질문 없이 혼자 정한 것이 사고 원인의 절반이다.

재발을 막는 방향은 두 갈래로 나왔다.

- 서버가 워크벤치를 못 정하면 기동을 거부하고 "워크벤치를 지정하세요"를 찍는다 — 갈리는 상황 자체를 막는다.
- 화면이 `/api/workbench` 응답과 자신이 보는 워크벤치를 비교해, 다르면 화면에 바로 띄운다 — 이미 갈린 상태를 사람이 곧바로 알아채게 한다.

두 번째가 이번 증상(둘이 갈렸다는 사실 자체를 아무도 몰랐던 것)을 직접 잡고, 첫 번째는 갈리는 경로를 원천 차단한다. 둘 다 필요하다는 결론으로 정리했다 — 하나는 사고를 막고, 하나는 막지 못했을 때 알아채게 한다.
