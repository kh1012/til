---
type: "skill"
domain: "frontend"
category: "javascript"
topic: "handlebars-template"
updatedAt: "2025-11-30"

keywords:
  - "handlebars"
  - "template-engine"
  - "innerHTML"
  - "regex"
  - "naming-convention"

relatedCategories:
  - "html"
---

# 서론

template을 통한 innerHtml을 주입할 때 사용하는 handleBars와 \*.template.ts 템플릿 컨벤션, 그리고 RegEx에 대해 간단히 기술해보고자 한다.

# HandleBars

핸들바스는 쉽게 말해, 템플릿 엔진이다.  
HTML 같은 문서 안에서 변수나 로직을 간단히 끼워넣을 수 있는 도구  
보통 template 문자열을 만들고, 마스킹을 통해 치환하는 걸 더 간단하게 처리해주는 도구라고 보면될까

```hbs
<h1>{{title}}</h1>
<p>{{description}}</p>
```

위 예시에서 title과 description은 변수로 취급.  
회원가입 폼을 클론코딩 2회 정도 실행하면, 사용법 정도는 이해가 될듯.

# \*.template.ts

네이밍 컨벤션, 보통 jest, mocha와 같은 테스팅 라이브러리에서 _.test.ts, _.spec.ts 등과 같이 쓰이는 것과 같음.  
template의 경우 동적으로 생성될 파일의 원형을 의미함.  
파일에 대한 네이밍 컨벤션을 통해 디렉토리 내에서 해당 파일을 필터링 하거나 쉽게 분류 할 수 있게됨.  
ts에서 보자면, \*.d.ts이지 않을까?

# RegEx 정규식

아 이건 이야기가 너무 많아서, 별도 챕터로 가져가야함.
패스트캠퍼스 내에 나와있던 Regex 관련 PPT 보고 별도로 정리 필요.
https://www.slideshare.net/slideshow/ss-39274621/39274621
