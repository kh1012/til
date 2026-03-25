---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "Next.js 앱 메모리 누수 진단 — 클라이언트(Jotai atom) + 서버(webpack worker)"
updatedAt: "2026-03-25"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "memory-leak"
  - "jotai"
  - "nextjs"
  - "turbopack"
  - "webpack-workers"
  - "ring-buffer"

relatedCategories:
  - "react"
  - "performance"
  - "devops"
---

# Next.js 앱 메모리 4GB 누수 — 클라이언트와 서버 양쪽 원인 진단

> "메모리 4GB 점유" 제보를 받고 분석했더니, 브라우저(클라이언트)와 node.exe(dev server) 두 곳에서 각각 다른 원인으로 메모리가 폭주하고 있었다.

## 배경

AI 채팅 프론트엔드에서 백엔드와 응답을 주고받다 보면 메모리가 과도하게 증가한다는 제보를 받았다. "4GB"라는 숫자가 나왔는데, 실제로는 **클라이언트 측 누수**(chrome.exe +207MB)와 **서버 측 폭주**(node.exe +5,138MB) 두 가지가 합쳐진 것이었다.

처음엔 브라우저 메모리만 분석했다가, PR 리뷰에서 "node.exe가 5.6GB"라는 데이터를 받고서야 서버 측 문제를 발견했다. **"어디서" 메모리가 새는지를 먼저 특정하는 게 중요하다**는 교훈.

## 핵심 내용

### 1. 클라이언트 측 — 무한 성장 Jotai Atom

React 앱에서 Jotai atom에 `(prev) => [...prev, newItem]` 패턴으로 push하면서 **MAX 제한이 없는 atom이 5개** 있었다.

```typescript
// Before — 무한 성장
setStepUsages((prev) => [...prev, step]);

// After — ring buffer 적용
const MAX = 500;
setStepUsages((prev) => {
  const next = [...prev, step];
  return next.length > MAX ? next.slice(-MAX) : next;
});
```

특히 `interactionContentListAtom`은 스프레드시트/3D 모델 데이터를 통째로 저장해서 건당 100KB+ — 이게 가장 큰 단일 원인이었다.

**체크리스트**: atom에 push하는 곳이 있으면, 반드시 MAX 제한을 확인하자.

### 2. 서버 측 — webpack worker 과다 생성

`yarn dev`(= `next dev`)가 webpack 모드로 실행되면서 **CPU 코어 수만큼 webpack-loaders worker를 생성**한다.

| 환경 | 코어 수 | 워커 수 | 워커 메모리 |
|------|---------|---------|------------|
| Windows (제보) | 19 | 19개 | ~2,200MB |
| macOS (내 PC) | 12 | 12개 | ~1,020MB |

Turbopack으로 전환하면 webpack worker가 거의 사라진다:

```json
// package.json
"dev": "next dev --turbopack -p 3000",
"dev:webpack": "next dev -p 3000"
```

실측 결과 (macOS):
- webpack: 12개 워커, ~1,060MB
- **Turbopack: 2개 워커, ~340MB** (68% 절감)

### 3. 놓치기 쉬운 부수 누수들

| 패턴 | 예시 | 수정 |
|------|------|------|
| useState Map이 안 줄어듦 | `messageTimestamps` — set만 하고 delete 안 함 | 메시지 삭제 시 key 정리 |
| 중첩 setTimeout | setInterval 안에 setTimeout → unmount 시 orphan | 변수로 추적 후 cleanup |
| 콜백 변경 → 리스너 재등록 | `useEffect([handleDrop])` — files 변경마다 window 리스너 4개 재생성 | ref 패턴으로 안정화 |
| QueryClient 기본값 | gcTime 5분, 제한 없음 | gcTime 60s, staleTime 30s |

## 정리

- **메모리 문제는 "어디서"를 먼저 특정**하자. 브라우저인지 Node 서버인지에 따라 접근이 완전히 다르다.
- Jotai/Zustand 등 전역 상태에 push하는 곳은 **반드시 MAX 제한**을 걸어야 한다. `debugLogEntriesAtom`처럼 ring buffer가 있는 atom 옆에, 제한이 없는 `completedStepUsagesAtom`이 공존하고 있었다.
- Next.js 16에서 `next dev`는 기본이 webpack이다. **Turbopack은 명시적으로 `--turbopack` 플래그를 줘야** 활성화된다. 설정에 `turbopack: {}` 블록이 있어도 dev 스크립트에 플래그가 없으면 소용없다.
- 프로세스 모니터링 명령어: `ps -eo pid,rss,command | grep next` — 문제 재현 전후로 꼭 비교하자.
