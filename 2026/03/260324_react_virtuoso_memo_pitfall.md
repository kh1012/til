---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "React Virtuoso + memo + 디바운싱 최적화 시 주의점"
updatedAt: "2026-03-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "react-virtuoso"
  - "React.memo"
  - "streaming"
  - "debounce"
  - "requestAnimationFrame"
  - "itemContent"
  - "useCallback"

relatedCategories:
  - "performance"
  - "nextjs"
  - "ai-sdk"
---

# React Virtuoso에서 스트리밍 최적화 시 itemContent 안정화하면 안 되는 이유

> Virtuoso의 itemContent를 useCallback([])로 안정화하면 스트리밍 업데이트가 차단된다. 디바운싱은 Virtuoso 바깥, 개별 아이템 내부에서만 해야 한다.

## 배경

AI 채팅 앱에서 스트리밍 응답의 프레임 드랍을 방지하기 위해 렌더링 파이프라인을 최적화했다. react-virtuoso + Vercel AI SDK v6 + react-markdown 조합에서 3가지 최적화를 시도했고, 그 중 2가지가 스트리밍을 깨뜨렸다.

## 핵심 내용

### 성공한 최적화 (안전)

| 기법 | 적용 위치 | 효과 |
|------|----------|------|
| `React.memo` + 커스텀 areEqual | MessageBubble, CodeBlock | 과거 메시지 리렌더 차단 |
| atom 읽기 서브컴포넌트 분리 | ArtifactSlot | atom 변경이 memo를 우회하는 경로 제거 |
| useMarkdownComponents ref 패턴 | deps 7개 → 2개 | 컴포넌트 맵 재생성 방지 |

### 실패한 최적화 (위험)

**1. itemContent를 useCallback([])로 안정화 + ref 패턴**

```typescript
// 위험: Virtuoso가 아이템 업데이트를 감지하지 못함
const ref = useRef(data);
useEffect(() => { ref.current = data; });
const itemContent = useCallback((index) => {
  const d = ref.current; // 최신 데이터는 있지만...
  return <MessageItem message={d.timelineItems[index].message} />;
}, []); // Virtuoso는 이 함수가 안 바뀌었으므로 기존 아이템을 재호출하지 않음
```

Virtuoso는 `itemContent` 함수 참조가 바뀌어야 visible 아이템을 재호출한다. 안정 참조 → 스트리밍 중 텍스트가 뚝뚝 끊기고 마지막 메시지가 표시되지 않음.

**2. useDebouncedText에서 setTimeout(0)으로 최종 텍스트 반영**

```typescript
// 위험: React batch와 타이밍 불일치
if (!isStreaming) {
  setTimeout(() => setDebouncedText(text), 0); // 마지막 텍스트가 한 프레임 늦게 반영
}
```

스트리밍 종료 시 `isStreaming=false`가 되면서 `setTimeout(0)`이 발동하지만, React의 batch 렌더 사이클과 맞지 않아 마지막 메시지가 안 보이다가 다른 인터랙션에서 리렌더될 때 보이는 현상 발생.

### 안전한 디바운싱: DebouncedMarkdown (rAF 기반)

```typescript
// 안전: Virtuoso와 완전 독립, 개별 아이템 내부에서만 디바운싱
const DebouncedMarkdown = memo(function DebouncedMarkdown({ children: text, ...props }) {
  const [rendered, setRendered] = useState(text);
  const rafRef = useRef(0);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(() => setRendered(text));
    return () => cancelAnimationFrame(rafRef.current);
  }, [text]);

  return <Markdown {...props}>{rendered}</Markdown>;
});
```

핵심 원칙:
- Virtuoso의 `itemContent`, `MessageItem`, `MessageBubble`은 건드리지 않음
- 각 text part가 독립 `DebouncedMarkdown` 인스턴스 → 멀티 part 간 간섭 없음
- `text` prop이 바뀌면 다음 rAF에서 반드시 반영 → 마지막 텍스트 누락 없음
- 롤백: `<DebouncedMarkdown>` → `<Markdown>` 교체 (1줄)

### 레이어별 최적화 전략 요약

```
Virtuoso         ← 절대 건드리지 않음. itemContent는 deps 있는 useCallback 유지
  MessageItem    ← React.memo (과거 메시지 스킵)
    MessageBubble ← React.memo + areEqual (parts 참조 비교)
      Markdown    ← DebouncedMarkdown으로 교체 (rAF 디바운싱)
        CodeBlock ← React.memo (codeString 비교)
```

## 정리

- **Virtuoso의 itemContent 함수 참조를 안정화하면 안 된다.** 이것이 가장 중요한 교훈. Virtuoso는 함수 참조 변경으로 아이템 업데이트를 감지한다.
- 성능 최적화는 **가장 안쪽 레이어부터** 적용해야 안전하다. 바깥 레이어(Virtuoso)를 건드리면 프레임워크 동작을 망가뜨릴 위험이 크다.
- `setTimeout(0)`은 React 상태 업데이트의 타이밍을 보장하지 않는다. `requestAnimationFrame`이 브라우저 렌더 사이클에 더 안전하게 맞는다.
- 최적화 적용 후 반드시 **실제 스트리밍으로 검증**해야 한다. 정적 테스트로는 타이밍 버그를 잡을 수 없다.
