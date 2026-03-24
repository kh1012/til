---
draft: true
type: "content"
domain: "frontend"
category: "ai-integration"
topic: "AI tool chain에 새 도구 추가 시 기존 흐름 재사용 전략"
updatedAt: "2026-03-24"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "AI SDK"
  - "tool call"
  - "SpreadJS"
  - "useSheetCommandSync"
  - "system prompt engineering"

relatedCategories:
  - "react"
  - "nextjs"
  - "typescript"
---

# AI Tool Chain에 새 도구 추가 시 기존 흐름 재사용 전략

> 기존 AI→SpreadJS tool 체인에 `load_xlsx`를 추가하면서 배운 아키텍처 패턴과 프롬프트 엔지니어링 교훈

## 배경

목업모드에서 AI(Haiku 4.5)가 SpreadJS를 조작하는 tool chain이 이미 구현되어 있었다. 여기에 "작업폴더의 xlsx 파일을 SpreadJS에 로드"하는 새 tool을 추가해야 했다. 핵심 과제는 기존 흐름을 최대한 재사용하면서 최소 변경으로 기능을 추가하는 것.

## 핵심 내용

### 1. 기존 흐름에 분기만 추가하는 패턴

기존 `useSheetCommandSync` 훅이 이미 tool call 감지 → 명령 변환 → 배치 실행을 처리하고 있었다. 새 tool을 위해 별도 훅을 만드는 대신, 기존 루프 안에 ~10줄 분기만 추가.

```typescript
// 기존 루프 내부에 삽입
if (toolName === "load_xlsx") {
  processedIds.current.add(part.toolCallId);
  void handleLoadXlsx(input, workbook, executor);
  continue; // 기존 SheetCommand 흐름 바이패스
}
// 기존 흐름은 그대로
const commandType = TOOL_TO_COMMAND[toolName];
```

**교훈**: 새 기능을 위해 새 모듈을 만들되, 진입점은 기존 코드에 분기로 삽입. 감지 로직 중복을 피할 수 있다.

### 2. 서버 ack 패턴의 한계

기존 sheet tools는 서버에서 `ack`(성공 응답)만 반환하고, 실제 실행은 클라이언트에서 수행. `load_xlsx`도 동일 패턴을 적용했으나, 문제 발생:

- 서버 `ack`가 "다음 도구 즉시 호출하세요"라는 instruction을 포함
- AI가 xlsx 로드 후에도 불필요한 후속 tool 호출을 시도

**해결**: `load_xlsx`만 별도 execute 함수 사용. "로드 요청 처리됨"이라는 중립적 메시지 반환.

### 3. 작은 모델(Haiku)의 tool 선택 문제

Haiku 4.5는 tool description을 보고 판단하는데, "Load an xlsx file"이라는 설명만으로는 PDF 첨부 시에도 호출하는 문제 발생. 시스템 프롬프트에 부정 규칙을 추가해도 효과 부족.

**해결**: tool description 자체에 NEVER 규칙 삽입.

```typescript
description:
  "ONLY call when user explicitly asks to open/load an Excel file. " +
  "NEVER call for PDF, image, text, or any non-Excel file. " +
  "NEVER call when user attaches a file and asks for analysis."
```

**교훈**: 작은 모델은 system prompt보다 tool description을 더 직접적으로 참조한다. 부정 규칙은 tool description에 넣어야 효과적.

### 4. AI 컨텍스트 전달 — 시스템 프롬프트 주입 패턴

클라이언트에서 xlsx를 로드한 후 AI가 데이터를 인식하려면, 다음 API 호출 시 시스템 프롬프트에 요약을 삽입해야 한다. 기존 `cellContextPrompt` 패턴을 재사용:

```
클라이언트 atom → chat API body → route.ts 시스템 프롬프트 동적 삽입
```

파일 목록도 동일 방식으로 전달하여, AI가 fileName 없이 호출하는 단계를 제거.

## 정리

- **아키텍처**: "기존 흐름에 분기 추가 + 로직만 별도 모듈로 분리"가 가장 실용적 (Option C: Pragmatic Balance)
- **프롬프트 엔지니어링**: 작은 모델 대상으로는 system prompt보다 tool description의 NEVER 규칙이 더 효과적
- **ack 패턴**: tool마다 다른 execute 반환값이 필요할 수 있다. 일률적 ack는 부작용 유발
- **PDCA 프로세스**: Plan→Design→Do→Check→Report를 한 세션에서 완주. Match Rate 93%로 1차 통과
