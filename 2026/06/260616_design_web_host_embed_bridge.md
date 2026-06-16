---
draft: true
type: "content"
domain: "frontend"
category: "integration"
topic: "design-web를 maxflow 호스트에 임베드하기 위해 Command/Event/Pull 3채널 연동 브리지를 깔고, '데이터 100% maxflow 주입' 전제로 데이터 흐름을 못박고, project key→id 라우팅과 실서버 dev 환경까지 준비하기"

updatedAt: "2026-06-16"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "embed-bridge"
  - "host-integration"
  - "command-event-pull"
  - "data-injection"
  - "project-key-routing"
  - "bff-proxy"
  - "dev-server-orchestration"

relatedCategories:
  - "architecture"
  - "routing"
  - "devops"
---

# design-web를 maxflow에 끼우기 전에 통로와 데이터 방향부터 못박기

> design-web은 maxflow 안에 임베드할 별도 패키지다. 끼우기 전에 둘이 주고받을 통로(브리지)와 데이터의 방향을 먼저 확정하고, 호스트가 key로 프로젝트를 구동하도록 라우팅을 깔고, mock이 아니라 실제 백엔드 서버들로 로컬을 돌리는 dev 환경까지 준비했다.

## 배경

design-web은 maxflow 안에 끼워 넣을 별도의 임베드 패키지다. 워크플로우 도메인 쪽을 다지는 한 축과 별개로, 오늘의 다른 한 축은 "design-web를 maxflow 호스트에 실제로 붙이고 실데이터로 돌릴 준비"였다.

임베드는 두 코드베이스가 런타임에 맞물리는 일이라, 통로를 대충 열면 나중에 에코와 레이스, CSS 충돌 같은 문제가 표면 전체에서 터진다. 그래서 코드를 붙이기 전에 통로의 모양과 데이터의 방향을 먼저 못박는 게 오늘의 핵심이었다. 크게 세 갈래로 갔다. 호스트와 임베드 패키지 사이의 연동 브리지와 데이터 흐름 확정, 호스트가 key로 프로젝트를 구동하는 라우팅 인프라, mock 대신 실제 백엔드 스택으로 로컬을 돌리는 dev 환경이다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 서버 PC 정비, sqlite 추적 삭제
  - 추적되던 임베딩 청크 storage.sqlite를 git에서 빼고 gitignore에 추가했다. next.config 서버 설정도 함께 정리했다. mock에서 실서버 구동으로 옮겨가며, 레포에 들어와 있던 로컬 산출물을 추적에서 걷어낸 정지 작업이다.

- design-web SNB 노드·액션 라벨을 설계 흐름 기준으로 변경
  - design-web 좌측 SNB 라벨의 단일 출처를 nodes/*.ts의 label로 잡고, 설계 흐름 기준 카피로 교체했다(데이터 분석 → 설계 대상 검토, 수집/분류/단면력 → 설계 입력 정보 확인 / 설계 부재 분류 / 설계용 단면력 정리 등). SRC/Steel은 미확정이라 라벨 동일·mock 노출 유지로 미변경했고, 에러·뷰 카피의 옛 이름은 SNB 밖이라 이번 범위에서 뺐다.

- dev:full-web에 실제 백엔드 서버 연동
  - dev:full-web을 db:start만 하던 데서 db:migrate를 거치고 api·workflow-runtime·web을 병렬로 띄우도록 확장했다. mock 대신 실제 백엔드 스택을 로컬에서 같이 구동하는 쪽으로 옮긴 것이다.

- dev:full-web 병렬 실행에 sidecar 추가
  - 위 병렬 실행에 @maxflow/sidecar까지 합류시켰다. 실구동에 필요한 프로세스를 한 명령으로 모았다.

- 호스트 연동 브리지 추가
  - design-web을 호스트가 제어·구독하는 통로를 3채널로 분리했다. Command(in, 모듈 채널) / Event(out, onXxx props) / Pull(getSnapshot). inbound는 designScope 패턴(모듈 채널), outbound는 onHandler로, 기존 onHome+designScope 선례를 확장했다. 가시성은 교집합(classify ∩ 호스트, 숨기기만)으로 좁히고 override는 빈 화면 위험으로 기각했다. seedData inbound 통로만 열되 payload는 미정으로 뒀고, UI 토글은 hideNav/hideClose 평탄 prop으로, onReady로 hydrate 완료 게이트를 둬 주입 레이스를 막았다. standalone(main→App)은 무영향이고 모든 표면이 optional이라 무회귀다. 에코 가드는 command/event 분리와 store 변화분 비교로 처리했다(ref 안정화는 react-hooks 규칙 위반이라 deps를 직접 구독).

- 연동 API를 navigate로 개명 + 연동 문서 정리
  - setSelection/onSelectionChange의 "선택" 표현이 모호하다는 지적에 navigate/onNavigate로 개명해 SNB 네비게이션 의미를 명확히 했다(onStepStatusChange는 명확해 유지). .docs/를 신설해 INTEGRATION.md(통로 이동)와 DATA-MAPPING.md를 두고, 위계 대응 테이블을 박았다(scope≈project / node≈node(레벨만, 트리는 별개) / step≈action). design-web style.css가 호스트 CSS와 우선순위 충돌 없이 공존하도록 :where() 명시도 0 이유를 명기했다. DATA-MAPPING은 타겟(design-web 수신)은 코드로 확정하되, 원천(maxflow)→변환은 미정 skeleton과 결정 D1~D8로 다음 담당자에게 넘겼다.

- 연동 데이터 흐름·결정 D1/D9 보강
  - 전제를 확정했다. 임베드 패키지는 API Key가 불필요하므로 design-core 직접 호출은 0, 데이터는 100% maxflow 주입이다. standalone(무회귀)과 임베드(maxflow 주입)를 대비한 데이터 흐름 다이어그램을 추가했다. D1을 단순화해 초기 데이터(ANALYSIS 백엔드)를 seedData 주입으로 옮기며 앞서 키운 설계-프록시 과확장을 제거했고, D9를 신설해 설계 단계(dgnapi) 호출 주체를 초기 주입과 분리했다(maxflow 프록시 vs 설계만 key 주입, 미정).

- by-key 조회 진입점 추가
  - URL=key 라우팅을 위한 인프라다. 데이터 페칭은 id를 유지하고, 라우트 경계에서 key→id를 1회 해석하는 데 쓸 조회 경로를 마련했다. api/projects/by-key/[key] same-origin BFF 프록시(기존 projects/[id] 패턴 복제)와 entities/project의 getProjectByKey·byKey 쿼리·useProjectByKey를 추가했다. 아직 미사용 인프라다.

- ProjectWorkspaceProvider로 key→id 해석
  - URL의 project key를 by-key로 1회 해석해 내부 id로 노출하는 공통 provider를 도입했다. WorkflowNodeRouteShell의 projectId prop을 useProjectWorkspace로 대체했고, 폴백(미해석 시 입력값=id)을 둬서 백엔드 미적용·옛 id URL 과도기에도 안전하게 했다. 워크플로우·노드·액션 3개 page를 provider로 감싸고 projectKey를 전달한다(현재 값은 id, 디렉토리 리네임 시 key로 전환 예정).

## 정리

오늘 이 작업들의 한 줄은 "design-web를 maxflow에 끼우기 전에, 둘이 주고받을 통로와 데이터의 방향을 먼저 못박기"다.

핵심 결정은 "데이터 100% maxflow 주입"이다. 임베드 패키지는 API Key가 없으니 design-core를 직접 부르지 않고 모든 데이터를 호스트가 주입한다. 이 전제 하나가 나머지를 정렬했다. 브리지를 Command/Event/Pull 3채널로 가른 것도, 가시성을 override가 아니라 교집합(숨기기만)으로 좁힌 것도, 초기 데이터를 설계-프록시 같은 과한 확장 대신 seedData 단일 통로로 단순화한 것도, 전부 "주입 방향을 한 쪽으로 고정"한다는 같은 원리에서 나왔다. 양방향으로 열어두면 에코와 레이스가 생기니까, inbound와 outbound를 채널로 분리하고 onReady로 hydrate 게이트를 둬서 주입 순서를 강제했다.

라우팅의 key→id도 같은 결이다. 호스트는 사람이 읽는 key로 프로젝트를 가리키는데 내부 페칭은 id로 돈다. 그래서 라우트 경계에서 딱 1회 key→id를 해석하고 안쪽은 id 그대로 두는 provider를 뒀다. 변환 지점을 경계 한 곳으로 모으면 임베드든 standalone이든 안쪽 코드는 안 바뀐다. 미해석 시 입력값을 id로 보는 폴백까지 둬서 백엔드가 아직 key를 모르는 과도기에도 안 깨지게 했다. 어제부터 반복되는 "과도기를 폴백으로 흡수" 패턴이다.

dev 환경을 mock에서 실서버(api, workflow-runtime, sidecar)로 옮긴 건 이 모든 연동을 실제로 확인하기 위한 바닥 공사다. "데이터 100% maxflow 주입"을 전제로 잡았으면 그 maxflow가 실제로 돌아야 주입을 검증할 수 있다. 그래서 dev:full-web 한 명령에 실제 백엔드 스택을 다 모았다. 문서에 결정 D1~D9와 미정 skeleton을 남긴 것도 같은 맥락이다. 통로는 코드로 확정하되 원천에서 변환으로 가는 빈칸은 다음 담당자가 채우도록 계약만 박아뒀다. 어제 "placeholder를 데이터 계약으로" 쓴 발상이 오늘은 패키지 사이의 연동 문서로 한 층 올라갔다.
