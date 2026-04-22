---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "로컬 state에 묶인 Dialog를 전역 atom 호스트로 승격하기"
updatedAt: "2026-04-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "jotai"
  - "global-state"
  - "dialog"
  - "fsd"
  - "refactor"

relatedCategories:
  - "architecture"
  - "state-management"
---

# 로컬 state에 묶인 Dialog를 전역 atom 호스트로 승격하기

> Dialog가 한 Panel의 `useState`에 갇혀 있으면 다른 페이지에서 여는 순간 URL 해킹으로 땜빵하게 된다. 소유권을 공용 레이어(atom)로 옮기고 레이아웃에 호스트를 하나만 두는 게 정답.

## 배경

"빠른 실행" 설정에서 커넥터 연결 대화상자를 `/chat/new`에서 바로 띄우고 싶었다. 문제는 `ConnectorConnectDialog`가 `ConnectorSettingsPanel` 내부의 로컬 `useState`(`dialogTarget`)로만 열리던 구조였다는 것.

첫 시도는 URL 쿼리로 우회했다.

- `/chat/new`에서 클릭 → `router.push("/settings/connectors?connector=midasGen&connect=open")`
- Panel이 마운트되며 `useSearchParams`로 `connect=open` 감지 → `setDialogTarget(id)`로 자동 오픈
- 그 후 `router.replace`로 쿼리 정리

동작은 했지만 사용자 피드백: **"페이지 전환이 왜 필요한데?"**

맞는 지적이었다. 페이지 전환은 Dialog 상태가 특정 컴포넌트에 묶여 있다는 구조적 제약을 URL로 땜빵한 결과였을 뿐, 사용자 의도와 무관한 부작용이었다.

## 핵심 내용

### 문제의 본질

```tsx
// Before — Panel 내부에만 존재
function ConnectorSettingsPanel() {
  const [dialogTarget, setDialogTarget] = useState<string | null>(null);
  // ...
  return (
    <>
      {/* 상세 뷰 */}
      {dialogTarget && <ConnectorConnectDialog ... />}
    </>
  );
}
```

이 상태의 "소유권"이 Panel에 있으니, Panel이 렌더되지 않은 곳(`/chat/new`)에서는 열 방법이 없다. URL은 Panel을 강제로 마운트시키는 우회책이었다.

### 해결: 3단 승격

1. **상태를 공용 atom으로 올린다**

```ts
// features/connector-connect/model/connector-dialog-atom.ts
import { atom } from "jotai";
export const openConnectorDialogIdAtom = atom<string | null>(null);
```

2. **레이아웃에 호스트 컴포넌트를 한 번만 마운트**

```tsx
// features/connector-connect/ui/GlobalConnectorDialog.tsx
export function GlobalConnectorDialog() {
  const [targetId, setTargetId] = useAtom(openConnectorDialogIdAtom);
  if (!targetId) return null;
  // CONNECTOR_LIST, API_KEY_ATOMS, connectedAtMap 등을 atom에서 읽어 Dialog 렌더
  return <ConnectorConnectDialog ... />;
}

// app/(tabs)/layout.tsx
<AppShell ...>
<GlobalConnectorDialog />
```

3. **Panel도 같은 atom을 공유**

```ts
// Panel의 로컬 useState를 atom 기반으로 교체
const [dialogTarget, setDialogTarget] = useAtom(openConnectorDialogIdAtom);
```

Panel 내부의 중복 Dialog 렌더 블록은 제거. 호스트 하나만 남긴다.

### 어디서든 한 줄 호출

```tsx
const openConnectorDialog = useSetAtom(openConnectorDialogIdAtom);
// ...
<Button onClick={() => openConnectorDialog("midasGen")}>연결</Button>
```

URL 이동, `useSearchParams`, `useRouter`, `useEffect`로 감지하고 쿼리 정리하는 로직 전부 사라졌다.

### 바로가기 정의도 action 분리

Dialog 오픈과 페이지 이동은 본질이 다른 동작이므로 shortcut 정의를 discriminated union으로 갈랐다.

```ts
export type PageShortcutDef =
  | (Base & { action: "navigate"; href: string })
  | (Base & { action: "open-connector-dialog"; connectorId: string });
```

소비자는 `action`으로 분기만 한다. `href`와 `connectorId`는 각 분기에서만 접근되니 타입 안전도 유지된다.

## 정리

- **Local state의 경계는 "이 UI가 다른 진입점에서도 필요한가?"가 기준이다.** 아직은 한 곳이라도 진입점이 추가되는 순간 공용 공간으로 승격해야 한다. 그렇지 않으면 URL 파라미터나 ref 트릭으로 땜빵하게 된다.
- **URL 쿼리는 "링크 가능해야 하는 상태"에만 쓴다.** 예: 스레드 ID, 필터 조건, 탭 인덱스. 단순히 "Dialog를 열고 싶다"는 링크 가능성과 무관하므로 URL에 태우면 안 된다. 새로고침/뒤로가기 동작이 의도와 어긋나고, 정리 로직까지 필요해진다.
- **전역 호스트 + atom 패턴은 Dialog/Toast/Modal에 잘 맞는다.** 호스트는 레이아웃에 한 번 마운트, 트리거는 어디든 `useSetAtom`으로 호출. 호스트가 모든 비즈니스 로직(커넥트, atom 업데이트, 닫기)을 캡슐화하므로 호출부는 "무엇을 열지"만 안다.
- **지적은 빨리 받을수록 좋다.** "왜 페이지 전환이 필요해?" 한 줄이 URL 해킹 전체를 없애고 구조를 제자리로 되돌렸다. 첫 구현이 동작한다고 끝이 아니라, 가장 단순한 호출부를 상상한 뒤 그리로 역산하는 습관이 필요하다.

FSD 레이어로는 shared → entities → features → widgets → app 방향만 가능하기 때문에, 이런 공용 Dialog는 features/entities에 두고 widgets는 소비만 하는 게 자연스럽다. shared에는 비즈니스 의존을 끌어들이면 안 되므로 "atom만 있는데 왜 shared 아니야?"의 답은 "entities/features에 의존하기 때문".
