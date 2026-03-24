---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Electron/Web 하이브리드 앱에서 Capability 기반 플랫폼 추상화"
updatedAt: "2026-03-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "electron"
  - "next.js"
  - "platform-abstraction"
  - "capability-pattern"
  - "conditional-rendering"

relatedCategories:
  - "nextjs"
  - "electron"
  - "typescript"
  - "architecture"
---

# Electron/Web 하이브리드 앱에서 Capability 기반 플랫폼 추상화

> 런타임 불변값에 Context/Provider는 과잉이다. 훅 함수만으로 충분하다.

## 배경

Next.js + Electron 하이브리드 앱에서 파일 시스템 접근, 네이티브 다이얼로그 등 Electron 전용 기능이 Web에서도 UI로 노출되는 문제가 있었다. `isElectronEnvironment()` 체크가 10곳에 산발적으로 흩어져 있어 "숨기기 vs 폴백 vs 에러 표시" 전략이 파일마다 달랐다.

## 핵심 내용

### 1. Hook-only 추상화 (No Provider)

플랫폼은 런타임에 변하지 않는다. 따라서 React Context/Provider는 불필요한 오버헤드다.

```typescript
// shared/platform/use-platform.ts
export function usePlatform(): Platform {
  return isElectronEnvironment() ? 'electron' : 'web';
}

export function useCapability(capability: PlatformCapability): boolean {
  return usePlatform() === 'electron';
}
```

`useCapability`는 현재 단순히 `platform === 'electron'`이지만, 향후 Web File System Access API 등을 추가할 때 이 함수 내부만 수정하면 된다.

### 2. PlatformOnly 래퍼 컴포넌트

```tsx
export function PlatformOnly({ platform, children }: PlatformOnlyProps) {
  return usePlatform() === platform ? <>{children}</> : null;
}

// 사용: Web에서 완전히 숨김
<PlatformOnly platform="electron">
  <PlusMenuItem label="작업폴더 추가" ... />
</PlatformOnly>
```

### 3. UI 숨김만으로는 부족하다 — 함수 내부에도 가드 필요

PlusMenu에서 "작업폴더 추가" 버튼을 `<PlatformOnly>`로 숨겼지만, 같은 `openDirectoryDialog()` 함수를 QuickAction, SavePopover 등 다른 경로에서도 호출하고 있었다. Web에서 런타임 에러 발생.

**교훈**: UI를 숨기는 것과 함수를 보호하는 것은 별개다. 두 레이어 모두 필요하다.

```typescript
const openDirectoryDialog = useCallback(async () => {
  if (!hasNativeDialog) return; // 함수 자체에 가드
  const path = await window.electronAPI!.openDirectoryDialog();
  // ...
}, [hasNativeDialog, ...]);
```

### 4. 순수 함수 vs 훅 경계

`auto-save.ts`는 React 컴포넌트 밖에서 호출되는 순수 함수이므로 훅(`useCapability`)을 사용할 수 없다. 이런 경우 기존 `isElectronEnvironment()` 직접 호출을 유지하는 것이 올바른 설계 결정이다.

**규칙**: 컴포넌트/훅에서는 `usePlatform()` 사용, 순수 함수에서는 `isElectronEnvironment()` 허용.

### 5. SSR 호환은 자동

`isElectronEnvironment()`가 이미 `typeof window !== "undefined"` 체크를 포함하므로, SSR 시 자동으로 `web`이 반환된다. 별도 처리 불필요.

## 정리

- **런타임 불변값에 Context는 과잉** — 플랫폼 판별처럼 절대 변하지 않는 값은 단순 함수 호출로 충분
- **UI 숨김 + 함수 가드 = 2중 보호** — 호출 경로가 여러 곳이면 UI만 숨겨도 다른 경로에서 크래시 가능
- **추상화의 확장 포인트를 남겨라** — `useCapability(cap)`이 현재는 단순하지만, 향후 Web API 확장 시 한 곳만 수정하면 됨
- **순수 함수는 훅에서 제외** — React 규칙을 무시하지 말고, 설계 단계에서 경계를 명확히
