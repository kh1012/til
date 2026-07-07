---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "어제까지 세운 ui-harness를 실제로 굴리는 하루. 런처를 순차 기동·라이브러리풍 로그로 개편하고 상세페이지를 케밥 메뉴·2행 헤더·리뷰 큐 기반 노출로 정비한 뒤, magnetic-cursor를 결정 기록→promote 반영→프레스 바운스 폴리시까지 staging→stable 파이프라인 한 바퀴로 관통시키고, 마지막에 Windows 런처 spawn 오류를 크로스플랫폼으로 막은 흐름"
updatedAt: "2026-07-07"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "launcher"
  - "sequential-startup"
  - "magnetic-cursor"
  - "staging-promote"
  - "decisions-registry"
  - "framer-motion"
  - "cross-platform-spawn"
  - "review-queue"
  - "monorepo"

relatedCategories:
  - "react"
  - "typescript"
  - "tooling"
---

# ui-harness 런처·상세페이지를 다듬고 magnetic-cursor 승격을 파이프라인 한 바퀴로 관통시키기

> 어제까지 세운 ui-harness를 오늘은 실제로 굴렸다. 런처를 순차 기동·라이브러리풍 로그로 개편하고 상세페이지를 케밥 메뉴·2행 헤더·리뷰 큐 기반 노출로 손본 다음, magnetic-cursor 하나를 결정 기록에서 promote 반영, 프레스 바운스 폴리시까지 staging에서 stable로 끝까지 밀어보고, 마지막에 Windows에서만 터지던 런처 spawn 오류를 막은 하루.

## 배경

지난 며칠은 ui-harness라는 도구를 백지에서 세우는 날들이었다. 오늘은 성격이 달랐다. 도구를 더 만드는 게 아니라, 세워둔 도구를 실제로 한 번 제대로 굴려보는 날이었다.

굴려보니 두 종류의 마찰이 드러났다. 하나는 도구 자체의 사용성이다. 런처가 서비스들을 동시에 띄우면서 로그가 뒤섞이고, 상세페이지는 액션 버튼들이 인라인으로 나열돼 정리가 안 됐다. 다른 하나는 파이프라인의 완주 여부다. 어제까지 decisions·review-queue 원장과 promote/deprecate 결정 구조는 만들어뒀지만, 컴포넌트 하나를 결정 기록부터 stable 승격까지 실제로 통과시켜 본 적은 없었다. 오늘 그 대상으로 magnetic-cursor를 골랐다.

그래서 하루는 크게 세 겹이었다. 오전은 런처와 상세페이지 UI를 실사용 가능한 수준으로 끌어올리는 정비, 낮은 magnetic-cursor를 staging에서 stable로 밀어 올리며 파이프라인을 처음으로 완주시키는 작업, 오후는 그 과정에서 드러난 Windows 전용 런처 버그를 크로스플랫폼으로 막는 마무리였다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- 런처 로그 라이브러리풍 개편·순차 기동
  - 첫 마찰은 런처였다. gallery와 storybook을 동시에 spawn하다 보니 로그가 뒤엉키고, 종료할 때 자식 프로세스의 exit 143 같은 노이즈가 그대로 새어 나왔다. 기동을 동시에서 순차로 바꿨다. waitForPort로 앞 서비스의 포트가 LISTEN 상태가 되는 것을 확인한 뒤에야 다음 서비스를 띄우게 했다. 로그도 배너 + 단계 심볼(◇ 대기 / ◐ 기동 중 / ✓ 준비 완료) + 준비 완료 요약 박스 형태의 라이브러리풍으로 재작성했고, 라벨 폭을 padStart로 통일해 `[  gallery]`·`[storybook]`처럼 정렬시켰다. killing 중에는 자식 출력과 exit ✗를 스킵해서 종료 노이즈를 억제했다.

- 상세페이지 수정 프롬프트 케밥 메뉴·헤더 2행 정렬·리뷰 버튼 큐 기반 노출
  - 다음은 상세페이지 정리였다. 헤더를 2행 구조로 나눴다. 위 행은 제목·뱃지와 액션 버튼을 수직 중앙 정렬하고, 설명은 아래 행으로 내렸다. 인라인으로 노출되던 '수정 프롬프트 복사'는 케밥(⋮) 팝오버 안으로 숨겼다. 이 과정에서 buildReviewModifyPrompt를 buildModifyPrompt(entry, { review })로 일반화했다. 코드 경로를 엔트리의 files에서 도출하게 만들어 draft(src/staging)와 stable(src) 양쪽 모두에 대응시키고, review 여부에 따라 via:"review" 배지를 조건부로 붙였다. '리뷰로 돌아가기' 버튼은 status===draft로 판단하던 것을 실제 리뷰 큐 멤버십(inReviewQueue)으로 바꿔, 상태 필드가 아니라 큐에 실제로 들어 있는지로 노출을 결정하게 했다. CopyButton에는 className prop을 열어 팝오버 메뉴 아이템으로 재사용할 수 있게 했다.

- magnetic-cursor 프레스 피드백 코드와 promote 결정 기록 (중간 저장)
  - 여기부터 magnetic-cursor 파이프라인이 시작된다. 먼저 컴포넌트 쪽에 프레스 피드백을 붙였다. 누르면 빠르게 압축(PRESS_SCALE 0.95)하고 놓으면 낮은 damping으로 1을 살짝 넘겨 튕겼다 정착하는 오버슈트를 스프링으로 구현했다. scale을 useMotionValue로 두고 끌림 x/y와 같은 style transform에 합성했으며, reduce(prefers-reduced-motion)면 압축을 아예 걸지 않아 컴포넌트 전반의 모션 정책과 일관되게 맞췄다. 데모의 레이아웃도 높이를 고정해 정돈했다. 동시에 decisions.json의 pending에 magnetic-cursor promote 결정을 기록하고 curate 상태 타임스탬프를 갱신했다. 아직 코드 이동은 하지 않은, 결정만 확정한 중간 지점이었다.

- magnetic-cursor staging→stable 승격 + 자석 버튼 프레스 바운스
  - 기록해둔 promote 결정을 실제 코드로 반영하며 파이프라인을 완주시켰다. src/staging/magnetic-cursor를 src/magnetic-cursor로 옮기고(코드·데모·스토리 함께), 한 단계 얕아진 상대 import를 보정했다(../../lib → ../lib). 배럴 src/index.ts에 MagneticCursor·MagneticButton과 Props 타입을 등록하고 신규 src/magnetic-cursor/index.ts에서 재export했다. 스토리 title은 Staging/MagneticCursor에서 Shared/UI/Animations/MagneticCursor로 옮기고, 엔트리 status를 draft에서 stable로, files 경로를 갱신했다. decisions.json의 해당 항목은 pending에서 archived로 넘기며 appliedAt을 찍어 review-queue와 정합을 맞췄다. import codemod는 필요 없었다. @maxflow/ui/staging/magnetic-cursor를 참조하던 사용처가 0건이었기 때문이다. 검증으로 @maxflow/ui typecheck를 통과시키고 ui-index를 재생성해 stable 23종을 확정했다.

- Windows 갤러리 런처 pnpm 실행 오류 수정
  - 마지막은 오전에 손댄 런처에서 나온 크로스플랫폼 버그였다. gallery.mjs가 pnpm을 shell 없이 spawn하고 있었는데, Windows에서는 pnpm이 pnpm.cmd라 shell 없이는 spawn ENOENT가 났다. dev.mjs와 동일한 방식으로 shell: process.platform === "win32"를 추가했다. mac/Linux는 shell:false를 유지해 기존 동작을 그대로 두었다. 체인을 점검해 보니 dev.mjs의 2곳은 이미 shell:win 처리가 돼 있었고 gallery.mjs 1곳만 빠져 있던, 딱 그 누락 지점이었다.

## 정리

오늘의 큰 줄기는 "만든 도구를 처음으로 끝까지 써보는 날"이었다. 며칠간 세운 ui-harness는 조각조각 검증은 됐지만, 컴포넌트 하나를 결정에서 승격까지 실제로 통과시켜 본 적은 없었다. magnetic-cursor를 그 첫 완주 대상으로 삼아 결정 기록(pending) → 코드 이동·배럴 등록·스토리 재배치 → decisions archived + appliedAt → typecheck·ui-index 재생성까지 한 바퀴를 돌리고 나서야, 어제까지의 원장 구조가 실제로 맞물려 도는 것을 확인할 수 있었다. 특히 promote를 두 커밋으로 나눈 게 자연스러웠다. 결정을 먼저 기록하고(pending) 나중에 반영(applied)하는 구조라, 중간에 프레스 바운스 같은 컴포넌트 폴리시를 끼워 넣어도 파이프라인이 흐트러지지 않았다.

도구를 실제로 굴리니 설계 단계에서는 안 보이던 마찰이 드러난 것도 오늘의 수확이다. 런처의 뒤엉킨 로그와 종료 노이즈, 상세페이지의 인라인 액션 나열은 데모로만 볼 때는 문제가 아니었지만, 매번 켜고 쓰는 순간 거슬리는 것들이었다. 순차 기동으로 바꾸고 로그를 라이브러리풍으로 다듬고 액션을 케밥으로 접은 것은 기능 추가가 아니라 실사용 마찰을 걷어낸 정비였다. 상세페이지에서 '리뷰로 돌아가기'를 status 필드가 아니라 실제 큐 멤버십으로 판정하도록 바꾼 것도 같은 맥락이다. 상태를 나타내는 필드가 여럿일 때는 파생 필드가 아니라 진짜 소스(큐에 들어 있는가)를 보고 판단해야 어긋나지 않는다.

마지막 Windows spawn 버그는 작지만 배운 점이 분명했다. 같은 spawn 패턴이 dev.mjs 2곳에는 이미 shell:win으로 처리돼 있었고 gallery.mjs 1곳만 누락돼 있었다. 하나를 고칠 때 같은 패턴이 코드베이스 어디에 또 있는지 체인을 점검하는 습관이, 이번엔 반대로 "이미 처리된 곳이 있으니 이 방식이 정답"이라는 확신의 근거가 돼줬다. 도구를 세우는 날에서 굴리는 날로 넘어오니, 남은 건 이제 이 파이프라인에 다음 컴포넌트들을 태우는 일이다.
