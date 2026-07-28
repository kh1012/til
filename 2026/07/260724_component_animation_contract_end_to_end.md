---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "컴포넌트에 애니메이션을 붙이는 일을 DOM 추론이 아니라 레지스트리 타입 계약으로 다시 정의한 하루. Composite는 명시적 target을, Animations는 standalone 또는 portable behavior를 선언하게 하고, 인증된 (behaviorId, targetId) 쌍만 페이지 편집기 인스펙터에 노출되도록 계약을 만들었다. 이어서 그 계약이 편집기 바인딩 정규화, AnimationHost 런타임 어댑터, codegen behavior 래핑, refine/eject hard rules까지 끊기지 않고 관통하게 배선했다"
updatedAt: "2026-07-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "page-harness"
  - "animation-contract"
  - "registry"
  - "portable-behavior"
  - "capability-matching"
  - "codegen"
  - "reduced-motion"
  - "single-source-of-truth"

relatedCategories:
  - "react"
  - "typescript"
  - "accessibility"
---

# 애니메이션을 "붙일 수 있는지"를 DOM이 아니라 계약이 판정하게 만든 날

> Composite는 target을, Animations는 standalone/behavior를 명시 선언하게 하는 레지스트리 계약을 세우고, 그 계약이 편집기 인스펙터에서 런타임 어댑터, codegen, eject 프롬프트까지 한 줄로 관통하도록 배선했다.

## 배경

ui-harness 레지스트리에는 `Composite`(조합 컴포넌트), `Animations`(모션), `System` 세 카테고리가 있다. 그동안 "이 컴포넌트에 저 애니메이션을 적용할 수 있는가"는 사람의 눈과 감으로 판정하고 있었다. 렌더된 태그가 `button`이니까 ripple을 붙일 수 있겠지, `children`이 있으니까 감쌀 수 있겠지 하는 식이다.

이 추론이 위험한 이유는, 근거가 컴포넌트 작성자가 지키기로 약속한 것이 아니라 **구현 디테일**이라는 데 있다. 내부 마크업이 `button`에서 `div[role=button]`으로 바뀌면 아무도 모르는 사이에 호환성 판정이 뒤집힌다. 페이지 문서에 저장된 애니메이션 바인딩은 그대로인데 런타임 결과만 달라진다.

그래서 오늘의 방향은 "애니메이션을 하나 더 만든다"가 아니라, **호환성 판정의 근거를 추론에서 선언으로 옮긴다**였다. 그리고 선언으로 옮겼으면 그 선언이 편집기 UI, 저장 포맷, 런타임, 코드 생성까지 같은 값을 쓰는지를 끝까지 따라가야 했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 타입 있는 애니메이션 레지스트리 계약의 토대
  - `docs/ui-harness/component-animation-contract.md`를 정본 문서로 두고, 실제 구현은 `packages/ui-harness/src/animation-contract.ts`에 뒀다. 문서 첫 줄에 "DOM·태그·컴포넌트 이름·`children` 유무로 호환성을 추론하지 않는다"를 원칙으로 못 박았다.
  - `Composite`는 `meta.animation.kind: "target"`과 명시적 `targets`를 선언한다. 각 target은 `id`(엔트리 안에서 유일, 페이지 문서에 저장되는 값이므로 DOM 순서나 자동 인덱스 금지), `location`(`root`|`part`), `host`(`inline`|`block`|`part`), `capabilities`(`pressable`·`surface`·`overlay-anchor`·`pointer-trackable`·`list`·`text`)를 갖는다. `list` capability면 `keyProp`, `text`면 `textProp`, `location: "part"`면 `part` hook 이름을 반드시 함께 낸다.
  - 여기서 중요한 설계 판단은 `host`와 `part`의 성격이다. `host`는 렌더된 태그를 보고 추정하는 값이 아니라 컴포넌트 작성자가 지키기로 한 레이아웃 계약이고, `part`는 CSS selector가 아니라 소스/어댑터가 이름으로 제공하는 hook이다. 둘 다 "관찰해서 알아내는 것"이 아니라 "약속해서 지키는 것"으로 뒀다.
  - `Animations`는 `standalone`(자체 dialog·focus·portal·데이터 수명주기를 소유하는 완결된 컴포넌트)과 `behavior`(불투명한 target에 부착 가능하고 target의 의미를 소유하지 않음) 중 정확히 하나를 선언한다. behavior는 `behaviorId`(저장 포맷에서 불변인 유일 id), `exportName`(TS 소스가 실제로 named export해야 함), `requires` capabilities, `acceptsHosts`, `triggers`(`load|hover|focus|press|change|in-view`만 허용), `defaultTrigger`, `parameters`(enum 또는 등록된 토큰 scale만, 자유 string/number/physics 금지), `reducedMotion`(`static-feedback|opacity-only|disabled`, 생략 불가)을 낸다.
  - `targets: []`를 "적용 가능한 애니메이션 없음"이라는 **유효한 선언**으로 정의한 게 마음에 든다. 빈 배열과 메타데이터 누락을 구분하지 않으면, 계약을 안 쓴 엔트리와 "쓸 수 없다고 명시한" 엔트리가 같은 취급을 받는다.
  - 반대로 메타데이터가 없거나 잘못됐으면 런타임 조회 결과는 **항상 없음**이다. 검증을 우회해 호환성을 만들어내는 경로를 아예 두지 않았다.
- 애니메이션 export와 토큰 레지스트리 검증 보강
  - 앞 커밋에서 만든 계약이 실제 빌드 파이프라인(`ui-index.mjs`, `ui-valid.mjs`)에서 새는 지점들을 막았다. `exportName`으로 선언한 이름이 실제로 존재하는 named export인지, behavior 파라미터가 참조하는 토큰 scale이 등록된 것인지를 검증 단계에서 잡게 했다.
  - `animation-token-scales.ts`를 따로 둬서 파라미터가 쓸 수 있는 scale 목록을 한 곳에 모았다. 파라미터를 enum과 등록된 토큰으로 제한한 이상, "등록된"의 출처가 단일해야 검증이 의미를 가진다.
- 기존 컴포넌트 메타데이터 백필과 v1 behavior 매트릭스 인증
  - 계약을 만들었으니 이미 있는 100여 개 레지스트리 엔트리에 `meta.animation`을 채워 넣어야 했다. `searchable-dropdown`, `selector`, `sheet`, `sidebar`, `table`, `toast`, `stepper`, `zoom-control` 등 전 범위에 target 선언을 붙였다.
  - 동시에 v1 시점의 portable behavior 두 개를 실제로 만들어 매트릭스를 인증했다. `hover-highlight`와 `ripple-button`을 behavior로 재구성하면서 어댑터가 자기 host element와 trigger를 직접 소유하도록 고쳤다. `animation-integration.test.tsx`로 behavior와 target 조합이 계약대로 붙는지를 검증했다.
  - 백필은 지루한 작업이지만 여기서 타협하면 계약이 "새로 만드는 것에만 적용되는 규칙"이 되어버린다. 기존 자산이 전부 계약을 만족해야 편집기가 "인증된 쌍만 보여준다"를 약속할 수 있다.
- zoom-control 엔트리 props 스키마 드리프트 동기화
  - 백필 과정에서 `zoom-control` 엔트리의 props 스키마가 실제 컴포넌트와 어긋나 있는 걸 발견해 맞췄다. 계약을 강하게 검증하기 시작하면 이런 기존 드리프트가 드러난다. 검증을 켠 보람이 있는 부작용이다.
- component-create 절차에 target/behavior 분류를 편입
  - 컴포넌트를 새로 만드는 스킬 가이드(`skills/component-create/GUIDE.md`)에 "소스 생성 전 필수" 체크포인트를 넣었다. 카테고리를 정하는 순간 `meta.animation`도 같이 확정하게 만든 것이다.
  - Composite면 target 배열(또는 명시적 빈 배열)과 증거 의무(part hook, keyProp, textProp)를, Animations면 standalone/behavior 중 하나와 필수 필드를 그 자리에서 채우게 했다. 금지 사항도 명시했다. DOM 셀렉터·태그·이름 추론으로 capability를 주장하는 것, behavior에 자유 string/number/physics 파라미터를 두는 것, Button 주변에 또 `<button>`을 두르는 중첩 조작 요소를 렌더하는 것.
  - "컴포넌트 X에 애니메이션 적용" 요청이 들어오면 모든 `Animations` 엔트리를 무차별 제안하지 말고 `compatiblePairs`로 인증된 조합만 제안하라는 규칙도 넣었다. 계약을 만들어도 그 계약을 우회하는 추천 경로가 남아 있으면 소용이 없다.
  - 스토리 요구사항도 계약에 맞춰 갱신했다. behavior 스토리는 요구 capability/host 조합, reduced-motion, 키보드 접근성, interruption, replay를 검증하고, target 스토리는 선언한 모든 target `id`를 실제로 작동시켜야 한다.
  - 계약 격리 규칙도 명시했다. 페이지 편집기의 `_animation` 저장 포맷은 별도의 런타임 계약이므로 컴포넌트의 TypeScript Props나 `meta.props`로 새어나가면 안 된다.
- 순수 애니메이션 바인딩 정규화 모듈
  - 여기서부터는 계약을 페이지 편집기 쪽에서 소비하는 작업이다. 레지스트리 계약은 엄격하다. 선언된 파라미터가 빠졌거나 모르는 키가 있으면 바인딩을 거부한다. 그런데 편집기는 작성자의 의도를 저장하는 곳이라 그 엄격함을 그대로 쓰면 예전에 저장한 페이지를 열 수 없다.
  - 그래서 `binding.ts`를 두고 **계획이 허용한 딱 두 방향으로만** 관대하게 만들었다. 선언된 파라미터가 빠졌으면 선언된 기본값으로 채우고, 모르는 파라미터 키는 검증 전에 버린다. 나머지(버전, 정확한 behavior/target 쌍, host·capability 일치, 선언된 trigger, 선언된 파라미터 *값*)는 전부 엄격하게 유지하고, 실패하면 구조화된 진단과 함께 런타임 바인딩을 `null`로 낸다.
  - 그리고 **원본 값을 절대 다시 쓰지 않는다**. 유효하지 않은 바인딩을 자동으로 고쳐 저장하면, 예전 페이지를 열어보기만 해도 문서가 바뀐다. 열기가 비파괴적이어야 한다는 게 이 모듈의 핵심 제약이다.
  - `undefined`(값 자체의 부재)만이 유일한 "none"이고 그건 오류가 아니다. 반대로 값이 있는데 해석되지 않으면 조용히 없는 척하지 않고 진단을 낸다.
- 애니메이션 인스펙터 섹션·필드 주입과 다중선택 교집합
  - 편집기 인스펙터에 애니메이션 섹션을 붙였다. 핵심은 `pairs.ts`다. "쌍(pair)"은 Composite 엔트리가 portable behavior와 호환된다고 인증한 정확한 `(behaviorId, targetId)` 조합이고, 인스펙터는 **인증된 쌍만** 제시한다.
  - 다중선택일 때는 선택된 모든 컴포넌트 타입의 쌍 **교집합**만 제시한다. 하나라도 쌍이 없는 타입이 섞이면 결과는 빈 목록으로 붕괴한다. 이렇게 해두면 작성자가 지원하지 않는 노드에 behavior를 바인딩하는 일이 UI 레벨에서 불가능해진다.
  - 적용은 `apply.ts`의 순수 Puck 데이터 변환으로 했다. React를 섞지 않아 그대로 테스트할 수 있고, 편집기 필드가 이들을 하나의 `setData({ recordHistory: true })` 디스패치 안에서 실행해 **한 번의 편집이 한 번의 히스토리 스텝**이 되게 했다. Undo 한 번이 이전 객체를 정확히 복원한다.
  - `setAnimationOnNodes`는 `supports(type)`가 참인 노드에만 쓰고 나머지는 손대지 않는다. 인스펙터가 이미 교집합으로 걸렀더라도, 데이터 레이어에서 한 번 더 막는 게 맞다. `clearAnimationOnNodes`는 `_animation` 키를 삭제하는데, 이는 "none은 키의 부재"라는 정규화 모듈의 정의와 맞물린다.
- AnimationHost 런타임 어댑터 배선
  - 편집기·공개 페이지·상세·eject가 공용으로 쓰는 단일 런타임 seam을 만들었다. `AnimationHost`는 `<BehaviorAdapter>{child}</BehaviorAdapter>` 형태로 감싸기만 하고, **DOM 요소를 추론해서 조회하거나 clone하지 않는다**. 어댑터가 자기 host element와 trigger를 소유한다는 계약을 런타임에서도 지킨 것이다.
  - behavior 청크는 엔트리가 선언한 export 이름으로 lazy 로드한다. 바인딩이 없는 노드는 그 청크를 아예 불러오지 않는다.
  - 로드 실패와 lazy suspense 둘 다 원래 child 경로로 폴백한다. 망가진 behavior가 노드를 통째로 비워버리는 일이 생기면 안 된다. 애니메이션은 부가 레이어이므로 실패해도 콘텐츠는 남아야 한다.
  - reduced-motion과 trigger 의미는 호스트가 재해석하지 않고 어댑터 안에 그대로 뒀다. 그게 올바른 층위다. 호스트가 어댑터의 판단을 되짚기 시작하면 계약이 두 곳에 생긴다.
- codegen의 `_animation` 소비와 browser/CLI resolver 동형성
  - 페이지를 JSX로 뽑는 codegen이 `_animation`을 읽어 컴포넌트를 metadata에 선언된 behavior export로 감싸게 했다. 래핑 위치는 스페이싱/사이징 래퍼의 **안쪽**이다. 여백 래퍼가 애니메이션 바깥에 있어야 레이아웃이 흔들리지 않는다.
  - `resolveBehavior`는 레지스트리 접근이 있는 주입 콜백으로 뒀다. codegen 자체는 레지스트리를 모르고, 정규화(v1·정확 쌍·트리거·파라미터)는 주입된 콜백이 수행한다. none이거나 invalid면 `null`을 반환해 import도 wrapper도 방출하지 않는다. 무회귀다.
  - 브라우저(EditRoute)와 CLI(page-codegen)가 **같은 codegen을 타므로** 산출 JSX가 바이트 단위로 동일하다. 코드 생성기가 두 벌이 되는 순간 "편집기에서 본 것"과 "빌드가 뽑은 것"이 갈라지기 시작한다.
- 애니메이션 영속성·왕복 보존과 refine/eject hard rules
  - 마지막으로 바인딩이 저장→로드 왕복에서 보존되는지, 그리고 AI가 페이지를 다듬거나(refine) 실제 코드로 빼낼 때(eject) 애니메이션을 뭉개지 않는지를 테스트로 고정했다.
  - hard rules에 `_animation`이 v1 bounded 레지스트리 바인딩이며 네 필드(`behaviorId`, `targetId`, `trigger`, `params`)가 전부 보존돼야 한다는 것, 그리고 바인딩을 임의의 CSS/keyframes/transition으로 **대체하는 것을 금지**한다는 것을 명시했다. eject 프롬프트에는 behavior 래퍼와 출처 주석(`Ejected from page mockup: <slug> @ <version>`)이 남는지를 검증했다.
  - AI가 코드를 만지는 단계에서 "여기 ripple이 있네, CSS transition으로 바꿔주자" 같은 선의의 변환이 일어나면 계약이 무너진다. 그걸 프롬프트 레벨 hard rule로 막고 테스트로 감시하게 한 것이다.

## 정리

오늘 관통한 줄기는 하나다. **호환성을 추론하지 말고 선언하게 하고, 그 선언을 끝까지 같은 값으로 쓰게 하라.**

계약을 만드는 것 자체는 절반이다. 나머지 절반은 그 계약이 새는 지점을 다 막는 일이었다. 오늘 막은 구멍을 세어보면 이렇다. 빌드 검증(`ui-valid`)이 export 이름과 토큰 scale을 확인하지 않던 것, 기존 100여 개 엔트리에 메타데이터가 없어 계약이 신규 컴포넌트에만 적용되던 것, 컴포넌트 생성 가이드가 여전히 "모든 Animations를 제안"하고 있던 것, 편집기 인스펙터가 인증되지 않은 조합을 제시할 수 있던 것, 런타임 호스트가 DOM을 추론해 요소를 찾을 수 있던 것, codegen이 browser와 CLI 두 벌로 갈라질 수 있던 것, AI refine/eject가 바인딩을 CSS로 바꿔놓을 수 있던 것.

가장 오래 고민한 건 **엄격함의 위치**였다. 레지스트리 계약은 최대한 엄격해야 하지만, 편집기는 이미 저장된 문서를 열 수 있어야 한다. 이 둘을 같은 층에서 절충하면 계약이 흐물흐물해진다. 그래서 계약은 그대로 두고 편집기 쪽에 정규화 층을 따로 뒀다. 그 층이 관대해지는 방향을 딱 두 가지(기본값 채우기, 모르는 키 버리기)로 못 박고, 무엇보다 원본 값을 다시 쓰지 않게 했다. "관대하게 읽되 절대 고쳐 쓰지 않는다"는 규칙이 이 구조의 안전핀이다.

또 하나 배운 건 `targets: []`처럼 **"없음"을 명시적으로 표현할 수 있게 해두는 것의 값어치**다. 빈 선언과 무선언을 구분하지 못하면, 마이그레이션이 어디까지 진행됐는지 알 수 없고 검증도 "아직 안 한 것"과 "할 수 없다고 판단한 것"을 같이 통과시키게 된다.

마지막으로 codegen을 browser와 CLI가 공유하게 만든 부분. 이건 애니메이션과 직접 관계없는 결정처럼 보이지만, 실은 같은 원칙의 다른 얼굴이다. 판정의 출처가 하나여야 하듯 생성의 출처도 하나여야 한다. 두 벌이 되는 순간 "같아야 한다"를 테스트로 계속 증명해야 하는 부채가 생긴다.
