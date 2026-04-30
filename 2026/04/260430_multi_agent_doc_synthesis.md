---
draft: true
type: "content"
domain: "devops"
category: "claude_code"
topic: "에이전트 팀 2단계 병렬 분배로 대규모 코드베이스 종합 문서 만들기"
updatedAt: "2026-04-30"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "claude_code"
  - "agent_team"
  - "parallel_execution"
  - "documentation"
  - "map_reduce"
  - "fsd"

relatedCategories:
  - "workflow"
  - "ai_native"
  - "documentation"
---

# 에이전트 팀 2단계 병렬 분배로 대규모 코드베이스 종합 문서 만들기

> 단일 에이전트 컨텍스트에 다 들어가지 않는 대규모 프로젝트(`frontend-3/`, FSD 4계층 + Electron + 200+ docs)를 분석 4명·작성 4명·종합 1명의 2단계 병렬 파이프라인으로 처리해 2,297줄짜리 SSOT 문서 1개로 합친 경험.

## 배경

`MAX Frontend-3` 프로젝트의 "현 시점 코드베이스 종합 문서"가 필요했다. 범위가 컸다.

- `src/` 아래 FSD 4계층 — `widgets` 13개, `features` 30+, `entities` 9개, `shared` 7계층
- `docs/` 200+개 (Living Docs SSOT + PDCA 산출물 4단계 + research 60+개)
- `electron/` 데스크톱 통합, `e2e/` 9 시나리오, 빌드/배포 스크립트 등

이걸 한 에이전트가 직렬로 읽으면 컨텍스트가 터지거나 결과가 얕아진다. 그렇다고 사용자가 "에이전트 팀으로 구성해서 하면?"이라고 물어본 의도를 따라 그냥 1명에게 전부 시키는 것도 답이 아니다. **분석과 작성을 분리하고 각 단계에서 4명을 병렬로 돌리는** 2단계 파이프라인으로 갔다.

## 핵심 내용

### 전체 파이프라인 — 3단계

```text
Phase 1. 분석 (Explore × 4 병렬, read-only)
   ├─ docs/ 전수 카테고리화
   ├─ src/app + electron + scripts (앱 셸·라우팅·번들링)
   ├─ src/widgets + src/features (UI 카탈로그)
   └─ src/entities + src/shared + e2e (도메인·인프라·테스트)
        │
        ▼ (각 에이전트가 자료 텍스트를 메인에 반환)

Phase 2. 작성 (general-purpose × 4 병렬, write-enabled)
   ├─ A: 토대(개요·기술스택·FSD·앱셸·Electron·API·토큰)
   ├─ B: UI 카탈로그(widgets·features·합성관계)
   ├─ C: 도메인·인프라·테스트(entities·shared·Vitest+Playwright)
   └─ D: 흐름·운영(시퀀스·docs시스템·빌드·규칙·진행상황·부록)
        │
        ▼ (각 에이전트가 .agent-results/codebase-overview/section-{A,B,C,D}-*.md 파일에 저장)

Phase 3. 종합 (메인)
   ├─ frontmatter + H1 + 4-Part 목차(TOC) + footer 작성
   └─ cat 으로 4 섹션 이어붙여 docs/00-reference/codebase-overview.md 단일 파일 생성
```

### 분담 설계의 3원칙

1. **충돌 없는 분리** — 4명이 같은 파일을 쓰지 않게 헤더 번호를 미리 못박는다.
   - A: `## 1` ~ `## 8`, B: `## 9` ~ `## 11`, C: `## 12` ~ `## 14`, D: `## 15` ~ `## 20`
   - H1은 메인이 붙이므로 작성팀은 **H1 사용 금지**. 합본 시 헤더 깊이가 어긋나지 않는다.

2. **컨텍스트 분리** — 작성팀에 "분석 자료"를 인라인 프롬프트로 전달.
   - 첫 시도엔 분석 결과를 임시 파일로 저장한 뒤 작성팀이 읽게 할까 고민했지만, 분석 자료가 이미 메인 컨텍스트에 있어서 인라인이 더 단순했다.
   - 다만 작성팀에 "코드를 직접 읽어 보강해도 OK"라는 권한을 줘서 자료 누락을 보완.

3. **결과 전달은 파일 기반** — 작성팀의 결과 마크다운을 메인 컨텍스트로 다시 받지 않는다.
   - 각 작성 에이전트가 `Write` 툴로 임시 파일에 저장 → 메인에 반환하는 건 `"section-X.md 저장 완료, N줄"` 한 줄.
   - 메인은 합치는 시점에 `cat`으로만 처리 → 메인 컨텍스트에 1만 줄짜리 텍스트가 안 쌓임.

### 합본 단계의 구체적인 형태

```bash
cat .agent-results/codebase-overview/section-A-foundation.md \
  >> docs/00-reference/codebase-overview.md && \
printf '\n\n---\n\n' >> docs/00-reference/codebase-overview.md && \
cat .agent-results/codebase-overview/section-B-ui-catalog.md \
  >> docs/00-reference/codebase-overview.md && \
# ... (C, D도 동일 패턴)
```

`>>` 추가, 섹션 사이에 `---` 구분선, 마지막에 footer 한 줄. **메인이 큰 텍스트를 다시 들고 있을 필요가 없다.** 이게 핵심이다.

### 결과

| 단계 | 시간 (대략) | 산출물 |
|---|---|---|
| Phase 1 (분석 4명 병렬) | ~3분 | 4개 분석 자료 (메인 컨텍스트로 회수) |
| Phase 2 (작성 4명 병렬) | ~3-5분 | 4개 임시 마크다운 (470 + 542 + 527 + 694줄) |
| Phase 3 (종합) | ~10초 | `docs/00-reference/codebase-overview.md` (2,297줄 / 107KB) |

직렬로 했다면 (한 에이전트가 처음부터 끝까지) **컨텍스트 한계** 또는 **얕은 결과** 둘 중 하나에 부딪혔을 것. 병렬화로 둘 다 회피했다.

### 작은 함정 두 가지

- **임시 파일 정리는 권한 묶음에 막힐 수 있다.** `rm -rf .agent-results/codebase-overview`가 권한 거부됐다. 다음번엔 작성팀에 "끝나면 자기 파일 삭제까지" 시키거나, 메인이 `Write`로 빈 내용 덮어쓰기를 쓸 수 있다. 그냥 두는 것도 검증·재생성 시 참고하기 좋아서 무해하다.
- **TOC 앵커는 헤더 번호와 정확히 매칭되어야 한다.** GFM 앵커는 `소문자 + 공백→하이픈 + 특수문자 제거` 규칙. `## 9. UI 카탈로그 — Widgets (13개)` → `#9-ui-카탈로그--widgets-13개` (em-dash가 더블 하이픈). 메인이 TOC를 쓸 때 작성팀 헤더 형식을 미리 알고 있어야 한다.

## 정리

- **Map-Reduce 패턴이 대규모 문서화에 그대로 통한다.** 분석을 map, 작성을 다시 map, 종합을 reduce로 본 셈.
- **에이전트 분담 시 "헤더 번호로 영역 분리 + 결과 파일 기반 전달"** 두 가지가 병렬 충돌과 컨텍스트 폭주를 동시에 막는다.
- **사용자의 "에이전트 팀으로 하자"는 한 마디**가 전체 워크플로 모양을 바꿨다. 1명에게 일임 → 8명 분산 → 다시 1명이 reduce. 이 형태는 코드 리뷰·대규모 리팩토링·전사 마이그레이션에도 동일하게 옮겨갈 수 있다.
- **다음에 또 쓸 만한 곳:** monorepo 패키지별 인벤토리, 분기 회고 문서, 신규 합류자 온보딩 키트, 서비스 도메인별 ADR 묶음.

작은 깨달음 하나 더. 사용자의 짧은 한 마디 — "에이전트 팀으로 구성해서 하면 되지 않을까?" — 가 전체 작업 모양을 바꿨다. 자율적으로 일을 받는 것보다, **일하는 모양을 사용자가 한 단계 위에서 디자인하게 하는 게** 결과 품질을 더 끌어올린다. 디테일은 에이전트가 메우면 되지만, "어떻게 분담할지"는 사람이 정해주는 편이 빠르다.
