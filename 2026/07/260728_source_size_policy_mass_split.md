---
draft: true
type: "content"
domain: "frontend"
category: "refactoring"
topic: "소스 사이즈 정책(파일당 최대 라인수)을 리포 전체에 실제로 적용한 하루. 워크플로 배치로 ui 패키지 스테이징 컴포넌트와 page-harness/ui-harness의 초대형 파일 수백 개를 도트 네이밍·state bag 훅 패턴으로 분할하고, 분할 과정에서 그대로 딸려온 react-hooks eslint-disable 억제 주석을 하나씩 실제 원인 수정으로 걷어내 리포 전체 behavioral suppression 0건을 만들었다. 마지막엔 150/300으로 갈라져 있던 max-lines 설정을 공유 모듈 하나로 통일했다"
updatedAt: "2026-07-28"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "source-size-policy"
  - "max-lines"
  - "eslint"
  - "rules-of-hooks"
  - "exhaustive-deps"
  - "behavioral-suppression"
  - "state-bag-hook"
  - "prettier-baseline"
  - "page-harness"
  - "ui-harness"

relatedCategories:
  - "react"
  - "typescript"
  - "devops"
---

# 파일 라인수 정책을 리포 전체에 실제로 적용하고, 훅 규칙 억제 주석을 0건으로 만든 날

> 워크플로 배치로 ui 패키지와 page-harness/ui-harness의 초대형 파일 수백 개를 분할하고, 배치가 실패하거나 BLOCKED로 남긴 잔여 항목을 직접 마무리했다. 분할 과정에서 원본의 react-hooks 억제 주석이 그대로 옮겨져 lint가 막히자 억제를 지우고 실제 원인을 고쳐 리포 전체 0건을 만들었고, 마지막에 150/300으로 어긋나 있던 max-lines 설정을 공유 모듈로 통일했다.

## 배경

그동안 정책 문서와 CLI(`scripts/check/source-size.mjs`)에만 존재하던 소스 사이즈 규칙을, 실제 코드베이스에 강제로 적용하는 날이었다. 오래 방치된 초대형 파일들이 수백 개 있었고, 이걸 손으로 하나씩 쪼개는 건 현실적이지 않아 워크플로 배치(멀티 에이전트 병렬 분할)로 밀어붙였다.

문제는 분할 자체보다 그 부산물이었다. 파일을 쪼개면 원본에 붙어 있던 `eslint-disable react-hooks/*` 주석이 새 파일로 그대로 따라온다. 이 리포에는 `scripts/lint/check-behavioral-suppressions.mjs`가 react-hooks 계열 억제 주석을 리포 전체에서 금지하고 있어서, 분할이 끝나는 순간 `pnpm run check`가 막혔다. 결국 "쪼개기"가 아니라 "쪼개면서 드러난 훅 규칙 위반을 실제로 고치기"가 하루의 절반이 됐다.

여기에 정책 자체의 불일치도 있었다. 오전 배치는 150줄 기준으로, 오후 배치는 300줄 기준으로 돌았는데, 알고 보니 eslint config 두 곳이 max-lines 150을 하드코딩하고 있었고 source-size CLI는 300을 별도로 하드코딩하고 있었다. 같은 정책이 세 군데에서 다른 숫자로 살아 있었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 브랜치 병합으로 하루 시작
  - `origin/feature/kh1012/ui-harness/daily`와 `origin/main`을 작업 브랜치로 병합했다. main 병합에서는 `maxflow/.gitignore` 충돌이 나 직접 정리했다. 이 병합이 나중에 `.gitignore` 항목 누락 사고로 이어진다.

- adapter-layout-resize 서브패스에 `attachDragListeners` re-export 추가
  - page-harness가 `@maxflow/ui/adapter-layout/use-adapter-layout-resize`에서 `attachDragListeners`를 import하는데, 해당 서브패스가 실제 구현체(`attachAdapterLayoutDragListeners`)를 re-export하지 않아 typecheck가 깨져 있었다. 서브패스 배럴에 re-export를 추가해 복구했다.

- prettier baseline 일괄 적용 (552개 파일)
  - 병합 직후 552개 파일이 prettier baseline을 벗어나 있는 게 확인돼 `--write`로 일괄 재포맷했다. 로직 변경은 없다. 이후 하루 동안 분할 배치가 끝날 때마다 같은 baseline 적용 커밋을 세 번 더 반복하게 된다.

- ui 패키지 스테이징 컴포넌트 대규모 분할 (14개 배치, 335파일)
  - `animated-circular-progress-bar`부터 `zoom-control`까지 알파벳 순으로 스테이징 컴포넌트 전체를 훑으며 300/150줄 정책에 맞게 분할했다. 분할 패턴은 도트 네이밍으로 통일했다. 한 컴포넌트를 `{name}.tsx`(껍데기) / `.types.ts` / `.constants.ts` / `.hooks.ts` / `.motion.ts` / 서브 컴포넌트 파일들로 쪼개는 식이다. 예를 들어 `app-download-stack.tsx`는 416줄에서 껍데기만 남고 selector-panel, stack-view, status-panels, hooks, motion, types, constants로 갈라졌다.
  - 분할과 동시에 `react-hooks/rules-of-hooks`와 `react-hooks/set-state-in-effect` 위반도 함께 고쳤다. 파일을 쪼개는 김에 잠자던 훅 규칙 위반이 표면으로 올라온 셈이다.
  - `typing-animation.tsx`는 배치가 붙지 않았다. 코드 안의 `words.join("\0")` 델리미터 때문에 git이 파일을 바이너리로 오인해 `git apply`가 패치를 거부했다. 최종 내용을 직접 반영하는 걸로 우회했다.

- 워크플로가 BLOCKED로 남긴 resizable/magnetic-cursor/popover 직접 마무리
  - 배치 전체에서 유일하게 BLOCKED로 남은 항목이라 손으로 처리했다. `adapter-layout/resizable.tsx`는 Panel/Handle/Group을 파일로 분리하면서 `react-hooks/immutability` 위반 2건을 같이 잡았다. ResizablePanel이 `group.panels.current`를 직접 mutate하던 걸 `registerPanel` 콜백으로 바꾸고, ResizablePanelGroup의 `let panelIndex` 재대입 루프를 reduce 기반 순수 계산으로 교체했다. `magnetic-cursor.tsx`는 상수/포인터 트래킹 훅/MagneticButton으로, `popover.tsx`는 Content를 별도 파일로 분리했다. `animated-checkbox.stories.tsx`의 prop 동기화용 `useEffect + setState`는 렌더 중 상태 조정 패턴으로 교체했다.

- card-nav/model-viewer 훅 규칙 억제 주석 제거, 실제 원인 수정
  - 분할 과정에서 원본의 `eslint-disable`이 그대로 옮겨져 `check-behavioral-suppressions.mjs`에 막힌 첫 사례다. `card-nav.hooks.ts`는 `calculateHeight`/`createTimeline`을 useCallback으로 안정화해 두 useLayoutEffect의 exhaustive-deps를 억제 없이 만족시켰다.
  - `model-viewer.model-inner.tsx`가 더 까다로웠다. `useMemo` 콜백 안에서 확장자에 따라 `useGLTF`/`useFBX`/`useLoader`를 조건부 호출하는 구조라 rules-of-hooks 자체를 정면으로 위반하고 있었다. 로더별 리프 컴포넌트(GltfModelInner/FbxModelInner/ObjModelInner)로 쪼개서 훅 분기를 컴포넌트 분기로 바꿨다. 각 리프는 무조건 훅 하나만 호출한다. 겸사겸사 `frameModel` 이펙트는 content 변경 시에만 재실행하되 나머지 최신값은 ref 스냅샷으로 받게 했고, `attachTouchGestures` 이펙트에 누락돼 있던 `camera`를 deps에 추가했다.
  - 이때 page-harness 쪽 억제 주석 1건은 보류 중인 고위험 영역이라 범위 밖으로 남겨뒀다. 이게 오후에 다시 돌아온다.
  - `model-viewer.use-model-content`를 `.ts`에서 `.tsx`로 이관하면서 구 파일 삭제가 누락된 것도 정리했다.

- page-harness/ui-harness 300줄 분할 (26개 배치, 345파일)
  - 오후 배치는 하네스 쪽이었다. ui 패키지와 달리 여기는 라우트·패널·e2e spec·`.mjs` 스크립트·CSS까지 대상이 다양했다.
  - 대표적으로 `EditRoute.tsx`는 1855줄에서 껍데기만 남기고 `routes/edit/` 하위로 갈라졌다. 훅을 기능 단위 state bag으로 뽑는 패턴을 썼다. `use-document-load` / `use-document-state` / `use-save-flow` / `use-save-shortcuts` / `use-conflict-flow` / `use-recovery-flow` / `use-eject-flow` / `use-editor-nav` / `use-editor-ui-state`로 흐름별로 나누고, 표현 계층은 EditRouteBanners/Chrome/EjectSurfaces/EjectedView/LoadError로 분리했다.
  - 그 외 IndexRoute, CanvasOverlays, LayersPanel, HistoryPanel, PresetPicker, CommandPalette, QuickInserter, Toolbar, ComponentOverlay, PageVersionsPanel, DetailRoute, IframeBridge, puck config/context-menu, ui-harness의 LibraryRoute·ReviewRoute·previews.backfill·animation-contract, e2e spec(track-a~e, eject-lifecycle, resize-observer-diagnostics, editor-save-recovery 등), page-store.mjs·codegen.mjs·ui-valid.mjs·props-schema.mjs, editor-chrome.css·layers.css·motion.css까지 전부 분할 대상이 됐다.

- 디스크 부족으로 실패한 vite-plugins.ts/chrome-lint.mjs 직접 처리
  - 배치가 마지막 2개 파일에서 디스크 부족으로 죽어서 손으로 마무리했다. `vite-plugins.ts`(834줄)는 HTTP 헬퍼 / 미리보기 파생 / 목록·계보 / 템플릿 / 페이지 CRUD / 서브리소스(history·versions·trash·restore)로 파일을 나누고, `pagesApi`에는 라우팅 디스패치만 남겼다. 분할 후 dev 서버를 실제로 띄워 `/api/pages`, `/api/page/:slug`, `/history`, `/versions`, `/templates`, 404 케이스를 curl로 두드려 전부 정상 응답을 확인했다. `chrome-lint.mjs`(302줄)는 TELLS 배열과 lintTells를 `chrome-lint-tells.mjs`로 분리해 248줄로 내리고 셀프테스트 14/14를 통과시켰다.

- 남은 억제 주석 2건 제거로 리포 전체 0건 달성
  - `use-dialog-focus-trap.ts`는 PresetPicker 분할 때 원본 주석이 딸려온 케이스다. `onDismiss`/`onDismissCancelConfirm`을 ref 스냅샷으로 감싸서, `open`/`showCancelConfirm` 변화에만 재바인딩한다는 원래 의도를 억제 없이 만족시켰다.
  - `ai-rule-console.tsx`는 `rowsKey`(직렬화 비교)로만 재동기화하려던 의도가 있어 exhaustive-deps와 충돌했다. `props.rules`를 직접 참조하지 않도록 ref 스냅샷(`latestRows`)으로 우회해 의도는 유지한 채 규칙을 만족시켰다. 이걸로 리포 전체 behavioral suppression 0건이 됐다.

- 안 쓰는 AGENTS.md 제거와 .gitignore 복원
  - 루트 `AGENTS.md`는 전체가 awl-loop 지침이라 maxflow와 무관했고, `maxflow/AGENTS.md`는 Codex/Cursor용 UI 하네스 안내였는데 이 리포에선 쓰지 않아 둘 다 지웠다.
  - `.gitignore`에서 `CLAUDE.local.md` 항목이 조용히 빠져 있는 걸 발견해 복원했다. git 히스토리를 따라가 보니 아침의 maxflow-init 브랜치 병합 과정 어딘가에서 사라진 것이었다. 정리 직후 `origin/main`을 한 번 더 병합해 작업 브랜치를 최신으로 맞췄다.

- max-lines 라인수 제한을 300줄로 통일
  - `apps/web`과 `eslint-react-hooks` 공용 config가 각각 `max-lines: 150`을 하드코딩하고 있었고, source-size CLI는 자기 나름대로 300을 하드코딩하고 있었다. 같은 정책이 세 군데에서 따로 살아 있던 셈이다. `scripts/lint/max-lines-rule.mjs`라는 공유 모듈을 만들어 `DEFAULT_MAX_LINES`(300)를 단일 출처로 삼고, 세 곳이 전부 이걸 참조하게 했다. 덤으로 규칙 자체가 아예 없던 `page-harness/gallery`에도 max-lines를 새로 걸었다.

- QuickInserter를 QiSearchBar로 한 번 더 분리
  - 오후 분할 배치를 거쳤는데도 `QuickInserter.tsx`가 311줄로 정책을 11줄 초과하고 있었다. 자체완결적인 검색 입력 + 지우기 버튼 블록을 `QiSearchBar.tsx`로 뽑아 285줄로 내렸다. 이미 있던 QiOptionRow와 같은 분리 패턴을 따랐다.

## 정리

하루의 큰 줄기는 "정책을 문서에서 코드로 내리는 일"이었다. 소스 사이즈 규칙은 원래도 있었지만 CLI에만 존재했고, 실제 코드베이스는 1855줄짜리 라우트와 834줄짜리 서버 플러그인을 품은 채 굴러가고 있었다. 그 간극을 하루에 메우려면 손으로는 안 되고, 그래서 워크플로 배치로 밀었다.

배치를 돌리고 나서 배운 건 두 가지다.

첫째, **파일 분할은 코드의 숨은 부채를 강제로 노출시킨다.** 700줄짜리 컴포넌트 안에서는 `useMemo` 콜백 안의 조건부 `useGLTF` 호출이나 `panels.current` 직접 mutate가 그냥 묻혀 있었다. 파일을 쪼개는 순간 각 조각이 lint의 시야에 새로 들어오고, 그때부터는 억제 주석 없이는 통과가 안 된다. 이날 고친 rules-of-hooks / set-state-in-effect / immutability 위반들은 전부 "분할하려다 발견한" 것이지 "고치려고 찾은" 게 아니었다.

둘째, **억제 주석 금지 규칙이 있어야 분할이 리팩터링이 된다.** `check-behavioral-suppressions.mjs`가 react-hooks 억제를 리포 전체에서 막지 않았다면, 배치는 원본 주석을 새 파일에 그대로 복사하고 초록불을 띄웠을 것이다. 그러면 라인수만 줄고 부채는 그대로 이동한다. 이 규칙이 배치를 막아 세운 덕에 model-viewer는 로더별 리프 컴포넌트로 구조가 바뀌었고, focus-trap과 ai-rule-console은 ref 스냅샷으로 "의도는 유지하되 규칙은 만족"하는 형태를 찾았다. 오늘 세 번 반복해서 쓴 ref 스냅샷 패턴은, 사실상 "이 값의 변화로는 재실행하고 싶지 않다"는 의도를 억제 주석 대신 코드로 표현하는 방법이다.

정책 통일을 마지막에 한 것도 순서상 배운 점이다. 오전엔 150줄로 쪼개고 오후엔 300줄로 쪼갠 게 그냥 기준이 흔들린 게 아니라, 정책 값이 세 군데 하드코딩돼 있었다는 사실의 증상이었다. 대량 작업을 하고 나서야 그 불일치가 눈에 띄었다. 다음엔 순서를 뒤집는 게 맞다. 정책 값의 단일 출처부터 만들고 그 다음에 배치를 돌려야 한다.

배치가 완벽하지 않다는 것도 확인했다. `typing-animation.tsx`는 `"\0"` 델리미터 때문에 git이 바이너리로 오인해 패치가 안 붙었고, resizable은 immutability 위반이 얽혀 BLOCKED로 남았고, vite-plugins는 디스크가 부족해 죽었다. 대량 자동화의 성공률은 결국 100%가 안 되고, 남은 꼬리를 손으로 마무리하는 시간을 처음부터 예산에 넣어야 한다. 다만 그 꼬리가 가장 어려운 항목들이라는 건 오히려 자연스럽다. 쉬운 건 자동화가 다 가져갔으니까.
