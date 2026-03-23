---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Jotai multiple instances 경고 — ESM/CJS 이중 로드 원인과 해결"
updatedAt: "2026-03-23"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "jotai"
  - "multiple instances"
  - "esm"
  - "cjs"
  - "next.js"
  - "module resolution"
  - "globalThis"

relatedCategories:
  - "nextjs"
  - "bundling"
  - "state-management"
---

# Jotai "Detected multiple instances" 경고의 원인과 해결

> Next.js에서 Jotai가 ESM/CJS로 이중 로드되면 `globalThis.__JOTAI_DEFAULT_STORE__`가 충돌하여 multiple instances 경고가 발생한다.

## 배경

프로젝트에서 아래 경고가 콘솔에 반복적으로 출력되었다:

```
Detected multiple Jotai instances. It may cause unexpected behavior with the default store.
```

`npm ls jotai`로 확인하면 패키지는 단일 설치(2.18.0)인데, 경고가 계속 발생하는 상황이었다.

## 핵심 내용

### 경고 발생 메커니즘

Jotai의 `getDefaultStore()` 함수는 모듈 스코프의 `defaultStore` 싱글톤을 생성하고, `globalThis.__JOTAI_DEFAULT_STORE__`에 등록한다. 이미 다른 값이 등록되어 있으면 경고를 출력한다:

```javascript
// jotai/vanilla.js (simplified)
var defaultStore;
function getDefaultStore() {
  if (!defaultStore) {
    defaultStore = createStore();
    globalThis.__JOTAI_DEFAULT_STORE__ ||= defaultStore;
    if (globalThis.__JOTAI_DEFAULT_STORE__ !== defaultStore) {
      console.warn('Detected multiple Jotai instances...');
    }
  }
  return defaultStore;
}
```

### 근본 원인: ESM/CJS 이중 로드

Jotai는 CJS(`index.js`)와 ESM(`esm/index.mjs`) 두 가지 엔트리를 제공한다:

```
node_modules/jotai/
├── vanilla.js        (CJS — 자체 defaultStore 변수)
└── esm/vanilla.mjs   (ESM — 별도 defaultStore 변수)
```

Next.js 번들러가 **같은 패키지를 서로 다른 모듈 포맷으로 로드**하면, 각 포맷이 독립적인 `defaultStore`를 생성한다. 첫 번째가 `globalThis`에 등록한 후, 두 번째가 로드될 때 불일치가 감지되어 경고가 발생한다.

### 트리거 조건 (우리 프로젝트)

```
AppProviders.tsx ("use client" 명시)
  → ESM으로 로드 → store1 생성 → globalThis에 등록

debug-chat-transport.ts ("use client" 미표기)
  → 서버 모듈로 취급 가능 → CJS로 로드 → store2 생성
  → store2 !== globalThis의 store1 → 경고!
```

핵심은 `debug-chat-transport.ts`에 `"use client"` 지시문이 없어서 Next.js가 서버/클라이언트 경계를 모호하게 처리한 것이었다.

### 악화 요인: React Compiler

`next.config.ts`에 `reactCompiler: true`가 활성화되어 있으면, Compiler가 모듈 그래프를 재구성하면서 CJS/ESM 혼용 가능성이 높아진다.

### 해결 방법

**즉시 해결**: 서버/클라이언트 경계가 모호한 파일에 `"use client"` 추가

```typescript
// debug-chat-transport.ts
"use client"; // 이 한 줄로 ESM 일관 로드 보장
```

**중기 해결**: `next.config.ts`에 webpack alias로 jotai를 ESM으로 고정

```typescript
webpack: (config) => {
  config.resolve.alias = {
    ...config.resolve.alias,
    "jotai$": require.resolve("jotai/esm/index.mjs"),
    "jotai/vanilla$": require.resolve("jotai/esm/vanilla.mjs"),
  };
  return config;
},
```

## 정리

- 패키지 중복 설치가 아니어도 ESM/CJS 이중 로드로 multiple instances 경고가 발생할 수 있다
- Next.js의 서버/클라이언트 경계에서 `"use client"` 누락이 모듈 포맷 불일치를 유발한다
- `globalThis` 기반 싱글톤 패턴은 모듈 포맷 분리에 취약하다 — 같은 패키지라도 CJS와 ESM은 별도 모듈 스코프를 가진다
- Jotai Discussion [#2044](https://github.com/pmndrs/jotai/discussions/2044)에서 다양한 환경별 해결책을 확인할 수 있다
