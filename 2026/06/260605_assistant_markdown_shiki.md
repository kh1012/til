---
draft: true
type: "content"
domain: "frontend"
category: "markdown"
topic: "assistant 메시지 렌더링을 올바른 컴포넌트에 정리하고 shiki 하이라이팅·첨부 폴백 붙이기"
updatedAt: "2026-06-05"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "shiki"
  - "streamdown"
  - "markdown"
  - "css-layer"
  - "react"

relatedCategories:
  - "react"
  - "css"
---

# assistant 메시지 렌더링: 올바른 파일, shiki 하이라이팅, 첨부 폴백

> assistant가 실제로 쓰는 markdown 컴포넌트를 바로잡아 코드·표·수식을 갤러리급으로 정리하고 shiki 신택스 하이라이팅을 붙였으며, 첨부 칩이 비이미지와 깨진 파일을 폴백하도록 고쳤다.

## 배경

직전에 코드 복사 버튼, 리스트 간격, 수식 크기를 손봤는데 정작 그게 assistant가 쓰지 않는 미사용 파일(`shared/ui/markdown`)에 들어가 있었다. assistant는 `v2/markdown`을 렌더한다. 즉 그동안의 개선이 화면에는 반영되지 않고 있었다. 이걸 바로잡는 김에, 채팅 메시지 본문이 코드와 표와 수식을 제대로 보여주도록 렌더링 전체를 정리하는 작업으로 이어졌다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 메시지 본문 갤러리급 정리 + shiki 하이라이팅
  - 가장 먼저 잡은 건 "엉뚱한 파일" 문제다. 직전 작업이 미사용 `shared/ui/markdown`에 들어가 있어 화면에 안 보였다. `v2/markdown`에 다시 적용해 비로소 반영되게 했다.
  - 거대한 `!important` className 블롭을 `markdown.css`로 추출했다. `.assistant-prose`를 unlayered로 둬서 streamdown 유틸리티를 확실히 덮게 했다. 타입 스케일도 유동(text-step)에서 고정(text-sm/xs)으로 바꿨다.
  - shiki 신택스 하이라이팅을 붙였다. streamdown 2.5가 하이라이터를 내장하지 않고 `plugins.code`로 외부 주입을 요구해서, shiki 의존성과 함께 code-highlighter-plugin을 직접 만들었다. lazy 싱글톤으로 두고 언어는 on-demand로 로드하며 듀얼 테마를 지원하게 했다.
  - 듀얼 테마에 함정이 있었다. `defaultColor`를 `"light"`로 둬야 라이트 색이 `htmlStyle.color`로 들어가 라이트와 다크 양쪽에 적용된다. `false`로 두면 라이트가 무색으로 깨졌다.
  - 결과적으로 코드는 신택스에 shadcn 프레임과 복사 버튼(헤더 우측 절대배치로 고정)을, 표는 shadcn 테이블을, 수식은 1.7em 크기를 받았다.
- 첨부 칩 비이미지·깨진 이미지 폴백
  - 종래에는 파일 종류와 무관하게 항상 `img`로 렌더해서, pdf나 유효하지 않은 이미지가 깨진 `img`로 노출됐다.
  - 이미지는 썸네일(onError 시 폴백 전환)로, 비이미지(pdf/md)는 FileText 아이콘과 확장자 라벨로 갈랐다. object URL은 이미지일 때만 생성하도록 했다. 스토리에는 실제 SVG 썸네일과 pdf/md 폴백 3종 데모를 넣었다.

## 정리

오늘 후반부를 관통한 건 "보이는 것과 실제 코드의 어긋남"을 바로잡는 일이었다. 가장 인상적이었던 건 그동안의 markdown 손질이 assistant가 쓰지도 않는 파일에 차곡차곡 쌓여 있었다는 점이다. 어떤 컴포넌트가 실제로 렌더되는지부터 확인하지 않으면, 아무리 고쳐도 화면은 그대로다.

shiki는 streamdown이 하이라이터를 외부 주입으로 넘긴 구조라 플러그인을 직접 만들어야 했는데, 듀얼 테마의 `defaultColor` 함정처럼 라이브러리 기본값 하나가 라이트 테마 전체를 무색으로 만드는 미묘한 버그가 끼어 있었다. 첨부 칩도 결국 "img 태그는 이미지를 위한 것"이라는 당연한 전제를 빠뜨렸던 문제였고, 파일 타입에 따라 렌더를 갈라야 깨짐이 사라졌다. 사용자에게 보이는 표면일수록 무엇이 실제로 렌더되는지, 그리고 타입에 맞는 렌더인지를 먼저 확인해야 한다는 걸 다시 새긴 하루다.
