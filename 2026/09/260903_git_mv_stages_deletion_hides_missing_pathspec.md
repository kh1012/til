---
type: "content"
domain: "devops"
category: "build-infra"
topic: "경로 지정으로만 커밋하는 워크트리에서 git mv가 삭제를 미리 스테이징해 pathspec 빠뜨림을 가려 반쪽 커밋을 만들 뻔한 문제"
updatedAt: "2026-09-03"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "git-mv"
  - "rename-detection-heuristic"
  - "partial-commit"
  - "pathspec-only-commit"
  - "shared-worktree-commit-discipline"

relatedCategories:
  - "testing"
---

# 경로 지정으로만 커밋하는 워크트리에서 git mv가 삭제를 미리 스테이징해 pathspec 빠뜨림을 가려 반쪽 커밋을 만들 뻔한 문제

> `apps/atelier/chrome-ui`를 `shell/ui`로 옮기며 `git mv`를 썼는데, 이 워크트리는 다른 세션과 공유해서 `git commit --only -- <경로>`로만 커밋한다. `git mv`가 삭제 68건을 인덱스에 미리 올려 둔 상태에서 pathspec에 옛 경로를 빠뜨리자, 새 경로만 커밋되고 옛 경로 삭제는 인덱스에 남는 반쪽 커밋이 생겼다. `--amend`로 수습했지만, 안 알아챘으면 `chrome-ui`와 `shell/ui`가 둘 다 존재하는 커밋이 남을 뻔했다.

## 배경

atelier 서버 분리 작업(S1~S8) 도중 `chrome-ui` 디렉터리를 `shell/ui`로 재배치하면서 `git mv chrome-ui shell/ui`를 실행했다. 이 리포는 워크트리를 여러 세션이 공유하기 때문에 다른 세션이 만든 변경과 섞이지 않도록 `git add -A`를 쓰지 않고, 커밋할 때마다 `git commit --only -- <경로>`로 경로를 직접 지정하는 규칙을 쓰고 있었다.

## 핵심 내용

**`git mv`가 rename 표시를 만든다는 것은 사실이 아니다.** git은 애초에 rename을 저장하지 않는다 — 커밋마다 스냅샷만 저장하고, diff를 만드는 시점에 내용 유사도로 `a.txt => b.txt` 같은 rename 표시를 그 자리에서 판정한다. 실제로 빈 저장소에서 평범한 `mv` + `git add -A`만 써도 똑같이 rename으로 뜬다. 즉 `git mv`가 주는 값은 이력에 남는 rename 정보가 아니라, `mv` + `git rm` + `git add`를 한 명령으로 묶는 편의와 "대상 경로가 이미 있으면 거부"하는 가드뿐이다.

**문제는 그 "한 명령으로 묶는다"는 부분이었다.** `git mv chrome-ui shell/ui`는 실행 즉시 옛 경로의 삭제 68건과 새 경로의 추가 68건을 인덱스에 올린다.

```
git mv chrome-ui shell/ui
  → 인덱스에  D chrome-ui/*   (68)
              A shell/ui/*    (68)

git commit --only -- apps/atelier/shell …
  → A 쪽만 커밋. D 쪽은 인덱스에 그대로 남는다   ← 반쪽 커밋
```

경로 지정 커밋(`--only -- <pathspec>`)은 인덱스에 뭐가 이미 스테이징되어 있든 지정한 경로만 커밋에 담는다는 점이 전제인데, `git mv`가 삭제까지 미리 스테이징해 버리는 바람에 pathspec에 옛 경로(`apps/atelier/chrome-ui`)를 빠뜨렸다는 사실 자체가 겉으로 드러나지 않았다. 이번엔 `--amend`로 두 경로를 합쳐서 수습했지만, 못 알아챘으면 `chrome-ui`와 `shell/ui`가 둘 다 존재하는 커밋이 그대로 남았을 것이다.

**대신 평범한 `mv`를 쓰고 커밋 시점에 옛 자리·새 자리를 함께 지정하면 이 문제가 사라진다.**

```bash
mv apps/atelier/chrome-ui apps/atelier/shell/ui
git add -A -- apps/atelier/chrome-ui apps/atelier/shell/ui
git commit --only -- apps/atelier/chrome-ui apps/atelier/shell/ui …
```

이 경우 커밋 직전에 `git status --short`로 스테이징 내용을 확인하는 습관이 곧바로 pathspec 누락을 잡아낸다.

## 정리

경로 지정으로만 커밋하는 워크트리에서는 `git mv`를 쓰든 말든, 파일을 옮긴 뒤에는 옛 자리와 새 자리를 pathspec에 함께 적어야 한다는 규칙 자체는 똑같다. 차이는 `git mv`가 삭제를 즉시 스테이징해 버려서 그 규칙을 지켰는지 확인할 신호(`git status --short`로 아직 스테이징 안 된 삭제가 보이는 것)를 미리 없애 버린다는 데 있다. rename 표시는 `git mv` 없이도 diff 판정으로 얻어지므로, 공유 워크트리에서 경로 지정 커밋을 쓴다면 `git mv`의 "즉시 스테이징"은 이득보다 손해가 크다.
