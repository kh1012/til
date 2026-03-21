---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "FSD 아키텍처 + 디자인 시스템 감사 자동화 파이프라인"
updatedAt: "2026-03-21"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "FSD"
  - "Feature-Sliced Design"
  - "design-system"
  - "design-tokens"
  - "oklch"
  - "utopia"
  - "eslint"
  - "tailwind-v4"
  - "cmd-pm"

relatedCategories:
  - "react"
  - "nextjs"
  - "css"
  - "typescript"
---

# FSD 아키텍처 위반 전수조사 + 디자인 시스템 감사 자동화

> 238건의 디자인 시스템 위반을 체계적으로 발견하고 180건을 수정한 과정에서, 규칙 기반 감사 커맨드(/cmd-pm)를 설계하여 반복 가능한 품질 관리 파이프라인을 구축했다.

## 배경

Next.js 16 + Tailwind CSS v4 + Jotai 기반 프로젝트에서 FSD(Feature-Sliced Design) 아키텍처를 채택했으나, 개발이 진행되면서 레이어 간 import 위반, 디자인 토큰 미준수, 네이티브 HTML 직접 사용 등이 누적되었다. 수동 코드 리뷰로는 한계가 있어 체계적인 감사 시스템이 필요했다.

## 핵심 내용

### 1. FSD Import 위반 해결 패턴

FSD 레이어 규칙: `shared(0) → entities(1) → features(2) → widgets(3) → app(4)` 단방향만 허용.

**발견된 위반 유형 3가지:**

```
역방향 참조: features/send-message → widgets/insight-panel (atom import)
동일 레이어 교차: features/send-message → features/pdf-scanner
Widget 허브 문제: widgets/cowork-panel → widgets/insight-panel (32건)
```

**해결 전략: "atom shared 하강 + re-export hub 유지"**

```typescript
// Before: widget에 정의된 atom을 feature에서 직접 참조 (위반)
import { midasGenMapiKeyAtom } from "@/widgets/insight-panel/model/insight-panel-atoms";

// After: shared로 이동, 원본은 re-export hub로 유지 (하위 호환)
import { midasGenMapiKeyAtom } from "@/shared/model/connector-atoms";
```

re-export hub를 유지하면 기존 소비자가 깨지지 않으면서 점진적 마이그레이션이 가능하다. Jotai atom은 모듈 레벨 싱글턴이므로, 이동 시 원본 파일에서 정의를 완전히 제거하고 re-export만 남겨야 인스턴스 이중화를 방지할 수 있다.

### 2. 디자인 토큰 감사 규칙 체계 (R1~R13)

프로젝트에 맞는 13개 규칙을 정의하고 `/cmd-pm` 커맨드로 자동화했다:

| 규칙 | 대상 | 검출 방법 |
|------|------|----------|
| R1 | Utopia Typography (text-step-* 강제) | grep `text-xs\|text-sm\|text-lg` |
| R3 | 시맨틱 색상 토큰 (Tailwind 팔레트 금지) | grep `text-blue-500` 등 |
| R7 | 공용 컴포넌트 (네이티브 HTML 금지) | grep `<button\|<input` |
| R10 | duration 토큰 (하드코딩 금지) | grep `duration-200` |
| R11 | 동일 위계 일관성 (패널 padding 비교) | 수동 코드 리뷰 |
| R12 | 테스트 커버리지 | 파일 존재 여부 확인 |
| R13 | 번들 크기 / Core Web Vitals | `next build` 출력 파싱 |

**핵심 인사이트: R11(일관성)은 자동화할 수 없다.** 같은 역할의 UI 요소가 서로 다른 스타일을 사용하는 것은 grep으로 잡을 수 없고, 실제 파일을 읽어 className을 추출하여 비교해야 한다.

### 3. oklch 색상 체계에서 시맨틱 토큰 확장

Tailwind 팔레트(`bg-green-600`)를 직접 사용하면 다크 모드 대응이 불가능하다. oklch 기반 시맨틱 토큰으로 전환:

```css
/* globals.css */
:root {
  --success: oklch(0.55 0.18 150);     /* Hue 150 = 그린 */
  --chart-blue: oklch(0.62 0.19 250);  /* 기존 브랜드 Hue와 동일 */
  --chart-orange: oklch(0.70 0.17 55); /* 다이어그램 전용 */
}
.dark {
  --success: oklch(0.65 0.18 150);     /* 다크모드: 밝기 UP */
}
```

**원칙**: 프로젝트의 모든 색상은 Hue 250(블루), 25(레드), 150(그린) 축 위에서 Chroma 0.005~0.22 범위로 정의한다.

### 4. 파일 분할 전략 (max-lines 150)

307줄짜리 DebugConsoleTab을 3개 파일로 분할한 패턴:

```
DebugConsoleTab.tsx (307줄)
  ├─ LogLine.tsx (서브 컴포넌트 추출)
  ├─ MessageIdFilterBar.tsx (서브 컴포넌트 추출)
  └─ debug-console-utils.ts (상수/유틸 추출)
→ DebugConsoleTab.tsx (124줄)
```

**분할 우선순위**: (1) 서브 컴포넌트 → 별도 .tsx (2) 상수/유틸 → 별도 .ts (3) 커스텀 훅 → use-*.ts

### 5. 감사 팀 구성 (3명 병렬)

`/cmd-pm` 커맨드는 3명의 감사관을 병렬 실행한다:

- **감사관 A** (토큰 + 성능): R1~R5, R10, R13 — grep 기반 자동 검출 + 빌드 분석
- **감사관 B** (구조 + 테스트): R6~R9, R12 — ESLint + Jest 실행
- **감사관 C** (일관성): R11 — 파일을 실제로 읽어 비교 테이블 작성

이 분리가 효과적인 이유: A/B는 자동화 도구(grep, ESLint)로 빠르게 검출하고, C는 인간 판단이 필요한 영역에 집중한다.

## 정리

- **규칙 없는 감사는 의미 없다**: 주관적 판단 대신 R1~R13 같은 명시적 규칙 체계를 먼저 정의해야 일관성 있는 감사가 가능하다.
- **atom 이동은 re-export hub로 안전하게**: Jotai atom의 싱글턴 특성을 이해하고, 원본 제거 + re-export 패턴으로 하위 호환성을 보장한다.
- **oklch 색상 체계는 확장 시 Hue/Chroma 축을 고정**: 새 색상 추가 시 기존 체계의 Hue 각도와 Chroma 범위를 벗어나지 않도록 한다.
- **R11(일관성)은 가장 가치 있지만 자동화가 불가능한 규칙**: 같은 역할의 UI가 다른 여백/폰트를 쓰는 것은 도구로 잡을 수 없고, 코드를 읽어야만 발견할 수 있다.
