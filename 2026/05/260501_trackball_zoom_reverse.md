---
draft: true
type: "content"
domain: "frontend"
category: "three"
topic: "TrackballControls의 음수 zoomSpeed 무시와 우회"
updatedAt: "2026-05-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "three.js"
  - "TrackballControls"
  - "react-force-graph-3d"
  - "wheel"
  - "zoom"

relatedCategories:
  - "react"
  - "webgl"
---

# TrackballControls의 음수 zoomSpeed는 무시된다

> three.js의 `TrackballControls.zoomSpeed`에 음수를 넣어 휠 방향을 반전시키려 했지만, 라이브러리 내부에서 `factor > 0`일 때만 카메라를 이동시켜서 **음수 설정이 통째로 무시**된다. 토글이 안 통하면 `noZoom = true`로 꺼버리고 자체 `wheel` 리스너로 직접 카메라 거리를 조작하는 게 깔끔하다.

## 배경

`react-force-graph-3d`로 코드베이스 의존성 그래프 뷰어를 만들면서, 휠 줌의 방향을 반전시키고 민감도를 낮추고 싶었다. 라이브러리는 내부적으로 `TrackballControls`를 사용하고 `controls()` 메서드로 인스턴스를 노출한다. 첫 번째 시도는 자연스럽게:

```ts
const controls = fg.controls()
controls.zoomSpeed = -0.5
```

기대: 부호가 반전되니 휠 방향이 뒤집힐 것. 결과: **아무 변화도 없음**. 처음엔 다른 곳에서 effect가 덮어쓴 게 아닐까 의심했지만, 동일한 effect 안에서 `panSpeed`는 음수가 잘 동작하는데 `zoomSpeed`만 안 됐다.

## 핵심 내용

### 라이브러리 내부 구현

`three/examples/jsm/controls/TrackballControls.js`의 zoom 처리 부분:

```js
zoomCamera() {
  // ...
  const factor = 1.0 + (_zoomEnd.y - _zoomStart.y) * scope.zoomSpeed;
  if (factor !== 1.0 && factor > 0.0) {
    _eye.multiplyScalar(factor);
    // ...
  }
}
```

`factor > 0.0` 가드가 있어서 `zoomSpeed`가 음수면 `factor`가 종종 음수가 되고 그 프레임은 통째로 스킵된다. 양수 작은 값은 OK, 부호 반전은 금지. 이 정책 자체가 안전장치(카메라가 원점을 통과해 뒤집히는 것을 막기 위해서)인데, 사용자 입장에선 "토글이 안 먹는다"로 보인다.

`panSpeed`는 비슷한 가드가 없어서 음수가 정상 동작한다. 그래서 같은 패턴으로 둘을 다루면 `pan`만 반전되고 `zoom`은 침묵한다.

### 우회 — noZoom + 자체 wheel listener

기본 줌을 끄고 wheel 이벤트를 직접 잡아서 카메라 거리를 곱셈으로 조작한다.

```ts
useEffect(() => {
  let cancelled = false
  let detach: (() => void) | null = null

  function attach() {
    if (cancelled) return
    const fg = fgRef.current
    const controls = fg?.controls?.() as { noZoom?: boolean } | undefined
    const dom = fg?.renderer?.()?.domElement
    if (!controls || !dom) {
      requestAnimationFrame(attach)  // 마운트 직후 미준비 케이스 대비
      return
    }
    controls.noZoom = true

    const onWheel = (e: WheelEvent) => {
      e.preventDefault()
      const camera = fg?.camera?.()
      if (!camera) return
      // 표준: 휠 위(deltaY<0) = zoom in, 휠 아래(deltaY>0) = zoom out
      // 반전이 필요하면 부등호만 뒤집는다
      const factor = e.deltaY > 0 ? 1.08 : 0.92
      camera.position.multiplyScalar(factor)
    }
    dom.addEventListener('wheel', onWheel, { passive: false })
    detach = () => dom.removeEventListener('wheel', onWheel)
  }
  attach()
  return () => {
    cancelled = true
    detach?.()
  }
}, [])
```

### 디테일

- `passive: false`가 필수. React의 `onWheel` prop은 passive로 등록되어 `preventDefault()`가 안 통한다. 페이지 스크롤이 동시에 발생하니 DOM에 직접 부착해야 한다.
- `requestAnimationFrame` 재시도가 필요하다. `controls()`와 `renderer()`는 첫 렌더 직후엔 undefined일 수 있다.
- `camera.position.multiplyScalar(factor)`는 카메라가 바라보는 원점 기준 거리를 직접 조절한다. cursor 위치 기준 줌이 필요하면 `unproject` + `lerp` 조합으로 더 정교하게 갈 수 있지만, 그래프 viewer 정도면 단순 곱셈으로 충분하다.
- 민감도 조절은 `factor`의 0.92 / 1.08 부분을 0.96 / 1.04 같은 식으로 1에 가깝게 만들면 된다. `panSpeed`는 라이브러리가 정상 처리하니까 그쪽은 그대로 둔다.

## 정리

- **라이브러리 옵션이 안 통할 땐 내부 구현을 한 번 들여다보는 게 가장 빠른 디버깅.** 음수 zoomSpeed를 두 시간 동안 토글했는데, 실제론 첫 시도부터 전혀 동작 안 하고 있었다. 사용자에게는 "한 번 바뀐 후 다시 안 바뀐다"로 보였는데 본질은 "처음부터 한 번도 안 바뀐 적이 없다"였다.
- **양수만 받는 옵션을 음수로 토글하려는 건 안티패턴**이다. 부호 반전이 도메인적으로 의미가 있다면 라이브러리가 보통 별도 boolean flag(`reverseZoom` 등)를 제공한다. 없으면 그건 라이브러리가 의도적으로 막은 동작이라고 봐야 한다.
- **canvas 위에서의 wheel은 항상 passive: false + DOM 레벨 부착.** React 합성 이벤트는 휠/터치에서 preventDefault가 안 되는 경우가 많아서 `useEffect`로 직접 listener를 거는 패턴이 표준.
- 결국 라이브러리의 안전장치를 우회한 셈이라 편의 옵션(`zoomSpeed` 같은 것)을 잃었다. 우회 후엔 그 옵션들을 직접 코드에 박아 관리해야 한다는 비용이 생긴다.
