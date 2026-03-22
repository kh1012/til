---
draft: true
type: "content"
domain: "frontend"
category: "css"
topic: "디자인 토큰 사이즈 체계 확장 시 하위 호환 전략"
updatedAt: "2026-03-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design tokens"
  - "control tokens"
  - "tailwind"
  - "size system"
  - "backward compatibility"

relatedCategories:
  - "react"
  - "design-system"
---

# 디자인 토큰 사이즈 확장 시 기존 값을 변경하면 안 되는 이유

> 기존 사이즈 토큰(xs, sm 등)을 변경하면 프로젝트 전체에 파급 — 새 사이즈는 추가만

## 배경

Tag 컴포넌트에 더 작은 사이즈가 필요해서 `SIZE_STYLES`의 `xs`를 `text-step-n2`에서 `text-step-n3`으로 변경했더니, 프로젝트 전체에서 `size="xs"`를 사용하는 24개 이상의 컴포넌트에 영향이 갔다.

## 핵심 내용

### 문제: 기존 토큰 값 변경

```ts
// Before
xs: "h-6 px-2 text-step-n2 gap-1",

// 실수: xs의 text 크기를 변경
xs: "h-6 px-2 text-step-n3 gap-1",  // ❌ 24개+ 컴포넌트 영향
```

### 해결: 새 사이즈 추가, 기존 유지

```ts
export const SIZE_STYLES = {
  "3xs": "h-4 px-1 text-step-n5 gap-0.5",   // 신규
  "2xs": "h-5 px-1.5 text-step-n4 gap-0.5", // 신규
  xs: "h-6 px-2 text-step-n2 gap-1",         // 기존 유지!
  sm: "h-7 px-3 text-step-n2 gap-1.5",
  md: "h-8 px-4 text-step-n2 gap-1.5",
  lg: "h-9 px-m text-step-n2 gap-2",
  // ...
} as const;
```

### 검증 방법

토큰 변경 전, 영향 범위를 반드시 확인:

```bash
# size="xs"를 사용하는 모든 곳 검색
grep -r 'size="xs"' src/ --include="*.tsx" | wc -l
```

### 원칙

| 규칙 | 설명 |
|------|------|
| **기존 토큰 값 불변** | 이미 사용 중인 토큰의 값을 변경하면 전체 파급 |
| **새 사이즈는 추가** | 2xs, 3xs 등 더 작은 방향으로 확장 |
| **네이밍 컨벤션** | t-shirt sizing: 3xs < 2xs < xs < sm < md < lg |
| **타입 자동 확장** | `keyof typeof SIZE_STYLES`로 타입이 자동 업데이트 |

## 정리

- 디자인 토큰은 **API 계약** — 기존 값 변경은 breaking change
- 더 작은/큰 사이즈가 필요하면 **새 키를 추가**하고 기존은 그대로 둘 것
- 변경 전 `grep`으로 사용처를 반드시 확인하는 습관
