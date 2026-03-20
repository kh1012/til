---
draft: true
type: "content"
domain: "devops"
category: "workflow"
topic: "Agent Team 기반 병렬 리팩토링 워크플로우 — QA 선행 + 3명 병렬 구현"
updatedAt: "2026-03-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "claude-code"
  - "agent-team"
  - "parallel-development"
  - "qa-first"
  - "regression-test"
  - "refactoring"

relatedCategories:
  - "testing"
  - "project-management"
---

# Agent Team 기반 병렬 리팩토링 워크플로우

> QA가 먼저 회귀 테스트를 작성하고, 3명의 시니어 개발자가 독립 영역을 병렬로 구현하는 AI 에이전트 팀 패턴

## 배경

306개 소스 파일로 구성된 프론트엔드 코드베이스에서 리팩토링을 진행할 때, 단일 에이전트로 순차 진행하면 시간이 오래 걸리고 컨텍스트 윈도우 제약도 있다. Claude Code의 Agent 도구를 활용하여 **역할별 에이전트 팀**을 구성하면 병렬 처리가 가능하다.

## 핵심 내용

### 팀 구성 (5명)

```
┌─────────────┐
│   QA 전문가   │ ← Step 1: 회귀 테스트 선행 작성
└──────┬──────┘
       │ 테스트 기준 전달
┌──────┼──────────────────┐
│      │                  │
▼      ▼                  ▼
Senior A   Senior B   Senior C  ← Step 2: 병렬 구현
(영역 A)   (영역 B)   (영역 C)
│      │                  │
└──────┼──────────────────┘
       │ 결과 수집
┌──────▼──────┐
│    리더      │ ← Step 3: 통합 검증 + 커밋
└─────────────┘
```

### 작업 분배 원칙: 파일 충돌 제로

**핵심 규칙**: 같은 파일을 두 영역에서 수정하지 않는다.

```
영역 A: entities/message/ui/UserFileCards.tsx (신규)
        entities/message/index.ts

영역 B: entities/message/ui/UserMessageContent.tsx
        entities/message/ui/__tests__/MessageBubble.test.tsx

영역 C: widgets/cowork-panel/ui/MessageItem.tsx
```

파일 경계를 기준으로 분배하면 merge conflict 없이 병렬 진행 가능.

### QA 선행 패턴 (Test-First)

QA가 **구현 전에** 회귀 테스트를 작성한다:

```typescript
// 아직 존재하지 않는 컴포넌트를 import
import { UserFileCards } from "../UserFileCards";

// 구현 후 통과할 수 있도록 올바른 assertion 설정
it("파일 parts가 없으면 null을 반환한다", () => {
  const { container } = render(<UserFileCards fileParts={[]} />);
  expect(container.innerHTML).toBe("");
});
```

- 테스트는 당연히 **실패** (모듈 미존재)
- 구현 완료 후 **자동으로 통과**
- 각 시니어 개발자가 자기 영역 작업 후 테스트 실행으로 자체 검증

### 시니어 개발자 Agent 실행

```typescript
// 3개 Agent를 동시에 실행 (run_in_background: true)
Agent({
  name: "senior-dev-1",
  mode: "bypassPermissions",
  run_in_background: true,
  prompt: `영역 A 담당. 수정 대상: UserFileCards.tsx, index.ts
           QA 검증: npx vitest run ... 실행 후 통과 확인
           실패 시 최대 5회 재시도`
})
```

**각 Agent에게 전달하는 정보**:
1. 담당 파일 목록 (이 파일만 수정할 것)
2. 구현 요구사항 (코드 수준 체크리스트)
3. QA 검증 기준 (테스트 실행 명령)
4. 재시도 규칙 (최대 5회)

### 재시도 루프

```
Senior Dev 작업 완료
  → 테스트 실행
  → 실패?
    → 에러 메시지 분석
    → 코드 수정
    → 재시도 (최대 5회)
  → 5회 초과?
    → 리더에게 에스컬레이션
  → 통과?
    → 리더에게 완료 보고
```

### 리더의 통합 검증

모든 Agent 완료 후:

```bash
# 1. 전체 테스트로 사이드 이펙트 확인
npx vitest run

# 2. 변경 전(git stash)과 비교하여 새로운 실패가 우리 변경 때문인지 확인
git stash && npx vitest run  # 기존 실패 목록 수집
git stash pop                # 변경 복원

# 3. TypeScript 타입 체크
npx tsc --noEmit
```

### 실제 적용 결과

**코드베이스 리팩토링** (API 설정 중앙화 + 중복 제거 + FSD 준수):
- QA: 38개 회귀 테스트 작성
- Senior Dev 1: API Routes + Config (18/18 통과)
- Senior Dev 2: Features 정리 (33/33 통과)
- Senior Dev 3: Engineering Tools FSD (12/12 통과)
- 전체: 505개 기존 테스트 통과, 새로운 실패 0건

**유저 메시지 파일 카드 분리**:
- QA: 9개 회귀 테스트 작성
- Senior Dev A + B: 병렬 구현 (영역 A: 9/9, 영역 B: 12/12)
- Senior Dev C: 순차 통합
- 전체: 54개 테스트 통과

### 주의사항

1. **영역 간 의존성이 있으면 순차 처리**: A+B 병렬 → C 순차 (C가 A+B 결과에 의존)
2. **Agent 프롬프트에 "다른 파일 수정 금지" 명시**: 영역 침범 방지
3. **기존 실패 테스트 구분**: `git stash`로 변경 전 테스트 실행하여 기존 실패 목록 파악
4. **worktree 격리는 선택사항**: 파일 충돌이 없으면 같은 worktree에서 병렬 가능

## 정리

- QA 선행 테스트가 핵심 — 구현 전에 "완료 조건"을 코드로 정의
- 파일 경계 기준 분배로 merge conflict 제로
- 병렬 실행으로 순차 대비 40~60% 시간 단축 가능
- 리더의 통합 검증에서 `git stash` 비교 패턴이 새로운 실패 감지에 효과적
- 이 패턴은 리팩토링뿐 아니라 신규 기능 개발에도 적용 가능 (컴포넌트/훅/테스트를 영역 분리)
