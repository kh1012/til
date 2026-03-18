---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "github-contents-api-migration"
updatedAt: "2026-03-18"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "github-api"
  - "contents-api"
  - "nextjs"
  - "data-fetching"

relatedCategories:
  - "javascript"
  - "typescript"
---

# GitHub Contents API로 파일 목록 조회 방식 전환

> README.md 파싱 의존을 제거하고, GitHub Contents API로 TIL 파일 목록을 직접 조회하도록 개선했다.

## 배경

기존 feeds 프로젝트에서는 TIL 파일 목록을 가져오기 위해 README.md raw URL을 fetch한 뒤 정규식(`/^-\s+\[(.+?)\]\((https:\/\/github\.com\/.+?)\)/`)으로 파싱하는 방식을 사용했다. 이 방식은 README.md가 GitHub Action으로 업데이트될 때까지 새 글이 반영되지 않고, 파싱 로직이 README 포맷에 강하게 결합되어 있었다.

## 핵심 내용

### GitHub Contents API

```
GET https://api.github.com/repos/{owner}/{repo}/contents/{path}
```

- 디렉토리 경로를 주면 해당 디렉토리의 파일/폴더 목록을 JSON 배열로 반환한다.
- 각 항목에 `type`(`file` | `dir`), `name`, `html_url`, `download_url` 등의 필드가 포함된다.
- 인증 토큰 사용 시 5,000 req/hour, 미인증 시 60 req/hour.

### 재귀 탐색 구조

```typescript
// 1. 루트에서 연도 디렉토리(2025, 2026...) 탐색
// 2. 각 연도 하위의 월별 폴더 재귀 탐색
// 3. .md 파일 중 YYMMDD로 시작하는 파일만 수집
// 4. README.md, codes/, assets/ 등은 제외
```

병렬 처리(`Promise.all`)로 여러 디렉토리를 동시에 탐색하여 응답 시간을 최소화했다.

### 기존 인터페이스 유지

```typescript
type TilContentType = {
  title: string;   // 파일명
  url: string;     // html_url (GitHub 브라우저 URL)
  rawUrl: string;  // download_url (원본 콘텐츠 URL)
  date: string;    // YYYY-MM-DD
  slug: string;    // URL-friendly identifier
};
```

`TilContentType` 인터페이스를 변경하지 않아 `docLoader.ts`, UI 컴포넌트, API route 등 하위 코드 수정이 불필요했다.

### 제한사항

- Contents API는 디렉토리당 최대 1,000개 파일 제한 (현재 67개로 충분).
- ISR 60초 캐싱을 적용하면 API rate limit 문제 없음.

## 정리

- README 파싱 의존을 제거하여 파일 push만으로 피드에 즉시 반영 가능해졌다.
- 반환 인터페이스를 유지하면 데이터 소스 교체 시 변경 범위를 최소화할 수 있다.
- API 제한사항(rate limit, 파일 수 제한)은 캐싱 전략으로 충분히 대응 가능하다.
