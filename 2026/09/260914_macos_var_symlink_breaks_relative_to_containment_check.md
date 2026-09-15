---
type: "content"
domain: "backend"
category: "filesystem"
topic: "macOS /var 심볼릭 링크가 relative_to() 경로 포함 검사를 깨는 사례"
updatedAt: "2026-09-14"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "python"
  - "pathlib"
  - "symlink"
  - "macos"
  - "relative_to"
  - "sidecar"

relatedCategories:
  - "testing"
  - "debugging"
---

# macOS /var 심볼릭 링크가 relative_to() 경로 포함 검사를 깨는 사례

> sidecar 테스트 35개 중 18개가 macOS에서만 실패한 원인을 추적한 기록. 코드 로직 결함이 아니라 `/var`가 `/private/var`의 심볼릭 링크라는 플랫폼 특성 때문이었고, 부분 수정 대신 병합 범위 밖으로 되돌리기로 한 판단까지 정리한다.

## 배경

`feature/kh1012/maxflow-init` 브랜치를 `origin/main`에 병합하는 중 sidecar 패키지 테스트가 다수 실패했다. 사용자가 "atelier 쪽은 고치지 말고, 이 오류가 누가 만든 건지 확인해달라"고 요청해, 병합 충돌 문제인지 기존부터 있던 결함인지부터 가려야 했다.

## 핵심 내용

**증상**: `test_sds_export_route.py` 등에서 `ValueError: '/private/var/folders/.../manifest.json' is not in the subpath of '/var/folders/...'`.

**원인**: macOS에서 `/var`는 `/private/var`를 가리키는 심볼릭 링크다. `Path.resolve()`를 거치면 `/var/folders/...`가 `/private/var/folders/...`로 바뀐다. `file_ops.py`의 `path_guard`는 대상 경로만 resolve하고 워크스페이스 루트는 resolve하지 않은 채 `target.relative_to(root)`를 호출했다 — 한쪽만 심볼릭 링크가 풀린 상태로 비교하니 포함 관계 검사가 항상 실패했다.

`root.resolve()`를 추가해 양쪽을 동일하게 정규화하자 18개는 통과했다. 그런데 곧바로 `drawing_workflow_inputs.py`에서 같은 패턴의 실패가 새로 드러났다 — `manifest.json` 경로는 resolve된 채로, 비교 대상인 워크스페이스 루트는 resolve되지 않은 채로 들어와 같은 방식으로 깨졌다. `relative_to()` 호출 지점을 전수 조사하니 sidecar 코드베이스에 34곳이 있었고, 그중 2곳(`neutral_model_projection.py`, `_service_active.py`)은 이미 양쪽을 resolve하는 올바른 패턴을 쓰고 있었지만 나머지는 일관성이 없었다.

**원인 코드의 이력**: `git blame`으로 추적한 결과 `workflow_staging/paths.py`의 `ensure_within_workspace()`는 2026-08-27 `luciola7`의 리팩터 커밋(`d3c02191cf`, "pylint-design 게이트를 초록으로 만든다")에서 도입됐다. 다만 이 패턴 자체의 뿌리는 2026-05-14 `glay415`가 `worker` → `sidecar` 패키지 이름 변경 당시 `file_ops.py`에 심은 것이었고, 8월 리팩터가 심볼릭 링크 처리 없이 같은 패턴을 새 파일에 복제하며 결함이 퍼졌다.

**판단**: `path_guard`만 고치면 18개는 통과하지만 17개는 여전히 실패한다. 남은 실패는 다른 원인이라 이 병합 작업 범위 밖이고, 부분 수정만 반영하면 `origin/main`과 sidecar 코드가 갈라져 이후 병합에서 또 충돌을 만든다. 그래서 `path_guard` 수정을 되돌려 sidecar를 `origin/main`과 동일하게 유지하기로 했다 — 이 테스트 실패는 병합이 만든 문제가 아니라 병합 이전부터 있던 baseline 결함이므로, 병합 커밋 안에서 고칠 대상이 아니라고 판단했다.

## 정리

동일한 `relative_to()` 포함 검사 패턴이 한 파일에서 다른 파일로 코드 리뷰 없이 복제되면서 결함도 함께 퍼졌다. 플랫폼별 심볼릭 링크(`/var` ↔ `/private/var`)처럼 로컬 환경에서만 드러나는 문제는 코드 리딩만으로는 못 잡고, 실제로 실패하는 테스트를 macOS에서 돌려봐야 나온다. 그리고 부분 수정이 전체 문제를 해결하지 못할 때, 무리하게 밀어넣기보다 범위를 좁혀 되돌리고 별도 작업으로 남기는 것도 유효한 선택이다 — 병합 커밋은 병합이 만든 문제만 책임지면 된다.
