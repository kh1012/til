---
type: "content"
domain: "frontend"
category: "testing"
topic: "E2E entry-mutations 스펙이 병렬 워커에서 반복 타임아웃으로 실패하고 --workers=1 단독 실행에서는 통과하는 패턴이, 9/19·9/23에 이어 9/26 S46d 검증에서도 동일하게 재현된 사례"
updatedAt: "2026-09-26"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "e2e-flaky-test"
  - "parallel-worker-race-condition"
  - "playwright-timeout"
  - "entry-mutations"
  - "test-isolation"

relatedCategories:
  - "build-infra"
---

# E2E entry-mutations 스펙이 병렬 워커에서 반복 타임아웃으로 실패하고 --workers=1 단독 실행에서는 통과하는 패턴이, 9/19·9/23에 이어 9/26 S46d 검증에서도 동일하게 재현된 사례

> S46d(pane isolation) 구현을 검증하려고 전체 E2E 스위트를 돌렸더니 703개 중 `entry-mutations.spec.ts` 1건만 실패했다. 같은 스펙을 `--workers=1`로 단독 재실행하면 7개 전부 통과한다. 과거 기록을 찾아보니 9/19·9/23에도 같은 스펙이 같은 원인으로 실패했었다.

## 배경

S46d 단계에서 C1-C5(구역 간 상태 간섭 수정: pane-aware 주소 읽기, 늦은 네비게이션·메모리 격리, pane별 스크롤 보존)를 전부 커밋한 뒤 최종 검증으로 전체 E2E 스위트(703개)를 돌렸다. 결과는 699 통과, 1 실패(`entry-mutations`), 나머지는 skip. 구현이 실제로 틀렸는지, 테스트 자체의 문제인지부터 가려야 했다.

## 핵심 내용

`entry-mutations.spec.ts`를 `--workers=1`로 단독 재실행하자 7개 테스트가 2.1분 만에 전부 통과했다(exit code 0). 여러 워커가 동시에 도는 조건에서만 실패하고, 단독 실행에서는 통과한다 — 구현 로직 문제가 아니라 병렬 실행 시 리소스 경합으로 인한 레이스 컨디션이라는 뜻이다.

실패 지점은 카드·페이지 DOM 요소가 15초 타임아웃 안에 보이지 않는 것("카드·페이지 로드 대기 시간 초과"). `apps/atelier/docs/2026-09-23-master-plan.md` 기록을 보면 같은 원인으로 같은 스펙이 과거에도 실패했다:

- 2026-09-19: `entry-mutations`에서 "이미 실행 중입니다" 블로킹 발생 → fullness 판정 순서를 바꾸고 pair judgment를 추가해 수정(커밋 `92c4039a9b`, `69ad8124f4`)
- 2026-09-23: 588개 스위트 중 3개 실패, `entry-mutations` 포함 — 단독 재실행으로 통과 확인, "다시 재서 통과했다"고 기록
- 2026-09-26(오늘): 703개 스위트 중 1개 실패, 동일 스펙·동일 원인 재현

pane isolation 관련 핵심 스펙(`pane-isolation.address`, `pane-header-right`, `pages-rail-memory`, `library-scroll-restore` 등 6개 파일)은 `--workers=2`로 돌려도 31/31 전부 통과했다. 실패는 read 계열 pane isolation 로직이 아니라 write 계열 `entry-mutations` 특유의 병렬 경합 문제로 범위가 좁혀진다.

## 정리

`entry-mutations`는 상태 변경(쓰기)을 수반하는 스펙이라 병렬 워커 조건에서 반복적으로 같은 증상을 낸다 — 3번의 서로 다른 세션(9/19, 9/23, 9/26)에서 독립적으로 재발견된 동일 패턴이다. 다음에 이 스펙이 전체 스위트에서만 실패하면, 구현을 의심하기 전에 `--workers=1` 단독 재실행부터 먼저 돌려 레이스 컨디션인지부터 가른다. 근본 수정(테스트 격리 강화 또는 로드 대기 타임아웃 확대)은 아직 하지 않은 채로 남아 있다.
