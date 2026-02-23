---
type: "content"
domain: "frontend"
category: "javascript"
topic: "ssr-optimization"
updatedAt: "2026-02-23"

satisfaction:
  score: 100
  reason: "서버 사이드에 대한 기본개념을 이해하고, 최적화 기법에 대해 공부!"

keywords:
  - "optimization"
  - "DOM"

relatedCategories:
  - "javascript"
  - "typescript"
  - "react"
---

# SSR 최적화

SSR 최적화 기법들에 대해, 필요할 때 인지하기 위해 정리를 해봤다.

![FE_Architecture](https://raw.githubusercontent.com/kh1012/til/main/assets/260223_SSR_optimization.png)

대 AI시대에 결국, 정리만이 살길이다.  
개발자의 구현 능력은 쓸모가 다할지 모르지만,  
경험과 지식 그리고 실무에서 필요할 때, 문제를 즉시 해결할 수 있는 방안을 떠올리는 것 만으로도 아주아주 빠르게 적용할 수 있을 것 같다.  
결국 프롬프트 엔지니어링도 알고 있는 지식이 많아야 잘 쓸 수 있다.  
나중에 이 또한 대체될지도?  

다시 본론으로 들어가서, 위 내용은 1차로 내가 정리한 내용이다.  
SSR 최적화를 위한 기법은 총 4가지 정도 된다.  
그 중 Partial Prerendering은 아직 Stable하지 않다.  
[next-partial-prerendering github](https://github.com/vercel-labs/next-partial-prerendering) 명시 해둔 것 처럼, 아직은 실험적 기능이다.  
안타깝게도 엣지 케이스, 호환성, 인프라 등이 아직 완벽하지 않아서 아직은 사용을 권장하지 않는다고 한다.  
그래도 Streaming SSR의 요청타임에 생성하는 HTML을 빌드타임으로 끌어올려 한층 더 TTFB를 줄일 수 있다는 점은 아주아주 매력적이다.  

## 최적화 기법들

SSR 최적화를 위한 기법은 총 4가지 정도 된다.
1) Streaming SSR
2) React Server Components (RSC)
3) Partial Prerendering (PPR)
4) Incremental Static Regeneration (ISR)  

물론, Static Site Generation (SSG)도 있다.  
하지만 이건 기법이라기 보다, 정적 페이지를 한번에 내려 준다는 개념이기 때문에, 제외했다.  
그리고 실시간으로 서버 컴포넌트를 계속해서 만들어내는 `force-dynamic`도 있다.  

각각의 기법들은 갱신 주기에 의해 적절한 선택을 해야 한다.  
무조건적인 기법은 존재하지 않으며, 상황에 맞게 처리해줘야만 최적의 사용성을 보장할 수 있게 된다.  

### Streaming SSR

`@react-dom/server`의 `renderToPipeableStream`을 사용하여, 
`suspense`로 격리된 부분은 동적으로 생성하고 그 외 영역은 정적으로 생성하여 사용자 요청에 HTML 생성을 시작한다.  
이렇게 하면 사용자 요청에 HTML 생성을 시작할 수 있게 되어 TTFB를 줄일 수 있다.

```ts
import { renderToPipeableStream } from "@react-dom/server";

const { pipe } = renderToPipeableStream(
    <App {...pageProps} />,
    {
        onShellReady() {
            response.statusCode = 200;
            pipe(res);
        },
    }
);
```

### React Server Components (RSC)

서버 컴포넌트만을 구성하여, 클라이언트의 JS 번들 사이즈를 줄일 수 있게 된다.  
`tanstack-query`의 queryClient를 지역적으로 생성하여, prefetch 이중전략 또한 사용할 수 있다.  
이러면 초기 FCP를 줄일 수 있게 된다.  

### Partial Prerendering (PPR)

Nextjs 14+부터 실험적으로 제공되는 있는 기능으로, 정적인 부분과 동적인 부분을 분리한다는 개념은 Streaming SSR과 비슷하나,  
Streaming SSR은 사용자 요청 타임에 HTML을 서버에서 생성하는 반면,  
PPR은 정적인 부분은 빌드타임에 생성하여, 동적인 부분은 사용자 요청 타임에 생성하는 개념이다.  
따라서 Streaming SSR보다 TTFB가 빠르지만, 아직 엣지케이스나 호환성 문제가 있어 공식적으로도 vercel이 권장하지 않는다고 한다.  

### Incremental Static Regeneration (ISR)

조금 혼란스러웠던 개념이었는데, `tanstack-query`의 staleTime을 사용하거나, pulling하는 방식과 근본적으로 어떤 차이가 있을까?  
라는 의문이 먼저 들었던 기법 이었다.  
하지만 근본적으로... 질문이 잘못되었다.  
ISR은 서버 사이드에서 정적으로 revalidate하며 생성되는 개념이고, pulling은 클라이언트 사이드에서 리렌더링이 발생하는 개념이다.  
따라서, 100명의 사용자가 있다 가정해보면,  
ISR은 100명의 사용자가 동시에 요청을 보내더라도, 특정 주기 당 딱 한 번 모든 사용자가 동일한 페이지를 내려 받는다.  
반면 pulling은 100명의 사용자가 동시에 요청을 보낸다면, 각 사용자가 자신의 페이지를 내려 받는다.
결국 API 서버의 부하는 1 : 100이 된다.  
동시접속자가 많을수록, 그 부하는 선형적으로 증가하게 된다.  

## 무엇을 써야 하는가?

쉽게 말해, 데이터가 얼마나 빈번하게 변경되는가에 따라 결정을 할 수 있다.  
데이터가 변하지 않는다. `SSG`  
데이터가 분/시 단위로 변해도 된다. `ISR`  
데이터가 매초 마다 급변한다. `force-dynamic + RSC` || `PPR` || `Streaming SSR`
단 여기서 force-dynamic은 개인화된 개별 데이터가 필요한 경우에만 사용한다.  
Nextjs의 서버에도 부하를 줄 수 있다.  

사실 취사 선택으로 보이고, 결국 정확한 선택은 데이터를 기반으로 해야한다.  
모니터링 장치를 통해 데이터를 수집하고, 그 데이터를 기반으로 어떤 기법이 가장 효율적인지를 정량적으로 결론을 지을 수 있을 것 같다.  