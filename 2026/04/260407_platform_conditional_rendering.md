---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Electron 전용 컴포넌트의 플랫폼 분기 렌더링 위치"
updatedAt: "2026-04-07"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "electron"
  - "platform-detection"
  - "conditional-rendering"
  - "early-return"

relatedCategories:
  - "architecture"
  - "electron"
---

# Electron 전용 컴포넌트의 플랫폼 분기 — 내부 vs 외부

> 플랫폼 분기는 이미 여러 조건을 판단하는 컴포넌트 내부에서 처리하는 것이 중복 제거와 응집도 면에서 유리하다.

## 배경

`LibraryFloatingIcon`은 Electron 환경에서만 의미 있는 컴포넌트인데, 웹 환경에서도 disabled 상태로 렌더링되고 있었다. 플랫폼 체크를 컴포넌트 내부에서 할지, 사용하는 쪽(`layout.tsx`)에서 할지 판단이 필요했다.

## 핵심 내용

### 판단 기준

| 기준 | 내부 처리 | 외부 처리 |
|------|-----------|-----------|
| 사용처 수 | 2곳 이상 → 내부가 유리 | 1곳만 → 외부도 OK |
| 기존 early return | 이미 있음 → 조건 추가만 | 없음 → 외부가 깔끔 |
| 조건의 성격 | 컴포넌트 존재 이유에 해당 | 레이아웃 배치 조건 |

### 이 케이스에서 내부가 맞는 이유

1. **이미 내부에 early return 조건이 있음**: `isMobile`, `!hasActiveSession`, `viewerOpen`
2. **사용처가 2곳** (`layout.tsx`의 desktop/mobile 분기)
3. **"Electron에서만 존재"는 컴포넌트 본질**에 해당 — 외부에서 몰라도 됨

### 적용

```typescript
// 기존 early return에 플랫폼 조건 추가
const platform = usePlatform();
const viewerOpen = useAtomValue(viewerPanelOpenAtom);
if (platform !== "electron" || isMobile || !hasActiveSession || viewerOpen) return null;
```

`usePlatform()`은 `isElectronEnvironment()`를 감싼 hook으로, `window.electronAPI` 존재 여부로 판별한다. SSR 시 `"web"`을 반환하지만 `"use client"` 컴포넌트이므로 hydration 이후 정상 동작한다.

### 기존 코드와의 관계

`libraryEnabledAtom`도 이미 `isElectronEnvironment()`를 사용하지만, 이건 **기능 활성화** 여부(enabled/disabled 스타일)이고, 플랫폼 분기는 **렌더링 여부**(null 반환)다. 역할이 다르므로 둘 다 필요하다.

## 정리

- 플랫폼 분기를 "어디서 할지"는 **사용처 수 + 기존 패턴 + 조건의 성격**으로 판단
- 컴포넌트가 특정 플랫폼에서만 존재 의미가 있다면, 그건 컴포넌트의 본질이므로 내부 early return이 적합
- "기능 활성화"와 "렌더링 여부"는 별개 — enabled atom은 UI 상태, platform check는 존재 조건
