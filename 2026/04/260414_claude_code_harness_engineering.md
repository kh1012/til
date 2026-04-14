---
draft: true
type: "content"
domain: "devops"
category: "claude-code"
topic: "Claude Code 하네스 엔지니어링 — 규칙 분리와 프로젝트 전용 커맨드 설계"
updatedAt: "2026-04-14"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "claude-code"
  - "harness"
  - "commands"
  - "agent-prompt"
  - "rules-separation"

relatedCategories:
  - "ai-tools"
  - "developer-experience"
---

# Claude Code 하네스 엔지니어링 — 규칙 분리와 프로젝트 전용 커맨드 설계

> Agent에게 규칙을 프롬프트로 넘기면 누락된다. 별도 파일로 분리하고 Agent가 직접 Read하게 하면 해결된다.

## 배경

cmd-pm.md가 1000줄+로 비대해지면서, 감사관 Agent 4명에게 R1-R29 규칙을 프롬프트로 전달할 때 요약/재작성 과정에서 규칙이 누락되는 문제가 반복적으로 발생했다. 또한 글로벌 커맨드(cmd-qa, cmd-pm)가 프로젝트별 특화가 불가능한 구조적 한계도 있었다.

## 핵심 내용

### 1. Agent 규칙 전달의 핵심 문제

```
커맨드 (1000줄) → Claude가 읽음 → Agent 프롬프트로 요약 전달 → 누락 발생
                                     ↑ 여기서 손실
```

커맨드 본문에 규칙을 인라인으로 넣든, 스킬로 분리하든, 결국 Agent 프롬프트를 **재작성**하는 단계에서 규칙이 빠진다. 이건 파일 크기 문제가 아니라 **전달 단계** 문제다.

### 2. 해결: Agent가 규칙 파일을 직접 Read

```
커맨드 (250줄, 워크플로우만)
  └─ "감사관은 ~/.claude/rules/frontend-rules.md를 Read 도구로 직접 읽어라"

규칙 파일 (760줄)
  └─ Agent가 직접 Read → 전달 손실 없음
```

핵심은 **커맨드가 규칙을 Agent에게 전달하지 않는 것**. Agent가 자기가 필요한 규칙 파일을 직접 열어 읽으면 요약/재작성이 일어나지 않는다.

### 3. 구현 구조

```
# 글로벌 (모든 프로젝트 공유)
~/.claude/
├── commands/cmd-pm.md          # 워크플로우만 (1001줄 → 245줄)
└── rules/frontend-rules.md     # R1-R29 규칙 정본 (763줄)

# 프로젝트 전용 (MAX Frontend-3)
.claude/
├── commands/
│   ├── max-pdca.md             # bkit PDCA 래핑 + TDD 내장
│   └── max-qa.md               # 수상시 iteration QA
└── rules/
    └── max-rules.md            # R1-R31 (R30+ 프로젝트 확장)
```

### 4. 커맨드 vs 스킬 vs 훅 — 올바른 선택

| | 커맨드 (.claude/commands/) | 스킬 (.claude/skills/) | 훅 (settings.json) |
|---|---|---|---|
| 호출 | 명시적 `/name` | 키워드 자동 트리거 | 도구 사용 시 자동 |
| 적합 | 다단계 워크플로우 | 도메인 지식 | 코드 포맷팅 |

규칙 파일을 skills에 넣으면 키워드 매칭으로 의도치 않게 로드될 수 있다. `.claude/rules/` 같은 일반 디렉토리에 넣고 Agent가 Read로 읽는 게 가장 안전하다.

### 5. "수상시 iteration" 설계

기존 cmd-qa는 100% match rate까지 무조건 최대 5회 반복. max-qa는 심각도 기반 조건부 반복:

| 심각도 | 반복 | 최대 |
|--------|------|------|
| Error | 필수 | 3회 |
| Warning | 1회 시도 | 1회 |
| Info | 리포트만 | 0회 |

Error 0건이 목표이지 100%가 목표가 아니다. 이 차이가 토큰 소비와 실행 시간을 크게 줄인다.

### 6. 프로젝트 레벨 커맨드의 장점

- `.claude/commands/`에 넣으면 git 추적 가능 → 팀원 자동 공유
- 글로벌 cmd-*와 이름 충돌 없음 (프로젝트 우선)
- 프로젝트별 규칙 확장(R30+) 가능
- 글로벌 커맨드 변경 없이 프로젝트 특화

## 정리

- Agent에게 긴 지침을 넘기는 구조는 본질적으로 누락이 발생한다. **Agent가 스스로 파일을 읽게** 설계해야 한다.
- 커맨드/스킬/훅의 선택은 "호출 방식"으로 판단한다. 명시적 워크플로우는 커맨드, 자동 적용은 훅, 도메인 지식은 스킬.
- 규칙 파일은 커맨드도 스킬도 아닌 **일반 파일**로 두고, 필요한 Agent가 Read로 접근하는 게 가장 깔끔하다.
- "무조건 반복"보다 "수상시만 반복"이 효율적이다. 심각도 분류가 핵심.
