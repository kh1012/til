---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "시스템 프롬프트 편집 구조와 IDB 기반 프롬프트 고도화 테스트 체계"
updatedAt: "2026-05-02"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "시스템 프롬프트"
  - "프롬프트 엔지니어링"
  - "indexeddb"
  - "jotai"
  - "atomwithstorage"
  - "json export import"
  - "d3"

relatedCategories:
  - "nextjs"
  - "javascript"
  - "ai"
---

# 설정에서 프롬프트와 컨텍스트를 편집하고, IDB로 변형을 비교하는 구조 설계

> 코드에 하드코딩된 시스템 프롬프트를 UI에서 섹션 단위로 편집하고, IndexedDB + JSON Export/Import로 프롬프트 변형을 비교·최적화할 수 있는 실험 사이클을 만든 기록.

## 배경

LLM 채팅 앱은 보통 응답 톤·규칙·도메인 컨텍스트 같은 시스템 프롬프트를 서버 코드 깊은 곳에 하드코딩한다. 그 결과 두 가지 문제가 누적된다.

1. **수정 사이클이 길다**. 톤 한 줄을 바꾸려고 코드 변경 → PR → 배포가 필요하다.
2. **무엇이 주입되는지 불투명하다**. 사용자가 같은 입력을 보내도 활성된 옵션·파일 컨텍스트·검색 결과 유무에 따라 LLM에 들어가는 system 메시지가 달라지는데, 이를 검증할 수단이 없다.

프롬프트 엔지니어링은 본질적으로 실험적인 활동이라 "여러 변형을 빠르게 시도하고 최적안을 보존"할 수 있는 사이클이 필요하다. 그래서 이 작업은 두 축을 동시에 다뤘다 — 편집 가능 UI 구조 설계와, 결과물을 영속·공유·비교할 데이터 레이어.

## 핵심 내용

### 1. 정적 시스템 프롬프트의 섹션 분해

서버에서 한 덩어리 string 으로 조립되던 시스템 프롬프트를 의미 단위 섹션으로 분리한다. 각 섹션은 다음 메타를 가진 데이터로 표현한다.

```ts
type PromptSection = {
  id: string;
  labelKey: string;
  defaultText: string;
  /** 정적 prefix + 동적 데이터(파일 목록 등)가 자동 합성되는 섹션 */
  hasDynamicTail: boolean;
  /** 어떤 조건에서 적용되는지 (UI 안내) */
  appliesWhenKey: string;
};
```

서버의 `buildSystemPrompt` 도 정적 default를 임포트만 해서 사용한다. 클라이언트와 서버가 **동일한 default 모듈을 공유**해야 표시값과 실제 적용값의 동기화가 어긋나지 않는다.

### 2. Override Atom + 빈 문자열 = clear 패턴

사용자 정의는 단일 atom 한 곳에 모은다.

```ts
type PromptOverridesMap = Partial<Record<SectionId, string>>;

export const promptOverridesAtom =
  atomWithStorage<PromptOverridesMap>("max:prompt-overrides", {});
```

규칙은 단순하다.
- 키가 없거나 trim 결과가 빈 문자열이면 → `defaultText` 사용
- 사용자가 default 텍스트를 그대로 붙여 저장하면 → 자동으로 atom에서 키 제거 (override 없음과 동치)

이 단순한 규칙 덕분에 `override === default` 가 되는 가짜 override가 IDB에 쌓이지 않는다.

### 3. 서버 통합 — 옵션 객체 한 줄

서버 `buildSystemPrompt(options)` 시그니처에 `overrides?: Record<SectionId, string>` 한 필드만 추가했다. 각 섹션 출력 직전에 `pickEffective(override, fallback)` 한 줄로 분기한다.

```ts
function pickEffective(override: string | undefined, fallback: string): string {
  if (override && override.trim().length > 0) return override.trim();
  return fallback;
}
```

`hasDynamicTail` 인 섹션(예: 디렉토리/파일 컨텍스트)은 사용자가 prefix만 편집하고, 실제 디렉토리·파일 목록은 서버가 그대로 자동 합성한다. 이 분리가 없으면 사용자가 override 시 동적 데이터가 사라져 응답 품질이 망가진다.

### 4. 파이프라인 그래프 도식화

응답에 어떤 시스템 프롬프트가 들어가는지 사용자가 즉시 인지하도록 D3 기반 직렬 파이프라인 그래프를 그렸다.

```
사용자 입력 → Base → 응답 톤 → 파일 컨텍스트 → 응답 규칙
                                                    ↓
                                LLM 호출 ← RAG Result(동적) ← RAG System
```

핵심 디자인 결정.

- **방사형 force layout 대신 좌→우 직렬**: 실제 조립 순서가 그대로 드러나야 사용자가 학습 가능하다.
- **컨테이너 폭에 맞춰 ㄹ자(serpentine) wrap**: 좁은 화면에서도 노드가 화면 밖으로 나가지 않는다.
- **시뮬레이터 토글**: "현재 상태"와 "시뮬레이션 해보기" 두 모드. 시뮬레이션 모드에서 가상 옵션을 켜고 끄면서 그래프의 활성/비활성을 즉시 확인.
- **흐르는 점**: active edge에 dashed overlay가 흐르면서 데이터가 실제로 이동하는 느낌을 준다. CSS keyframe + `stroke-dashoffset` 애니메이션.

```css
@keyframes prompt-pipeline-flow {
  from { stroke-dashoffset: 0; }
  to { stroke-dashoffset: -26; }
}
.prompt-flow-dots {
  stroke-dasharray: 0.001 26;
  stroke-linecap: round;
  animation: prompt-pipeline-flow 1.6s linear infinite;
}
```

`stroke-dasharray: 0 N` + `stroke-linecap: round` 조합으로 dash 길이 0인 둥근 점이 path를 따라 흐른다. stroke-width를 6으로 키우면 또렷한 원형 도트가 된다.

### 5. IDB 통합 — 빠른 read는 localStorage, 영속·이식은 IDB

처음에는 atomWithStorage(localStorage)로 시작했지만 두 가지 한계에 부딪혔다.

- localStorage는 5MB 제한이 있어 thread/메시지가 같이 쌓이는 환경에선 위험하다.
- 사용자가 변형을 저장하고 다른 환경으로 옮기려면 **표준 포맷의 export 파일**이 있어야 한다.

해결책은 이중 저장이었다.

```ts
// 마운트 시 IDB → atom 머지 (localStorage가 비어 있을 때만 IDB 값을 끌어옴)
useEffect(() => {
  void hydratePromptOverridesFromIdb(overrides).then((merged) => {
    if (merged) setOverrides(merged);
  });
}, []);

// atom 변경마다 IDB 비동기 sync
useEffect(() => {
  syncPromptOverridesToIdb(overrides);
}, [overrides]);
```

localStorage는 SSR 첫 렌더에 동기 read가 가능해 빠른 hydration용 캐시로 두고, IDB는 export/import + 대용량 영속의 SSOT로 둔다. atom 자체가 storage를 동기로 다루는 jotai 패턴은 그대로 살리면서 IDB의 비동기 특성을 effect로 격리했다.

### 6. JSON 공통 포맷 — Export / Import

OS·브라우저 무관 이식을 위해 단일 envelope를 정의했다.

```ts
const EXPORT_FORMAT = "max-jain-gpt-export";
const EXPORT_FORMAT_VERSION = 1;

type ExportPayload = {
  format: typeof EXPORT_FORMAT;
  version: typeof EXPORT_FORMAT_VERSION;
  exportedAt: string;
  threads?: { records: unknown[] };
  messages?: { records: unknown[] };
  prompts?: { records: unknown[] };
};
```

핵심 결정.

- **format/version 식별자**: import 시 정상 파일임을 검증하고, 향후 schema 변경 시 마이그레이션 분기 가능.
- **체크박스 분기 export**: thread 와 prompt 를 따로 묶어 사용자가 선택. 프롬프트는 `prompt-overrides` KV row 안에서 **섹션 단위로 다시 필터**할 수 있다 — 톤만 export, 응답 규칙만 export 같은 세분화가 가능.
- **다이얼로그 진입 시 카운트 조회**: `getDataCounts()` 로 IDB에서 thread 수, 메시지 수, 사용자 정의된 섹션 ID 목록을 미리 보여준다. 사용자가 "내가 지금 뭘 export 하려는지" 알고 결정하게 만든다.
- **Import 시 자동 감지**: 선택된 JSON 파일에 어떤 항목이 들어있는지 파싱해 체크박스 enabled 여부와 카운트를 보여준다. 비어 있는 항목은 disabled 처리.

다운로드는 표준 Web API 만 사용한다.

```ts
const blob = new Blob([JSON.stringify(payload, null, 2)], {
  type: "application/json",
});
const url = URL.createObjectURL(blob);
const a = document.createElement("a");
a.href = url;
a.download = `prompt-export-${new Date().toISOString()}.json`;
a.click();
URL.revokeObjectURL(url);
```

OS native 의존도 0, 모든 모던 브라우저와 Electron 동일 동작.

### 7. 토스트로 변경 적용을 즉시 알린다

저장 / 사용자 정의 제거 / Export 완료 / Import 완료 모두 sonner toast로 알림.

```ts
toast.success(t("settings.systemPrompts.toast.saved", { name: sectionLabel }));
toast.info(t("settings.systemPrompts.toast.cleared", { name: sectionLabel }));
```

프롬프트 변경처럼 시각 변화가 거의 없는 액션은 토스트 없이는 "저장된 게 맞나?" 라는 의심이 남는다. 작은 알림이 실험 사이클의 신뢰도를 크게 올린다.

## 정리

이 구조의 진짜 가치는 단일 기능이 아니라 **사이클 단축**에 있다.

| 기존 | 변경 |
|------|------|
| 프롬프트 변경 → 코드 수정 → PR → 배포 → 응답 확인 | UI에서 편집 → 즉시 적용 → 응답 확인 |
| 변형 비교를 위해 commit/branch 관리 | Export JSON 한 파일로 변형 보존 |
| 다른 PC/사용자에 변형 공유 어려움 | JSON 파일 한 개로 즉시 공유 / Import |

프롬프트 엔지니어링은 결국 "여러 변형을 빠르게 시도하고 최적안을 골라 보존"하는 활동이다. 이번 작업으로 그 사이클이 모두 UI 안에 들어왔다. 다음 단계로는 변형별 메타데이터(태그, 메모, 평가 점수)를 IDB에 같이 저장하고, A/B 결과 비교 뷰를 붙이면 본격적인 프롬프트 실험 워크벤치가 된다.

기억할 패턴 세 가지.

- **default 단일 출처**: 서버와 클라이언트가 같은 모듈을 import 해서 표시값/적용값이 어긋나지 않게.
- **빈 문자열 = clear**: override의 부재와 default-동일을 같은 상태로 다뤄 IDB가 깨끗하게 유지된다.
- **format/version envelope**: 모든 export는 자기 식별자를 포함시켜 import 검증과 schema 진화 여지를 남긴다.
