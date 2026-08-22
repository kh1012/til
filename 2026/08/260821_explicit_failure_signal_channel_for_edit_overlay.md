---
type: "content"
domain: "frontend"
category: "state-management"
topic: "PATCH 실패 시 HMR 신호에 얹혀가던 blur overlay를 explicit failure 채널로 분리하기"
updatedAt: "2026-08-21"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "optimistic-ui"
  - "race-condition"
  - "failure-signal"
  - "inflight-state"
  - "undo"

relatedCategories:
  - "react"
---

# PATCH 실패 시 HMR 신호에 얹혀가던 blur overlay를 explicit failure 채널로 분리하기

> maxflow 페이지 편집기는 캔버스에서 요소를 수정하면 PATCH를 보내고, 파일이 바뀌면 HMR이 붙는 시점에 "적용 중" blur overlay를 걷어내고 있었다. 성공 경로에서는 문제없이 동작했지만, 편집이 거부되거나 네트워크가 끊기면 HMR이 애초에 오지 않아 overlay가 2.5초 타임아웃까지 그대로 걸려 있었다 — 그리고 그 사이 undo를 눌러도 반응이 없었다.

## 배경

측정 스크립트(PD-LIF-020 케이스)로 재현한 순서는: PATCH가 실패(abort)한 뒤 사용자가 ⌘Z를 누르면 undo가 아무 효과 없이 씹히는 것이었다. 원인은 실패한 edit이 전역 `inflight` 상태에 그대로 얼어붙어 있어서, undo 체인(`flushPageEdits().then(...)`)이 실행될 기회 자체를 못 얻는 것이었다. 화면에는 튕겨나간 글자가 보이는데 파일은 그대로고, 토스트도 하나 없는 완전한 침묵 상태 — UI와 파일이 divergence난 채로 사용자가 리로드 전까지 빠져나올 방법이 없었다.

## 핵심 내용

**overlay clear가 "성공 신호"에 얹혀 있었다.** blur overlay는 HMR이 붙는 순간(파일이 바뀌었다는 방증)을 기다려 사라지도록 짜여 있었다. 이건 성공 경로에서는 우연히 맞는 타이밍이었을 뿐, 실패 시엔 HMR 자체가 오지 않으므로 overlay를 내릴 신호가 없었다 — 결국 CSS 2.5초 타임아웃만 남는다. "성공하면 온다"는 부수효과를 실패 처리의 트리거로 쓰면 안 된다는 걸 재확인한 케이스.

**기존 성공 채널(`onEditSnapshot`)과 대칭으로 실패 채널을 새로 판다.**
```ts
const failureListeners = new Set<() => void>();
export function onEditFailure(cb: () => void) {
  failureListeners.add(cb);
  return () => failureListeners.delete(cb);
}
export function useEditFailure(cb: () => void) {
  useEffect(() => onEditFailure(cb), [cb]);
}
```
라우트 쪽은 `useEditFailure(apply.stop)` 한 줄로 구독한다. 기존에 있던 snapshot 알림 패턴을 그대로 복제했기 때문에 새 동시성 버그를 만들 표면이 넓지 않았다.

**"실패 시 해야 할 일 세 가지"를 한 함수로 묶어서 흩어지지 않게 했다.** UI 롤백, `failureListeners` 발화, 에러 토스트 — 이 세 가지가 실패 경로마다 따로따로 구현되면 언젠가 하나가 빠진다. `failed()`라는 단일 함수로 합쳐서 호출부가 이 셋을 분리해서 부를 수 없게 만들었다.

**`throw`가 아니라 반환값으로 바꿔야 여러 caller가 같은 에러 처리를 탈 수 있었다.** `writePageSource`(undo가 호출)와 `sendRestore`(버전 복원이 호출)는 network fetch 에러를 잡지 않고 그대로 던지고 있었다. undo·코드탭·버전복원 세 caller가 각자 다른 방식으로 에러를 다루고 있었는데, 이걸 `{ ok: false, reason }` 값으로 통일해서 반환하자 세 caller 모두 이미 갖고 있던 에러 처리 경로를 그대로 재사용할 수 있었다. 예외를 던지면 caller마다 try/catch를 새로 짜야 하지만, 값으로 반환하면 기존 분기에 얹기만 하면 된다.

Playwright로 검증한 결과 overlay는 거부·네트워크 단절 두 시나리오 모두에서 200ms 안팎(179~222ms)에 걷혔다 — 이전엔 2.5초였다.

## 정리

비동기 쓰기의 실패 경로는 성공 경로의 부산물(HMR, 상태 변화)에 얹혀갈 수 없다 — 실패는 그 자체로 독립된 신호 채널이 있어야 사용자 피드백과 잠금 해제가 제때 일어난다. 그리고 하나의 실패가 "UI 롤백 + 알림 발화 + 에러 토스트"처럼 여러 부수효과를 요구한다면, 그 세트를 흩어놓지 말고 단일 함수로 묶어야 나중에 새 실패 경로가 추가될 때 하나를 빠뜨리지 않는다.
