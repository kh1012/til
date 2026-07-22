---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "페이지 하네스 갤러리 편집기의 레이아웃 표현력을 하루 통째로 밀어올린 날. 오후엔 컬럼 그리드, 반응형 브레이크포인트, 파일당 다중 아트보드, 노드별 제약(pin/aspect) 네 모델을 편집기 런타임에 얹고, 저녁엔 그 네 모델이 eject된 JSX에서도 동형으로 재현되도록 codegen(specToJsx)을 복원 확장했다. 밤엔 새 필드들을 page-create GUIDE에 문서화하고 track-d/track-e e2e로 고정했다. 편집기와 코드생성이 갈라지지 않게 sizeStyleFor를 소스로 삼아 형태와 삽입순서까지 동형으로 맞췄다"
updatedAt: "2026-07-19"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "page-harness"
  - "gallery"
  - "column-grid"
  - "responsive-breakpoint"
  - "multi-artboard"
  - "pin-aspect-constraint"
  - "codegen"
  - "spec-to-jsx"
  - "constraint-flow"
  - "e2e-track-d"

relatedCategories:
  - "css"
  - "react"
  - "testing"
---

# 갤러리 편집기 레이아웃 모델 4종 확장과 codegen 동형화

> 컴포넌트 갤러리와 짝을 이루는 페이지 하네스 편집기의 레이아웃 표현력을 하루 통째로 밀어올린 날. 오후엔 컬럼 그리드, 반응형, 다중 아트보드, pin/aspect 제약을 편집기에 얹고, 저녁엔 같은 모델을 codegen이 동형으로 방출하도록 복원했으며, 밤엔 문서와 e2e로 고정했다.

## 배경

페이지 하네스 갤러리 편집기의 "레이아웃 표현력"을 하루 통째로 밀어올린 날이었다. 아침부터 저녁까지 컬럼 그리드, 반응형 브레이크포인트, 파일당 다중 아트보드, 노드별 제약(pin/aspect)이라는 네 개의 레이아웃 모델을 차례로 얹었고, 저녁엔 그 네 모델이 실제 JSX 코드로도 방출되도록 codegen(specToJsx)을 복원하고 확장했다.

하루의 성격을 관통한 계약은 하나였다. 편집기에서 표현한 레이아웃이 eject된 코드에서도 그대로 재현되어야 한다는 것. 그래서 오후엔 편집기 런타임에 모델을 얹고, 저녁엔 같은 모델을 codegen이 동형으로 방출하게 복원하는 대칭 작업이 계속 반복됐다. 밤에는 이 모델들을 page-create GUIDE에 반영하고, 새로 생긴 필드들을 track-d/track-e e2e로 고정했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 페이지 루트 컬럼 그리드 필드 추가
  - Puck config.tsx에 페이지 루트 레벨 컬럼 그리드 필드(컬럼수, 거터, 마진)를 신설하고, RootRender가 이를 --ph-col-* CSS 변수로 방출하게 했다. 페이지 전체에 깔리는 기준 격자를 데이터로 갖게 한 첫 걸음이다.

- 캔버스 컬럼 오버레이를 실 트랙 밴드로
  - 캔버스 컬럼 가이드를 점(dot) 대신 실제 트랙 밴드로 바꿔, 밴드 수가 컬럼 수와 일치하게 했다. 오버레이가 실제 격자 구조를 그대로 비추도록 한 것이다.

- Grid 12컬럼 모드 추가
  - Grid 프리미티브의 cols 세그먼트에 12를 추가하고, 거터는 columnGap을 유지하도록 했다. 흔한 12컬럼 레이아웃을 세그먼트 한 번으로 집을 수 있게 했다.

- 자식 컬럼 스냅을 12컬럼까지 확장
  - size.tsx에서 자식의 colSpan을 +6/12까지, colStart를 1~12까지 스냅 스케일을 넓혔다. grid-place.css에 :has 브리지를 얹어 부모 격자 상태에 따라 자식 배치가 CSS만으로 따라오게 했다.

- 반응형 뷰포트 스위처와 activeBp 스토어
  - 반응형 편집의 토대다. editor-stores에 activeBp 스토어를 만들고, 뷰포트 스위처(CanvasOverlays)와 아트보드 폭을 배선했다. 지금 어느 브레이크포인트를 편집 중인지를 전역 상태로 잡았다.

- per-bp 오버라이드 편집과 overridden/inherited 시각화
  - 필드 쓰기를 useMultiWrite로 리다이렉트해 활성 브레이크포인트에만 값을 오버라이드하게 했다. 값이 이 bp에서 오버라이드됐는지(overridden) 상위에서 상속됐는지(inherited)를 시각적으로 구분해 보여줬다.

- 캔버스가 활성 브레이크포인트 레이아웃을 렌더
  - component-render에 activeBp를 배선해, 캔버스가 지금 선택된 브레이크포인트에서 해소된 레이아웃을 실제로 렌더하게 했다. 스위처, 오버라이드, 렌더로 반응형 3종 세트를 완성했다.

- 파일당 다중 아트보드/프레임 (옵션A)
  - Artboard 프리미티브(루트 content 최상위이 프레임)와 multiArtboard 루트 플래그를 도입했다. 플래그가 켜지면 RootRender가 프레임을 flex-row로 나란히 배치(DropZone 포함)하고 :root --ph-page-w/h 세팅을 건너뛴다. 각 Artboard가 자기 프레임 스코프 변수를 방출하고, LayersPanel은 활성 프레임으로 스코프한다. 단일/레거시(플래그 off)는 기존 fast-path 그대로라 무회귀고, 직렬화 계약(sanitize/preserveReal/indexById)은 옵션A가 traversal-invariant라 무변경으로 뒀다.

- 다중 아트보드 리뷰 폴리싱
  - 리뷰 지적 2건을 반영했다. multiWrapStyle의 무효 flex/gap 선언을 제거했는데, 실제 나란히 배치는 .ph-artboards>div가 담당하므로 래퍼의 중복 선언이 불필요했다. 또 layersSignature에 root.props.multiArtboard를 포함시켜, 구조 변경 없이 플래그만 단독 토글해도 레이어 패널이 즉시 프레임 스코프로 갱신되게 했다.

- 노드별 제약(pin/aspect) flow 모델
  - _pinH, _pinV, _aspect 필드와 직렬화를 추가하고, sizeStyleFor가 이를 flow CSS(auto 마진, align-self, aspect-ratio)로 방출하게 했다. 편집기 footprint 브리지와 STRUCTURAL_KEYS per-bp 편입도 함께 처리했다. absolute 좌표가 아니라 flow 모델 위에서 핀과 비율을 표현한 게 핵심이다.

- 제약 편집기 브리지 pinV 게이팅 보강
  - 리뷰 지적을 반영했다. 제약 편집기 브리지가 명시적으로 설정된 _alignSelf를 덮어쓰지 않고 존중하도록 pinV 게이팅을 보강했다. 핀이 없을 때만 자동 정렬이 개입하게 했다.

- Artboard eject 파손 수정
  - 여기서부터 저녁의 codegen 복원이 시작된다. Artboard eject가 깨져 있던 걸 고쳤다. codegen.mjs가 드리프트된 로컬 정의 대신 정본 LAYOUT_PRIMITIVES를 import하게 하고, 프레임 wrapper div를 방출하도록 했다.

- 루트 컬럼그리드 codegen 복원
  - specToJsx가 spec.root의 pageColumns/pageGutter/pageMargin을 최상위 래퍼의 --ph-col-* 변수로 방출하게 했다. 런타임 RootRender의 colVars 방출과 동형으로 맞춰, 편집기와 eject 코드가 같은 격자를 갖게 했다.

- pin/aspect codegen 매핑
  - _pinH/_pinV/_aspect를 sizeStyleFor와 동형인 flow CSS(marginInline*, alignSelf, aspectRatio)로 codegen에서도 방출하게 했다. 런타임과 eject의 제약 표현을 일치시켰다.

- 반응형 최소 안전망
  - @media 합성까지는 codegen 범위 밖이라, _responsive를 가진 노드 앞에 브레이크포인트가 손실될 수 있다는 경고 주석을 방출하게 했다. base 값은 정확히 나가되, 반응형이 있었다는 사실을 코드에 정직하게 남긴 절충이다.

- 리파인 프롬프트에 보존 룰 추가
  - DEFAULT_HARD_RULES에 아트보드/컬럼그리드/pin/aspect/반응형을 보존하라는 룰 4줄을 추가하고 리파인 프롬프트를 갱신했다. AI 리파인이 새 레이아웃 필드를 뭉개지 않도록 하드 룰로 못 박았다.

- spc() 재정렬로 삽입순서 동형화
  - constraintStyle(pin)을 margin보다 앞에 두도록 spc()를 재정렬했다. _margin과 _pin을 동시에 가진 노드에서 CSS 삽입 순서를 size.tsx와 동형(margin이 승)으로 맞춰, 런타임과 eject의 최종 스타일이 갈라지지 않게 했다.

- track-d에 신규필드 codegen 산출 단언 추가
  - Artboard, 컬럼그리드, pin/aspect, 반응형(margin 순서 포함) 4종이 codegen 산출물에 제대로 나오는지를 순수 node 테스트로 단언했다. 위 복원들이 회귀하지 않게 고정한 것이다.

- responsiveWarning 이스케이프 처리
  - 반응형 경고 주석이 브레이크포인트 키의 */ 시퀀스를 그대로 담으면 블록 주석이 조기 종료될 수 있어, */ 를 * / 로 이스케이프하게 했다. 모듈의 다른 이스케이프 규율과 통일했다.

- alignSelf 단언 소스 특정과 이스케이프 테스트
  - 리뷰 보강이다. AC-D6-CG의 alignSelf 단언을 pinV 전용값(flex-end)으로 소스를 특정하고, 위 이스케이프 실행 경로를 커버하는 신규 테스트(AC-D6-CG2)를 추가했다.

- page-create GUIDE §1.5 랜드마크 정정
  - 저녁의 문서 갱신을 시작했다. _role 랜드마크 5종의 DOM 방출을 정정하고 사용 규약을 신중히 적었다.

- GUIDE §1 반응형·컬럼그리드·pin/aspect 서브섹션
  - 오늘 얹은 반응형, 컬럼그리드, pin/aspect를 §1에 서브섹션으로 문서화했다.

- GUIDE §1 다중 아트보드 서브섹션
  - multiArtboard/Artboard를 §1 서브섹션과 노드표 각주로 추가했다.

- GUIDE §10 폭/정렬 오기 정정
  - §10의 폭/정렬 오기를 정정하고 Grid 자식의 _colSpan/_gridColStart 컬럼 스냅을 반영했다.

- GUIDE §2 재사용 템플릿 참조 추가
  - QuickInserter 탭과 page.mjs templates 같은 재사용 템플릿 참조를 §2에 추가했다.

- GUIDE frontmatter 갱신
  - frontmatter의 updated를 2026-07-19로 갱신했다.

- GUIDE 리뷰 지적 반영
  - 리뷰 지적을 반영해 §1.5에 landmark dedup이 아직 미실장이라는 사실을 정직하게 적고, §2 템플릿 참조경로의 모호성을 제거했다.

- 정렬 패드 활성 dot 셀 간 슬라이드
  - 정렬(align-self/pin) 패드에서 활성 dot이 셀 사이를 순간이동하지 않고 슬라이드하도록 했다. 제약 편집 UI의 미세 폴리시다.

- 상세 프롬프트 복사 실패 시 거짓 성공 정정
  - 상세 프롬프트 복사가 실패해도 '복사됨'을 띄우던 거짓 피드백을 고쳤다. writeText가 성공했을 때만 done/logHistory를 타고, 차단되면 '복사 실패'를 표시(성공을 주장하지 않음)하게 했다.

- 복사 실패 정직 피드백 회귀 테스트
  - 위 정정을 회귀로 고정했다. clipboard-write 권한 미부여 시 '복사됨'이 뜨지 않고 /history POST도 0건임을 e2e로 못 박았다. 성공 경로 e2e는 권한을 부여해 실측하게 갱신했다.

- codegen buildRefinePrompt import 수정
  - codegen에서 깨진 buildAgentPrompt import를 후신인 buildRefinePrompt로 고쳤다.

- sizingStyle에 명시 _alignSelf override 매핑
  - codegen의 sizingStyle이 명시적 _alignSelf override를 매핑하도록 해, size.tsx의 우선순위와 동형으로 맞췄다.

- resolveRegions 배선과 랜드마크 dedup
  - region-context.tsx를 새로 만들어 resolveRegions를 component-render/RootRender에 배선하고, 랜드마크 중복 태그를 dedup했다. 같은 랜드마크 role이 중첩 방출되지 않게 한 것이다.

- layers 방향키 내비를 roving focus-only로 복원
  - LayersPanel의 방향키/점프 내비게이션이 이동하면서 선택까지 바꾸던 걸, roving focus만 옮기도록 복원했다. 실제 선택은 클릭과 Enter로 커밋한다. 포커스 이동과 선택을 분리했다.

- track-d 중앙 도크 제거와 우클릭 삽입 재배선
  - 제거된 중앙 도크를 참조하던 track-d 테스트를, 대신 캔버스 배경 우클릭으로 루트 끝에 삽입하는 트리거로 재배선했다. UI가 바뀐 만큼 그걸 가리키던 e2e를 따라 고쳤다.

- track-d gap 카운트 분리와 배경 스와치 스코프
  - AC-D-06a에서 gap 카운트를 G2로 분리하며 rowGap/columnGap 단언을 더했고, AC-D-08b에서 배경 스와치 스코프와 사이징/폭 게이팅을 반영했다.

- track-e 색 필드 wrap 스와치 스코프
  - AC-E1-03에서 색 필드 wrap을 st-primary 스와치로 정밀 스코프해, 텍스트 값 색상과의 충돌을 제거했다.

## 정리

하루를 관통한 큰 줄기는 편집기에서 표현한 레이아웃이 eject된 코드에서도 그대로 재현된다는 계약을 네 개의 새 모델(컬럼그리드, 반응형, 다중아트보드, pin/aspect) 위에서 세운 것이다. 오후엔 편집기 런타임에 모델을 얹고, 저녁엔 같은 모델을 codegen(specToJsx)이 동형으로 방출하도록 복원하는 대칭 작업이 반복됐다. sizeStyleFor와 codegen의 CSS 방출을 계속 동형으로 맞춘 것, 삽입 순서(margin과 pin)까지 런타임과 일치시킨 것이 오늘의 결이었다.

배운 점은 두 가지였다. 하나는 런타임과 코드생성이 갈라지면 안 된다는 감각이다. 같은 제약을 두 곳에서 각자 계산하면 반드시 미묘하게 어긋나므로, sizeStyleFor를 소스로 삼아 codegen이 그 형태를 따라가게 하고 track-d 순수 테스트로 그 동형성을 고정했다. 다른 하나는 표현할 수 없는 것을 정직하게 남기는 태도다. @media 합성은 codegen 범위 밖이라 반응형 노드 앞에 손실 경고 주석을 방출했고, 그 주석의 */ 가 블록 주석을 조기 종료시키는 함정까지 이스케이프로 막았다. 복사 실패에 '복사됨'을 띄우던 거짓 피드백을 정직하게 고친 것도 같은 결이었다. 밤엔 UI가 바뀐 만큼 그걸 가리키던 track-d/track-e e2e와 page-create 문서를 같은 호흡으로 되짚어 맞췄다.
