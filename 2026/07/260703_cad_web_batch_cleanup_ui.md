---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "cad-web BatchCleanup 화면의 검토 큐를 packages/ui MessageStack으로 이관하고, 표면(surface) 토큰을 통일하며, 일괄편집 v2 계약(삭제·수정·생성)과 AI 자연어 규칙 입력을 UI까지 연결한 하루의 정합 기록"
updatedAt: "2026-07-03"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "message-stack"
  - "review-queue"
  - "batch-rule-panel"
  - "surface-token"
  - "framer-motion"
  - "layoutId"
  - "design-token"
  - "chat-input"

relatedCategories:
  - "react"
  - "css"
  - "typescript"
---

# cad-web BatchCleanup 화면: 검토 큐 MessageStack 이관과 일괄편집·AI 입력 UI 정합

> cad-web 도면정리(BatchCleanup) 화면의 검토 큐를 정적 마크업에서 공용 MessageStack 컴포넌트로 옮기고, 표면 토큰을 st-border/st-background로 한 계통으로 통일하면서, 병합만 돼 있던 일괄편집 v2 계약과 AI 자연어 규칙 입력을 실제 UI 동작까지 이어붙인 하루.

## 배경

cad-web BatchCleanup 화면에는 크게 두 축의 UI가 있다. 하나는 검출된 항목을 그룹으로 접었다 펴는 검토 큐(ReviewQueue), 다른 하나는 자연어나 콤보로 규칙을 만들어 일괄 적용하는 규칙 패널(BatchRulePanel)이다. 어제까지 이 화면은 정적 마크업으로 즉시 토글되는 수준이었고, 백엔드 쪽에는 삭제만이 아니라 수정·생성까지 담은 일괄편집 v2 계약이 병합돼 있었지만 UI가 삭제 전용에 머물러 있었다.

오늘의 큰 줄기는 이 화면을 공용 컴포넌트 위로 끌어올리면서 정합을 맞추는 것이었다. 검토 큐를 packages/ui의 MessageStack(알림 스택 기법: layoutId 공유요소 + 스프링 + stagger)으로 교체하고, 그 과정에서 접힘/펼침 카드의 테두리·배경 톤이 서로 어긋나는 문제를 표면 토큰으로 수렴시켰다. 동시에 규칙 패널은 v2 계약을 UI까지 연결하고, 규칙 추가에 머물던 흐름을 AI 자연어 입력 Enter 시 곧바로 실행되는 흐름으로 바꿨다. 하루의 상당 부분이 색·테두리·애니메이션이 미묘하게 어긋나는 지점을 근본 원인까지 파고 통일하는 데 들어갔다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- ReviewQueue 그룹 접힘/펼침을 MessageStack으로 교체
  - 정적 마크업(즉시 토글, 무애니메이션)을 @maxflow/ui의 MessageStack.Root/Peek/List/Item/CollapseButton으로 교체했다. motion.dev 알림 스택 기법(layoutId 공유요소 + spring + stagger)을 적용하고 variant는 fade(동일 크기, 뒤로 갈수록 옅어짐)로 뒀다. 칩 디자인을 raw hex 대신 Storybook 데모 기반(Badge danger/default sm + 좌측 점)으로 바꾸고, 그룹 카운트·항목 번호 배지, renderItem 카드 테두리도 하드코딩 hex 대신 st-muted/st-border 토큰으로 통일했다. renderItem이 바깥 li를 직접 만들지 않고 카드 내용만 반환하도록 바꿔 li·layoutId·애니메이션을 호출부 MessageStack.Item이 담당하게 했다. 선택 항목 scrollIntoView는 Item에 새로 추가한 forwardRef로 연결.

- InspectorPanel/BatchRulePanel 디자인 정합화
  - packages/ui에 Composite(Selector, SelectorButton, ChatInput)를 신설해 ToggleSelector와 톤(gray/default variant, h-7 셸)을 통일했다. SelectorButton 외곽 div가 inline-flex라 flex-1 부모 폭을 못 채우던 버그를 w-full로 잡았다. BatchRulePanel의 다이나믹 아일랜드 모프는 공유 layoutId + framer-motion layout(AnimatedTabs SLIDE와 동일 스프링 재사용)으로 구성했다. 시리 글로우를 시도했다가 요소 rotate 시 넓은 박스에서 모서리 스윕 버그를 발견해 폐기하고, ChatInput 자체 포커스 빔(mask+blur+position 슬라이드)으로 대체했다. Button에는 배경/보더 없이 muted→foreground 텍스트만 전이하는 text variant를 추가했다. 이 과정에서 이중 i18n 소스 함정을 만났다: cad-web defaultMessages.ts만 고치면 실제 앱에 미반영되고 apps/web/messages/{ko,en}/cad-web.json도 함께 동기화해야 한다는 점을 확인했다.

- MessageStack 카드 표면 옵션에 border 없는 fill 추가
  - MessageStack.Peek에 surface prop(기본 border, 신규 fill)을 넣었다. fill은 테두리·그림자 없이 st-muted 배경만 쓰고 hover는 st-border로 한 단계 진하게. cad-web ReviewQueue의 접힘 대표 카드와 펼친 개별 카드에 바로 적용해 ?mock 플레이그라운드로 확인했다.

- SVG 프리미티브 렌더에서 key가 spread props에 섞이던 경고 제거
  - entityGeom.tsx primitive()의 common 객체(line/polyline/polygon/circle 등 8곳 공용)에 key가 든 채로 {...common} spread되어, 씬의 모든 엔티티마다 "key prop is being spread into JSX" 경고가 반복됐다. key를 common에서 분리해 각 태그에 key={key}로 직접 전달하도록 고쳐 콘솔 에러를 0건으로 만들었다.

- 검토 큐 패널을 하단까지 채우도록 flex 구조 수정
  - ReviewQueue에 flex-1만 줘도 하단까지 안 채워지던 원인은 부모 체인이 flex가 아니었기 때문. InspectorPanel의 스크롤 div·section·mt-2 div가 전부 block이라 flex-1이 걸릴 곳이 없었다. 이 3곳을 flex flex-col(+min-h-0)로 전환하고 ReviewQueue 루트에 h-full을 붙여 해결했다.

- MessageStack fill 표면을 st-background로 통일
  - Peek 메인 버튼 fill을 st-background(흰색)로 바꿨는데 뒤에 겹친 레이어 2장이 st-muted로 남아 접힘 상태에서 색이 어긋났다. 겹침 레이어도 st-background로 맞추고, ReviewQueue 펼친 개별 카드(비선택)도 같은 톤으로 맞춰 Peek→Item 공유요소 전환 시 색 불일치가 없게 했다. 리스트를 감싸는 배경 웰(st-muted)은 흰 카드와 대비를 주므로 그대로 뒀다.

- MessageStack.Item에 opt-in surface(border+fill) 프리셋 추가
  - Peek의 border/fill 표면 개념을 Item까지 확장했다. MessageStackPeekSurface를 MessageStackSurface로 일반화해 Peek·Item이 공유하게 하고, Item은 surface를 생략하면 지금처럼 완전 무스타일(기존 ReviewQueue 호환)이고 명시할 때만 li 자체에 rounded 테두리 프리셋이 깔리게 했다. className은 cn()으로 뒤에 병합되어 개별 유틸리티로 오버라이드가 가능하다.

- ReviewQueue 펼친 카드를 MessageStack.Item surface="border"로 이관
  - Item에 onClick prop을 추가하고 surface 프리셋에 h-[92px] w-full을 포함시켜 Peek와 치수를 맞췄다(layoutId 공유요소 전환 시 어긋나지 않도록). renderItem은 이제 내부 레이아웃만 반환하고 카드 테두리/배경/치수/클릭은 Item이 담당한다. 선택 상태는 className으로 border 오버라이드, 클릭은 카드 패딩 영역까지 반응하도록 outer li로 옮겼다.

- 리뷰 아이템 hover 테두리를 st-muted에서 st-border로 교체
  - st-muted(L=0.97)가 카드 배경·웰 배경과 밝기 차이가 거의 없어 hover해도 경계가 안 보였다. 실제 테두리용으로 만들어진 더 어두운 st-border(L=0.922)로 교체해 hover 시 테두리가 뚜렷하게 보이도록 했다.

- AI 모드 전환을 순차 fade로 교체하고 포커스 빔 halo 제거
  - 다이나믹 아일랜드(layoutId 공유 크로스페이드)가 겹쳐 보여 어색하다는 피드백을 받아, leftPhase/rightPhase 명시적 단계 상태머신으로 교체하고 onAnimationComplete로만 다음 단계로 진행하게 했다(겹침 없이 하나가 끝난 뒤 다음 시작). AI 진입은 SelectorButton 축소+fade-out → 축소 원형 fade-in → 채팅 입력창 → 전송 버튼 순 3단, 이탈은 반대 순서. ChatInput 포커스 빔의 halo(blur) 레이어가 어색하다는 피드백에는 halo를 제거하고 테두리에 붙는 core 링만 남겼다.

- 리뷰 아이템 기본 테두리를 st-border로, hover는 st-ring으로
  - 기본을 border-transparent(hover에만 보임)에서 항상 보이는 border-st-border로 바꾸고, hover는 인접한 더 어두운 중립 토큰 st-ring(L=0.708)으로 한 톤 진하게 했다.

- 접힘 Peek 카드도 surface=border로 통일
  - Peek이 surface="fill"(무테두리)로 남아 접힘/펼침 상태의 테두리가 서로 달랐다. Peek도 border로 맞춰 st-border 테두리가 양쪽 일관되게 보이도록 했다.

- 중심선 그리기 고급설정 팝오버 다크 톤 통일
  - 고급설정 팝오버만 라이트모드로 보이던 문제. 팝오버 자체는 variant=default로 다크 오버라이드가 적용되지만, 내부 ParamsForm이 오버라이드 대상이 아닌 토큰(st-background/st-card/st-foreground)을 써서 앰비언트 라이트 테마가 그대로 노출됐다. bg-st-background→bg-st-muted, bg-st-card/text-st-foreground→bg-st-popover/text-st-popover-foreground로 교체해 팝오버 로컬 오버라이드에 편입시키고, localhost 데모 스크린샷으로 다크 톤 일치를 확인했다.

- 메시지 스택 목록 영역에 y축 스크롤 추가
  - 그룹 목록을 감싼 div에 flex-1 min-h-0 overflow-y-auto를 줘, 스택이 늘어나도 탭바·안내 배너는 고정된 채 이 영역만 세로 스크롤되도록 했다. 부모(캔버스 배경 wrapper)에도 min-h-0을 추가해야 flex 자식이 콘텐츠 크기로 안 늘어나고 실제로 줄어든다. DOM 강제 축소 테스트로 scrollHeight>clientHeight 시 정상 스크롤을 확인했다.

- 팝오버 포매팅 정리 및 ToolDock 여백 조정
  - 미커밋 3개 파일이 이번 세션이 아닌 다른 동시 세션 작업으로 보여 커밋 여부를 확인한 뒤 그대로 커밋하기로 했다. tsc --noEmit(cad-web, ui)은 통과. ReviewQueue 기존 코드(이번 diff 밖)에서 flex-flex-col 오타를 발견했지만 범위 밖이라 미수정으로 남겨 기록만 했다.

- BatchRulePanel에 v2 일괄편집 계약(삭제·수정·생성) 반영
  - 병합 때 애니메이션 UI를 유지하느라 삭제 전용으로 남겨둔 패널에, 이미 병합돼 있던 v2 모델·커맨드(RuleResult update/add, applyBatchEdits, ghost 미리보기)를 UI까지 연결했다. 삭제 예정 선만 보던 걸 touchedIdSet(삭제∪수정)으로 확장하고, 캔버스 미리보기에 삭제(빨강) 외에 생성·수정 위치를 초록 고스트로 표시하도록 했다. handleApply를 deleteEditLines→applyBatchEdits로 교체해 삭제+수정+생성을 단일 undo로 적용. 결과 카드에 건수 요약을 넣고, 순수 생성처럼 항목 리스트가 없는 경우엔 "아래 항목" 문구를 감춰 문구-내용 불일치를 없앴다(검증 지적 반영). 3렌즈 적대적 리뷰로 v2 경로가 origin/main과 의미 동등하고 통합 회귀가 없음을 확인했다.

- cad-web-adapter import 정렬 정리(update)
  - CadApi/CadWebMessages/DrawingInputState 타입 import 순서와 mock 경로 삼항식 들여쓰기를 포매터 기준으로 정리한 소소한 정합 커밋.

- BatchCleanup 규칙↔AI 슬롯 전환 애니메이션 매끄럽게 개선
  - 가짜 scaleX(transform)로 접었다가 DOM 스왑 시 layout 스프링으로 진짜 폭까지 다시 튀던 2단 점프를 제거했다. 4비트 순차 상태머신(leftPhase/rightPhase)을 aiMode 불리언 하나로 축소하고, 좌·우 슬롯 래퍼에 framer layout을 줘 실제 레이아웃 폭을 한 번의 스프링으로 잇게 했다. 슬롯을 relative overflow-hidden으로 감싸 popLayout 크로스페이드 중 나가는 요소를 슬롯 폭 안에 가둬(행 번짐·줄바꿈·가운데 겹침 제거) 채팅 입력이 폭을 접으며 클립되고, 규칙 콤보 확장과 AI 원형 아이콘 페이드인이 겹침·빈 화면 없이 이어지도록 했다.

- 규칙 추가 안내 메시지 + ChatInput ref 전달 보강
  - AI 자연어 입력으로 규칙을 추가하면 입력 아래에 2줄 안내(첫 줄=방금 넣은 키워드, 둘째 줄=안내 문구)를 띄우는데, 둘째 줄 메시지와 전송 후 재포커스에 필요한 조각을 채웠다. i18n batchRule.ruleAdded(ko/en)를 추가하고, ChatInput을 forwardRef<HTMLInputElement>로 전환해 전송 성공 후 입력창을 다시 포커스할 수 있게 했다(ref 미전달 시 기존 소비처 무영향).

- AI 규칙 입력 Enter 시 1회 실행·처리결과 전환
  - AI 자연어 입력에서 Enter 시 규칙을 추가만 하던 것을, 곧바로 1회 실행해 처리 결과(미리보기)로 전환하도록 바꿨다. 실행 중에는 입력 하단에 Spinner + "규칙을 실행 중입니다…"를 표시하고 끝나면 처리 결과 카드로 전환한다. 처리 결과 제목 좌측 별표(SparkleIcon)를 제거하고, 추가 전용 흐름(안내 문구·재포커스)을 폐기하면서 i18n batchRule.ruleAdded를 batchRule.running으로 교체했다.

- ChatInput 포커스 링을 캡에서도 또렷한 1px 그라디언트 링으로
  - 기존엔 투명 구간만 있는 대각선 그라디언트를 슬라이드시켜 빔이 스치게 했는데, 알약 좌우 반원(캡)에서 밝은 밴드가 호를 따라 뭉쳐 1px보다 두껍고 지저분해 보였다. 투명 구간 없는 꽉 찬 그라디언트 링(inset-0·padding 1px)으로 바꿔 전 둘레가 늘 또렷한 1px이 되게 하고, 포커스 시 opacity로 부드럽게 들어오며 색만 천천히 흐르게 했다.

## 정리

오늘 cad-web BatchCleanup 화면 작업은 결국 "공용 컴포넌트로 끌어올리기"와 "톤 통일" 두 가지가 서로 맞물리는 일이었다. 검토 큐를 MessageStack으로 옮기는 순간부터 접힘 대표 카드(Peek)와 펼친 개별 카드(Item)가 layoutId로 같은 요소처럼 전환되기 때문에, 둘의 표면(테두리·배경·치수)이 조금이라도 어긋나면 전환에서 티가 난다. 그래서 surface 프리셋을 Peek에서 Item으로 일반화하고, fill/border 두 표면을 st-background/st-border로 계통을 맞추는 잔손질이 하루 종일 반복됐다. 색 하나 바꾸는 커밋처럼 보여도 실제로는 "공유요소 전환에서 안 흔들리게" 하는 제약을 만족시키는 작업이었던 셈이다.

토큰을 고르는 기준이 밝기(L값) 대비라는 점도 반복해서 확인했다. st-muted가 배경과 밝기 차가 없어 hover 테두리가 안 보이는 문제를 st-border/st-ring 같은 더 어두운 토큰으로 교체하며 해결했는데, 이건 "적당히 회색"이 아니라 배경 대비 실제 L값 차이를 근거로 골라야 눈에 보인다는 걸 다시 각인시켰다.

규칙 패널 쪽은 v2 계약을 UI까지 잇고 AI 입력을 add-only에서 실행-즉시로 바꾸는 게 핵심이었는데, 여기서 얻은 교훈은 두 가지다. 하나는 애니메이션은 가짜 transform으로 흉내 내면 DOM 스왑 시점에 진짜 레이아웃과 2단으로 튄다는 것. framer layout으로 실제 폭을 한 스프링에 잇고 overflow-hidden으로 나가는 요소를 가두는 정공법이 결국 매끄럽다. 다른 하나는 이중 i18n 소스 함정으로, cad-web 패키지의 defaultMessages와 apps/web의 json을 둘 다 동기화하지 않으면 앱에서 문구가 안 바뀐다는 점을 몸으로 확인했다. 다음에 문구가 안 반영되면 제일 먼저 두 소스의 동기화부터 의심하려 한다.
