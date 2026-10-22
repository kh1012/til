---
type: "content"
domain: "frontend"
category: "build-infra"
topic: "패키징 스크립트가 셸 번들과 따로 도는 파일 포함 목록 — pack-app.mjs KEEP 리스트 누락으로 what's-new 콘텐츠가 빠진 사례"
updatedAt: "2026-10-21"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "electron"
  - "pack-app"
  - "keep-list"
  - "what's-new"
  - "e2e-test"
  - "worktree"

relatedCategories:
  - "testing"
---

# 패키징 스크립트가 셸 번들과 따로 도는 파일 포함 목록 — pack-app.mjs KEEP 리스트 누락으로 what's-new 콘텐츠가 빠진 사례

> 셸 번들러(pack-shell.mjs)가 markdown 파일을 glob으로 끌어모아도, 패키징 스크립트(pack-app.mjs)가 별도의 KEEP 목록으로 복사 대상을 정하면 그 목록에 새 디렉터리를 추가하지 않는 한 패키지 결과물에서는 빠진다.

## 배경

atelier 앱의 what's-new 탭이 버전을 올려도 패키지 빌드에서는 항상 빈 상태로 보이는
버그가 있었다. 개발 모드에서는 정상 동작해서 원인 파악이 늦어졌다.

## 핵심 내용

- `shell/src/lib/whats-new-notes.ts`는 glob으로 `whats-new/*.md`를 읽어 셸 코드 번들에
  올바르게 포함시킨다 — 이 단계는 문제 없음.
- 문제는 `pack-app.mjs`에 있다. 이 스크립트는 소스 디렉터리에서 `Resources/app`으로
  무엇을 복사할지 별도의 KEEP 목록(정규식 패턴 나열)으로 결정하는데, 이 목록에
  `whats-new/` 디렉터리 패턴이 없었다. 셸 번들에는 파일이 있어도 패키징 단계에서
  걸러져 최종 앱에는 아예 도달하지 못한 것.
- 반면 패치 번들을 만드는 `pack-patch.mjs`의 `patchEntriesOf()`는 "`node_modules`만
  제외하고 나머지는 전부 포함" 전략이라 같은 문제가 없었다 — 두 패키징 경로가 서로
  다른 포함 전략을 쓰고 있었던 것.
- 수정은 KEEP 목록에 `/^[/\\]whats-new($|[/\\])/` 패턴 추가(커밋 `ddfda6d0`). 왜
  필요한지와 실패 양상을 주석으로 남겼다.
- 수정 검증 중 한 번 더 걸림돌: `packaged-e2e.sh`는 별도 worktree(`.arena/release-flow-dist`)에서
  빌드하기 때문에, 작업 트리의 커밋 안 된 변경은 그 worktree에 반영되지 않는다. 첫
  리빌드는 이 때문에 실패했는데, 마침 새로 추가한 "버전 번호·섹션 존재" 검증 어서션이
  그 실패를 정확히 잡아냈다. 수정을 커밋한 뒤 재빌드하자 통과.

## 정리

- 번들링(무엇을 코드에 넣는가)과 패키징(무엇을 디스크 결과물에 복사하는가)이 서로
  다른 포함 규칙을 쓰는 구조에서는, 번들 쪽에 새 에셋 디렉터리를 추가해도 패키징
  쪽 목록을 함께 고치지 않으면 조용히 빠진다. 새 정적 콘텐츠 디렉터리를 추가할 때는
  패키징 스크립트의 KEEP/포함 목록을 같이 확인해야 한다.
- 격리 worktree에서 패키지 e2e를 돌리는 구조는 커밋 안 된 수정을 반영하지 않는다는
  점도 재확인 — 로컬에서 고쳤는데 패키지 e2e가 여전히 실패하면, 먼저 커밋했는지부터
  점검.
