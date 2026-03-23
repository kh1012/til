---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "oklch 디자인 토큰 명도/채도 조정으로 라이트·다크 모드 가독성 개선"
updatedAt: "2026-03-23"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "oklch"
  - "design-tokens"
  - "color-contrast"
  - "wcag"
  - "tailwind-v4"
  - "css-custom-properties"

relatedCategories:
  - "design-system"
  - "accessibility"
  - "tailwind"
---

# oklch 디자인 토큰 명도/채도 조정으로 가독성 개선

> CSS oklch 색공간의 L(명도)·C(채도) 값을 체계적으로 조정하여, globals.css 1개 파일 수정만으로 101개 컴포넌트의 라이트/다크 모드 가독성과 구분감을 한꺼번에 강화한 경험.

## 배경

프로젝트의 디자인 토큰이 oklch 기반으로 구성되어 있었는데, 사용자 피드백으로 "전체적으로 흐리고 어둡다", "폰트가 눈에 안 들어온다", "구분감이 없다"는 의견이 나왔다. 실제로 측정해보니 `--muted-foreground`(보조 텍스트)의 L값이 0.45로 WCAG AA 경계선이었고, `--border`의 L값이 0.92로 배경(0.985)과 명도 차이가 0.065밖에 안 되어 사실상 보이지 않았다.

## 핵심 내용

### oklch 색공간의 장점

oklch는 `L`(Lightness 0~1), `C`(Chroma 채도), `H`(Hue 색상각)로 구성된 **인지적 균일 색공간**이다. HSL과 달리 L값을 동일하게 맞추면 실제로 동일한 밝기로 느껴지므로, 디자인 토큰의 명도 조절에 매우 적합하다.

```css
/* oklch(Lightness Chroma Hue) */
--foreground: oklch(0.13 0.015 250);  /* L=0.13 → 매우 어두운 텍스트 */
--muted-foreground: oklch(0.37 0.025 250);  /* L=0.37 → 보조 텍스트 */
--border: oklch(0.85 0.02 250);  /* L=0.85 → 경계선 */
```

### 조정 전략: Hue 유지, L값만 조정

기존 블루 그레이 정체성(Hue 250)을 유지하면서 **L값만 대담하게 조정**하는 전략을 택했다. C(채도)는 미세하게만 올려 색감을 살렸다.

#### 라이트 모드 — 전경을 더 어둡게

| 토큰 | 변경 전 L | 변경 후 L | 효과 |
|------|----------|----------|------|
| `--foreground` | 0.15 | **0.13** | 본문 텍스트 더 진하게 |
| `--muted-foreground` | 0.45 | **0.37** | 보조 텍스트 확실히 읽힘 (CR 7:1→13:1) |
| `--border` | 0.92 | **0.85** | 경계선 확실히 보임 (delta 0.065→0.135) |

#### 다크 모드 — 전경을 더 밝게

| 토큰 | 변경 전 L | 변경 후 L | 효과 |
|------|----------|----------|------|
| `--foreground` | 0.95 | **0.97** | 더 밝은 흰색 (halation 없는 범위) |
| `--muted-foreground` | 0.60 | **0.68** | 보조 텍스트 밝게 (CR 5:1→9:1) |
| `--border` | 0.28 | **0.35** | 경계선 확실히 보임 (delta 0.14→0.21) |

### 업계 기준 비교 (Radix, GitHub Primer, Vercel Geist)

| 역할 | 업계 L 범위 (라이트) | 우리 조정 후 |
|------|---------------------|------------|
| Foreground | 0.13~0.20 | 0.13 ✅ |
| Muted text | 0.35~0.42 | 0.37 ✅ |
| Border | 0.85~0.88 | 0.85 ✅ |

### 구현의 효율성

globals.css의 `:root`와 `.dark` 블록에서 **oklch 값 20개만 수정**하면 끝이다. Tailwind v4의 `@theme inline` + CSS 커스텀 프로퍼티 체인 덕분에 101개 컴포넌트가 자동 반영된다.

```
globals.css (:root / .dark)
  → @theme inline { --color-foreground: var(--foreground); }
  → Tailwind 유틸리티: text-foreground, bg-background, border-border
  → 101개 컴포넌트에서 사용
```

변경 파일 1개, 테스트 영향 0, 롤백은 값만 되돌리면 됨.

### 주의점: 다크 모드 foreground를 L=1.0으로 올리면 안 되는 이유

APCA(Advanced Perceptual Contrast Algorithm) 연구에 따르면, 어두운 배경 위의 순백(L=1.0) 텍스트는 **halation**(빛 번짐)을 유발하여 오히려 가독성을 해친다. L=0.95~0.98이 "soft off-white" sweet spot이다.

## 정리

- oklch 기반 디자인 토큰은 **L값 조정만으로 전체 UI 대비를 체계적으로 제어**할 수 있어 매우 효율적이다
- `muted-foreground`가 151회 사용되는 가장 빈번한 토큰이므로, 이 하나의 L값 변경이 가장 큰 ROI를 가진다
- 다크 모드에서 "화끈한 흰색"은 L=0.97~0.98이지 L=1.0이 아니다 (halation 방지)
- CSS 변수 체인 구조 덕분에 **단일 파일 수정으로 전체 UI 톤을 바꿀 수 있다** — 디자인 토큰의 진정한 가치
