---
draft: true
type: "content"
domain: "frontend"
category: "ui-harness"
topic: "ui-harness 갤러리를 meta.summary 도입·NEW 뱃지 여러 차례 재설계·적대적 리뷰 결함 일괄 수정·sticky 네비게이션·Storybook 딥링크 복구·Figma 색상 체계 엔트리 추가로 폴리싱"
updatedAt: "2026-07-10"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "gallery"
  - "wcag-contrast"
  - "intersection-observer"
  - "storybook-deeplink"
  - "adversarial-review"
  - "design-tokens"

relatedCategories:
  - "design-system"
  - "accessibility"
  - "react"
---

# ui-harness 갤러리 폴리싱: 요약 문장·NEW 뱃지·적대적 리뷰·네비게이션

> 카드 설명을 누구나 읽히는 한 문장으로 바꾸고, NEW 표시를 여러 차례 재설계하고, 적대적 리뷰로 확정한 회귀·접근성 결함을 밤새 잡고, sticky 네비게이션과 Storybook 딥링크·Figma 색상 엔트리까지 다듬은 하루.

## 배경

ui-harness 갤러리는 컴포넌트가 90종 넘게 쌓이면서, 만드는 것보다 "잘 읽히고 잘 찾아지게" 다듬는 일이 더 중요해졌다. 이날은 크게 네 갈래였다. 첫째, 카드·상세가 원문 프롬프트 intent(코드·영문·요청 맥락)를 그대로 노출해 안 읽히던 문제를 meta.summary 도입으로 풀었다. 둘째, 촌스러웠던 NEW 코너 리본을 여러 차례 반복 재설계해 밝은 빨간 유리 뱃지로 수렴시켰다. 셋째, 반증(적대적) 리뷰로 확정한 회귀·접근성·URL 상태 결함을 야간부터 새벽까지 일괄로 잡았다. 넷째, 무한 스크롤에서 검색·카테고리 이동이 불편하던 네비게이션을 sticky 바로 확장하고, 죽어 있던 Storybook 딥링크를 복구하고, Figma 'MAX 색상 체계'의 System 카테고리를 갤러리 엔트리로 채웠다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 카드 전체 클릭 이동 · NEW 리본 재설계 · 상태 구분감 강화
  - 카드·행 전체를 stretched-link로 상세 이동시키고 우상단 화살표를 없앴다(프롬프트 복사 버튼만 stopPropagation으로 이동 없이 동작). NEW 리본을 곡선 새틴 원통 음영 + 직물 결 텍스처 + 필기체 'New' + 셔머로 재설계했다.
  - StatusBadge를 색 점 + 읽히는 라벨로 바꾸고, 분류순 그룹핑을 Map 버킷으로 돌려 검색+분류 시 중복 섹션 key가 나던 회귀를 고쳤다. EntryMeta.summary 필드를 신설해 카드·상세 설명 소스를 summary ?? intent로 잡았다.

- meta.summary 규칙 신설 + 상세 페이지 summary 표시
  - GUIDE §1을 'intent·summary 확보'로 확장했다. intent는 원문을 보존하고, summary는 개발용어·코드·영문·긴 작대기·AI 상투어 없이 누구나 읽히는 담백한 한 문장으로 쓴다는 워딩 규칙을 명시했다. §4 meta 템플릿에 summary를 넣고, summary 없이 완료 금지를 하드룰로 세우고, DetailRoute 설명도 summary ?? intent로 렌더하게 했다.

- 전 컴포넌트 91개 meta.summary 백필
  - 각 엔트리에 담백한 한 문장 summary를 추가했다('~입니다' 평서문, 개발용어·긴 작대기·상투어 배제). 원문 프롬프트는 history에 남으므로 손대지 않고, 파일당 정확히 한 줄만 추가하는 텍스트 삽입으로 기존 포맷의 재포맷 churn을 피했다.

- NEW 리본에 3D 폴드 컬: 끝단이 카드 뒤로 접혀 들어가게
  - 리본 양 끝을 어두운 삼각형(의사요소)으로 접힌 밑면처럼 표현하고, z-index로 띠 뒤에 깔아 카드 overflow-hidden이 코너 밖을 클립해 '카드 뒤로 접힘'을 완성했다. 직물 결 텍스처는 폴드용 의사요소를 확보하려 background 레이어로 옮겼다.

- NEW 코너 리본 → 빨간 'New' 유리 뱃지 · 노란 테두리 제거
  - 3D 폴드 코너 리본이 촌스러워, 우상단의 작은 빨간 'New' 알약 뱃지로 교체했다(4.5초마다 대각선으로 유리 광택이 스치는 글린트). 카드·행 테두리의 상태 색 틴트(draft 앰버·merge 블루)를 걷어내 중립 테두리로 바꾸고, draft/stable 구분은 StatusBadge가 담당하게 했다.

- 야간 리뷰 확정건 5개: 뱃지 대비·요약 정확도·a11y
  - 반증 리뷰로 확정한 결함을 고쳤다. 'New' 뱃지 흰 글자가 라이트에서 2.6:1로 WCAG 4.5:1에 미달해, color-mix로 빨강을 24% 어둡게(토큰 파생) 잡아 라이트 7.7:1·다크 5.1:1로 양 테마를 통과시켰다. StatusBadge deprecated의 전체 opacity-70이 라벨 대비를 떨어뜨려 취소선만 남기고, marker.json·token-list.json의 부정확한 summary를 재작성하고, 'New' 해제 잔여시간을 sr-only에도 넣었다.

- CopyButton 클립보드 거부 시 unhandled rejection 방지 + 레거시 폴백
  - navigator.clipboard.writeText가 비포커스·비보안 컨텍스트·권한 거부로 reject될 때 .then만 있어 unhandled rejection이 나던 걸(스모크 중 콘솔 예외 확인), then(done, fallback)으로 처리했다. 실패 시 execCommand('copy') 레거시 폴백을 시도하고 그마저 안 되면 조용히 무시해 앱이 계속 돌게 했다.

- 2차 상호작용 리뷰 확정 8건: 반응형·포커스·URL 상태
  - navigate("/")로 검색·필터 리셋이 화면에 반영 안 되던 걸 usePath 스냅샷·라이브러리 routeKey에 search를 포함해 재렌더·재마운트로 해결했다. 좁은 뷰포트에서 헤더 가로 오버플로(flex-wrap), 리스트 행 썸네일 고정폭 붕괴(sm 미만 세로 스택), 모달 위에서 '/'·'?' 전역 단축키가 배경 검색으로 포커스를 빼 트랩을 깨던 문제(Dialog.hasOpenDialog 가드)를 고쳤다.
  - 딥링크 ?sort/?view가 마운트 시 localStorage 취향으로 굳던 것, 팔레트 Home/End가 캐럿 이동을 가로채던 것, localStorage 파생 값이 공유 URL로 유출되던 것을, '만져진' 값만 URL에 기록하도록 정리했다.

- 3차 리뷰 확정 4건: 온보딩 재노출·스토리지 크래시·날짜 불일치·문서
  - 온보딩을 '시작하기'로 닫으면 onboarded 플래그가 안 서서 매 방문마다 다시 열리던 걸, 어떤 닫기 경로든 '봤음'을 저장하게 했다. 온보딩 open 초기화가 localStorage를 try/catch 없이 읽어 스토리지 차단·샌드박스 iframe에서 SecurityError로 흰 화면이 되던 걸 감쌌다. 상세 히스토리 날짜(로컬)와 속성표 생성일(UTC)이 음수 오프셋 타임존에서 하루 어긋나던 것도 UTC 문자열로 맞췄다.

- 상세페이지 Storybook 딥링크 죽은 링크 수정 (primitive 6종): meta.storyTitle
  - storybookUrlFor가 category로 slug를 만드는데, shadcn primitive(button·card·input·alert·table·badge)는 category가 Composite지만 실제 story는 Shared/UI/Components/…라 상세페이지 Storybook 버튼이 죽은 링크로 갔다. EntryMeta.storyTitle을 신설해 title이 category 규칙과 다를 때만 명시하고, storybookUrlFor가 storyTitle을 우선 쓰게 했다(Storybook index.json 대조로 실측).

- ai-rule-console·trend-chart-card Storybook 스토리 신설: 죽은 딥링크 해소
  - 두 stable 컴포넌트는 .stories.tsx 자체가 없어 상세페이지 Storybook 버튼이 story-not-found로 갔다. 각 stories.tsx를 category와 일치하는 title로 만들고, demo의 검증된 사용을 스토리로 옮겼다(ai-rule-console은 controlled 셸 2종, trend-chart-card는 args 기반 2종). 이로써 상세페이지 Storybook 죽은 링크를 전량 해소했다.

- NEW 뱃지를 원형 'N' 유리 뱃지로: 밝은 빨강 + 좌→우 shimmer
  - 알약 'New'를 원형(size-5) 뱃지 안 대문자 'N' 하나로 바꿨다. 좌상단 정적 하이라이트(구슬 광택) + inset box-shadow로 유리 씌운 3D 느낌을 주고, 4.5초마다 좌→우로 유리 광택을 훑게 했다. 색을 더 밝은 빨강(destructive+black 18%)으로 올려 흰 'N' 대비를 라이트 7.3:1·다크 4.68:1로, 양 테마 WCAG를 통과하는 최대 밝기 지점에 맞췄다.

- NEW 뱃지 평면 유리 + 더 밝은 빨강 (3D 구슬 제거)
  - 3D 느낌(좌상단 radial 구슬 광택·inset 베벨)을 제거하고, 사방 동일한 균일한 유리 테두리 링 + 좌→우 shimmer만 남겨 '평면 유리가 100% 끼워진' 느낌으로 바꿨다. 빨강을 더 맑게(destructive+black 8%, 기존 18%는 탁했음) 올려 라이트 5.7:1·다크 3.6:1을 확보했다.

- useInView가 초기 로드에 보이는 카드 프리뷰를 즉시 마운트
  - IntersectionObserver의 첫 콜백이 헤드리스·자동화 환경에선 실제 스크롤·페인트 전엔 안 와, 초기 로드에 뷰포트 안 카드도 스켈레톤인 채 비어 보였다(스크린샷 확인). 마운트 시점에 getBoundingClientRect로 요소가 이미 뷰포트(±rootMargin) 안이면 IO 콜백을 안 기다리고 즉시 inView=true로 마운트하게 했다.

- dnd-sortable 카드 프리뷰 깨짐: 큐레이트 프리뷰로 폴백
  - dnd-sortable 데모는 두 DnD UI(핸들 리스트 + 4열 테이블)를 병렬로 담아 160px 카드 프레임에서 클립돼 깨져 보였다(카드는 Demo 우선이라 큐레이트 프리뷰가 무시됨). CARD_UNFIT_DEMOS 예외 셋으로, 카드에 안 맞는 데모만 작은 정적 큐레이트 프리뷰로 폴백하게 했다(상세 히어로는 그대로 풀 데모).

- 탭 타이틀을 UI-HARNESS로 고정 (사용자 선호)
  - 브라우저 탭 타이틀을 UI-HARNESS로 고정하고, 라우트 안내는 스크린리더 라이브 영역으로만 유지했다(사용자 선호 반영).

- 분류순 상단 카테고리 점프바: 스크롤 없이 바로 이동
  - 분류순 뷰에서 다음 카테고리를 보려면 끝까지 스크롤해야 하던 걸, 상단에 카테고리 칩(이름+개수) 점프바를 sticky로 두고 클릭 시 해당 섹션으로 스무스 스크롤하게 했다. scroll-spy(IntersectionObserver)로 현재 칩을 강조하되, IO가 안 뜨는 환경에선 하이라이트만 빠지고 점프는 동작한다.

- 분류순 점프바로 헤더 elevation 자연 확장
  - 스크롤 시 헤더의 그림자·하단 border를 fade-out하고, 그 아래 sticky 점프바가 같은 스타일의 그림자·border를 fade-in으로 이어받아 헤더가 자연스럽게 아래로 확장된 것처럼 보이게 했다. 분류순일 때만(hasSubnav) elevation을 이전한다.

- 상단 Nav 확장: 스크롤 시 검색창 sticky 팔로우 + 최상단 이동 버튼
  - 무한 스크롤에서 깊이 내려가면 검색이 안 보이던 걸, 검색을 히어로에서 sticky 바(top-14)로 분리해 헤더 아래로 붙어 따라오게 했다(그때 검색창 shadow를 헤더 elevation과 맞바꿔 헤더가 확장된 것처럼). 분류순 카테고리 점프 칩을 이 sticky 바에 합쳐 '확장된 네비게이션'으로 통일하고, 최상단 이동 FAB를 붙였다.

- Figma 'MAX 색상 체계' 3~10번 System 카테고리 8개 엔트리 추가
  - Figma 'MAX 색상 체계'의 sections 3~10을 갤러리 엔트리 8종으로 만들었다(text-hierarchy·border-tokens·button-states·list-item-states·input-states·status-badges·typography-scale·elevation-radius, 모두 draft·category:System). 전시할 디자인 값(색·폰트·그림자)은 콘텐츠 데이터로 inline하고 컴포넌트 크롬은 st-* 토큰·스케일만 쓰는 원칙을 지켰으며, 색 리터럴은 .data.ts로 분리해 본체 .tsx의 hex를 0으로 유지했다(ui:valid 준수).

- Figma 'MAX 색상 체계' ↔ st-* 토큰 격차 19건 token-proposal 등록
  - sections 3~10을 구현하다 발견한 Figma 스펙 대비 st-* 부재·파생 항목 19건(status border 5·status bg 3·text 2·action primary 3·surface 1·elevation 4·typography 1)을 token-proposal로 등록했다. 코드에 토큰을 직접 추가하지 말고 제안만 기록하라는 GUIDE 하드룰에 따라, /ui-curate가 name으로 그룹핑해 취합하게 했다.

- 갤러리 뱃지 hover 툴팁: 설명 + 남은 기간
  - StatusBadge에 상태별 설명 툴팁(stable/draft/merge/deprecated)을 달고, stable 최근 승격 항목엔 "N일 뒤 promotions에서 제외" 잔여 기간을 병기했다. N 신규 리본엔 "N시간 뒤 해제" 잔여시간을, 필터 칩엔 각 설명과 promotions 7일 윈도우 근거를 노출했다. registry에 daysUntilPromotionStale() 헬퍼를 추가하고, 스트레치 링크(z-0) 위로 뱃지를 z-10 올려 hover가 링크에 가로채이지 않게 했다.

- update
  - PromotionBadge·PromotionRibbon 컴포넌트 분리와 LibraryRoute·styles.css 대규모 개편을 담은 중간 저장. 본문 없이 진행 중 스냅샷으로 남았고, 이후 NEW 뱃지·네비게이션 커밋들로 정리됐다.

## 정리

이날 갤러리 작업을 관통한 건 "만든 뒤의 완성도"라는 주제였다. 특히 NEW 표시 하나가 하루에 여섯 번 모습을 바꿨다. 곡선 새틴 리본에서 3D 폴드 컬, 다시 리본을 통째로 걷어낸 빨간 알약, 원형 'N' 유리 뱃지, 마지막엔 3D 구슬을 빼고 균일한 평면 유리로 수렴했다. 재밌는 건 미감을 반복할 때마다 결정 기준이 대비(contrast)였다는 점이다. 밝게 만들수록 예쁘지만 흰 글자 대비가 WCAG 아래로 떨어지니, color-mix로 빨강 명도를 조절해 라이트·다크 양쪽에서 4.5:1을 넘기는 '최대 밝기 지점'을 매번 실측으로 찾았다. 미감과 접근성이 충돌하는 지점을 숫자로 타협한 셈이다.

또 하나 큰 축은 반증(적대적) 리뷰였다. 야간·2차·3차로 이어진 리뷰에서 unhandled rejection, 온보딩 재노출, 샌드박스 iframe SecurityError 흰 화면, navigate 후 필터 미반영, 타임존 하루 어긋남처럼 정상 경로에선 안 드러나는 결함들이 확정됐다. 이런 건 기능을 새로 얹는 것과 다른 종류의 노동이라, "가장 쉽게 깨지는 입력·환경은 무엇인가"를 먼저 가정하고 그걸 반증하는 방식이 유효했다. 마지막으로 meta.summary 도입은 작아 보여도 관점 전환이었다. 원문 프롬프트(intent)를 카드에 그대로 노출하던 걸, 원문은 history에 남기고 카드엔 누구나 읽히는 한 문장(summary)을 따로 두는 SoT 분리로 바꾸니, 개발자가 아닌 사람도 갤러리를 읽을 수 있게 됐다.
