---
type: "content"
domain: "devops"
category: "build-infra"
topic: "atelier 업데이트 알림의 freshness 판정이 apps/atelier로 pathspec을 좁혀 무관한 커밋 소음을 막지만, 그 결과 공유 패키지 변경은 behind로 못 잡는 빈틈이 있음"
updatedAt: "2026-09-07"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "git-rev-list-pathspec"
  - "freshness-check-scoping"
  - "monorepo-noise-vs-coverage"
  - "shared-package-blind-spot"
  - "cwd-relative-pathspec"

relatedCategories:
  - "testing"
---

# atelier 업데이트 알림의 freshness 판정이 apps/atelier로 pathspec을 좁혀 무관한 커밋 소음을 막지만, 그 결과 공유 패키지 변경은 behind로 못 잡는 빈틈이 있음

> "pnpm app으로만 켜 두고 다른 사람이 atelier 아닌 작업을 올려도 업데이트가 있다고 뜨느냐"는 질문에 답하며 freshness 판정 코드를 확인했다. pathspec을 apps/atelier로 좁혀 무관한 커밋은 이미 걸러지고 있었지만, 그 좁힘 때문에 atelier가 의존하는 공유 패키지(packages/ui, packages/atelier-workbench)의 변경은 behind로 안 잡히는 빈틈이 드러났다.

## 배경

atelier 앱은 굽힌 배포판이 소스보다 뒤처졌는지를 `judgeFreshness`로 판정해 "업데이트가 있습니다"를 띄운다. 사용자는 자신이 기능 구현 없이 `pnpm app`으로만 계속 켜 둔 상태에서, 다른 사람이 atelier와 무관한 작업(`maxys/`, `converter/`, `apps/desktop` 등)을 올려 HEAD가 움직이면 그것도 업데이트로 잘못 뜨는 게 아니냐고 물었다.

## 핵심 내용

**이미 막혀 있었다.** `judgeFreshness`는 커밋 수를 셀 때 `git rev-list --count <스탬프commit>..HEAD -- .` 를 `cwd=apps/atelier`, pathspec=`"."`로 돌린다. 이 pathspec은 cwd 기준이라 실제로는 `apps/atelier/` 아래를 건드린 커밋만 센다. 딴 앱을 고쳐 HEAD가 움직여도 그 커밋이 `apps/atelier/` 경로를 안 건드렸으면 behind 수는 0으로 유지된다.

이 좁힘은 우연이 아니라 `freshness.ts`의 코드 주석에 이유가 이미 적혀 있었다 — "이 레포는 제품 전체가 함께 사는 자리라, 좁히지 않으면 남의 커밋 하나에도 「낡았다」가 뜬다 — 그러면 그 말이 곧 소음이 되고 아무도 안 읽는다."

**하지만 이 좁힘 자체가 빈틈을 만든다.** atelier가 의존하는 **공유 패키지**(`packages/ui`, `packages/atelier-workbench`)를 딴 세션이 고친 경우, 그 커밋은 `apps/atelier/` 경로 밖이라 여전히 behind로 안 잡힌다. 실제로는 atelier가 그 패키지를 물고 있으니 굽힌 판이 알게 모르게 뒤처질 수 있는데, 지금 코드는 atelier 자신의 경로만 보고 이 경우까지는 확인하지 않는다.

논의 중 사용자는 워크벤치(`packages/atelier-workbench`)는 애초에 업데이트 대상이 아니라는 점도 짚었다 — 업데이트는 atelier 자체를 타겟으로 하니, 안내 문구도 그에 맞춰 손볼 여지가 있다.

## 정리

pathspec을 cwd 기준으로 좁혀 무관한 커밋을 걸러내는 설계는 모노레포에서 알림 소음을 막는 데 유효하고, 그 근거가 코드 주석에 남아 있어 판단을 되짚기 쉬웠다. 다만 이런 좁힘은 항상 대칭적인 대가를 문다 — 무관한 잡음을 걸러내는 범위가, 실제로 의존하는 공유 코드의 변경까지 함께 걸러낼 수 있다. 이 프로젝트에서 "atelier가 최신인가"를 정확히 답하려면 `apps/atelier/` 뿐 아니라 그것이 의존하는 공유 패키지 경로도 pathspec에 포함해야 하며, 지금은 그 부분이 알려진 채로 미확인 상태로 남아 있다.
