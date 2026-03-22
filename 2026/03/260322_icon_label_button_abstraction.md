---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "IconLabelButton 추상화 — Button 래핑 패턴과 justify-between 레이아웃"
updatedAt: "2026-03-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react"
  - "component-composition"
  - "tailwind-css"
  - "design-system"
  - "button-abstraction"

relatedCategories:
  - "css"
  - "design-system"
  - "typescript"
---

# IconLabelButton 추상화 — Button 래핑 패턴과 justify-between 레이아웃

> 반복되는 아이콘+라벨 버튼 패턴을 추상화할 때, 기존 Button을 수정하지 않고 래핑하는 전략과 레이아웃 함정들.

## 배경

프로젝트 내 7곳 이상에서 `<Button>` 안에 `<span>icon</span> + <span>label</span>` 구조가 수동 반복되고 있었다. 아이콘과 라벨의 색상을 분리(icon: `text-muted-foreground`, label: `text-muted-foreground/80`)하려는 요구가 있었고, 이를 추상화할 방법을 결정해야 했다.

**선택지:**
- A) Button에 icon/label props 추가 → 64개 사용처 영향
- B) Button variant 확장 → variant의 의미적 순수성 훼손
- C) 별도 래핑 컴포넌트 → 기존 코드 0 변경

**C안(IconLabelButton)**을 채택. Button.tsx와 control-tokens.ts를 전혀 수정하지 않고 래핑.

## 핵심 내용

### 1. justify-between + div 래핑 = 가장 자연스러운 레이아웃

처음에는 `justify-start`로 icon, label, trailing을 flat하게 배치했지만 문제 발생:

```tsx
// 문제: 3개 자식에 justify-between 적용 시 label이 중앙으로 감
<Button className="justify-between">
  <span>{icon}</span>     // 좌측
  <span>{label}</span>    // 중앙 (의도하지 않음)
  <span>{trailing}</span> // 우측
</Button>
```

**해결: icon+label을 div로 묶기**

```tsx
<Button className="justify-between">
  <div className="flex gap-2 items-center min-w-0">
    <span>{icon}</span>
    <span className="truncate">{label}</span>
  </div>
  {trailing && <span className="shrink-0">{trailing}</span>}
</Button>
```

- trailing 있을 때: div(icon+label) 좌측, trailing 우측 끝
- trailing 없을 때: div만 존재 → `justify-between`이 `justify-start`와 동일하게 동작

### 2. `min-w-0`는 flex 내 truncate의 필수 동반자

flex 자식의 기본 `min-width: auto`는 내용물 크기 이하로 줄어들지 않게 한다. `truncate`(`overflow: hidden`)가 작동하려면 컨테이너가 줄어들 수 있어야 하므로 `min-w-0`가 필수:

```tsx
// min-w-0 없으면 긴 텍스트가 버튼을 넘침
<div className="flex min-w-0 gap-2 items-center">
  <span className="truncate">{label}</span>
</div>
```

### 3. tailwind-merge의 justify 충돌 해결

Button 기본 클래스에 `justify-center`가 있고, IconLabelButton에서 `justify-between`으로 덮어써야 한다. `tailwind-merge`는 같은 그룹의 클래스를 마지막 것으로 교체:

```tsx
// Button 내부
cn(
  "inline-flex items-center justify-center ...", // base
  VARIANT_STYLES[variant],
  SIZE_STYLES[size],
  SHAPE_STYLES[shape],
  className, // ← justify-between이 여기서 justify-center를 대체
)
```

검증 결과 `justify-between`이 `justify-center`를 정상적으로 덮어쓴다.

### 4. 기본 색상과 override 전략

```tsx
// IconLabelButton 기본값
<span className={cn("text-muted-foreground", iconContainerClassName)}>
<span className={cn("text-muted-foreground/80", labelContainerClassName)}>
```

- SidebarButton: 기본값 그대로 사용 (추가 지정 불필요)
- PlusMenuItem/PopoverMenu: `labelContainerClassName="text-foreground"` 로 override
- ContextSection 파일: `icon`에 직접 `text-brand` 클래스 적용

`cn()`(tailwind-merge) 덕분에 기본값과 override가 자연스럽게 병합된다.

### 5. 컴포넌트 API 설계 교훈

최종 Props:

```typescript
interface IconLabelButtonProps {
  icon?: ReactNode;           // 선택적 (PopoverMenu 대응)
  label: ReactNode;
  variant?: ButtonVariant;    // Button 토큰 그대로 위임
  size?: ButtonSize;
  shape?: ButtonShape;
  iconContainerClassName?: string;   // 기본: text-muted-foreground
  labelContainerClassName?: string;  // 기본: text-muted-foreground/80
  trailing?: ReactNode;             // 있으면 우측 끝 배치
  trailingContainerClassName?: string;
  gap?: string;                     // 기본: "gap-2"
}
```

- **className이 아닌 containerClassName**: icon/label/trailing 각각의 컨테이너를 독립 제어
- **gap을 props로**: FileTreeNode처럼 `gap-1.5`가 필요한 특수 케이스 대응
- **icon optional**: PopoverMenu에서 icon 없는 item 가능

## 정리

- **Button을 수정하지 않고 래핑**하는 것이 64개 사용처를 보호하면서 구조적 문제를 해결하는 최선의 방법이었다
- **justify-between + div 래핑**이 icon+label 좌측 / trailing 우측 배치의 가장 깔끔한 해법
- **min-w-0**를 빠뜨리면 truncate가 동작하지 않는 함정이 있다
- 추상화 컴포넌트의 **기본값**은 가장 빈번한 사용 패턴(SidebarButton)에 맞추고, 나머지는 override하는 전략이 효과적
