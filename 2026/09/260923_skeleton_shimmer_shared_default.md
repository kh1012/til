---
type: "content"
domain: "frontend"
category: "ui-ux"
topic: "스켈레톤 shimmer opacity 통일: 개별 패치 대신 공통 기본값 수정"
updatedAt: "2026-09-23"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "skeleton"
  - "shimmer"
  - "css-custom-property"
  - "react-query-cache"
  - "playwright"

relatedCategories:
  - "css"
  - "performance"
---

# 스켈레톤 shimmer opacity 통일: 개별 패치 대신 공통 기본값 수정

> 워크플로우 캔버스 스켈레톤만 밝기를 낮췄더니 대시보드에서는 여전히 흰 띠가 보였다. 원인은 스켈레톤 구현이 10개 넘게 흩어져 있고 각자 opacity 설정이 달랐던 것.

## 배경

워크플로우 캔버스 스켈레톤의 반짝이는 부분이 너무 밝다는 피드백을 받고
`WorkflowCanvasSkeleton`의 shimmer opacity를 0.85에서 0.3으로 낮췄다.
이어서 "사용하고 있는 스켈레톤 모두 처리해달라"는 요청이 왔다 —
대시보드로 이동했을 때 이전과 같은 흰 띠가 그대로 보인다는 것.

## 핵심 내용

### 감지 실패의 원인은 캐시였다

Playwright로 `data-slot="skeleton"` 속성을 쿼리해 대시보드 스켈레톤을 잡으려 했으나
12번 폴링 모두 0개가 잡혔다. `/api/projects` 요청을 강제로 막아 로딩 상태를
붙잡아 두는 방식으로 다시 시도해도 결과는 같았다. 1.5초 뒤 스크린샷에는
실제 프로젝트 데이터(주소, 진행률 등)가 그대로 렌더링되어 있었다 —
React Query 캐시에 이미 데이터가 있어서 `isLoading`이 true가 되는 구간 자체가
발생하지 않았던 것. 스켈레톤을 못 잡은 이유는 선택자 문제가 아니라
로딩 상태 자체가 없었기 때문이다.

### 스켈레톤 구현이 앱 전체에 10개 넘게 흩어져 있음

코드를 직접 읽어 확인한 결과:

- 설정 페이지 계열(Organization, Security, Preferences 등)은 `AtomicSkeleton`을
  stagger 방식 delay로 사용
- 라우트/워크플로우 계열(`GenericRoute`, `WorkflowCanvas`, `WorkflowNode`)은
  `route-skeletons`에서 sweep 방식으로 사용하며 `sheen` prop으로 opacity를
  개별 지정
- `DesignedProjectDashboardSkeleton`은 `sweep()`에서 delay만 넘기고
  `sheen` prop을 넘기지 않아 `AtomicSkeleton` 기본값(0.85)을 그대로 사용
- 데스크톱 업데이트 배너는 `AtomicSkeleton`을 거치지 않고 `animate-pulse`를
  직접 사용

앞서 적용한 opacity 수정은 `WorkflowCanvasSkeleton` 한 곳에만 `sheen` prop으로
들어가 있었기 때문에, 같은 `sheen` prop을 넘기지 않는 다른 스켈레톤에는
전혀 적용되지 않은 상태였다.

### 사용처마다 patch하지 않고 공통 기본값을 바꿈

각 스켈레톤 구현에 `sheen` prop을 일일이 추가하는 대신
`atomic-skeleton.css`의 `--atomic-skeleton-sheen` 기본값 자체를
light 테마 0.85→0.3, dark 테마 0.07 유지로 변경했다.
`AtomicSkeleton`을 사용하는 모든 컴포넌트가 별도 수정 없이 새 기본값을
상속받는다. Playwright로 계산된 CSS 값을 확인해 `#ffffff4d`(0.3),
`#ffffff12`(0.071)로 실제 반영됐음을 검증했다.

## 정리

- 같은 시각 효과가 여러 컴포넌트에 prop으로 개별 지정되어 있다면,
  사용처를 따라다니며 고치기보다 공유 기본값(CSS custom property, 컴포넌트 기본 prop)을
  고치는 쪽이 누락을 막는다.
- 디버깅 중 "요소가 감지되지 않는다"는 신호는 선택자가 틀렸다는 뜻일 수도 있지만,
  캐시된 데이터 때문에 그 상태 자체가 발생하지 않았다는 뜻일 수도 있다 —
  API를 막아도 로딩 상태가 안 뜨면 캐시부터 의심한다.
