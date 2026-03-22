---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "규칙 기반 UI 아키텍처 감사 — 182건 위반을 1건으로 줄이기"
updatedAt: "2026-03-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-system"
  - "tailwind-css"
  - "design-tokens"
  - "code-audit"
  - "component-abstraction"

relatedCategories:
  - "react"
  - "css"
  - "testing"
---

# 규칙 기반 UI 아키텍처 감사 — 182건 위반을 1건으로 줄이기

> 13개 규칙 체계(R1~R13)로 코드베이스를 기계적으로 감사하고, 순차적으로 수정하여 디자인 시스템 준수율을 99%로 끌어올린 과정.

## 배경

프로젝트가 성장하면서 디자인 토큰 미준수, 네이티브 HTML 직접 사용, 파일 크기 초과 등이 누적되었다. "느낌"으로 코드 품질을 판단하면 놓치는 것이 많아, 체계적인 규칙과 자동화된 검출 방법이 필요했다.

## 핵심 내용

### 1. 규칙 체계 설계 — 주관 배제, grep으로 검출

| 규칙 | 검출 방법 | 예시 |
|------|---------|------|
| R1 Typography | `grep "text-xs\|text-sm"` | text-sm → text-step-n2 |
| R3 Color | `grep "text-amber-400"` | text-amber-400 → text-warning |
| R7 HTML | `grep "<button"` (shared/ui 제외) | button → Button |
| R9-a Lines | `wc -l` | 293줄 → 124줄 (컴포넌트 분할) |
| R10 Duration | `grep "duration-150"` | duration-150 → duration-(--duration-fast) |

핵심 원칙: **"감사관이 주관적으로 판단하지 않는다."** grep 결과가 0이면 PASS, 아니면 FAIL.

### 2. 감사 → 수정 → 재감사 루프

```
1차 감사: 182건 위반 발견
  ↓ Must-fix 우선 수정
2차 감사: 16건 (91% 감소)
  ↓ 남은 항목 순차 수정
최종: 1건 (의도적 예외)
```

한 번에 모든 걸 고치려 하지 않고, **Error → Warning → Nice-to-fix** 우선순위로 스프린트 단위 처리.

### 3. 시맨틱 토큰의 위력

Tailwind 팔레트 직접 사용의 문제:
```tsx
// Before: 색상이 코드에 하드코딩
<span className="text-amber-400">$0.0042</span>
<span className="text-green-400">● running</span>

// After: 시맨틱 토큰 → 다크/라이트 모드 자동 대응
<span className="text-warning">$0.0042</span>
<span className="text-success">● running</span>
```

`globals.css`에 `--warning: oklch(0.65 0.16 70)` 한 줄만 바꾸면 모든 경고 색상이 동시에 변경된다.

### 4. max-lines 150줄 규칙의 실용적 적용

초과량이 3~25줄인 경미한 케이스는 컴포넌트 분할 대신 경량 접근:
- 빈 줄 제거
- 인라인 헬퍼를 별도 파일로 추출 (같은 폴더)
- 상수/타입 분리
- 중복 핸들러 병합

```
EventTypeChart.tsx: 153줄 → 102줄
  방법: handleSegmentEnter + handleSegmentMove → handleSegmentHover 병합

AgentNode.tsx: 156줄 → 104줄
  방법: 중복 className 템플릿을 wrapCls 변수로 추출
```

대규모 분할이 필요한 것(293줄, 224줄)만 서브컴포넌트로 분리.

### 5. 테스트가 리팩토링의 안전망

디자인 토큰 교체 + 컴포넌트 분할 후 16개 테스트 파일이 실패했다. 실패 원인은 모두 **의도된 변경의 반영 누락**:

| 변경 | 테스트 실패 원인 |
|------|---------------|
| text-green-600 → text-success | 테스트가 `text-green-600` 쿼리 |
| 자동 펼침 제거 | 테스트가 pending→running 시 자동 펼침 기대 |
| 경과시간 제거 | 테스트가 `1.2s` 텍스트 기대 |

테스트가 없었다면 이 변경들이 올바른지 확인할 방법이 없었다. 596개 테스트 전체 통과로 안전하게 리팩토링 완료.

### 6. Tailwind v4에서 문서 파일도 스캔된다

감사 문서(markdown)에 backtick 안에 `text-[var(...)]`를 적었더니 Tailwind가 이를 클래스로 인식하여 `var(...)` (리터럴 점 3개)로 CSS 생성을 시도 → 빌드 실패. docs/ 폴더도 Tailwind content 스캔 대상임을 인지해야 한다.

## 정리

- **규칙은 grep으로 검출 가능해야 한다** — 자동화할 수 없는 규칙은 지키기 어렵다
- **감사 → 수정 → 재감사 루프**가 핵심 — 한 번에 완벽을 추구하지 않는다
- **시맨틱 토큰은 유지보수 비용을 극적으로 줄인다** — oklch 한 줄로 전체 색상 변경
- **150줄 규칙은 "분할 강제"가 아니라 "복잡도 신호"** — 경미하면 빈 줄 정리로도 충분
- **테스트 596개가 리팩토링 안전망** — 16개 실패를 통해 누락을 발견하고 수정
