---
draft: true
type: "content"
domain: "frontend"
category: "code-quality"
topic: "cmd-qa 자동화 이터레이션으로 디자인 시스템 87건 위반 전량 해소"
updatedAt: "2026-04-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "design-system-audit"
  - "automated-refactoring"
  - "FSD"
  - "barrel-export"
  - "type-safety"
  - "tailwind-tokens"

relatedCategories:
  - "typescript"
  - "architecture"
  - "tailwind"
---

# cmd-qa 자동화 이터레이션으로 디자인 시스템 87건 위반 전량 해소

> 4명의 병렬 감사관 Agent + 8회 이터레이션으로 87개 디자인 시스템 위반을 0건으로 만든 과정

## 배경

MAXYS frontend-3 코드베이스에 27개 디자인 시스템 규칙(R1~R27)이 정의되어 있지만, 실제 준수율을 정량적으로 측정하고 자동 수정한 적이 없었다. `/cmd-qa` 커맨드를 실행하여 감사 → 계획 → 수정 → 검증 사이클을 자동 반복했다.

## 핵심 내용

### 1. 병렬 감사관 구조

4명의 Agent를 동시 실행하여 감사 시간을 단축했다:

| 감사관 | 담당 규칙 | 역할 |
|--------|-----------|------|
| A | R1-R5, R10, R13, R15, R16 | 토큰 준수 + 성능 |
| B | R6, R7, R9, R14, R17 | 구조 + 코드 품질 |
| C | R11, R25 | 디자인 일관성 |
| D | R18, R19, R22, R26 | 런타임 안정성 |

### 2. 가장 임팩트가 큰 수정 — i18n 캐스팅 일괄 제거

96개 파일에서 `as Parameters<typeof t>[0]` 패턴이 발견되었다. `t()` 함수의 시그니처를 `TranslationKeys | (string & {})`로 확장하여 한 번에 96개 파일의 캐스팅을 제거했다.

```typescript
// Before: 엄격한 타입만 허용
(key: TranslationKeys, variables?: Record<string, string | number>) => {

// After: autocomplete 유지하면서 string도 허용
(key: TranslationKeys | (string & {}), variables?: Record<string, string | number>) => {
```

`(string & {})` 트릭은 TypeScript에서 string literal union의 자동완성을 유지하면서도 임의 문자열을 허용하는 패턴이다.

### 3. asRecord() type guard 패턴

`as Record<string, unknown>` 캐스팅을 안전한 type guard로 대체:

```typescript
// shared/lib/as-record.ts
export function asRecord(v: unknown): Record<string, unknown> | undefined {
  return v != null && typeof v === "object" ? v as Record<string, unknown> : undefined;
}
```

`undefined` 반환 → optional chaining으로 자연스럽게 null safety 확보.

### 4. 이터레이션별 ROI

| Iter | 수정 내용 | 해소 건수 | 파일 수 |
|------|-----------|-----------|---------|
| 1 | R6-b barrel export + R22 atom 승격 | 18 | 20 |
| 2 | R19 상위 3파일 type guard | 3 | 3 |
| 3 | **i18n cast 일괄 제거 + SVG 토큰** | **28** | **109** |
| 4 | R25 STATUS 상수 통합 | 2 | 4 |
| 5 | R9 16파일 분할 + R11 패딩 통일 | 23 | 37 |
| 6-7 | R19 asRecord + 나머지 | 12 | 13 |
| 8 | R9 경계선 트리밍 + R19 마무리 | 나머지 | 31 |

Iter 3이 압도적으로 ROI가 높았다 — 근본 원인(t 함수 타입)을 해결하니 96파일이 한 번에 정리되었다.

### 5. FSD barrel export 정비 패턴

```
// Before: 내부 모듈 직접 접근
import { FileCard } from "@/entities/message/ui/files/FileCard";

// After: barrel export 경유
import { FileCard } from "@/entities/message";
```

`entities/message/index.ts`에 re-export를 추가하고, 소비자의 import 경로만 변경. 기존 동작 보장.

### 6. SVG viewBox에서 fluid typography가 안 맞는 이유

SVG `<text>` 요소의 font-size는 viewBox 좌표계 기준이라 `clamp()`/`vw` 기반 fluid 토큰이 의도대로 동작하지 않는다. 별도의 고정 크기 토큰(`text-svg-sm: 9px`, `text-svg-md: 10px`, `text-svg-lg: 11px`)을 `@theme inline`에 등록하여 해결.

## 정리

- **근본 원인 해결이 가장 효율적**: 96개 파일의 캐스팅을 하나씩 고치는 대신, t 함수 시그니처를 바꿔 한 번에 해결
- **병렬 Agent가 감사 시간을 크게 단축**: 순차 실행 대비 ~4배 속도
- **파일 분할은 빈 줄 제거만으로 경계선 통과 가능**: 151~154줄 파일은 빈 줄 정리만으로 150줄 이하 달성
- **`(string & {})` 패턴**: TypeScript에서 string literal union의 autocomplete를 유지하면서 임의 문자열도 허용하는 유용한 트릭
- **asRecord() 패턴**: `as Record<string, unknown>` 대신 안전한 narrowing + optional chaining 조합
