---
draft: true
type: "content"
domain: "frontend"
category: "code-quality"
topic: "cmd-qa 자동 감사 루프로 디자인 시스템 위반 0건 달성"
updatedAt: "2026-04-09"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "cmd-qa"
  - "design-system-compliance"
  - "eslint-max-lines"
  - "refactoring"
  - "FSD"
  - "semantic-tokens"
  - "SRP"

relatedCategories:
  - "tailwindcss"
  - "react"
  - "architecture"
---

# cmd-qa 자동 감사 루프로 코드베이스 디자인 시스템 준수율 100% 달성

> 4회의 cmd-qa iteration + 1회의 150줄 리팩토링 PDCA로 11개 커밋, 99파일, +3973/-791 lines 변경. 감사관 4명 병렬 실행 → 위반 수정 → 빌드 검증을 자동 반복하여 디자인 시스템 위반 0건을 달성한 과정.

## 배경

MAX Frontend-3 코드베이스에 디자인 시스템 규칙(R1~R29)이 정의되어 있지만, 실제 코드에는 역사적으로 쌓인 위반이 다수 존재했다. Tailwind 팔레트 직접 사용(R3), React.* 네임스페이스(R14), FSD 레이어 위반(R22), 네이티브 HTML(R7), unsafe type assertion(R19), 150줄 초과(R9-b) 등이 혼재해 있어 다크모드 일관성과 유지보수성이 저하된 상태였다.

이를 수동으로 하나씩 잡는 대신, `/cmd-qa` 커맨드로 **감사 → 계획 → 구현 → 검증** 사이클을 자동 반복하는 방식을 선택했다.

## 핵심 내용

### 1. cmd-qa 루프 구조

```
cmd-pm (4명 감사관 병렬) → Plan → Do → Analyze → match rate 확인
                                                    ├─ < 100% → 다시 감사
                                                    └─ = 100% → 완료
```

핵심은 **감사관 병렬 실행**이다. 4명의 Agent를 동시에 돌려서 각각 토큰(R1-R5,R10,R15,R16), 구조(R6,R7,R9,R14), 일관성(R11,R25,R26), 안정성(R18,R19,R22)을 맡긴다. 한 명이 전체를 검사하면 10분 이상 걸리지만 병렬이면 2분이면 끝난다.

### 2. 4회 iteration에서 잡은 위반 유형

| Iter | 위반 | 건수 | 수정 방법 |
|------|------|:----:|-----------|
| 1 | R14 React.*, R22 FSD, Barrel, R6 | 12 | named import, shared atom 이동, barrel 정리 |
| 2 | R7 Native HTML, R11 Consistency, R19 Type Assertion | 14 | Checkbox/Input 컴포넌트, padding 통일, type guard |
| 3 | R3 Color Token, R18-b Duration | 14 | code-block-hover/active 토큰 신규, bg-overlay, 상수 추출 |
| 4 | R6-b Barrel Bypass, R14 React.KeyboardEvent | 2 | barrel re-export 추가, named import |

### 3. R3 색상 위반 해결의 고민: debug panel의 bg-white/*

가장 고민했던 부분. debug panel은 항상 다크 배경(`--code-block-bg`)에서 렌더링되므로 `bg-white/5`, `bg-white/10`이 사실상 "조금 밝게" 역할을 한다. 테마에 따라 바뀌는 `hover:bg-hover-overlay`를 쓰면 라이트 모드에서 의도와 다르게 동작한다.

**해결**: `globals.css`에 `--code-block-hover`와 `--code-block-active` 두 토큰을 추가하고 `@theme inline`에 매핑했다. 이제 debug panel은 `hover:bg-code-block-hover`처럼 시맨틱하게 쓰면서도 항상 다크 배경에서 올바르게 동작한다.

```css
--code-block-hover: oklch(0.24 0.02 260);  /* code-block-bg보다 한 톤 밝음 */
--code-block-active: oklch(0.28 0.02 260); /* 선택/활성 상태 */
```

### 4. 150줄 리팩토링 — Clean Architecture로 SRP 분해

R9-b 위반 10파일을 별도 PDCA (Plan → Design → Do → Analyze → Report) 사이클로 처리했다. Design 단계에서 3가지 옵션(Minimal / Clean / Pragmatic)을 비교하고 Option B: Clean Architecture를 선택.

**가장 효과적이었던 분해**:

- `use-china-scenario.ts` (197→100줄): `runTimedSteps` 유틸 + `useScenarioTimer` 훅 추출. 타이머 로직이 60줄이나 중첩되어 있었는데, `runRemainingSteps`라는 공통 패턴을 발견하고 하나의 함수로 통합
- `mock-china-scenario.ts` (174→13줄): re-export hub 패턴. 원본을 `mock-cards.ts`, `mock-progress.ts`, `mock-messages.ts`로 분할하고 원본은 re-export만 담당. barrel export 구조 불변이라 consumer 변경 0
- `ChatAreaScenarioCard.tsx` (190→123줄): 5개 phase handler의 공통 패턴(`InputOverlay + OverlayOption.map()`)을 `ScenarioCardSelectOverlay` 재사용 컴포넌트로 추출

**150줄 정확히 걸치는 파일 4개는 건드리지 않았다** (InteractionWithSheetHeader, SplitSelect, DialogOverlay, sheet-cf-utils). ESLint max-lines: 150 기준 pass이고, 불필요한 추출은 YAGNI 위반.

### 5. 감사관 허용 예외 판단

모든 위반을 기계적으로 수정하면 안 된다. 감사 후 "이건 허용 예외인가?"를 판단하는 기준:

- `<input type="file">` hidden — R7 허용 (파일 선택 UX의 표준 패턴)
- `shared/ui/primitives/` 내부의 `text-white` — R3 허용 (디자인 시스템 원본)
- `part-prop-utils.ts`의 `as Record<string, unknown>` — R19 허용 (type guard 함수 내부의 controlled narrowing)
- `china-scenario/DeepLinkMessage`의 `bg-white` — R3 허용 (QR 코드 배경은 항상 흰색)

## 정리

- **cmd-qa 루프는 효과적이다**: 수동으로 "이거 위반 같은데..." 하나씩 찾는 것보다, 감사관 4명을 병렬로 돌리고 결과를 Do에 넣는 자동화가 훨씬 빠르다. 4회 iteration에서 42건 수정.
- **토큰 추가는 신중하게**: `bg-white/5`를 잡겠다고 `--code-block-hover` 토큰을 새로 만든 건 맞는 결정이었다. 하지만 모든 위반에 새 토큰을 만들면 토큰 수가 폭발한다. "기존 토큰으로 표현 가능한가?" → "불가능하면 새 토큰" 순서.
- **정확히 150줄 파일은 놔둬도 된다**: YAGNI. ESLint가 통과하면 기능적으로 문제없다. Clean Architecture를 선택했더라도 비용 대비 효과가 없으면 skip.
- **리팩토링 시 타입을 세심하게**: `MessageList.tsx`를 분할했을 때 `Map<string, Date>`를 `Map<string, number>`로 잘못 선언한 실수. 타입을 복사하지 말고, 원본 타입을 re-export하는 게 안전하다.
- **11커밋 / 99파일 / +3973 -791**: 이틀간의 집중 정리. 코드 줄 수가 늘어난 건 문서(design-system.md, PDCA reports) + 추출된 서브 모듈 때문. 프로덕션 로직 자체는 줄었다.
