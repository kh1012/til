---
draft: true
type: "content"
domain: "frontend"
category: "spreadjs"
topic: "SpreadJS 플러그인 모듈 통합 — charts/shapes 의존성 관리와 런타임 초기화"
updatedAt: "2026-04-01"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "SpreadJS"
  - "spread-sheets-charts"
  - "spread-sheets-shapes"
  - "dynamic import"
  - "yarn resolutions"
  - "conditional formatting"
  - "sparkline"

relatedCategories:
  - "nextjs"
  - "react"
  - "ai-sdk"
---

# SpreadJS 플러그인 모듈 통합 삽질기

> SpreadJS charts/shapes 모듈의 중복 의존성, 런타임 초기화 순서, API 이름 차이를 해결하며 배운 것들

## 배경

AI가 스프레드시트 도구(set_range, set_style, add_chart 등)를 호출하여 SpreadJS workbook을 실시간으로 조작하는 기능을 개발하면서, 조건부 서식(ColorScale, DataBar, HighlightRule), 차트, 스파크라인을 추가했다. 단순히 API를 호출하는 것 같지만, SpreadJS 플러그인 모듈 시스템의 특성 때문에 수많은 런타임 에러가 발생했다.

## 핵심 내용

### 1. SpreadJS 플러그인은 사이드 이펙트 import

`@mescius/spread-sheets-charts`는 import하는 것만으로 `GC.Spread.Sheets` 프로토타입을 확장한다:
- `sheet.charts` 프로퍼티 추가
- `GC.Spread.Sheets.Charts.RowCol` 네임스페이스 추가

**핵심**: 플러그인은 **Workbook 인스턴스 생성 전에** import해야 한다. 생성 후 import하면 기존 인스턴스에 `charts` 프로퍼티가 없다.

```typescript
// ❌ Workbook 생성 후 import → sheet.charts === undefined
const wb = new Workbook();
await import("@mescius/spread-sheets-charts");

// ✅ import 후 Workbook 생성 → sheet.charts 정상
await import("@mescius/spread-sheets-charts");
const wb = new Workbook();
```

SpreadSheetView에서 `useChartsPlugin` 훅으로 charts 로드 완료 후에만 `<SpreadSheets>` 렌더링:

```typescript
function useChartsPlugin() {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    import("@mescius/spread-sheets-charts")
      .then(() => setReady(true))
      .catch(() => setReady(true)); // 실패해도 기본 기능은 동작
  }, []);
  return ready;
}

// chartsReady일 때만 SpreadSheets 렌더
{chartsReady && <SpreadSheets workbookInitialized={...} />}
```

### 2. 중복 의존성 문제와 yarn resolutions

`spread-sheets-charts` → `spread-sheets-shapes` → `spread-sheets` 체인에서, shapes가 자체 `spread-sheets` 복사본을 번들하면 `ShapeBaseData` 에러 발생:

```
TypeError: Cannot read properties of undefined (reading 'ShapeBaseData')
```

원인: charts가 shapes의 SpreadJS 인스턴스를 참조하는데, 그게 root의 SpreadJS와 다른 인스턴스.

해결: `package.json`에 `resolutions`로 단일 버전 강제:

```json
{
  "resolutions": {
    "@mescius/spread-sheets": "19.0.6"
  }
}
```

### 3. SpreadJS API 이름이 타입 정의와 다르다

TypeScript 타입에는 `addThreeScaleRule`이지만 실제 런타임 메서드는 `add3ScaleRule`:

| 타입 정의 (d.ts) | 실제 런타임 API |
|---|---|
| `addThreeScaleRule` | `add3ScaleRule` |
| `addTwoScaleRule` | `add2ScaleRule` |
| `ComparisonOperator` | `ComparisonOperators` (복수) |
| `TextComparisonType` | `TextComparisonOperators` |

**교훈**: SpreadJS의 d.ts 파일에서 실제 메서드 시그니처를 `grep`으로 확인해야 한다.

### 4. setArray vs setValue — 파싱 지뢰밭

`sheet.setArray()`는 문자열을 내부적으로 파싱:
- `=`로 시작 → 수식으로 해석 → 유효하지 않으면 `Invalid Formula` 에러
- 따옴표 `'` 포함 → `No syntax ''' to match` 에러

해결: `setArray`를 완전히 제거하고 셀별 `setValue`/`setFormula`로 전환:

```typescript
for (let r = 0; r < data.length; r++) {
  for (let c = 0; c < row.length; c++) {
    const val = normalizeQuotes(row[c]);
    if (typeof val === "string" && val.startsWith("=")) {
      sheet.setFormula(startRow + r, startCol + c, val);
    } else {
      sheet.setValue(startRow + r, startCol + c, val);
    }
  }
}
```

### 5. charts는 suspendPaint 밖에서 실행

charts의 dynamic import가 shapes 모듈을 초기화하면서 `resumePaint` 시점에 충돌:

```
Cannot read properties of undefined (reading 'forEach')
at t.onPaintSuspend (gc.spread.sheets.shapes.min.js)
```

해결: `addChart` 커맨드만 `suspendPaint`/`resumePaint` 밖에서 실행:

```typescript
// sync 커맨드는 paint 일시중지 상태에서 실행
workbook.suspendPaint();
for (const cmd of syncCommands) await executeSingleCommand(cmd);
workbook.resumePaint();

// 차트는 paint 밖에서 실행
for (const cmd of chartCommands) await executeSingleCommand(cmd);
```

### 6. AI SDK stepCount 한도와 "valid dictionary" 무한 루프

`streamText`의 `stopWhen: stepCountIs(15)` 도달 시:
1. Tool call이 `input-streaming` → `input-available` 전환 중에 끊김
2. 불완전한 `input`이 메시지에 남음
3. 다음 API 호출에서 Anthropic이 `"Input should be a valid dictionary"` 거부
4. 클라이언트의 에러 핸들러가 `stripBrokenToolParts` → 재전송 → 같은 에러 → 무한 루프

해결 — 2단계 방어:
- **서버**: `sanitizeToolInputs`로 `convertToModelMessages` 전에 invalid input을 `{}`로 교체
- **클라이언트**: `retryCountRef` 리셋 버그 수정 (에러 경로에서 0으로 리셋하지 않음)

## 정리

SpreadJS 같은 대형 상용 라이브러리를 Next.js + React 환경에서 사이드 이펙트 import로 사용할 때는:

1. **의존성 트리를 반드시 확인** — `node_modules` 안에 중복 복사본이 없는지
2. **import 순서 = 초기화 순서** — 플러그인은 컴포넌트 마운트 전에 로드
3. **d.ts를 믿지 말고 런타임 API를 grep** — 특히 상용 라이브러리의 minified 번들
4. **setArray 같은 편의 API는 파싱 부작용이 있을 수 있다** — 셀별 제어가 안전
5. **AI SDK 멀티스텝에서 step limit는 메시지 오염을 유발** — 서버 사이드 sanitize 필수
