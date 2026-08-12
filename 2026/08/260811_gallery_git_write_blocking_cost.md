---
type: "content"
domain: "backend"
category: "build-infra"
topic: "갤러리 API의 동기 git commit이 요청을 2.5초씩 막던 문제를 원가 분해로 진단해, 지배 비용이 git-lfs post-commit 훅(845ms×2)이라는 걸 찾아내고 훅 스킵 + async execFile 직렬 큐 + git index v4로 2.5초를 0.7초 비블로킹으로 줄였다"
updatedAt: "2026-08-11"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "git"
  - "git-lfs"
  - "execFileSync"
  - "post-commit"
  - "feature.manyFiles"
  - "index-v4"
  - "core.fsmonitor"
  - "cost-decomposition"

relatedCategories:
  - "performance"
  - "devops"
---

# 2.5초짜리 커밋을 원가 분해로 뜯어보기

> ui-harness 갤러리 API가 엔트리 하나를 저장할 때마다 서버를 2.5초씩 동기로 막고 있었다. "git commit이 느리다"로 뭉뚱그리지 않고 훅·인덱스·add/status로 쪼개 실측하니, 진짜 범인은 커밋 로직이 아니라 git-lfs post-commit 훅이었다.

## 배경

`vite-harness-api-*.ts`(클론, 닉네임/아바타 저장 등 갤러리 쓰기 경로) 여러 곳이 `execFileSync("git", ...)`로 add·commit을 동기 호출하고 있었다. 엔트리 하나를 저장하면 소스 파일 커밋 + 히스토리 사이드카 커밋, 총 두 번의 `git commit`이 순차로 돈다. 이 구간이 요청을 2.5초 동안 완전히 블로킹했는데, "git commit은 원래 느리다"는 감으로 넘기지 않고 CAND-1 태스크로 잡아 실제로 뭐가 시간을 먹는지 분해했다.

## 핵심 내용

### 원가 분해로 지배 비용 찾기

훅을 단독으로 실행해 시간을 재보니(`.git/hooks/post-commit` 단독 실행 `0.845s total`), post-commit 훅 하나가 845ms였다. 훅 내용을 보면 `git lfs post-commit "$@"` 한 줄뿐인데, 커밋이 두 번(소스 + 히스토리) 도니까 훅도 두 번 걸려 845ms×2 ≈ 1.69s. 2.5초 중 대부분이 여기서 나갔다는 뜻이다. 산술 교차검증으로도 "훅 유지 시 0.75s(순수 git 작업) + 845ms×2 ≈ 2.4s"가 원 실측 2.5s와 맞아떨어져, 지배 비용이 git-lfs 훅이라는 결론을 확정할 수 있었다.

### 실측한 개선책과 각각의 효과

| 조치 | 효과 | 채택 |
|---|---|---|
| async execFile + 저장소별 직렬 큐 | 서버 블로킹 2,440ms → 2.7ms (900배). 동시 쓰기 2건도 큐로 순차 처리되어 충돌 없음(1.13s/2.29s) | ✅ |
| git-lfs 훅 스킵 (`HARNESS_GIT_HOOKS=1`로 복원 가능하게) | 2.5s → 1.15s | ✅ |
| `feature.manyFiles` + index v4 (머신 로컬 config) | 1.15s → 0.66~0.81s (commit 421→311ms, add/status 반감) | ✅ |
| `core.fsmonitor` | 추가로 ~60ms 이득이 있지만 상주 데몬이 필요 | ❌ 기각 |
| 응답 후 히스토리 커밋(비동기 지연) | 추가 −0.35s 가능하지만 "응답=전부 커밋됨"이라는 API 계약이 약해짐 | ⏸ 보류 |

블로킹을 없애는 것(async + 큐)과 절대 시간을 줄이는 것(훅 스킵, index v4)은 서로 다른 축이라 둘 다 필요했다. 큐만 도입했으면 서버는 안 막히지만 저장 자체는 여전히 2.5초 걸렸을 거고, 훅만 스킵했으면 요청 스레드가 0.7초 동안은 계속 막혀 있었을 것이다.

core.fsmonitor를 기각한 기준도 눈에 띈다. 60ms는 이미 얻은 900배 개선에 비하면 반올림 오차 수준인데, 대가로 상주 데몬이라는 새 실패 지점을 들이는 건 맞바꿀 값이 아니라고 판단했다.

### 공유 워킹트리에서 얻은 교훈

측정 커밋을 만들다가 `git commit`을 pathspec 없이 실행해서, 다른 세션이 그 사이 스테이징해 둔 무관한 파일(FlowDetailRoute 삭제 2건)이 같이 쓸려 들어간 사고가 있었다. 되돌리려는 순간 그 세션이 이미 위에 후속 커밋을 쌓아서 재작성은 포기하고, 대신 "공유 트리에서는 커밋에도 pathspec을 반드시 단다"는 교훈을 남겼다. 실제로 이후 코드(`vite-harness-api-nickname.ts`)에는 `git add`가 성공한 경로만 모아서 `git commit -- <경로들>`로 커밋하는 패턴이 들어갔다 — add~commit 사이에 다른 세션이 스테이징한 파일을 쓸어 담지 않기 위해서다.

## 정리

"느리다"를 "왜 느린지"로 바꾸는 데는 훅 단독 실행 같은 아주 단순한 실측 한 번이면 충분했다. 감으로 짚었다면 아마 `execFileSync`를 async로 바꾸는 데서 멈췄을 텐데, 그랬으면 여전히 저장 자체는 2.5초짜리였을 것이다. 블로킹 여부와 절대 소요 시간은 별개의 축이고, 두 축을 각각 실측해야 어느 쪽이 진짜 문제인지 안다.

그리고 "커밋(add~commit)에도 pathspec"이라는 교훈은 만들어서 아는 게 아니라 사고를 치고서야 확실해졌다. 공유 워킹트리에서 자동화가 git을 건드릴 땐 add 단계뿐 아니라 commit 단계에도 범위를 명시해야 한다는 게, 코드로 남아 다음 실수를 막고 있다.
