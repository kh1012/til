---
type: "content"
domain: "frontend"
category: "electron"
topic: "Electron 앱 자동 업데이트 후 온보딩이 반복되는 원인 — LevelDB 잠금 독점과 localStorage 폴백"
updatedAt: "2026-10-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "electron"
  - "leveldb"
  - "localstorage"
  - "userData"
  - "auto-update"
  - "process-lifecycle"

relatedCategories:
  - "build-infra"
---

# Electron 앱 자동 업데이트 후 온보딩이 반복되는 원인 — LevelDB 잠금 독점과 localStorage 폴백

> 새 버전이 이전 버전보다 먼저 떠서 같은 userData 디렉터리의 LevelDB 잠금을 놓고 경쟁하면, 나중에 뜬 인스턴스는 잠금을 얻지 못해 localStorage가 메모리 폴백으로 바뀌고 "설치 완료" 플래그가 저장되지 않는다.

## 배경

atelier 앱에서 자동 업데이트를 거치면 이미 끝낸 온보딩 화면이 다시 뜨는 버그가 있었다.
재현이 간헐적이라 원인이 추정 단계에 머물러 있었는데, "업데이트 흐름 개선" 작업
(인라인 진행률 표시, 앱 순차 실행, 온보딩 대신 What's New 페이지)을 시작하면서
1단계로 이 버그의 근본 원인을 먼저 스파이크로 재현해 확정했다.

## 핵심 내용

- Electron의 `userData` 디렉터리 안 LevelDB(=localStorage 백엔드)는 LOCK 파일로 동시 접근을 막는다. 한 프로세스가 잡으면 다른 프로세스는 그 잠금을 얻을 때까지 열 수 없다.
- 맨 Electron 인스턴스로 스파이크 실험:
  1. 단독 writer가 `localStorage.setItem('probe', 'writer')` 실행
  2. 8초간 백그라운드 writer가 잠금을 잡고 있는 동안, 동시에 reader 인스턴스가 같은 userData로 떠서 같은 키를 읽음
  3. `lsof`로 확인한 결과 LOCK 파일은 백그라운드 writer PID만 들고 있음
  4. 동시 접속한 reader는 `probe` 값을 못 읽음(null) — LevelDB 초기화 실패로 인메모리 폴백 상태로 동작
  5. reader가 그 상태에서 쓴 값(`probe2`)도 디스크에 반영되지 않음 — 이후 단독으로 다시 읽어도 null
  6. 백그라운드 writer가 종료돼 잠금이 풀린 뒤에는 단독 read로 원래 값 `writer`를 정상적으로 읽음
- 즉 잠금이 걸린 동안의 모든 읽기/쓰기는 디스크에 반영되지 않는 메모리 전용 상태로 조용히 동작한다 — 에러를 던지지 않는다.
- 업데이트 흐름에 적용하면: 새 버전 앱이 이전 버전 앱이 완전히 종료되기 전에 먼저 뜨면, 새 인스턴스는 LevelDB 잠금을 얻지 못해 localStorage가 메모리 폴백으로 전환된다. 온보딩 마법사가 세팅하는 "설치 완료" 플래그는 localStorage에 저장되므로, 이 상태에서는 디스크에 반영되지 않고 다음 실행 때 사라진 것처럼 보여 온보딩이 다시 뜬다.
- 스펙 문서(`release-update-flow.md`) 2.1절의 상태를 "(추정, 구현 첫 단계에서 재현)"에서 "(2026-10-20 재현)"으로 갱신 — 재현 가능한 근거(스파이크 로그)를 붙여 추정을 확정 사실로 바꿨다.

## 정리

- 에러 로그 없이 조용히 실패하는 종류의 버그라서, 원인 후보를 코드 리딩만으로 좁히기 어려웠다. 격리된 최소 재현(bare Electron + lsof)으로 잠금 보유자를 직접 확인한 게 결정적이었다.
- "새 버전이 이전 버전 종료를 기다리지 않고 뜬다"는 생명주기 문제가, 겉으로는 "온보딩 상태가 저장이 안 된다"는 엉뚱한 증상으로 나타났다. 저장소 계층(LevelDB 잠금)과 애플리케이션 계층(온보딩 플래그) 사이 간접 원인을 찾을 때는, 저장 폴백 동작 자체를 의심해볼 필요가 있다.
- 후속 조치는 새 버전을 띄우기 전에 이전 버전의 완전 종료를 기다리는 "순차 실행" 쪽으로 — 애초에 동시 접근 상황 자체를 없애는 방향.
