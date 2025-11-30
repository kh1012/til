---
type: "skill"
domain: "frontend"
category: "build-infra"
topic: "bundler"
updatedAt: "2025-11-30"

keywords:
  - "ECMAScript"
  - "ES2015"
  - "module"
  - "bundler"
  - "webpack"
  - "babel"
  - "transpiler"

relatedCategories:
  - "typescript"
  - "nodejs"
---

# 모던 JavaScript 개발 환경

JavaScript의 역사(ES5 → ES2015)와 모던 프론트엔드 개발 환경을 정리한다.  
번들러(Webpack, Vite)와 트랜스파일러(Babel)의 역할, 그리고 모듈 시스템의 등장 배경을 이해한다.

## 프로그래밍의 4가지 역량

- 일관성
- 유연성
- 확장성
- 독립성

## 자바스크립트의 변천사

- 1995년, 최초로 나옴. (넷스케이프), Live Script
- 1997년, ECMA 표준단체에서 Javascript를 공식화
- 2009년, EcmaScript v5 (어도비의 Flash Player가 인기있던 시기, ActionScript)
  - 모든 브라우저가 호환되는 가장 안정적인 버젼 (Babel이 해당 버젼으로 트랜스파일링을해준다.)
- ECMAScript 6 (Modern JavaScript)
  - ES2015
  - ES2016
  - ...

프론트 엔지니어는 ECMA Script 6로 개발하고,
Babel이 가장 호환잘되는 버젼 (크로스 브라우져)인 v5로 트랜스파일링 해준다.
Typescript는 Javascript의 Superset

# 웹앱의 구성요소

- HTML (문서)
- Javascript
- CSS

Javascript를 런타임에서 실행하는 환경은 예전에는 브라우저.
nodejs가 나오고 난 후 부터는 브라우저가 아니여도 실행가능해짐.

- CSR
- SSR
- 앱의 성격에 따라 렌더링 방식을 결정

# Graphic?

- Canvas (그래픽 시스템을 표현하기 위한 도화지, 영역)
- 실제 작업은 모두 Javascript.

미디어, 앱워커, 어셈블러...

# 모던 Javascript와 개발환경 (ES2015)

## 급변한 프론트앤드 개발환경

- Nodejs, npm 등을 통한 프론트앤드 개발환경이 급변.
- 웹앱의 규모가 커지고 복잡해졌다.

## 모듈

- es2015에서부터 module spec이 생겨남. (import/export)
- js 파일 안에서 다른 js를 불러내질 못했었다.

## 브라우저 호환성

- export 하나를 예를 들어봐도, Edge는 모두 전멸 [caniuse?](https://caniuse.com)

## 번들러

- 여러개의 JS 파일을 가지고 하나의 파일로 만드는 방식
- HTML에서도 하나의 스크립트만 호출하면 끝.
- 대표적으로 Webpack.
- 필요없는 코드는 삭제 (예를 들어, 주석?)
- 이미지 최적화
- 난독화
- ...
- webpack, vite, parcel

## 트랜스 파일러

- 브라우저가 이해할 수 있는 언어는 javascript
- 내가 원하는 언어로 만들어서 javascript로 트랜스파일링하면,
- 내가 원하는 언어로 브라우저에서 실행할 수 있지 않을까?
- 과거형의 js와 현재의 js는 어찌보면, 다른 언어
- babel...
- 번들러가 하나의 파일로 뭉치는 작업을 진행하는 중에,
- 여러 버젼의 JS를 가장 호환이 잘되는 버젼으로 변환해주는 역할을 수행 (트랜스 파일링)
