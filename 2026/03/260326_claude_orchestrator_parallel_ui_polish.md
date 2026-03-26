---
draft: true
type: "content"
domain: "frontend"
category: "ai-assisted-development"
topic: "Claude Code Orchestrator Mode로 7개 세션 병렬 UI 개선 + LHCI 성능 최적화"
updatedAt: "2026-03-26"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "claude-code"
  - "orchestrator-mode"
  - "tmux"
  - "lighthouse-ci"
  - "performance-optimization"
  - "parallel-development"

relatedCategories:
  - "devops"
  - "nextjs"
  - "react"
---

# Claude Code Orchestrator Mode — 병렬 UI 개선 + LHCI 성능 최적화

> tmux 4-pane 병렬 워커로 7개 UI 세션을 동시 실행하고, LHCI Performance 75→87 달성한 하루 기록

## 배경

MAXYS 프론트엔드의 채팅 UX 전반을 개선해야 했다. API 네이밍 정리, 입력창 개편, 파일 미리보기, 폰트, localStorage 마이그레이션까지 7개 독립 세션. 하나씩 순차로 하면 하루에 끝낼 수 없는 양이라, Claude Code의 Orchestrator Mode를 활용해 tmux 4-pane 병렬 실행으로 진행했다.

## 핵심 내용

### 1. Orchestrator Mode 구조

```
오케스트레이터 (터미널 Tab 1)
  ├── tmux send-keys로 워커에 프롬프트 전달
  ├── tmux capture-pane으로 진행 모니터링
  └── 완료 감지 후 다음 Phase 분배

tmux "do" 세션 (4-pane)
  ├── pane %0: 세션1 API Tier 리네이밍 (27파일)
  ├── pane %2: 세션4 버블 Footer (1파일)
  ├── pane %1: 세션6 폰트 진단 (1파일)
  └── pane %3: 세션5 파일 미리보기 (5파일)
```

### 2. Phase 분리 — 의존성 기반

- **Phase 1**: 독립 트랙 4개 병렬 (세션 1, 4, 5, 6)
- **Phase 2**: 순차 (세션 2→3) + 병렬 (세션 7)
- **Phase 3**: 성능 분석 4영역 병렬 → Critical→Important 순차 수정

의존성이 없는 작업은 병렬, 있는 작업(Portal→active 효과)은 순차. 이 구분이 핵심.

### 3. 워커 프롬프트 설계의 교훈

**실패 패턴**: 긴 프롬프트를 `tmux load-buffer + paste-buffer`로 전달하면, Claude가 bkit의 AskUserQuestion에 먼저 응답하느라 실제 작업을 시작 안 함. Enter가 안 먹히는 경우도 있음.

**성공 패턴**:
- 프롬프트는 한 줄 또는 간결하게
- 디자인 문서 참조 시 "라인 N~M을 읽고 실행해" 형태
- 워커가 bkit 질문을 할 경우를 대비해 프롬프트 재전송 준비

### 4. 완료 감지의 함정

`❯` 프롬프트가 보인다고 "완료"가 아니다. 작업이 중간에 끊기고 프롬프트로 돌아온 경우도 있음. **반드시 grep/diff로 실제 작업 완수를 검증**해야 한다.

```bash
# 잘못된 완료 판단
tmux capture-pane -t %0 -p | tail -3  # ❯ 보임 → "완료!"

# 올바른 완료 판단
grep -rn "mockup" src/ --include="*.ts" | wc -l  # 0이면 진짜 완료
```

### 5. LHCI 성능 최적화 결과

| 메트릭 | Before | After | 변화 |
|--------|--------|-------|------|
| Performance | 75 | 87 | +12 |
| LCP | 4,369ms | 2,127ms | -51% |
| TTI | 6,061ms | 4,020ms | -34% |
| Speed Index | 1,438ms | 582ms | -60% |
| Total Bytes | 6.2MB | 3.9MB | -37% |

핵심 수정:
- `useStableItemContent` — 이미 구현된 훅을 연결만 함 (Virtuoso 리렌더 안정화)
- `setInterval(16ms)` → `50ms` — 스트리밍 state 업데이트 빈도 감소
- `messages` deps를 ref로 전환 — effect 실행 ~90% 감소
- 폰트 preload 최적화 — 번들 크기 대폭 감소

### 6. 검증 → 피드백 → 수정 루프

설계 문서 기반 Gap Analysis(100%) 후에도 실제 브라우저 검증에서 많은 이슈 발견:
- Portal 전환으로 렌더링 멈춤 → sticky로 원복
- `blob:` URL CSP 차단 → File 객체 전달 + FileReader
- 다크모드 hover 구분감 부족 → `--hover-overlay` 조정

**코드 레벨 Gap Analysis와 시각 검증은 별개**. 둘 다 해야 한다.

### 7. 하루 커밋 로그

```
09d7f36 refactor(api): mockupMode → clientMode 리네이밍
b89d6f7 style(message): 메세지버블 Footer 항상 노출
0c89bf5 feat(file-card): 파일첨부 미리보기 개선
dd16038 fix(tool-card): font-black dead code 제거
707f20d refactor(storage): localStorage maxys: → max: 마이그레이션
35ccbc8 feat(chat-area): MessageInput Portal 변환
0fe33e1 style(message-input): 포커스 시 scale 효과
e9a591d chore: .bkit/ gitignore 추가
1ee2b54 perf: 성능 최적화 — LHCI 75→87
914dadc fix(ui): 검증 피드백 — Portal 원복, 스케일 제거
4309290 fix(ui): snippet filename fallback
dbeb4c0 fix(file-preview): blob URL 지원
78575f7 feat(ui): 검색 기능, 다크모드 hover, ConfirmDialog
```

## 정리

- Orchestrator Mode는 **독립성이 높은 다수 작업**에 매우 효과적. 4-pane으로 7개 세션을 하루에 완료
- 워커 프롬프트는 **짧고 명확하게**, 디자인 문서 라인 참조 형태가 최적
- `❯` 프롬프트 ≠ 작업 완료. **grep/diff로 실제 검증** 필수
- LHCI 점수는 **런타임 리렌더 최적화로는 안 오름**. 번들 크기, 폰트, LCP가 핵심
- Gap Analysis 100%여도 **브라우저 시각 검증에서 새 이슈 발견**됨. CSP, Portal 스코프 같은 런타임 이슈는 코드 분석만으로 못 잡음
- 설계 → 구현 → 분석 → 검증 → 피드백 → 수정 루프를 **같은 날 3바퀴** 돌린 게 품질에 결정적
