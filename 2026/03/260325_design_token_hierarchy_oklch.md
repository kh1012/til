---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "oklch 기반 디자인 토큰 위계 설계"
updatedAt: "2026-03-25"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "oklch"
  - "design-token"
  - "tailwind-v4"
  - "semantic-color"
  - "backdrop-filter"

relatedCategories:
  - "tailwindcss"
  - "design-system"
---

# oklch 기반 디자인 토큰 위계 설계

> oklch 색 공간에서 시멘틱 토큰 위계를 설계하고, Tailwind v4 @theme으로 매핑하는 과정에서 배운 것들.

## 배경

프로젝트의 색상 체계가 `brand`/`primary`/`ring` 중복, `text-white` 하드코딩, Raw Tailwind 팔레트(sky-*, amber-* 등) 50곳 이상 산재하여 일관성이 없었다. Claude 앱의 위계 구조를 참고하여 전면 개편을 진행했다.

## 핵심 내용

### 1. Layer 위계 — 물리 세계 비유

```
ground      ← 가장 어두움 (땅, 사이드바)
background  ← 중간 (페이지 바닥)
surface     ← 밝음 (카드, 패널)
floating    ← 가장 밝음 + 반투명 (입력창, 팝오버)
overlay     ← 모달 딤
```

빛이 위에서 내려오니까 높이 올라갈수록 밝아진다. `surface-2` 같은 넘버링 대신 역할 기반 네이밍이 소규모 팀에서 더 실용적이다.

### 2. oklch에서 chroma와 색 온도

```css
--ground: oklch(0.975 0.004 250);  /* chroma 낮게 → 파란 회색 */
--muted:  oklch(0.96 0.004 250);   /* 0.008이면 보라/빨간끼가 돈다 */
```

oklch의 hue 250(파랑)에서 **chroma가 0.008 이상이면 보라/빨간 shift가 발생**한다. 배경색처럼 넓은 면적에 쓰는 색은 chroma 0.003~0.005 정도가 적절하다.

### 3. 6종 세트 원칙

모든 시멘틱 토큰 그룹에 일관된 하위 토큰을 정의한다:

| 토큰 | 용도 |
|------|------|
| `{name}` | 기본 배경색 |
| `{name}-foreground` | 위의 텍스트 |
| `{name}-border` | 경계선 |
| `{name}-hover` | hover 피드백 |
| `{name}-active` | press 피드백 |
| `{name}-subtle` | 연한 배경 (badge, chip) |

`text-white` 같은 하드코딩 대신 `text-destructive-foreground`를 쓰면 다크모드 자동 대응.

### 4. backdrop-filter의 containing block 제한

**`overflow: hidden/auto`인 조상이 있으면 `backdrop-blur`가 작동하지 않는다.**

```
div.overflow-hidden        ← containing block 생성
  └── popover (backdrop-blur-md)  ← blur 범위가 부모 배경으로 제한됨
```

`backdrop-filter`는 가장 가까운 containing block 안에서만 작동한다. `position: fixed` 요소에서만 blur를 사용하고, 나머지는 `bg-surface-floating`(반투명 배경) + `shadow`로 대체하는 게 현실적이다.

### 5. 역 라운딩 — overflow-hidden + 부모 배경 조합

`rounded-l-3xl` 바깥 구석을 채우기 위해 `radial-gradient`로 corner-fill을 구현했으나, **부모 배경 + 자식 `overflow-hidden` + `rounded` 조합**이면 별도 유틸리티 없이 자연스럽게 해결된다.

```html
<div class="bg-ground">                           <!-- 구석에 ground 색 노출 -->
  <div class="rounded-l-3xl overflow-hidden bg-background">  <!-- 라운딩 안쪽은 background -->
  </div>
</div>
```

### 6. shadow-composer — 위쪽만 퍼지는 shadow

`sticky bottom-0`인 입력창은 아래쪽에 공간이 없어 shadow가 잘린다. Y offset을 음수로 주면 위쪽으로만 퍼진다:

```css
--shadow-composer: 0 -4px 20px oklch(0.88 0.01 250 / 0.3);
/*                   ↑ 음수 = 위쪽으로 */
```

### 7. Tailwind v4 @theme inline 매핑

CSS 커스텀 프로퍼티를 Tailwind 유틸리티로 사용하려면 `@theme inline`에 등록해야 한다:

```css
@theme inline {
  --color-accent: var(--accent);           /* → bg-accent, text-accent */
  --shadow-surface: var(--shadow-surface); /* → shadow-surface */
}
```

alias 패턴으로 기존 코드 호환도 가능: `--color-brand: var(--accent);`

## 정리

- 토큰 네이밍은 "넘버링 vs 역할" → 역할 기반이 소규모 팀에 실용적
- oklch에서 배경색은 chroma를 극도로 낮게 (0.003~0.005)
- backdrop-blur는 overflow-hidden 조상이 있으면 무력화됨 — 현실적으로 fixed 요소에서만 사용
- 역 라운딩은 CSS 구조(부모 bg + overflow-hidden)로 해결 가능, JS/pseudo 불필요
- `text-white` 하드코딩을 `text-{token}-foreground`로 바꾸면 다크모드 대응이 자동화됨
