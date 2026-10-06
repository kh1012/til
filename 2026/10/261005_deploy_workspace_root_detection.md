---
type: "content"
domain: "devops"
category: "build-infra"
topic: "레포 분리 후 workspace root를 경로 세그먼트 하드코딩이 아닌 lock 파일 탐색으로 찾기"
updatedAt: "2026-10-05"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "workspace-root"
  - "pnpm-lock"
  - "repository-separation"
  - "deploy-script"
  - "monorepo"

relatedCategories:
  - "build-infra"
  - "ci"
---

# 레포 분리 후 workspace root를 경로 세그먼트 하드코딩이 아닌 lock 파일 탐색으로 찾기

> 모노레포에서 분리된 독립 레포로 앱을 옮기자, 경로 첫 세그먼트로 workspace root를 가정하던 배포 스크립트가 pnpm-lock.yaml을 못 찾아 설치 캐시 검증이 매번 실패했다.

## 배경

atelier 앱을 모노레포(`maxflow`)에서 독립 레포로 분리하는 작업(repository separation) 중,
V3 검증 단계에서 배포가 매번 의존성을 재설치하는 문제가 발견됐다. 원인은
`apps/atelier/scripts/deploy.tree.ts`의 `buildRelease()`가 workspace root 경로를
`join(wt, top)` 형태로 고정해 구했기 때문이다. 여기서 `top`은 경로의 첫 세그먼트
(모노레포에서는 `maxflow`)였는데, 분리된 독립 레포에서는 구조 자체가 달라
`pnpm-lock.yaml` 위치가 레포 루트로 바뀌었다.

## 핵심 내용

- 모노레포: `pnpm-lock.yaml`이 `maxflow` 디렉터리 아래에 있고, 첫 경로 세그먼트가 곧 그 디렉터리.
- 독립 레포: `pnpm-lock.yaml`이 레포 루트에 바로 있어 첫 세그먼트 가정이 깨짐.
- 결과: `buildRelease()`가 잘못된 경로를 가리키면서 lock 파일을 찾지 못하고, install stamp가
  항상 `"no-lock"`으로 기록됨. 이후 배포마다 lock 파일이 실제로 바뀌었어도 설치 단계를
  건너뛰는 캐시 무효화 로직이 제대로 동작하지 않음.
- 수정: `workspaceRootOf()` 함수를 추가해, 앱 디렉터리에서 위쪽으로 올라가며
  `pnpm-lock.yaml`을 직접 탐색하도록 바꿈. 탐색 범위는 worktree 경계를 넘지 않도록 제한.
- `buildRelease()`는 `join(wt, top)` 대신 `workspaceRootOf()` 호출 결과를 사용하도록 변경.
- 부수적으로 pack 스크립트 경로도 `relPkg`를 문자열 슬라이싱으로 자르던 방식에서
  `join(wt, opts.relPkg, "scripts/pack-dist.mjs")` 형태의 명시적 join으로 바꿔, 같은 종류의
  경로 구조 가정을 제거함.

## 정리

경로 구조에 대한 가정을 상수나 고정 세그먼트로 박아두면, 그 가정이 깨지는 리팩터링(레포 분리,
디렉터리 이동) 시점에 조용히 틀린 결과를 만든다. 이번 경우처럼 lock 파일을 못 찾아도 에러를
던지지 않고 `"no-lock"`으로 폴백해버리면 증상이 "배포가 느려졌다" 정도로만 드러나 원인 추적이
늦어진다. 구조를 가정하는 대신 찾아야 할 대상(여기선 lock 파일)을 기준으로 위로 탐색하는 방식이
레포 구조 변경에 더 안전하다.
