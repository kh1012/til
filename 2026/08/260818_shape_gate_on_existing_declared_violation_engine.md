---
type: "content"
domain: "frontend"
category: "ui-ux"
topic: "새 린트 규칙 대신 기존 'declared 위반→BLOCK' 원장 엔진에 shape 게이트 얹기"
updatedAt: "2026-08-18"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-tokens"
  - "design-system"
  - "lint"
  - "corner-radius"
  - "gate"
  - "false-positive"

relatedCategories:
  - "build-infra"
  - "css"
---

# 새 린트 규칙 대신 기존 'declared 위반→BLOCK' 원장 엔진에 shape 게이트 얹기

> `rounded-full`이 알약(pill)으로 오용되는 것과 radius 스케일 이탈을 막을 때, 새 ESLint 규칙을 짜지 않고 이미 있던 디자인 시스템 원장(`rules.json` + `decisions.jsonl`)과 그 BLOCK 엔진에 항목만 선언해서 얹었다.

## 배경

maxys_proto의 `ui:valid`에는 색 토큰 등에 이미 "선언된 값과 다르면 BLOCK" 하는 원장 기반 게이트가 있었다. 여기에 shape(모서리 radius) 규칙을 추가하려는데, radius 위반은 색 위반과 성격이 다르다 — 전수 검사하면 기존 코드에서 `rounded-md` 209곳, 알약 의심 139곳이 쏟아진다. 이걸 그대로 BLOCK 처리하면 게이트가 무의미해진다.

## 핵심 내용

**새 린트 규칙을 만들지 않은 이유**: `/component-create`가 이미 `ui:valid`의 원장 엔진을 게이트로 물고 있었다. 별도 ESLint 규칙을 짜면 이 게이트와 실행 경로가 분리되고 예외 처리 방식도 따로 생긴다. 대신 `rules.json`의 `shape.*`를 좁히고 `decisions.jsonl`에 4개 규칙(`radius-scale`을 `none·sm·lg·full`로 축소, 신규 `radius-pill`, `radius-card=lg`, `radius-overlay=lg`)을 선언만 하는 방식을 택했다 — 엔진 코드는 그대로 두고 데이터만 추가한 것.

**엔진에 새로 넣은 판정 종류 셋**:
- `enforceScope: "named"` — `--name`을 지정한 실행(즉 component-create 게이트)에서만 BLOCK, 전수 실행에서는 WARN. 나중에 정한 규칙을 옛 코드에 소급 적용하면 BLOCK이 수백 건 터져 게이트가 죽는다는 게 [[260815_mixed_corners_shape_drift_false_positive]]와 같은 교훈 — 규칙과 검사 범위를 분리해야 한다.
- `requires` — "앵커가 있는 줄이 함께 있어야 할 다른 표기를 갖췄는가"를 판정. 알약 판정(`rounded-full`인데 `size-*`나 `aspect-square`가 없다 = 의도치 않은 타원)의 첫 소비자.
- `cooccur`의 `except` — 카드 배경 위에 얹힌 `size-10` 원형 아바타는 "카드 표면"이 아니므로 규칙에서 빼야 한다. 이 예외가 없으면 실제 컴포넌트의 원형 썸네일이 바로 오탐으로 걸렸다(직접 걸려서 넣었다).

**예외는 주석이 아니라 데이터로**: `meta.shapeExceptions: [{value, reason}]` 형태로 엔트리에 선언한다. 색 규칙의 `tokenExceptions`와 동일한 규율 — 진행 막대 트랙처럼 정말 알약이어야 하는 자리를 코드 주석이 아니라 원장에 구조화해서 남긴다.

**검증**: `reference-picker`에 `rounded-2xl`과 알약을 일부러 심고 `--name` 실행 → 둘 다 BLOCK 되는 걸 확인하고 되돌렸다. 전수 실행은 BLOCK 0(경고 613)으로 기존 코드를 깨지 않았고, ui-harness 테스트 772건 통과.

## 정리

디자인 시스템에 새 규칙을 추가할 때 "새 검사 로직을 짤까"보다 먼저 "이미 있는 게이트 엔진에 선언만 추가할 수 있나"를 물어야 한다. 특히 이미 실행 경로(component-create 게이트)에 물려 있는 엔진이 있다면, 로직을 복제하는 대신 그 엔진이 표현 못 하는 판정 종류(`requires`, `cooccur/except`)만 최소로 확장하는 편이 유지보수 지점을 하나로 유지한다. 그리고 새 규칙을 기존 코드베이스에 소급 적용할 땐 `enforceScope` 같은 범위 분리가 필수다 — 그렇지 않으면 규칙이 옳아도 게이트가 노이즈로 죽는다.
