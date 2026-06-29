---
draft: true
type: "content"
domain: "frontend"
category: "monorepo"
topic: "SDS 3계층 외부 앱 모노레포 이관 + 호스트 임베드 + Mac 목업 듀얼모드"
updatedAt: "2026-06-29"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "monorepo"
  - "vite-lib-build"
  - "host-embed"
  - "git-lfs"
  - "fastapi-mount"
  - "dual-mode"

relatedCategories:
  - "backend"
  - "devops"
  - "embed"
---

# SDS 3계층 외부 앱을 모노레포로 들이고 호스트에 임베드하기

> 별도 레포의 슬래브 해석 앱(web/core/engine)을 @maxflow 패키지로 이관하고, apps/web에 임베드하면서 Windows 전용 백엔드가 없는 Mac에서는 목업으로 자동 전환되게 만든 하루.

## 배경

SDS는 외부 레포(max-sds-web)에 있던 슬래브 해석/설계 앱이다. UI(sds-web), API 서버(sds-server), 네이티브 솔버 엔진(FES.EXE 등)으로 나뉜 3계층 구조인데, 이걸 maxflow 모노레포 안으로 들여와 호스트(apps/web)에 위젯처럼 임베드하는 게 목표였다.

문제는 솔버 엔진이 Windows 전용 바이너리에 WIBU 동글까지 요구한다는 점이다. 개발은 Mac에서 하므로 실제 해석을 돌릴 수 없다. 그래서 "이관 → 패키지화(lib) → 호스트 임베드 → Mac에서는 목업으로 동작"이라는 단계를 하나씩 관통시키는 흐름으로 진행했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- sds-web 패키지를 @maxflow/sds-web으로 모노레포 이관
  - 패키지화/임베딩의 1단계는 "그냥 소스 이관"으로 잡았다. node_modules/dist 제외 194파일을 packages/sds-web으로 옮기고 name만 @maxflow/sds-web으로. pnpm 워크스페이스가 packages/* 글롭으로 자동 편입하므로 별도 등록은 불필요했고, standalone 빌드(tsc -b + vite build)가 통과하는지부터 확인했다. 다음 단계는 lib화라고 못박아두고 끊었다.

- @maxflow/sds-web lib 빌드 구성 (임베드용 SdsApp + bridge + 스코프 CSS)
  - 임베드 진입점 SdsApp을 만들고, vite.lib.config로 index/bridge 2엔트리 + d.ts를 뽑았다. 핵심은 CSS 충돌 방지: `:where([data-sds-web])` PostCSS 스코핑(+ data-theme/skin compound)으로 호스트 스타일과 섞이지 않게 했다. @base-ui 포털 5종(popover/tooltip/menubar/dialog/select)에는 container로 useSdsScope()를 주입해 포털도 스코프 안에 머물게 하되, standalone에서는 무회귀가 되도록 했다.

- 호스트 임베드 (어댑터 + 노드 등록 + 데모)
  - widgets/sds-web에 SdsAdapter를 두고 next/dynamic ssr:false + style.css로 붙였다. 이 어댑터가 호스트와 lib의 유일한 결합점이 되게 했다. NODE_WORKSPACE_RENDERERS에 일단 AnalysisExecution 노드로 데모 배치(전용 온톨로지 노드 생기면 키 교체 예정), Mac 시각 검증용 독립 데모 라우트도 따로 깔았다. apps/web tsc/eslint 클린 확인.

- lib 빌드에서 react-reconciler(CJS) require("react") 런타임 크래시 해결
  - 가장 막혔던 지점. react-konva, @react-three/fiber가 의존하는 react-reconciler(CJS)가 init에서 require("react")를 호출하는데, react를 external로 빼니 rolldown이 throw하는 require 헬퍼로 남겨서 브라우저에서 죽었다. vite.lib.config에 renderChunk 플러그인을 넣어 require 헬퍼를 쓰는 청크에 ESM import 기반 모듈스코프 require 심을 주입했다(react/react-dom/jsx). SSR-safe bridge 청크는 제외. 임시 vite 하네스로 dist-lib를 직접 로드해 canvas 3개가 다 뜨고 require 에러가 사라진 걸 확인했다.

- 루트 스크립트 추가 (dev:sds-web, build:sds-web)
  - design-web과 동일한 쌍으로 dev/build 스크립트를 맞췄다. sds-server/engine은 모노레포 밖이라 design-core류 대응은 없었다.

- seedData 모델 주입 (임베드 시 샘플 슬래브 표시)
  - 임베드된 캔버스가 비어 보이지 않게 데모 플레이스홀더를 넣었다. onReady보다 먼저 registerSnapshotProvider를 등록하는 게 포인트(등록 순서 때문에 standalone 무회귀를 신경 썼다). 어댑터가 onReady에서 5x5m 슬래브 1개(C24, 200mm) 샘플을 seedData로 주입하고, setModel 병합 전제라 비어있지 않은 필드만 채웠다.

- 해석 버튼 light 목업 (진행 흐름 시뮬레이션)
  - 실제 해석이 안 되는 Mac을 위해 "결과를 만들어내지는 않는" 진행 흐름만 시뮬레이션했다. mock-flag(순수, SSR-safe, bridge 노출) + mock-analysis(jobStore 진행 시뮬레이션). isMockAnalysis면 대기열→메시→해석→정리→완료 토스트까지 상태만 흐르고 결과 fabrication은 없다. 진짜 결과가 아니라는 걸 명확히 하려는 의도.

- 네이티브 솔버 엔진 이관 (@maxflow/sds-engine, Git LFS)
  - solver(FES.EXE + fort76gen + DLL 13개, 45MB) + host/build/samples/stubs/validate를 통째로 이관. 바이너리(*.exe/*.dll)는 Git LFS로 추적(.gitattributes)했고, 루트의 *.exe 무시 규칙은 패키지 .gitignore로 무효화했다. README에는 Windows 전용, WIBU 동글, sds-core 연동, LFS 안내를 적었다. FES.EXE가 133B LFS 포인터(실제 size 28508160)로 잡히는지, LFS 15개가 추적되는지 확인. push 시 Bitbucket 레포 LFS 활성화가 선행돼야 한다는 점도 기록.

- gitignore 정비 + 빌드 잡파일 제거
  - 원본 max-sds-web의 .gitignore 정책을 계승해서 build 산출물(.obj/.lib/.exe/.exp/.pdb)과 jobs/를 무시하게 했다. 추적되던 빌드 잡파일(fail*.txt 로그, canary.cpp, empty.cpp probe)은 추적 해제 후 제거. build/는 빌드 스크립트(.bat)만 추적하고 solver/ 런타임은 LFS로 유지.

- sds-server를 @maxflow/sds-core로 이관 (FastAPI 서브앱 /sds 마운트)
  - sds-server/app을 packages/sds-core/maxflow_sds_core로 옮겼다. 상대 import라 디렉토리명만 바꾸면 됐고, 형강/말뚝 카탈로그 data와 tests/docs까지 같이 옮기되 5.3M 골든데이터(verification/)는 제외. 가장 신경 쓴 건 서브앱 마운트: apps/api에서 /sds로 mount하면 서브앱 lifespan이 안 돌기 때문에 main.py의 init_state/shutdown_state를 분리해서 부모 _lifespan에서 직접 호출하게 했다. config.py의 FES 경로는 parents[2]가 vendored packages/sds-engine/solver로 그대로 해석돼 무수정. uv sync 빌드/import(41 routes)/마운트/uvicorn 기동까지 검증.

- FE 듀얼모드 (Mac/백엔드 부재 자동감지 → 목업 안내)
  - 여기서 목업을 "강제 플래그"가 아니라 "자동 감지"로 일원화했다. useSdsRuntimeMode가 navigator 플랫폼 + getHealth로 모드를 결정(Windows + FES면 실제, 그 외는 목업). 목업 모드면 MockModeBanner를 워크스페이스 상단에 띄워 "실제 해석은 Windows+FES 필요"를 알리고 setMockAnalysis(true)를 자동으로 켠다. 어댑터에서 강제 setMockAnalysis는 제거(자동감지가 단일 소스). client.ts BASE는 VITE_SDS_API_URL로 환경변수화하고 vite proxy를 sds-core 포트로 연결. 하네스 macOS에서 배너 표시, 슬래브 렌더, 에러 0 확인.

- README/env 정비 (3계층, Windows 설치, Mac 목업 안내)
  - sds-core README에 maxflow 패키지 맥락(3계층, dev 스크립트, /sds 마운트, uv 의존)을 적고, sds-web README는 Vite 보일러플레이트를 듀얼모드(Windows 실제/Mac 목업), 임베드, BASE 환경변수, 빌드 안내로 교체. sds-core .env.example에 SDS_CORE_PORT, SDSWEB_*(FES 경로 기본=vendored sds-engine/solver)를 정리.

## 정리

이 작업의 큰 줄기는 "외부 3계층 앱을 모노레포 시민으로 만들기"였다. 순서를 이관 → lib화 → 임베드 → (막힘 해결) → 데이터/목업 → 엔진/코어 이관 → 듀얼모드 → 문서로 잡으니, 한 계층씩 얇게 관통시키면서도 매 단계 standalone 무회귀를 지킬 수 있었다.

오늘 배운 점 몇 가지. 첫째, lib 빌드에서 react를 external로 빼면 CJS 의존(react-reconciler)의 require가 그대로 남아 브라우저에서 터진다는 것. renderChunk로 ESM 기반 require 심을 주입하는 패턴은 react-konva/three류를 lib로 뽑을 때 재사용할 수 있겠다. 둘째, FastAPI 서브앱을 mount하면 그 서브앱의 lifespan은 실행되지 않으므로 init/shutdown을 함수로 분리해 부모에서 호출해야 한다는 것. 셋째, "되는 환경이 따로 있는" 기능은 강제 플래그보다 런타임 자동 감지(플랫폼 + health)를 단일 소스로 두고, 안 되는 환경에서는 결과를 위조하지 않는 목업으로만 흐름을 보여주는 게 정직하다는 것.

특히 Mac 목업 듀얼모드는 "결과 fabrication 없음"을 일관되게 지킨 게 마음에 든다. 진행 상태만 시뮬레이션하고 실제 해석값은 만들지 않으니, 데모를 보면서도 "이건 Windows에서 진짜로 돌려야 한다"는 경계가 흐려지지 않는다. 다음은 전용 온톨로지 노드가 생기면 데모용 AnalysisExecution 키를 교체하는 일이 남았다.
