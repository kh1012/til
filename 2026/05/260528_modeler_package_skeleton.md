---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "건축 모델러 패키지(core/arch) 골격과 독립 배포를 전제로 한 경계 설계"
updatedAt: "2026-05-28"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "monorepo"
  - "peer dependency"
  - "transpilePackages"
  - "adapter pattern"
  - "event map extension"
  - "package boundary"

relatedCategories:
  - "nextjs"
  - "typescript"
  - "react"
---

# 건축 모델러 패키지 골격과 경계 설계

> 도메인 무관 core와 건축 arch로 패키지를 가르고, 독립 npm 분리를 전제로 maxflow를 모르게 두되 어댑터로만 본체와 결합하도록 골격을 세운 작업.

## 배경

건축 모델러를 새 패키지로 시작하는 작업이었다. 처음부터 maxflow 본체에 직접 얽어 넣지 않고, 나중에 독립 npm 패키지로 떼어낼 수 있도록 경계를 먼저 그어 두는 게 목표였다. 이번 범위는 실제 3D 렌더링이나 도면 파싱이 아니라 패키지 구조와 확장 규칙, 통합 데모 라우트를 세우는 골격(stub) 단계다.

## 핵심 내용

### 개별 커밋 기록 (시간순)

- `a1f28063c` feat(modeler): 건축 모델러 패키지 골격과 통합 데모 라우트 추가
  - `modeler-core`(도메인 무관)와 `modeler-arch`(건축)로 패키지를 분리했다. 독립 npm 분리를 전제로 패키지 내부는 maxflow를 모르게 두고 `react`/`react-dom`만 peerDep로 잡았다. 본체 결합은 `apps/web`의 어댑터(`widgets/modeler-arch`)가 전담한다.
  - core 무수정 확장 원칙을 코드로 박았다. `ArchEventMap`을 `EventBase` 확장으로 구성해, core를 건드리지 않고도 토목 등 다른 도메인을 얹을 수 있게 설계했다.
  - 실제 렌더링은 미구현이다. `three` + `react-three-fiber` 연결은 README와 주석 TODO로만 명시하고 이번 커밋엔 넣지 않았다.
  - 통합 데모는 인증 그룹 `(main)` 밖의 `[locale]/demos/modeler-arch`에 두어 auth 없이 확인 가능하게 했다. `next.config`에 `transpilePackages`를 추가해 `next build`에서 패키지의 raw TS가 그대로 들어와 깨지는 함정을 막았다.
  - 패키지 dev 플레이그라운드 포트가 9311인데 Postgres와 충돌해서 9213으로 바꾸고, `architecture.md`와 packages 포트맵에 등록했다.

## 정리

이 작업의 핵심은 "나중에 떼어낼 것을 지금 어떻게 미리 끊어 두느냐"였다.

가장 중요한 결정은 **의존 방향을 한쪽으로만 흐르게 한 것**이다. 패키지(core/arch)는 maxflow를 전혀 모르고 `react`/`react-dom`만 peerDep로 안다. 본체를 아는 쪽은 오직 `apps/web`의 어댑터(`widgets/modeler-arch`) 하나뿐이다. 이렇게 해 두면 패키지를 그대로 들어내 npm에 올려도 본체 의존이 따라붙지 않는다. peerDep로 둔 이유도 같은 맥락인데, 패키지가 react를 직접 번들하면 본체와 react 인스턴스가 둘로 갈려 hook이 깨지기 때문이다.

두 번째는 **core를 건드리지 않고 도메인을 늘리는 확장 규칙**이다. `ArchEventMap`을 `EventBase` 확장으로 짜 두면, 토목 같은 새 도메인은 core 변경 없이 자신의 EventMap만 확장해 얹을 수 있다. core가 안정 축이 되고 도메인 패키지가 가지를 치는 구조라, 도메인이 늘어도 core 회귀 위험이 없다.

마지막으로 빌드/데모 쪽 함정 두 가지를 미리 막았다. 하나는 `transpilePackages`로, 워크스페이스 패키지의 raw TS가 `next build`에 그대로 들어가 트랜스파일 없이 깨지는 걸 방지한 것이다. 다른 하나는 데모 라우트를 인증 그룹 `(main)` 밖에 둔 것인데, 골격 확인 단계에서 로그인 없이 바로 열어 볼 수 있어야 하기 때문이다. 포트 9311이 Postgres와 겹쳐 9213으로 옮긴 것도 같은 결의 사소하지만 막히면 시간 잡아먹는 함정이라, 포트맵 문서에 박아 둔 게 맞았다.
