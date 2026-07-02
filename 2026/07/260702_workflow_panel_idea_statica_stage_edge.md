---
draft: true
type: "content"
domain: "frontend"
category: "workflow-panel"
topic: "워크플로우 패널 마무리. IDEA StatiCa 연동을 Dynamic Island 배지로 단순화하고, React Flow stage 연결선의 두께·중심·끊김을 픽셀 단위로 정합, 노드 호버카드 상태별 콘텐츠 분기 추가"
updatedAt: "2026-07-02"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "workflow-panel"
  - "react-flow"
  - "framer-motion"
  - "dynamic-island"
  - "pixel-alignment"
  - "tailwind-v4"
  - "feature-flag"

relatedCategories:
  - "react"
  - "css"
---

# 워크플로우 패널 마무리: IDEA StatiCa 배지와 stage 연결선 픽셀 정합

> 접합부 설계 노드의 IDEA StatiCa 연동을 다이얼로그에서 Apple Dynamic Island 스타일 배지로 단순화하고, React Flow로 그린 stage 원형 노드 연결선의 두께·수직 중심·끊김을 브라우저 DOM 측정으로 하나씩 맞춰나간 뒤, RPM Day 데모용 노드 호버카드 콘텐츠까지 붙인 워크플로우 패널 다듬기 기록.

## 배경

워크플로우 패널의 시각적 마무리에 집중한 하루였다. 크게 세 갈래였다. 하나는 접합부 설계 노드의 "IDEA StatiCa 연동" UX를 다이얼로그 확인 흐름에서 카드 위에 뜨는 Dynamic Island 배지로 단순화하는 것. 둘은 stage 원형 노드(모델링/해석)를 잇는 연결선이 가장자리(stub)와 중앙(React Flow edge)에서 계속 어긋나 보이던 걸 픽셀 단위로 맞추는 것. 셋은 RPM Day 데모를 위한 노드 호버카드 콘텐츠를 붙이는 것.

특히 연결선 정합은 "어긋나 보인다 → 재확인"이 여러 번 반복됐다. 색이 안 칠해진 것처럼 보이거나, 원 옆만 회색이거나, 접합부에 틈이 보이는 등 증상은 매번 달랐지만, DOM을 실측해 보면 원인이 전부 달랐다. 눈으로 보이는 증상 뒤의 실제 원인(안티에일리어싱, Handle transform, Tailwind 버전 문법 차이)을 하나씩 파는 과정이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- stage 원형 노드 border 색상을 accent-steel로 변경
  - WorkflowControllerRunButton의 accent-steel 톤과 통일하려고 원형 노드 border를 st-border에서 accent-steel로 바꿨다. 처음엔 배지 내부 라벨(WorkflowStageItemBadge)에 적용했다가 위치가 아니라는 피드백을 받고 노드 컨테이너로 정정했다.

- IDEA StatiCa 연동 결과를 노드 위 Dynamic Island 배지로 표시
  - 접합부 설계 노드의 "IDEA StatiCa 연동" 다이얼로그에서 "연동 시작"을 누르면 다이얼로그만 닫히던 것을, 카드 상단 테두리에 걸치는 로고 배지가 뜨도록 바꿨다. 배지 등장은 Apple Dynamic Island 생성 모션(작은 캡슐이 스프링 바운스로 확장)을 framer-motion으로 재현했고, 로고는 Figma에서 PNG로 추출해 넣었다.

- 노드 카드·버튼·연결선 색상 진하게 조정
  - AddButton 기본 border를 accent-ink/16→/28로, NodeCardInner border를 회색 토큰에서 accent-ink/16(기존 hover와 같은 계열)로, stage 연결 edge stroke를 var(--border)에서 var(--accent-steel)로 바꿔 전반적으로 진하게 정리했다.

- IDEA StatiCa 연동 다이얼로그 제거, 컨텍스트 메뉴 클릭 시 바로 배지 표시
  - 확인용 다이얼로그를 아예 없애고 컨텍스트 메뉴 클릭 즉시 카드 상단 배지가 뜨도록 흐름을 단순화했다. 배지 애니메이션에서 opacity 페이드를 빼고(이미 불투명한 캡슐이 스프링으로 커지는 방식) 위치도 카드 중앙에서 우측 상단(right-2)으로 옮겼다.

- 노드 카드·버튼 border·연결선 강도 보정
  - 엣지 색이 안 칠해진 것처럼 보인다는 스크린샷을 받아 DOM을 확인하니 stroke=accent-steel이 opacity 100%로 정상 적용돼 있었다. 실제 원인은 strokeWidth 1px의 안티에일리어싱으로 흐리게 보인 것(버그 아님)이라 1.5로 굵기를 보정했다. AddButton border를 /28→/32, NodeCard는 shadow를 제거하고 border를 /16→/40으로 강화.

- IDEA StatiCa 배지 배경을 완전 불투명 톤으로 변경
  - bg-muted/10(10% 알파)이라 배지 배경에 카드 색이 비쳐 보이던 걸, 완전히 커진 뒤에도 불투명해야 하므로 알파 없는 solid 토큰(bg-background)으로 교체했다.

- stage 연결선 원 옆 커넥터 회색 잔재 수정
  - 엣지 중간만 accent-steel이고 원 옆은 회색으로 보이던 문제. 직전 커밋은 React Flow edge만 바꿨고, 원과 노드 경계를 잇는 커넥터 stub span 2개가 bg-border로 남아 있던 게 원인이었다. 두 stub 모두 bg-accent-steel로 바꿔 DOM 검사로 8개 stub 전부 지정 색을 확인했다.

- IDEA StatiCa 배지 그림자 제거, 테두리 더 진하게
  - shadow-sm을 없애고 border-accent-ink/8→/20으로 올려, 그림자 없이 테두리로만 카드와 분리되는 납작한 느낌을 냈다.

- 연결선-커넥터 수직 중심 어긋남 보정
  - edge 가장자리(stub)와 중앙(React Flow edge) 연결부가 어긋나 보이던 문제. stub span에 top-1/2만 있고 -translate-y-1/2가 누락돼 박스 top이 50%에 위치하면서 1px가 아래로 확장, 중심이 edge보다 약 0.33px 아래로 밀렸다(edge는 Handle 기본 translate로 정중앙). 두 stub에 -translate-y-1/2를 추가해 DOM 측정으로 중심 Y 일치를 확인했다.

- stage 연결선 stub 두께를 edge와 1.5px로 통일
  - stub은 h-px(1px), React Flow edge는 strokeWidth 1.5로 두께가 달라, 같은 viewport zoom(0.6675)에서 각각 0.67px vs 1.00px로 렌더돼 중앙이 더 굵고 진하게 보였다. stub 두 span의 h-px를 h-[1.5px]로 통일하고, 두 값이 서로 다른 파일에 있어 드리프트했으므로 상호 동기화 주석을 달았다. 브라우저 측정으로 두께 일치를 확인.

- stage 연결선 커넥터 끊김 제거 (핸들 0크기로 접기)
  - 원형 배지 stub과 중앙 edge가 만나는 지점마다 약 2.5px 틈이 보이던 문제. 원인은 핸들 숨김 클래스가 Tailwind v3 prefix 문법(!size-0 등)이라 v4 프로젝트에서 무효였던 것. 그래서 React Flow 기본 핸들(5~6px + translate(±50%,-50%))이 살아남아 edge 연결점이 stub 끝보다 바깥으로 밀렸고, 이게 이전 "회색 잔재"의 정체이기도 했다. 핸들을 인라인 style로 0크기로 접어 translate가 0이 되게 하니 연결점이 stub 끝과 정확히 일치했다. Tailwind 유틸리티는 React Flow 스타일시트와 우선순위 충돌로 불안정해 인라인 style로 강제했다.

- Storybook에 react flow 스타일 로드 + stage 배지 연결 스토리 추가
  - preview.tsx에 @xyflow/react/dist/style.css를 import했다. 실제 앱은 app/layout.tsx에서 로드하지만 Storybook엔 없어서, 이게 빠지면 노드가 position:static으로 세로로 쌓여 워크플로우 패널 스토리가 깨졌다(수평 레이아웃 복원). 원형 배지 2개와 연결선 이음새를 격리 검증하는 WorkflowStageBadgeConnection 스토리도 추가.

- 노드 호버카드 상태별 콘텐츠 분기 추가
  - Figma(15-7246) 기준으로 approved/blocked만 구조 갭이 있고 나머지 5개 상태는 기존 i18n/컴포넌트가 이미 일치해 무변경으로 뒀다. "디자인 유지, 내용만 변경" 요청에 따라 배지 색상은 기존 무채색 토큰을 유지. RPM Day 강제승인 대상은 풍하중/지진하중 큐레이션 콘텐츠 맵의 키 목록을 단일 출처로 재사용하고, 클라이언트 컴포넌트라 NEXT_PUBLIC_ 접두사가 필요해 선례를 따라 NEXT_PUBLIC_RPM_DAY_MOCKUP 플래그로 확정했다. approved인데 큐레이션 데이터가 없는 노드는 기존 렌더링을 유지해 회귀를 막았다. RPM 데이 종료 후 이 플래그와 관련 코드는 삭제 예정.

## 정리

이 흐름에서 반복된 건 "눈에 보이는 증상과 실제 원인이 매번 다르다"는 것이었다. 연결선이 어긋나 보이는 문제만 해도, 색이 안 칠해진 듯 보인 건 사실 안티에일리어싱이었고, 원 옆만 회색이던 건 커넥터 stub이 다른 파일에 남아 있어서였고, 접합부의 틈은 Tailwind v3 prefix 문법(!size-0)이 v4에서 무효라 React Flow 기본 핸들의 translate가 살아남았기 때문이었다. 스크린샷만 보고 색을 더 칠하거나 두께를 키우는 대신, 매번 브라우저 DOM을 실측해(gapX, 중심 Y, 렌더 두께 px) 원인을 특정한 게 결과적으로 정확했다. 특히 "색이 안 칠해졌다"는 리포트를 받고도 DOM에서 stroke가 정상임을 먼저 확인한 판단이, 엉뚱한 곳을 고치는 걸 막아줬다.

두 span의 두께 값이 서로 다른 파일에 있어 드리프트했던 것처럼, 같이 움직여야 할 값이 떨어져 있으면 언젠가 어긋난다는 것도 다시 확인했다. 상호 동기화 주석은 임시방편이지만, 최소한 다음 사람이 한쪽만 바꾸는 걸 경고해준다.

IDEA StatiCa 연동은 방향이 반대였다. 다이얼로그로 한 번 확인받던 흐름을, 클릭 즉시 배지가 뜨는 방식으로 단계를 걷어냈다. 확인 다이얼로그가 주는 안전장치보다, 데모에서 결과가 즉각 드러나는 경쾌함을 택한 결정이었다. RPM Day mockup 플래그처럼 "행사 후 삭제 예정"을 커밋에 명시해 둔 것도, 임시 코드가 영구 코드로 눌러앉지 않게 하는 안전선이었다.
