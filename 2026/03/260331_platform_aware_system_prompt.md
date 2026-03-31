---
draft: true
type: "content"
domain: "frontend"
category: "nextjs"
topic: "플랫폼별 시스템 프롬프트 분기와 클라이언트 인터셉트 패턴"
updatedAt: "2026-03-31"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "system-prompt"
  - "platform-flag"
  - "client-intercept"
  - "cors-proxy"
  - "atomWithStorage"
  - "jotai"

relatedCategories:
  - "ai"
  - "react"
  - "architecture"
---

# 플랫폼별 시스템 프롬프트 분기와 클라이언트 인터셉트 패턴

> Electron/Web 하이브리드 앱에서 AI 응답 품질을 플랫폼 특성에 맞게 최적화하고, 클라이언트 인터셉트로 외부 API 호출 지연을 제거한 경험

## 배경

MAXYS는 Next.js + Electron 하이브리드 앱이다. 커넥터 랜딩 페이지를 만들면서 Electron에는 "작업 폴더" 개념이 있지만 Web에는 없다는 점이 AI 응답에 혼란을 줬다. 웹에서 채팅하면 "현재 작업 디렉토리: ..." 같은 무의미한 응답이 서두에 붙었다. 또한 "Gen 노드 데이터 가져와줘"라고 하면 퀵액션 버튼이 나오고 클릭해야 실제 API가 호출되는 2-step 흐름이 불편했다.

## 핵심 내용

### 1. 플랫폼 플래그를 request body에 포함

```typescript
// use-chat-request-body.ts
import { isElectronEnvironment } from "@/shared/lib/is-electron";

return {
  ...otherFields,
  platform: isElectronEnvironment() ? "electron" : "web",
};
```

서버 API route에서 이 값을 `buildSystemPrompt`에 전달하여 분기:

- **Electron**: 작업 디렉토리, 파일 목록, 파일 생성 규칙(코드블록→자동 저장) 포함
- **Web**: 작업 폴더 관련 안내 전부 제거, 문서 분석/커넥터 안내만 유지

### 2. 클라이언트 인터셉트로 즉시 API 호출

기존 흐름: 사용자 메시지 → AI 응답 → 퀵액션 버튼 렌더링 → 클릭 → API 호출
개선 흐름: 사용자 메시지 → `parseMidasQuery` 패턴 매칭 → 즉시 API 호출 → 결과를 AI에 전달

```typescript
// midas-helpers.ts
const ENDPOINT_ALIAS: Record<string, string> = {
  "노드": "node", "절점": "node",
  "요소": "elem", "재료": "matl", "단면": "sect",
};

const pattern = /(?:midas\s*)?(gen|civil)(?:에서|에서의|의|[\s,]+)\s*([\w가-힣]+?)(?:\s*데이터)?\s*(?:를|을|조회|가져|불러|fetch|query|get)/i;
```

핵심은 AI 시스템 프롬프트에서 `fetchMidasGenNode` 퀵액션을 제거하여 AI가 버튼을 제안하지 않게 만든 것. 클라이언트 인터셉트가 먼저 처리하고, 매칭되지 않는 경우에만 일반 채팅으로 전송.

### 3. CORS 프록시 패턴 통일

외부 API를 브라우저에서 직접 호출하면 CORS 차단. Next.js API route를 프록시로 사용:

```typescript
// /api/midas/verify/route.ts — 서버에서 외부 API 호출
const response = await fetch(`${MIDAS_API_BASE}/mapikey/verify`, {
  headers: { "MAPI-Key": mapiKey },
});
```

기존 `/api/midas/query`와 동일 패턴으로 `/api/midas/verify` 추가. 클라이언트는 항상 자체 API route만 호출.

### 4. atomWithStorage로 간단한 영속화

```typescript
// connector-atoms.ts
import { atomWithStorage } from "jotai/utils";

export const midasGenMapiKeyAtom = atomWithStorage<string | null>("max:connector-key-gen", null);
export const connectorEnabledAtom = atomWithStorage<Record<string, boolean>>("max:connector-enabled", { ... });
```

백엔드 동기화 전까지 localStorage로 충분. 기존 프로젝트의 `max:` prefix 컨벤션을 따름. UI 전용 상태(`connectorDialogOpenAtom` 등)는 일반 `atom` 유지.

## 정리

- AI 응답 품질은 시스템 프롬프트의 정밀도에 크게 좌우된다. 플랫폼 구분 하나로 웹 사용자의 응답이 훨씬 깔끔해졌다.
- 퀵액션 버튼 vs 클라이언트 인터셉트는 트레이드오프. 인터셉트는 빠르지만 정규식 유지보수가 필요하고, 퀵액션은 유연하지만 한 번 더 클릭해야 한다. 데이터 조회처럼 의도가 명확한 경우는 인터셉트가 UX 상 우위.
- CORS 프록시는 Next.js API route가 가장 자연스러운 해결책. 동일한 패턴(`/api/midas/*`)으로 통일하면 유지보수도 쉽다.
