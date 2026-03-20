---
draft: true
type: "content"
domain: "frontend"
category: "ai-sdk"
topic: "AI SDK v6 data: URL 파일 첨부 시 validateDownloadUrl SSRF 방지 충돌 우회"
updatedAt: "2026-03-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "vercel-ai-sdk"
  - "data-url"
  - "ssrf"
  - "validateDownloadUrl"
  - "convertToModelMessages"
  - "file-attachment"

relatedCategories:
  - "nextjs"
  - "security"
---

# AI SDK v6 — data: URL 파일 첨부와 SSRF 방지 검증 충돌

> AI SDK v6.0.116의 `convertToModelMessages`가 파일의 `data:` URL을 다운로드하려다 SSRF 방지 검증에서 거부되는 문제와 그 우회법

## 배경

`@ai-sdk/react`의 `useChat().sendMessage({ text, files: FileList })`로 파일을 첨부하면, SDK가 내부적으로 `FileList`를 `data:` URL로 변환하여 `message.parts`에 `{ type: "file", url: "data:..." }` 형태로 저장한다.

서버 라우트에서 `convertToModelMessages(messages)`를 호출하면, file part의 `url` 필드를 모델 프로바이더에게 전달하기 위해 다운로드를 시도한다. 이때 `@ai-sdk/provider-utils`의 `validateDownloadUrl()`이 호출되어 `data:` 스킴을 거부한다.

```
Error: URL scheme must be http or https, got data:
  at validateDownloadUrl (provider-utils/validate-download-url.ts:25)
```

## 핵심 내용

### 에러 발생 경로

```
클라이언트: sendMessage({ text, files: FileList })
  → SDK: FileList → data: URL → message.parts[{ type: "file", url: "data:..." }]
  → 서버로 전송

서버: convertToModelMessages(messages)
  → file part의 data 필드에 url 값 할당
  → streamText() → 모델 프로바이더 → download() 호출
  → validateDownloadUrl() → data: 스킴 거부 → Error
```

### validateDownloadUrl의 역할

`@ai-sdk/provider-utils/src/validate-download-url.ts`에서 SSRF(Server-Side Request Forgery) 공격을 방지한다:
- `http:`, `https:` 프로토콜만 허용
- `localhost`, `.local`, 사설 IP 차단
- `data:`, `file:`, `blob:` 등 모두 거부

### 해결: 서버에서 data: URL 전처리

`convertToModelMessages()` 호출 전에 `data:` URL file parts를 전처리한다:

```typescript
function stripDataUrlFileParts(messages: UIMessage[]): UIMessage[] {
  return messages.map((msg) => {
    // file parts 중 data: URL인 것만 변환
    for (const part of msg.parts) {
      if (part.type !== "file") continue;
      if (!part.url.startsWith("data:")) continue;

      const match = part.url.match(/^data:([^;]+);base64,(.+)$/);

      if (mediaType.startsWith("image/")) {
        // 이미지: data: URL 그대로 유지 (Anthropic/OpenAI가 직접 지원)
      } else {
        // 비이미지: base64 → UTF-8 디코딩 → 텍스트 part로 변환
        const decoded = Buffer.from(base64Data, "base64").toString("utf-8");
        // → { type: "text", text: "--- filename ---\n{content}" }
      }
    }
  });
}

// 사용
const sanitized = stripDataUrlFileParts(messages);
const modelMessages = await convertToModelMessages(sanitized);
```

### 왜 이미지는 data: URL 그대로 통과하는가

`createDefaultDownloadFunction`에서 `isUrlSupportedByModel`이 `true`이면 다운로드를 건너뛴다. Anthropic/OpenAI 프로바이더는 이미지 `data:` URL을 직접 지원하므로 다운로드 시도 없이 통과한다. 비이미지 파일은 모델이 지원하지 않아 다운로드를 시도하다 실패하는 것이다.

### 디버깅 팁

- 에러 스택의 `process-ui-message-stream.ts:724`는 **클라이언트 코드**지만, 실제 에러는 **서버에서 발생**하여 error 청크로 스트리밍된 것
- `onError` 콜백의 에러 메시지로 서버/클라이언트 구분 가능
- SDK 소스의 `download-function.ts`에서 `isUrlSupportedByModel` 분기를 확인하면 모델별 동작 차이를 파악 가능

## 정리

- AI SDK의 SSRF 방지는 정당한 보안 조치이나, 클라이언트에서 생성한 `data:` URL과 충돌한다
- 서버에서 `convertToModelMessages` 전에 전처리하는 것이 가장 안전한 우회법
- 이미지는 모델이 직접 지원하므로 문제없고, 비이미지(PDF, MD 등)만 텍스트로 변환하면 된다
- SDK 버전 업데이트 시 이 동작이 변경될 수 있으므로 changelog 확인 필요
