---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "58개 디자인 시스템을 공통 토큰으로 추상화할 때 시멘틱 갭이 생기는 구조적 원인과 교정 방법"
updatedAt: "2026-04-07"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-tokens"
  - "css-custom-properties"
  - "semantic-tokens"
  - "design-system-comparison"
  - "token-abstraction"

relatedCategories:
  - "css"
  - "design-system"
  - "architecture"
---

# 58개 디자인 시스템 토큰 추상화 — 시멘틱 갭 감사와 교정

> 다양한 서비스의 디자인 시스템을 하나의 CSS 커스텀 프로퍼티 체계로 추상화하면 "공통 어휘"에 맞지 않는 고유 시멘틱이 소실된다. 감사-교정 사이클을 통해 토큰 슬롯을 확장해야 한다.

## 배경

MAX의 디자인 방향을 잡기 위해 Claude, Stripe, Spotify, Apple 등 58개 서비스의 DESIGN.md를 분석하고, 각 서비스를 side-by-side 비교할 수 있는 `/preview/chat` 도구를 구축했다. 처음에는 ~50개 `--pv-*` CSS 커스텀 프로퍼티로 모든 서비스를 매핑했는데, 3개 서비스(Claude, Stripe, Spotify)를 DESIGN.md와 1:1 대조 감사해보니 심각한 시멘틱 갭이 발견되었다.

## 핵심 내용

### 1. 추상화 레이어의 구조적 한계

하나의 고정된 토큰 세트(50개)로 300줄짜리 DESIGN.md를 매핑하면 3가지 레벨의 정보 손실이 발생한다:

| 레벨 | 문제 | 예시 |
|------|------|------|
| **토큰 슬롯 부재** | 시스템에 표현할 자리 자체가 없음 | Claude의 heading 전용 serif 폰트 (`--pv-font` 하나로 sans/serif 분리 불가) |
| **값 오류** | 슬롯은 있지만 값이 generic | `--pv-destructive`이 55개 서비스 모두 동일한 `oklch(0.56 0.19 13)` |
| **시멘틱 오매핑** | 값은 맞지만 역할이 다름 | `--pv-border-hover`에 Claude의 Warm Sand(버튼 배경색)이 매핑됨 |

### 2. 발견된 핵심 시멘틱 갭 7가지

감사를 통해 추가한 신규 토큰:

```
--pv-font-heading    # 헤딩 전용 폰트 (Claude Serif, Stripe sohne-var)
--pv-font-feature    # OpenType 기능 (Stripe "ss01", Wise "calt")
--pv-lh-body         # 본문 line-height (Claude 1.60 vs 일반 1.5)
--pv-lh-heading      # 헤딩 line-height (Claude 1.10)
--pv-fw-button       # 버튼 전용 weight (Stripe 300 body vs 400 button)
--pv-shadow-ring     # Ring shadow 색상 (Claude #d1cfc5)
--pv-input-shadow    # Input inset shadow (Spotify 고유 recessed 스타일)
```

### 3. CSS 합성에서의 multi-value 토큰 버그

토큰 값에 `"12px 16px"` 같은 shorthand를 넣으면 CSS 합성 시 깨진다:

```jsx
// bar-pad = "12px 16px"일 때:
padding: `0 ${pv("bar-pad")} ${pv("bar-pad")}`
// → padding: 0 12px 16px 12px 16px  ← 5값 = 무효 CSS!
```

해결: (1) 토큰은 반드시 단일값, (2) 컴포넌트에서 `paddingLeft/Right/Top/Bottom` 개별 속성 사용.

### 4. 서비스별 가장 눈에 띄는 차이점

감사를 통해 발견한 "이 토큰이 없으면 그 서비스가 아닌" 사례들:

| 서비스 | 빠지면 정체성 상실 | 토큰 |
|--------|-------------------|------|
| Claude | Serif 헤딩 + ring shadow depth | `font-heading`, `shadow-ring` |
| Stripe | OpenType ss01 + weight 300 헤딩 | `font-feature`, `fw-heading: 300` |
| Spotify | uppercase 버튼 + 1.4px letter-spacing | `label-transform`, `label-spacing` |
| BMW | border-radius 전부 0px | `r-btn: 0px` ~ `r-code: 0px` |
| SpaceX | 라이트/다크 동일 (always dark) | light = dark 색상 |

### 5. 효율적인 대규모 교정 워크플로우

55개 서비스를 교정할 때 사용한 패턴:

```
Phase 1: 토큰 시스템 확장 (신규 슬롯 추가)
  ↓
Phase 2: 4개 배치 병렬 에이전트 (각 14~15개 서비스)
  - 각 에이전트: DESIGN.md 읽기 → 현재값 대조 → Edit로 교정
  ↓
Phase 3: tsc + next build 검증
```

핵심: **감사(audit) 먼저, 교정(fix) 나중에**. 3개 서비스 샘플 감사로 시스템적 갭을 파악한 뒤, 전수 교정에서는 발견된 패턴을 일괄 적용.

## 정리

- 디자인 토큰 추상화는 "공통 어휘 정의" 문제. 어휘가 부족하면 표현할 수 없는 개념이 생긴다.
- 처음부터 완벽한 토큰 세트를 설계하는 것은 불가능. **샘플 감사 → 갭 발견 → 슬롯 확장 → 전수 교정** 사이클이 현실적.
- CSS 커스텀 프로퍼티를 inline style로 합성할 때, multi-value shorthand는 반드시 피해야 한다. `var()` 치환은 문자열 삽입이라 padding shorthand 합성에서 값 개수가 꼬인다.
- 58개 서비스를 비교하면서 가장 인상적이었던 건, 같은 "채팅 UI"라도 font-weight 하나, border-radius 하나, shadow 색상 하나가 서비스의 정체성을 결정한다는 점이다. Stripe의 weight 300 헤딩이 주는 "자신감의 역설", BMW의 radius 0px이 주는 "공학적 정밀감" 같은 것들.
