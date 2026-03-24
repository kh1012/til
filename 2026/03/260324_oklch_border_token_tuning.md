---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "oklch 색상 토큰에서 border 밝기 단계적 튜닝"
updatedAt: "2026-03-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "oklch"
  - "css-custom-properties"
  - "design-tokens"
  - "border-color"
  - "tailwind-v4"

relatedCategories:
  - "design-system"
  - "tailwind"
---

# oklch 색상 토큰에서 border 밝기 단계적 튜닝

> oklch의 L(lightness) 값을 조정하여 border 가시성을 제어하는 실전 방법

## 배경

디자인 토큰 기반 프로젝트에서 border 색상이 너무 연해서 시각적으로 구분이 안 되는 문제가 있었다. oklch 색 공간을 사용 중이라 L(lightness) 값만 조정하면 색조(hue)와 채도(chroma)를 유지하면서 밝기만 바꿀 수 있다.

## 핵심 내용

### oklch 구조

```
oklch(L C H)
       │ │ └─ Hue (색조, 0~360)
       │ └─── Chroma (채도, 0~0.4)
       └───── Lightness (밝기, 0~1)
```

### border 토큰 튜닝 전략

**라이트 모드**: L을 **낮추면** border가 더 진해진다 (배경이 밝으므로)
- `--border: oklch(0.92 0.01 250)` → 연한 border
- `--border: oklch(0.88 0.01 250)` → 한 단계 진한 border
- `--border: oklch(0.85 0.01 250)` → 확실히 보이는 border

**다크 모드**: L을 **높이면** border가 더 진해진다 (배경이 어두우므로)
- `--border: oklch(0.28 0.02 250)` → 기본
- `--border: oklch(0.32 0.02 250)` → 더 눈에 띄는 border

### 단계적 튜닝 방법

1. L 값을 0.04 단위로 조정 (한 번에 큰 변화를 주지 않음)
2. 개발 서버에서 눈으로 확인
3. OK이면 다음 토큰(`--border-subtle` 등)으로 이동
4. 라이트/다크 모드를 각각 별도로 조정

### 주의점

- C(chroma)와 H(hue)는 건드리지 않는다 — 색조 일관성 유지
- `--border`와 `--border-subtle`의 L 차이를 유지한다 (계층 구조)
- 다크 모드에서 "진하다"는 라이트 모드와 방향이 반대

## 정리

oklch는 L/C/H가 직교(orthogonal)하기 때문에 밝기만 독립적으로 조정할 수 있어서 디자인 토큰 튜닝에 매우 적합하다. hex나 hsl에서는 밝기를 바꾸면 채도가 같이 바뀌는 문제가 있지만, oklch에서는 L만 바꾸면 된다. 0.04 단위로 단계적으로 조정하는 것이 눈으로 비교하기 좋은 간격이었다.
