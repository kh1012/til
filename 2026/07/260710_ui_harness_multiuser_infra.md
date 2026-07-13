---
draft: true
type: "content"
domain: "frontend"
category: "ui-harness"
topic: "여러 사람이 ui-harness로 동시 작업할 때 git 충돌·데이터 손실을 구조적으로 0으로 만드는 인프라: 파일 격리·UID 파일명·preflight 자동검사 게이트·사용자 네임스페이스 마이그레이션 설계와 읽기 계층·전이 이력 정합"
updatedAt: "2026-07-10"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "multi-user"
  - "git-conflict"
  - "namespace"
  - "preflight-gate"
  - "gitattributes-union"
  - "composite-key"

relatedCategories:
  - "devops"
  - "design-system"
  - "git"
---

# ui-harness 멀티유저 인프라: 동시 작업 충돌을 구조로 0으로

> 여러 사람이 ui-harness 갤러리에 동시에 컴포넌트를 만들 때 나던 git 충돌·데이터 손실을, 규범을 외우는 대신 파일 격리·UID·preflight 자동검사·사용자 네임스페이스로 구조가 막게 바꾼 기록.

## 배경

ui-harness 갤러리가 혼자 쓰던 도구에서 여러 사람이 동시에 컴포넌트를 만드는 도구로 넘어가면서, 지금까지 문제없던 단일파일 편집·공유 삽입점·토큰명 파일명 같은 구조가 전부 git 충돌·데이터 손실의 원인이 됐다. 이날의 방향은 두 가지였다. 하나는 "가이드에 지침이 늘수록 안 지켜진다"는 지적을 받아들여, 사람이 규범을 외우는 대신 preflight·ui:valid가 자동으로 검출하게 옮기는 것. 다른 하나는 draft를 사용자 폴더로 격리하는 네임스페이스 마이그레이션을 설계하고 읽기 계층부터 단계적으로 전환하는 것이었다. 곁들여 카드 생성자(createdBy) 표기가 handle·배치명으로 새어 나오던 것도 실제 사람 이름으로 정규화했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- apply 전이 이벤트 소급 12건 + ui:valid 전이 정합 검사
  - history.jsonl이 modified 전용이고 apply에 전이(promote 등) 기록 절차가 원래 없어, 과거 promote 12건의 승격이 어느 타임라인에도 안 남던 반쪽 이력을, decisions.archived의 appliedAt 기준으로 소급 보정했다(orphan 3건은 entry 삭제라 제외).
  - ui:valid에 전이 정합 검사 축(WARN)을 신설했다. archived 결정 대비 promoted/deprecated/merged 이벤트 유무를 사후 검출해, apply 절차(§5.6)를 잊어도 다음 ui:valid에서 드러나게 기계로 강제했다(전이 제거→WARN 1건 검출·복원→0으로 검증).

- ui:preflight 정합 게이트 + CI 템플릿: 머지-온리 결함 차단
  - 각자 체크아웃에서만 도는 로컬 게이트(ui:valid·typecheck)로는 '병합된 main에만 존재하는 결함'(손상 원장 JSON·이중 배럴 export·index drift·색·전이 위반)을 구조적으로 못 잡던 걸, pnpm ui:preflight(JSON 유효성 → ui:index 재현 → ui:valid → @maxflow/ui typecheck → stories typecheck) 하나로 통합했다. CI(GitHub Actions 활성 + Bitbucket 템플릿)에서 PR·main push마다 돌게 했다.

- 멀티유저 전제 조정: history union·파생물 gitignore 유지, CI yaml 제거
  - 전제를 정정했다. 여러 사람이 쓰는 건 ui-harness(생성·수정)뿐이고 curate·apply·리뷰는 1인이라, CI·pre-push 자동화 없이 ui:preflight 스크립트만 수동 실행하는 쪽으로 낮췄다(앞서 넣은 CI yaml 제거, 스크립트는 유지). 대신 여러 사람 생성·수정에 유효한 방어(.gitattributes의 history.jsonl merge=union, curate 재생성 파생물 3종 gitignore + rm --cached)는 그대로 뒀다.

- 카드 썸네일 preview/entries/<name>.tsx 격리: 동시 생성 both-modified 제거
  - 하드룰이 net-new마다 공유 previews.tsx map에 항목 추가를 강제해, 여러 사람이 동시에 생성하면 같은 삽입점에서 both-modified 충돌하던 걸(엔트리·토큰은 격리했으면서 썸네일만 단일파일이었다), preview/entries/<name>.tsx per-name 파일로 격리했다. previews.tsx가 import.meta.glob("./entries/*.tsx")로 조립·병합하게 해, registry의 demos/staged glob과 같은 패턴으로 맞췄다.

- GUIDE §0 멀티유저 규범: 최신화·원격 이름대조·재사용·엔트리 컨플릭 보존
  - 여러 사람이 동시 생성·수정할 때의 규범을 정리했다. 작업 전 git fetch+rebase와 산출물 즉시 push, net-new name을 origin/main과 git cat-file로 대조(로컬 index는 gitignore라 미머지 이름을 못 봐 both-added가 남), 재사용 탐색을 origin/main entries까지 확장, entry both-modified 해소 시 clonedFrom·status·files.path·props를 양쪽 보존하는 규칙을 담았다.

- token-proposals 파일명 토큰명→UID + curate name 그룹핑: 동시 제안 add/add 제거
  - 토큰 제안 파일명이 토큰명이라, 여러 사람이 같은 디자인 갭에 같은 토큰명을 동시 제안하면 git add/add 충돌이 나던 걸, 파일명을 랜덤 UID(openssl rand -hex 4)로 바꾸고 토큰명은 name 필드로 옮겨 없앴다. 재제안도 덮어쓰지 않고 새 UID로 남겨 이력을 보존하고, curate 취합이 name으로 그룹핑해 최신 createdAt 하나만 재생성하게 했다.

- 멀티유저 §0 규범을 preflight 자동검사로 이전: 지침 최소화
  - '가이드에 지침이 늘수록 안 지켜진다'는 지적을 반영했다. ui:preflight에 병합 컨플릭 마커 검사(BLOCK)와 behind-origin·새 entry 이름 origin 충돌 경고(WARN)를 추가해, 사람이 규범을 외우는 대신 preflight가 자동 검출하게 했다. GUIDE §0을 규범 4개에서 "preflight 한 번이 검사 + 사람은 즉시 push·재사용 원격 대조 2개만"으로 축소했다(preview 격리는 import.meta.glob 런타임 병합이라 사람 개입 0).

- 갤러리 생성자에 배치명(maxflow-ui-integration) 노출 제거
  - createdBy가 비어 있을 때 creatorOf가 requestedBy로 폴백하면서 배치 작업명 "maxflow-ui-integration"이 카드 생성자 자리에 그대로 새어 나오던 걸, 배치 라벨(maxflow* 접두)을 사람 자리에 노출하지 않도록 필터를 넣었다(없으면 "부트스트랩" 표시). createdBy가 비어 있던 8개 엔트리는 git 최초 커밋 author로 검증한 실제 생성자로 채웠다.

- createdBy 표기를 실제 생성자로 통일 + 이메일 정규화
  - git 최초 커밋 author 이메일로 실제 생성자를 판정해(kh1012@·kjh0429@midasit.com은 동일인), 서로 다른 handle로 표기된 42건을 실제 이름으로 통일했다. resolve-created-by.mjs에 이메일→표시명 정규화 매핑을 추가해, git author로 createdBy 후보를 만들 때 매핑에 있으면 표시명, 없으면 %an을 쓰도록 해 같은 사람이 다른 handle로 커밋해도 일관되게 유지되도록 했다.

- 사용자 네임스페이스 마이그레이션 설계 + 10라운드 분석 반영
  - 여러 사람이 동시 작업할 때 draft를 <user>/ 폴더로 격리해 git 충돌을 구조적으로 0으로 만드는 설계를 세웠다(hex PK 대신 가독성 유지). 10라운드 적대적 분석으로 blocker(.gitattributes ** union 소실·복합키 same-name 탈취·exports 잠금·case-only APFS 붕괴·name-squat·slug 충돌)와 확정 결정 11개·8단계 로드맵을 반영했다. 리뷰 방식이 공용 갤러리 실시간이라 이 격리를 채택하고, branch-per-draft 대안은 기각했다.

- 사용자 네임스페이스 읽기 계층·원자 인프라 (Step 2+3)
  - draft 격리(entries/<owner>/<name>)를 위해 갤러리 읽기 계층·라우팅·API·스크립트를 한 커밋으로 namespace-capable하게 전환했다. 기존 flat 엔트리는 owner=undefined라 keyOf===name이 되어 회귀 0을 구조적으로 보장했다(flat 로더 glob 유지 + 중첩 glob 병합).
  - registry에 복합키 keyOf(<owner>/<name>)·resolveEntry·hrefOf·parseSlug를 도입하고, entries/history/staged/demos·previews를 복합키 맵으로 바꾸고 owner는 경로에서 캡처(SoT)했다. getEntry는 공용을 우선해 draft가 name을 탈취하는 걸 막았다. 라우팅(/c/@<owner>/<name>)·호출부를 복합키로 맞추고, /api/entry가 @<owner>/<name> 슬래시를 허용하게 했다. .gitattributes에 entries/**/*.history.jsonl merge=union을 걸어 중첩 원장 소실을 막았다.

## 정리

이날 인프라 작업의 핵심 깨달음은 "규범으로 막을 것과 구조로 막을 것을 구분하라"였다. 처음엔 GUIDE §0에 멀티유저 규범을 4개 늘려 적었는데, 곧바로 '지침이 늘수록 안 지켜진다'는 지적을 받고 방향을 틀었다. 병합 컨플릭 마커, behind-origin, 이름 충돌 같은 건 사람이 기억할 게 아니라 preflight가 자동 검출할 일이고, 썸네일·토큰 제안 같은 공유 삽입점 충돌은 애초에 파일을 per-name·UID로 격리해 물리적으로 못 부딪히게 하는 게 맞았다. 실제로 하루 안에 지침을 4개에서 2개로 줄이면서도 방어는 오히려 촘촘해졌다.

두 번째 축인 네임스페이스 마이그레이션에서 인상 깊었던 건, 큰 전환을 회귀 0으로 넘기는 방법이었다. 복합키 keyOf(<owner>/<name>)를 도입하되 기존 flat 엔트리는 owner=undefined라 keyOf===name이 되게 설계하니, 새 구조와 옛 구조가 같은 코드 경로에서 공존하고 flat 로더 glob과 중첩 glob이 병합돼 기존 100개 카드가 그대로 렌더됐다. 마이그레이션을 '한 번에 갈아엎기'가 아니라 '옛 데이터가 새 키의 특수 케이스가 되게' 설계한 셈이다. createdBy 정규화도 결이 같았다. 같은 사람이 여러 handle·이메일로 커밋해도 최초 커밋 author를 SoT로 삼고 이메일→표시명 매핑을 한 곳에 두니, 표기가 저절로 수렴했다.
