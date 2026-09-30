---
type: "content"
domain: "frontend"
category: "testing"
topic: "atelier 문서 카드가 status: partial 로 의도적으로 미완성 상태였는데, docs-cards.spec.ts 는 카드의 status 필드를 확인하지 않고 세 섹션(어떻게 쓰나/걷어낸 대안/아직 안 된 것) 완비만 무조건 검사해 실패한 사례"
updatedAt: "2026-09-29"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "docs-card-schema"
  - "test-assumption-gap"
  - "e2e-docs-check"
  - "atelier-docs-index"
  - "partial-status-metadata"

relatedCategories:
  - "build-infra"
---

# atelier 문서 카드가 status: partial 로 의도적으로 미완성 상태였는데, docs-cards.spec.ts 는 카드의 status 필드를 확인하지 않고 세 섹션(어떻게 쓰나/걷어낸 대안/아직 안 된 것) 완비만 무조건 검사해 실패한 사례

> S99 순차 실행 검증으로 E2E 전체 스위트(889개)를 돌렸더니 884 통과, 3 실패 중 하나가 `read/docs-cards.spec.ts:51`. 원인을 추적하니 하루 전(9/28) 새로 만든 `ax-concept-and-designer-workflow` 카드가 `status: partial` 로 표시된, 의도적으로 미완성인 카드였다.

## 배경

`docs/cards/ax-concept-and-designer-workflow.md` 는 2026-09-28 커밋 `c510256936` 으로 새로 추가된 문서 카드다. 메타데이터에 `status: partial` 을 명시하고, "아직 안 된 것" 섹션에 빠진 내용(페이지/플로우 생성 예시, `apps/web` 의 `st-*` 사용 확인)을 이미 적어뒀다. 다른 28개 카드는 모두 "어떻게 쓰나 / 걷어낸 대안 / 아직 안 된 것" 세 섹션을 갖추고 있는데, 이 카드만 "걷어낸 대안" 섹션이 없어 38줄짜리 2섹션 구조였다.

## 핵심 내용

`docs-cards.spec.ts:62` 는 모든 카드가 세 섹션을 갖췄는지만 검사하고, 카드의 `status` 필드는 읽지 않는다. 즉 이 카드가 `partial` 이라 아직 완성되지 않았다는 사실과, 테스트가 완성도를 판정하는 기준 사이에 간극이 있었다 — 테스트는 "완성된 카드"와 "의도적으로 미완성인 카드"를 구분하지 못한다.

여기서 선택지는 두 가지였다: (1) 테스트를 고쳐 `status: partial` 카드는 섹션 완비 검사에서 제외하거나, (2) 카드를 완성시켜 테스트를 통과시키는 것. 소스 문서(`2026-09-28-ax-concept-and-designer-workflow.md`, 251줄)에는 이미 결정 근거가 4.1·4.2절에 흩어져 있었다 — 점진적 토큰 마이그레이션(전면 교체 대신 진행 중인 프로젝트라 단계적 적용을 택함), `st-*` 토큰을 이름이 아닌 색상 유사도로 매칭. 이 두 근거를 "걷어낸 대안" 섹션으로 추출해 카드에 추가하는 (2)번을 택했다. 이후 `docs:index` 를 재생성해 카드 해시를 갱신하고, 색인에서 누락됐던 계획 문서 2건(`design-system-core`, `master-plan-2`)도 함께 인덱싱했다.

## 정리

테스트 스키마 자체의 맹점(카드 `status` 필드를 무시하는 것)은 그대로 남았다 — 고친 건 카드 내용이지 테스트 로직이 아니다. 다음에 `status: partial` 카드를 새로 만들 때 이 스펙이 또 실패하면, 매번 카드 쪽을 서둘러 완성시키기보다 테스트가 `status` 를 확인하도록 고칠지 먼저 판단할 것. 지금은 "카드를 완성해 테스트를 통과시키는" 쪽이 더 빠른 해결이라 그쪽을 택했을 뿐, 근본적으로 맞는 방향인지는 다시 볼 필요가 있다.
