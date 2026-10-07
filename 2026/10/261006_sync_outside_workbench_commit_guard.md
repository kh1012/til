---
type: "content"
domain: "devops"
category: "build-infra"
topic: "워크벤치가 저장소 하위 폴더일 때, 동기화가 워크벤치 밖 파일을 고친 커밋까지 같이 올려버리는 문제를 막는 guard"
updatedAt: "2026-10-06"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "git-log-null-separated-format"
  - "rev-parse-show-prefix"
  - "core-quotepath"
  - "sync-driver-abstraction"
  - "test-driven-development"

relatedCategories:
  - "testing"
---

# 워크벤치가 저장소 하위 폴더일 때, 동기화가 워크벤치 밖 파일을 고친 커밋까지 같이 올려버리는 문제를 막는 guard

> atelier 워크벤치는 제품 저장소 안의 하위 폴더로 열릴 수 있다. 이 경우 StatusBar의 동기화는 저장소 전체를 올리는 동작이라, 워크벤치 밖 파일을 고친 커밋이 섞여 있어도 그대로 push된다. 이 문제를 fetch 이후 pull/push 이전 지점에서 막고, 사용자에게 목록을 보여준 뒤 확인을 받는 guard(AD21)를 worker → shell → route → UI 네 계층에 걸쳐 TDD로 구현했다.

## 배경

워크벤치가 저장소 뿌리(root)가 아니라 그 아래 한 칸(예: `maxflow/`)으로 열리는 구성이 있다. 이때 StatusBar의 "동기화" 버튼은 저장소 전체 기준으로 pull/push를 수행하므로, 사용자가 워크벤치 안에서만 작업했다고 믿어도 실제로 올라가는 커밋에는 워크벤치 밖 파일을 건드린 변경이 섞여 있을 수 있다. 이 상황을 사전에 감지해 사용자에게 확인받는 기능이 입양 계획 AD21 항목으로 명세됐다.

## 핵심 내용

**감지 시점은 fetch 뒤, pull/push 앞.** 이 지점에서 멈추면 작업트리도 원격도 아직 안 바뀐 상태라, 사용자가 취소를 고르면 정말 아무 일도 없던 것이 된다. 그보다 늦게 감지하면 이미 되돌리기 번거로운 상태가 섞여 들어간다.

**판정 로직은 `rev-parse --show-prefix` + `git log --name-only` 조합.**

```js
const prefix = await probe(["rev-parse", "--show-prefix"]); // 워크벤치가 뿌리면 ""
const log = await git(
  ["-c", "core.quotePath=false", "log", "--format=%x00%h%x09%s", "--name-only", "@{u}..HEAD"],
  { raw: true },
);
const outside = outsideCommits(log, prefix);
```

- `prefix`가 빈 문자열이면(워크벤치 = 저장소 뿌리) 밖이라는 개념 자체가 없으므로 guard를 아예 건너뛴다.
- `git log` 포맷에 `%x00`(NUL)을 커밋 구분자로 쓴 이유: 커밋 subject에 개행이나 tab이 섞여도 NUL은 안 나오니 안전하게 split할 수 있다.
- `core.quotePath=false`를 끄는 이유: 한글 경로가 기본값에서는 `"\352..."` 식으로 8진 escape에 따옴표가 씌워져 나오는데, 그러면 prefix 문자열 비교가 그대로 깨진다.
- 한 커밋이 안/밖 파일을 함께 고쳤으면 밖으로 집계한다(부분 허용 없음). 파일 목록이 없는 병합 커밋은 집계 대상에서 제외.

**계층별 전파.** worker(`git-sync.mjs`)가 순수 함수 `outsideCommits`/`outsideMessage`로 판정하면, 결과를 `{ ok: false, outside, message }`로 반환한다. 이를 받는 shell 계층(`git-actions`)은 일반 에러와 구분하기 위해 `SyncOutsideCommits`라는 전용 예외 타입을 던지고, route 계층은 `allowOutside` 옵션을 요청 바디부터 재시도까지 끝까지 들고 다니도록 `SyncOptions` 타입으로 통일했다. UI는 `SyncOutsideConfirm` 다이얼로그로 최대 5건까지 커밋 목록을 보여주고 "취소" 또는 "함께 올리기"(`allowOutside: true`로 재시도)를 받는다.

**테스트 가능성을 위해 route 핸들러를 분리.** 300줄짜리 route 핸들러에서 sync 로직을 `vite-harness-api-git.sync.ts`로 떼어내고, `start/running/tail` 세 메서드만 가진 `SyncDriver` 인터페이스를 뒀다. 테스트는 이 인터페이스를 가짜 구현으로 주입해 실제 워커 프로세스를 띄우지 않고도 `allowOutside` 옵션이 올바르게 전달되는지 검증한다.

**TDD로 RED → GREEN 확인.** worker 쪽은 임시 디렉터리에 실제 bare 저장소를 만들어 통합 테스트를 돌렸고(`git-sync.outside.test.mjs`), 구현 전 RED 상태를 먼저 확인한 뒤 구현해 GREEN으로 전환했다. 최종적으로 13개 테스트 파일·111개 테스트가 전부 통과했다.

## 정리

"워크벤치 밖 커밋이 섞여 올라간다"는 문제는 동기화가 저장소 전체 단위로 동작하는 한 항상 잠재한다. 이번 구현에서 눈여겨볼 점은 감지 로직 자체보다, 그 판정 결과를 worker → shell → route → UI 네 계층에 각각 맞는 형태(순수 함수 반환값 → 전용 예외 → 옵션 전파 → 확인 다이얼로그)로 변환해 넘긴 경계 설계와, 그 경계마다 주입 가능한 추상화(`SyncDriver`)를 둬서 프로세스를 띄우지 않고도 전체 흐름을 테스트했다는 점이다.
