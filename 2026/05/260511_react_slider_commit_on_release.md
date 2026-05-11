---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "슬라이더의 드래그 갱신과 서버 커밋을 분리하는 commit-on-release 패턴"
updatedAt: "2026-05-11"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react"
  - "slider"
  - "debounce"
  - "input-range"
  - "jotai"

relatedCategories:
  - "ux"
  - "state-management"
---

# React 슬라이더 commit-on-release 패턴

> 슬라이더 드래그 중에는 로컬 state 만 갱신하고, 마우스/터치/키를 놓는 순간에만 서버에 PUT — debounce 보다 명확하고 의도가 코드에 그대로 드러난다.

## 배경

admin 이 변경하면 전 사용자에게 즉시 반영되는 글로벌 정책 슬라이더(컨텍스트 ratio 5~100%)를 만들었다. 처음에 `onChange` 마다 `fetch PUT` 을 호출했더니 드래그 한 번에 PUT 이 수십 번 발생했다.

흔한 해결책은 debounce 300ms. 그런데 적용하고 보니:

- 사용자가 드래그를 멈춘 뒤 300ms 가 지나야 토스트가 떠서 "내가 손을 뗐는데 왜 안 저장됐지?" 라는 인지가 생긴다.
- 키보드 화살표로 조정할 때 매 키마다 timer 가 재시작되어 흐름이 부자연스럽다.
- timer cleanup 코드가 useEffect / useRef 로 늘어난다.

`input[type="range"]` 는 사용자가 "결정"한 순간이 명확하다 — **마우스를 떼는 순간**. 그 순간에만 PUT 하면 debounce 가 풀어야 했던 모든 문제가 사라진다.

## 핵심 내용

### React 의 onChange 는 매 프레임 발화한다

`input[type="range"]` 의 React `onChange` 는 native `input` 이벤트로 매핑된다. 드래그 중 픽셀 이동마다 발화. 진짜 "change" (= 마우스 release) 시점이 아니다.

### 두 핸들러 분리

```tsx
const onSlide = (raw: number) => {
  // 드래그 중 — atom 만 갱신. 시각적 피드백.
  setRatio(clamp(raw / 100));
};

const onCommit = (raw: number) => {
  // 마우스/손가락/키 release — 서버 PUT + 토스트.
  const next = clamp(raw / 100);
  if (next === lastCommittedRef.current) return;
  lastCommittedRef.current = next;
  void pushToServer(next).then(() => toast.success(`${Math.round(next * 100)}% 로 저장`));
};

<input
  type="range"
  onChange={(e) => onSlide(Number(e.target.value))}
  onMouseUp={(e) => onCommit(readVal(e.target))}
  onTouchEnd={(e) => onCommit(readVal(e.target))}
  onKeyUp={(e) => onCommit(readVal(e.target))}
/>
```

세 가지 release 이벤트를 모두 처리해야 입력 방식(마우스/터치/키보드) 별로 일관된 UX 가 된다.

### 가드 함정 — atom 값과 비교하면 안 된다

처음에 "같은 값이면 PUT 생략" 가드를 atom 값(`ratio`) 으로 작성했다.

```tsx
const onCommit = (raw: number) => {
  const next = clamp(raw / 100);
  if (next === ratio) return;  // ← 항상 true 가 됨!
  ...
};
```

`onSlide` 가 드래그 중 매 프레임 `ratio` 를 최종 값으로 갱신하기 때문에, `onCommit` 시점에는 `ratio` 가 이미 `next` 와 같다. 가드가 항상 발동해서 PUT 이 영영 호출되지 않는 버그가 됐다 — 토스트가 안 떠서 발견.

해결은 **마지막으로 PUT 한 값** 을 `useRef` 로 따로 추적하는 것. 이게 진짜 비교 대상이다.

```tsx
const lastCommittedRef = useRef(initialValue);

const onCommit = (raw: number) => {
  const next = clamp(raw / 100);
  if (next === lastCommittedRef.current) return;  // ← 단순 클릭 (값 안 바뀜) 은 정확히 스킵
  lastCommittedRef.current = next;
  void pushToServer(next).then((updated) => {
    lastCommittedRef.current = updated;  // 서버 정규화 반영
  });
};
```

### debounce 와의 비교

| 항목 | debounce 300ms | commit-on-release |
|---|---|---|
| PUT 호출 시점 | 사용자 멈춤 + 300ms 후 | release 즉시 |
| 응답성 인지 | 약간 지연감 | 즉각 |
| 토스트 빈도 | 중간 멈춤마다 다발 | release 1회 |
| 키보드 조작 | 키마다 timer reset | 키 떼면 1회 |
| 코드 복잡도 | useRef + setTimeout + cleanup | 핸들러 3개 |
| cleanup 필요 | yes (timeout) | no |

## 정리

- 슬라이더는 "드래그 중 = 로컬 state, release = 서버 commit" 이라는 두 단계 모델로 보는 게 가장 명확하다.
- `onChange` 는 매 프레임 발화하므로 debounce 가 아니라 release 이벤트(`onMouseUp` / `onTouchEnd` / `onKeyUp`) 셋을 동시에 거는 게 정답.
- 가드를 atom/state 값과 비교하면 드래그 중 갱신 때문에 항상 발동한다. 가드 기준은 항상 **마지막 commit 한 값** (ref) 이어야 한다.
- 서버 정규화로 값이 살짝 바뀌어 응답하는 경우, ref 도 응답값으로 같이 동기화해야 다음 비교가 정확하다.
- debounce 가 의미 있는 시점은 "사용자가 결정의 순간이 없는 입력" (실시간 검색 등). 슬라이더처럼 명시적 release 가 있는 입력에는 항상 commit-on-release 가 더 자연스럽다.
