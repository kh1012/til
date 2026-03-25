---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "채팅 UI용 가상화 라이브러리 기술선정 — react-virtuoso vs 대안 비교"
updatedAt: "2026-03-25"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react-virtuoso"
  - "tanstack-virtual"
  - "virtua"
  - "virtualization"
  - "reverse-scroll"
  - "chat-ui"
  - "adr"

relatedCategories:
  - "performance"
  - "architecture"
---

# 채팅 UI 가상화 라이브러리 기술선정 근거

> npm DL수 1위가 최적의 선택은 아니다 — 도메인 요구사항이 라이브러리 선정의 핵심 기준이다.

## 배경

메시지 리스트에 react-virtuoso를 사용 중인데, @tanstack/react-virtual의 npm 주간 다운로드가 9.4M으로 react-virtuoso(2.0M)의 4.7배였다. "더 인기 있는 라이브러리가 더 나은 게 아닌가?"라는 의문에서 기술선정 근거를 수립하게 되었다.

## 핵심 내용

### 채팅 UI의 3대 고유 요구사항

일반 리스트와 달리 채팅 메시지 리스트는 이 세 가지가 **동시에** 필요하다:

1. **역방향 스크롤 (Reverse)**: 새 메시지가 하단에 추가
2. **동적 높이 (Variable Height)**: 메시지 길이/코드 블록에 따라 높이 가변
3. **자동 스크롤 (Follow Output)**: AI 스트리밍 응답 중 하단 자동 추적

### 5개 라이브러리 비교 결과

| 라이브러리 | npm DL | 번들 | 역방향 | 동적 높이 | 자동스크롤 | React 19 | 유지보수 |
|-----------|--------|------|:---:|:---:|:---:|:---:|:---:|
| react-virtuoso | 2.0M | 16-20KB | 내장 | 내장 | 내장 | O | 활발 |
| @tanstack/react-virtual | 9.4M | 2-3KB | 직접 구현 | 지원 | 직접 구현 | O | 활발 |
| virtua | 213K | 3KB | 내장 | 내장 | 내장 | O | 활발 |
| react-window | 5.1M | 2KB | X | 제한적 | X | X | 중단 |
| react-virtualized | 1.5M | 34KB | X | 복잡 | X | X | 중단 |

### @tanstack/react-virtual이 DL수 1위인 이유

테이블/그리드/일반 리스트 용도로 채택이 많다. Headless 철학이 범용성에서 유리하지만, **역방향 스크롤 + 동적 높이 조합**에서 스크롤 점핑/깜빡임 이슈가 다수 보고되어 채팅 UI에는 부적합하다.

### 결론: react-virtuoso 유지

```tsx
// react-virtuoso에서는 prop 하나로 해결되는 것들
<Virtuoso
  followOutput="smooth"    // 자동스크롤
  itemSize={(el) => el.getBoundingClientRect().height}  // 동적 높이
  atBottomStateChange={handler}  // 하단 감지
/>
```

이 기능 조합을 @tanstack/react-virtual에서 직접 구현하면 200+ 줄의 커스텀 코드가 필요하고, 엣지 케이스 처리 부담이 크다.

### 유일한 현실적 대안: virtua

- 번들 3KB로 5-7배 경량
- 역방향 스크롤 + 동적 높이 내장
- 단, `followOutput` 상당 기능이 없어 스트리밍 자동스크롤은 직접 구현 필요
- 커뮤니티가 작아 프로덕션 채팅 앱 검증 사례 부족

## 정리

npm 다운로드 수는 **범용적 인기**를 반영하지, **특정 도메인 적합도**를 보장하지 않는다. 기술선정은 "가장 인기 있는 것"이 아니라 "우리 요구사항에 가장 적합한 것"을 기준으로 해야 한다. 이번 분석을 ADR(Architecture Decision Record)로 문서화하여 향후 "왜 이걸 쓰는가?"에 대한 답을 남겨두었다.
