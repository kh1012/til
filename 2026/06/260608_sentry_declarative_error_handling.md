---
draft: true
type: "content"
domain: "frontend"
category: "error-handling"
topic: "Sentry 에러 추적과 React 선언적 에러 처리"
updatedAt: "2026-06-08"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "sentry"
  - "error boundary"
  - "react-error-boundary"
  - "react query"
  - "declarative error handling"
  - "monitoring"

relatedCategories:
  - "react"
  - "monitoring"
  - "ux"
---

# Sentry로 추적하고, Error Boundary로 선언적으로 처리하기

> 카카오페이의 if(kakao)2022 발표를 정리했다. 핵심은 둘이다. Sentry로 "유의미한 에러만" 정밀하게 수집하고, React의 Error Boundary로 에러 처리를 "명령형에서 선언형으로" 옮긴다. 앞은 DX를, 뒤는 UX를 끌어올린다.

## 배경

주말 아침에 터진 에러를 잡을 때, 정작 시간을 가장 많이 잡아먹는 건 수정이 아니라 원인 파악이다. 서버 데이터가 문제인지, 브라우저 사이드 이펙트인지, 특정 디바이스에서만 터지는 건지. 사용자 환경(브라우저, 디바이스, 네트워크)이 너무 다양해서 에러 재연조차 어렵고, 그 비용이 고스란히 사용자의 불편과 개발자의 리소스 낭비로 이어진다.

그래서 목표는 분명했다. 프론트엔드에서 발생하는 예측 불가능한 런타임 에러와 외부 요인(네트워크, 브라우저) 에러를 **실시간으로 트래킹하고 신속하게 대응**하자. 이 문제를 두 갈래로 푼다 — 수집(Sentry)과 처리(Error Boundary).

## Part 1. Sentry로 "유의미한 에러"만 정밀하게 수집하기

모니터링 툴로 Sentry를 쓰되, 무작정 다 쌓는 게 아니라 분석에 쓸모 있는 데이터만 쌓는 게 핵심이었다.

### 스코프(Scope) — 글로벌 vs 로컬

공통 데이터는 글로벌 스코프로 한 번에, 특정 이벤트에만 필요한 정보는 로컬 스코프로 일시적으로 병합한다.

```ts
import * as Sentry from "@sentry/react";

// configureScope — 글로벌 스코프: 사용자 정보, 웹뷰 타입 등 공통 데이터
Sentry.configureScope((scope) => {
  scope.setUser({ id: user.id });
  scope.setTag("webview_type", getWebviewType()); // iOS / AOS / web
});

// withScope — 로컬 스코프: 이 이벤트 시점에만 태그/레벨을 일시 병합
Sentry.withScope((scope) => {
  scope.setLevel("warning");
  scope.setTag("error_type", "timeout");
  scope.setTag("api_path", error.config?.url ?? "unknown");
  Sentry.captureException(error);
});
```

### 컨텍스트(Context) — 로그 확인용

Axios 에러 객체에서 Request/Response를 따로 떼어 컨텍스트로 붙일 수 있다. 단, **컨텍스트는 검색이 안 된다.** 어디까지나 로그 확인용이다.

```ts
Sentry.withScope((scope) => {
  scope.setContext("API Request", {
    method: error.config?.method,
    url: error.config?.url,
    params: error.config?.params,
  });
  scope.setContext("API Response", {
    status: error.response?.status,
    data: error.response?.data,
  });
  Sentry.captureException(error);
});
```

### 태그(Tags) — 가장 중요한 한 가지

태그는 **인덱싱이 되기 때문에 검색과 알람 필터링의 핵심**이다. `error_type`, `api_path` 같은 태그를 잘 심어두면 Sentry에서 빠르게 검색하고, Slack 알람 조건도 이걸로 거른다. 컨텍스트와 태그를 가르는 기준은 단순하다 — "이걸로 검색/알람을 걸 건가?"가 Yes면 태그, No면 컨텍스트.

### 레벨(Level) — 중요도 분류

에러의 무게를 나눠 알람 조건을 세분화한다.

- `500 Internal Server Error` → **Error** 등급
- `Timeout` → **Warning** 등급

이렇게 나눠두면 "Error 등급만 즉시 Slack 알람" 같은 규칙을 세울 수 있다.

### 핑거프린트(Fingerprint) — 그룹화 재정의

Sentry는 기본 알고리즘으로 에러를 자동 그룹화한다. 그런데 같은 API에서 상태 코드만 다른 에러처럼, 자동 그룹화가 어색한 경우가 있다. 이때 Method, Status 등을 묶어 수동으로 그룹을 다시 정의한다.

```ts
Sentry.withScope((scope) => {
  scope.setFingerprint([
    error.config?.method ?? "GET",
    error.config?.url ?? "unknown",
    String(error.response?.status ?? "network"),
  ]);
  Sentry.captureException(error);
});
```

### "유의미한 데이터만 쌓자"

여기서 얻은 인사이트가 제일 실용적이었다. 모든 에러를 무분별하게 수집하면 오히려 분석을 방해한다.

- **수집 제외**: 사용자 네트워크 환경 탓에 일시적으로 뜨는 **청크 로드(Chunk Load) 에러**, 일반 네트워크 에러.
- **수집 포함**: CS 대응과 지표 체크에 필요한 **타임아웃 에러**, 의미 있는 **서버 500 에러**.

더해서, API 요청에 커스텀 헤더를 실어 보내고 그 값을 Sentry 태그에도 남긴다. 장애가 터지면 이 태그로 **서버 로그와 매핑**해 추적 속도를 극대화한다.

## Part 2. React 선언적 에러 처리로 UX 개선하기

### 명령형의 한계

기존엔 Axios 인터셉터로 에러를 **명령형**으로 처리했다. "에러가 나면 **어떻게(How)** 화면을 바꿀지"에 집중하는 방식이다. 코드 안에서 에러 상태를 일일이 관리하고 `history.push`로 페이지를 강제 이동시키다 보니, 관심사 분리가 어렵고 예외 케이스가 늘 때마다 분기문이 무한 증식했다. 게다가 **컴포넌트 일부만** 폴백 처리하기가 까다로웠다.

### 선언형으로 — "무엇을(What)" 보여줄지

선언형은 "에러 상황에서 **무엇을** 보여줄지"를 구조로 기술한다. 컴포넌트 트리 하위에서 발생한 에러를 잡아내는 **Error Boundary**가 그 도구다.

```tsx
import { ErrorBoundary } from "react-error-boundary";
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { useLocation } from "react-router-dom";

function ApiErrorBoundary({ children }: { children: React.ReactNode }) {
  const { reset } = useQueryErrorResetBoundary();
  const location = useLocation();

  return (
    <ErrorBoundary
      // 라우트 이동 시 location.key가 바뀌면 에러 상태가 리셋된다
      resetKeys={[location.key]}
      onReset={reset} // '다시 시도' 시 React Query 재호출
      fallbackRender={({ error, resetErrorBoundary }) => {
        // 전역으로 퍼져야 하는 에러(강제 업데이트, 점검 등)는 다시 던진다
        if (isGlobalError(error)) throw error;
        return (
          <ErrorFallback
            error={error}
            onRetry={resetErrorBoundary} // 클릭 시 reset → API 재호출
          />
        );
      }}
    >
      {children}
    </ErrorBoundary>
  );
}
```

### 아키텍처 — 인터셉터 축소 + 중첩 Error Boundary

전역 에러 핸들링 로직을 인터셉터에서 걷어내고, 네트워크 에러에 대한 약간의 지연 처리만 남긴 뒤 나머지는 Error Boundary로 위임한다. 그리고 책임을 둘로 나눈다.

- **API Error Boundary**: 비동기 API 통신 중 발생하는 에러 전담.
- **Root Error Boundary**: 최상단에서 프론트엔드 런타임 에러 전담.

```tsx
<RootErrorBoundary>        {/* 런타임 에러 */}
  <App>
    <ApiErrorBoundary>     {/* API 에러 — 하위 트리부터 우선 적용 */}
      <SomePage />
    </ApiErrorBoundary>
  </App>
</RootErrorBoundary>
```

하위 트리부터 우선 적용되므로, 에러가 전역으로 번지지 않고 **컴포넌트 단위(일부 화면)로 격리**된다. 화면 한 귀퉁이에서 터진 에러로 전체 페이지가 날아가는 일을 막는다.

### Fallback과 에러 리셋

- `useQueryErrorResetBoundary`로 '다시 시도' 버튼을 제공하고, 클릭하면 `reset` → API 재호출.
- 라우트 이동 시 에러 화면이 그대로 남지 않도록 `location.key`를 `resetKeys`로 걸어 자동 리셋.
- 강제 업데이트·서비스 점검처럼 **전역으로 전파돼야 하는 에러**는 폴백 내부에서 판단 후 다시 `throw`해서 상위로 올려보낸다.

### 특이 케이스 — iOS Webview Network Error

iOS에서 페이지가 언로드(unload)될 때, 진행 중이던 API 호출이 끊기며 네트워크 에러가 잡히는 이슈가 있었다. 이걸 Error Boundary가 잡아 에러 페이지를 띄우면 안 된다 — 어차피 앱은 정상적으로 떠나는 중이니까.

그래서 인터셉터에서 네트워크 에러에 약 **200ms 지연**을 줘서, 에러 화면이 뜨기 전에 앱이 정상 언로드되도록 방어한다.

```ts
axios.interceptors.response.use(undefined, (error) => {
  if (isNetworkError(error)) {
    // iOS 언로드 도중 끊긴 요청이 에러 페이지를 띄우지 않도록 지연
    return new Promise((_, reject) => {
      setTimeout(() => reject(error), 200);
    });
  }
  return Promise.reject(error);
});
```

## 정리

두 시스템이 결합될 때 효과가 난다.

- **비즈니스 로직에만 집중**: 컴포넌트를 짤 때 에러 처리를 신경 쓰지 않아도 된다. 그건 Error Boundary가 대행한다.
- **장애 대응 리소스 감소**: 실시간 Slack 알람과 정밀해진 Sentry 로그 덕에, 사용자 환경을 굳이 재연하지 않고도 빠르게 원인을 파악해 폴리필 추가 같은 조치를 취할 수 있다.

결국 핵심은 두 문장으로 압축된다. 수집 단계에선 **"검색·알람에 쓸 건 태그로, 다 쌓지 말고 유의미한 것만"**. 처리 단계에선 **"How가 아니라 What을, 전역이 아니라 컴포넌트 단위로 격리"**. Sentry의 정밀한 수집과 React의 선언적 처리가 만날 때 DX와 UX가 같이 올라간다.
