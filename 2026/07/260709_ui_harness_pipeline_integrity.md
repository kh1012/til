---
draft: true
type: "content"
domain: "frontend"
category: "ui-harness"
topic: "ui-harness 리뷰 파이프라인을 믿을 수 있는 시스템으로: ui:valid 결정적 검증 게이트 신설·상태기계 블랙홀 봉쇄·결정 레코드 데이터 자산화·리뷰 데스크 데이터 유실 버그 일괄 수리·서버 원자적 write와 self-heal로 정합성 확보"
updatedAt: "2026-07-09"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "validation-gate"
  - "state-machine"
  - "data-integrity"
  - "review-desk"
  - "atomic-write"
  - "decision-record"

relatedCategories:
  - "design-system"
  - "devops"
  - "state-machine"
---

# ui-harness 리뷰 파이프라인 정합성: 조용한 유실을 구조로 막다

> AI 자율준수가 놓치는 하드룰을 기계가 잡게 ui:valid 게이트를 세우고, 결정이 흔적 없이 사라지던 상태기계 블랙홀을 봉쇄하고, 리뷰 데스크가 실패를 성공으로 위장하던 데이터 유실 버그를 새벽까지 일괄로 잡은 하루.

## 배경

ui-harness는 컴포넌트를 만드는 도구를 넘어, draft를 리뷰 데스크에서 승격·폐기·머지하고 그 결정을 원장(decisions.json)에 남겨 나중에 지표까지 뽑는 파이프라인으로 자라 있었다. 그런데 이 파이프라인이 "말은 맞는데 데이터는 어긋나는" 함정투성이였다. 하드룰(색·정합)은 사람이 외워야 지켜지고, 이미 apply된 결정을 재결정하면 원장에 모순이 공존하고, 리뷰 데스크는 서버 응답을 확인하지 않고 낙관적으로 커밋해 실패를 성공으로 위장했다. 이날의 방향은 하나였다. 사람의 성실성에 기대던 정합성을 구조와 기계로 옮겨, 리뷰 파이프라인을 믿을 수 있는 시스템으로 만드는 것. 크게 세 갈래로 진행했다. 첫째, ui:valid라는 결정적 검증 게이트를 신설해 색·정합 위반을 promote 전에 차단했다. 둘째, curate/apply/상태기계의 선정규칙과 전이를 재정의해 draft가 어느 상태에도 못 들어가는 블랙홀을 없앴다. 셋째, 리뷰 데스크 클라이언트와 dev 서버가 서로의 성공을 확인한 뒤에만 커밋하도록 데이터 유실 버그를 뿌리째 잡았다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- image-trail·morphing-dialog typecheck 오류 수리 (noUncheckedIndexedAccess 위반 65건)
  - 배열 인덱싱 결과에 non-null assertion을 붙여 packages/ui typecheck exit 2를 0으로 복구했다. wrap된 imgPosition, length 가드, 항상 존재하는 variant처럼 불변식이 보장하는 지점만 골라 런타임 동작은 그대로 뒀다. 두 draft의 history.jsonl에 수정 이력을 남겼다.

- ui:valid 결정적 검증 게이트 신설 (색·쌍정합 BLOCK, arbitrary·순흑백 WARN)
  - AI 자율준수가 놓친 하드룰 위반을 기계가 검출하게 만든 이날의 축. 대상은 본체 .tsx(primitives·demo·stories·헬퍼 제외)이고 주석은 뺀다. 유채색 hex/rgb/hsl과 entry와 파일의 정합은 exit 1로 차단하고, 순흑백·arbitrary px/rem은 경고만 낸다. 예외는 meta.tokenExceptions로만 선언하게 했다. 전수(curate)와 --name(apply promote 게이트) 두 모드를 지원한다. 규격은 docs/ui-harness/ui-valid-spec.md에 문서화했다.

- animated-tabs files[].path 실경로 정정 (쌍정합 BLOCK 해소)
  - files[0].path가 유령경로 src/animated-tabs/index.ts를 가리켜 갤러리 '수정 프롬프트'가 죽은 경로를 유도하던 것을 실체 src/tabs/animated-tabs.tsx로 정정했다. 게이트를 세우자마자 첫 실전 검출이 나온 셈이다.

- ui:valid에서 index.json 개수 정합 축 제거 (로컬 파생물이라 게이트 부적합)
  - index.json이 .gitignore 대상 로컬 파생물(한 번도 tracked된 적 없음)이라, stale은 게이트로 막을 위반이 아니라 curate가 ui:valid 전에 ui:index를 재생성해 자가치유할 대상이었다. '인덱스 불일치가 이미 커밋됨'이라는 검토 지적의 전제 오류를 실측으로 교정하고, 미사용 import·변수도 정리했다.

- ui:valid 색 BLOCK 12건 청소 (popover-list 토큰 교정 + 정당 예외 9건 선언)
  - popover-list가 이미 존재하는 dock 토큰을 hex로 지역 재정의한 것을 var() 참조로 교정했다(값 동일, 시각 불변). 토큰 대응이 없는 정당 예외는 meta.tokenExceptions에 사유와 함께 선언했다(soft-aurora WebGL uniform, chat-input 포커스링 데코 그라디언트, popover-list 화이트 오버레이 rgba). ui-valid.mjs가 rgba/hsl 전체값을 캡처하도록 개선해 예외를 정밀 매칭하게 하고 BLOCK 0을 달성했다.

- ui:valid 게이트를 curate/apply 정본에 배치
  - 게이트를 절차의 정본에 못박았다. apply promote 사전가드에 'ui:valid --name exit 1이면 promote 중단, pending 유지'를 추가하고, curate에는 전수 검증을 넣어 BLOCK 목록을 큐 항목 violations 필드로 실어 리뷰어에게 판단 재료로 넘기게 했다.

- curate 선정규칙을 시각비교에서 상태멤버십으로 전환 (병합지연 고아·TTL 도달불가 해소)
  - createdAt이 lastRunAt보다 늦은 draft만 고르던 시각 필터가, 병합 지연으로 뒤늦게 도착한(createdAt이 lastRunAt보다 이른) draft를 영영 누락시켰다(실측 고아 5건). 선정을 'status=draft이고 review-queue·decisions에 name이 없는 전부'로 바꿔 멱등하게 만들었다. 덕분에 4주 경과 draft가 TTL에 도달하지 못하던 문제도 함께 풀렸다. lastRunAt은 표시용으로만 남겼다.

- /api/health에 monorepoRoot·registryDir 노출 + curate/apply 체크아웃 정합 게이트
  - 다중 체크아웃 환경에서 갤러리(:9221)가 다른 워킹카피를 서빙하면 리뷰 결정이 엉뚱한 decisions.json에 기록되고 apply가 '결정 없음'으로 오작동하던 문제. health가 어느 체크아웃인지 노출하게 하고, curate와 apply가 결정 로드 전에 이 값을 대조해 불일치면 재기동을 안내하게 했다.

- 클론 draft에 meta.clonedFrom 필수화 + apply 가드를 실제 export 심볼 대조로 개선
  - clonedFrom이 생성 절차에 없어 pagination-draft가 net-new로 오인돼 promote 가드를 뚫던 결함. 네이밍 컨벤션에 clonedFrom을 필수로 명시하고, apply 가드를 Pascal(name) 추정 대신 이동 대상 파일의 실제 export 심볼(rg) 대조로 바꿨다. 클론은 파일명이 pagination-draft여도 export는 원본과 같은 Pagination이라, 파일명 추정으로는 충돌을 놓치기 때문이다.

- 리뷰 데스크 3버그 수리 (결정 실패 위장·수정키 오입력·되감기 큐 오염)
  - postDecision이 응답 ok를 검사하지 않고 finally에서 무조건 '기록됨'으로 처리해, 세션 전체가 무손실인 척하며 실제로는 유실되던 것을 응답 검사 후 throw하게 고쳤다. Cmd/Ctrl/Alt와 함께 눌린 키가 promote/deprecate로 오기록되던 것을 진입부 수정키 가드로 막았다. Backspace 되감기가 결정 시점과 다른 항목을 복원하던 것을, history에 결정 시점 item을 담아 그것으로 복원하게 바로잡았다.

- 상태기계 블랙홀 3건 봉쇄 (entry없는 결정 deferred·merge-candidate 큐 보존·deprecated 부활)
  - entry가 없는 결정을 apply가 no-op archived로 삼켜 병합지연 promote가 영구 소멸하던 것을, entry 존재 검증과 pending에 deferred 유지로 봉쇄했다. merge-candidate가 진입만 있고 퇴장 주체가 없던 블랙홀은 자동강등 시 review-queue 동반 등록으로 해소했다. deprecated를 되살리는(un-deprecate) 전이를 apply에 정의해 '가역' 약속을 실행 경로로 만들었다.

- 데이터 자산화 (결정 레코드 컨텍스트 보존·전이 이벤트·재사용 추천 기록)
  - 결정 레코드가 decidedBy·사유·추천·queuedAt을 버려 '추천과 결정의 일치율', 리드타임 같은 지표를 못 뽑던 것을, 결정 시 큐 항목 컨텍스트를 복사 보존하고 decidedBy(서버가 git user.name 획득)를 추가하는 방식으로 자산화했다. skip은 append-only 로그로 남기고, 승격·폐기·머지 전이도 history.jsonl에 남게 했다. 재사용 추천(신규 생성 회피)도 기록해 재사용률을 잴 수 있게 했다.

- 토큰 제안 인박스 상태역전 해소 (st.css 기준 applied/pending 자동 판정)
  - 이미 반영된 토큰이 취합본에 pending처럼 남고, 진짜 미반영 토큰은 누락되던 인박스 역전. 격리 파일에 status를 st.css의 토큰 존재 여부로 자동 판정하고 appliedCommit을 기록해, 취합본에는 pending만 수록하게 했다. 사람이 st.css에 반영하면 다음 curate에서 자동으로 applied로 빠진다.

- stories typecheck 부채 20건 청소 + 검사 지점(ui:typecheck:stories) 신설
  - stories가 tsconfig exclude라 본체와 스토리의 불일치가 안 잡혀 20건이 잠복해 있었다. tsconfig.stories.json과 전용 typecheck 스크립트로 검사 지점을 만들고 20건을 전량 수리했다(스토리만 수정, 본체 무변경). 본체 시그니처 변경 시 스토리를 동기화하라는 규칙도 GUIDE에 명시했다.

- 체크아웃 정합 게이트 대조 기준 수정 (git toplevel에서 registryDir로)
  - 앞서 넣은 'monorepoRoot === git rev-parse --show-toplevel' 대조가 항상 어긋남을 브라우저 눈검증 중 발견했다. git 레포 루트가 maxflow의 부모라 monorepoRoot와 구조적으로 불일치해 정상 케이스도 '재기동하세요'로 오작동했다. 대조를 galley가 실제 읽는 절대경로(realpath registry)로 교체해 실제 정합 축을 맞췄다.

- 리뷰 데스크 키보드 입력 안전 3건 (모달/폼 가드·e.repeat·IME)
  - onKey 가드가 input/textarea와 수정키만 봐서, 온보딩·치트시트 모달 뒤 숨은 카드에 결정 단축키가 유령 결정을 기록하던 것을 aria-modal 열림 검사로 봉쇄했다. Backspace와 결정키에 e.repeat·busyRef 가드를 넣어 키 홀드·in-flight 인터리브를 막고, 결정 단축키를 e.key에서 e.code로 교체해 한글 IME·비라틴 레이아웃에서도 동작하게 했다.

- 되감기가 서버 undo 결과를 확인한 뒤 커밋 (낙관적 '취소됨' 위장 제거)
  - undoDecision이 응답 ok를 검사하지 않고 void라, 서버가 no-op이거나 전송 실패해도 클라가 낙관적으로 '취소됨'을 커밋해 영구 불일치를 만들던 것을 수정했다. 서버 undo가 실제 제거 여부를 반환하고, 클라는 removed=true일 때만 큐를 복원·이동하고 false면 '이미 반영' 유지, throw면 '취소 실패' 토스트를 띄우게 했다.

- 재결정이 카운터·이력을 부풀리지 않게 replace 처리
  - decide에 resolved 가드가 없어, 이미 결정된 카드에 돌아가 재결정하면 이력에 같은 name이 중복 push되고 원시 카운터가 실제보다 커져 완료화면·서버와 어긋나던 것을 수정했다. 성공 경로에서 기존 이력을 splice하고 카운터를 롤백한 뒤 새 결정으로 대체해 서버 replace와 일치시켰다.

- 프리뷰 소스를 demos 우선으로 통일 (화면 간 렌더 불일치 제거)
  - 카드·리뷰 데스크는 하드코딩 previews 우선, 상세는 demo 우선이라, 같은 엔트리가 화면마다 다른 컴포넌트로 보였다. 리뷰어가 승격 대상과 다른 것을 보고 판단할 위험이라, 세 곳 모두 실제 demos 우선으로 통일하고 previews 키 네임스페이스 충돌로 인한 오매칭도 회피했다.

- 서버 견고성 (archived 조회·큐 컨텍스트 승계·원자적 write·큐 self-heal)
  - 재결정 replace가 pending만 보고 archived를 조회하지 않아, apply된 항목을 재결정하면 archived와 pending에 같은 name이 모순 공존하고 큐 컨텍스트가 유실되던 것을, archived에 있으면 409로 거부하고 큐에서 빠졌으면 기존 pending 레코드에서 컨텍스트를 승계하게 고쳤다. decisions·queue를 2회 분리 write해 중단 시 반쪽 파일이 남던 것을 tmp+rename 원자적 write로, 손상된 review-queue.json이 영구 400을 만들던 것을 파싱 try/catch self-heal로 막았다. 원장인 decisions.json은 자동 초기화하지 않고 보호했다.

- merge 대상 가드·navigate 쿼리스트링 비교
  - merge 결정이 대상 없이도 활성이라 mergeInto가 undefined인 채 감사 레코드에 저장돼 apply가 no-op/에러가 되던 것을, 클라 사전 가드와 서버 400 거부로 이중 차단했다. navigate가 pathname만 비교해 활성 검색·필터 상태에서 로고·라이브러리 링크가 리셋에 무반응이던 것도 pathname+search 전체 비교로 바로잡았다.

- 서버 low 3건 (skips dedup·바디 스트림/name 검증·decidedBy 경고)
  - 같은 name 반복 skip이 무한 누적되던 것을 최신만 남기게 dedup하고, POST에 error 리스너·바디 1MB 상한·name 필수 검증을 추가해 공유 dev 서버를 스트림 중단·무한 바디·가비지 name으로부터 보호했다. git user.name 미설정 시 결정이 익명 'unknown'으로 남는 것을 기동 시 경고로 가시화했다.

## 정리

이날의 22개 작업은 표면적으로는 흩어진 버그 수정처럼 보이지만, 하나의 명제로 관통한다. "정합성을 사람의 성실성이 아니라 구조와 기계가 보장하게 한다." ui:valid 게이트는 하드룰을 외우지 않아도 색·정합 위반을 promote 문턱에서 걷어내고, curate 선정을 상태멤버십으로 바꾼 것은 시각비교라는 사람 눈에 기댄 규칙이 만든 고아를 없앴다. 상태기계 블랙홀 봉쇄는 '어느 상태에도 못 들어가는 draft'라는 침묵의 유실 경로를 닫는 일이었다.

특히 반복해서 마주친 패턴은 낙관적 커밋의 위험이었다. postDecision·undoDecision·재결정 어디서든 클라가 서버 응답을 확인하지 않고 성공을 가정하면, 화면은 무손실인 척하면서 원장은 어긋난다. 이걸 전부 '서버의 실제 결과를 확인한 뒤에만 클라 상태를 커밋'하는 규칙으로 통일한 게 이날 데이터 무결성 작업의 핵심 축이었다. 게이트를 세우자마자 animated-tabs 유령경로가 첫 실전 검출로 나온 것, 앞서 넣은 체크아웃 대조가 실은 항상 어긋나 정상 케이스를 오작동시키던 걸 눈검증으로 잡은 것은, 검증 장치 자체도 검증이 필요하다는 걸 다시 확인시켰다. 결정 레코드를 지표 산출이 가능한 자산으로 승격시킨 것까지 더하면, 이날은 ui-harness가 '도구'에서 '믿을 수 있는 파이프라인'으로 넘어간 분기점이었다.
