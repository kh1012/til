---
draft: true
type: "content"
domain: "frontend"
category: "performance"
topic: "페이지 하네스의 성능을 느낌이 아니라 숫자로 붙들기 위한 베이스라인을 오후 한나절에 세운 날. 로드 성능은 Lighthouse 러너로, 편집 상호작용 성능은 Playwright perf 스펙으로 재는 두 축을 만들고, 202노드 깊이6의 재현 가능한 heavy 픽스처와 방법론 문서를 남겼다. 측정 자체가 흔들리면 최적화도 거짓말이 되므로, 픽스처 updatedAt을 과거로 돌려 인덱스 오염을 막고 절대 ms 재현성 플로어로 스펙이 머신 편차에 깜빡이지 않게 다듬었다"
updatedAt: "2026-07-19"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "page-harness"
  - "lighthouse"
  - "performance-baseline"
  - "playwright-perf"
  - "heavy-fixture"
  - "mount-latency"
  - "reproducibility"

relatedCategories:
  - "testing"
  - "tooling"
---

# 페이지 하네스 성능 베이스라인 세우기

> 페이지 하네스의 성능을 느낌이 아니라 숫자로 붙들기 위한 베이스라인을 오후 한나절에 세운 날. 로드(Lighthouse)와 상호작용(Playwright perf 스펙) 두 축을 만들고, 재현 가능한 heavy 픽스처와 방법론 문서로 언제든 같은 조건에서 다시 잴 수 있게 했다.

## 배경

페이지 하네스의 성능을 느낌이 아니라 숫자로 붙들기 위한 베이스라인을 하루 오후에 세웠다. 로드 성능은 Lighthouse 러너로, 편집 상호작용 성능은 Playwright perf 스펙으로 재는 두 축을 만들고, 재현 가능한 heavy 픽스처와 방법론 문서를 남겨 앞으로의 최적화가 기준선을 갖게 했다. 측정 도구를 먼저 세워야 최적화를 정직하게 말할 수 있다는 판단이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- Lighthouse 로드 성능 러너
  - perf-lighthouse.mjs(154줄)를 만들어 /p 로드 성능을 Lighthouse로 재는 러너를 붙이고 lighthouse를 devDep에 추가했다. 페이지 로드 지표를 스크립트 한 번으로 뽑게 했다.

- 합성 heavy 픽스처
  - 202노드 깊이6의 합성 heavy 픽스처(perf-fixture-heavy.json, 1755줄)를 만들었다. 무거운 페이지에서의 성능을 재현 가능하게 재기 위한 고정 입력이다.

- /edit 상호작용 perf 스펙
  - perf.spec.ts(132줄)로 /edit 상호작용 성능을 재는 스펙을 만들었다. mount 지연과 필드 커밋 지연을 측정 대상으로 삼았다.

- perf 베이스라인 문서
  - 방법론, 3페이지 실측, 재현성, 최적화 후보를 담은 perf 베이스라인 문서를 남겼다. 지금 숫자가 무엇을 뜻하고 어떻게 재현하는지, 다음에 무엇을 최적화할지를 기록했다.

- heavy 픽스처 updatedAt 과거로
  - perf-fixture-heavy의 updatedAt을 과거로 돌려 갤러리 인덱스가 이 픽스처로 오염되지 않게 했다. 테스트 픽스처가 실제 목록 최상단에 튀어나오는 부작용을 막은 것이다.

- perf.spec.ts 견고성 보강
  - 리뷰를 반영했다. 절대 ms 재현성 플로어, 주석 정밀도, 타이머 정리로 perf 스펙의 견고성을 높였다. 머신 편차에 흔들리지 않는 재현 가능한 기준선을 만들려는 마무리였다.

## 정리

짧지만 자족적인 인프라 갈래였다. 로드(Lighthouse)와 상호작용(Playwright perf 스펙)이라는 두 축을 세우고, 202노드짜리 heavy 픽스처와 방법론 문서로 언제든 같은 조건에서 다시 잴 수 있음을 확보했다.

배운 점은 측정 자체가 흔들리면 최적화도 거짓말이 된다는 것이었다. 그래서 픽스처 updatedAt을 과거로 돌려 인덱스 오염을 막고, 절대 ms 재현성 플로어를 둬 머신 편차에 스펙이 깜빡이지 않게 다듬는 데 오후의 마지막을 썼다. 숫자를 내기 전에 숫자를 믿을 수 있게 만드는 작업이었다.
