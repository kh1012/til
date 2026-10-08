---
type: "content"
domain: "frontend"
category: "react"
topic: "표 편집 모드에서 ↑↓ 세로 이동 구현 시 한글 조합(IME) 중 keydown을 가로채면 글자가 끊기는 문제를 compositionend로 미루어 막기"
updatedAt: "2026-10-07"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ime-composition"
  - "iscomposing-keycode-229"
  - "compositionend"
  - "arrow-key-navigation"
  - "table-edit-mode"

relatedCategories:
  - "ui-ux"
  - "testing"
---

# 표 편집 모드에서 ↑↓ 세로 이동 구현 시 한글 조합(IME) 중 keydown을 가로채면 글자가 끊기는 문제를 compositionend로 미루어 막기

> atelier의 library table view에서 일괄 수정 칸에 ↑↓ 키로 같은 열의 다음/이전 칸으로 넘어가는 기능(`moveVertical`/`useVerticalNav`, `apps/atelier/shell/src/lib/table-keys.ts`)을 TDD로 구현했다. 한글을 입력하는 도중에도 Arrow 키를 눌러 글자를 조합하는 경우가 있는데, `keydown` 핸들러가 이를 그대로 가로채 포커스를 옮겨버리면 조합 중이던 글자가 끊긴다. 조합 여부를 확인해 이동을 미뤘다가 `compositionend` 시점에 실행하는 방식으로 막았다.

## 배경

표 형태의 일괄 수정 UI(`ComponentTable`/`PageTable`)에서 칸마다 입력칸(`[data-editor]`)이 있고, Tab은 기본 동작(오른쪽 이동)을 그대로 쓰지만 ↑↓는 별도로 같은 열의 위/아래 칸으로 포커스를 옮기도록 설계했다(AD 설계 2.6, R12). 묶음 줄(`data-group-row`)과 잠긴 줄(`data-locked`)은 건너뛰고, 한 칸에 입력칸이 여러 개(이름·요약)면 DOM 순서가 곧 화면 순서이므로 그 순서대로 넘어간다.

## 핵심 내용

**IME 조합 중에는 keydown의 Arrow 키가 "글자 선택" 용도로도 쓰인다.** 한글·일본어 등 조합형 입력 중 사용자가 후보를 고르거나 커서를 옮기려고 Arrow 키를 누를 수 있는데, 이 이벤트를 애플리케이션이 그대로 가로채 포커스를 다른 칸으로 옮기면 조합 중이던 글자가 끊기거나 사라진다.

**판정은 `e.isComposing || e.keyCode === 229`.** 최신 브라우저는 `isComposing`을 지원하지만 일부 환경(특히 구형 IME 조합 이벤트)에서는 `keyCode === 229`로만 조합 중임을 알 수 있어 둘 다 검사한다.

```js
const onKey = (e: KeyboardEvent) => {
  if (e.key !== "ArrowDown" && e.key !== "ArrowUp") return;
  if (e.altKey || e.metaKey || e.ctrlKey) return;
  const el = e.target as HTMLElement;
  if (!el.matches?.(EDITOR_SELECTOR)) return;
  const dir = e.key === "ArrowDown" ? 1 : -1;
  if (e.isComposing || e.keyCode === 229) {
    pending = { el, dir };
    return;
  }
  e.preventDefault();
  moveVertical(el, dir);
};
const onCompositionEnd = (e: CompositionEvent) => {
  if (!pending || pending.el !== e.target) return;
  const { el, dir } = pending;
  pending = null;
  window.setTimeout(() => moveVertical(el, dir), 0);
};
```

- 조합 중이면 이동을 실행하지 않고 `{ el, dir }`을 `pending`에 저장만 해둔다. 이 시점엔 `preventDefault`도 호출하지 않아 IME 자체의 Arrow 키 처리를 막지 않는다.
- `compositionend`가 오면 그제서야 저장해둔 이동을 실행한다. `window.setTimeout(..., 0)`으로 한 틱 미루는 이유는 `compositionend` 직후 아직 DOM 값이나 커서 상태가 완전히 정리되지 않은 타이밍 문제를 피하기 위해서다.
- `pending.el !== e.target`이면 무시한다 — 조합이 끝난 요소와 애초에 이동을 요청한 요소가 다르면(포커스가 그 사이 다른 칸으로 옮겨진 경우) 엉뚱한 칸을 이동시키게 되므로 대상을 다시 확인한다.

**이동 자체는 Alt/Meta/Ctrl 조합 키와 무관하게 순수 함수로 분리.** `moveVertical(from, dir)`은 DOM만 보고 다음 입력칸을 찾아 포커스하고 커서를 끝으로 옮기는 로직만 담당한다. `useVerticalNav`는 이 함수를 언제 호출할지(조합 여부, 테이블 경계)만 판단하는 책임으로 나뉘어 있어, 이동 로직 자체는 IME를 신경 쓰지 않고 테스트할 수 있다(`table-keys.test.ts`, jsdom 환경에서 같은 열 이동·묶음/잠긴 줄 건너뛰기·다중 입력칸 순회·경계값 3개 테스트로 검증).

## 정리

키보드 이벤트로 포커스를 옮기는 기능을 만들 때, 그 키가 Arrow·Enter·Backspace처럼 IME 조합 중에도 쓰이는 키라면 `keydown` 시점에 바로 동작을 실행하면 안 된다. `isComposing`/`keyCode === 229`로 조합 여부를 먼저 걸러내고, 조합 중이었다면 요청만 저장해뒀다가 `compositionend`에서 실행하는 패턴은 이번처럼 좁은 범위(표 안 Arrow 키 이동)뿐 아니라 텍스트 입력 중 단축키를 받는 모든 UI에 재사용할 수 있다.
