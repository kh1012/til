---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "모노레포 UI 통합의 무게중심을 명명 규칙에서 packages/ui 추상화·통합으로 옮긴 하루. 컴포넌트 prefix 일괄 강제를 폐기하고, 통합 레버를 토큰과 composite 레이어로 재정의한 뒤, Phase 0 계약(적용 범위·토큰 강도·승격 트리거·barrel 충돌·dynamic-form)과 Phase 1 승격 리스트(StatusBar/Toolbar/PropertyPanel/Snb/DataTable 골격 + Button variant)를 확정하고, Phase 2 톤앤매너 메커니즘을 직접 검증한 다음 Phase 2~6과 design-web 트랙 D 실행 스펙 초안까지 세웠다"

updatedAt: "2026-06-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "packages-ui"
  - "design-system"
  - "monorepo"
  - "composite"
  - "design-tokens"
  - "headless"
  - "barrel-export"
  - "thin-convention"

relatedCategories:
  - "monorepo"
  - "design-system"
  - "refactoring"
---

# packages/ui 추상화·통합 계획을 세우다

> 이날은 코드를 거의 짜지 않고 모노레포의 UI를 어떻게 한곳으로 모을지 그 계약을 정한 하루였다. 출발은 "컴포넌트를 뭐라고 부를까"라는 명명 규칙 문서였는데, cad-web 재조사가 prefix 정책의 붕괴를 보여주면서 무게중심을 "명명"에서 "추상화·통합"으로 통째로 옮겼다. 통합의 진짜 레버는 패키지마다 prefix를 강제하는 일이 아니라 토큰과 composite 레이어라는 결론에 도달했고, 그 위에서 Phase 0 계약과 Phase 1 승격 리스트를 확정한 뒤 Phase 2 메커니즘을 검증하고 실행 스펙 초안까지 세웠다.

## 배경

모노레포에는 톤앤매너의 단일 진실원이 되어야 할 `packages/ui`가 있고, 그것을 소비하는 `apps/web`, 그리고 각자 화면을 그리는 `packages/cad-web`, `packages/design-web`이 있다. 원래 이 정리의 출발점은 `component-naming-convention.md`라는 명명 규칙 문서였다. 파일명은 kebab으로, 식별자는 PascalCase로, 패키지마다 `Cad*` 같은 prefix를 붙여 충돌을 막자는 식의, "어떻게 부를까"에 무게를 둔 문서였다.

그런데 cad-web을 전면 재조사하면서 이 전제가 흔들렸다. cad-web 팀은 DXF 업로드·변환 흐름을 4계층(model/canvas/ui/lib, 50개 넘는 파일) CAD 에디터로 재편하면서 내부 컴포넌트의 `Cad*` prefix를 자연스럽게 버렸다. 컴포넌트 약 23개 중 prefix가 남은 것은 `CadWorkspace` 하나뿐이었다. 즉 "패키지 안에서는 이미 cad임을 아는데 prefix가 중복"이라는 결이 현장에서 이미 작동하고 있었다. 동시에 공개 barrel에는 generic한 `StatusBar`가 그대로 새어 나가 경계를 오염시키고 있었다. 명명을 일괄 강제하자는 방향이 현실과 어긋난다는 신호였다.

여기서 핵심 인식 하나를 잡았다. 사용자가 보는 것은 `CadStatusBar`냐 `StatusBar`냐 하는 코드 식별자가 아니라 화면이다. 그러니 통합의 대상은 명명이 아니라 화면에 보이는 톤앤매너이고, 그 레버는 토큰·테마와 composite 레이어여야 한다. 이 한 줄이 이날 작업 전체의 방향을 정했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 구 명명 규칙 정리 마감
  - 명명 규칙 문서에서 파일명 kebab, 식별자 케이스, 파일과 컴포넌트 1:1 같은 항목과 임시 디렉토리(`26july-ui`) 정리 방침을 확정했다. 이 시점까지는 아직 prefix 강제가 잠정 유효한 "명명 중심" 문서였다.

- cad-web 재조사 반영, prefix 강제 폐기
  - 위 배경의 재조사 결과를 문서에 반영했다. prefix 정책이 현장에서 무너졌고 `StatusBar`가 barrel로 유출되는 것을 확인하면서, "전 모듈 prefix 리네임" 같은 일괄 작업을 폐기하기로 했다. 대신 힘을 (1) 조합 원칙과 (2) 공개 경계의 충돌 안전성, 두 곳에만 싣기로 방향을 틀었다.

- 문서 승격·리네임 (명명 → 추상화·통합)
  - `component-naming-convention.md`를 `abstract-ui-package-integration.md`로 승격·흡수했다. 무게중심을 "어떻게 부르냐"에서 "무엇을 packages/ui로 추상화하고 그 위에서 어떻게 조합·통합하냐"로 옮겼다. 목표(북극성), 조합 원칙, 로드맵(Phase 0~6), thin 컨벤션 절을 새로 세우고, 기존 명명 규칙은 강제에서 권장으로 격하해 부록으로 내렸다.

- Phase 0 계약, 미결 5건 확정
  - 적용 범위: 조합 규칙은 `apps/web`과 `packages/cad-web`에 강제한다. `packages/ui`는 재료 생산자라 제외하고, 캔버스·엔진 같은 도메인 고유 위젯도 예외로 둔다(톤앤매너 토큰은 따른다).
  - 토큰 강도: 색만 하드 금지로 정했다. raw hex와 임의 색은 CI에서 차단하고 시맨틱 토큰을 쓰게 하되, 간격·타이포의 임의값은 레이아웃 미세조정 현실을 인정해 권장 수준으로 둔다. 강제는 브랜드 색에 집중한다.
  - 승격 트리거: 같은 골격이 두 곳 이상에서 반복돼 재사용이 입증될 때만 `packages/ui`로 승격한다. 과잉 추상화를 막는 장치다.
  - barrel 충돌: 이 항목은 사용자 질문에서 풀렸다. "barrel을 굳이 공개해야 하나"라는 물음에, 공개 surface를 최소화하는 것이 충돌의 근본 해법이라는 답을 얻었다. cad-web의 개별 부품(StatusBar, LeftPanel, InspectorPanel 등)은 외부 소비가 0이고 `CadWorkspace`가 내부에서 전부 조립하므로, barrel의 부품 export는 미사용 공개 surface다. 이를 내부로 강등하면 `StatusBar` 충돌도 자동으로 사라진다. barrel은 실제로 소비되는 것만 공개한다는 규칙이 유일한 하드 네이밍 규칙으로 남았다.
  - dynamic-form 위치: 이동 비용과 import 갱신을 피하려고 `packages/ui`에 그대로 두되, 공용 디자인시스템이 아니라 apps/web 전용 도메인 슬롯임을 명시했다. SSOT 순수성은 양보한 절충이다. 이로써 Phase 0이 완료됐다.

- design-web 재조사, 범위 결정
  - design-web은 구조는 안정적이지만 `@maxflow/ui` 소비가 0이라 가장 큰 갭이었다. 로컬 shadcn 14개를 `@maxflow/ui`로 전면 교체하는 편입을 확정하되, 라이브러리 모드와 격리 스코프(`:where([data-design-web])`) 때문에 회귀 위험이 커서 지연 실행하기로 했다. 별도 심화 트랙(트랙 D)으로 분리했다. 부록 C에 패키지별 톤앤매너 소비 현황과 커버리지 맵 초안을 정리했다.

- Phase 1 셸 통일 범위
  - 부품만 승격하고 셸 조립은 도메인에 남기기로 정리했다. StatusBar, Toolbar, PropertyPanel은 세 화면에서 모두 등장하는 부품이라 승격 후보로, WorkspaceLayout과 SplitLayout은 셸 조립이라 도메인에 잔류시켰다.

- composite 패키지 위치 (두 번째 사용자 질문이 계기)
  - "의존성을 뺀 골격만 둘 수 있나"라는 사용자 질문에서 구조가 정해졌다. composite는 presentational 골격(룩·구조·슬롯·토큰)만 담고 의존성은 0으로 둔다. TanStack Table/Virtual 같은 데이터·상태 엔진은 composite에 넣지 않고 소비자가 주입한다(headless 분리). 무거운 dep이 `@maxflow/ui`로 들어오지 않으니 `ui-composites`를 따로 쪼갤 필요가 없고, 단일 `@maxflow/ui`로 간다. DataTable은 평면 배열 계약을 받는 chrome만 승격하고 엔진은 주입받는 식이다.

- NavigationTree를 Snb로 통일·승격
  - 좌측 트리를 Snb로 통일해 승격하되 중첩 깊이(level)를 추상화했다. L1은 앱 전역, L2는 도메인 워크스페이스 내부 식으로 단일 `<Snb level={n}>`에 패키지별 프리셋을 얹는다. 이어 Snb API를 "기본값 있는 열린 골격"으로 다듬었다. 기본 형태만 제공하고 내부 트리 내용은 슬롯으로 개방해 소비자가 구성하며, 모양도 override할 수 있게 했다.

- AsyncButton 처리와 Phase 1 마감
  - AsyncButton은 composite가 아니라 Button primitive의 loading/pending variant로 흡수하기로 했다. async 로직은 소비자가 갖는다. 이로써 승격 확정 리스트(composite 5종 + Button variant, 도메인 잔류 2종)가 마감되고 Phase 0·1이 완료됐다.

- Phase 2 톤앤매너 메커니즘 검증과 실행 스펙 초안
  - `theme.css` 한 줄 import가 전역 `st-*` 토큰을 깔아 portal(dialog/popover/tooltip)의 색까지 자동 상속시키는 메커니즘을 직접 확인했다. 다만 소비자는 ui 서브트리 루트에 `data-skin`과 `data-theme` 래퍼를 반드시 둬야 하고(bare border 함정 회피), portal cascade가 필요한 속성은 SkinScopeProvider로 스코프 내 container를 주입해야 한다는 조건을 짚었다. cad-web이 이미 이 레시피를 증명하고 있었다. 이 검증을 토대로 Phase 2~6과 트랙 D의 실행 스펙 초안을 부록 D에 자율 작성했다(구현 코드는 아직 없고 검증과 스펙만).

- 설명 덱 추가와 버그 수정
  - 이 계획을 애니메이션과 목업으로 설명하는 HTML 덱을 추가했다. 작성 중 슬라이드 선택자가 자기 자신을 참조하던 버그(`.slide.active #sN`)를 발견해 수정했다.

## 정리

하루를 관통한 줄기는 "통합의 대상을 코드가 아니라 화면으로 다시 잡는다"였다. 명명 규칙은 "어떻게 부를까"를 다루지만, 정작 사용자에게 닿는 것은 식별자가 아니라 화면의 톤앤매너다. 이 한 발짝의 재정의가 prefix 일괄 강제라는 비싸고 효과 약한 작업을 폐기하게 했고, 대신 토큰과 composite라는 두 레버에 힘을 모으게 했다. 컨벤션도 세 줄로 얇아졌다. 패키지 내부는 자유, 유일한 하드 규칙은 barrel 공개 export의 충돌 안전성, 진짜 통합 레버는 토큰과 composite. 명명 수렴은 composite 승격의 부산물로 따라온다.

배운 점이 두 가지 있다. 하나는 충돌의 진짜 원인이 작명이 아니라 불필요한 공개였다는 것이다. cad-web 부품이 외부 소비 0인데도 barrel로 export되던 것이 `StatusBar` 충돌의 뿌리였고, 공개 surface를 최소화하는 YAGNI 원칙 하나로 충돌이 자동 소멸했다. prefix나 alias 같은 대증요법이 필요 없어졌다. 다른 하나는 composite를 presentational 골격으로 한정하고 엔진을 소비자가 주입하게 하는 headless 분리가 패키지 구조 자체를 단순하게 만든다는 것이다. 무거운 의존성이 공용 패키지로 흘러들지 않으니 패키지를 둘로 쪼갤 이유가 사라졌다.

두 번의 사용자 질문이 결정적이었다는 점도 기록해 둔다. "barrel을 꼭 공개해야 하나"와 "의존성 뺀 골격만 둘 수 있나"라는 두 물음이 각각 경계 규칙과 패키지 구조의 매듭을 풀었다. 막혔던 지점은 대개 더 정교한 규칙이 아니라 전제를 다시 묻는 질문에서 풀린다는 걸 다시 확인했다. 다만 이날은 어디까지나 계약과 스펙을 세운 날이고, composite 추출과 가드레일, 파일럿은 아직 초안 상태로 남아 있다. 실제로 골격을 코드로 뽑아 보면 평면 배열 계약이나 Snb level 의미 같은 데서 추가로 정해야 할 것들이 드러날 것이다.
