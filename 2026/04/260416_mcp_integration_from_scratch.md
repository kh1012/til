---
draft: true
type: "content"
domain: "fullstack"
category: "mcp"
topic: "MCP 연동을 처음부터 구축하며 배운 것들"
updatedAt: "2026-04-16"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "MCP"
  - "Model Context Protocol"
  - "Notion"
  - "OAuth"
  - "Pydantic AI"
  - "FastAPI"
  - "Connector"

relatedCategories:
  - "fastapi"
  - "nextjs"
  - "jotai"
---

# MCP 연동을 처음부터 구축하며 배운 것들

> 기존 API Key 기반 Connector 구조에 MCP(Model Context Protocol) 서버 연동을 통합하고, Notion 검색까지 E2E로 동작시킨 하루.

## 배경

MAX 플랫폼에 외부 서비스 연동을 확장하기 위해 MCP를 도입했다. 기존에는 MIDAS Gen/Civil/ETABS만 API Key 방식으로 연결했는데, Notion 같은 서비스도 같은 "Connector" 개념으로 통합 관리하고 싶었다. Claude.ai가 MCP로 Notion을 연결하는 걸 보고 영감을 받았다.

## 핵심 내용

### 1. Connector와 MCP를 분리하지 않고 통합한 결정

처음에는 entities/connector와 entities/mcp-server를 별도 엔티티로 설계했다. 하지만 사용자 관점에서 둘 다 "외부 서비스에 연결하는 것"이라는 같은 개념이고, 연결 방식(API Key vs MCP)만 다르다는 피드백을 받고 통합했다.

```typescript
type ConnectorAuth =
  | { method: "api-key"; verifyEndpoint: string }
  | { method: "oauth"; provider: string; scopes: string[] }
  | { method: "none" };
```

transport와 auth를 분리한 다형 타입으로 설계하니, 새 서비스 추가 시 레지스트리에 항목 하나만 추가하면 된다.

### 2. MCP 서버 목록은 정적으로 관리

사용자가 임의로 MCP 서버를 추가하게 하면 보안 문제가 생긴다 (서버에서 임의 프로세스 실행). 사용 가능한 서비스 목록은 플랫폼이 관리하고, 사용자는 연결/해제만 한다.

### 3. Python `mcp` 패키지와 모듈 이름 충돌

백엔드에 `src/mcp/` 디렉토리를 만들었더니, `from mcp import ClientSession`이 외부 라이브러리가 아닌 우리 모듈을 참조했다. `src/mcp_integration/`으로 리네임해서 해결.

### 4. Notion Public Integration 승인 없이는 OAuth 불가

Claude.ai처럼 OAuth 팝업으로 연결하고 싶었지만, Notion은 Public Integration 심사를 통과해야 OAuth를 쓸 수 있다. 프로토타입에서는 Internal Integration Token(API Key 입력)으로 우회. OAuth 인프라(팝업, 콜백 라우트)는 미리 구현해두고 승인 후 전환하도록 설계했다.

### 5. Agent 파이프라인에 MCP Registry 주입이 핵심

MCP 서버가 연결되어 있어도, Agent의 system prompt에 도구 목록이 없으면 Agent는 MCP 도구의 존재를 모른다. 최소 변경 4개 파일로 해결:

- `deps.py`: OperatingCtx에 mcp_registry 필드 추가
- `context.py`: request.app.state.mcp_registry를 주입
- `agent.py`: request 객체를 context에 전달
- `executor_agent.py`: system prompt에 MCP 도구 목록 동적 주입

### 6. useClientApi와 Agent 모드

프론트엔드에서 `localStorage`의 `max:client-mode`가 `true`면 Claude API를 직접 호출하고 Agent 서비스를 거치지 않는다. MCP 도구는 Agent 서비스에만 있으므로, client mode OFF(Agent 모드)여야 동작한다.

### 7. Notion Integration에 페이지 접근 권한 부여 필요

Internal Integration을 만들어도 자동으로 모든 페이지에 접근할 수 있는 게 아니다. 각 페이지에서 `···` > Connections > Integration 선택으로 명시적으로 권한을 부여해야 한다.

## 구현 결과

| 커밋 | 내용 |
|------|------|
| `adc5c46` | FE Connector 리팩토링 (transport/auth 다형 타입) |
| `ec941ad` | BE MCP 인프라 (Client, Registry, REST API, 브릿지) |
| `27c9c9e` | FE OAuth 팝업 + MCP 도구 UI |
| `cf1f0fa` | Notion 연결 검증 + 모듈 리네임 + 개발자 가이드 |
| `c8da9de` | Agent 파이프라인에 MCP 도구 연결 (4파일 +26줄) |
| `22bf733` | 도구 직접 호출 엔드포인트 + 디버그 로그 |

## 정리

- 설계 논의에서 "분리 vs 통합"을 결정하는 데 시간을 썼지만, 올바른 추상화를 찾으니 구현이 깔끔해졌다
- OAuth를 완벽하게 하려다 보면 끝이 없다. 프로토타입은 API Key로 시작하고 인프라만 미리 깔아두는 전략이 효과적
- Agent가 도구를 "알게" 하는 것과 "연결하는" 것은 별개 문제. system prompt 주입이 생각보다 중요
- 모듈 이름은 외부 패키지와 겹치지 않게 주의
