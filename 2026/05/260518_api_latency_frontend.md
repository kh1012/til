---
draft: true
type: "content"
domain: "frontend"
category: "performance"
topic: "API 레이턴시 진단부터 최적화까지 프론트엔드 관점에서 정리"
updatedAt: "2026-05-18"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "api-latency"
  - "performance"
  - "sentry"
  - "web-vitals"
  - "tanstack-query"
  - "axios-interceptor"

relatedCategories:
  - "monitoring"
  - "react"
  - "ux"
---

# API 레이턴시 대응 (프론트엔드 관점)

> "느리다"는 감각을 수치로 바꾸고, 프론트 선에서 할 수 있는 것부터 백엔드 협의까지 단계별로 접근한다.

## 배경

"API가 느리다"는 피드백을 받았을 때 프론트엔드 개발자가 가장 먼저 빠지기 쉬운 함정은 두 가지다. 첫째, 곧바로 백엔드 탓으로 돌리고 손을 놓는 것. 둘째, 진단 없이 캐싱이나 최적화부터 시도하는 것. 둘 다 문제 해결로 이어지지 않는다. 진단 → 수치화 → 프론트 최적화 → 백엔드 협의의 순서로 접근해야 한다.

## 핵심 내용

## 진단부터

느리다는 말을 들었을 때, 가장 먼저 해야 할 일은 "어디가 느린지"를 특정하는 것이다.

브라우저 DevTools Network 탭 > Timing에서 구간을 분리해서 본다.

| 구간 | 의미 | 원인 |
|---|---|---|
| TTFB | 서버가 첫 바이트 보내기까지 | 서버 처리 문제 |
| Content Download | 응답 수신 시간 | 페이로드 크기 문제 |
| Stalled / Waiting | 연결 대기 시간 | 네트워크 / 연결 문제 |

기준점은 Google 권장 기준을 따른다.

- 200ms 이하: 빠름
- 200~1000ms: 보통
- 1000ms 이상: 개선 필요

---

## 수치화

"느리다"는 감각을 수치로 바꾸는 것이 먼저다. 중요한 건 평균이 아니라 P95, P99 분포다. 평균은 괜찮아 보여도 가끔 극단적으로 튀는 패턴은 평균으로 잡히지 않는다.

### performance.now()로 직접 측정

```js
const start = performance.now()
await fetch('/api/something')
const end = performance.now()
console.log(`${end - start}ms`)
```

### axios 인터셉터로 자동 수집

```js
axios.interceptors.request.use(config => {
  config.metadata = { startTime: performance.now() }
  return config
})

axios.interceptors.response.use(response => {
  const duration = performance.now() - response.config.metadata.startTime
  console.log(`${response.config.url}: ${duration}ms`)
  return response
})
```

### web-vitals 라이브러리

실제 유저 환경에서 수집하는 RUM(Real User Monitoring). Lighthouse보다 현실적인 수치가 나온다.

```bash
npm install web-vitals
```

```js
import { onLCP, onFID, onCLS, onTTFB } from 'web-vitals'

onTTFB(console.log) // 실제 유저 환경에서 TTFB 수집
```

---

## Sentry Performance 연동

API별 레이턴시를 운영 환경에서 지속 추적하려면 Sentry Performance가 가장 실용적이다.

### 기본 설정

```js
import * as Sentry from '@sentry/browser'

Sentry.init({
  dsn: 'your-dsn',
  integrations: [
    Sentry.browserTracingIntegration(),
  ],
  tracesSampleRate: 0.1, // 운영에선 0.1~0.2 권장
})
```

이것만 해도 fetch / XHR 요청을 자동으로 추적해서 대시보드에서 API별 레이턴시를 볼 수 있다.

### axios 인터셉터와 Sentry 조합

특정 API만 집중해서 트래킹할 때.

```js
axios.interceptors.request.use(config => {
  config.metadata = {
    startTime: performance.now(),
    span: Sentry.startInactiveSpan({ name: `axios ${config.url}` })
  }
  return config
})

axios.interceptors.response.use(response => {
  const { span } = response.config.metadata
  span.setStatus({ code: 1 }) // OK
  span.end()
  return response
}, error => {
  const { span } = error.config.metadata
  span.setStatus({ code: 2 }) // ERROR
  span.end()
  throw error
})
```

### 커스텀 트랜잭션

특정 API 구간만 명시적으로 잡고 싶을 때.

```js
const span = Sentry.startInactiveSpan({ name: 'fetch /api/analysis' })

try {
  const res = await fetch('/api/analysis')
  span.setStatus({ code: 1 })
} catch (e) {
  span.setStatus({ code: 2 })
  throw e
} finally {
  span.end()
}
```

### Sentry 대시보드에서 볼 수 있는 것

- API별 평균 응답 시간
- P50 / P75 / P95 분포
- 느린 요청이 발생한 유저 세션 추적
- 에러와 레이턴시 스파이크의 상관관계

### Sentry 플랜

| 플랜 | 에러 | 트랜잭션 | 데이터 보존 |
|---|---|---|---|
| 무료 | 월 5,000건 | 월 10,000건 | 30일 |
| 유료 | 무제한 | 무제한 | 90일 이상 |

데이터 주권이 민감한 환경(B2B, 중국 법인 등)이라면 Sentry 셀프호스팅을 검토할 것. 오픈소스라 라이선스 비용 없이 직접 서버에 올릴 수 있다.

---

## 프론트 선에서 할 수 있는 최적화

진단과 수치화가 끝났다면 이 순서로 접근한다.

### 1. 캐싱 재검토

TanStack Query `staleTime` 설정을 확인한다. 자주 바뀌지 않는 데이터는 staleTime을 길게 잡는다.

```ts
useQuery({
  queryKey: ['structural-types'],
  queryFn: fetchStructuralTypes,
  staleTime: 1000 * 60 * 5, // 5분
})
```

### 2. 순차 요청 → 병렬 전환

```ts
// 순차 (느림)
const a = await fetchA()
const b = await fetchB()

// 병렬 (빠름)
const [a, b] = await Promise.all([fetchA(), fetchB()])
```

### 3. Prefetch로 타이밍 앞당기기

사용자 인터랙션을 예측해서 미리 데이터를 당겨온다.

```ts
onMouseEnter={() => {
  queryClient.prefetchQuery({ queryKey: ['step', nextStep] })
}}
```

### 4. UX로 체감 레이턴시 줄이기

실제로 빠르게 만들 수 없는 상황에서 쓴다.

- Optimistic Update: 서버 응답 전에 UI를 먼저 반영
- Skeleton UI: 레이아웃 shift 없이 로딩을 자연스럽게 처리
- Streaming: SSE로 청크 단위로 먼저 렌더링 시작

---

## 백엔드 협의 어젠다

수치를 가지고 가야 한다. "느린 것 같다"는 설득이 안 된다.

- HTTP/2 또는 HTTP/3 지원 여부 (multiplexing으로 요청 경합 감소)
- gzip / brotli 응답 압축 적용 여부
- CDN 엣지 캐싱 설정
- over-fetching 제거 (BFF 또는 필드 선택 API)

## 정리

레이턴시 대응의 핵심은 "감각을 수치로 바꾸는 것"이다. P95, P99 분포를 가지고 가야 백엔드와 의미 있는 협의가 가능하다. 그리고 프론트가 할 수 있는 일은 생각보다 많다. 캐싱, 병렬 전환, prefetch, Optimistic Update, Skeleton UI — 실제 응답 시간을 줄이지 못해도 체감 레이턴시는 충분히 개선할 수 있다. 결국 "느리다"는 문제는 한 곳의 책임이 아니라 진단부터 UX까지 전 구간에서 풀어야 하는 문제다.
