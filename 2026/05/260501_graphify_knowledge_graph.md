---
draft: true
type: "content"
domain: "devops"
category: "ai-tooling"
topic: "graphify - AI 코딩 도구를 위한 코드/문서 knowledge graph"
updatedAt: "2026-05-01"

satisfaction:
  score: 4
  reason: "PoC + Phase 1 확장까지 직접 수행해 정량 결과 확보. graphify의 강점(190x→374x 절감, 5대 도메인 자동 추출)과 한계(동적 file load 추적 불가, god node degree trap) 양쪽 모두 검증함."

keywords:
  - "graphify"
  - "knowledge-graph"
  - "ast"
  - "tree-sitter"
  - "rag"
  - "ai-coding"
  - "leiden"
  - "audit-trail"
  - "honest-edges"
  - "fsd"

relatedCategories:
  - "ai"
  - "tooling"
  - "architecture"
---

# graphify — 코드/문서를 그래프로 캐싱해 AI 토큰을 아끼는 도구

> AI 어시스턴트가 매번 raw 파일을 읽지 않도록, 코드·문서·다이어그램을 미리 knowledge graph로 빌드해 두고 자연어 쿼리에 서브그래프만 넘겨주는 도구.

## 배경

AI 코딩 도구를 쓸 때마다 "auth flow가 어떻게 동작해?" 같은 질문에 어시스턴트가 raw 파일을 처음부터 다시 읽고, 같은 분석을 반복한다. 컨텍스트 윈도우가 1M까지 늘어났다고 해도 토큰 비용·응답 지연·일관성 손실은 그대로 남는다.

graphify는 이 비싼 분석을 **한 번만** 해두고, 결과를 쿼리 가능한 그래프로 디스크에 저장한다. 이후 AI 어시스턴트는 raw 파일 대신 그래프를 순회해 답을 만든다. MAX 프로젝트처럼 코드 + 설계 PDF + 디자인 다이어그램 + 회의록이 섞인 멀티모달 컨텍스트에서 특히 잘 맞을 것 같아 정리해 둔다.

## 핵심 내용

### 1. 핵심 아이디어 — RAG와의 차이

전통적 RAG는 모든 자료를 청크로 쪼개 embedding 유사도로 검색한다. 이 방식은 "누가 누구를 호출하는지", "어떤 모듈이 어떤 모듈에 의존하는지" 같은 **구조 정보**를 잃어버린다.

graphify는 자료를 graph로 보존한다.

- **노드(Node)**: 개념 — 클래스, 함수, 설계 결정, 논문 섹션, 다이어그램
- **엣지(Edge)**: 관계 — `calls`, `imports`, `rationale_for`, `semantically_similar_to`

쿼리 시점에는 자연어 질문을 받아 BFS로 그래프를 순회하고, 답에 필요한 노드/엣지만 포함한 **서브그래프**를 추출해 어시스턴트에게 넘긴다. 수십 개 파일을 읽는 대신 컴팩트한 서브그래프를 받게 되므로 토큰이 절약된다.

### 2. 3-pass 빌드 파이프라인

| Pass | 동작 | LLM 호출 | 대상 |
|------|------|----------|------|
| 1. AST 추출 | tree-sitter로 파싱 → 클래스·함수·import·call graph·docstring·주석을 결정론적으로 추출 | ❌ | 코드 파일 |
| 2. Semantic 추출 | Claude 등으로 개념·관계·설계 의도 추출 | ✅ | 문서·논문·이미지·영상 전사 |
| 3. 그래프 구축 & 클러스터링 | NetworkX 그래프로 합치고 Leiden community detection으로 엣지 밀도 기반 클러스터링 | ❌ | 그래프 전체 |

> AST(Abstract Syntax Tree)는 소스 코드를 파싱해 문법 구조를 트리로 표현한 것. 함수·변수·표현식 등이 노드가 되고, 관계가 부모–자식으로 잡힌다. tree-sitter는 이 추출을 언어별로 결정론적으로 처리해 주기 때문에 LLM 호출이 필요 없다.

흥미로운 점은 **vector DB나 embedding을 안 쓴다**는 것. 그래프 토폴로지 자체로 클러스터링한다(Leiden 알고리즘). embedding 비용·차원 저주·임베딩 모델 변경 시 재빌드 같은 부담이 사라진다.

### 3. 쿼리 사용법

```bash
graphify query "what connects Attention to the optimizer?"
graphify query "show the auth flow" --budget 1500
graphify query "what connects DigestAuth to Response?" --dfs
```

출력에는 노드 라벨, 엣지 타입, confidence 점수, 소스 파일 위치가 포함된다. 그대로 어시스턴트에게 붙여넣고 "이 그래프 출력으로 답해줘"라고 하면 된다.

### 4. Edge provenance — 신뢰도 추적

모든 엣지에 다음 태그가 붙는다.

- `EXTRACTED` — 코드/문서에서 직접 추출
- `INFERRED` — LLM이 문맥으로 추론
- `AMBIGUOUS` — 여러 해석 가능

여기에 confidence 점수까지 붙기 때문에 **"찾아낸 사실"과 "추측"을 구분**할 수 있다. AI 출력이 어디서 나왔는지 추적해야 하는 환경에서 중요한 부분.

### 5. Multi-modal 그래프

다이어그램 노드 ↔ 코드 클래스 노드 ↔ 논문 섹션 노드가 같은 그래프에서 연결된다. PDF, 화이트보드 사진, 영상(Whisper 전사) 모두 입력으로 들어간다.

### 6. 증분 업데이트 & Privacy

- `--watch` 모드: 파일 변경 감지 → 코드는 AST만 즉시 재빌드(LLM 호출 없음), 문서/이미지는 알림 후 수동 재추출
- 코드 raw 파일은 모델로 안 보냄. 문서/다이어그램의 semantic description만 어시스턴트의 모델로 전달

### 7. 성숙도 — 아직 실험 단계

2026년 4월 3일 런칭한 신생 프로젝트(v0.4.2). API와 출력 포맷이 버전 간 변경될 수 있어 **미션 크리티컬한 파이프라인엔 아직 이른 단계**.

## MAX 프로젝트 적용 제안

MAX(Next.js 16 + React 19 + Electron 하이브리드, AI 구조공학 어시스턴트)는 graphify가 잘 맞을 만한 조건을 갖췄다.

### 적합한 이유

1. **멀티모달 컨텍스트** — 코드 + 설계 PDF(구조공학 자료) + 디자인 토큰 문서(`DESIGN.md`) + 다이어그램이 섞여 있다.
2. **명확한 아키텍처 레이어** — FSD(Feature-Sliced Design)로 `app → widgets → features → entities → shared`의 import 방향이 강제되어 있어 call/import graph가 깔끔하게 빌드된다.
3. **Living Docs 풍부** — `docs/00-reference/`에 `api-tier-map.md`, `ai-sdk-usage.md`, `sse-chunk-contract-map.md` 같은 의도 문서가 있어 semantic 추출 가치가 높다.
4. **PDCA 워크플로우** — `/pdca plan/design/do/analyze/report` 산출물이 `docs/02-design/`, `docs/03-analysis/` 등에 쌓인다. 이걸 그래프로 묶으면 "이 기능의 설계 의도가 어디 있더라" 추적이 쉬워진다.

### 단계별 도입 시나리오

#### 1단계 — 코드 그래프만 빌드 (저위험)

```bash
graphify init src/
graphify build src/ --code-only --watch
```

- LLM 호출 없이 AST만 추출. 비용 0.
- FSD 레이어 간 import 위반 탐지에 활용 가능 (eslint와 보완 관계).
- `/max-pm` 감사 시 R-rule 위반을 그래프 쿼리로 빠르게 찾기.

#### 2단계 — Living Docs 통합

```bash
graphify ingest docs/00-reference/
graphify ingest DESIGN.md
graphify ingest docs/02-design/
```

- API Tier(client/agent/core) 매핑이 코드 노드와 연결됨.
- "이 컴포넌트는 어떤 API Tier를 통하지?" 같은 질문이 그래프 쿼리로 해결.

#### 3단계 — 멀티모달 (구조공학 자료)

- 구조공학 PDF·다이어그램 ingest.
- 도메인 개념 노드 ↔ 코드 entities 노드 연결.
- AI 어시스턴트가 도메인 의도를 이해한 채 코딩하도록 유도.

### 구체적인 활용 케이스

| 시나리오 | 기존 방식 | graphify 도입 후 |
|---------|---------|----------------|
| `/max-pm` 감사 | 전체 src 스캔 | 그래프 쿼리로 R-rule 위반 노드만 추출 |
| `/pdca plan` 컨텍스트 수집 | 관련 파일 수동 Read | 서브그래프 1회 쿼리 |
| AI SDK 마이그레이션 | `ai-sdk-usage.md` + 사용처 일일이 grep | "AI SDK feature가 사용된 위치 + 공식 문서 링크" 서브그래프 |
| 구조설계 인터렉션 패널 설계 | 구조공학 PDF 따로, 코드 따로 | 도메인 개념 ↔ entities 연결 서브그래프 |

### 도입 시 주의사항

- **v0.4.2 신생 프로젝트** → 빌드 산출물(`.graphify/` 등)을 `.gitignore`에 넣고 개인 캐시로만 사용.
- 코드 검색만이라면 ripgrep + ctags가 더 빠를 수 있음. **multi-modal · semantic 의도 추출이 필요할 때**가 진짜 도입 시점.
- LLM 호출 비용은 semantic 추출 단계에서 발생. 처음 ingest할 때 한 번 큰 비용, 이후 incremental.

## 정리

graphify의 핵심은 "**raw 파일을 매번 읽지 마라, 한 번만 분석해서 graph로 캐시해라**"라는 발상이다. RAG가 임베딩 유사도로 자료를 찾는 반면, graphify는 **구조와 관계를 보존**한다. AST만으로도 결정론적인 코드 그래프가 나오고, 거기에 LLM으로 추출한 semantic 노드가 얹히면 multi-modal 그래프가 된다.

MAX 프로젝트는 멀티모달 자료(코드 + 구조공학 PDF + 디자인 토큰 + AI SDK 문서) + 명확한 FSD 아키텍처 + 풍부한 Living Docs라는 조건이 모여 있어 graphify가 잘 맞을 가능성이 높다. 다만 v0.4.2 신생 프로젝트라 운영 경로(공식 워크플로우)에 바로 넣지 말고, **먼저 코드 그래프만 빌드해서 `/max-pm` 감사 보조 도구로 한정 실험**하는 게 안전한 시작점.

토큰 절감보다 더 큰 가치는 **"AI 어시스턴트에게 일관된 도메인 모델을 주입하는 것"** 일 수 있다. 매 세션마다 컨텍스트를 다시 만들지 않고, 프로젝트 전반에 걸친 통합 그래프를 공유 자산으로 두는 그림.

### 다음에 시도해 볼 것

- [x] graphify CLI 설치 후 `src/widgets/` 한정으로 코드 그래프만 빌드해 보기 → **PoC 합격, 190x 절감**
- [x] `src/` 전체로 Phase 1 확장 → **374x 절감, 비용 ~$0.01**
- [ ] 빌드 결과에서 FSD import 방향 위반이 잡히는지 검증 → **부분 검증** (간접 의존 패턴 가시화 OK, 직접 위반 탐지는 ESLint와 보완 관계)
- [ ] `DESIGN.md` ingest 후 "디자인 토큰을 사용하는 컴포넌트" 쿼리 시도 → 미진행
- [ ] 토큰 절감 효과를 `/max-pm` 한 번 실행 기준으로 정량 측정 → 미진행
- [ ] `T()` vs `useTranslation()` 통합 검토 (god node 분석에서 발견)
- [ ] Phase 3 Living Docs ingest 시 chunk 전략 변경 (md + 같은 디렉토리 .ts 동반)

---

## 실제 적용 결과 (2026-05-01)

### 적용 환경

- 설치: `uv tool install graphifyy` (v0.5.7)
- 대상: MAX frontend-3 프로젝트 (`tools/graphify-poc/` 작업 디렉토리)
- Phase 1 PoC: `src/widgets/` (298 files) → 합격
- Phase 1 확장: `src/` 전체 (1,693 files) → 완료

### 정량 결과

| 항목 | widgets PoC | src/ 전체 |
|------|------------:|----------:|
| 파일 수 | 298 | 1,693 |
| 단어 수 | 71K | 440K |
| 노드 / 엣지 | 606 / 401 | 3,661 / 2,912 |
| Communities | 245 | 1,331 |
| 빌드 시간 | ~3분 | ~10~15분 |
| **토큰 절감** | **190x** | **374x** |
| Avg query | 501 토큰 | 1,570 토큰 |
| LLM 비용 | $0 (code-only fast path) | ~$0.01 (1 subagent) |
| 쿼리 응답 | 0.35초 | 0.36~0.38초 |

→ corpus가 클수록 **상대 절감률이 더 커짐**. naive하게 코드 전체를 읽으면 587K 토큰, graph 쿼리는 1.5K로 충분.

### 핵심 학습 1 — God node degree만 보면 속는다

| 노드 | degree | 검증 결과 |
|------|------:|----------|
| `useTranslation()` | 93 | ✅ **진짜 cross-cutting hub** — features 218 / widgets 170 / shared 88 / entities 71 / app 3 → 4 슬라이스 모두에 분포. 93 distinct files. |
| `구조계산서 문서 작성 가이드` | 16 | ❌ **가짜 hub** — md 파일 자기 자신의 16개 섹션 self-references. 외부 코드와 cross-edge 0개. component size = 26 (md 25 + svg 1)로 **격리된 component**. |

> **graphify의 honest audit trail (EXTRACTED/INFERRED/AMBIGUOUS + confidence_score)을 직접 검증하지 않으면 잘못된 결론에 도달할 수 있다.** degree 숫자만 보지 말고 `nx.node_connected_component`로 component 분포를 항상 확인할 것.

### 핵심 학습 2 — graphify의 한계

`document-template-tools.ts`가 `structural_calculation_report.md`를 `fs.readFileSync('*.md')`로 동적 로드하는 것이 명백한데, graphify는 이 연결을 **0개도 발견 못함**. 두 가지 이유:

1. **AST 한계**: tree-sitter는 .ts 파일에서 동적 file load를 정적으로 추적하지 못함 (string literal로 들어간 path를 의존성으로 인식 안함).
2. **Semantic chunk 분리**: PoC에서 md/svg만 단독 chunk로 처리하니, 같은 디렉토리의 코드 .ts와 함께 보지 못해 cross-reference 추출 기회 자체가 없었음.

→ Phase 3 Living Docs ingest 시 **chunk를 디렉토리 단위로 묶기**가 필요. 또는 `--mode deep`으로 INFERRED 추출 적극화. 또는 코드 안 dynamic load 패턴을 정규식으로 보강 추출하는 별도 단계.

### 핵심 학습 3 — graphify가 발견한 실제 도메인 구조

src/ 전체 그래프의 상위 10개 community가 MAX의 **실제 5대 핵심 시스템**과 일치:

| Community | size | 도메인 |
|----------:|----:|--------|
| C0 | 269 | Structural Calculations (Beam, Column, Connection 등) |
| C1 | 148 | Tool Activity & Notebook Chips |
| C2 | 66 | Lexical Editor System |
| C3 | 63 | Chat API Routes |
| C4 | 60 | HITL & Document Library |
| C5 | 54 | Cell Graph Engine |
| C6 | 48 | Eval Engine |
| C7 | 48 | Message Steps Processor |
| C8 | 42 | Local Repositories |
| C9 | 32 | Scroll Policy Hooks |

→ **30분 미만의 PoC로 프로젝트 전체 도메인 지도를 자동 추출**. 신규 멤버 온보딩 자료로 즉시 활용 가능.

### 의사결정 체크리스트 — graphify를 운영에 도입할 것인가?

| 질문 | 답 |
|------|---|
| 도메인 지도 자동 생성이 필요한가? | ✅ — 5대 시스템을 자동 클러스터링 |
| AI 어시스턴트 토큰 절감이 절실한가? | ✅ — 374x 절감 입증 |
| 코드/문서/다이어그램 multi-modal 환경인가? | ✅ — MAX는 PDF + 코드 + DESIGN.md + 다이어그램 혼재 |
| god node degree를 그대로 신뢰할 수 있는가? | ❌ — 항상 confidence/component 검증 필요 |
| 동적 file load 추적이 중요한가? | ❌ — graphify로는 못 잡음, 보강 필요 |
| v1.0 안정화 전인가? | ⚠️ — v0.5.7, 운영 경로 미적용 권장 |

→ **결론**: PoC/탐색/보조 도구로 즉시 도입 가치 있음. 운영 워크플로우 정식 통합은 v1.0 이후로 보류.

### 운영화 전 가드레일

- 빌드 산출물은 `.gitignore` 처리 (`graphify-out/`, `.graphify_*`)
- god node 발표 전 `nx.node_connected_component` + cross-slice 분포로 검증 필수
- INFERRED/AMBIGUOUS 엣지는 confidence_score < 0.5면 우선 검수
- LLM 비용 캡 설정 (semantic 추출 단계에서만 발생)

### 참고 자료

- 본 TIL의 1차 조사는 Claude로 수행. 출처는 graphify 공식 문서·런칭 블로그(2026-04-03 공개)와 사용자 사례 글들.
- 실제 적용은 2026-05-01에 본인이 직접 PoC + Phase 1 확장 수행. 정량 결과는 모두 자체 측정값.
- 실제 사용 전 공식 저장소·문서에서 v0.5.7 기준 API와 출력 포맷을 직접 확인할 것 (버전 간 변경 가능성 있음).
