---
type: "content"
domain: "backend"
category: "build-infra"
topic: "빌드 버전 미지정 합성값(0.0.N)을 게시물에 얼려 저장하지 않고 표시 시점에 다시 계산하도록 분리"
updatedAt: "2026-11-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "version-fallback"
  - "synthetic-value"
  - "display-time-resolution"
  - "e2e-fixture-mismatch"
  - "build-versioning"

relatedCategories:
  - "testing"
  - "typescript"
---

# 빌드 버전 미지정 합성값(0.0.N)을 게시물에 얼려 저장하지 않고 표시 시점에 다시 계산하도록 분리

> Plugin Builder의 `buildVersionOf()`는 manifest에 버전이 없으면 `0.0.{number}`를 합성해 보여준다. 이 합성값이 실제 버전과 구분 없이 커뮤니티 게시물에 그대로 저장되면서, 나중에 그 빌드가 실제로 게시돼도 게시물에는 옛 `0.0.N`이 그대로 남는 문제가 있었다.

## 배경

GUS2 S11에서 빌드 버전 표시 설계를 도입했다. manifest에 `version` 필드가 있으면 그 값을 쓰고(신규 빌드, `1.0.0`부터 시작), 없으면 `0.0.{number}`(old build)로 표시한다. `shared/build-version.ts`의 `buildVersionOf()`는 manifest.version → marketplace 기록 버전 → `0.0.{number}` 합성값 순으로 값을 찾는다.

이 설계가 들어오면서 e2e 테스트가 먼저 깨졌다. `seedLab` 픽스처는 여전히 version 필드 없는 old build를 만드는데, e2e 헬퍼 `buildCard()`는 신규 빌드 형식인 `v1.0.0`을 찾고 있었다. 실제 화면엔 `v0.0.1`이 뜨니 요소를 못 찾아 테스트가 실패했다.

## 핵심 내용

**테스트 실패는 증상, 진짜 문제는 fallback이 "버전"과 같은 타입으로 섞여 쓰인 것** — `buildCard()` 쪽은 `oldBuildVersion(number)`로 locator를 고쳐서 해결했다. 하지만 이건 테스트 헬퍼가 fixture 현실에 맞춘 것일 뿐, `buildVersionOf()`가 반환하는 세 가지 경로(실제 버전 / marketplace 버전 / 합성값)를 호출하는 쪽에서 구분 없이 쓰는 구조는 그대로였다.

**합성값이 커뮤니티 게시물에 저장되면 되돌릴 수 없다** — 게시 당시 버전이 없는 빌드는 `0.0.N`으로 계산돼 게시물에 박힌다. 그 빌드가 나중에 marketplace에 실제로 게시돼 진짜 버전이 생기더라도, 이미 저장된 게시물은 그 시점에 고정된 `0.0.N`을 계속 보여준다. 저장 시점 값과 조회 시점 값이 갈라지는 지점이다.

**해결은 "명시적 버전"과 "합성 fallback"을 타입으로 구분** — `hasBuildVersion()`을 추가해 manifest.version이나 marketplace 기록처럼 실제로 존재하는 버전일 때만 true를 반환하게 했다. `refWith()`, `buildVersionsAt().of()` 등 버전을 참조하는 자리마다 `isVersion()` 대신 `hasBuildVersion()`으로 바꿔, 커뮤니티 게시물엔 명시적 버전만 저장하고 없으면 `undefined`로 남긴다. `undefined`인 게시물은 화면에 그릴 때마다 `buildVersionOf()`를 다시 호출해 현재 marketplace 상태를 반영한다.

## 정리

기본값을 보여주려고 즉석에서 계산한 값과, 실제로 존재하는 데이터를 같은 함수의 반환값·같은 타입으로 섞으면 안 된다. 그 기본값이 어딘가(이번엔 게시물)에 저장되는 순간, 나중에 진짜 데이터가 생겨도 저장된 기본값을 밀어낼 길이 없다. "값이 없을 때 뭘 보여줄까"와 "그 값을 지금 저장해도 되는가"는 서로 다른 질문이고, `hasBuildVersion()`처럼 구분하는 함수 하나를 두면 저장하는 자리와 표시하는 자리가 각자 맞는 선택을 할 수 있다.
