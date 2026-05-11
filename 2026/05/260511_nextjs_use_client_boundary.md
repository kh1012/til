---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "use client directive 가 server module graph 에 새어들 때 빌드를 깨뜨리는 함정"
updatedAt: "2026-05-11"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "nextjs"
  - "turbopack"
  - "use client"
  - "rsc"
  - "ssr"
  - "client boundary"

relatedCategories:
  - "react"
  - "typescript"
---

# Next.js + turbopack 의 "use client" 경계 함정

> 환경 가드를 위해 `"use client"` 를 붙였더니, 그 모듈을 import 한 server route 의 빌드가 `Attempted to call X from the server but X is on the client` 로 깨졌다. SSR safe 한 유틸은 directive 를 붙이지 말아야 한다.

## 배경

IndexedDB 헬퍼 모듈(`idb-schema.ts`)을 신규 작성하면서 무심코 파일 맨 위에 `"use client"` 를 붙였다. 단순한 상수 + 환경 가드(`typeof window`, `typeof indexedDB`) 가 있는 함수들이라 SSR 에서도 안전한데, 그냥 "브라우저용 모듈이니까" 라는 직관으로 directive 를 박은 것이다.

빌드는 처음 잘 통과했지만, 다른 클라이언트 atom 이 그 모듈을 import 하면서 prop chain 으로 server-side API route 의 module graph 에 노출되자마자 다음 에러로 빌드가 폭발했다.

```
Error: Attempted to call resolveCurrentUserSlot() from the server but
resolveCurrentUserSlot is on the client. It's not possible to invoke a
client function from the server, it can only be rendered as a Component
or passed to props of a Client Component.
    at <unknown> (.next/server/chunks/_...js)
```

호출 자체는 client 컴포넌트 mount 시점에만 일어나는데도, **module top-level 평가** 가 server bundle 에서 시도되면서 RSC 가 그걸 "server 에서 client 함수 호출" 로 잡아낸 것이다.

## 핵심 내용

### `"use client"` 의 본질

- Next.js App Router 에서 `"use client"` 는 **모듈 단위 boundary 표시** 다.
- directive 가 있는 모듈의 export 들은 RSC 가 **client reference** 로 wrapping 한다 — 즉 server 가 봐도 호출 불가능한 stub 으로 보인다.
- 의도된 사용처는 React 컴포넌트나 hook 처럼 "정말 client 에서만 의미있는" 코드다.

### 함정 — 단순 유틸 모듈에 directive 를 박는 것

- `localStorage`/`indexedDB` 같은 브라우저 API 를 다루는 모듈이라도, **함수 본문 안에서** `typeof window === "undefined"` 가드를 두면 모듈 자체는 SSR 환경에서 import 만 되고 호출 안 되는 한 안전하다.
- 여기에 `"use client"` 를 박으면 import 만 되어도 RSC 가 server-side module graph 안에서 client reference 로 처리 → 그 모듈의 함수가 server bundle 평가 중에 단 한 번이라도 평가되면 빌드 실패.
- 특히 **다른 client 모듈이 모듈-로드-시점에 그 함수를 평가** 하면 (예: `const slot = resolveCurrentUserSlot();` 같은 top-level) 그 client 모듈이 server bundle 에서도 평가 시도되며 동일 에러.

### 해결 패턴

1. **단순 유틸/상수 모듈에는 directive 를 붙이지 않는다.** 환경 가드는 함수 본문의 `typeof window` 체크로 충분.
2. **React 훅/컴포넌트** 같이 정말 client 에서만 의미있는 모듈에만 `"use client"` 사용.
3. server route 에서 import 할 가능성이 1% 라도 있으면 directive 를 빼고, 대신 빈 SSR 폴백 반환을 함수 안에 둔다.

```ts
// 좋은 예 — directive 없음, 함수 내부에 가드.
export function resolveCurrentUserSlot(): string {
  if (typeof window === "undefined") return ANONYMOUS_USER_SLOT;
  try {
    return window.localStorage.getItem("max:username")?.trim() || ANONYMOUS_USER_SLOT;
  } catch {
    return ANONYMOUS_USER_SLOT;
  }
}
```

```ts
// 나쁜 예 — 환경 체크가 있어도 directive 가 server bundle 평가를 막는다.
"use client";
export function resolveCurrentUserSlot(): string { /* 위와 동일 */ }
```

### 왜 처음엔 빌드가 통과했는가

- directive 가 박힌 모듈을 **client 컴포넌트만 import** 하면 평가가 client bundle 에서만 일어나서 무사.
- 의존성 그래프가 자라면서 어느 시점에 server 측 어딘가가(보통 `entities/X` → `api/route`) 그 모듈을 transitively import 하기 시작하면 그제서야 폭발.
- 즉 **add-only refactor 도중 갑자기 빌드가 깨지는** 회귀로 자주 마주친다. 원인 추적이 어려운 이유는 에러 메시지에 client function 이름만 나오고 import chain 은 stack 에 안 보이기 때문.

## 정리

- `"use client"` 는 **"이 모듈은 client 에서만 의미있다"** 를 RSC 에 알리는 강한 선언이다. 환경 분기를 위한 swith 가 아니다.
- 환경에 따라 다르게 동작해야 하는 SSR-safe 유틸은 directive 없이 두고, 함수 본문에 `typeof window`/`typeof globalThis.X` 가드만 쓰자.
- 빌드가 갑자기 깨지면 직전에 추가한 directive 가 transitively server graph 에 새어들지 않았는지부터 의심한다.
