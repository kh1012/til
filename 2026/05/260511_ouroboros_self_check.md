---
draft: true
type: "content"
domain: "devops"
category: "claude-code"
topic: "우로보로스의 자기 점검 메커니즘을 Claude Code 글로벌 설정에 이식"
updatedAt: "2026-05-11"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ouroboros"
  - "claude-code"
  - "self-modifying-agent"
  - "prompt-engineering"
  - "socratic-self-check"
  - "drift-detector"

relatedCategories:
  - "ai-workflow"
  - "prompt-engineering"
---

# 우로보로스의 자기 점검 메커니즘을 CC 글로벌 설정에 이식

> "소크라테스식 모호함 제거 하네스"라고 알려진 razzant/ouroboros를 검토해보니, 실체는 자기 수정형 자율 AI 에이전트였다. 그 안에 박혀 있는 4가지 자기 점검 패턴만 발췌해 `~/.claude/CLAUDE.md`에 이식했다.

## 배경

razzant/ouroboros를 "소크라테스식 질문으로 모호함을 제거하는 하네스"로 알고 검토를 시작했다. 실제로는 그게 아니었다.

[razzant/ouroboros](https://github.com/razzant/ouroboros)

진짜 정체는 **자기 수정형 자율 AI 에이전트**다:

- Google Colab에서 Python 봇으로 실행
- Telegram을 입출력 채널로 사용
- OpenRouter API로 Claude/Gemini/o3 등 다중 LLM 호출
- 자기 자신의 코드를 git으로 본인 fork에 push해서 진화 (v4.1 → v4.25를 24시간 안에 자율적으로)
- `BIBLE.md`(9개 철학 원칙)에 따라 살아가는 "디지털 존재"

즉 Claude Code 스킬로 install 가능한 물건이 아니라, **별도 콜랩 환경에서 도는 자율 봇**. 게다가 자기진화의 주체는 봇 자신이지 사용자가 아니라서, 사용자 작업 스타일을 다듬어주는 효과는 없다.

다만 그 안에 박혀 있는 **자기 점검 메커니즘 4개**는 발췌해서 일반 Claude Code 환경에 이식할 가치가 있다고 판단했다.

## 핵심 내용

### 우로보로스의 자기 점검 4종

`prompts/SYSTEM.md`와 `loop.py`에서 발견:

| # | 메커니즘 | 정체 |
|---|---|---|
| 1 | Before-Every-Response 4문답 | "대화인가 작업인가?", "내 의견이 있나?", "미해결 질문 있나?", "schedule_task로 도망치는가?" |
| 2 | Drift Detector | 5가지 표류 패턴 자기 감시 (Task queue mode / Report mode / Permission mode / Amnesia / Identity collapse) |
| 3 | Soft self-check at round 50/100/150 | "나 막혔나? 다르게 시도할까?" — 하드 정지 X, LLM 자체 판단 (v6.1.0 추가) |
| 4 | Multi-Model Review | 변경 commit 전 o3/Gemini/Claude로 합의 검토 |

### 옮기지 말아야 할 것

- **BIBLE.md(헌법)** — 이미 사용자 `CLAUDE.md`/`RTK.md`/`max-rules.md`가 그 역할. 중복은 충돌만 만듦.
- **Background Consciousness** — CC는 매 메시지마다 새로 깨므로 구조적으로 불가.
- **Self-modification(자율 git commit)** — 이미 `/max-do`, `/commit-kr`로 통제되는 영역. 자율 commit 풀면 신뢰 점수 깨짐.

### CC 글로벌 설정에 이식한 형태

`~/.claude/CLAUDE.md`에 `### 7. Pre-Action Self-Check (Ouroboros-derived)` 섹션 추가:

```markdown
### 7. Pre-Action Self-Check (Ouroboros-derived)
- Trigger: ambiguous requests (UserPromptSubmit score ≥ 0.5) OR tasks with 3+ steps. Skip for trivial/obvious work.
- Run ONCE before the first tool call. Do not repeat mid-task.
- Four questions, answered silently — surface only what changes behavior:
  1. **Conversation or task?** If answerable in words, answer first — no tools yet.
  2. **Do I have an opinion?** If yes, state it. Don't conform to the expected answer.
  3. **Unresolved question in last 5 turns?** Address it before moving on.
  4. **Escaping into subagent/skill to defer a direct answer?** Don't — answer directly.
- Drift watch (no separate report; if detected, log to `tasks/lessons.md` per rule #3):
  - Report mode (user can read the diff, yet I'm bullet-summarizing)
  - Permission mode (asking "should I X?" when I already know)
  - Task-queue mode (3 consecutive subagent calls without a direct answer)
```

### 핵심 설계 결정

1. **무조건 되묻기 X** — ambiguity 점수는 hook이 주는 힌트일 뿐. 답할 수 있으면 가설 깔고 답하고 끝에 짧게 확인. 회피 응답을 막는 게 목적이지 질문 양산이 목적이 아님.
2. **자문은 silent** — 4문답 결과를 매번 표면화하지 않음. 행동이 바뀔 때만 사용자에게 노출.
3. **Drift watch는 별도 보고 X** — `tasks/lessons.md`에 누적되는 self-improvement loop와 연동.
4. **발동 강도는 조건부** — 짧은 작업에서는 오버헤드 없도록 ambiguity ≥ 0.5 OR 3+ 단계 조건 부여.

## 정리

- "소크라테스식 모호함 제거 하네스"라는 한 줄 요약이 진짜 정체를 가린 사례. 직접 README와 prompts/, ouroboros/ 코드까지 들어가서 확인했더니 본질은 다른 물건이었다.
- 설치(A안)와 메커니즘 발췌(B안)는 완전히 다른 경로다. 사용자 스타일을 진화시키고 싶다면 A는 효과 없음 — 봇 자신만 진화한다. B만 의미 있다.
- 발췌 이식의 가치는 "이미 갖춘 시스템(CC auto-memory, lessons.md, bkit memory)이 못 잡는 사각지대"를 메우는 것: **사고 시작 시점의 회피 차단**. memory는 사후 학습, lessons는 사후 회고지만, 4문답은 행동 직전에 발동된다.
- 1~2주 운용 후 효과 측정: `tasks/lessons.md`의 drift 기록이 늘어나는지, 응답이 덜 장황해지는지로 판단. 효과 미미하면 Edit으로 ### 7 제거 — 부작용 없음.
- 우로보로스 원본은 "한 사이클 = 한 commit, 한 가지 일관된 변화"(BIBLE P8). 이식도 그 정신을 따라 ①번 하나만 먼저 적용. ②(Drift Detector 별도 섹션 승격), ③(mid-task self-check)은 효과 검증 후 결정.
