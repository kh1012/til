---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "cad-web 도면 워크스페이스의 빈/처리중/에러 화면을 EmptyFileUpload로 통일하고 라이트/다크 테마 스코프·배경 토큰·첫 도면 진행률·마운트 타이밍을 실제 흐름에 맞게 재설계"
updatedAt: "2026-07-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "cad-web"
  - "resize-observer"
  - "theme-scope"
  - "progress-ux"
  - "i18n-key"
  - "reveal-timing"

relatedCategories:
  - "react"
  - "design-system"
  - "css"
---

# cad-web 도면 워크스페이스 화면 개편

> packages/ui에서 키운 EmptyFileUpload를 실제 cad-web 도면 워크스페이스에 붙이면서, 라이트/다크 테마 스코프·배경 토큰·첫 도면 로딩 진행률·캔버스 마운트 타이밍까지 실제 동작 흐름에 맞게 다시 맞춘 기록.

## 배경

공용 컴포지트로 EmptyFileUpload가 준비되자, cad-web의 도면 워크스페이스에서 손으로 만들어 쓰던 여러 상태 화면(도면 없음, 자동 처리 중, 실패)을 그 단일 컴포넌트로 통일하는 작업으로 넘어갔다. 단순 교체로 끝나지 않고, 화면을 바꾸면서 드러난 테마 스코프 문제, 배경 톤, 진행률이 실제 로딩 흐름과 어긋나는 문제, 그리고 마운트 타이밍 회귀까지 연쇄로 따라왔다.

핵심은 "화면에 보이는 진행 상태를 실제 백엔드 처리 흐름과 일치시키기"였다. 눈에 보이는 진행률이 내부 동작과 다르면 사용자는 멈춘 것처럼 느낀다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 도면 없음/자동처리/실패 화면을 EmptyFileUpload로 교체
  - CadWorkspace의 empty(EmptyState+FolderOpenButton)·loading+autoProgress(스피너+선형 진행바)·error(EmptyState+재시도) 3개 분기를 EmptyFileUpload 단일 컴포넌트로 통일했다. 자동 처리 중엔 원형 진행률(progress prop), 실패 시엔 error 상태로 표시. 폴더 선택은 directory prop으로 유지. 층 전환 로딩(autoProgress 없는 loading)은 업로드와 무관해 기존 Spinner+텍스트를 그대로 뒀다. 안내 카피도 "작업할 도면 폴더를 선택하세요" 계열로 갱신(기본 메시지·앱 오버라이드 동시).

- 업로드~자동처리 화면을 라이트 테마로, 캔버스만 다크 유지
  - data-theme="dark"가 main 전체에 걸려 있어 empty/uploading/loading/error 화면까지 검정 배경이 됐던 걸, 캔버스(status==="ready") 서브트리에만 스코프하도록 옮겼다. 나머지 화면은 앰비언트(라이트) 테마를 따르게. PaneHeader·SceneCanvas·오버레이는 건드리지 않고 다크 스코프 위치만 재배치.

- 업로드/처리중/에러/빈 화면 배경을 st-muted로 교체
  - st-background(흰색)로 칠해져 있던 걸 st-muted(oklch 0.97)로 바꿔 Storybook Gallery와 같은 톤(옅은 회색 배경 위 카드)을 따르게 했다. 캔버스(다크 스코프)는 영향 없음.

- 업로드 화면 카드 흰 배경 추가, 우측 패널은 캔버스 준비 전 숨김
  - EmptyFileUpload를 primitives의 Card/CardContent로 감싸 Gallery와 동일하게 흰 카드(bg-st-card) + 옅은 회색 배경 톤을 맞췄다. barrel의 Card는 레거시 compound API(Card.Root 등)라 이름이 겹쳐 primitives 서브패스로 직접 import했다. 우측 인스펙터/정합 패널은 캔버스가 준비되기 전엔 보여줄 내용이 없어 숨겼다.

- 첫 도면 로딩 진행률을 실제 흐름에 맞게 재설계
  - autoProgress.done/total은 폴더 내 전체 도면 수 기준인데, 실제로는 첫 도면 getScene이 끝나자마자 selectFloor 캐시 히트로 status가 곧장 ready가 돼 캔버스로 전환된다(나머지는 백그라운드). 그래서 퍼센트가 항상 낮은 값에서 멈춘 것처럼 보였다. 문구를 "첫 번째 도면만 먼저 불러오고 나머지는 백그라운드에서 처리"로 바꾸고 {done,total} 파라미터를 제거했다. 세부 진행률 신호가 없는 단일 네트워크 호출이라 대기 시간 기반 체감 진행률(0에서 95%)을 쓰고, 실제 완료 시점에도 즉시 끊지 않고 useLoadTransition이 잔여 구간을 짧게 100%까지 채운 뒤에만 전환을 허용하게 했다(revealReady).

- en 로케일 workspace 메시지 키를 KO와 동일하게 리네임
  - 위에서 workspace.autoProcessing/loadingDrawingNamed를 autoProcessingTitle/Desc로 바꿨는데 en/cad-web.json 갱신을 빠뜨려 CadWebMessages 타입 불일치로 apps/web 전체 tsc가 깨졌다. en 키를 KO와 동일하게 맞춰 복구.

- 업로드/처리중/에러/빈 화면 배경을 st-muted에서 st-canvas로
  - st-muted(순회색 hover 톤)보다 st-canvas(#F8FAFC, 페이지 캔버스 배경 의미)가 이 화면들의 역할에 더 맞는 토큰이라 교체. 앞서 신설한 st-canvas 토큰의 의미(페이지 캔버스 배경)에 맞춘 정리.

- revealReady 지연으로 useViewport ResizeObserver 안 붙던 회귀 수정
  - useViewport는 "svg가 extents 설정과 동시에 마운트된다"는 전제로 크기 추적 effect를 짜뒀다. 그런데 SceneCanvas 마운트 자체를 revealReady로 지연시키니 extents가 바뀌는 시점에 svgRef.current가 아직 null이라 ResizeObserver가 영영 안 붙고 size가 {0,0}에 멈춰 ready=false가 됐다(빈 캔버스). 캔버스는 scene이 생기자마자 원래대로 즉시 마운트하고, "완료까지 기다렸다 전환"하는 연출은 캔버스 위를 덮는 카드 오버레이(state.scene && !revealReady)로 대신했다. SceneCanvas/useViewport 타이밍은 그대로 보존.

## 정리

오늘 cad-web 쪽은 EmptyFileUpload 교체 하나로 시작했지만, 결국 "화면 상태를 실제 동작과 일치시키기"라는 한 주제로 수렴했다. 진행률 재설계가 대표적이다. done/total이 폴더 전체 도면 기준인데 정작 첫 도면 하나만 로드되면 바로 캔버스로 넘어가니, 숫자상으로는 늘 미완인 채 화면만 전환됐다. 세부 신호가 없는 단일 호출에서는 정확한 퍼센트를 억지로 계산하기보다 대기 시간 기반 체감 진행률로 0에서 95%를 채우고 완료 시 나머지를 마저 채우는 편이 실제 흐름과 사용자 체감을 둘 다 맞춘다는 결론이었다.

가장 뼈아팠던 건 revealReady 회귀였다. "완료까지 기다렸다 캔버스를 보여주자"는 의도로 마운트를 지연시켰는데, 그게 useViewport의 암묵적 전제(svg가 extents와 동시에 마운트된다)를 깨서 ResizeObserver가 붙지 못하고 캔버스가 영영 {0,0}에 멈췄다. 교훈은 명확하다. 컴포넌트의 마운트 타이밍은 그 안의 effect가 세운 전제와 계약 관계다. 연출을 위해 마운트를 미루면 그 계약이 조용히 깨진다. 해법은 마운트는 원래대로 두고 연출만 위에 오버레이로 얹는 것이었다. "보이는 것"과 "존재하는 것"을 분리하니 타이밍 전제를 건드리지 않고도 원하는 연출이 나왔다.

en 로케일 키 누락으로 tsc 전체가 깨진 것도 기록해둔다. 메시지 키를 바꾸면 ko/en 양쪽을 동시에 갱신해야 타입이 맞는다. 한쪽만 바꾸면 그 순간엔 안 보이다가 빌드에서 전면적으로 터진다.
