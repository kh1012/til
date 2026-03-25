---
draft: true
type: "content"
domain: "devops"
category: "mcp"
topic: "NotebookLM MCP로 코드베이스 문서 슬라이드 자동 생성"
updatedAt: "2026-03-25"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "notebooklm"
  - "mcp"
  - "slide-generation"
  - "documentation"
  - "claude-code"

relatedCategories:
  - "ai-tools"
  - "documentation"
---

# NotebookLM MCP로 코드베이스 문서 슬라이드 자동 생성

> Claude Code에서 NotebookLM MCP를 활용하여 코드베이스의 plan/design 문서를 슬라이드로 자동 변환하는 워크플로우

## 배경

프론트엔드 프로젝트에 Plan 문서 9개, ADR 문서, 아키텍처 분석 문서 등이 쌓여 있는데, 팀 공유나 리뷰를 위해 슬라이드로 정리할 필요가 있었다. 수동으로 만들기엔 비효율적이라 NotebookLM MCP를 활용해 자동화했다.

## 핵심 내용

### 설치 및 CLI 정보

- 패키지: `notebooklm-mcp-cli` (PyPI)
- CLI 명령어: `nlm`
- 설치: `uv tool install notebooklm-mcp-cli`
- GitHub: `github.com/jacob-bd/notebooklm-mcp-cli`
- 인증: `nlm login` (자동 OAuth)

### 워크플로우: 코드 → 슬라이드

```
1. notebook_create — 노트북 생성
2. source_add (source_type=file) — .md 파일을 소스로 추가
3. studio_create (artifact_type=slide_deck) — 슬라이드 생성
4. studio_status — 완료 확인 후 PDF 다운로드
```

### 소스 추가 방식 2가지

**파일 직접 추가** — plan/design 마크다운 파일을 그대로 업로드:

```
source_add(notebook_id, source_type="file", file_path="docs/01-plan/features/xxx.plan.md")
```

**텍스트 소스** — 코드를 읽어서 분석 문서로 가공 후 추가:

```
source_add(notebook_id, source_type="text", title="아키텍처 분석", text="...")
```

코드 파일을 직접 넣는 것보다 **핵심 구조를 분석한 텍스트**로 가공하는 것이 슬라이드 품질이 훨씬 높았다.

### source_ids로 소스 필터링

특정 소스만 사용하여 슬라이드를 생성할 수 있다:

```
studio_create(notebook_id, artifact_type="slide_deck", source_ids=["특정-소스-id"])
```

이렇게 하면 노트북에 10개 소스가 있어도 1개만 기반으로 슬라이드 생성 가능.

### 생성 시간

- 소스 1~2개: 3~8분
- 소스 9개: 5~10분
- `studio_status`로 폴링하되, 긴 경우 NotebookLM 웹에서 직접 확인이 빠름

### 슬라이드 옵션

```
slide_format: "detailed_deck" | "presenter_slides"
slide_length: "short" | "default"
language: "ko" (BCP-47)
focus_prompt: "슬라이드 방향성 지시"
```

`focus_prompt`가 슬라이드 구성에 큰 영향을 미친다. 구체적으로 적을수록 좋음.

## 정리

- NotebookLM MCP는 문서 → 슬라이드 변환에 매우 유용하지만, **생성 시간이 길다** (3~10분)
- 코드를 직접 소스로 넣기보다 **분석 텍스트로 가공**해서 넣는 것이 품질 면에서 압도적
- `source_ids` 필터링으로 같은 노트북에서 주제별 슬라이드를 따로 만들 수 있다
- Claude Code 세션 내에서 코드 탐색 → 분석 문서 작성 → NotebookLM 소스 추가 → 슬라이드 생성까지 원스톱 가능
