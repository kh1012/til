---
draft: true
type: "content"
domain: "devops"
category: "ai-agent"
topic: "Codex + Hermes 조합으로 AI 코딩하는 방법 — Claude Code와의 차이 분석"
updatedAt: "2026-05-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "codex"
  - "hermes-agent"
  - "nous-research"
  - "claude-code"
  - "agent-orchestration"
  - "oh-my-hermes"
  - "agents-md"
  - "soul-md"

relatedCategories:
  - "ai-coding"
  - "developer-tools"
  - "automation"
---

# Codex + Hermes 조합 AI 코딩 — 실제 사용 패턴과 Claude Code와의 차이

> Codex는 정밀 코딩 실행기, Hermes는 그 위에 얹는 메모리 + 채널 + 자가 진화 레이어. 둘을 묶으면 "24/7 모바일에서도 굴러가는 자가 학습 코딩 비서"가 된다.

## 배경

요즘 X와 개발자 커뮤니티에서 "Codex + Hermes 조합"이라는 표현이 자주 보인다. Claude Code 하나만 쓰던 입장에서 이게 정확히 무엇을 보완하는 조합인지, 사람들이 실제로 어떻게 쓰는지, 내가 만들고 있는 tmux 멀티 클로드 오케스트레이션 시스템과 어떻게 다른지가 궁금했다. 그래서 OpenAI 공식 문서, Nous Research GitHub, 비교 벤치마크 글, 그리고 oh-my-hermes 같은 실제 통합 도구를 훑었다.

## 핵심 내용

### 1. 두 도구의 정체부터 정리

**Codex (OpenAI)** — 코딩 실행기에 가깝다.

- 2025년 5월 공개. CLI / 데스크톱 앱 / IDE 익스텐션 / 클라우드 태스크 4개 surface가 모두 GPT-5.x-Codex 두뇌를 공유.
- 샌드박스가 컨테이너가 아니라 **커널 레벨**이다. macOS는 Seatbelt, Linux는 Landlock + seccomp.
- 설정 파일은 `AGENTS.md`. Cursor, Copilot, Amp, Gemini CLI, Windsurf, Cline, Aider, Zed 등이 같은 표준을 공유한다. CLAUDE.md의 cross-tool 버전이라고 보면 된다.
- 데스크톱 앱은 Automations(스케줄링), Skills(라이브러리), git worktree 기반 멀티 스레드 작업을 지원.
- 2026년 2월에 GPT-5.3-Codex 릴리스. SWE-bench Pro에서 SOTA, 이전 대비 25% 속도 향상.

**Hermes (Nous Research)** — 코딩 실행기가 아니라 **자가 개선 + 메모리 + 채널** 레이어다.

- 모델 락인 없음. fallback provider로 OpenRouter, Nous, OpenAI Codex, Copilot, Anthropic, DeepSeek, Alibaba 등 광범위하게 지원.
- Codex OAuth로 GPT-5.5를 쓸 수도 있고, Claude도, 로컬 모델도 가능. `~/.codex/auth.json`을 자동 import.
- 정체성을 3개 파일로 정의:
  - `SOUL.md` — 인격, 톤, 기본 상호작용 패턴 (프로젝트를 가로지름)
  - `USER.md` — Hermes가 스스로 작성하는 사용자 메모리 (학습됨)
  - `AGENTS.md` — 프로젝트별 규칙
- **GEPA 자가 진화** — 반복 작업에서 peer-reviewed 40% 속도 향상. `skill_manage` 도구로 5+ tool call 워크플로우, 에러 복구 경로, 사용자 정정 시점에 자동으로 스킬을 생성/개선.
- 메시징 게이트웨이가 17개 (Telegram, Slack, Discord, WhatsApp, Signal, DingTalk, SMS, Mattermost, Matrix, Webhook, Email, Home Assistant, Feishu/Lark, WeCom, Weixin, BlueBubbles iMessage, QQBot).
- $5 VPS, GPU 클러스터, 서버리스 어디든 올라감. **노트북에 묶이지 않는다**.

### 2. 실제 사람들이 쓰는 조합 패턴

조사하면서 본 패턴은 크게 4가지다.

**(a) 분업형 — 가장 흔함**

Codex를 PR 만드는 정밀 코딩 실행기로 쓰고, 그 바깥에서 Hermes가 24/7 비서/오케스트레이터로 돈다. Hermes가 Telegram에서 명령을 받아 Codex 세션을 spawn → 결과를 Hermes 메모리로 흡수.

**(b) Hermes 안에 Codex를 모델로 박는 형태**

`hermes model` → custom endpoint로 GPT-5.3-Codex를 reasoning backbone으로 사용. 400K context window, 47개 built-in 도구. Slack 채널 모니터링 → 데이터 합성 → SSH/Modal로 터미널 명령 실행 같은 cross-platform 자동화 체인이 가능. 단, $14/M output token이라 알림성 워크플로우엔 비싸다.

**(c) Telegram thread-bound 코딩** — 진짜로 흥미로움

텔레그램 토픽 하나가 = 영속 Codex 세션 또는 Claude Code 세션. 외출 중에 모바일에서 "이 PR 리뷰 코멘트 반영해서 푸시" 같은 명령을 던지면 클라우드 VM에서 작업이 돌아간다. Hermes가 라우터 역할.

**(d) oh-my-hermes(OMH) 같은 통합 CLI**

`omh setup`, `omh handoff codex`, `omh handoff claude`로 세션을 핸드오프. 시그니처 기능은 **DualForge**:

```
dualforge 이 API의 인증 시스템 설계하고 구현해줘
```

→ Claude가 아키텍처/보안 분석을 맡고, Codex가 구현/테스트/성능 최적화를 병렬로. 결과를 각 도구의 강점에 맞춰 머지. Smart Routing이 작업 타입별로 자동 분배(복잡한 reasoning은 Claude, 병렬 파일 수정은 Codex). `ralplan`, `autopilot`, `ultrawork`, `team N`, `dualforge` 같은 magic keyword가 트리거.

### 3. Claude Code 단독과 Codex + Hermes의 핵심 차이

| 항목 | Claude Code | Codex + Hermes |
|------|-------------|----------------|
| 모델 락인 | Anthropic 전용 | 멀티 프로바이더 (OpenAI, Anthropic, OpenRouter, Nous, 로컬) |
| 메모리 구조 | CLAUDE.md (프로젝트 단위) | SOUL/USER/AGENTS 3-layer + 10K+ 스킬 <10ms 검색 |
| 자가 개선 | 없음. skill 수동 작성 | GEPA 자동 학습 루프, 자동 skill 생성/진화 |
| 자율성 | 감독형 (plan mode, 17 lifecycle hooks) | Codex full-auto + Hermes 백그라운드 cron |
| 채널 | 터미널 / IDE 한정 | 17개 메시징 + 터미널 + 6개 backend (local, Docker, SSH, Singularity, Modal, Daytona) |
| 운영 환경 | 로컬 머신 | 노트북 / VPS / GPU / 서버리스 어디든 |
| 라이선스 | 프로프라이어터리 | Hermes는 MIT, Codex는 OpenAI 정책 |
| 강점 영역 | 깊은 코드베이스 이해, 감독형 신뢰성, hooks/MCP | 멀티 채널, 자가 진화, 프로바이더 자유, 24/7 |

벤치마크 상으로 SWE-bench Pro에서는 비등하지만, Terminal-Bench 2.0에서는 Codex가 터미널 작업에서 약간 앞선다. Claude는 cross-file change 이해와 큰 컨텍스트 정합성이 강하다.

### 4. 내 시스템과의 매핑

조사하면서 가장 흥미로웠던 부분은, 내가 이미 만들고 있는 시스템이 Hermes의 일부 기능을 자체 구현 중이라는 점이다.

| Hermes 컨셉 | 내가 쓰는 형태 |
|-------------|---------------|
| SOUL.md / USER.md / AGENTS.md 3-layer | `~/.claude/CLAUDE.md` (전역) + `프로젝트/CLAUDE.md` + 메모리 시스템 |
| 자가 skill 진화 (`skill_manage`) | `/skill-create`, `/create-migration-to-47` 수동 운영 |
| DualForge (Claude + Codex 병렬) | `/max-do`의 Agent Team (3명 시니어 개발자 병렬 구현) |
| Telegram thread-bound 영속 세션 | tmux `do` 세션 pane 1~4 멀티 워커 |
| Cron + 메시징 push | `/schedule`, `/loop` (단일 채널) |
| 멀티 프로바이더 fallback | 없음 (Claude 전용) |

빠진 조각은 두 개다 — **(1) 멀티 채널 메시징 게이트웨이**, **(2) 자동 skill 진화 루프**. 외출 중 코딩, 그리고 반복 작업 패턴의 자동 학습이 그 부분에 해당한다.

### 5. 그래서 어떤 결론이 나오나

- **Codex 단독 < Codex + Hermes < Codex + Claude Code + Hermes**. 셋이 계층적으로 보완된다.
- Hermes는 코딩 실행기가 아니라 그 **위 레이어**다. "어떤 코딩 도구를 쓸지"의 대안이 아니라 "코딩 도구를 어떻게 24/7 굴릴지"의 답.
- Claude Code의 강점(감독형, hooks, MCP, 깊은 codebase 이해)을 그대로 두고 Hermes의 강점(메시징, 자가 진화)을 보완하는 방향이 가장 현실적. 실제로 비교 글들도 "Claude Code + Hermes"를 일상 워크플로우로 추천했다.
- 단, Hermes 도입 = 또 하나의 인프라(VPS, 메시징 봇 토큰, env 관리). 그만한 비용을 감당할 만큼 백그라운드 자율 작업이 필요한지가 ROI 관점.

## 정리

- Codex와 Hermes는 같은 레이어에서 경쟁하지 않는다. Codex는 코딩 실행기, Hermes는 메모리 + 채널 + 오케스트레이터다.
- 내가 만들고 있는 tmux 기반 시스템이 Hermes의 SOUL/USER/AGENTS와 DualForge에 가장 가깝다는 게 인상적이었다. 차이는 **멀티 채널**과 **자동 학습 루프**.
- 당장 Hermes를 도입할 필요는 없지만, "터미널 바깥에서도 코딩 작업이 돌아가야 하는 순간"이 오면 그게 도입 트리거다.
- 더 흥미로웠던 통찰: AGENTS.md가 사실상 cross-tool 표준이 되어가고 있다는 점. CLAUDE.md만 유지하던 프로젝트도 슬슬 AGENTS.md를 같이 두는 게 나아 보인다.

관련 자료:

https://github.com/HERMESquant/oh-my-hermes

https://hermes-agent.nousresearch.com/docs/

https://blakecrosley.com/blog/codex-vs-claude-code-2026

https://developers.openai.com/codex/cli
