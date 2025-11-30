# Cursor Agent Prompt – Markdown Frontmatter 자동 생성/업데이트

## 🎯 목적

프로젝트 내 모든 `.md` 파일을 분석하여 **skill 문서** 또는 **troubleshooting 문서**로 자동 분류하고,  
각 문서 상단에 아래 스키마에 맞는 **frontmatter를 생성·보완·업데이트**한다.

---

## 🔍 전역 규칙

1. 문서 내용을 분석하여 다음 기준으로 타입을 분류한다:

   - **skill:** 개념 설명, 기술 개념 정의, 동작 원리 분석, 코드 이해 설명
   - **troubleshooting:** 문제 상황, 원인 분석, 해결 과정, 회고, 재발 방지

2. frontmatter 블록이 이미 있다면:

   - 기존 필드는 유지
   - 누락된 필드를 추가
   - 틀린 필드는 교정
   - `updatedAt`은 오늘 날짜로 갱신
   - `keywords` 및 `relatedCategories`는 본문을 기반으로 업데이트

3. frontmatter가 없으면 문서 최상단에 새 frontmatter를 생성한다.

4. 날짜 포맷:

   - `updatedAt`: YYYY-MM-DD 형태로 오늘 날짜 입력

5. 본문 내용은 절대 삭제하지 않는다.  
   frontmatter만 생성하거나 업데이트한다.

---

## 🧩 Frontmatter 스키마 정의

### 📘 Skill 문서 스키마

```yaml
---
type: "skill"
domain: "frontend"
category: "<본문에서 기술 스택 기반 자동 유추>"
topic: "<개념 중심으로 자동 유추>"
updatedAt: "<오늘 날짜>"

keywords:
  - "<본문에서 자동 추출된 주요 기술 키워드>"

relatedCategories:
  - "<본문에 등장하는 관련 스택명>"
---

---
type: "troubleshooting"
domain: "troubleshooting"
category: "<문제 발생 기술 스택으로 자동 유추>"
topic: "<문제 요약으로 자동 유추>"
updatedAt: "<오늘 날짜>"

keywords:
  - "<본문에서 자동 추출된 핵심 기술 요소>"

relatedCategories:
  - "<문제와 연관된 기술 스택>"
---

🧠 타입 자동 분류 기준

Skill 문서 패턴
	•	“~란 무엇인가”
	•	“개념 정리”
	•	“동작 원리”
	•	“설명”
	•	“특징”, “원리”
	•	기술 개념: closure, event-loop, suspense, server component 등

Troubleshooting 문서 패턴
	•	“문제가 발생했다”
	•	“원인은 ~였다”
	•	“해결했다”
	•	“디버깅”
	•	“성능 이슈”
	•	“hydration mismatch”, “상태 불일치”, “캐싱 문제” 등

⸻

📌 키워드/카테고리 자동 추출 규칙
	•	category: 문서 제목 또는 첫 번째 주요 개념에서 기술 스택 선택
(예: javascript, typescript, react, nextjs, zustand, tanstack-query, performance)
	•	topic: 문서가 설명하는 핵심 개념 또는 문제 유형
(예: event-loop, closure, hydration-mismatch, staleTime)
	•	keywords: 문서 내부 코드/단어 중 기술 개념을 3~10개 자동 수집
(예: promise, async, microtask, cacheTime, memoization)
	•	relatedCategories: 본문에 등장하는 다른 스택명
(예: react 문서에서 nextjs 언급 → nextjs 추가)

⸻

⚙️ 실행 규칙 요약
	•	frontmatter 없음 → 새로 생성
	•	frontmatter 있음 → 누락된 필드만 추가 + updatedAt 갱신
	•	본문 수정 금지
	•	YAML 구조는 반드시 유효해야 한다
	•	들여쓰기, 문자열 따옴표 오류 없이 출력

⸻

📤 출력 요구사항 (Cursor Agent용)
	•	모든 .md 파일에서 frontmatter를 자동 생성 또는 업데이트
	•	기존 내용은 유지하고 diff 기반으로 필요한 부분만 수정
	•	문서의 성격(skill/troubleshooting)에 따라 올바른 스키마 적용

---

필요하면:

- 자동 category/topic 추론 규칙을 더 촘촘히 만들어주거나
- “skill → summary 자동 집계 스크립트”도 추가로 생성해줄 수 있어.
```
