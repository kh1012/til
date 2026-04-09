---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "Jotai atomWithStorage 새로고침 시 서버 재검증 패턴"
updatedAt: "2026-04-09"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "jotai"
  - "atomWithStorage"
  - "localStorage"
  - "revalidation"
  - "SSR hydration"

relatedCategories:
  - "state-management"
  - "nextjs"
---

# Jotai atomWithStorage + 마운트 시 서버 재검증 패턴

> localStorage에 영속화된 상태(API Key 등)를 페이지 새로고침 시 서버 검증으로 동기화하는 패턴

## 배경

커넥터 기능에서 API Key를 Jotai `atomWithStorage`로 localStorage에 저장하고 있었다. 키 저장 자체는 잘 되지만, 새로고침 후 저장된 키가 여전히 유효한지 확인하는 로직이 없어서 "연결됨"으로 표시되지만 실제로는 만료/무효화된 키일 수 있는 문제가 있었다.

## 핵심 내용

### 문제: atomWithStorage만으로는 부족하다

```ts
// 이것만으로는 "저장"은 되지만 "유효성"은 보장 안 됨
export const apiKeyAtom = atomWithStorage<string | null>("my-key", null);
```

`atomWithStorage`는 localStorage ↔ Jotai atom 양방향 동기화를 해주지만, 저장된 값이 서버 측에서 여전히 유효한지는 알 수 없다.

### 해결: 마운트 시 재검증 훅

```ts
export function useRevalidateOnMount() {
  const storedKey = useAtomValue(apiKeyAtom);
  const setKey = useSetAtom(apiKeyAtom);

  useEffect(() => {
    if (!storedKey) return;
    let cancelled = false;

    async function revalidate() {
      const result = await verifyKey(storedKey);
      if (cancelled) return;

      if (result === "connected") {
        // 유효 → connectedAt 타임스탬프 갱신
        setConnectedAt(Date.now());
      } else {
        // 무효 → 키 클리어 + 연결 상태 해제
        setKey(null);
        setEnabled(false);
        setConnectedAt(null);
      }
    }

    void revalidate();
    return () => { cancelled = true; };
  }, []); // mount-only
}
```

### 핵심 포인트

1. **mount-only effect**: deps를 `[]`로 두어 새로고침/마운트 시 1회만 실행
2. **cancelled flag**: cleanup에서 stale 응답 무시 (컴포넌트 언마운트 방어)
3. **Promise.all로 병렬 검증**: 커넥터가 여러 개면 동시에 검증
4. **유효 시 타임스탬프 갱신**: `connectedAt`을 현재 시각으로 업데이트하면 "3분 전 연결됨" 같은 상대 시간 표시에도 활용 가능

### 테스트 전략 (TDD)

Jotai `createStore`로 격리된 스토어를 만들어 훅을 테스트한다:

```ts
function setupStore() {
  const store = createStore();
  store.set(apiKeyAtom, "test-key");
  store.set(enabledAtom, { myConnector: true });
  return store;
}

it("무효 키는 클리어된다", async () => {
  mockVerify.mockResolvedValue("invalid");
  const store = setupStore();

  renderHook(() => useRevalidateOnMount(), {
    wrapper: createWrapper(store),
  });

  await waitFor(() => {
    expect(store.get(apiKeyAtom)).toBeNull();
  });
});
```

`createStore` + `Provider`로 감싸면 각 테스트가 완전히 독립된 상태를 가진다.

## 정리

- `atomWithStorage`는 **저장**만 해주고, **유효성 보장**은 별도 로직이 필요하다
- 마운트 시 재검증 패턴은 토큰/세션/API Key 등 서버 상태에 의존하는 모든 영속화 값에 적용 가능하다
- Jotai `createStore`를 활용한 훅 테스트는 전역 상태 오염 없이 깔끔하게 작성할 수 있다
