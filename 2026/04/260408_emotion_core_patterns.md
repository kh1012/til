---
draft: true
type: "content"
domain: "frontend"
category: "css-in-js"
topic: "Emotion 핵심 패턴 4가지 — styled, props 조건부, css 헬퍼, GlobalPortal 모달"
updatedAt: "2026-04-08"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "emotion"
  - "styled-components"
  - "css-in-js"
  - "css prop"
  - "react portal"

relatedCategories:
  - "react"
  - "typescript"
---

# Emotion 핵심 패턴 4가지

> styled, props 조건부 스타일, css 헬퍼 조합, GlobalPortal 모달까지 — Emotion을 실무에서 바로 쓸 수 있는 4가지 패턴 정리.

## 배경

toss-setup 보일러플레이트 기반 과제에서 Emotion을 처음 사용하게 되어, 핵심 패턴을 하나씩 직접 구현하며 익혔다.

## 핵심 내용

### 1. styled component 기본

`styled.태그` 함수로 스타일이 적용된 React 컴포넌트를 만든다.

```tsx
import styled from '@emotion/styled';

const Button = styled.button`
  background-color: blue;
  color: white;
  padding: 8px 16px;
  border: none;
  cursor: pointer;

  &:hover {
    background-color: black;
  }

  // 인접한 같은 컴포넌트 사이 간격
  & + & {
    margin-left: 4px;
  }
`;
```

- `&`는 자기 자신을 가리킨다 (SCSS와 동일)
- `&:hover`, `&:active`, `& + &` 등 pseudo-class와 선택자 조합 가능
- `box-shadow`는 `x y blur rgba(0,0,0,0.1)` 순서, `rgba`로 농도 조절

### 2. props 기반 조건부 스타일

styled 컴포넌트에 제네릭으로 props 타입을 넘기고, 템플릿 리터럴 안에서 함수로 접근한다.

```tsx
type Variant = 'primary' | 'danger';

interface StyledButtonProps {
  variant?: Variant;
}

// 값이 여러 개면 객체 lookup이 삼항보다 깔끔
const colors: Record<Variant, { bg: string; hover: string }> = {
  primary: { bg: 'blue', hover: 'green' },
  danger: { bg: 'red', hover: 'pink' },
};

const Button = styled.button<StyledButtonProps>`
  background-color: ${({ variant = 'primary' }) => colors[variant].bg};

  &:hover {
    background-color: ${({ variant = 'primary' }) => colors[variant].hover};
  }
`;
```

- `styled.button<Props>`로 제네릭 지정 → TypeScript가 props 타입 체크
- optional prop은 구조분해에서 기본값 지정: `({ variant = 'primary' })`
- `disabled`는 `<button>`의 표준 속성이라 별도 interface에 넣을 필요 없음, `&:disabled`로 스타일링

### 3. css 헬퍼로 스타일 조합

`css()` 함수로 스타일 조각을 만들어 재사용하거나 조건부로 조합한다.

```tsx
import { css } from '@emotion/react';

// 스타일 조각 정의
const rounded = css`
  border-radius: 8px;
`;

const shadow = css`
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
`;

// styled 안에서 합치기
const Card = styled.div`
  ${rounded}
  ${shadow}
  padding: 16px;
`;

// css prop에 배열 + && 패턴으로 조건부 적용
<div css={[basicStyle, rounded, isActive && activeStyle]} />
```

- `styled`는 컴포넌트를 만들고, `css`는 스타일만 만든다
- 배열에서 `false`/`undefined`는 자동 무시됨
- `transition`은 기본 스타일에, 변경값은 조건부 스타일에 분리해야 on/off 양쪽 다 부드럽게 전환됨

### 4. GlobalPortal.Consumer 모달

Portal은 DOM 트리 최상위에 렌더링하여 부모의 `overflow`나 `z-index`에 갇히지 않게 한다.

```tsx
import { GlobalPortal } from 'GlobalPortal';

// Overlay 클릭 → 닫힘, ModalBox 내부 클릭 → 전파 차단
{isOpen && (
  <GlobalPortal.Consumer>
    <Overlay onClick={handleClose}>
      <ModalBox onClick={(e) => e.stopPropagation()}>
        <Title>제목</Title>
        <ButtonGroup>
          <Button variant="confirm" onClick={handleConfirm}>확인</Button>
          <Button variant="cancel" onClick={handleClose}>취소</Button>
        </ButtonGroup>
      </ModalBox>
    </Overlay>
  </GlobalPortal.Consumer>
)}
```

- `position: fixed` + `inset: 0`으로 전체 화면 Overlay
- `e.stopPropagation()`으로 모달 내부 클릭이 Overlay까지 전파되지 않도록

## 기타 학습

### WebStorm + Emotion 한계

- WebStorm이 styled 컴포넌트의 커스텀 props 누락을 정적 감지 못함 → `tsc --noEmit --watch`를 터미널에 띄워두는 습관 필요
- CSS 구문 강조: **Styled Components & Styled JSX** 플러그인 설치로 해결
- `$variant` (transient props) — DOM에 전달하지 않을 props에 `$` 접두사. emotion에서 동작하나 WebStorm 경고는 안 사라짐

### `--noEmit` 플래그

Vite가 빌드를 담당하므로 tsc는 `.js` 파일 생성 없이 타입 체크만 수행. Vite = 빌드, tsc = 타입 검사 전용으로 역할 분리.

### as const 배열에서 타입 추출

```tsx
const tabs = [
  { label: "기본", component: Basic },
  { label: "props", component: PropsButtons },
] as const;

// label 유니온 타입: "기본" | "props"
type TabLabel = (typeof tabs)[number]['label'];
```

## 정리

- `styled`는 컴포넌트, `css`는 스타일 조각 — 용도가 다르다
- props 조건부는 2개면 삼항, 3개 이상이면 객체 lookup
- 조건부 스타일 조합은 `css prop` 배열 + `&&` 패턴
- Portal 모달은 Overlay + stopPropagation이 핵심
- IDE만 믿지 말고 `tsc --noEmit --watch` 습관 들이기
