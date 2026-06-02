---
draft: true
type: "content"
domain: "frontend"
category: "tailwindcss"
topic: "Tailwind v4 globals.css 중복 import로 CSS가 2벌 출력되던 문제"
updatedAt: "2026-06-02"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "tailwindcss"
  - "postcss"
  - "css"
  - "build"
  - "import"

relatedCategories:
  - "css"
  - "build"
---

# Tailwind v4에서 중복 import로 CSS가 2벌 출력되던 문제

> 엔트리 CSS가 이미 import하는 globals.css가 자기 자신도 @import를 들고 있어서, preflight와 theme 레이어가 두 번 출력되고 있었다.

## 배경

Tailwind v4 환경의 빌드 산출 CSS를 살펴보다, preflight와 @layer 출력이 두 벌씩 들어 있는 것을 발견했다. 엔트리인 tailwind.css가 globals.css를 import하는데, 그 globals.css가 자체적으로 @import를 한 번 더 들고 있던 게 원인이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- tailwindcss 중복 import 제거
  - postcss로 직접 컴파일해서 출력 CSS를 확인했더니 preflight와 @layer가 2벌 들어 있었다. 중복 import를 제거하니 140.5KB에서 136.5KB로 줄었고, 커스텀 토큰과 유틸 출력은 동일하게 유지됐다.
  - 제거가 안전한지 두 가지로 확인했다. 첫째, globals.css를 단독으로 import하는 다른 진입점이 없는지 grep으로 확인했고 없었다. 둘째, @theme와 @utility는 특정 import 순서가 아니라 번들 전체를 기준으로 처리되므로, 중복 import를 빼도 토큰과 유틸 생성에는 영향이 없다.

## 정리

Tailwind v4의 @import, @theme, @layer가 어떻게 합쳐져 최종 CSS가 되는지 모르면, 중복 import 같은 게 조용히 출력을 부풀린다. 두 가지가 핵심이었다. 하나는 빌드 산출물을 직접 컴파일해 결과 CSS를 눈으로 확인하는 습관이다. diff만 보면 이런 중복은 안 잡힌다. 다른 하나는 @theme와 @utility가 import 위치가 아니라 번들 전체 기준으로 동작한다는 점이다. 이걸 알아야 "import를 빼도 토큰이 안 사라진다"는 판단을 안심하고 내릴 수 있다.
