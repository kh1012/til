---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "기존 UI 패턴 재사용 + React 19 서버/클라이언트 경계 key 경고"
updatedAt: "2026-03-27"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "jotai"
  - "derived-atom"
  - "react-19"
  - "next-js-app-router"
  - "server-client-boundary"
  - "spreadjs"

relatedCategories:
  - "nextjs"
  - "jotai"
  - "architecture"
---

# 기존 컴포넌트 패턴 재사용으로 신규 기능 구현 + React 19 key 경고 해결

> SheetSelector 패턴을 그대로 따라 XlsxFileSelector를 만들고, 서버 컴포넌트 layout에서 발생한 React 19 key 경고를 해결한 경험

## 배경

MAXYS에서 xlsx 파일을 SpreadJS에 로드하려면 AI 대화를 거쳐야 했다. "엑셀 열어줘" → AI가 `load_xlsx` 도구 호출 → SpreadJS 로드. 이 과정을 단축해서 작업폴더의 xlsx 파일을 **UI에서 직접 클릭**하여 로드하는 기능을 추가했다.

이미 멀티시트 선택용 `SheetSelector` 컴포넌트가 있었고, 동일한 UX 패턴(입력창 위 칩 목록)을 따라 구현했다.

## 핵심 내용

### 1. 패턴 재사용 설계 (Clean Architecture)

기존 SheetSelector의 구조를 분석하면:

```
xlsxSheetNamesAtom (데이터)  →  SheetSelector.tsx (UI)
xlsxPendingFileAtom (상태)       handleLoadXlsx() 호출
```

이 패턴을 그대로 따라 3파일로 분리:

```
xlsx-file-selector-atoms.ts   — 파생 atom (fileListAtom → xlsx 필터) + 가시성 atom
use-xlsx-file-selector.ts     — 선택 핸들러 hook + 디렉토리 변경 감지
XlsxFileSelector.tsx          — UI (SheetSelector와 동일한 칩 스타일)
```

핵심은 **Phase 1의 `handleLoadXlsx`를 그대로 호출**한다는 것. 새로운 로딩 로직을 만들지 않고 기존 함수를 재사용했다.

### 2. Jotai 파생 atom으로 데이터 필터링

```typescript
export const xlsxFilesInFolderAtom = atom((get) => {
  const files = get(fileListAtom);
  return files.filter((f) =>
    XLSX_EXTENSIONS.includes(f.extension.toLowerCase()),
  );
});
```

`fileListAtom`이 변경되면 자동으로 재계산된다. 별도의 useEffect나 구독 로직이 불필요.

### 3. 가시성 리셋 — useRef로 이전 값 비교

dismiss 후 작업폴더를 변경하면 칩이 다시 표시되어야 한다. `useEffect`에서 이전 디렉토리 목록과 비교:

```typescript
const prevDirsRef = useRef(directories);

useEffect(() => {
  if (prevDirsRef.current !== directories) {
    prevDirsRef.current = directories;
    setVisible(true);  // 디렉토리 변경 시 리셋
  }
}, [directories, setVisible]);
```

Jotai atom은 참조 동등성으로 비교되므로, 배열이 새로 생성될 때만 트리거된다.

### 4. React 19 + Next.js: 서버→클라이언트 직렬화 key 경고

구현 완료 후 새로고침하니 런타임 에러 발생:

```
Each child in a list should have a unique "key" prop.
Check the render method of `SplitPanelLayout`.
It was passed a child from TabsLayout.
```

**원인**: `layout.tsx`가 서버 컴포넌트(기본)인데, `"use client"` 컴포넌트인 `SplitPanelLayout`에 여러 ReactNode props를 전달. React 19는 서버→클라이언트 경계에서 props를 직렬화할 때 이를 배열로 처리하면서 key 경고를 발생시킨다.

**해결**: `layout.tsx`에 `"use client"` 추가. 같은 클라이언트 경계 안으로 들어가면 직렬화가 불필요해져서 경고가 사라진다.

```diff
+ "use client";
+
  import { type ReactNode } from "react";
```

이 패턴은 Next.js App Router에서 layout이 `"use client"` 컴포넌트만 조립하는 역할이면 layout 자체도 클라이언트로 만드는 것이 안전하다는 교훈.

## 정리

- 기존 컴포넌트의 **atom/hook/UI 패턴**을 그대로 따르면 설계 시간을 크게 줄일 수 있다. SheetSelector 72줄 → XlsxFileSelector 52줄, 거의 복사 수준
- Jotai 파생 atom은 필터링/변환에 매우 효과적. useEffect 없이 선언적으로 데이터 흐름을 구성할 수 있다
- React 19 + Next.js에서 **서버 컴포넌트가 클라이언트 컴포넌트에 여러 ReactNode를 props로 전달**하면 key 경고가 발생할 수 있다. layout이 순수 조립 역할이면 `"use client"`를 붙이는 것이 간단한 해결책
