---
draft: true
type: "content"
domain: "frontend"
category: "architecture"
topic: "FSD ui/ 디렉토리 서브디렉토리 구조화 전략"
updatedAt: "2026-03-27"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "feature-sliced-design"
  - "directory-structure"
  - "refactoring"
  - "import-path"
  - "git-mv"

relatedCategories:
  - "react"
  - "nextjs"
  - "typescript"
---

# FSD ui/ 디렉토리가 비대해질 때 서브디렉토리로 구조화하기

> FSD 아키텍처에서 ui/ 플랫 디렉토리가 20~37개 파일로 비대해졌을 때, 도메인별 서브디렉토리로 나누고 import 경로를 일괄 업데이트하는 실전 전략

## 배경

Feature-Sliced Design(FSD) 아키텍처에서 `model/`과 `ui/` 서브디렉토리를 두는 것이 기본 패턴이다. 기능을 계속 확장하다 보면 `ui/` 디렉토리에 파일이 30개 이상 쌓이면서 파일 탐색이 어려워진다. 특히 `entities/message/ui/` (37개), `shared/ui/` (35개) 같은 디렉토리는 코드블록, 도구 호출, 파일 카드 등 서로 다른 도메인의 컴포넌트가 뒤섞여 있었다.

## 핵심 내용

### 1. 그룹화 기준: 도메인 응집도

파일을 그룹으로 나눌 때 가장 중요한 기준은 **도메인 응집도**다. import 그래프를 분석해서 서로 밀접하게 참조하는 파일을 같은 그룹에 넣는다.

```
entities/message/ui/
├── MessageBubble.tsx        ← 엔트리 (루트에 유지)
├── content/                 ← 메시지 본문 렌더링 (12)
├── tools/                   ← 도구 호출 표시 (9)
├── files/                   ← 파일 카드/미리보기 (9)
├── code/                    ← 코드 블록 (4)
├── sources/                 ← 소스 인용 (2)
└── viewers/                 ← 기존 유지
```

### 2. 엔트리 컴포넌트는 루트에 유지

각 FSD 슬라이스의 메인 컴포넌트(예: `MessageBubble.tsx`, `CoworkPanel.tsx`, `DebugPanel.tsx`)는 루트에 남겨둔다. barrel export(`index.ts`)에서 이 엔트리를 통해 외부에 노출하므로, 루트에 있는 것이 자연스럽다.

### 3. import 경로 업데이트 체크리스트

파일 이동 후 반드시 업데이트해야 하는 경로:

| 대상 | 패턴 | 예시 |
|------|------|------|
| 이동된 파일 내부 | `./peer` → 같은 그룹이면 유지, 다른 그룹이면 `../group/peer` | `./ToolCallGroup` → `../tools/ToolCallGroup` |
| 이동된 파일의 상위 참조 | `../model/X` → `../../model/X` (한 단계 깊어짐) | `../model/types` → `../../model/types` |
| 루트 파일 | `./X` → `./group/X` | `./MessageList` → `./messages/MessageList` |
| barrel export | `./ui/X` → `./ui/group/X` | `./ui/FileCard` → `./ui/files/FileCard` |
| 외부 직접 참조 | `@/entities/X/ui/Y` → `@/entities/X/ui/group/Y` | 절대 경로도 서브디렉토리 반영 필요 |
| 테스트 파일 | `../Component` → `../group/Component` | `vi.mock()` 경로도 포함 |

### 4. `shared/ui/`는 barrel export가 없어 영향 범위가 큼

`shared/ui/`는 `index.ts` 없이 모든 외부 파일이 `@/shared/ui/Button` 형태로 직접 import한다. 따라서 서브디렉토리 구조화 시 **프로젝트 전체의 import를 일괄 수정**해야 한다. 이번 작업에서 약 80개 파일의 import가 변경됐다.

### 5. 검증: 모듈 미발견 에러만 집중

`yarn build` 시 기존 타입 에러와 구조화로 인한 모듈 미발견 에러를 구분해야 한다:

```bash
# 모듈 미발견만 필터링
yarn build 2>&1 | grep -i "module not found\|cannot find module\|can't resolve"
```

### 6. 실전 결과

| 디렉토리 | Before | After |
|-----------|--------|-------|
| entities/message/ui/ | 37 플랫 | 1 루트 + 5 그룹 |
| shared/ui/ | 35 플랫 | 2 루트 + 6 그룹 |
| widgets/cowork-panel/ui/ | 24 플랫 | 5 루트 + 2 그룹 |
| features/debug-panel/ui/ | 22 플랫 | 2 루트 + 5 그룹 |

총 144 파일 변경, 모듈 미발견 에러 0건.

## 정리

- FSD에서 ui/ 디렉토리가 15개 이상이면 서브디렉토리 구조화를 고려할 시점
- `git mv`로 이동하면 git이 rename으로 추적해 히스토리가 보존됨
- import 그래프를 먼저 분석하면 그룹 간 의존 방향이 명확해져 안전한 구조화 가능
- `engineering-tools/ui/`처럼 처음부터 서브디렉토리로 나눈 사례가 좋은 레퍼런스
- barrel export가 없는 shared/ui/ 같은 경우 영향 범위가 크므로 빌드 검증 필수
