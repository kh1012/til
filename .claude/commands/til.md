# TIL 자동 생성 및 Push

사용자가 "TIL 추가해줘" 또는 `/til`을 실행하면 아래 절차를 따른다.

## 1. 주제 파악

- 대화 맥락에서 TIL 주제를 파악한다.
- 맥락이 불충분하면 "어떤 주제로 TIL을 작성할까요?" 라고 질문한다.
- 사용자가 주제와 함께 참고할 내용(코드, 개념 등)을 제공하면 그대로 활용한다.

## 2. 파일 경로 결정

- til 레포 경로: `/Users/kh1012/MIDAS/Research/til`
- 파일 경로 규칙: `{YYYY}/{MM}/{YYMMDD}_{slug}.md`
  - 예: `2026/03/260318_github_contents_api.md`
- slug는 영문 소문자, 단어 구분은 `_` (언더스코어)
- 해당 디렉토리가 없으면 `mkdir -p`로 생성

## 3. 마크다운 생성

프론트메터와 본문을 작성한다. `<!-- draft: true -->` 주석은 프론트메터 안에 `draft: true` 필드로 대체한다.

```markdown
---
draft: true
type: "content"
domain: "{frontend | backend | devops}"
category: "{카테고리 - lowercase}"
topic: "{주제 요약}"
updatedAt: "{YYYY-MM-DD}"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "{키워드1}"
  - "{키워드2}"

relatedCategories:
  - "{관련카테고리1}"
---

# {제목}

> {한줄 요약}

## 배경

{왜 이걸 학습했는지}

## 핵심 내용

{학습 내용 정리}

## 정리

{배운 점, 느낀 점}
```

### 프론트메터 규칙
- `type`: 항상 `"content"`
- `domain`: 내용에 따라 `"frontend"`, `"backend"`, `"devops"` 중 선택
- `category`: lowercase (예: `"javascript"`, `"react"`, `"nextjs"`, `"css"`, `"typescript"`)
- `topic`: 핵심 주제를 간결하게
- `updatedAt`: 오늘 날짜 (YYYY-MM-DD)
- `satisfaction.score`: 0 (작성자가 나중에 채움)
- `satisfaction.reason`: 빈 문자열
- `keywords`: 핵심 기술 키워드 배열
- `relatedCategories`: 관련된 카테고리 배열

## 4. Git Push

파일 생성 후 자동으로 til 레포에 커밋 & 푸시한다.

```bash
cd /Users/kh1012/MIDAS/Research/til
git add {생성된 파일 경로}
git commit -m "Add TIL: {topic}"
git push origin main
```

## 5. 완료 안내

- 생성된 파일 경로를 알려준다.
- push 완료 여부를 알려준다.
