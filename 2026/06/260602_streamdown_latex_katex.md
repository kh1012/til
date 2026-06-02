---
draft: true
type: "content"
domain: "frontend"
category: "markdown"
topic: "Streamdown 스트리밍 마크다운에 LaTeX 수식(KaTeX) 렌더링 붙이기"
updatedAt: "2026-06-02"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "streamdown"
  - "katex"
  - "remark-math"
  - "latex"
  - "streaming"

relatedCategories:
  - "react"
  - "markdown"
---

# Streamdown 스트리밍 마크다운에 LaTeX 수식 렌더링 붙이기

> 스트리밍으로 들어오는 AI 응답의 LaTeX 수식을 KaTeX로 렌더링하되, 미완성 토큰과 MathJax 표기 차이를 함께 처리했다.

## 배경

AI 어시스턴트 응답은 토큰이 스트리밍으로 흘러들어온다. 그 안에 LaTeX 수식이 섞여 있으면, 완성된 마크다운이 아니라 "아직 닫히지 않은 `$$`" 같은 미완성 상태를 매 프레임 렌더해야 한다. 일반 마크다운 렌더러로는 스트리밍 도중 수식이 들썩이거나 원문이 그대로 노출된다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- LaTeX 수식(KaTeX) 스트리밍 렌더링 추가
  - 직접 remark-math를 주입하는 방식은 스트리밍 중 미완성 `$$` 파싱이 깨졌다. 그래서 Streamdown 공식 `@streamdown/math` 플러그인을 채택했다. 이 플러그인은 Streamdown의 incomplete-markdown 파싱과 통합되어, 닫히지 않은 수식 토큰도 들썩임 없이 처리한다.
  - 인라인 `$...$`만 수식으로 볼지, 블록 `$$...$$`도 볼지 정해야 했다. `singleDollarTextMath: true`로 인라인과 블록 둘 다 인식하게 했다.
  - 후속으로 깨짐이 하나 발견됐다. 많은 LLM이 수식을 MathJax 관례인 `\[ ... \]`(블록), `\( ... \)`(인라인)로 출력하는데, remark-math는 dollar 표기만 인식해서 그 표기가 원문 그대로 노출됐다. `normalizeMathDelimiters`로 `\[`를 `$$`, `\(`를 `$`로 정규화했다. 단 코드 펜스와 인라인 코드 안의 `\[` 등은 split으로 보호해 건드리지 않게 했다.
  - 검증은 브라우저 자동화 도구가 없어서, Streamdown을 SSR로 돌려 생성된 KaTeX DOM 트리를 직접 확인하는 방식으로 했다.
  - 부수로 README의 Port Policy에 빠져 있던 modeler-arch(9213), Storybook(6006) 포트만 보강했다. 사내 원격 IP는 공개 문서라 제외했다.

## 정리

스트리밍 환경의 마크다운 수식은 "완성된 문서를 한 번 렌더"하는 것과 근본이 다르다. 매 프레임이 미완성 상태이기 때문에, 렌더러 자체가 incomplete 토큰을 graceful하게 다뤄야 한다. 직접 remark 플러그인을 끼우는 대신 스트리밍을 아는 공식 플러그인을 쓴 게 핵심 결정이었다.

또 하나 배운 것은 입력 표기의 다양성이다. 같은 수식도 dollar 표기와 MathJax 표기가 공존하는데, 파서가 한쪽만 알면 나머지는 원문 노출로 샌다. 정규화 레이어를 앞단에 두되 코드 블록은 보호하는 식으로, 표기 변환과 코드 보존을 동시에 만족시켜야 했다.
