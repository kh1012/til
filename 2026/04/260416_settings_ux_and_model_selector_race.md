---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "설정 페이지 UX 개선과 모델 셀렉터 경쟁 상태 수정"
updatedAt: "2026-04-16"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "atomWithStorage"
  - "Next.js App Router"
  - "Jotai"
  - "race condition"
  - "settings UX"

relatedCategories:
  - "nextjs"
  - "jotai"
  - "ux"
---

# 설정 페이지 UX 개선과 모델 셀렉터 경쟁 상태 수정

> 적용 버튼 없이 즉시 반영하는 설정 UX로 전환하고, 모드 전환 시 모델 displayName이 깨지는 경쟁 상태를 수정한 기록.

## 배경

설정 페이지에 "적용" 버튼이 있었다. 토글을 바꾸고 적용을 눌러야 반영되는 구조였는데, 실제로는 서버 API 호출 없이 Jotai `atomWithStorage`로 localStorage에 저장하는 것뿐이었다. 적용 버튼이 주는 안전감 대비 UX 마찰이 컸다. 한편, 구조검토 테스트를 실행하면 모델 셀렉터의 displayName이 `GPT 5.4 mini`에서 `gpt-5.4-mini`(raw ID)로 깨지는 버그도 있었다.

## 핵심 내용

### 1. 적용 버튼 제거와 draft 패턴 청산

기존에는 `useState`로 draft 상태를 관리하고, isDirty 비교 후 apply 시 atom에 반영하는 패턴이었다.

```tsx
// Before: draft 패턴
const [draftQa, setDraftQa] = useState(settings.quickActions.visibleActions);
const isDirty = JSON.stringify(draftQa.sort()) !== JSON.stringify(settings...sort());
const apply = () => { setSettings({...}); toast.success("적용됨"); };
```

`atomWithStorage`가 이미 localStorage persist를 보장하므로, draft 없이 atom을 직접 업데이트하면 된다.

```tsx
// After: 즉시 반영
const toggleQa = (id: string) => {
  const next = qaList.includes(id) ? qaList.filter(x => x !== id) : [...qaList, id];
  setSettings({ ...settings, quickActions: { visibleActions: next } });
};
```

이렇게 하면 `useState`, `isDirty`, `apply`, toast 전부 제거된다. 코드가 101줄에서 48줄로 줄었다.

### 2. subPath 라우팅으로 설정 메뉴 URL 동기화

설정 메뉴 선택이 atom 상태로만 관리되면 URL 공유나 브라우저 뒤로가기가 안 된다. Next.js App Router의 동적 라우트로 전환했다.

```
/settings          → redirect → /settings/general
/settings/[menu]   → SettingsPanel(initialMenu={menu})
```

메뉴 클릭 시 `router.replace`로 URL만 바꾸고 페이지 전체 리렌더는 피한다. 다만 `ClosePanelsOnMount` 래퍼가 매 라우트 전환마다 fade-in을 발생시켜서, 이를 제거하고 `SettingsDetailPanel`에만 `key={menuId} + animate-fade-in`을 적용했다.

### 3. 모델 셀렉터 경쟁 상태

구조검토 트리거가 동시에 두 atom을 변경한다.

```tsx
setClientMode(false);                    // (1) 모드 전환
setSelectedModelId("gpt-5.4-mini");      // (2) 모델 지정
```

`useModelSelector`는 `clientMode` 변경을 감지하면 `useQuery`를 재실행하고, `modeChanged === true`일 때 무조건 기본 모델로 리셋했다.

```tsx
// Before: 무조건 리셋
if (modeChanged || selectedModelId === null) {
  setSelectedModelId(data.defaultModelId);  // "gpt-5.4-mini" → "gpt-4o-mini"로 덮어씀
}
```

그런데 `useQuery`가 placeholder data를 반환하는 짧은 구간에서, options 목록에 `gpt-5.4-mini`가 없어 `SelectDropdown`이 `selectedOption?.label ?? value`로 raw ID를 표시했다.

```tsx
// After: 유효한 모델이면 보존
const shouldResetModel =
  (modeChanged && !data.models.some(m => m.modelId === selectedModelId))
  || selectedModelId === null
  || selectedModelId === "offline";
```

새 모델 목록에 현재 선택 모델이 존재하면 유지하고, 없을 때만 리셋한다.

### 4. 컴포넌트 토큰 통일

4개 설정 패널이 제각각 다른 `text-step`과 `font-weight`를 쓰고 있었다. `SettingsPageHeader`(h3)와 `GroupHeader`(h4) 두 개의 공용 컴포넌트로 추출하여 토큰을 일관되게 만들었다.

## 정리

- "적용 버튼이 필요한가?"라는 질문은 "저장 실패 가능성이 있는가?"로 바꿔 생각하면 답이 나온다. localStorage는 실패하지 않는다.
- 경쟁 상태는 "두 atom이 동시에 바뀌면 effect가 어떤 순서로 실행되는가"를 추적해야 보인다. `modeChanged` 같은 boolean 플래그보다 "새 목록에 현재 값이 유효한가"로 판단하는 게 견고하다.
- 설정처럼 반복 사용되는 UI는 토큰 불일치가 쌓이기 쉽다. 공용 컴포넌트를 먼저 만들고 패널별로 가져다 쓰는 게 순서가 맞다.
