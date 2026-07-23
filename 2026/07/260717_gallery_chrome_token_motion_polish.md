---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "page-harness 갤러리 편집기 크롬을 규격·구조·감각 세 층에서 다듬은 하루. 새벽엔 DetailRoute의 Figma 크롬 위반(chrome:lint 9)을 0으로 떨구며 rounded-md/lg/xl/full을 전부 rounded로 접고 shadow를 걷었고, CTA만 cn으로 rounded를 명시 오버라이드했다. 이어 emilkowalski 모션 6종 파이프라인으로 성숙한 모션 헌법의 갭(성공 확인 테마·오버슈트 드리프트)만 골라 --spring-pop 팝을 저장·복사 성공에 붙이고, 금지 물리인 scale(0)을 scale(0.9)+opacity로 고치고, 2차 오버슈트 이징 --ease-lift를 폐기해 --ease-crisp로 통일했다. 밤엔 세그먼트 컨트롤에 --seg-count/--seg-active로 위치를 트래킹하는 슬라이딩 인디케이터를 심고, 크롬 반경(4px)과 제품 반경(6/8/12px)이 한 스케일을 공유하려다 위반을 낳던 근원을 두 세계의 반경 토큰을 분리 명문화해 화해시켰다. 산재하던 --ph-* 정의를 tokens-ph.css로, 4px 스페이싱 램프를 tokens-spacing.css로 SoT화하고, ViewRoute+preview CSS의 남은 위반 26건을 [data-overlay] 스코프와 전용 토큰으로 마저 0에 붙였다"
updatedAt: "2026-07-17"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "chrome-lint"
  - "figma-chrome"
  - "design-tokens"
  - "radius-scale"
  - "single-source-of-truth"
  - "spring-pop"
  - "motion-pipeline"
  - "segment-indicator"
  - "data-overlay"
  - "reduced-motion"

relatedCategories:
  - "css"
  - "animation"
---

# 갤러리 편집기 크롬을 준수·토큰·모션 세 층으로 다듬기

> page-harness 갤러리 편집기의 크롬을 하루 동안 세 층에서 손봤다. Figma 규격에 맞춰 반경·그림자 위반을 0으로 떨구는 준수, 위반을 재발시키던 근원인 반경 토큰 스케일을 이원화하고 --ph-*/--space-* 정의를 SoT로 모으는 구조 정리, 그리고 성공 확인 팝과 세그먼트 슬라이딩 인디케이터를 얹는 감각 폴리싱이다.

## 배경

이날 하루의 작업은 갤러리가 만들어내는 결과물이 아니라 편집기 자신의 크롬을 다루는 일로 한 흐름을 이뤘다. 편집 중 늘 보이는 라우트, 도크, 오버레이, 세그먼트 컨트롤 같은 표면들이 Figma 크롬 규격과 어긋나 있었고, 그 어긋남을 눈대중이 아니라 chrome:lint가 세는 위반 수를 지표로 삼아 표면마다 0으로 떨구는 캠페인이 진행 중이었다.

다만 표면을 규칙에 맞추는 것만으로는 위반이 계속 재발했다. 크롬의 작은 반경 미감(4px 이하)과 제품 컴포넌트의 반경 스케일(6/8/12px)이 한 토큰 세트를 공유하려다 크롬이 자꾸 큰 반경을 물어오는 구조적 원인이 있었기 때문이다. 그래서 이날은 준수(표면을 규칙에 맞춤)와 함께 근원 정리(토큰 스케일을 분리 명문화)를 같이 진행했다. 여기에 성숙한 모션 헌법의 빈 자리를 채우는 인터랙션 폴리싱까지 얹어, 크롬을 규격·구조·감각의 세 층에서 정돈한 하루가 됐다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- DetailRoute Figma 크롬 준수 (chrome:lint 9→0 + CTA rounded 오버라이드)
  - 상세 라우트의 크롬 위반 9건을 0으로 떨궜다. 방식은 반경 유틸을 전부 크롬 규격으로 접는 것이다. rounded-md/rounded-lg/rounded-xl/rounded-full을 모두 rounded로 바꾸고, 미리보기 컨테이너와 사이드바 dl의 shadow-sm/큰 반경을 걷었으며, 제목 weight를 semibold에서 medium으로 낮췄다. 상태 배지의 dot도 rounded-full에서 rounded로 맞췄다. 한편 편집·미리보기 CTA 버튼은 buttonVariants가 기본으로 물고 오는 반경을 유지하면 안 돼서, cn(buttonVariants(...), "rounded")로 rounded를 뒤에 붙여 명시적으로 오버라이드했다. 유틸 우선순위상 나중 클래스가 이기게 해 버튼만 크롬 반경으로 강제한 것이다.

- 모션 파이프라인 , 성공 확인 팝 + scale(0) 수정 + 오버슈트 헌법 복원
  - emilkowalski 모션 6종(발굴·감사·검수) 파이프라인을 페이지 갤러리 모션에 돌렸다. 판단의 핵심은 모션 헌법(motion.css)이 이미 성숙해 있어서, 갭이 표면 전반이 아니라 "성공 확인" 테마와 오버슈트 드리프트 두 곳에 집중돼 있다는 점이었다. 그래서 헌법이 만들어두고도 미사용이던 --spring-pop 팝(anim-pop-in)을 저장 성공 체크와 프롬프트 복사 체크에 붙여 성공 피드백을 살렸고, 복사·eject 토스트와 상세 스켈레톤에서 콘텐츠로 넘어가는 전환, 빈·무결과 상태에 fade-in/up 진입을 넣었다. 선택 틱의 scale(0)은 헌법이 금지한 물리라 scale(0.9)+opacity로 고쳐 팝 강도는 유지하되 0에서 튀어오르는 부자연스러움을 없앴다. 검색창이 키보드 포커스 때 width를 트랜지션하던 것은 레이아웃 속성이라 GPU 밖에서 도는 비용이 있어 제거했다. 마지막으로 2차 오버슈트를 만들던 이징 --ease-lift를 폐기하고 --ease-crisp로 통일해, 오버슈트는 헌법상 --spring-pop 한 곳에만 격리되도록 되돌렸다. 전부 transform/opacity(또는 제거)와 기존 토큰 재사용, reduced-motion 가드 범위 안에서 처리했다.

- 세그먼트 인디케이터 필드 폴리시 WIP 체크포인트 (pre-pipeline)
  - 세그먼트 컨트롤(프리셋·모드·열 스팬·정렬 등)에 활성 항목을 따라 미끄러지는 슬라이딩 인디케이터를 심는 작업의 중간 저장점이다. 각 세그먼트 컨테이너에 --seg-count(항목 수)와 --seg-active(활성 인덱스)를 인라인 CSS 변수로 넣고, ph-segment-indicator 스팬 하나가 그 두 변수로 자기 위치를 계산해 이동하도록 했다. 활성 항목이 없을 땐 data-seg-empty 표식으로 인디케이터를 숨긴다. preset은 현재 값과 부분 일치하는 프리셋을 찾아 활성 인덱스를 계산했고, size의 열 스팬은 [1,2,3,4] 배열 인덱스로, segment/turn-into는 options에서 값 매칭으로 인덱스를 뽑았다. 인디케이터 자체의 스타일은 inspector/segment.css를 새로 만들어 담았다. 다음 파이프라인 작업 전에 필드 쪽 배선을 먼저 못 박아둔 체크포인트다.

- 디자인 토큰 스케일 화해 + spacing/--ph-* SoT 신설
  - 크롬 위반이 재발하던 근원을 토큰 층에서 정리했다. 핵심은 반경 스케일의 이원화 명문화다. 크롬(에디터 도구)은 --editor-radius-*(둘 다 4px)만 쓰고, 콘텐츠·제품은 --radius-*(3/4/6/8/12px)·--st-radius를 쓴다는 두 세계의 경계를 editor-chrome.md에 표와 하드 룰로 적었다. 값은 바꾸지 않았다. 제품 전역이 그 값에 의존하기 때문에, 화해는 크롬이 제품 반경 토큰을 참조하지 않게 참조를 끊는 것이지 값 변경이 아니다. grep 검증 기준도 문서에 함께 박았다. 이어 그동안 compose/density·preview/elevation·preview/save-banner 세 파일에 흩어져 있던 --ph-* 정의(폰트 스케일, elevation 오버레이)를 tokens-ph.css 한 파일로 모아 SoT로 만들고, 소비처보다 먼저 로드되도록 @import 순서를 잡았다. 관례로만 존재하던 4px 스페이싱 램프는 tokens-spacing.css에 --space-* 커스텀 프로퍼티로 명문화했다. 겸사겸사 canvas-bg를 하드코딩 hex(#f5f5f5)에서 color-mix로 바꿔 hex 사용을 걷고, ui tokens.css 주석에서 spacing은 소비처인 갤러리가 소유한다는 경계를 정정했다.

- ViewRoute+preview CSS Figma 크롬 준수 (chrome:lint -26, 타깃 0)
  - 하루의 준수 캠페인을 마감하는 마지막 청소였다. ViewRoute에서 rounded-lg를 rounded로 세 곳 접고 skip-link·FAB의 shadow를 걷었으며, 도크와 FAB에 data-overlay 표식을 달았다. 그림자를 무조건 없애는 대신 오버레이 표면만 그림자를 허용하는 규격에 맞춰, dock·elevation의 토스트·치트·액션바 그림자를 [data-overlay] 스코프로 좁히고 기본은 그림자 없이 폴백하게 했다. pill 반경과 도크 높이는 하드코딩 대신 전용 토큰(var/calc)으로 바꾸고, 틱·칩은 높이 하드코딩을 피하려 aspect-ratio로 재구성했다. micro-3d의 카드·버튼 hover 글로우와 save-banner의 배너 그림자도 트랜스폼·색으로 대체해 de-elevate했다. 남아 있던 위반 26건을 이렇게 마저 걷어 타깃 0에 붙였다.

## 정리

이날의 큰 줄기는 편집기 크롬이라는 하나의 대상을 규격·구조·감각 세 층에서 동시에 다듬은 것이다. 겉으로 보면 rounded를 접고 shadow를 걷는 준수 작업이지만, 그 준수를 지속 가능하게 만든 진짜 축은 반경 토큰 스케일의 이원화였다. 크롬과 제품이 한 스케일을 공유하는 한 위반은 계속 재발하므로, 표면을 규칙에 맞추는 것과 별개로 토큰 층에서 두 세계의 경계를 명문화해 근원을 끊어야 했다. 값을 바꾸지 않고 참조만 끊는다는 원칙은, 제품 전역이 그 값에 의존하는 상황에서 화해의 안전한 방식이 무엇인지 보여준다.

SoT 정리도 같은 태도의 연장이다. --ph-*가 세 파일에 흩어져 있으면 어느 파일이 정의고 어느 게 소비인지 매번 추적해야 하고, 그 모호함이 위반과 회귀를 부른다. 정의를 tokens-ph.css 한 곳으로 모으고 소비처는 소비만 하게 나누면, 이동만으로 렌더는 불변인 채로 유지보수의 진실 하나가 생긴다. 스페이싱 램프도 prose·문서·JS 배열 세 곳이 각자 같은 값을 적어오던 것을 CSS 토큰으로 못 박아 관례를 강제로 바꿨다.

모션 쪽에서 배운 건 성숙한 시스템에서 파이프라인의 역할이 표면을 뒤엎는 게 아니라 갭을 좁게 조준하는 것이라는 점이었다. 헌법이 이미 --spring-pop을 만들어두고도 안 쓰고 있었다는 사실 자체가 갭이었고, 그 미사용 자리를 성공 확인에 채우는 것이 대담한 신규 모션보다 더 헌법 정합적이었다. scale(0) 같은 금지 물리를 걷고 오버슈트 이징을 한 곳으로 격리한 것도 새 규칙이 아니라 이미 있던 규칙으로의 복원이었다. 준수든 토큰이든 모션이든, 이날의 공통 문법은 규칙을 끄는 대신 대상을 규칙에 맞추는 것이었다.
