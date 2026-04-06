---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "React 컴포넌트 설계 5대 원칙 자기 점검"
updatedAt: "2026-04-06"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react"
  - "component-design"
  - "separation-of-concerns"
  - "single-responsibility"
  - "custom-hooks"
  - "suspense"

relatedCategories:
  - "typescript"
  - "architecture"
---

# React 컴포넌트 설계 5대 원칙 — 자기 점검

> 6시간 제한 과제(은행 자산관리 앱)를 마치고 코드 리뷰를 해봤다. 잘 지킨 원칙과 무의식적으로 놓친 부분이 명확하게 갈렸다.

## 배경

React로 은행 자산현황 조회 / 거래내역 / 이체 기능이 있는 앱을 구현했다. 시간 제한이 있는 과제였고, 완성 후 5대 설계 원칙(추상화 계층, 단일 책임, 응집도, 관심사 분리, 성공/실패 분리) 기준으로 코드를 점검했다.

## 잘한 점

### 1. 추상화 계층이 일관됐다

Page → Section → Card → Tag 4계층 래퍼 구조를 만들었다. 각 레벨이 하나의 레이아웃 관심사만 담당한다.

```
Page     — 전체 페이지 레이아웃, 헤더, 뒤로가기
Section  — 의미 단위 그룹, 제목
Card     — 개별 데이터 카드, 배경/테두리
Tag      — label + value 쌍
```

페이지 컴포넌트가 레이아웃 디테일을 몰라도 된다. `AssetStatusPage`가 7줄로 끝나는 건 이 계층 덕분이다.

### 2. 커스텀 훅으로 비즈니스 로직을 분리했다

- `useTransfer` — 이체 로직 (계좌 잔액 변경 + 거래 내역 추가)
- `useAccountManager` — 계좌 조회 (단건, 필터링)
- `useDataContext` — Context null guard를 한 곳에서 처리
- `useFunnel` — step 기반 퍼널 상태 관리 (제네릭으로 타입 안전)

컴포넌트가 "어떻게 이체하는지" 몰라도 `transfer(data)`만 호출하면 된다.

### 3. useFunnel 제네릭 설계

```tsx
function useFunnel<T extends readonly string[]>({ steps }: { steps: T }) {
  // Step 컴포넌트의 name prop이 T[number]로 타입 체크됨
  function Step({ name }: { name: T[number] }) { ... }
}
```

step 이름을 `as const` 배열로 넘기면 존재하지 않는 step name에 대해 타입 에러가 난다. 런타임 버그를 컴파일 타임에 잡을 수 있다.

### 4. TypeScript를 잘 활용했다

`any` 사용 0건. interface 정의가 명확하고, Transaction의 `type: "income" | "expense"` 같은 union literal로 도메인을 표현했다.

## 부족한 점

### 1. 데이터 소스 일관성을 놓쳤다 (치명적)

가장 큰 실수. `DataProvider`로 Context를 만들어놓고, 일부 컴포넌트에서 mock 데이터를 직접 import했다.

```tsx
// OwnAccountList — Context 사용 ✅
const { accounts } = useDataContext();

// AssetSummaryCard — mock 직접 import ❌
import { accounts } from "../shared/mock";
```

이체 후 잔액이 바뀌어도 `AssetSummaryCard`, `TransactionHistoryPage`는 원본 mock을 보고 있어서 화면이 갱신되지 않는다. "되는 것 같은데 안 되는" 가장 위험한 버그다.

**교훈**: 데이터 소스는 하나로 통일한다. Context를 만들었으면 전부 Context를 통해 접근한다. "일단 빠르게"를 위해 mock을 직접 import하면 나중에 반드시 문제가 된다.

### 2. 훅에서 UI 컴포넌트를 반환했다

`useTransactionFilter`에서 `Filters`라는 컴포넌트를 만들어서 반환했다.

```tsx
// 훅이 상태 + UI를 동시에 반환
export default function useTransactionFilter(allItems: Transaction[]) {
  const [filterLabel, setFilterLabel] = useState(...);
  function Filters() { return <div>...</div>; }  // UI가 훅 안에!
  return { items, Filters };
}
```

`useFunnel`의 `Step`도 같은 패턴인데, 이쪽은 headless UI라 수용 가능하다고 판단했다. 하지만 `useTransactionFilter`의 `Filters`는 구체적인 스타일과 버튼을 가진 완전한 UI다. 훅은 상태/로직만 반환하고, UI는 별도 컴포넌트로 분리해야 한다.

**교훈**: "훅이 컴포넌트를 반환해도 되는가?"의 기준은, 그 컴포넌트가 **구체적인 UI를 가지는지** 여부다. 렌더링 위임만 하는 Step은 OK, 구체적 버튼/스타일을 가진 Filters는 NO.

### 3. 유효성 검증에 side effect를 섞었다

`TransferAmountInput`의 `isValid` 함수가 검증과 동시에 `setErrorMsg`를 호출한다.

```tsx
function isValid(value: number) {
  if (value < 0) { setErrorMsg("..."); return false; }  // 판정 + side effect
  ...
}
```

`errorMsg`는 `amount`에서 파생 가능한 값인데 별도 state로 관리하고 있다. 두 state가 동기화되지 않을 가능성이 생긴다.

**교훈**: 검증 함수는 순수 함수로 만들고, 에러 메시지는 파생 상태로 계산한다. `shared/utils`에 이미 `isValidAmount`를 만들어놓고도 안 쓴 것도 반성 포인트.

### 4. early return 이후 불필요한 방어 코드

```tsx
if (!data) return null;
// 여기서 data는 확실히 존재하는데...
<Tag label={"금액"}>{formatAmount(data?.amount ?? 0)}</Tag>  // ?. 와 ?? 불필요
```

습관적으로 optional chaining을 붙인 것. TypeScript가 타입을 좁혀주는데 그걸 신뢰하지 않은 셈이다. `useAccountManager`의 `accounts && accounts.find(...)` 도 같은 문제 — `useDataContext()`가 이미 null guard를 해주므로 불필요하다.

**교훈**: TypeScript의 타입 좁히기를 신뢰한다. early return이나 throw 이후에는 방어 코드가 필요 없다.

### 5. Suspense + StrictMode 이해 부족

```tsx
if (!isReady) throw new Promise((resolve) => setTimeout(resolve, 0));
```

매 렌더마다 새 Promise를 throw해서 StrictMode에서 무한 로딩이 발생했다. React 19에서는 `use()` hook으로 모듈 레벨 Promise를 읽는 것이 정석이다.

**교훈**: Suspense의 Promise는 **참조 안정성**이 핵심이다. 매 렌더마다 새 Promise를 만들면 안 된다.

## 정리

| 원칙 | 잘한 점 | 놓친 점 |
|------|---------|---------|
| 추상화 계층 | Page→Section→Card→Tag 일관됨 | - |
| 단일 책임 | 훅별 역할 분리 잘함 | isValid에 side effect 혼재 |
| 응집도 | utils 기능별 파일 분리 | 중복 함수 분산 (formatAccountDisplayName vs getAccountDisplayName) |
| 관심사 분리 | useTransfer/useAccountManager | useTransactionFilter에 UI 포함 |
| 성공/실패 분리 | TODO로 인지는 함 | 실제 구현은 if-return null 패턴에 머무름 |

시간 제한 과제에서 "일단 동작하게" 만드는 것과 "설계 원칙을 지키는 것" 사이의 트레이드오프가 선명하게 드러났다. 특히 데이터 소스 일관성 같은 건 시간이 없어도 처음부터 맞춰야 하는 것이었다 — 나중에 고치는 비용이 훨씬 크다.
