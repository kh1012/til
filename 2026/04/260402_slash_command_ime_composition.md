---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Slash Command 팝오버에서 한글 IME composition 처리"
updatedAt: "2026-04-02"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "IME"
  - "compositionstart"
  - "compositionend"
  - "slash command"
  - "Korean input"
  - "React"
  - "textarea"

relatedCategories:
  - "javascript"
  - "ux"
  - "i18n"
---

# Slash Command 팝오버에서 한글 IME composition 처리

> 한글 IME 합성 중에도 슬래시 커맨드 필터링이 동작하려면 composing 가드를 트리거 감지에만 제한해야 한다.

## 배경

MessageInput textarea에 `/` 입력 시 커맨드 팔레트 팝오버를 띄우는 기능을 구현했다. Notion, Slack, Claude Code 등에서 검증된 패턴이지만, 한글 입력 환경에서 특유의 문제가 발생했다.

`/스`를 입력하면 "스프레드시트"가 필터링되어야 하는데, 팝오버가 전혀 반응하지 않았다.

## 핵심 내용

### 문제: IME composing 가드가 너무 넓음

처음 구현에서 `handleChange`의 최상단에 composing 가드를 배치했다:

```typescript
const handleChange = useCallback((value: string) => {
  // 이 가드가 모든 한글 입력을 차단
  if (isComposingRef.current) return;

  if (!isOpen) {
    // '/' 트리거 감지
  } else {
    // 쿼리 업데이트 (여기도 차단됨!)
  }
}, [isOpen, dismiss]);
```

한글 IME는 글자를 조합하는 동안 `compositionstart` → (입력 중) → `compositionend` 이벤트를 발생시킨다. `onChange`는 조합 중에도 계속 호출되지만, `isComposingRef.current`가 true라서 **쿼리 업데이트 자체가 차단**되었다.

### 해결: composing 가드를 트리거 감지에만 제한

composing 가드가 필요한 곳은 **새로운 `/` 트리거 감지**뿐이다. 이미 팝오버가 열린 상태에서의 쿼리 업데이트는 한글 조합 중에도 실시간으로 반영되어야 한다:

```typescript
const handleChange = useCallback((value: string) => {
  if (!isOpen) {
    // 새 '/' 트리거 감지 — IME 합성 중에는 무시
    if (isComposingRef.current) return;
    // ... 트리거 로직
  } else {
    // 이미 열려 있으면 쿼리 업데이트 — 합성 중에도 허용
    // ... 쿼리 업데이트 로직
  }
}, [isOpen, dismiss]);
```

### 왜 트리거만 가드하는가?

| 상황 | composing 중 동작 | 이유 |
|------|-------------------|------|
| `/` 트리거 감지 | 차단 | 한글 조합 중 `ㅎ` + `/` 같은 입력이 잘못 트리거될 수 있음 |
| 쿼리 업데이트 | 허용 | `/` 이후 한글을 입력하면 조합 중에도 필터 결과가 보여야 UX가 자연스러움 |
| Enter 키 처리 | `handleKeyDown`에서 별도 처리 | IME Enter(확정)와 커맨드 Enter(선택) 분리는 keyDown 레벨에서 처리 |

### 추가 학습: 플랫폼별 커맨드 필터링

Electron 전용 커맨드(작업폴더)를 웹에서 숨기기 위해 `usePlatform()` hook과 `filterByPlatform()` 유틸을 조합했다:

```typescript
const platform = usePlatform(); // "electron" | "web"
const platformCommands = useMemo(
  () => filterByPlatform(SLASH_COMMAND_REGISTRY, platform),
  [platform],
);
```

레지스트리의 `platform?: "electron" | "all"` 필드로 선언적 필터링. 미지정 시 모든 플랫폼에 표시.

## 정리

- **IME composing 가드는 가능한 좁은 범위에만 적용**해야 한다. 넓게 걸면 한글 사용자의 실시간 피드백이 차단된다.
- 트리거(시작점)와 쿼리 업데이트(진행 중)는 IME 관점에서 완전히 다른 맥락이므로 분리해서 처리해야 한다.
- Notion의 `/` 커맨드가 한글에서 잘 동작하는 이유가 이 패턴 덕분일 것으로 추정된다.
- 커맨드 레지스트리를 Single Source of Truth로 두면 PlusMenu와 SlashCommand가 동일 데이터를 공유하면서도 플랫폼별 필터링을 선언적으로 처리할 수 있다.
