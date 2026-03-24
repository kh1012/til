---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "CSP blob: fetch 차단 우회 + Clean Architecture 컴포넌트 분리"
updatedAt: "2026-03-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "CSP"
  - "Content-Security-Policy"
  - "blob URL"
  - "FileReader"
  - "backdrop-filter"
  - "overflow-hidden"
  - "Clean Architecture"
  - "React"
  - "FSD"

relatedCategories:
  - "security"
  - "architecture"
  - "nextjs"
---

# CSP blob: fetch 차단 우회 + Clean Architecture 컴포넌트 분리

> Next.js CSP 환경에서 blob URL을 fetch할 수 없을 때 FileReader로 우회하는 패턴과, 단일 컴포넌트를 용도별 래퍼로 분리하는 Clean Architecture 패턴 정리.

## 배경

MAXYS 프론트엔드에서 파일 첨부 카드를 MessageInput(입력)과 MessageItem(표시) 양쪽에서 통일된 디자인으로 렌더링해야 했다. 구현 과정에서 두 가지 기술적 문제를 만났다:

1. MD/PDF 파일의 텍스트/이미지 프리뷰를 생성하기 위해 blob URL을 fetch하려 했으나 CSP가 차단
2. 하나의 FileCard 컴포넌트가 표시용(클릭 프리뷰)과 입력용(삭제 버튼) 두 역할을 담당하면서 책임이 비대해짐

## 핵심 내용

### 1. CSP blob: fetch 차단 우회

Next.js의 기본 CSP 설정에서 `connect-src`에 `blob:`이 포함되지 않으면, `fetch("blob:http://...")` 호출이 차단된다.

```
connect-src 'self' http://localhost:* ws://localhost:*
```

이 상태에서 `useFilePreview` 훅이 blob URL로 텍스트를 읽으려 하면:

```
Refused to connect to 'blob:http://localhost:3000/...'
because it violates the Content Security Policy directive: "connect-src ..."
```

**해결: FileReader API로 우회**

blob URL을 fetch하는 대신, 원본 `File` 객체를 직접 `FileReader`로 읽는다. FileReader는 네트워크 요청이 아니므로 CSP 제약을 받지 않는다.

```typescript
// Before: CSP에 막힘
const res = await fetch(blobUrl);
const text = await res.text();

// After: CSP 우회
const reader = new FileReader();
reader.onload = () => {
  const text = reader.result as string;
  // 텍스트 처리
};
reader.readAsText(file);
```

PDF도 동일한 문제. `fetch(blobUrl)` 대신 `file.arrayBuffer()`로 직접 읽기:

```typescript
// Before
const res = await fetch(blobUrl);
const buf = await res.arrayBuffer();

// After
const buf = await file.arrayBuffer();
const pdfData = new Uint8Array(buf);
```

이를 위해 `useFilePreview` 훅에 optional `file` 파라미터를 추가하여, 원본 File 객체가 있으면 FileReader/arrayBuffer로 읽고, 없으면(MessageItem 등 서버 응답) 기존 URL fetch를 유지했다.

### 2. Clean Architecture 컴포넌트 분리

기존 `FileCard`가 프리뷰 렌더링 + 호버 인터랙션 + 클릭 모달을 모두 담당했는데, 입력용으로도 쓰려면 삭제 버튼 + 등장/퇴장 애니메이션이 추가로 필요했다.

**분리 전 (단일 컴포넌트)**:
```
FileCard = 프리뷰 렌더링 + 호버 + 클릭 + (삭제?) + (애니메이션?)
```

**분리 후 (Clean Architecture)**:
```
FileCardBase     ← 순수 렌더링 (프리뷰 이미지/텍스트 + 확장자 배지 + children 슬롯)
├── FileCard     ← 표시용 래퍼 (클릭 → 모달 프리뷰)
└── InputFileCard ← 입력용 래퍼 (삭제 버튼 + 등장/퇴장 애니메이션)
```

핵심 설계 포인트:

- **children 슬롯**: FileCardBase에 `children` prop을 두어 삭제 버튼 등 오버레이를 외부에서 주입
- **size prop**: `"sm" | "md"`로 입력용(80px) / 표시용(120px) 크기 제어
- **overflow-hidden 분리**: 카드 본체에 overflow-hidden을 적용하되, children(닫기 버튼)은 바깥 래퍼에 배치하여 카드 밖으로 나갈 수 있게 함

```tsx
// FileCardBase 구조
<div className="relative">              {/* 외부 래퍼 - overflow 없음 */}
  <div className="overflow-hidden ..."> {/* 카드 본체 - 프리뷰 clipping */}
    {프리뷰 콘텐츠}
    {확장자 배지}
  </div>
  {children}                            {/* 닫기 버튼 - 잘리지 않음 */}
</div>
```

FSD(Feature-Sliced Design) 레이어 규칙도 준수:
- `FileCardBase`, `FileCard`, `InputFileCard` → `entities/message/ui/` (공유)
- `FileAttachmentChips`, `FileChipItem` → `features/send-message/ui/` (입력 전용)
- 의존 방향: features → entities (정방향만)

### overflow-hidden과 backdrop-filter 충돌

분리 과정에서 발견한 CSS 이슈: `overflow-hidden`이 적용된 요소 안에서 `backdrop-blur`가 동작하지 않는 경우가 있다. Chrome에서 `overflow-hidden`이 새로운 stacking context를 생성하면서 `backdrop-filter`가 형제 요소의 콘텐츠를 투과하지 못하는 현상.

해결: backdrop-blur가 필요한 요소를 overflow-hidden 컨테이너와 같은 레벨에 배치하거나, overflow-hidden 안에 직접 넣되 블러할 콘텐츠와 직접 형제 관계를 만들어야 한다.

## 정리

- CSP가 blob URL fetch를 차단할 때는 **FileReader API**가 확실한 우회 수단. 네트워크 요청이 아니므로 connect-src 제약을 받지 않는다.
- 하나의 컴포넌트가 2가지 이상의 용도로 쓰일 때, **순수 렌더링(Base) + 용도별 래퍼** 패턴이 깔끔하다. children 슬롯으로 유연성을 확보하면서 각 래퍼는 자기 역할만 담당.
- `overflow-hidden`은 `backdrop-filter`와 충돌할 수 있으므로, 블러가 필요한 UI에서는 overflow clipping 구조를 신중하게 설계해야 한다.
