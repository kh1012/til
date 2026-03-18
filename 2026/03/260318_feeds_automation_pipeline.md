---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "feeds-automation-pipeline"
updatedAt: "2026-03-18"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "automation"
  - "github-api"
  - "nextjs"
  - "isr"
  - "tanstack-query"
  - "claude-code"

relatedCategories:
  - "build-infra"
  - "performance"
---

# feeds + til 자동화 파이프라인 전체 회고

> TIL 작성부터 피드 노출까지, 수동 개입 없이 동작하는 파이프라인을 설계하며 겪은 고민과 결정들을 정리한다.

## 배경

feeds 프로젝트는 til 레포의 마크다운 파일을 파싱해서 블로그처럼 보여주는 사이트다. 기존에는 아래와 같은 흐름이었다:

```
TIL 작성 → git push → GitHub Action이 README 갱신 → feeds가 README를 파싱 → 피드 표시
```

이 구조에는 세 가지 고민이 있었다:

1. **README 의존**: README.md가 업데이트되어야 피드에 반영된다. GitHub Action이 실패하면 새 글이 보이지 않는다.
2. **수동 작성 비용**: TIL을 쓸 때마다 프론트메터 구조를 기억하고 직접 작성해야 한다. 포맷을 틀리면 파싱에서 빠진다.
3. **검색 부재**: 67개 넘는 글이 쌓였는데, 원하는 글을 찾으려면 스크롤을 내려야 한다.

## 핵심 내용

### 파이프라인 재설계

기존 흐름에서 README 의존을 제거하고, TIL 작성 자체도 자동화했다:

```
/til 명령 → Claude Code가 TIL 생성 → git push
                                        ↓
                              GitHub Contents API로 직접 조회
                                        ↓
                              feeds에 즉시 반영 (ISR 60초)
```

각 단계에서 내린 결정들:

### 1단계: GitHub Contents API 전환

README 파싱을 걷어내고 GitHub Contents API(`/repos/{owner}/{repo}/contents/{path}`)로 디렉토리를 재귀 탐색하는 방식으로 변경했다.

**고민했던 점:**
- API rate limit (인증 시 5,000 req/hour) → ISR 60초 캐싱이면 하루 1,440회, 충분하다
- 디렉토리당 1,000개 파일 제한 → 현재 67개, 월별로 분리되어 있어 당분간 문제없다
- 병렬 탐색으로 응답 시간 최소화 (`Promise.all`로 연도/월 디렉토리 동시 조회)

**핵심 판단:** `TilContentType` 인터페이스를 변경하지 않았다. 데이터 소스만 교체하고 하위 레이어(docLoader, UI 컴포넌트)는 그대로 둬서 변경 범위를 최소화했다.

### 2단계: 검색 + 관련글 추천

Cmd+K 검색과 관련글 추천을 추가했다.

**고민했던 점:**
- 외부 검색 라이브러리(Fuse.js 등) 도입 여부 → 67개 파일이면 순수 JS로 충분하다. 불필요한 의존성을 추가하지 않았다
- 검색 스코어링 가중치: topic(x3) > keywords(x2) > summary(x1.5) > category(x1). 사용자가 찾고 싶은 것은 주로 주제명이니 topic에 가장 높은 가중치를 줬다
- 관련글은 keywords + relatedCategories + category 공통 태그 수로 계산. 추가 API 호출 없이 이미 로드된 데이터를 활용

### 3단계: TIL 자동 생성 (`/til` 커맨드)

Claude Code 커맨드로 대화 맥락에서 TIL을 자동 생성하고 push까지 수행한다.

**실제 겪은 문제:**
- `<!-- draft: true -->` HTML 주석을 프론트메터 앞에 넣었더니 `gray-matter`가 `---`를 인식하지 못해 전체 프론트메터 파싱이 실패했다
- 해결: `draft: true`를 프론트메터 YAML 필드로 변경

### 캐싱 레이어 이슈

파이프라인 전체를 연결한 뒤 새 TIL이 반영되지 않는 문제가 발생했다. 원인은 다층 캐싱이었다:

```
GitHub CDN 캐시 → Vercel CDN (s-maxage) → TanStack Query (staleTime)
```

- API route의 `stale-while-revalidate`가 300초(5분)로 설정되어 있어, 새 글을 push해도 최대 5분간 이전 데이터가 반환됐다
- TanStack Query의 `useGetContents`에 `staleTime: 60초`가 설정되어 클라이언트에서도 캐시된 데이터를 보여줬다
- 해결: `stale-while-revalidate`를 60초로 단축, TanStack Query `staleTime: 0` + `refetchOnMount: true`로 변경

**교훈:** 캐싱은 각 레이어별로 독립적으로 동작한다. 한 레이어를 최적화해도 다른 레이어가 stale 데이터를 들고 있으면 최종 사용자에게 반영되지 않는다. 전체 경로를 그려보고 각 지점의 TTL을 확인해야 한다.

## 정리

- **README 의존 제거**: 파일 push만으로 피드 반영. 중간 단계(GitHub Action → README 갱신)가 사라져서 장애 포인트가 줄었다
- **자동화의 함정**: 자동 생성 시 포맷 호환성 검증이 필수다. `gray-matter` 같은 파서는 첫 줄이 `---`가 아니면 프론트메터를 무시한다
- **캐싱은 전체 경로로 봐야 한다**: 서버 CDN, 클라이언트 캐시, 프레임워크 캐시가 각각 다른 TTL로 동작하므로 end-to-end로 확인해야 한다
- **인터페이스를 유지하면 변경 범위가 최소화된다**: 데이터 소스를 바꿀 때 반환 타입을 유지하면 소비자 코드를 건드릴 필요가 없다
