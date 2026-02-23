---
type: "content"
domain: "frontend"
category: "seo"
topic: "semantic"
updatedAt: "2026-02-08"

satisfaction:
  score: 100
  reason: "시맨틱 태그의 중요성을 인지하게 된 점"

keywords:
  - "semantic"
  - "html"
  - "accessibility"

relatedCategories:
  - "html"
  - "accessibility"
---

# SEO 시작하기

검색엔진최적화의 핵심은 검색엔진이 이해할 수 있도록 웹페이지를 구조화하는 것이다.  
이를 위해 시맨틱 태그를 사용해야 한다.  

## 시맨틱 태그란?

시맨틱 태그는 HTML5에서 도입된 태그로, 웹페이지의 구조를 의미론적으로 표현한다.  
예를 들어, `<header>` 태그는 웹페이지의 헤더를 의미하고, `<nav>` 태그는 웹페이지의 네비게이션을 의미한다.  

## 시맨틱 태그의 중요성

시맨틱 태그를 사용하면 검색엔진이 웹페이지의 구조를 이해하기 쉬워져, 검색엔진최적화에 도움이 된다.  
또한, 시맨틱 태그는 웹페이지의 접근성을 높여, 스크린 리더 사용자가 웹페이지의 구조를 이해하기 쉽게 도와준다.  

## 시맨틱 태그의 종류

- `<header>`: 웹페이지의 헤더를 의미한다.
- `<nav>`: 웹페이지의 네비게이션을 의미한다.
- `<main>`: 웹페이지의 메인 콘텐츠를 의미한다.
- `<article>`: 웹페이지의 아티클을 의미한다.
- `<section>`: 웹페이지의 섹션을 의미한다.
- `<aside>`: 웹페이지의 사이드바를 의미한다.
- `<footer>`: 웹페이지의 푸터를 의미한다.

사실 시맨틱 태그를 사용하지 않아도 웹페이지는 잘 동작한다.  
하지만 시맨틱 태그를 사용하면 검색엔진이 웹페이지의 구조를 이해하기 쉬워져, 검색엔진최적화에 도움이 된다.  
또한, 시맨틱 태그는 웹페이지의 접근성을 높여, 스크린 리더 사용자가 웹페이지의 구조를 이해하기 쉽게 도와준다.  
하지만 빠르게 개발하다보면, `<></>` 혹은 `<div></div>`로 도배하기 쉽다.  

그럼 메타데이터는 어떨까?

## 메타데이터

메타데이터는 웹페이지의 정보를 담고 있는 데이터이다.  
예를 들어, `<title>` 태그는 웹페이지의 제목을 의미하고, `<meta>` 태그는 웹페이지의 메타데이터를 의미한다.  

```ts
<meta name="description" content="웹페이지의 설명을 담고 있는 데이터" />
<meta name="keywords" content="웹페이지의 키워드를 담고 있는 데이터" />
<meta name="author" content="웹페이지의 작성자를 담고 있는 데이터" />
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
```

이러한 메타데이터들은 웹페이지의 정보를 검색엔진에 전달하여, 검색엔진최적화에 도움이 된다.  
또한, 메타데이터는 웹페이지의 접근성을 높여, 스크린 리더 사용자가 웹페이지의 구조를 이해하기 쉽게 도와준다.  

## 소셜 그래프

소셜 그래프는 웹페이지의 정보를 소셜 미디어에 공유할 때 사용되는 데이터이다.  
예를 들어, `<meta property="og:title" content="웹페이지의 제목을 의미한다." />` 태그는 웹페이지의 제목을 의미하고, `<meta property="og:description" content="웹페이지의 설명을 의미한다." />` 태그는 웹페이지의 설명을 의미한다.  

```ts
<meta property="og:title" content="웹페이지의 제목을 의미한다." />
<meta property="og:description" content="웹페이지의 설명을 의미한다." />
<meta property="og:image" content="웹페이지의 이미지를 의미한다." />
<meta property="og:url" content="웹페이지의 URL을 의미한다." />
<meta property="og:type" content="웹페이지의 타입을 의미한다." />
```

이러한 소셜 그래프들은 웹페이지의 정보를 소셜 미디어에 공유할 때 사용되며, 검색엔진최적화에 도움이 된다.  
또한, 소셜 그래프는 웹페이지의 접근성을 높여, 스크린 리더 사용자가 웹페이지의 구조를 이해하기 쉽게 도와준다.  

## 기술적 메타데이터

기술적 메타데이터는 웹페이지의 기술적인 정보를 담고 있는 데이터이다.  
예를 들어, `<meta name="viewport" content="width=device-width, initial-scale=1.0" />` 태그는 웹페이지의 뷰포트를 의미하고, `<meta name="theme-color" content="#ffffff" />` 태그는 웹페이지의 테마 색상을 의미한다.  

```ts
<meta name="viewport" content="width=device-width, initial-scale=1.0" />
<meta name="theme-color" content="#ffffff" />
```

이러한 기술적 메타데이터들은 웹페이지의 기술적인 정보를 검색엔진에 전달하여, 검색엔진최적화에 도움이 된다.  
또한, 기술적 메타데이터는 웹페이지의 접근성을 높여, 스크린 리더 사용자가 웹페이지의 구조를 이해하기 쉽게 도와준다.  

## JSON-LD

최근에 hubspot 생성 페이지를 탐색하던 중에 발견한게 JSON-LD이다.
메타 데이터와 더불어 더 많은 정보를 JSON 형식을 빌려 구조화할 수 있는 것 같다.  

```ts
<script type="application/ld+json">
{
  "@context": "https://schema.org",
  "@type": "Person",
  "name": "John Doe",
  "jobTitle": "Software Engineer",
  "worksFor": {
    "@type": "Organization",
    "name": "Google"
  }
}
</script>
```

최근까지 개발했던 TOOLS 역시, JSON-LD를 활용해 site:tools.midasuser.com을 검색해보면, 검색결과에 모든 페이지가 다 잡히는 걸 볼 수 있다.  
Google Search Console에서 색인은 되어있으나 검색결과가 나오지 않는다면, JSON-LD를 활용해 보는 것도 좋은 방법일 것 같다.  

도서관에 책은 입고 되었지만, 분류가 제대로 되어있지 않으면 원하는 책을 찾기 어려운 것 처럼, 웹페이지도 마찬가지인 것 같다. SEO와 더불어 GEO 생성형 에이전트들의 최적화까지 고려해야 한다.  
이제 GEO에 대해서도 학습이 필요할 것 같다.