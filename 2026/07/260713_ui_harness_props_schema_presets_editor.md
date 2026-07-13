---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "props가 자유문자열로 방치돼 실제 TS 타입과 드리프트하던 컴포넌트 스키마를, TS 컴파일러 API로 추출한 구조화 배열(SoT)로 엔트리 102개 전량 교체하고, 그 위에서 수기 어댑터 66종을 스키마 파생 리졸버로 대체한 하루. 이어 정규형 spec(component/props/children)과 코드젠·gaps 파이프라인을 세워 프리셋 시스템을 얹었고(기존 프리셋 흡수, 코드베이스 역추출, 무결성 검사, curate 축적 루프), 마지막으로 Puck 에디터를 진단해 토큰 필드의 자유입력을 막고 밀도 네임스페이스를 분리하되 Composition 크롬 전면 이전은 무검증 회귀 위험으로 정직하게 이월한 흐름"
updatedAt: "2026-07-13"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "page-harness"
  - "props-schema"
  - "ts-compiler-api"
  - "schema-derived-resolver"
  - "spec-codegen"
  - "presets"
  - "puck-editor"
  - "design-token"
  - "override-boundary"

relatedCategories:
  - "react"
  - "typescript"
  - "devops"
---

# props 스키마를 정본으로: 어댑터 수기 관리를 없애고, 프리셋과 에디터를 재구축한 하루

> 컴포넌트 props를 TS에서 추출한 스키마로 정본화해 어댑터 66종의 수기 관리를 걷어내고, 그렇게 정규화한 spec 포맷 위에 프리셋 축적 루프와 Puck 에디터 재구축을 얹은 새벽 세션.

## 배경

며칠에 걸쳐 ui-harness를 세우고(갤러리, 히스토리, 리뷰 데스크, 런처, 승격) 팀 실사용 단계까지 넘겼다. 그 과정에서 계속 발목을 잡던 게 어댑터였다. 갤러리에 컴포넌트를 태우려면 Puck용 어댑터를 사람이 손으로 써야 했고, 거기 들어가는 props는 registry 엔트리에 자유문자열로 적혀 있었다. 실제 컴포넌트의 TS props가 바뀌어도 이 문자열은 자동으로 따라오지 않으니 조용히 어긋나고(드리프트), 어댑터마다 fields와 defaultProps를 중복해서 유지해야 했다.

이 자유문자열이 정본이 아니라는 게 위쪽 모든 작업의 병목이었다. 프리셋을 축적하려 해도, 페이지를 코드로 뽑아내려 해도(codegen), 결국 "이 컴포넌트가 받는 prop이 무엇인가"에 대한 믿을 수 있는 단일 출처가 없으면 전부 추정에 기댄다. 그래서 오늘 새벽의 큰 줄기는 하나다. props 스키마를 TS에서 뽑아 SoT로 만들고(Phase A~E), 그 스키마가 만들어내는 정규형 spec 위에 프리셋 시스템과 에디터 재구축을 순서대로 얹는 것. 세 갈래처럼 보이지만 스키마라는 같은 지반을 공유하는 한 흐름이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

**1) props 스키마 마이그레이션 (Phase A~E, 어댑터 정본화)**

- Phase A: props 스키마 마이그레이션 현행 분석과 설계 결정
  - 손대기 전에 현황부터 문서로 고정했다. page gallery의 구조와 spec 포맷, 저장 경로, 어댑터 66종을 renderStrategy로 분류(demo-props 16, data-prop 12, children-map 38)했고, registry props의 자유문자열 실태를 실제 TS props와 대조했다. 전환하면 무엇이 손실되고 어떤 override는 반드시 보존해야 하는지까지 assumptions(S-1~S-7)로 못박았다. 배열 스키마 전량 교체, array 타입 확장, TS 컴파일러 API 추출, token 스케일 저장값, 어댑터 제거 범위와 override 경계, spec 정규화 전략을 미리 결정해 두고 들어갔다.

- Phase B: props 스키마 v1과 TS 추출·드리프트 검사 스크립트
  - TS 컴파일러 API 기반 추출 라이브러리를 만들어 8종 타입(string/number/boolean/enum/token/action/node/array)을 추론하게 했다. 로컬·형제 파일의 named union까지 해소하고, 추출값과 현재 스키마의 diff로 드리프트를 잡는다. 이 위에 백필 스크립트(추출 후 editable 계약의 mock/label 병합, synthetic prop 추가)와 `--check` 드리프트 검사(멱등, 변경 정확 탐지, 어긋나면 exit 1)를 붙였다. 마지막으로 엔트리 102개 전량의 자유문자열 props를 구조화 배열로 백필해 자유문자열을 0건으로 만들었다. 실제로 106개 파일이 바뀌며 스키마가 처음으로 정본이 된 지점.

- Phase C: 스키마 파생 어댑터 리졸버와 override 경계
  - 이제 스키마가 있으니 어댑터를 사람이 쓸 필요가 없어진다. resolver가 `entry.meta.props` 스키마에서 Puck의 fields와 defaultProps를 파생하고, render는 3단으로 물러선다. override(프레젠테이션 보존)가 있으면 그걸 우선하고, 없으면 generic(실 컴포넌트 spread), 로드 실패 시 데모 폴백. token-scales를 design-tokens.json 기반 SoT로 두고, config는 registryComponents 루프를 resolveComponent 호출로 갈아끼웠다. 리포트 스크립트로 override 66종(children-map 38·demo-props 16·data-prop 12)을 사유별로 분류하고 generic 36을 집계하면서, 레이아웃 토큰 우회 불변식 위반이 0인지까지 검증했다. 여기서 수기 관리 대상이 어댑터 전체에서 override render 예외로 줄었다.

- Phase D: component-create/curate 스킬에 props 스키마 절차 반영
  - 사람(그리고 에이전트)이 새 컴포넌트를 만들 때부터 스키마 규율이 걸리도록 스킬을 고쳤다. component-create의 entry 템플릿 props를 스키마 배열로 바꾸고, "추출 후 editable/mock/token scale만 보강" 절차와 하드룰 두 개(배열 강제 + 스키마 체크 게이트, 사이즈/간격은 token·동작은 action·자유입력 금지)를 넣었다. curate 쪽은 유사도 판단 축의 props를 스키마(이름·타입 집합) 비교로 격상해, 자유문자열일 때보다 중복·rename 탐지를 정확하게 만들었다.

- Phase E: page spec 정규화·코드젠·gaps·레이아웃 프리미티브
  - 스키마 위에 spec 파이프라인을 얹었다. codegen이 Puck Data와 정규형 spec(component/props/children)을 왕복시키고, spec을 JSX로 뽑는다(stable은 @maxflow/ui, draft는 staging으로 import 분기, 필수 prop mock 채움, synthetic·에디터 메타 prop skip). CLI로 jsx/spec/prompt/roundtrip을 뽑을 수 있게 하고, Placeholder 마커를 gaps.json으로 자동 취합하는 스크립트, 레이아웃 프리미티브 레지스트리(gap/padding은 token, 절대좌표·자유 px 미지원)를 추가했다. 에디터에는 프롬프트 복사·JSX 복사 버튼을 붙였다. roundtrip 무손실(sample-composed 13노드·dashboard 7노드)과 뽑은 JSX 두 페이지의 tsc 0으로 확인.

- props-schema.md: 스키마 스펙·스크립트·override 기준·검증 체크리스트
  - Phase A~E를 하나의 문서로 정리했다. 스키마 포맷 8종, 추출/드리프트/override/코드젠 스크립트 사용법, override 작성 기준(children-map·위치 래퍼·데모 프레임만, generic 우선), 기존 어댑터 대비 무엇이 사라지고(수기 fields/defaultProps·자유문자열) 무엇이 남았나(render override 66)를 명시했다. 검증 체크리스트 8항목 중 부분완료 2건(레이아웃 자유입력 차단, 브라우저 시각검증)을 정직하게 남겨 다음 작업으로 넘겼다.

**2) 프리셋 시스템 (Phase 1~6, spec 위에 축적 루프)**

- 프리셋 Phase 1·3·4: 기존 프리셋 흡수 + 데이터 구조 + 무결성 검사
  - 그동안 실험적으로 쌓인 프리셋 6종(레이아웃 스캐폴드)을 새 포맷(JSX 동형 spec)으로 마이그레이션하고, 반복 섹션을 분해해 블록 프리셋 8종(page-header/stat-row/card-grid/data-table-section/filter-bar/form-section/sidebar-shell/empty-state)을 시드했다. 각각 derivedFrom로 출처를 기록. 무결성 검사 스크립트를 만들어 없는/deprecated 컴포넌트, 스키마 밖 prop, 필수 누락, staging 경고를 탐지하게 하고, 존재하지 않는 참조는 ERROR, draft는 WARN으로 실제 잡히는지 검증했다.

- 프리셋 Phase 4·6: ui-apply 무결성 연동 + page-curate 축적 루프
  - 프리셋이 조용히 부패하는 걸 막는 두 장치. 첫째, component-apply 가이드에 승격/폐기/머지 후 프리셋 무결성 검사를 필수로 넣어, 깨진 프리셋 spec을 같은 PR에서 함께 갱신하도록 했다. 둘째, page-curate 스크립트로 저장된 페이지 골격을 분석해 기존과 다른/반복되는 패턴을 프리셋 후보로 발굴하고 review-queue에 추천 액션·이유와 함께 등록한다. 저장 페이지 4개에서 후보 2건(dashboard·sample-composed의 새 골격)을 실제로 뽑아 루프가 도는 걸 확인.

- 프리셋 Phase 2·5: 코드베이스 역추출 프리셋 + 갤러리 데이터 연동
  - 프리셋을 손으로만 만들지 않고 실제 앱 코드에서 역추출했다. apps/web·design/sds/cad 480파일을 스캔해 블록 6종(toolbar-actionbar·detail-panel·master-detail-split·tabs-section·kpi-row·canvas-shell)과 페이지 6종(master-detail-workspace·settings-form·dashboard-list·canvas-app-shell·wizard-pipeline·auth-card)을 derivedFrom 실제 경로와 함께 뽑아, 합계 블록 14·페이지 12로 늘렸다. 역추출 과정에서 도메인에 갇히거나 애드혹으로 반복되는 gap 7건(DataTable 섹션·Master-detail 셸·PageHeader·FilterBar·KPIRow·Stepper·CardGrid)을 gaps.json에 기록했고, 앱 사용 0인 컴포넌트(TrendChartCard)도 확인했다. 그리고 presets/*.json을 Puck Data로 변환해 갤러리 프리셋에 병합해, 역추출본이 에디터에서 바로 뜨게 연동했다. 무결성 검사 26종(blocks 14·pages 12) ERROR 0.

**3) Puck 에디터 재구축 (Phase 0·3·4, 정직한 이월 포함)**

- 에디터 재구축 Phase 0: Puck 진단
  - 재작성 전에 지금 쓰는 Puck 0.20.2가 무엇을 주고 무엇을 안 주는지부터 확정했다. Slots·fieldTypes는 가용하지만 Plugin Rail(0.21)·CSS theme/syncHostStyles(0.22)는 미가용. DropZone API를 안 쓰고 슬롯 기반이라는 점을 확인해 "레이아웃에 못 넣는" 원인이 여기가 아님을 짚고 유지로 판정했다. config는 이미 Phase C로 스키마 파생, UI는 기본 Puck+overrides라 Composition이 아니라는 것도 명확히 했다. 유지(슬롯·파생 config·출구) / 수정(allow·inline+dragRef·token 필드·밀도) / 조건부 이월(Composition 전면 이전)로 판단 축을 세웠다.

- 에디터 재구축 Phase 3·4: 토큰 필드 자유입력 차단 + 밀도 네임스페이스
  - Phase 3은 "사이즈/간격은 토큰"이라는 규율을 에디터 UI에서 강제했다. 레이아웃 spacing 필드의 자유 숫자입력을 램프 값 칩 그리드(토큰 전용)로 바꾸고, grid cols는 세그먼트, height는 칩 그리드+자동으로 교체해 레이아웃 프리미티브 전 사이즈/간격 필드에서 자유입력을 없앴다. Phase 4는 에디터 밀도를 페이지 토큰과 분리했다. `--editor-*` CSS 변수를 에디터 루트에만 스코프하고, 밀도 프리셋 3종(compact/default/comfortable)을 data-density로 스위칭, 자유 입력이던 폰트 스케일 +/-를 3-세그먼트 DensityControl과 localStorage로 대체했다. iframe이 비활성이라 host로 스타일이 새지 않는 것도 확인.

- editor.md: 에디터 재구축 구조·판단·이월 정리
  - 완료분(config 어댑터, 필드 오버라이드, 밀도 네임스페이스, 출구)과 이월분을 정직하게 갈랐다. Composition 크롬 전면 이전은 현행 override로 이미 동작하는데, 브라우저 확장이 아직 연결되지 않아 시각 회귀를 검증할 방법이 없다. 그래서 검증 못 하는 재작성을 밀어붙이는 대신, 구체적인 6단계 이전 계획을 적어 조건부로 이월했다. 검증 체크리스트는 완료 11 / 이월 2(Composition·grid inline+dragRef) 상태로 남겼다.

## 정리

오늘의 진짜 성과는 프리셋도 에디터도 아니고 "정본을 옮긴 것"이다. 그동안 이 하네스의 실질적 SoT는 사람이 손으로 쓴 어댑터와 자유문자열 props였다. 겉으로는 돌아가지만, 정본이 사람의 손이면 무엇을 얹어도 그 위는 추정 위에 세워진다. 프리셋을 축적하려 해도 컴포넌트가 받는 prop을 확신할 수 없고, 페이지를 코드로 뽑으려 해도 마찬가지다. 그래서 TS 컴파일러 API로 props를 추출해 스키마를 정본으로 만든 Phase A~E가 나머지 전부를 떠받치는 지반이었다. 스키마가 서니 어댑터는 파생물이 되고, 수기 관리 대상이 66종 전체에서 override render 예외로 줄었다. 그 위에서야 정규형 spec과 codegen이 의미를 갖고, 프리셋과 에디터가 그 spec을 공유 언어로 삼아 얹힌다. 세 갈래로 보였지만 실은 지반 하나를 깔고 그 위에 두 층을 올린 단일 흐름이었다.

두 번째로 계속 반복된 판단은 "검증할 수 없으면 재작성하지 않는다"였다. 가장 두드러진 게 에디터의 Composition 전면 이전이다. 현행 override로 이미 동작하는 걸 더 깔끔한 구조로 다시 쓰고 싶은 유혹은 분명했지만, 브라우저 확장이 미연결이라 시각 회귀를 볼 수 없는 상태였다. 검증 환경 없이 UI를 재작성하면 "깨졌는지 아무도 모르는" 변경이 되고, 그건 오늘 스키마 작업에서 없애려던 조용한 드리프트와 정확히 같은 종류의 리스크다. 그래서 무검증 재작성을 회피하고 6단계 이전 계획으로 조건부 이월했다. 프리셋 쪽도 같은 태도였다. 무결성 검사를 만들고 apply/curate 가이드에 게이트로 걸어, 프리셋이 조용히 부패하지 않도록 검증을 파이프라인 안에 심었다. props 자유입력 차단, 드리프트 검사 exit 1, 프리셋 무결성 게이트, 그리고 검증 못 하는 이전의 이월까지, 오늘 내내 한 일은 "정본을 세우고, 그 정본이 조용히 어긋나지 못하게 검증을 붙이는 것" 하나로 꿰인다. 브라우저 시각검증 환경만 연결되면 이월한 두 건을 닫을 수 있다는 게 다음 과제로 명확히 남았다.
