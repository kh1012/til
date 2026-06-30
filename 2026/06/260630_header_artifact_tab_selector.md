---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "헤더 파일·산출물 아티팩트 셀렉터를 Figma(wf-arttab)에 맞추고 헤더 전반을 정밀 매칭"
updatedAt: "2026-06-30"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "figma-precision"
  - "popover"
  - "design-token"
  - "leading-none"
  - "cjk-baseline"
  - "eslint-override"

relatedCategories:
  - "css"
  - "react"
---

# 헤더 파일·산출물 셀렉터 Figma 매칭

> 헤더의 파일·산출물 선택 UI를 Figma wf-arttab pill 디자인으로 새로 만들고, 그 과정에서 헤더 높이·정렬·간격까지 Figma 스펙에 정밀하게 맞춘 오전의 기록.

## 배경

오늘 하루는 maxflow 웹 UI를 Figma 디자인에 픽셀 단위로 맞추는 작업이 큰 줄기였다. 오전에는 헤더 surface를 다뤘다. 본격적인 UI 작업에 앞서 로컬 dev 실행 시 포트 충돌로 자주 막히던 문제를 먼저 정리하고, 그다음 파일·산출물 선택 컴포넌트를 Figma node(wf-arttab) 기준으로 새로 구현하면서 헤더 전체의 높이·간격·정렬을 손봤다.

작은 커밋을 여러 번 쌓는 방식으로 진행했는데, Figma와 화면을 매번 눈으로 대조하며 한 결정씩 검증하기 위함이었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- dev:full-web 앞에 ports:free:full-web 추가
  - 로컬 풀웹 dev 실행 시 9111/9121/9211/9215/9217/9341 포트가 살아있으면 기동이 막히던 문제. dev:full-web 스크립트 맨 앞에 해당 포트를 미리 죽이는 ports:free:full-web 스텝을 끼워 넣어, db:start/migrate 전에 포트를 비우고 시작하도록 했다. 본 작업에 들어가기 전 환경 정리 성격의 커밋이다.

- 파일·산출물 아티팩트 탭 셀렉터 추가 (Figma wf-arttab)
  - Figma wf-arttab-lbl 디자인을 HeaderProjectSelector 패턴(Popover + 순수 button)으로 구현. 폴더 아이콘 + "파일·산출물" 라벨 + chevron 구성. raw hex는 그대로 두지 않고 토큰으로 매핑했다(#e8e9ed→border-st-input, #475569→text-st-foreground, rounded-[10px]→rounded-lg). artifactSelector i18n(ko/en)도 함께 추가.

- Storybook·아나토미 스토리 추가
  - 일반 스토리와 아나토미 스토리를 분리해 추가. 트리거 파트(Icon/Label/Chevron)와 메뉴에 data-anatomy를 부여하고, 포털로 빠지는 메뉴는 아나토미용으로 인라인 미러링해 하이라이트가 끊기지 않게 했다.

- 파일 팝오버를 wf-arttab pill 디자인으로 교체
  - 기존 Button 트리거 기반 HeaderFilesPopover를 위에서 만든 pill 디자인으로 교체. 팝오버 내용(파일 트리/검색/새로고침)은 그대로 두고 프로젝트 컨텍스트만 pathname으로 내부 도출하게 했다. 임시로 붙였던 WfArtifactTabSelector라는 이름을 HeaderFilesPopover로 통일(파일·스토리·data-anatomy id 일괄). header-nav에 있던 옛 호출은 제거하고 nav 바도 rounded-lg 토큰으로 리디자인했다.

- 헤더 액션·히스토리·프로젝트 셀렉터 디자인 정리
  - header-actions의 액션 간격을 gap-0으로 좁히고 언어/설정 순서를 조정, UserAvatar 앞에 스페이서를 넣었다. history-controls도 gap-0. 프로젝트 셀렉터에는 활성 상태 점 인디케이터(size-2/rounded-full/ring)를 추가하면서 arbitrary value를 토큰화했다.

- 헤더 높이 56px → 48px
  - Figma 스펙상 HeaderContent 높이는 48px인데 초기 기본값(h-14, 56px)이 그대로 남아 있었다. h-12(48px)로 내리고 --header-height 변수도 동기화했다.

- 프로젝트 셀렉터 텍스트 수직 중앙 정렬
  - leading 미지정 상태라 Pretendard CJK 폰트의 em-square 오프셋 때문에 글자가 시각적으로 아래로 처졌다. leading-none(line-height:1)을 줘서 span 박스 높이를 font-size로 확정했다. Figma 스펙은 font-size 12.5px, line-height 14.38px(약 1.15배).

- 파일 팝오버 정밀 매칭 + 프로젝트 없이도 선택 가능
  - Figma 픽셀/letter-spacing을 정밀하게 맞추기 위해 src/widgets/max-header/** 에 no-tailwind-arbitrary-value off override를 추가(primitives 선례와 동일 방식). gap-1.5를 gap-[5px]로, 라벨에 tracking-[-0.12px]를 더했다. 또 트리거를 프로젝트 컨텍스트와 무관하게 항상 열 수 있게 바꿔, 프로젝트가 없으면 열었을 때 빈 상태를 보여주도록 했다(스토리 Disabled→NoProject).

## 정리

오전의 큰 줄기는 "헤더의 파일·산출물 선택 UI를 Figma 그대로 재현하고, 그 김에 헤더 전체를 스펙에 맞추기"였다. 새 컴포넌트를 임시 이름(WfArtifactTabSelector)으로 먼저 세우고 → Storybook/아나토미로 모양을 확인한 뒤 → 기존 HeaderFilesPopover 자리에 교체하면서 이름을 통일하는 순서로 갔다. 임시 이름으로 모양부터 잡고 마지막에 기존 자리로 흡수시키는 흐름이 검증 단계를 깔끔하게 나눠줬다.

기억에 남는 건 두 가지다. 하나는 CJK 폰트의 수직 정렬. leading을 안 주면 Pretendard의 em-square 오프셋 때문에 글자가 박스 안에서 미세하게 가라앉는데, leading-none으로 라인 높이를 폰트 크기에 묶어야 시각 중앙이 맞는다는 걸 다시 확인했다. 다른 하나는 arbitrary value lint를 전역이 아니라 디렉토리 단위 override로 푸는 방식이다. Figma 픽셀을 정밀하게 맞추려면 rounded-[10px]나 tracking-[-0.12px] 같은 임의값이 불가피한데, primitives에서 이미 쓰던 per-directory off override 선례를 헤더 위젯에도 그대로 적용해 "정밀 매칭이 필요한 영역만" 규칙을 풀었다.
