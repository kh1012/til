---
draft: true
type: "content"
domain: "frontend"
category: "development-process"
topic: "PDCA 전체 사이클로 PDF 뷰어 인터랙션 기능 개발"
updatedAt: "2026-03-28"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "pdca"
  - "plan-plus"
  - "gap-analysis"
  - "pdf.js"
  - "pdfjs-dist"
  - "interaction-panel"
  - "fsd"
  - "claude-code"

relatedCategories:
  - "react"
  - "nextjs"
  - "ai-workflow"
---

# PDCA 전체 사이클로 PDF 뷰어 인터랙션 기능 개발

> 아이디어 리서치부터 Plan Plus → Design(3안 비교) → Do(전체 구현) → Check(91%) → Iterate(100%) → Report → Commit까지 하루에 완주한 PDCA 실전 기록

## 배경

MAXYS AI 구조공학 어시스턴트에 "엔지니어가 일상적으로 사용하는 제너럴한 도구"를 AI와 결합하는 방향을 탐색했다. 8개 아이디어(계산 노트북, 캔버스, 데이터 시각화, 코드 샌드박스, PDF 리더, Generative UI, 파일 허브, 프레젠테이션) 중 **AI PDF 리더/어노테이터**를 선택하여 PDCA 전체 사이클을 돌렸다.

## 핵심 내용

### 1. Plan Plus — 브레인스토밍 기반 기획

`/plan-plus`로 일반 Plan 대비 강화된 기획 프로세스를 거쳤다.

- **Phase 1 (Intent Discovery)**: 4가지 핵심 문제 중 "기준서 탐색 시간"을 MVP로 선정
- **Phase 2 (Alternatives)**: PDF.js + RAG / 경량 텍스트 / 상용 SDK 3안 비교 → 클라이언트 컨텍스트 주입으로 결정
- **Phase 3 (YAGNI)**: 다중 PDF 탭, 주석, 데이터 추출, 백엔드 RAG를 Out of Scope로
- **Phase 4 (Incremental Validation)**: 아키텍처 → 컴포넌트 → 데이터 흐름 섹션별 승인

핵심 설계 원칙: **파일 선택 = 컨텍스트 로드** (패널 안 열림), **인터랙션 활성화 = 뷰어 표시** (명시적 유저 액션)

### 2. Design — 3가지 아키텍처 옵션

| Option | 파일 수 | 특징 |
|--------|---------|------|
| A: Minimal | ~8 | 빠르지만 150줄 위반 가능 |
| B: Clean Architecture | ~16 | FSD 완벽 준수, 확장성 최고 |
| C: Pragmatic | ~11 | 적절한 균형 |

**Option B 선택** → entity/feature/widget 완전 분리. 4개 세션 가이드 생성.

### 3. Do — 전체 스코프 구현 (1365 LOC)

구현 순서: Entity → File Selector → PDF Context → buildRequestBody + route.ts → PDF Viewer → Widget → Markdown Link → i18n

**기술 결정 포인트**:
- **pdfjs-dist v5**: `page.render()`에 `canvas` 프로퍼티 필수 (v4와 API 차이)
- **텍스트 추출**: Electron IPC 대신 프론트엔드 pdfjs-dist로 직접 추출 (의존성 최소화)
- **페이지 참조 링크**: `pdfpage://` 커스텀 URI → `quickaction://` 패턴 미러링
- **Atom 직접 접근**: PdfViewer가 props 대신 `pdfBinaryDataAtom` 직접 구독 (아키텍처 단순화)

### 4. Check — Gap Analysis 91% → 100%

첫 검증에서 91% (9개 Gap):

| Gap | 원인 |
|-----|------|
| i18n 7개 키 미등록 | 하드코딩 한국어 |
| PdfHighlightLayer stub | `return null` |
| PdfThumbnailSidebar stub | `return null` |
| 텍스트 레이어 없음 | Canvas만 렌더링 |
| 검색 없음 | PdfToolbar에서 누락 |
| 전체 페이지 렌더링 | 버퍼 렌더링 미적용 |
| use-pdf-text-extractor 없음 | 다른 파일에 흡수 |

**Iterate 수정 후 100% 달성**:
- `pdf-renderer.ts` 분리로 버퍼 렌더링 + 150줄 규칙 준수
- TextLayer 추가로 텍스트 선택/검색 지원
- 하이라이트 레이어: 텍스트 span 매칭 + accent 오버레이 + 4초 fade-out

### 5. 세션 관리 — 새 세션에서 이어하기

- `claude --resume "세션명"` 으로 특정 세션 재개 가능
- 하지만 **Do 단계는 새 세션 추천** — Design 문서에 모든 맥락이 있으므로 `/pdca do feature`만 실행하면 됨
- `--scope` 파라미터로 세션별 모듈 분할 구현 가능

## 정리

- **Plan Plus의 YAGNI Review가 스코프 폭발을 방지**했다. 처음에 4개 문제를 모두 해결하려 했지만, MVP를 "기준서 탐색"으로 좁히니 하루 만에 완주 가능했다.
- **Gap Analysis가 품질을 끌어올렸다**. 91%에서 만족할 수도 있었지만, 9개 Gap을 수정하니 텍스트 레이어/검색/하이라이트/버퍼 렌더링까지 갖춘 완성도 높은 뷰어가 되었다.
- **기존 패턴 미러링이 구현 속도의 핵심**. XlsxFileSelector, quickaction:// URI, InteractionPanel switch 등 기존 코드의 패턴을 그대로 복제하니 설계 고민 없이 바로 구현할 수 있었다.
- **pdfjs-dist v5는 v4와 API가 다르다**. `RenderParameters`에 `canvas` 필드가 필수가 되었고, `TextLayer`의 생성자도 변경됨. 버전 차이 주의.
