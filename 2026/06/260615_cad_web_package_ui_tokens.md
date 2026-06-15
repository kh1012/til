---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "도면→구조모델 변환 패키지(cad-web)를 경량 구조로 신설하고, @maxflow/ui에 토큰 SSOT를 복제해 소비자가 1줄 import로 톤앤매너를 받게 만든 디자인 시스템 토대 작업"

updatedAt: "2026-06-15"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-tokens"
  - "tailwind-v4"
  - "css-source-scan"
  - "data-skin"
  - "monorepo-package"
  - "color-agnostic"
  - "self-contained-controller"

relatedCategories:
  - "tailwind"
  - "monorepo"
  - "css"
---

# 변환 패키지를 새로 세우고 톤앤매너를 1줄 import로 내려보내기

> 도면을 구조모델로 바꾸는 cad-web 패키지를 새로 만들면서, 동시에 그 패키지가 maxflow의 톤앤매너를 어떻게 물려받을지를 정해야 했다. 핵심 결정은 디자인 토큰의 단일 출처를 @maxflow/ui로 복제해두고, 소비자가 theme.css 한 줄만 import하면 색과 스타일을 받게 만든 것이다.

## 배경

cad-web은 도면(CAD)을 받아 구조모델로 변환하는 새 기능 도메인이다. 패키지를 처음부터 세우는 일이라 두 가지를 같이 정해야 했다. 하나는 패키지 내부 구조를 어떻게 잡느냐, 다른 하나는 이 신규 패키지가 maxflow 전체의 톤앤매너를 어떻게 일관되게 물려받느냐다.

후자가 특히 까다로웠다. @maxflow/ui는 그동안 color-agnostic, 즉 색을 직접 들고 있지 않은 중립 패키지였다. 그런데 새 소비자(cad-web)가 maxflow 룩앤필을 그대로 받으려면 토큰 출처가 어딘가 명확히 있어야 한다. 토큰을 apps/web에서 ui로 옮길지, 복제할지부터가 결정 포인트였다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 토큰 SSOT 위치 결정: 이동이 아니라 복제
  - @maxflow/ui를 color-agnostic으로 두는 대신, 토큰의 단일 출처(SSOT)를 packages/ui로 복제하기로 했다. move가 아니라 copy다. apps/web은 자기 토큰을 그대로 유지한다. 이건 사용자가 직접 고른 방향이었다.
  - @maxflow/ui/theme.css를 신설했다. base variant, 토큰, tw-animate, shadcn-template 스타일 복제를 한데 담았고, tailwindcss를 peerDependency로, tw-animate-css를 dependency로 걸었다. 이렇게 해서 소비자는 theme.css 한 줄만 import하면 톤앤매너를 받는다. 일반 패키지 배포 정책에 맞춘 형태다.

- Tailwind v4 소스 스캔 함정 처리
  - 막혔던 점: Tailwind v4가 node_modules 안의 클래스는 스캔하지 않아서, ui와 cad-web의 클래스가 생성되지 않았다. apps/web의 tailwind.css에 `@source` 2줄(ui/src, cad-web/src)을 추가해 스캔 범위에 넣었다. 토큰은 apps/web이 이미 들고 있으므로 거기엔 손대지 않고 소스 경로만 보강했다.

- data-skin 스코핑 함정 처리
  - 막혔던 점: bare border 같은 기본 클래스가 `[data-skin=shadcn-template]` 안에서만 st-border로 해석된다. 그래서 CadSplitLayout 루트에 data-skin을 박아 스킨 스코프를 열어줬다. data-theme(라이트/다크 등)은 소비자 쪽 책임으로 남겼다.

- cad-web 패키지 신설
  - self-contained 컨트롤러(useCadWeb)로 구성했다. 공용 core를 끌어 쓰지 않고 패키지가 자기 안에서 닫히게 했다. 추출과 변환은 stub으로 자리만 잡았고, 포트는 9216, 데모는 `/ko/demos/cad-web`, maxflow 쪽 어댑터는 widgets/cad-web에 뒀다.
  - src 구조: 사용자가 경량 3폴더(model/ui/lib)를 골랐다. flat한 modeler-arch 구조도 있었지만 그건 따를 모범으로 보지 않았다.
  - modeler-arch 연결은 playground만 Tailwind로 배선했고 컴포넌트는 건드리지 않았다. 배선 후 빌드 실패가 났는데, 원인은 gitignore된 jeongja.model.json 부재라는 기존 문제였고 이번 배선과는 무관함을 확인했다.

- README 전수조사 후 선별 갱신
  - 루트와 packages/cad-preprocessing(cad-web의 UI 짝) README를 갱신했다. apps/web이나 docs 등은 이번 변경의 대상이 아니라고 판단해 제외했다. 바뀐 것만 정확히 손대는 쪽으로 범위를 좁혔다.

- 검증
  - cad-web, ui, apps/web 타입체크가 모두 통과했다. playground 빌드에서 st-* 클래스와 토큰, data-skin이 실제로 생성되는지 눈으로 확인했다.

## 정리

오늘 cad-web 패키지 작업의 큰 줄기는 "새 소비자를 세우면서 톤앤매너를 어디서 어떻게 흘려보낼지를 같이 정한 것"이다. 가장 신경 쓴 결정은 토큰을 ui로 옮기지 않고 복제한 것이다. 옮기면 출처가 하나로 깔끔해 보이지만 apps/web의 기존 토큰 의존을 흔든다. 복제는 중복이라는 비용을 지는 대신 apps/web을 건드리지 않고 ui를 자족적인 톤앤매너 출처로 만들 수 있다. 신규 패키지가 1줄 import로 색을 받게 하려면, 출처가 소비 가능한 형태로 패키지 안에 있어야 한다는 게 결론이었다.

기술적으로 가장 손이 많이 간 건 두 함정이었다. Tailwind v4가 node_modules를 스캔하지 않는다는 것, 그리고 기본 클래스가 data-skin 스코프 안에서만 토큰 클래스로 해석된다는 것. 둘 다 "클래스가 생성/적용되는 조건"에 관한 문제다. 토큰을 잘 정의하는 것만으로는 부족하고, 그 토큰이 실제로 스캔 범위에 들어오고(@source) 스킨 스코프 안에서 해석되도록(data-skin) 배선까지 맞춰야 화면에 나타난다. 디자인 시스템은 정의보다 전달 경로에서 막힌다는 걸 다시 확인했다.

패키지 구조에서 경량 3폴더와 self-contained 컨트롤러를 고른 것도 같은 맥락이다. 새 도메인을 공용 core에 일찍 묶으면 변환 로직이 아직 stub인 단계에서 결합이 생긴다. 자기 안에서 닫히게 두면 추출/변환을 독립적으로 키울 수 있고, 안정되면 그때 끌어올리면 된다. flat한 기존 구조를 모범으로 따르지 않은 것도, 익숙함보다 지금 단계에 맞는 가벼움을 택한 판단이었다.
