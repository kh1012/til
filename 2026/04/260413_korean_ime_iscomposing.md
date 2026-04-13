---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "한국어 IME 조합 중 keydown 이벤트 중복 발생 문제와 isComposing 해결"
updatedAt: "2026-04-13"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "IME"
  - "isComposing"
  - "keydown"
  - "Korean input"
  - "React"
  - "textarea"

relatedCategories:
  - "javascript"
  - "browser"
---

# 한국어 IME 조합 중 keydown 이벤트 중복 발생과 isComposing

> 한국어 IME 조합 상태에서 Tab 키를 누르면 keydown이 두 번 발생하여 의도치 않게 2칸 이동하는 문제를 `isComposing`으로 해결했다.

## 배경

이미지-LaTeX 변환기의 카드 리뷰 화면에서 textarea에 Tab 키를 누르면 다음 카드로 포커스가 이동하는 기능을 구현했다. 평소에는 정상 동작하지만, 한글 입력 중(예: 'ㄴ' 조합 상태)에 Tab을 누르면 **카드가 1칸이 아닌 2칸씩 건너뛰는** 버그가 발생했다.

## 핵심 내용

### IME 조합과 keydown 이벤트

한국어/일본어/중국어 등 CJK 입력은 IME(Input Method Editor)를 통해 조합 과정을 거친다. 브라우저에서 IME 조합 중 다른 키를 누르면:

1. 조합 종료를 위한 `keydown` 이벤트 발생 (`isComposing: true`)
2. `compositionend` 이벤트 발생
3. 실제 키에 대한 `keydown` 이벤트 발생 (`isComposing: false`)

즉, Tab 한 번 눌렀는데 `keydown`이 **두 번** 발생한다. 첫 번째는 조합 종료용, 두 번째가 실제 Tab이다.

### 문제가 된 코드

```tsx
onKeyDown={(e) => {
  if (e.key === 'Tab' && onTabToNext && cardIndex != null) {
    e.preventDefault();
    onTabToNext(cardIndex, e.shiftKey);
  }
}}
```

`e.key === 'Tab'` 조건만 체크하므로 조합 종료 이벤트에서도 핸들러가 실행되어 `onTabToNext`가 두 번 호출된다.

### 해결: isComposing 체크

```tsx
onKeyDown={(e) => {
  if (e.nativeEvent.isComposing) return;  // IME 조합 중이면 무시
  if (e.key === 'Tab' && onTabToNext && cardIndex != null) {
    e.preventDefault();
    onTabToNext(cardIndex, e.shiftKey);
  }
}}
```

`e.nativeEvent.isComposing`이 `true`이면 IME 조합 중이므로 early return한다. React의 SyntheticEvent에서는 `isComposing`이 직접 노출되지 않으므로 `nativeEvent`를 통해 접근한다.

### 주의사항

- **Enter 키도 동일한 문제가 발생한다.** 닉네임 입력 등 `onKeyDown`으로 Enter를 처리하는 곳에서도 같은 패턴을 적용해야 한다.
- `e.keyCode === 229`로 체크하는 레거시 방법도 있지만, `isComposing`이 표준이고 더 명확하다.
- `compositionstart`/`compositionend` 이벤트로 상태를 관리하는 방법도 있지만, `isComposing` 한 줄이 가장 간결하다.

### 적용 범위

이 프로젝트에서 동일 패턴을 적용한 곳:

| 컴포넌트 | 키 | 용도 |
|----------|-----|------|
| `ConversionCard` | Tab | 다음 카드로 포커스 이동 |
| `NicknameDialog` | Enter | 닉네임 제출 |

## 정리

CJK IME 환경에서 `keydown` 이벤트 핸들러를 작성할 때는 **반드시 `isComposing` 체크를 첫 줄에 넣는 것**을 습관화해야 한다. 영문 키보드로만 테스트하면 발견할 수 없는 버그이므로, 한글 입력 테스트를 QA 체크리스트에 포함시키는 것이 좋다.
