---
type: "content"
domain: "frontend"
category: "testing"
topic: "Playwright e2e 셀렉터가 접근성 트리엔 보이는 텍스트를 못 찾을 때, 카드 DOM 구조를 따라가는 filter 체인 대신 검색 결과 컨테이너 안에서 직접 찾기"
updatedAt: "2026-10-08"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "playwright"
  - "e2e-test"
  - "dom-hierarchy-mismatch"
  - "accessibility-tree"
  - "selector-fragility"

relatedCategories:
  - "ui-ux"
---

# Playwright e2e 셀렉터가 접근성 트리엔 보이는 텍스트를 못 찾을 때, 카드 DOM 구조를 따라가는 filter 체인 대신 검색 결과 컨테이너 안에서 직접 찾기

> atelier의 컴포넌트/페이지 대표 썸네일 커스터마이즈 기능(텍스트 썸네일·이미지 업로드) e2e 테스트를 작성하던 중, 텍스트 썸네일이 실제로는 렌더링되는데도 테스트 셀렉터가 찾지 못해 실패하는 문제를 만났다. 원인은 Playwright `error-context`가 남긴 접근성 트리를 읽고 찾았다: 카드 컨테이너의 DOM 구조를 거슬러 올라가는 filter 체인 셀렉터가 실제 렌더링 위치와 어긋나 있었다. 검색 결과를 이미 한 개로 좁혀주는 `results()` 헬퍼 안에서 텍스트를 직접 찾는 방식으로 바꿔 해결했다.

## 배경

카드 대표 썸네일 커스터마이즈 기능(Task 1~13)의 마지막 단계로 `card-thumbnail-custom.spec.ts`에 컴포넌트 텍스트 모드·이미지 업로드/되돌리기·페이지 텍스트 모드 세 가지 e2e 테스트를 작성했다. 기존 패턴은 `page.locator('[data-slot="library-card"]').filter({ has: cardOf(...) }).getByText(...)` 처럼 카드 컨테이너를 먼저 찾고 그 안에서 `filter`로 특정 카드를 걸러낸 뒤 텍스트를 찾는 체인이었다.

## 핵심 내용

**텍스트는 렌더링되고 있었다 — 문제는 셀렉터의 DOM 경로였다.** 실패한 테스트가 남긴 `error-context.md`의 접근성 트리를 보면 `"e2e 텍스트 썸네일"` 텍스트가 분명히 페이지에 존재했다. 다만 `link "login-screen 상세 보기"`와 같은 레벨의 형제 노드로 나타났고, 테스트 셀렉터는 카드 컨테이너 안쪽 특정 계층을 따라 내려가도록 짜여 있었다. 즉 `TextThumb`이 렌더링한 텍스트의 실제 DOM 위치가 `ComponentCard`의 `lib-card-cover` 같은 래퍼 구조를 테스트가 가정한 경로와 다르게 두고 있어, 화면엔 보이지만 셀렉터 경로로는 닿지 않는 상태였다.

**해결은 카드 내부 구조를 따라가지 않는 것.** `openLibraryAt(page, COMPONENT)`가 검색 목록을 이미 해당 컴포넌트 하나로 좁혀주므로, 그 뒤에 남는 `results(page)` 컨테이너 안에는 카드가 하나뿐이다. 이 전제를 이용해 셀렉터를

```
page.locator('[data-slot="library-card"]').filter({ has: cardOf(...) }).getByText("e2e 텍스트 썸네일")
```

대신

```
results(page).getByText("e2e 텍스트 썸네일")
```

로 바꿨다. 카드 컨테이너의 내부 구조(`lib-card-cover`, `TextThumb` 배치 등)를 전혀 참조하지 않으므로, `ComponentCard` 쪽 DOM이 나중에 바뀌어도 테스트가 깨지지 않는다.

**검증:** 세 테스트(컴포넌트 텍스트 모드 7.7s, 컴포넌트 이미지 업로드/되돌리기 3.6s, 페이지 텍스트 모드 7.1s) 모두 통과.

## 정리

Playwright 테스트가 "화면엔 보이는데 셀렉터가 못 찾는" 상태로 실패하면, 렌더링 여부와 셀렉터 경로 문제를 분리해서 봐야 한다. 실패 시 남는 `error-context.md`의 접근성 트리를 먼저 확인하면 텍스트가 존재하는지, 어느 계층에 있는지 바로 드러난다. 존재는 하는데 못 찾는 경우라면, 검색·필터링으로 결과가 이미 하나로 좁혀진 지점이 있는지 찾아 그 지점부터 직접 찾는 셀렉터로 바꾸는 편이 대상 컴포넌트의 내부 DOM 구조를 따라가는 셀렉터보다 변경에 강하다. [Aug 30의 getByRole 접근성 트리 vs DOM 쿼리 문제](../08/260830_getbyrole_fails_when_ancestor_has_aria_hidden.md)와 같은 계열의 교훈 — Playwright 셀렉터는 DOM 트리가 아니라 접근성 트리·검색으로 좁혀진 컨테이너를 기준으로 짜는 쪽이 더 안정적이다.
