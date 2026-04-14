---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Feature Flag 기반 설정 페이지 — admin 전용 런타임 UI 커스터마이징"
updatedAt: "2026-04-14"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "feature-flag"
  - "jotai"
  - "atomWithStorage"
  - "settings-page"
  - "admin-guard"
  - "live-preview"
  - "next-app-router"

relatedCategories:
  - "nextjs"
  - "jotai"
  - "typescript"
---

# Feature Flag 기반 설정 페이지 — admin 전용 런타임 UI 커스터마이징

> 하루 만에 Feature Flag 기반구조부터 PlusMenu 라이브 프리뷰까지 4개 PDCA 사이클을 완주하며, admin이 코드 수정 없이 UI를 커스터마이징할 수 있는 설정 시스템을 구축했다.

## 배경

MAX 프론트엔드에는 QuickAction 8개, Flask 테스트 21개, PlusMenu 항목 9개가 하드코딩되어 있었다. 새 항목 추가나 표시/숨김 변경에 항상 코드 배포가 필요했고, 비개발자가 UI를 커스터마이징할 수 없었다. admin 사용자가 런타임에 이 모든 항목을 토글할 수 있는 설정 페이지가 필요했다.

## 핵심 내용

### 4개 PDCA 사이클을 하루에 완주

하나의 큰 기능을 4개의 독립적인 PDCA 사이클로 분해하여 점진적으로 구축했다.

1. **admin-page-settings** — Feature flag atom + admin 판정 + SidebarFooter 메뉴
2. **settings-page-ui** — /settings 라우트 + 좌측 메뉴/우측 상세 패널 레이아웃
3. **settings-apply-ui** — 설정 토글 → 실제 UI 반영 (QuickAction/Flask/BrandLogo)
4. **settings-plusmenu-preview** — PlusMenu 라이브 프리뷰 + 항목 토글 + 적용

### 자동 연동 (Zero-Config) 전략

설정 페이지의 항목 목록을 하드코딩하지 않고, 소스 배열을 직접 참조하여 자동 연동했다.

```typescript
// QUICK_ACTION_DEFS에 항목 추가 → 설정 페이지에 자동 반영
export function getQuickActionToggleItems() {
  return QUICK_ACTION_DEFS.map((a) => ({
    id: a.actionId,
    labelKey: a.labelKey,
  }));
}

// build*SubItems 함수 호출 → Flask 테스트 목록 자동 생성
export const FLASK_TEST_CATEGORIES = [
  { id: "sheet", buildItems: buildSheetTestSubItems },
  { id: "calcpad", buildItems: buildCalcpadTestSubItems },
  // ...
];
```

### Draft 패턴 — 적용 버튼으로 확정

`useState`로 로컬 draft 상태를 관리하고, "적용" 버튼 클릭 시에만 `pageSettingsAtom`에 반영한다.

```typescript
const [draftQa, setDraftQa] = useState(settings.quickActions.visibleActions);

const apply = () => {
  setSettings({
    ...settings,
    quickActions: { ...settings.quickActions, visibleActions: draftQa },
  });
  toast.success(t("settings.applied"));
};
```

### PlusMenu 라이브 프리뷰

설정 페이지 우측에 실제 PlusMenu 내부 컴포넌트(AddSection/PanelSection/ToolsSection)를 렌더링한다. Jotai Provider로 프리뷰 전용 store를 주입하여 토글 변경이 프리뷰에만 반영되고, 실제 메뉴에는 영향을 주지 않는다.

```typescript
const previewStore = createStore();
previewStore.set(pageSettingsAtom, {
  ...DEFAULT_PAGE_SETTINGS,
  plusMenu: { visibleItems: draft },
});

return (
  <Provider store={previewStore}>
    <AddSection onFileAttach={noop} onDirectoryAdd={noop} />
    <PanelSection subMenuOpen={subMenuOpen} ... />
    <ToolsSection ... />
  </Provider>
);
```

### useIsAdmin 동기 초기화 주의점

`useState(false)` + `useEffect`로 admin 체크를 하면, 초기 렌더에서 `false`가 나와 guard가 리다이렉트를 발동한다. `useState(() => isAdmin(getStoredUsername()))`로 동기 초기값을 설정해야 한다.

### FSD 레이어 준수 — 데이터를 shared로 이동

`QUICK_ACTION_DEFS`를 `shared/config/`로, `FLASK_TEST_CATEGORIES`를 `shared/config/`로 이동하여 widgets/shared 간 역참조를 해소했다.

## 정리

- **점진적 구축**이 핵심이었다. 한 번에 큰 기능을 만들지 않고, atom → UI → 연동 → 프리뷰 순서로 4단계에 걸쳐 쌓아올렸다.
- **Zero-Config 자동 연동**은 유지보수 비용을 크게 줄인다. 소스 배열에 항목만 추가하면 설정 페이지에 자동으로 나타난다.
- **Draft 패턴**은 설정 UI의 기본 패턴이다. 즉시 반영하면 사용자가 실수로 변경한 것을 되돌리기 어렵다.
- **프리뷰 전용 Jotai store**는 격리된 상태를 만드는 깔끔한 방법이다. Provider로 감싸면 하위 컴포넌트가 프리뷰 store만 읽는다.
