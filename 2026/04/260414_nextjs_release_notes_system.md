---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "Next.js 프로덕션 배포 스크립트 + JSON 기반 릴리즈 노트 시스템"
updatedAt: "2026-04-14"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "next.js"
  - "deploy"
  - "release-notes"
  - "jotai"
  - "atomWithStorage"
  - "tanstack-query"

relatedCategories:
  - "react"
  - "devops"
  - "shell-script"
---

# Next.js 프로덕션 배포 + 릴리즈 노트 시스템

> yarn dev 대신 yarn build && yarn start로 서버 배포하고, JSON 기반 릴리즈 노트를 사용자에게 토스트로 보여주는 시스템을 구축했다.

## 배경

서버 PC에서 `yarn dev`로 운영하고 있었는데, 개발 모드 특유의 성능 저하(핫리로드, 메모리 과다 사용)가 사용성을 해치고 있었다. 프로덕션 빌드로 전환하면서, 배포할 때마다 사용자에게 변경사항을 알려주는 릴리즈 노트 시스템도 함께 구축했다.

## 핵심 내용

### 1. 배포 스크립트 (`scripts/deploy.sh`)

```bash
# 핵심 흐름
lsof -ti:3000 | xargs kill -9 2>/dev/null || true  # 기존 프로세스 종료
npm version patch --no-git-tag-version               # 0.1.0 → 0.1.1
yarn build                                            # 프로덕션 빌드
nohup yarn start > /tmp/max-frontend.log 2>&1 &      # 백그라운드 기동
```

- `npm version patch --no-git-tag-version` — package.json 버전만 올리고 git tag는 생성하지 않음
- `nohup ... &` — 터미널 종료 후에도 서버 유지
- deploy.sh에서 `release-notes.json`의 `currentVersion`도 자동 업데이트하고, 최근 5개 버전만 유지

### 2. 릴리즈 노트 데이터 흐름

```
release-notes.json (git tracked, 프로젝트 루트)
  ↓ fs.readFileSync
GET /api/release-notes (Next.js API Route)
  ↓ TanStack Query (staleTime: Infinity)
ReleaseNotesProvider (표시 여부 판단)
  ↓
ReleaseNotesToast (우측 하단 토스트 UI)
```

API Route를 거치는 이유: JSON 파일을 클라이언트에서 직접 import하면 빌드 시 번들에 포함되지만, API Route를 사용하면 서버에서 런타임에 읽어서 반환하므로 배포 후 JSON만 수정해도 반영 가능.

### 3. "다시 보지 않기" 로직의 함정

처음 구현 시 닫기 버튼을 누르면 체크박스 여부와 관계없이 `setSeenVersion(currentVersion)`을 호출해서 localStorage에 영구 저장되는 버그가 있었다.

```typescript
// Bad — 체크 안 해도 영구 숨김
const handleDismiss = (dontShowAgain: boolean) => {
  if (dontShowAgain) setSeenVersion(data.currentVersion);
  else setSeenVersion(data.currentVersion);  // 둘 다 같은 동작!
};

// Good — 세션 내 숨김 vs 영구 숨김 분리
const [dismissed, setDismissed] = useState(false);
const handleDismiss = (dontShowAgain: boolean) => {
  if (dontShowAgain) setSeenVersion(data.currentVersion);  // localStorage 저장
  setDismissed(true);  // React state만 변경 (새로고침 시 리셋)
};
```

`useState`(세션 내)와 `atomWithStorage`(영구)를 분리하는 것이 핵심.

### 4. Claude 프로젝트 룰로 릴리즈 노트 자동 관리

`.claude/rules/release-notes.md`에 프로젝트 룰을 추가하면, `/commit-kr` 실행 시 Claude가 자동으로 `release-notes.json`을 함께 업데이트한다. 전역 스킬을 수정하지 않고 프로젝트 단위로 동작을 확장하는 패턴.

- feat/fix/refactor/style 타입만 릴리즈 노트에 포함
- 10개 초과 시 유사 항목 병합/요약
- docs/test/chore는 사용자에게 의미 없으므로 제외

## 정리

- `yarn dev` → `yarn deploy`(build + start)로 전환하는 것만으로 체감 성능이 크게 향상된다
- 릴리즈 노트는 JSON + API Route + TanStack Query 조합이 간단하면서도 유연하다
- "다시 보지 않기" 같은 UX 패턴에서 세션 상태(useState)와 영구 상태(localStorage)의 분리를 명확히 해야 버그를 방지할 수 있다
- Claude 프로젝트 룰(`.claude/rules/`)은 전역 스킬을 건드리지 않고 프로젝트별 자동화를 추가하는 좋은 방법이다
