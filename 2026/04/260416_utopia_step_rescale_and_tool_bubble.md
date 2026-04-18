---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "Utopia step 스케일 정상화 + 메시지 버블 도구 호출 UI 리디자인"
updatedAt: "2026-04-16"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "utopia"
  - "fluid-typography"
  - "design-tokens"
  - "codemod"
  - "claude-code-cli"
  - "tool-bubble"
  - "preview-driven-design"

relatedCategories:
  - "css"
  - "tailwind"
  - "react"
  - "nextjs"
---

# Utopia Step 스케일 정상화 + 도구 호출 버블 리디자인

> 디자인 토큰의 의미 체계를 웹 표준(step-0=16px)으로 정상화하고, 메시지 버블의 도구 호출 UI를 Claude Code CLI 스타일로 전면 재설계한 하루.

## 배경

MAX Frontend의 Utopia type scale에서 `--step-0`이 `1.25rem(20px)`으로 설정되어 있었다. 웹 표준에서 본문 크기는 `1rem(16px)`인데, 우리 프로젝트에서는 실질적으로 `text-step-n1`(16px)이 본문 역할을 하고 있어서 의미 체계가 한 단계씩 밀려있었다. 이 문제를 인지한 건 응답 메시지 버블의 도구 호출 UI를 리디자인하면서 "왜 Claude Code보다 글씨가 15% 정도 커보이지?"라는 질문에서 출발했다.

## 핵심 내용

### 1. Preview-Driven Design 워크플로우

실제 컴포넌트를 바로 수정하는 대신, `/preview/tool-bubble` 라우트를 만들어 Current vs Proposed를 좌우 비교하며 디자인을 다졌다. 4가지 시나리오(Completed, Running, Error, Spreadsheet)를 mock 데이터로 구성하여 모든 상태를 한 눈에 확인할 수 있었다. 피드백 반영이 빨라지고, 실제 프로덕션 코드를 건드리지 않으니 안전했다.

### 2. Utopia Step 재정의 - 접근법 B

세 가지 접근법을 분석했다:
- **A**: CSS 변수만 변경 - step-n2가 10.2px로 가독성 한계선 침범. 불가.
- **B**: CSS 변수 변경 + 토큰 1단계 격상 - 시각적 변화 제로. 채택.
- **C**: 비율 변경(1.25 -> 1.2) - 전체 UI 축소 발생.

접근법 B의 핵심은 "CSS 값은 내리되, 컴포넌트에서 한 단계 큰 토큰을 쓰면 렌더링 결과는 동일하다"는 것이다.

```
CSS: step-0 = 1.25rem → 1rem
컴포넌트: text-step-n2 → text-step-n1 (12.8px 유지)
결과: 시각적 변화 제로 + 의미 체계 정상화
```

### 3. Codemod로 720건 자동 치환

단일 패스 정규식으로 이중 치환 문제를 피했다:

```javascript
const PATTERN = /\btext-step-(n?[0-5]|[0-4])\b/g;
content.replace(PATTERN, (match) => UPGRADE_MAP[match] ?? match);
```

`sed` 역순 치환 대신 정규식 callback 방식을 쓰면 치환 순서를 신경 쓸 필요가 없다. `text-step-n2`를 매칭하면 map에서 `text-step-n1`을 돌려주기만 하면 된다. 721건, 245파일을 수초 만에 처리.

### 4. Space 토큰은 독립적이지만 논리적으로 연관

`--space-*`와 `--step-*`는 CSS 변수 참조 없이 각각 독립된 clamp 값으로 정의되어 있다. 하지만 동일 Utopia 설정(320~1440px, base 1rem)에서 산출된 값이라 `space-s`의 max값과 `step-0`의 max값이 동일(1.25rem)했다. step만 바꾸면 typography-spacing 비율이 깨질 수 있으므로 별도 작업으로 분리했다. Space를 0.8배 줄이면 모든 여백이 20% 작아지는데, 이건 "시각적 변화 제로" 원칙에 위배.

### 5. Claude Code CLI 스타일의 도구 호출 UI

Claude Code CLI의 시각 언어를 분석하고 차용했다:
- `ToolBullet`: 6px 색상 dot (StatusBadge 아이콘 대체)
- `ToolConnector`: ⎿ 유니코드 글리프 (absolute CSS 선 대체)
- `CollapsibleOutput`: 2줄 미리보기 + "+N lines 펼치기" (스크롤 박스 대체)
- `font-light` 도구 라벨 + `(query...)` arg hint

핵심 교훈: UI 컴포넌트의 "정보 밀도"와 "시각적 무게"를 분리하는 것. StatusBadge(아이콘)는 정보는 풍부하지만 시각적으로 무겁다. 6px dot은 정보를 색상 하나로 압축하지만 시각적으로 가볍다.

### 6. 3-Worker Worktree 병렬 구현

Agent Team으로 3명을 worktree 격리 실행하여 파일 충돌 없이 병렬 구현했다:
- Worker A: ToolBullet → ToolCallButton → ToolCallIndicator
- Worker B: ToolConnector → ToolCallGroup → ToolStepSection → ToolCallExpandedContent
- Worker C: IntentEditForm → IntentCard

## 정리

디자인 시스템의 "의미 체계"가 실제 사용 패턴과 괴리되면, 코드베이스 전체에 인지 부하가 쌓인다. "step-0이 본문이 아니라 소제목"이라는 사실을 모든 개발자가 기억해야 하니까. 720건을 고치는 건 하루면 되지만, 그 괴리를 인지하지 못한 채 쌓이는 비용은 매일 발생한다. 디자인 토큰은 값이 아니라 의미다.

도구 호출 UI의 경우, "정보를 보여주는 방법"에 대한 관점 전환이 있었다. 기존에는 카드 박스 + 아이콘 배지로 각 요소를 "격리"했는데, Claude Code는 모든 것을 하나의 텍스트 스트림으로 통합한다. 격리는 안전하지만 흐름을 끊고, 통합은 흐름을 살리지만 구분이 약해진다. 6px dot + ⎿ connector는 그 사이의 균형점이었다.
