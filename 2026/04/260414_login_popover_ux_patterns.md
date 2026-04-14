---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "로그인 팝오버 UX 패턴 — backdrop-filter 중첩, StorageEvent, 한글 타이핑 애니메이션"
updatedAt: "2026-04-14"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "backdrop-filter"
  - "StorageEvent"
  - "한글 조합"
  - "lottie"
  - "framer-motion"
  - "AnimatePresence"
  - "Next.js router"

relatedCategories:
  - "css"
  - "nextjs"
  - "typescript"
---

# 로그인 팝오버 UX 패턴 — 3가지 함정과 해결

> 풀스크린 로그인 오버레이를 만들면서 만난 backdrop-filter 중첩 버그, 같은 탭 StorageEvent 미발생, Next.js 클라이언트 네비게이션 상태 동기화 문제를 정리한다.

## 배경

MAX 프론트엔드의 로그인 팝오버를 리디자인하면서, Confetti Lottie 배경 + frosted glass 카드 + 한글 타이핑 애니메이션 + 부드러운 전환 효과를 구현했다. 겉보기엔 단순한 UI지만, 3가지 브라우저/프레임워크 함정을 밟았다.

## 핵심 내용

### 1. CSS backdrop-filter 중첩 불가

부모 요소에 `backdrop-blur`가 있으면, 자식의 `backdrop-blur`는 동작하지 않는다.

```tsx
// Bad — 중첩 backdrop-filter, 카드의 blur 무시됨
<div className="backdrop-blur-md bg-background/40">     // 오버레이
  <div className="bg-surface/60 backdrop-blur-2xl" />    // 카드
</div>

// Good — 형제 레이어로 분리
<div>                                                     // 컨테이너만
  <div className="absolute inset-0 backdrop-blur-md" />   // 1) 스크림
  <div className="absolute inset-0"><Confetti /></div>     // 2) 콘텐츠
  <div className="relative z-10 backdrop-blur-2xl" />     // 3) 카드
</div>
```

**원인**: `backdrop-filter`는 새로운 스태킹 컨텍스트를 생성한다. 부모가 이미 backdrop-filter를 적용하면, 자식의 backdrop-filter는 부모의 "이미 필터링된" 결과 위에서 동작하므로 효과가 보이지 않는다.

**해결**: blur가 필요한 요소들을 부모-자식이 아닌 **형제 관계**로 배치한다.

### 2. 같은 탭에서 localStorage 변경 시 StorageEvent 미발생

`localStorage.setItem()`은 **다른 탭**에서만 `storage` 이벤트를 발생시킨다. 같은 탭의 리스너는 호출되지 않는다.

```tsx
// useIsAdmin 훅 — storage 이벤트로 admin 상태 구독
useEffect(() => {
  const check = () => setAdmin(isAdmin(getStoredUsername()));
  window.addEventListener("storage", check);
  return () => window.removeEventListener("storage", check);
}, []);
```

로그인 후 `localStorage.setItem(STORAGE_KEY, username)`을 해도 같은 탭의 `useIsAdmin`이 갱신되지 않아 사이드바 admin 메뉴가 안 나타났다.

```tsx
// 해결: 수동으로 StorageEvent dispatch
localStorage.setItem(STORAGE_KEY, trimmed);
window.dispatchEvent(
  new StorageEvent("storage", { key: STORAGE_KEY, newValue: trimmed })
);
```

### 3. Next.js router.replace vs window.location.href

| 방식 | 장점 | 단점 |
|------|------|------|
| `window.location.href` | 모든 컴포넌트 완전 초기화 | 풀 리프레시 화면 깜빡임 |
| `router.replace()` | SPA 전환, 깜빡임 없음 | 이미 마운트된 컴포넌트 미갱신 |
| `router.replace()` + `StorageEvent` | 깜빡임 없음 + 상태 동기화 | 리스너가 있는 컴포넌트만 갱신 |

최종 선택: `router.replace` + `StorageEvent` dispatch. AnimatePresence exit 애니메이션 동안 클라이언트 네비게이션이 동시에 진행되어 매끄러운 전환을 달성했다.

### 보너스: 한글 조합 단계 타이핑 애니메이션

한글은 자모 조합 과정이 있어서 단순히 글자 단위로 추가하면 부자연스럽다.

```
영어: H → He → Hel → Hell → Hello
한글: ㅇ → 이 → 이ㄹ → 이르 → 이름  (조합 중간 단계 포함)
```

글자별 조합 시퀀스를 미리 정의하고, 조합 단계는 빠르게(50ms), 새 글자는 느리게(100ms) 출력하여 실제 타이핑 느낌을 구현했다.

```typescript
const JAMO_MAP: Record<string, string[]> = {
  이: ["ㅇ", "이"],
  름: ["ㄹ", "르", "름"],
  을: ["ㅇ", "을"],
  // ...
};
```

## 정리

- `backdrop-filter` 중첩은 CSS 명세상 제한이다. frosted glass 레이어가 여러 개 필요하면 반드시 형제로 배치할 것.
- 같은 탭 `localStorage` 변경을 감지하려면 `StorageEvent`를 수동 dispatch해야 한다. 이는 Jotai atomWithStorage 등 라이브러리를 쓰지 않을 때 흔히 빠지는 함정.
- Next.js에서 "로그인 후 전환"처럼 앱 전역 상태가 바뀌는 시점에는 `router.replace` 단독으로는 부족하다. 상태 전파 메커니즘(이벤트, 전역 스토어)을 함께 사용해야 한다.
