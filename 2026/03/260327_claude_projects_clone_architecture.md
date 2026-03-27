---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "Claude Projects 클론 — FSD 기반 설계부터 구현까지"
updatedAt: "2026-03-27"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "feature-sliced-design"
  - "repository-pattern"
  - "jotai"
  - "url-routing"
  - "localStorage"
  - "pdca"

relatedCategories:
  - "react"
  - "nextjs"
  - "typescript"
---

# Claude Projects 클론 — FSD 기반 설계부터 구현까지

> Next.js + FSD 아키텍처에서 Claude Projects 기능을 분석/설계/구현/검증까지 단일 세션에 완주한 과정 정리

## 배경

MAXYS AI 어시스턴트에 Claude의 Projects 기능(대화 그룹핑 + 프로젝트별 컨텍스트 주입)을 도입하기로 결정. 기존 코드베이스에 이미 Thread 시스템이 있었고, `project-selector`라는 별개 개념의 공학 프로젝트 기능이 존재하는 상태에서 네이밍 충돌 없이 새 기능을 끼워 넣어야 했다.

## 핵심 내용

### 1. 분석 → 설계 → 구현의 자연스러운 전환

- **UX 리서치 먼저**: Claude Projects의 실제 동작을 상세 분석 (CRUD, 사이드바, Knowledge, Instructions, RAG 전환 등)
- **기존 코드와의 충돌 분석**: `project-selector`가 Converter API 공학 프로젝트임을 확인 → `converter-project`로 리네이밍 결정
- **사용자 스크린샷 기반 레이아웃 확정**: 초기 설계와 실제 Claude UI의 차이를 스크린샷으로 잡아냄 (2컬럼 → 메인+사이드바)

### 2. Repository 패턴으로 Backend 확장성 확보

```
ProjectRepository (interface)
  ├─ LocalProjectRepository     ← 1차 (localStorage)
  └─ CompositeProjectRepository ← 추후 (Backend + Local)

createProjectRepository() 팩토리 한 곳만 수정하면 전환 완료
```

Thread 시스템의 기존 Composite 패턴을 그대로 답습. `clientModeAtom` 분기도 동일하게 설계.

### 3. URL을 Source of Truth로 전환 (routing-restructure)

Projects 기능의 선행 의존으로 라우팅 구조를 먼저 정리:

- **Before**: `/cowork` 단일 경로 + `currentThreadIdAtom`으로 상태 관리
- **After**: `/cowork/chat/[threadId]`, `/cowork/chat/new`, `/cowork/project/[id]`

핵심 결정: `threadCommandAtom`에서 네비게이션 커맨드(switch/new) 완전 제거 → `router.push` 전환. 데이터 커맨드(delete/rename)만 유지.

### 4. CSS 시맨틱 토큰으로 레이아웃 관리

```css
--project-main-max-w: 710px;
--project-sidebar-max-w: 440px;
--project-content-gap: var(--space-s);
```

Tailwind arbitrary value `[...]` 금지 규칙을 지키면서 프로젝트 전용 레이아웃 토큰을 `globals.css`에 정의. `max-w-(--project-main-max-w)` 형태로 사용.

### 5. 150줄 제한 대응 — 컴포넌트 분해 전략

ThreadSidePanel이 project 모드 추가로 283줄까지 비대해짐. 분해 전략:

| 컴포넌트 | 역할 | 줄 수 |
|---------|------|:----:|
| ThreadSidePanel | 셸 (expand/collapse, 모드 분기) | 113 |
| SidebarAllHeader | all 모드 헤더 (토글/새채팅/검색) | 60 |
| SidebarProjectView | project 모드 콘텐츠 | 76 |
| ProjectSection | 프로젝트 아이콘+목록 | 114 |

### 6. 글로벌 검색 모달 (Cmd+K)

인라인 검색(ThreadSearchInput)을 글로벌 검색 모달로 전환:

- `useSearchShortcut()` — Cmd+K/Ctrl+K 단축키 + 상태 관리
- `SearchDialog` — portal + backdrop-blur + AnimatePresence
- `SearchResultItem` — 프로젝트(FolderOpen) / 대화(MessageCircleMore) 구분
- 방향키 탐색 + Enter 선택 + Esc 닫기

**주의점**: 모달 내부 spacing에 fluid 토큰(`px-m`, `py-s`)을 쓰면 뷰포트에 따라 과도하게 커짐. 고정값(`px-4`, `py-3`)으로 컴팩트하게 유지.

### 7. Gap Analysis로 누락 잡기

Design 문서 vs 구현 코드를 gap-detector로 비교 → 95% Match Rate. 누락된 항목:
- ThreadSidePanel의 `sidebarViewAtom` 모드 분기 미구현
- 설계 문서의 CSS 변수명 오기 (`--space-sm` → `--space-s`)

Act 단계에서 수정 후 99%로 완료.

## 정리

- **FSD에서 새 도메인 추가 시**: entities에 독립 모듈 → features에 UI 기능 → widgets에 페이지 단위 조합. 이 순서가 가장 자연스러움
- **Repository 패턴의 가치**: localStorage → Backend 전환을 팩토리 함수 1곳 수정으로 처리할 수 있는 구조는 프론트엔드 선행 개발에 매우 유용
- **URL = source of truth**: atom 기반 네비게이션은 편하지만 브라우저 히스토리/공유/북마크가 불가능. 라우팅 전환은 빠를수록 좋음
- **150줄 제한**: 처음부터 분리하기보다, 비대해지면 자연스러운 분리 지점에서 추출하는 게 더 좋은 결과를 냄
- **모달 UI 패턴**: fluid spacing은 페이지 레이아웃에 적합하고, 모달/팝오버 같은 고정 크기 UI에는 고정 spacing이 더 적절
