---
type: "content"
domain: "frontend"
category: "ui-ux"
topic: "component-create가 파일을 만들기 전에 로컬+origin/main 레지스트리를 먼저 뒤지는 이유"
updatedAt: "2026-08-19"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-system"
  - "component-registry"
  - "reuse"
  - "design-tokens"
  - "gate"

relatedCategories:
  - "build-infra"
---

# component-create가 파일을 만들기 전에 로컬+origin/main 레지스트리를 먼저 뒤지는 이유

> maxflow의 `/component-create`는 페이지 조각을 공유 컴포넌트로 승격시키기 전, 역할이 70% 이상 겹치는 기존 컴포넌트가 있는지부터 확인한다. 겹치면 파일을 단 하나도 건드리지 않고 멈춰서 사람에게 후보만 보고한다.

## 배경

이 디자인 시스템의 페이지는 갤러리 컴포넌트를 "flatten"(토큰 대신 값을 하드코딩)해서 조립된다. `component-create`는 이 반대 방향 — 페이지에 박제된 조각을 다시 토큰 기반·prop 기반 공유 컴포넌트로 되돌리는 작업이다. 같은 날 두 번 실행됐다: `library-lending-status` 페이지의 헤더 조각 → `page-heading-131554`, `weekly-review` 페이지의 접이식 "남은 작업" 섹션 → `collapsible-list-section-133908`. 둘 다 새 컴포넌트를 만들기 전에 "이미 있는 거 아니야?"부터 확인해야 했다.

## 핵심 내용

**검색 대상은 로컬 레지스트리만이 아니다.** `packages/ui/harness/registry/index.json`(로컬, gitignored·생성물)뿐 아니라 `git ls-tree -r --name-only origin/main -- packages/ui/harness/registry/entries/`로 origin/main의 엔트리도 함께 훑는다. 로컬 184개 vs origin 192개처럼 두 집합이 어긋난다 — 테스트/placeholder 전용 엔트리가 origin에만 있는 경우가 있기 때문. 로컬만 봤으면 존재하는 컴포넌트를 못 찾고 중복 생성했을 것.

**겹침 기준은 70%, 애매하면 사람에게 넘긴다.** `DESIGN.md`에 이미 명문화된 규칙: "새 화면을 만들 때는 갤러리에서 먼저 검색하고, 재사용할 게 있으면 재사용하고, 없을 때만 새로 만든다. 이 순서는 이미 강제되고 있다." 프롬프트의 강제 조항도 명확하다 — "겹치는 후보를 찾았으면 아직 아무 파일도 만들거나 고치지 마라. 후보 이름과 왜 겹치는지만 짧게 보고하고 멈춘다(사람이 이어서 결정한다)." 판정을 AI가 끝까지 내리지 않고 "생성 여부"라는 되돌리기 어려운 지점 앞에서 멈춘다.

**겹침 판단은 표면적 유사가 아니라 role 기준.** 두 세션 모두 후보를 찾았지만 실제로는 기각했다 — 이유가 구체적이다.
- `page-heading-131554` 승격 시: 가장 가까운 후보 `home-getting-started-greeting`은 `userName`/`dateLabel`이 둘 다 `required`이고 인사 문장 자체가 하드코딩돼 있어 임의 제목을 담도록 하위호환 확장이 불가능 (겹침 ~40%로 판단, 기각).
- `collapsible-list-section-133908` 승격 시: `atomic-collapsible`(리스트/제목/상태 텍스트 없는 순수 open/close), `atomic-accordion`/`accordion`(여러 섹션 그룹형이라 shape 자체가 다름), `home-getting-started-recommended-tasks`(접힘 동작이 없는 행 리스트) 세 후보를 각각 role 기준으로 기각.

**생성이 확정된 뒤의 나머지 규율도 같은 방향(원장에 구조 남기기).** staging 컴포넌트 + 카드 썸네일 + 레지스트리 엔트리 JSON + `meta.bornFrom: "pages/<slug>"`(페이지 쪽 `flattenedFrom`의 역참조)를 세트로 만든다. `data-nid`/`data-text-nid`는 반드시 제거. actor/`meta.createdBy`는 `git config user.name`이 아니라 실제 사람 식별자를 그대로 박아 넣는다 — git 설정이 실제 작성자를 반영하지 않을 수 있어서다. 생성 이력은 코드 커밋과 분리된 `<name>.history.jsonl` append 커밋으로 남긴다.

## 정리

컴포넌트 승격/생성 자동화에서 제일 위험한 지점은 "만들기"가 아니라 "이미 있는데 또 만들기"다. 이 문제를 막는 장치는 두 가지였다 — ① 검색 범위를 로컬 산출물이 아니라 origin(진짜 소스)까지 넓히는 것, ② 겹침 판정에서 애매한 결과가 나오면 AI가 계속 진행하지 않고 파일 생성 직전에 멈춰 사람에게 후보와 근거만 보고하는 것. 되돌리기 쉬운 "검색·보고"까지는 자동으로 진행하고, 되돌리기 어려운 "생성"부터는 사람이 승인하게 만드는 경계 설정이 핵심이었다.
