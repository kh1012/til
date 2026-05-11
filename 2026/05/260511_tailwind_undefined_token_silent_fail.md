---
draft: true
type: "content"
domain: "frontend"
category: "tailwind"
topic: "미정의 디자인 토큰 클래스의 사일런트 무효화"
updatedAt: "2026-05-11"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "tailwind"
  - "design-tokens"
  - "css"
  - "debugging"

relatedCategories:
  - "css"
  - "design-system"
---

# Tailwind 미정의 토큰 클래스 — 사일런트 무효화로 인한 투명 렌더링

> 정의되지 않은 디자인 토큰을 className으로 쓰면 Tailwind는 에러 없이 그 클래스를 통째로 무시한다. 결과적으로 "투명·배경 없음"으로 렌더링되어 원인을 잡기 어렵다.

## 배경

`ContextBudgetSlider`의 토글 버튼과 popover가 모두 투명으로 렌더링되는 문제를 발견했다. 코드는 분명 `bg-bg-elevated`, `hover:bg-bg-hover` 같은 클래스를 가지고 있는데도 배경색이 화면에 적용되지 않았다.

## 핵심 내용

### 원인

프로젝트의 디자인 토큰 시스템(globals.css)에는 다음 토큰만 정의되어 있었다.

- `--color-surface` / `--color-surface-hover` / `--color-surface-foreground`
- `--color-ground` / `--color-ground-hover` / `--color-ground-foreground`
- `--color-background` / `--color-foreground` / `--color-muted` / …

반면 코드에서 사용한 클래스는 정의되지 않은 이름이었다.

- `bg-bg-elevated` → 대응 토큰 없음
- `bg-bg-hover` → 대응 토큰 없음

Tailwind v4는 매칭되지 않는 임의 토큰 클래스를 **에러 없이 그냥 무시**한다. 빌드 경고도, 런타임 폴백도 없다. 결과적으로 해당 요소는 어떤 배경 클래스도 적용되지 않은 상태가 되어 부모 배경이 비쳐 보이는 "투명"으로 렌더링된다.

### 사일런트 무효화가 위험한 이유

1. **잘못된 클래스명이 컴파일 타임에 잡히지 않는다** — 오탈자가 그대로 런타임으로 흘러감.
2. **DevTools로 봐도 클래스는 붙어 있다** — `<div class="bg-bg-elevated …">` 처럼 보이지만, 매칭되는 CSS 규칙이 없을 뿐. 디버깅 시 "왜 이 클래스가 안 먹히지?"로 함정에 빠짐.
3. **유사 토큰 이름 혼동** — `bg-surface` vs `bg-bg-elevated` 처럼 비슷한 이름들이 섞이면 어느 쪽이 진짜 토큰인지 코드만 봐서는 알 수 없다.

### 해결

같은 의도의 정의된 토큰으로 교체한다.

```diff
- "hover:bg-bg-hover transition-colors",
+ "hover:bg-surface-hover transition-colors",

- "bg-bg-elevated border border-border/60 shadow-md",
+ "bg-surface text-surface-foreground border border-border/60 shadow-surface-floating",
```

코드베이스 전체에 같은 패턴이 또 있는지 grep으로 점검한다.

```bash
grep -rn "bg-bg-elevated\|bg-bg-hover" --include="*.tsx" --include="*.ts"
```

찾으면 부모 컨테이너의 배경 톤에 맞춰 `bg-surface-hover` / `bg-ground-hover` 등으로 매핑한다.

## 정리

- **디자인 토큰을 쓰는 프로젝트라면 토큰 카탈로그(globals.css나 control-tokens.ts)와 코드의 클래스명을 정합시켜야 한다.** 카탈로그에 없는 토큰을 쓰는 순간 Tailwind는 조용히 무시한다.
- **"왜 배경이 안 보이지?" 같은 의문이 들면 가장 먼저 클래스명을 grep으로 디자인 시스템에 있는 토큰인지 검증하라.** DevTools만 보면 클래스는 붙어 있어 속기 쉽다.
- **장기적으로는 ESLint 룰이나 Tailwind safelist + content scan으로 미정의 토큰을 컴파일 타임에 잡는 자동화를 검토한다.** 사람이 매번 grep 검증하는 건 한계가 있다.
- 디자인 토큰 시스템이 잘 설계돼 있어도, 그것을 코드에서 사용할 때 **이름 정합성**이 깨지면 그 가치는 사라진다.
