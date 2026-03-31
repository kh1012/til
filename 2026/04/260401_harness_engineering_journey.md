---
draft: true
type: "content"
domain: "devops"
category: "harness-engineering"
topic: "3월 한 달간 Claude Code 하네스 엔지니어링 진화 과정 — 커맨드 → Agent Team → Orchestrator → 자동 감사"
updatedAt: "2026-04-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "harness-engineering"
  - "claude-code"
  - "agent-team"
  - "orchestrator"
  - "pdca"
  - "bkit"
  - "cmd-pm"
  - "cmd-qa"

relatedCategories:
  - "workflow"
  - "automation"
  - "code-quality"
---

# 3월 한 달간 Claude Code 하네스 엔지니어링 진화 과정

> 커스텀 커맨드 하나에서 시작해, 병렬 Agent Team과 자동 감사 루프까지 — 한 달간의 하네스 엔지니어링 여정

## 배경

MAXYS frontend-3 프로젝트에서 AI 어시스턴트와 협업하며, "어떻게 하면 AI가 코드베이스의 규칙을 더 잘 지키게 할 수 있을까"를 한 달간 실험했다. 결과적으로 5단계의 진화를 거쳤고, 각 단계마다 뚜렷한 장단점이 있었다.

## Phase 1: 커스텀 커맨드 (3/18~)

### 적용한 것
- `/til` 커맨드: 대화 맥락에서 TIL 자동 생성 → git push까지 원스톱
- CLAUDE.md에 코딩 규칙, FSD 구조, 디자인 토큰 명시

### 장점
- 반복 작업의 마찰 제거 — TIL 하나 쓰는 데 30초
- CLAUDE.md만 잘 써두면 기본적인 규칙 준수는 보장

### 단점
- 규칙이 늘어나면 CLAUDE.md가 비대해짐
- 규칙 준수 여부를 **사후에만** 확인 가능 (사전 차단 불가)
- 단일 세션, 순차 실행만 가능

### 교훈
> CLAUDE.md는 "이렇게 해라"는 잘 전달하지만, "이걸 위반했는지 확인해라"는 별도 메커니즘이 필요하다.

---

## Phase 2: PDCA + bkit 워크플로우 (3/19~)

### 적용한 것
- bkit의 `/pdca plan` → `/pdca design` → `/pdca do` → `/pdca analyze` → `/pdca report` 사이클
- `/plan-plus`로 YAGNI Review 추가 — 스코프 폭발 방지
- Gap Analysis로 Design 문서 vs 구현 코드 일치율 측정

### 장점
- **정량적 품질 측정**: Match Rate 91% → Iterate → 100%처럼 숫자로 추적
- Plan Plus의 YAGNI Review가 "이것도 넣을까?"를 사전 차단 → MVP로 하루 완주 가능
- Design 문서에 모든 맥락이 담기므로, Do 단계는 새 세션에서도 시작 가능

### 단점
- 전체 사이클이 순차적 — Plan → Design → Do → Check 각 단계에 사용자 개입 필요
- 단일 Agent가 모든 작업 수행 → 대규모 리팩토링에서 병목

### 교훈
> PDCA는 "무엇을 만들 것인가"의 품질을 올리는 데 강력하다. 하지만 "이미 만들어진 코드가 규칙을 지키는가"는 별도 감사 메커니즘이 필요했다.

---

## Phase 3: Agent Team 병렬 실행 (3/20~)

### 적용한 것
- QA 1명 + Senior Dev 3명 + Leader 구조
- QA가 먼저 회귀 테스트 작성 → 3명이 파일 경계 기준으로 독립 영역 병렬 구현
- `run_in_background: true`로 동시 실행, 재시도 루프 최대 5회

### 장점
- **순차 대비 40~60% 시간 단축** (실측)
- 파일 경계로 영역을 나누면 merge conflict 제로
- QA 선행 패턴(Test-First)이 안전망 역할 — 505개 기존 테스트 유지

### 단점
- **아키텍처 드리프트**: Agent가 "더 좋은 방법"을 찾아 전면 재작성하는 사고 발생 (props → Jotai 전환)
- "무엇을 변경하지 말 것"을 명시하지 않으면 예측 불가능한 결과
- Worktree 격리 시 동일 atom이 이중 인스턴스화되는 문제

### 교훈
> 병렬 Agent에게는 "해야 할 것"보다 **"하지 말아야 할 것"**이 더 중요하다. 파일 경계 분배 + 변경 금지 목록이 핵심.

---

## Phase 4: Orchestrator + tmux 패턴 (3/26~)

### 적용한 것
- CLAUDE.md에 Orchestrator Mode 정의: 본인은 오케스트레이터(Tab 1), tmux `do` 세션 pane 1~4가 워커
- `tmux send-keys`로 작업 분배, `tmux capture-pane`으로 모니터링
- 완료 신호: 워커가 `tmux send-keys -t [오케스트레이터 pane] '세션N 완료' Enter`

### 장점
- **하루 7개 UI 세션 완료**, LHCI 75→87 달성
- 오케스트레이터가 진행 상황을 실시간 확인 가능
- Phase 분리: 의존성 없는 작업 병렬, 있는 작업 순차

### 단점
- 긴 프롬프트를 `tmux load-buffer`로 보내면 bkit의 AskUserQuestion에 걸려 실제 작업 미시작
- `❯` 프롬프트가 떴다고 작업 완료가 아님 — grep/diff로 실제 검증 필요
- 세션 관리가 수동 — 워커가 에러로 멈추면 수동 개입

### 교훈
> tmux 기반 오케스트레이션은 강력하지만, **프롬프트는 짧게**, **완료 판정은 출력 내용 기반으로** 해야 한다. `❯` 프롬프트 ≠ 완료.

---

## Phase 5: 자동 감사 루프 — /cmd-pm + /cmd-qa (3/21~ → 4/1 완성)

### 적용한 것

#### /cmd-pm (감사 커맨드)
- R1~R27 규칙 체계: grep으로 검출 가능한 패턴 중심으로 규칙 정의
- 4명 병렬 감사관: A(토큰+성능) / B(구조+품질) / C(디자인 일관성) / D(런타임 안정성)
- 위반을 파일:라인 수준으로 기록 → 수정 계획의 입력

#### /cmd-qa (자동 이터레이션)
- cmd-pm → plan → do → analyze 사이클을 match rate 100%까지 자동 반복
- 최대 5회 이터레이션 제한 (무한 루프 방지)
- 각 이터레이션마다 git commit 체크포인트

#### 진화 과정
1. **3/21**: R1~R13 13개 규칙, 감사관 3명 → 238건 발견, 180건 수정
2. **3/22**: 감사 → 수정 → 재감사 루프 수동 반복 → 182건 → 1건
3. **4/1**: R1~R27 27개 규칙, 감사관 4명, /cmd-qa 자동 루프 → 87건 → 0건 (8 이터레이션)

### 장점
- **감사가 주관적 판단을 배제**: grep 결과가 0이면 PASS — 일관된 기준
- **근본 원인 해결이 최고 ROI**: t() 시그니처 1개 변경으로 96파일 일괄 정리
- 규칙 체계가 문서화되어 있어 새 팀원(또는 새 세션)에게도 동일 기준 적용
- 이터레이션당 커밋으로 롤백 가능

### 단점
- R11(일관성)은 자동화 불가 — 파일을 직접 읽어 비교해야 함
- 규칙 수가 늘어나면 감사 시간도 증가 (현재 ~2분/회)
- 대규모 아키텍처 변경(widget 조합 패턴 등)은 자동 수정 범위 밖

### 교훈
> 규칙은 "grep으로 검출 가능"하게 설계해야 자동화된다. 자동화할 수 없는 규칙(R11)은 별도 프로세스가 필요.

---

## 현재 워크플로우 (4/1 기준)

```
새 기능 개발:
  /plan-plus {feature}     ← YAGNI로 스코프 제어
  /pdca design             ← 3안 비교 + 아키텍처 선택
  /pdca do                 ← TDD + Agent Team 병렬
  /pdca analyze            ← Gap Analysis 90%+ 확인
  /pdca report             ← 완료 보고서

코드 품질 감사:
  /cmd-pm                  ← 4명 병렬 감사 (R1~R27)
  /cmd-qa                  ← 자동 이터레이션 (100%까지)

대규모 리팩토링:
  Orchestrator Mode        ← tmux 4-pane 병렬 워커
  Agent Team               ← QA 선행 + 파일 경계 분배

일상:
  /til                     ← TIL 자동 생성 + push
  /commit-kr               ← 한국어 conventional commit
  /daily-summary           ← 하루 작업 회고
```

## 정리

한 달간 5단계를 거치며 배운 가장 큰 교훈:

1. **CLAUDE.md는 시작점이지 끝이 아니다** — 규칙을 적는 것과 규칙을 검증하는 것은 다른 문제
2. **병렬화의 핵심은 "하지 말 것" 명시** — Agent에게 자유도를 주면 아키텍처 드리프트 발생
3. **근본 원인 1개 > 증상 100개** — t() 시그니처 변경이 96파일 수동 수정보다 낫다
4. **grep으로 잡히는 규칙만 자동화 가능** — 일관성 같은 미적 판단은 사람(또는 파일 비교 Agent)이 해야 함
5. **이터레이션 + 커밋 = 안전망** — 매 사이클마다 체크포인트가 있으면 실패해도 돌아갈 곳이 있다
