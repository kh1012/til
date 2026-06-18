---
draft: true
type: "content"
domain: "frontend"
category: "code-quality"
topic: "787개 파일 대상 구조적 리스크 분석 결과를 심각도와 수정 비용 순으로 3단계(빠른 수정, 구조 수정, 아키텍처 수정)로 끊어, 조용한 실패를 드러내고(Promise.allSettled·에러 로그·env 경고), 타입 우회를 실제 검증으로 바꾸고(state as any 제거·locale 런타임 검증), setInterval 경쟁 조건과 FSD 역방향 의존을 푼 뒤 단계별 수정 로그로 취합하기"

updatedAt: "2026-06-18"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "risk-remediation"
  - "promise-allsettled"
  - "silent-failure"
  - "setinterval-race"
  - "type-cast-removal"
  - "fsd-layer-violation"
  - "severity-ordering"

relatedCategories:
  - "typescript"
  - "error-handling"
  - "architecture"
---

# 구조적 리스크를 심각도순 3단계로 끊어 수정하기

> apps/web 787개 파일을 훑은 리스크 분석 결과를 받아, 항목들을 심각도와 수정 비용으로 정렬해 빠른 수정, 구조 수정, 아키텍처 수정의 3단계로 끊어 처리했다. 관통하는 주제는 둘이었다. 하나는 조용히 삼켜지던 실패를 보이게 만드는 것이고, 다른 하나는 타입과 의존 경계를 우회 대신 사실에 맞추는 것이다. 모든 수정은 단계별 로그 한 파일에 누적해 어떤 리스크를 왜 어떻게 고쳤는지 추적 가능하게 남겼다.

## 배경

apps/web의 TypeScript/TSX 787개 파일을 대상으로 구조적 리스크를 분석한 원본(risk-analysis.md)이 먼저 있었다. 거기서 나온 항목들은 심각도로 C(Critical), H(High), M(Medium), L(Low)로 분류돼 있었다. 한 번에 다 고치려 들면 성격이 제각각인 변경이 한 덩어리로 섞여 리뷰도 회귀 추적도 어려워진다. 그래서 심각도와 수정 비용을 함께 보고 3단계로 끊기로 했다. 한 줄짜리로 끝나는 빠른 수정을 1단계, 동작 구조를 손대는 수정을 2단계, 레이어 경계를 옮기는 아키텍처 수정을 3단계로 뒀다. 그리고 각 단계 수정 내역을 260618-risk-fix-log.md 한 파일에 무엇을·왜 형식으로 누적해, 나중에 이 변경들이 어떤 리스크 항목에 대응하는지 거꾸로 추적할 수 있게 했다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 구조적 리스크 1단계 수정 (빠른 수정)
  - 한 줄에서 몇 줄로 끝나면서 효과가 큰 항목 넷을 먼저 처리했다. C1은 파일 업로드 루프의 Promise.all을 Promise.allSettled로 바꿨다. Promise.all은 첫 rejection에서 즉시 throw해서, 콜백 바깥에서 예외가 나면 그 시점 이후 업로드 결과가 summary에 기록되지 않고 trace 기록도 건너뛴다. allSettled는 모두 완료될 때까지 기다리므로 한 파일 실패가 나머지 업로드를 끊지 않는다. H1은 BlockEditor의 save·download 호출에 붙어 있던 .catch(() => {})를 에러 로그로 바꿨다. 실패를 완전히 무시하면 저장·다운로드가 실패해도 아무도 모른다. H4는 ETABS MCP 환경변수가 누락되면 조용히 null을 반환하던 자리에 console.warn을 넣었다. 프로덕션에서 env가 비면 ETABS 도구 전체가 사라지는데 단서가 없던 문제다. M2는 locale params를 as Locale로 단순 캐스팅하던 걸 routing.locales.includes() 런타임 검증으로 바꾸고, 유효하지 않으면 defaultLocale로 폴백하게 했다.

- 구조적 리스크 2단계 수정 (구조 수정)
  - 동작 구조를 손대야 하는 둘을 처리했다. H2는 midas 연결 하트비트의 setInterval 경쟁 조건이었다. effect deps에 snapshot?.connection_mode가 들어 있어서, checkStatus가 성공할 때마다 persistSnapshot이 snapshot을 교체하고, 그게 effect를 재실행시켜 interval을 다시 시작하는 루프가 생겼다. 이전 interval이 cleanup되기 전에 새 interval이 도는 경쟁이다. deps에서 connection_mode를 빼고, 가드 조건은 매 렌더마다 동기화되는 별도 effect가 채워주는 snapshotRef.current로 교체해 최신 값은 유지하되 루프는 끊었다. H3은 BlockEditor에서 ProseMirror state를 통째로 as any 캐스팅하던 걸 제거했다. getState()가 이미 EditorState를 반환하므로 state.doc, state.tr, state.doc.content.size 전부 타입 검증을 받게 됐다. 다만 descendants 콜백 클로저 안에서 변이되는 sourceNode는 TypeScript 5.9의 제어 흐름 분석이 클로저 내 변수 변이를 추적하지 못해, 최소 범위로만 any를 남기고 그 한계를 주석으로 명시했다.

- 구조적 리스크 3단계 수정 (아키텍처 수정)
  - 레이어 경계를 옮기는 C2를 처리했다. shared/lib/permission/use-permission.ts가 features/auth-session을 참조하고 있었는데, 이는 shared가 features를 가리키는 FSD 단방향 원칙(features → shared) 위반이다. sessionAtom과 UserSession 타입을 features/auth-session/model에서 shared/lib/auth/session-atom.ts로 옮겼다. 이게 가능했던 건 sessionAtom의 의존성(SESSION_STORAGE_KEY, atomWithStorage)이 이미 shared에 있어 이동에 외부 결합이 없었기 때문이다. features 쪽 원래 파일은 shared를 re-export하도록 바꿔서, views·widgets·app/api의 기존 소비자 코드는 한 줄도 안 고치고 그대로 동작하게 했다. 결과적으로 파급은 3개 파일 변경에 그쳤다.

## 정리

오늘 오후를 관통하는 한 줄은 "조용한 실패를 보이게 하고, 우회를 사실에 맞추기"다.

1단계 넷은 표현만 다르지 같은 병이었다. 실패가 조용히 사라지는 것. Promise.all은 한 파일 실패가 나머지를 통째로 끊으면서도 기록을 남기지 않았고, .catch(() => {})는 저장 실패를 통째로 삼켰고, env 누락은 도구 전체를 소리 없이 없앴다. 셋 다 고친 방향은 같다. 실패를 끊지 않거나(allSettled), 최소한 로그로 드러내거나(에러 로그·env 경고). 디버깅에서 가장 비싼 건 틀린 동작이 아니라 보이지 않는 동작이라, 보이게 만드는 것만으로도 절반은 갚인다.

2단계와 3단계는 우회를 사실로 바꾸는 일이었다. M2의 as Locale와 H3의 state as any는 둘 다 타입 시스템에게 거짓말을 시켜 검증을 끄는 캐스팅이었다. 런타임 검증과 정직한 타입으로 바꾸니 잘못된 입력이 실제로 걸러진다. H2는 deps에 사실이 아닌 의존(매번 교체되는 객체)을 적어 둔 게 경쟁을 낳았고, ref로 옮겨 "최신 값은 필요하지만 재실행 트리거는 아니다"라는 진짜 관계를 표현했다. C2도 같은 결이다. shared가 features를 가리키는 건 의존 방향에 대한 거짓이었고, atom을 제자리(shared)로 옮겨 방향을 사실로 되돌렸다. re-export 덕에 소비자 무수정으로 끝난 건, 옮길 것이 원래 그 자리에 있었어야 했다는 방증이기도 하다.

단계를 심각도와 비용으로 끊은 것도 의도였다. 한 줄 수정과 레이어 이동을 한 커밋에 섞으면 리뷰어가 위험도를 가늠하기 어렵다. 빠른 수정, 구조 수정, 아키텍처 수정으로 나누고 각각을 로그에 무엇을·왜로 남기니, 변경의 무게가 단계 이름에서 바로 읽힌다. M1(demo 하드코딩), M3(저장 재시도), L1(Error Boundary), L2(생성 타입 부채)는 선행 설계나 연동이 필요해 보류로 명시하고 남겼다. 고치지 않은 것을 적어두는 것도 분석 결과를 추적 가능하게 닫는 일부다.
