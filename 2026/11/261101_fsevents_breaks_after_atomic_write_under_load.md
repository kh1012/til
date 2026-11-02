---
type: "content"
domain: "devops"
category: "testing"
topic: "전체 테스트 스위트에서만 재현되던 file-watch 테스트 플레이키니스의 근본 원인이, 원자적 쓰기(temp 파일 + rename) 뒤 macOS FSEvents 감시가 끊기는 현상과 고부하 시 폴링 주기 부족이 겹친 것이었던 사례"
updatedAt: "2026-11-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "macos-fsevents-watch-dies-after-rename"
  - "atomic-write-breaks-file-watch"
  - "vitest-parallel-resource-contention"
  - "flaky-test-root-cause-vs-symptom"
  - "nested-timeout-cascade"

relatedCategories:
  - "unit-test"
  - "ci"
---

# 전체 테스트 스위트에서만 재현되던 file-watch 테스트 플레이키니스의 근본 원인이, 원자적 쓰기(temp 파일 + rename) 뒤 macOS FSEvents 감시가 끊기는 현상과 고부하 시 폴링 주기 부족이 겹친 것이었던 사례

> M9 마일스톤 검증 스크립트(`run-all.sh`)를 돌리자 2555개 테스트 중 5개가 실패했다. 단독 실행하면 통과하고 전체 스위트로 돌리면 실패하는 전형적인 플레이키 패턴이었다. 원인은 코드 로직이 아니라 macOS FSEvents가 원자적 쓰기 뒤 감시를 잃어버리는 아키텍처 한계와, 시스템 부하가 올라가면 그 한계를 우회하던 폴링 간격이 더 이상 충분하지 않게 되는 조합이었다.

## 배경

M9 검증은 contract → check-plain → check-env → vitest-all 네 단계로 진행된다. contract는 통과했지만 check-plain에서 `server/lib/theme-watch.test.ts` 계열 테스트 5개가 `vi.waitFor` 타임아웃으로 실패했다. 같은 실패가 check-env(6개), 전체 vitest 실행(12개, 그중 8개가 theme-watch 계열)에서도 반복됐다. 테스트 내용은 테마 파일 변경 감지, JSON 에러 복구, `token.json` 변경 전파처럼 파일 watch에 의존하는 시나리오들이었다.

## 핵심 내용

**원자적 쓰기가 끝나면 watch가 죽는다.** 안전한 쓰기를 위해 temp 파일에 쓰고 rename하는 패턴을 쓰는데, macOS FSEvents는 이 rename 한 번 이후 해당 파일에 대한 감시를 놓친다. `hub.test.ts` 197번 줄 주석에 이미 "파일 하나를 fs.watch 하면 macOS 에서 첫 rename 뒤 감시가 죽는다"고 적혀 있었다 — 알려진 한계였다. FSEvents 감시 스레드 자체가 watch를 걸고 해제할 때마다 재구성되기 때문에, 재구성 구간에 발생한 이벤트를 놓치는 구조적 문제다.

**우회책은 있었지만 전제 조건이 깨졌다.** 테스트 헬퍼 `saveUntil()`은 이 한계를 피하려고 같은 내용을 300ms 간격으로 반복해서 써서, FSEvents의 통상적인 watch 지연(50ms)보다 긴 간격으로 이벤트를 억지로 잡아낸다. 평상시 부하에서는 이 간격으로 충분했다. 하지만 검증 실행 시점에 시스템 부하 평균이 24.75, FSEvents가 179.9% CPU를 쓰고 있었고(AhnLab 등 보안 확장 프로그램까지 경쟁), 5개 이상의 vitest 워커 프로세스가 각각 50% 이상 CPU를 점유하며 병렬 실행 중이었다. 이 부하에서는 300ms 간격이 더 이상 충분하지 않아 이벤트를 놓쳤다.

**중첩된 타임아웃이 먼저 터지는 캐스케이드.** 전역 `testTimeout`은 30초지만, `saveUntil` 내부의 `vi.waitFor`는 10초 타임아웃으로 폴링한다. 이론상 30초를 기다리면 통과할 수도 있는 테스트가, 안쪽의 10초 타임아웃에 먼저 걸려 실패로 처리됐다. 즉 "충분히 기다리면 될 문제"처럼 보이지만 실제로는 중첩된 타임아웃 중 더 짧은 쪽이 항상 먼저 끊는 구조였다.

**증상만 보면 코드 버그로 오인하기 쉬운 패턴.** 원자적 manifest 쓰기 테스트(`hub.test.ts`)에서 "두 번째 정책 업데이트가 전파되지 않는다"는 실패도 같은 FSEvents 유실이 원인이었다. 별개의 버그처럼 보이는 실패들이 사실 하나의 근본 원인(고부하에서 파일 watch 이벤트 유실)에서 갈라져 나온 증상이라는 걸, 격리 실행과 전체 스위트 실행의 CPU/load 수치를 나란히 비교하고 나서야 확정할 수 있었다. 이전 실행에서 병렬 워커 수를 기본값에서 4로 줄였을 때 같은 실패 4건이 사라졌다는 기록도 자원 경합이 원인이라는 근거로 남겼다.

## 정리

파일 watch 테스트가 "단독으로는 통과, 전체 스위트에서는 실패"하는 패턴을 보이면 코드 로직보다 플랫폼 감시 메커니즘의 부하 민감도부터 의심한다. macOS에서는 원자적 쓰기(temp + rename) 뒤 FSEvents 감시가 끊기는 게 알려진 한계이고, 이를 우회하는 폴링 재시도 전략은 시스템 부하가 올라가면 전제(폴링 간격 > watch 지연)가 깨져 그대로 실패로 드러난다. 또한 안쪽 타임아웃(`vi.waitFor` 10초)이 바깥쪽 전역 타임아웃(30초)보다 짧으면, 전역값을 늘려도 소용없다 — 캐스케이드에서 가장 짧은 타임아웃이 실제 상한이라는 점을 먼저 확인해야 한다.
