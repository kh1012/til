---
draft: true
type: "content"
domain: "frontend"
category: "routing"
topic: "프로젝트 카드가 rootWorkflowInstanceId가 있으면 클라이언트 리다이렉트를 건너뛰고 /workflows/{root_id}로 바로 가게 하고, 표시 정의명과 직링크 대상 run을 한 번에 고르는 헬퍼로 일치를 보장한 뒤, /projects로 통합되어 빈 껍데기만 남은 /dashboard redirect 라우트를 삭제하기"

updatedAt: "2026-06-17"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "direct-link"
  - "client-redirect-skip"
  - "single-source-selection"
  - "dead-route-removal"
  - "route-consolidation"
  - "fallback"

relatedCategories:
  - "nextjs"
  - "architecture"
---

# 진입 경로에서 중간 점프를 빼고, 통합으로 빈 라우트를 치우기

> 프로젝트 카드를 누르면 일단 프로젝트로 갔다가 클라이언트에서 다시 워크플로우로 튕기는 중간 점프가 있었다. root 인스턴스 id를 이미 알면 바로 워크플로우로 보내 그 점프를 없앴다. 그리고 /projects가 대시보드 역할을 흡수하면서 redirect만 남은 /dashboard 라우트는 실체가 없어, 빈 껍데기를 치웠다. 둘 다 진입 경로에서 쓸모없어진 중간 단계를 걷어내는 작업이었다.

## 배경

프로젝트 카드에서 워크플로우로 가는 경로에 군더더기가 있었다. 카드를 누르면 /projects/{key}로 갔다가, 거기서 클라이언트 컴포넌트(WorkflowRootRedirect)가 root run을 찾아 다시 /workflows/{root_id}로 튕겼다. 이미 카드 데이터에 root 인스턴스 id가 들어 있는 경우라면, 굳이 중간을 거쳐 클라이언트에서 한 번 더 리다이렉트할 이유가 없었다.

비슷한 군더더기가 라우트에도 있었다. /projects가 프로젝트 목록 겸 대시보드 역할을 흡수하면서, /dashboard는 redirect만 남은 빈 라우트가 됐다. 통합이 끝나고 나면 통합 전의 입구는 실체 없는 껍데기로 남는다. 오늘은 이런 "통합·직링크 이후 쓸모없어진 중간 단계"를 진입 경로에서 걷어내는 데 시간을 썼다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 카드 root 워크플로우 인스턴스 직링크
  - 카드 데이터에 rootWorkflowInstanceId가 있으면 /workflows/{root_id}로 바로 보내고, 클라이언트의 WorkflowRootRedirect 단계를 생략했다. id가 없으면 기존대로 /projects/{key}로 폴백한다. 핵심은 일관성 보장이다. 카드에 표시하는 정의명과 직링크로 보낼 대상 run이 서로 다른 데이터에서 뽑히면 어긋날 수 있어서, pickProjectRootRun 헬퍼를 추출해 둘을 단일 선택으로 묶었다. 같은 run에서 표시명과 링크 대상을 함께 고르게 하니 표시와 이동이 항상 같은 대상을 가리킨다.
  - 이 커밋엔 부수 정리도 함께 묶였다. dev 스크립트에 db:start·migrate 선행을 넣고 dev:desktop을 분리했고, lint도 손봤다. project-files의 set-state-in-effect 4건 중 FilePreview는 호출처 key로 path가 불변이라 죽은 effect 2개를 제거하고, 선택 동기화 2건은 의도된 동작이라 disable로 남겼다. project-switcher는 머지로 코드가 짧아져 불필요해진 max-lines disable을 걷어냈다.

- /dashboard redirect 라우트 삭제
  - /projects가 대시보드(프로젝트 목록)로 통합 완료되어, /dashboard는 redirect만 남은 실체 없는 라우트가 됐다. 코드 안에 실제 /dashboard 링크가 없는지부터 확인했고, 걸린 건 주석·i18n 메시지·스토리 mock뿐이라 안전하게 지웠다. 외부에서 들어오던 /dashboard 링크는 이제 404가 되며, 하위호환은 의도적으로 종료했다.

## 정리

오늘의 한 줄은 "통합과 직링크로 의미를 잃은 중간 단계를 진입 경로에서 걷어내기"다.

직링크에서 신경 쓴 건 속도보다 일관성이었다. 클라이언트 리다이렉트 한 번을 줄이는 것 자체도 이득이지만, 더 중요한 건 카드에 보이는 정의명과 눌렀을 때 가는 대상이 같은 run에서 나오게 묶은 것이다. 표시값과 이동 대상을 서로 다른 경로로 고르면 "보이는 것과 가는 곳이 다른" 미묘한 버그가 생긴다. pickProjectRootRun으로 선택을 한 곳에 모으니 그 어긋남의 여지 자체가 사라졌다. 직링크의 핵심은 점프를 줄이는 게 아니라 단일 출처를 만드는 데 있었다.

/dashboard 삭제는 통합 작업의 뒷정리다. /projects가 대시보드를 흡수한 순간 /dashboard는 redirect만 남은 껍데기가 됐는데, 이런 빈 라우트를 남겨두면 "이건 뭐 하는 라우트지"를 나중에 다시 묻게 된다. 지우기 전에 코드 안 실제 링크가 없는지 확인하고(주석·i18n·mock만 걸림), 외부 링크 404는 하위호환 종료로 받아들였다. 통합이 끝났으면 통합 전의 입구도 같이 치워야 라우트 맵이 현재 구조와 일치한다는 걸 다시 정리했다.
