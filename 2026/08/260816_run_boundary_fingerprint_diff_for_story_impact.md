---
type: "content"
domain: "frontend"
category: "state-management"
topic: "run 시작/종료 시점 콘텐츠 fingerprint 비교로 동시 실행 오염 없이 변경 여부 판별하기"
updatedAt: "2026-08-16"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "fingerprinting"
  - "diffing"
  - "concurrency"
  - "dependency-injection"
  - "git-blame"
  - "source-of-truth"

relatedCategories:
  - "performance"
  - "testing"
---

# run 시작/종료 시점 콘텐츠 fingerprint 비교로 동시 실행 오염 없이 변경 여부 판별하기

> 에이전트 실행이 스토리를 실제로 바꿨는지 판단할 때, git blame처럼 이력을 뒤지는 대신 실행 시작/종료 시점의 소스 콘텐츠 해시를 in-memory로 비교하고, "언제 스냅샷을 뜨는가"까지 설계에 포함시켜야 동시 실행에 의한 오분류를 막을 수 있다.

## 배경

maxys_proto의 ui-harness에서 컴포넌트 상세 화면의 즉시 실행(immediate execution)이 특정 스토리를 수정하면, 그 변경이 다른 스토리로 cascading될 수 있다. 문제는 사용자가 "이번 실행으로 어떤 스토리가 실제로 바뀌었는지"를 알 방법이 없었다는 것 — 스토리 목록에 변경 인디케이터가 전혀 없었다. 이걸 추가하려는 결정 단계에서 먼저 "이 표시를 영구 감사 로그로 만들 것인가, 아니면 작업 세션 동안만 보이는 일시적 UI 상태로 둘 것인가"를 정해야 했고, 목적이 히스토리 보존이 아니라 실시간 인지였으므로 후자(transient, 비영속)로 방향을 잡았다.

## 핵심 내용

**git blame은 후보에서 탈락했다.** 실제로 스토리 파일(73줄)에 `git blame --line-porcelain`을 돌려보니 0.485초가 걸렸다. 단일 커밋 조회(`git log`)는 0.025초로 훨씬 빠르지만, blame은 줄 단위 이력 전체를 훑어야 해서 무겁고, 스토리 파일과 컴포넌트 파일이 git 이력상 독립적으로 커밋되기 때문에 "이 스토리가 이 실행 때문에 바뀌었다"를 커밋 그래프만으로 안정적으로 연결하기도 어려웠다. 실시간성이 필요한 기능에 이 비용은 맞지 않는다고 판단하고, 소스 콘텐츠를 해시해서 비교하는 in-memory fingerprint 방식으로 갔다.

**fingerprint 비교의 핵심은 "언제 찍는가"였다.** `lib/story-impact.ts`에 `captureBefore()`를 만들어 실행이 시작되는 시점(모든 수정이 일어나기 전)에 소스 상태를 스냅샷 떠두고, 실행이 끝나는 시점에 `diffFingerprints()`로 그 스냅샷과 현재 상태를 비교해 `run.impact`를 채운다. 여기서 의도적으로 "종료 시점에" 비교를 확정한다 — 만약 비교를 나중에(예: UI에서 조회할 때) 하면, 그 사이에 다른 실행이 같은 스토리를 건드렸을 때 이번 실행이 안 한 변경까지 이번 실행 탓으로 돌리게 된다. 동시에 여러 실행이 큐에서 돌아가는 구조이므로, 비교 시점을 결과가 확정되는 순간으로 고정하는 게 정확성의 핵심이었다.

**fingerprint 함수는 주입식으로 분리했다.** `setFingerprinter()`로 실제 해시 로직(레지스트리 경로를 알아야 하는 부분)을 store 외부에서 주입받게 만들어서, run store 자체는 "무엇을 어떻게 해시하는지" 몰라도 된다. 주입이 없으면 impact는 `"none"`이 아니라 `"unknown"`으로 남긴다 — 정보가 없는 걸 "변경 없음"으로 거짓 보고하지 않기 위한 구분이다.

**source range도 한 곳에서만 계산하게 정리했다.** 원래 스토리 파서(`registry-stories.parse.ts`)와 impact 감지 로직이 각자 정규식으로 스토리의 소스 범위를 계산할 뻔했는데, 이렇게 두면 정규식 규칙이 갈라질 위험이 있다. 그래서 파서가 `range: { start, end }`를 한 번 계산해서 `StoryInfo`에 실어 내보내고, impact 감지는 그 range만 가져다 쓰게 했다 — 계산 로직의 source of truth를 하나로 유지하는 패턴.

**verdict 구조도 최종적으로 self-contained하게 다듬었다.** 컴포넌트 레벨 변경일 때 verdict에 `all: string[]`(그 시점의 전체 스토리 id 목록)을 함께 실어서, `markUnseen()`을 호출하는 쪽이 별도로 전체 스토리 목록을 알 필요 없이 verdict 하나만으로 "어떤 스토리들을 안 본 변경으로 표시할지" 판단할 수 있게 API를 단순화했다.

## 정리

"바뀌었는지 판별"하는 기능을 짤 때 가장 먼저 떠오르는 건 git 이력이지만, 실시간 UI 피드백용이라면 이력 조회 비용과 파일 간 독립적 커밋 구조 때문에 잘 안 맞을 수 있다. 그보다 중요했던 배움은 diff 비교의 정확성이 "무엇을 비교하는가"보다 "언제 스냅샷을 뜨고 언제 비교를 확정하는가"에 달려있다는 것 — 동시 실행 환경에서는 비교를 뒤로 미루는 순간 다른 작업의 변경을 내 탓으로 잘못 돌릴 여지가 생긴다. 그리고 같은 계산(source range)을 두 곳에서 각자 하게 두면 언젠가 반드시 어긋난다는 점도, 어제 다룬 shape drift 감사에서 "판단 로직은 병합/합성 단계까지 살아남아야 한다"는 교훈과 같은 축이다 — 계산의 source of truth를 하나로 모으는 습관이 반복해서 유효했다.
