---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "편집기 크롬(툴바·인스펙터·컨텍스트·다이얼로그) 자체의 시각 위생을 chrome-lint 규칙에 맞춰 조인 날. 새벽엔 design-rounds 형태 규칙을 소유(owned) 토큰으로 접어 figma-treatment의 !important를 18에서 4로 줄였고, 낮엔 OpenPencil 도구와 갤러리 프리미티브 사이 토큰 매핑을 문서화하며 드리프트 감지 스크립트를 붙였다. chrome-lint를 실사용처인 page-harness로 이관하고 SCOPE↔JURISDICTION 정책으로 오탐을 정밀 면제했으며, 저녁엔 크롬·인스펙터·compose 세 그룹의 하드코딩 radius/font/height/색/그림자를 st 토큰과 밀도 토큰으로 한꺼번에 갈아끼웠다. 규칙을 끄지 않고 지키게 만드는 태도로 관통했다"
updatedAt: "2026-07-19"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "chrome-lint"
  - "design-tokens"
  - "figma-treatment"
  - "openpencil"
  - "token-mapping"
  - "css-variables"
  - "owned-tokens"
  - "focus-ring"
  - "radius-compliance"
  - "important-reduction"

relatedCategories:
  - "css"
  - "tooling"
  - "testing"
---

# 편집기 크롬 chrome-lint 토큰 컴플라이언스와 owned 토큰 정리

> 편집기 크롬 자체의 시각 위생을 chrome-lint 규칙에 맞춰 조인 날. 새벽 owned 토큰 정리로 !important를 18에서 4로 줄이고, OpenPencil 토큰 매핑과 드리프트 스크립트를 붙이고, chrome-lint를 page-harness로 이관했으며, 저녁엔 크롬·인스펙터·compose 세 그룹을 한꺼번에 토큰으로 치환했다.

## 배경

편집기 크롬(툴바, 인스펙터, 컨텍스트 메뉴, 다이얼로그) 자체의 시각 위생을 chrome-lint 규칙에 맞춰 조이는 게 이 갈래의 하루였다. 새벽엔 design-rounds의 형태 규칙을 소유(owned) 토큰으로 접었고, 낮엔 OpenPencil 디자인 도구와 갤러리 프리미티브 사이의 토큰 매핑을 문서화하며 드리프트 감지 스크립트를 붙였다. 저녁엔 크롬, 인스펙터, compose 스타일 그룹을 한꺼번에 토큰으로 치환하는 대청소를 돌려 하드코딩된 radius/font/height/색/그림자를 st 토큰과 밀도 토큰으로 갈아끼웠다.

목표는 편집기 크롬 전반의 chrome-lint ERROR와 WARN을 눈에 띄게 줄이는 것이었고, 그 방식은 규칙을 끄는 게 아니라 지키게 만드는 것이었다. 오탐이면 왜 오탐인지 근거를 코드에 박고, 강제로 덧씌우던 규칙은 소유한 토큰 한 겹으로 접었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- design-rounds 형태 규칙을 owned 토큰으로 접기
  - design-rounds.css의 형태 규칙(75줄 재작업)을 소유한 --editor-* 토큰으로 접고, R18 input-well의 add 규칙을 제거했다. 규칙이 외부 값을 강제로 덧씌우던 걸 편집기가 소유하는 토큰 한 겹으로 정리했다.

- figma-treatment !important 감축
  - figma-treatment.css의 !important를 18개에서 4개로 줄였다. add(덧씌움)를 제거하니 strip(벗겨내기)이 불필요해진 구조였다. 함께 styles.css의 @import 순서 독립성을 주석으로 명시해, 로드 순서에 결과가 흔들리지 않음을 문서화했다.

- DetailRoute 주 액션 버튼 height 일관성
  - DetailRoute 주 액션 버튼 높이를 36px에서 32px로 낮춰 다른 액션 버튼과 일관성을 맞췄다.

- chrome:lint WARN 카드중첩 근거 주석
  - chrome:lint가 낸 WARN 17건(border와 radius 결합으로 인한 카드중첩 의심) 각 표면에 왜 오탐(15건)인지, 또는 왜 헤어라인 전환이 보류인지(실제 중첩 2건, 반경 6px가 4px 초과 ERROR와 결합) 1줄씩 근거 주석을 남겼다. ERROR 135는 불변, WARN 17은 존속. 린트를 끄는 대신 판단 근거를 코드에 박아둔 방식이다.

- openpencil 드리프트 dev 스크립트
  - openpencil-drift.mjs(240줄)를 붙였다. OpenPencil이 설치돼 있으면 갤러리 토큰과의 드리프트를 감지하고, 미설치면 no-op으로 조용히 넘어가는 선택적 dev 스크립트다.

- OpenPencil과 갤러리 토큰 매핑 문서
  - OpenPencil 디자인 도구의 색/스페이싱/radius/size/width/surface/text와 갤러리의 --ph-* 토큰 사이 매핑을 mapping.md에 정리했다.

- OpenPencil 디자인-JSX 어휘 매핑
  - OpenPencil의 디자인-JSX 어휘(Frame/flex/gap/w=hug|fill/rounded/bg)를 갤러리 프리미티브에 대응시켰다.

- mapping.md --st-ring hue 예외 정정
  - 리뷰 지적을 반영해 mapping.md의 --st-ring hue 예외를 정정했다.

- 인스펙터 입력 반경 4px 이하로
  - 인스펙터 입력의 반경을 4px 이하로 낮추고(F-07), figma-treatment의 radius 우선 강제를 4에서 3으로 줄여 제거 방향으로 뒀다.

- 인스펙터 카드 반경 제거
  - 인스펙터 카드의 반경을 제거해 카드중첩 WARN과 ERROR를 소거했다(F-05).

- chrome-lint를 page-harness로 이관하고 scope 정책 신설
  - chrome-lint.mjs와 selftest를 ui-harness에서 page-harness/scripts로 정식 이관했다. 위반의 절대다수와 실사용처가 page-harness라 소비처로 편입한 것이다. ui-harness에는 새 경로로 위임하는 하위호환 shim만 남겨 기존 문서와 워크아이템의 옛 경로 참조가 안 깨지게 했다. 같은 커밋에 SCOPE와 JURISDICTION 정책을 신설하고, CONTENT_DECORATIONS allowlist(콘텐츠 장식 5셀렉터, 색과 그림자만 면제하고 반경/font/tell은 그대로 적용)로 motion.css 12건 오탐을 해소했다. selftest 회귀가드 4케이스를 추가했다. ERROR는 135에서 121로, WARN은 17에서 15로 줄었다.

- 크롬 그룹 토큰 치환
  - 저녁 대청소의 1탄이다. 크롬 그룹(canvas-theme, context-card, hamburger, quick-inserter, undo-toast, wireframe-grid, scrollbar 등)의 radius/font/height/box-shadow/색을 토큰으로 치환하고 scrollbar 같은 furniture 토큰을 도입했다. chrome-lint의 크롬과 전역 스타일 위반을 0으로 맞췄다.

- 인스펙터 그룹 토큰 치환
  - 인스펙터 그룹(align-pad, bento-skeleton, scrub, segment, token-swatch 등)의 radius를 radius-sm과 50%로, font를 11/12/13으로, 포커스 링을 box-shadow에서 outline으로 바꿨다. square는 aspect-ratio로, greek/bento canvas는 형태 규칙을 준수하게 했다.

- compose와 fields 그룹 토큰 치환
  - compose와 fields 그룹(dock, nav-panel, toolbar, zoom-dock, page-size 등)을 치환하며 floating pill/dock의 elevation을 제거하고, pill radius를 radius-md와 50%로, height를 밀도 토큰과 calc로 바꿨다. 포커스 링은 outline으로, 주석 안 hex도 정리했다.

- SaveNoteDialog rounded와 selftest 가드 갱신
  - SaveNoteDialog의 rounded-md를 rounded로 4건 바꾸고 포커스 ring tell을 제거(border-color 포커스로 대체)했다. selftest의 no-op 가드를 ERROR 0인 클린 코드베이스에서도 통과하도록 갱신했다.

- cheatsheet 스크림 색을 color-mix로
  - cheatsheet 스크림 색을 color-mix(black)로 바꿔, 다크에서 뒤집히는 st-foreground 대신 원본 흑색 40%를 양 테마 동일하게 정확히 보존했다.

## 정리

이 갈래의 하루는 규칙을 끄지 않고 지키게 만든다는 태도로 관통됐다. chrome:lint가 낸 WARN을 무마하려 규칙을 끄는 대신, 오탐이면 왜 오탐인지 근거 주석을 코드에 박고, 실제 중첩이면 그대로 남겨 판단을 코드가 기억하게 했다. 저녁의 그룹 토큰 치환 대청소는 크롬, 인스펙터, compose 세 그룹의 하드코딩된 radius/font/height/색/그림자를 st 토큰과 밀도 토큰으로 한꺼번에 갈아끼워, 편집기 크롬 전반이 같은 토큰 어휘를 쓰게 만들었다.

배운 점은 강제로 덧씌우기(add, !important)보다 소유한 토큰 한 겹이 더 튼튼하다는 것이었다. 새벽에 design-rounds의 형태 규칙을 owned --editor-* 토큰으로 접자 figma-treatment의 !important가 18개에서 4개로 자연히 줄었다. add를 없애니 strip이 불필요해진 것처럼, 무언가를 덧씌우고 다시 벗겨내는 구조 자체가 부채였다. chrome-lint를 실사용처인 page-harness로 이관하면서 옛 경로에 포워딩 shim을 남겨 참조를 안 깨뜨린 것, SCOPE와 JURISDICTION 정책으로 콘텐츠 장식의 오탐을 정밀하게 면제한 것도 규칙을 더 정확하게 만든 작업이었다.
