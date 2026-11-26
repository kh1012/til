---
type: "content"
domain: "frontend"
category: "state-management"
topic: "edit lock 배지가 안 뜨는 e2e 실패를 세 번 고친 끝에 — 락 획득 후 sync state를 다시 안 읽어오는 게 진짜 원인이었다"
updatedAt: "2026-11-25"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "race-condition"
  - "e2e-flaky-test"
  - "sync-state"
  - "side-effects"
  - "root-cause-analysis"

relatedCategories:
  - "testing"
---

# edit lock 배지가 안 뜨는 e2e 실패를 세 번 고친 끝에 — 락 획득 후 sync state를 다시 안 읽어오는 게 진짜 원인이었다

> Plugin Builder 셀(shell)에서 문서를 편집하려고 열면 서버에 edit lock을 건 뒤 `.ed-left [data-slot="sync-lock"]` 배지가 떠야 한다. `sy1-edit-lock.spec.ts`가 이 배지를 못 찾고 실패했는데, 겉으로 보이는 원인(배너 텍스트 줄바꿈, API 응답 타이밍)을 두 번 고쳐도 계속 flaky했다. 세 번째 시도에서야 "락 획득은 서버에서 성공했는데 셀의 sync state를 다시 읽어오는 호출이 없다"는 진짜 원인을 찾았다.

## 배경

SY1-28 작업 중 `sy1-edit-lock.spec.ts`가 간헐적으로 실패했다. 테스트는 행을 클릭해 편집 lock을 건 뒤 상단 좌측에 lock 배지 텍스트가 뜨는지 확인한다. 실패는 매번 같은 assertion(`toContainText`)에서 났지만, 재현할 때마다 실패 지점이 조금씩 달랐다.

## 핵심 내용

**1차 시도 — 텍스트 포맷 문제로 오판**: lock 배너가 줄바꿈 포함 여러 줄로 렌더링되는데 테스트는 한 줄 전체와 비교하고 있었다. 배너 텍스트의 첫 줄만 잘라 비교하도록 고쳤다(`TEXT.syncLockBand().split("\n")[0]`). 이 수정으로 당시 재현된 실패는 사라졌지만, 근본 원인은 아니었다 — 우연히 그 실행에서는 텍스트 포맷 문제와 타이밍 문제가 겹쳐서 나타난 것뿐이었다.

**2차 시도 — API 응답 대기 추가로도 안 고쳐짐**: 재현을 반복하자 같은 assertion에서 다시 실패했다. 이번엔 "셀이 서버 sync state를 아직 읽기 전에 테스트가 배지를 확인한다"고 판단해, `GET /api/sync/{id}/check`와 `GET /api/sync` 응답을 명시적으로 기다리는 코드를 테스트에 추가했다. 그런데도 정확히 같은 지점(45초 `BAND_MS` 타임아웃)에서 두 번 연속 재현됐다. API 응답을 기다리는 것만으로는 배지가 뜨지 않는다는 뜻이었다 — 응답은 왔는데 그 응답이 화면에 반영되지 않는 것이었다.

**진짜 원인**: 문서를 열 때 순서가 "① 최초 sync state 읽기 → ② edit lock 획득"이다. `editLock(unit, on)`은 서버에 lock을 거는 데는 성공하지만, 그 성공이 셀의 sync state를 다시 읽어오는 동작을 스스로 일으키지 않았다. lock 정보는 서버에만 있고, 셀이 들고 있는 sync state 객체에는 끝까지 반영되지 않으니 배지를 그릴 근거 자체가 없었다. 30초 주기 자동 재조회도 걸리지 않았다 — 최초 읽기 시점엔 lock이 없었으니 재조회를 트리거할 변화가 없었기 때문이다. 테스트가 API 응답을 기다려도 그 응답 안에 lock 정보가 없으니 당연히 실패했다.

**고친 방법**: `sync-home.ts`에 `editLockThenRead(repos, sync, unit, on)` 헬퍼를 추가했다. `repos.editLock()` 호출이 lock 획득(`on === true && ok === true`)으로 성공했을 때만 `sync?.again()`을 호출해 sync state를 즉시 재조회하도록 했다. lock 해제나 획득 실패일 때는 재조회를 걸지 않고, `sync`가 없을 때(remote 비활성)도 안전하게 넘어가도록 가드했다. `home-app.tsx`의 `homeActions`에서 기존 인라인 구현을 이 헬퍼로 교체했다.

## 정리

flaky 테스트를 고칠 때 "테스트가 너무 빨리 확인한다"는 가설은 절반만 맞았다. API 응답을 기다리는 것과 "그 응답이 상태에 반영되는 것"은 서로 다른 일이다. 서버 쪽 side effect(lock 획득)가 성공했다고 해서 클라이언트 state가 자동으로 갱신되는 게 아니라면, 그 side effect를 트리거한 코드가 명시적으로 재조회를 걸어줘야 한다. 증상(텍스트 포맷 → 타이밍 → 재조회 누락)을 순서대로 좁혀가며 고친 두 번의 수정이 실제로는 근본 원인을 가리지 않고 오히려 우연한 통과를 만들었다는 점도 남긴다. 테스트가 한 번 통과했다고 "고쳤다"고 믿지 않고 반복 재현(flake round)으로 검증한 것이 세 번째 시도에서 진짜 원인을 찾게 했다.
