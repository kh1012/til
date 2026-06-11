---
draft: true
type: "content"
domain: "frontend"
category: "build-system"
topic: "design-web을 독립 앱이자 임베드 라이브러리로 이중 운용 - CSS 스코핑·포털 재지정·d.ts 산출"
updatedAt: "2026-06-11"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "vite-lib"
  - "css-scoping"
  - "postcss"
  - "radix-portal"
  - "vite-plugin-dts"
  - "next-dynamic"
  - "monorepo"

relatedCategories:
  - "react"
  - "design-system"
  - "architecture"
---

# 같은 코드베이스를 독립 배포하면서 동시에 임베드 가능한 라이브러리로 만들기

> design-web을 standalone 앱으로도 띄우고, maxflow 안에도 끼워 넣을 수 있게 만들었다. 두 운용 방식을 한 코드에서 지탱하려니 스타일 격리, 포털 탈출, 타입 산출 같은 경계 문제가 하나씩 튀어나왔고, 그걸 차례로 막는 하루였다.

## 배경

design-web은 three.js 기반 디자인 뷰어 패키지다. 지금까지는 독립 앱으로만 띄웠는데, 이걸 maxflow의 한 화면 안에 임베드해서도 쓰고 싶었다. 문제는 "독립 배포"와 "호스트 앱 임베드"가 요구하는 조건이 정반대라는 점이다. 독립으로 돌 때는 :root/body에 전역 스타일을 깔아도 되지만, 남의 앱에 끼어 들어가는 순간 그 전역 스타일이 호스트를 오염시킨다. 그래서 오늘 작업의 실제 주제는 "같은 빌드 산출물을 두 환경 모두에서 깨지지 않게 운용하는 경계 설계"였다. 라이브러리 빌드 체계를 먼저 세우고, maxflow 쪽 어댑터를 붙이고, 운용 규칙을 문서로 박아두는 순서로 진행했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 라이브러리 빌드 체계 구축 (DesignApp·CSS 스코핑·포털 재지정)
  - `src/lib`에 라이브러리 진입점 `DesignApp`을 두고, 그 루트에 `data-design-web` 속성을 부여해 스코프 루트로 삼았다. 임베드 시 이 속성 하위로만 스타일이 적용되게 만드는 앵커다.
  - `vite.lib.config.ts`로 ES 라이브러리 빌드를 분리했다. react 계열은 external로 빼고, CSS는 단일 `style.css`로 묶었다.
  - 핵심은 자체 PostCSS 플러그인이다. 빌드 시 전체 룰을 `:where([data-design-web])`로 스코핑하고, `:root`/`html`/`body` 선택자는 스코프 루트로 치환했다. `:where`를 쓴 이유는 명시도를 0으로 유지해 호스트의 기존 우선순위를 흐트러뜨리지 않기 위해서다. keyframes는 스코핑 대상에서 제외했다.
  - 포털 문제를 같이 풀었다. Radix 기반 컴포넌트(alert-dialog/dropdown-menu/popover/select)는 오버레이를 document.body로 포털시키는데, 그러면 스코프 루트 밖으로 빠져나가 스타일이 안 먹는다. `DesignScopeProvider`/`useDesignScope` 컨텍스트를 만들어 포털 컨테이너를 스코프 루트로 재지정했다. standalone일 때는 컨텍스트가 undefined라 기존 동작(body 포털)으로 폴백되므로, 임베드 모드에서만 동작이 바뀐다.
  - 검증에서 스코프 적용 619회, 미스코프된 :root/body 0건을 확인했다. 부수적으로 uiHooks의 render 중 ref 변이 2건을 effect로 옮겨 react-hooks 규칙도 정리했다.

- maxflow 어댑터 통합 (widgets/design + 데모 라우트 + d.ts 산출)
  - maxflow apps/web의 `widgets/design`에 `DesignAdapter` 하나만 두고, 이걸 패키지와의 유일한 결합점으로 못박았다. next/dynamic ssr:false로 감싼 이유는 three.js와 idb-keyval이 클라이언트 전용이라 SSR 단계에서 죽기 때문이다. 스코프된 style.css를 여기서 import하고 로딩 폴백을 붙였다.
  - `/ko/demos/design` 라우트를 만들어 풀높이 임베드가 실제로 동작하는지 검증했다.
  - 빌드 순서 보장이 까다로웠다. apps/web에 design-web을 workspace:* 의존으로 걸고, predev/prebuild로 build:lib를 선행시켰다. dist-lib은 산출물이라 gitignore 했다.
  - d.ts 산출에서 한 번 막혔다. vite-plugin-dts의 rollupTypes 옵션이 TS6에서 빈 d.ts를 뱉어내서, 파일별 산출(dist-lib/src 미러) 방식으로 바꿨다. 대신 src/lib에서는 상대 import만 쓰도록 강제해 d.ts 경로 재작성 의존을 없앴다. 공개 타입 표면은 DesignApp/DesignAppProps/DesignScope로 슬림하게 좁히고, 도메인 타입 재export는 일단 보류했다.

- 운용 3모드 문서화 + 포트맵 등재
  - README에 세 가지 운용 모드를 적었다. 독립 배포(vite build + VITE_DESIGN_API_URL), maxflow 임베드(build:lib, 스타일 격리, src/lib 상대 import 규칙), 그리고 임베드 완료 현황. 나중에 이 패키지를 만지는 사람이 "왜 상대 import만 쓰지?", "왜 스코프 루트가 필요하지?"를 다시 추적하지 않도록 규칙 자체를 문서에 박았다.
  - architecture.md 포트맵에 9214 design-web / 9215 design-core를 등재했다.

- 어댑터 의존성 lockfile 반영
  - vite-plugin-dts 추가와 apps/web→design-web 링크를 pnpm-lock.yaml에 반영했다.

## 정리

오늘 한 일을 한 줄로 줄이면 "하나의 패키지를 독립 배포와 호스트 임베드 양쪽에서 깨지지 않게 만든 것"이다. 그런데 막상 손을 대보면 이게 단일 기능 추가가 아니라 경계 문제 모음이라는 게 드러난다. 스타일은 어떻게 격리할지, 포털로 탈출한 오버레이는 어떻게 다시 끌고 들어올지, 타입은 어떻게 산출할지, SSR에서 죽는 모듈은 어떻게 막을지가 전부 "남의 영역에 끼어들 때 생기는 충돌"이라는 같은 뿌리를 갖는다.

특히 두 가지 판단이 기억에 남는다. 첫째는 스코핑에 `:where`를 쓴 것이다. 명시도를 0으로 두면 호스트의 우선순위를 건드리지 않으면서도 스코프 안에서는 의도대로 동작한다. 임베드 라이브러리에서 명시도는 곧 침범력이라, 일부러 가장 약한 무기를 골랐다. 둘째는 standalone undefined 폴백이다. 포털 재지정을 컨텍스트로 풀되 기본값을 비워둠으로써, 임베드 모드에서만 동작이 바뀌고 독립 실행은 손대기 전과 완전히 동일하게 유지된다. 새 운용 모드를 추가하면서 기존 모드의 동작 불변을 보장하는 건, 이런 이중 운용 작업에서 가장 신경 써야 할 안전선이다.

rollupTypes가 빈 d.ts를 뱉은 건 예상 못 한 함정이었지만, 거기서 "상대 import만 쓴다"는 제약을 거꾸로 규칙으로 승격시킨 게 오히려 깔끔했다. 도구의 한계를 우회하는 임시방편이 아니라, 그 한계를 피해 가는 코딩 규칙으로 README에 명문화해서 다음 사람이 같은 곳에서 안 막히게 했다.
