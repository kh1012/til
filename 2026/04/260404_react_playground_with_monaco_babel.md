---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "코딩 테스트 사이트에 React 미리보기 환경 구축"
updatedAt: "2026-04-04"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "monaco-editor"
  - "babel-standalone"
  - "jsx"
  - "tsx"
  - "iframe-sandbox"
  - "react-preview"
  - "jotai"
  - "tailwindcss"
  - "ErrorBoundary"

relatedCategories:
  - "typescript"
  - "javascript"
  - "tooling"
---

# 코딩 테스트 사이트에 React/TSX 미리보기 환경 구축하기

> 기존 JS 알고리즘 연습 사이트에 React 컴포넌트를 작성하고 실시간 미리보기할 수 있는 환경을 추가했다. 개념을 코드로 직접 작성하고, 추출한 글과 함께 AI에게 리뷰받기 위한 기반을 만들었다.

## 배경

알고리즘 문제만 풀던 코딩 테스트 사이트에 **Frontend Clean Code** 카테고리를 추가했다. 선언형, 응집도, 추상화 레벨 같은 React 설계 원칙을 연습하려면 코드를 작성하고 바로 렌더링 결과를 확인할 수 있어야 했다. 단순히 개념을 읽는 것이 아니라, 직접 리팩토링하고 결과를 눈으로 확인하는 사이클을 만들고 싶었다.

기존 시스템은 `new Function()`으로 JS를 실행하고 `testCases`로 자동 채점하는 구조였기 때문에, JSX를 포함한 React 코드는 실행 자체가 불가능했다.

## 핵심 내용

### 1. Monaco Editor에서 TSX 지원

Monaco standalone에는 `typescriptreact`라는 language ID가 **존재하지 않는다**. VS Code에서만 쓰이는 개념이다. 설정하면 plain text로 fallback되어 하이라이팅이 전부 사라진다.

```jsx
// 이렇게 하면 안 된다 — Monaco가 인식 못함
<MonacoEditor language="typescriptreact" />

// 올바른 방법: typescript + .tsx 파일 경로
<MonacoEditor
  path="solution.tsx"
  defaultLanguage="typescript"
/>
```

`.tsx` 확장자가 TypeScript 언어 서비스에 JSX 모드를 자동 활성화한다.

추가로 `addExtraLib`으로 React 전역 타입을 선언해야 에러 없이 하이라이팅이 동작한다:

```javascript
monaco.languages.typescript.typescriptDefaults.addExtraLib(`
  declare namespace React {
    type ReactNode = string | number | boolean | null | undefined | ReactElement | ReactNode[];
    class Component<P = {}, S = {}> { /* ... */ }
    const Suspense: any;
    // ...
  }
  declare module 'react' { export = React; }
  declare function useState<T>(init: T): [T, (v: T) => void];
  // ...
`, 'react-globals.d.ts');
```

**semantic highlighting과의 관계**: `noSemanticValidation: true`로 설정하면 TypeScript 언어 서비스가 토큰 분류 자체를 중단해서 모든 코드가 흰색으로 나온다. 타입 오류를 숨기려면 validation을 끄는 대신 타입 선언을 제공해야 한다.

### 2. iframe 기반 React 미리보기

브라우저에서 JSX를 실행하는 핵심 구조:

```
사용자 코드 (TSX)
    ↓ import/export 문 자동 제거
    ↓ Babel standalone (react + typescript preset) 변환
    ↓ new Function()으로 실행
    ↓ ReactDOM.createRoot().render()
    ↓ sandbox iframe에서 렌더링
```

**import 문 처리**: iframe은 모듈 시스템이 없으므로 `import React from 'react'` 같은 구문을 자동 제거한다. React, useState 등은 CDN UMD로 전역 주입한다.

```javascript
const cleanedCode = code
  .replace(/^\s*import\s+.*?['";]\s*$/gm, '')  // import 제거
  .replace(/^\s*export\s+default\s+/gm, '')     // export default 제거
  .replace(/^\s*export\s+/gm, '')               // export 제거
```

**Babel typescript preset**: `filename` 옵션이 필수다. 없으면 `Preset requires a filename` 에러가 발생한다.

```javascript
Babel.transform(code, {
  presets: ['react', 'typescript'],
  filename: 'app.tsx'  // 이게 없으면 에러
}).code;
```

**외부 라이브러리 로딩**: jotai처럼 UMD 빌드가 없는 라이브러리는 `esm.sh` CDN에서 ES module로 로드하고 `window` 전역에 할당하는 방식을 사용했다.

```html
<script type="module">
  import { atom, useAtom } from 'https://esm.sh/jotai@2.12.3?external=react&bundle';
  window.jotai = { atom, useAtom };
  window.__jotaiReady = true;
</script>
```

### 3. React 핵심 개념 — ReactNode vs ReactElement, ErrorBoundary

| | `ReactElement` | `ReactNode` |
|---|---|---|
| 정의 | `createElement()`의 반환값 | ReactElement + string, number, null 등 모든 렌더링 가능한 것 |
| 용도 | 컴포넌트 반환 타입 | children prop 타입 |

**ErrorBoundary**는 React 내장 컴포넌트가 아니다. `class extends Component`로 직접 구현해야 하며, hooks로는 만들 수 없다:

```tsx
class ErrorBoundary extends Component<{ children: React.ReactNode; fallback: React.ReactNode }> {
  state = { hasError: false }
  static getDerivedStateFromError() { return { hasError: true } }
  render() {
    if (this.state.hasError) return this.props.fallback
    return this.props.children
  }
}
```

`Component`의 제네릭에 props 타입을 지정하지 않으면 `fallback` 같은 커스텀 prop에서 타입 에러가 발생한다.

### 4. Frontend Clean Code 연습 문제 설계

문제를 App.js 구조로 설계하여 미리보기에서 바로 인터랙션을 확인할 수 있게 했다:

- **선언형** — 명령형 if/else를 이름 있는 변수와 삼항 연산자로 치환
- **응집도** — 하나의 컴포넌트에 섞인 관심사를 커스텀 훅으로 분리
- **추상화 레벨** — 고수준 컴포넌트와 저수준 input 로직을 같은 레벨에 두지 않기

각 문제는 `starterCode`(리팩토링 대상)와 `solutionCode`(정답)로 구성되고, `testCases`가 비어 있어 수동 기록(correct/wrong) 방식으로 진행한다.

## 정리

- Monaco standalone은 VS Code와 다르다. `typescriptreact`가 없고, `.tsx` path + `typescript` language 조합으로 JSX를 지원한다
- iframe sandbox + Babel standalone으로 브라우저 내 React 실행 환경을 만들 수 있다. import문 제거, CDN 전역 주입이 핵심
- 개념을 글로 정리하고 → 코드로 직접 작성하고 → 미리보기로 확인하고 → 추출해서 AI에게 리뷰받는 사이클의 기반을 구축했다
- ErrorBoundary는 class 전용, ReactNode는 children용, ReactElement는 반환 타입용 — 이런 구분은 직접 타입 에러를 만나봐야 체감된다
