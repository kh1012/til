---
draft: true
type: "content"
domain: "frontend"
category: "design-system"
topic: "ui-harness를 팀 실사용 단계로 넘기며 나온 견고화 하루. color-palette·token-list draft를 stable로 승격하고, 승격 후 수정 시 생기는 orphan 파일 사일런트 실패를 GUIDE 절차로 막고, dev 서버 바인딩을 127.0.0.1로 통일했다. 이어 공유 배열(token-proposals.json)이 동시 draft 작업에서 확정적 merge conflict를 내는 걸 제안별 격리 파일로 풀고, 스킬 설치를 Claude Code·Codex 양쪽에 한 명령으로 동시 배포하도록 온보딩까지 재정비한 흐름"
updatedAt: "2026-07-08"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "ui-harness"
  - "staging-promote"
  - "orphan-file"
  - "concurrency-isolation"
  - "merge-conflict"
  - "token-proposals"
  - "multi-agent"
  - "codex-agents-skills"
  - "vite-dev-server"
  - "onboarding"

relatedCategories:
  - "react"
  - "devops"
  - "typescript"
---

# ui-harness를 팀에 넘기며: 승격, 동시성 격리, 멀티 에이전트 배포

> draft를 stable로 올리고, 여럿이 동시에 굴려도 안 깨지게 격리하고, Claude Code와 Codex 어느 쪽을 쓰든 같은 명령으로 준비되게 만든 하루.

## 배경

지난 며칠간 ui-harness를 세우고(부트스트랩, 갤러리, 히스토리, 리뷰 데스크, 런처) 스킬 파이프라인을 한 바퀴 관통시켰다. 오늘은 이걸 나 혼자 굴리는 도구에서 팀이 같이 쓰는 인프라로 넘기는 단계였다. 그 전환에서 나오는 문제는 대부분 "혼자 순차로 쓸 때는 안 보이던" 것들이다. 승격된 컴포넌트를 다시 고칠 때의 경로 혼동, 여러 사람이 동시에 draft를 만들 때의 파일 충돌, 그리고 팀원마다 다른 AI 도구(Claude Code / Codex)를 쓸 때의 설치 편차. 오늘 커밋들은 전부 이 세 축을 하나씩 메꾼 기록이다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- color-palette·token-list draft를 stable로 승격
  - 리뷰 데스크 결정(decisions.json)을 반영한 승격. 소비처가 0인 net-new draft라 codemod 없이 이동만 하면 됐다.
  - `src/staging/{color-palette,token-list}`를 `src/{...}`로 옮기고, 배럴(`src/index.ts`)에 `ColorPalette`·`TokenList` export를 등록. 스토리 title을 `Staging/*`에서 `Shared/UI/System/*`로 바꾸고, entries의 `meta.status`를 draft→stable로, files 경로를 갱신했다. decisions는 pending→archived로 넘기고 review-queue가 비었는지 정합성까지 확인.

- dev 서버를 127.0.0.1로 고정 + 갤러리 시작 로그 프레이밍
  - `localhost`가 환경에 따라 IPv6(`::1`)로 먼저 풀리면 127.0.0.1로 바인딩한 서버와 어긋난다. 갤러리·Storybook URL·바인딩을 전부 127.0.0.1로 통일해 이 미스매치를 없앴다.
  - 갤러리 시작 박스를 Storybook과 같은 clack 스타일 좌측 트랙으로 감싸고, vite의 "ready in" 로그에만 아이콘을 붙여 두 프로세스의 로그 톤을 맞췄다.

- stable 승격 후 수정 시 orphan 파일 방지 절차 추가 (GUIDE 문서)
  - 실사용에서 재현된 사일런트 실패. 기존 GUIDE는 "draft 코드 = `src/staging/<name>/`"만 가정해서, 이미 stable로 승격된 컴포넌트를 고칠 때도 그 staging 경로를 따라가기 쉬웠다. 그런데 승격 후 코드는 `src/<name>/`로 옮겨져 있으니 staging에 다시 쓰면 아무도 import하지 않는 고아 파일이 생긴다. 히스토리는 정상 append되니 "수정했는데 화면만 안 바뀐" 것처럼 보인다. 이게 제일 잡기 어려운 종류의 버그다.
  - GUIDE의 해당 절을 draft·stable 공통으로 확장해서, 코드 수정 전에 `entries/<name>.json`의 `files[0].path`로 실제 위치를 먼저 확인하는 절차를 넣고 하드 룰에도 같은 가드를 명시했다.

- color-palette 스와치 카드 축소 + 갤러리 데모 전체 색상 노출
  - 스와치 박스 높이를 h-16에서 h-8로 절반 줄이고, 갤러리 데모가 Primary·Neutral·Semantic 3그룹 전체(스토리북 Default와 동일한 28개 스와치)를 보여주도록 확장. ui-harness 수정 히스토리 사이드카에도 기록.

- token-proposals.json을 제안별 격리 파일 + curate 취합본으로 분리
  - git worktree 2개로 동시 draft 작업 충돌을 일부러 시뮬레이션해서 확인한 결과다. `entries/<name>.json`은 파일 격리라 무충돌인데, 공유 배열인 `token-proposals.json`은 여러 사람이 각자 append하면 끝 항목의 trailing comma 라인이 겹쳐서 git merge conflict가 확정적으로 남았다.
  - entries와 같은 원리로 `token-proposals/<token-name>.json`(제안 1건 = 파일 1개)으로 격리하고, `token-proposals.json`은 `/ui-curate` 실행 시에만 그 디렉터리를 스캔해 전체 재생성하는 파생 취합본으로 바꿨다. `index.json`이 `entries/*.json`에서 재생성되는 것과 똑같은 패턴이다. 기존 제안 2건은 격리 파일로 마이그레이션했고, 재생성 결과가 원본과 byte-identical인지까지 확인했다.

- 스킬 설치를 Claude Code·Codex 양쪽에 동시 배포 + 온보딩 재정비
  - `pnpm ui:skills` 한 명령이 Claude Code(`.claude/skills`)와 Codex(`.agents/skills`) 양쪽에 개발자용 ui-harness 스킬 1종을 동시에 설치하도록 바꿨다. 팀원이 어느 도구를 쓰든 환경이 같아진다. 리뷰·승격·폐기를 직접 하는 관리자만 `pnpm ui:skills:all`로 ui-curate·ui-apply까지 받는다.
  - 온보딩 모달을 도구별 프롬프트 2개(Claude용/Codex용) 복사 방식에서, 단일 설치 명령(`pnpm ui:skills`) 하나를 붙여넣으면 둘 다 준비되는 방식으로 리팩터했다. CLAUDE.md·team-guide.md 문서와 `.gitignore`(`.agents/` 추가)도 같이 정리.

## 정리

오늘 여섯 개 커밋을 관통하는 건 "혼자 순차로 쓸 때는 안 보이던 문제가 팀·동시·멀티도구 조건에서 터진다"는 한 줄이다. 승격 후 orphan 파일은 순차 작업에서는 그냥 안 겪는 일이고, token-proposals 충돌은 동시 작업에서만 확정적으로 나며, 스킬 설치 편차는 팀에 여러 도구가 섞여야 문제가 된다. 셋 다 도구가 성숙 단계로 넘어가는 문턱에서 나오는 전형적인 전환 비용이다.

가장 배운 게 컸던 건 token-proposals 격리다. 처음엔 그냥 "가끔 충돌 나겠지" 정도로 넘길 수 있었는데, worktree 2개로 실제 재현해 보니 trailing comma 라인이 겹쳐서 확정적으로 conflict가 나는 구조적 문제였다. 여기서 해법을 즉흥적으로 만들지 않고 이미 검증된 패턴(`entries/*.json` → `index.json` 재생성)을 그대로 가져다 쓴 게 좋았다. 공유 가변 상태를 없애고 격리 파일 + 파생 취합본으로 바꾸는 건 결국 동시성 문제를 파일 시스템 레벨에서 푸는 방식이고, 마이그레이션 결과가 byte-identical인지 확인해서 무손실을 증명한 것도 안심이 됐다.

orphan 파일 건은 사일런트 실패라는 게 무서웠다. 에러가 나면 그나마 잡히는데, "히스토리는 정상, 화면만 안 바뀜"은 성공처럼 보인다. 강제로 경로를 막는 대신 GUIDE에 "고치기 전에 entries에서 실제 위치부터 확인"이라는 절차를 넣은 건, 하네스가 사람을 막는 도구가 아니라 실수를 조기에 드러내는 도구라는 방향과도 맞는다. 도구를 남에게 넘길 때 코드보다 이런 절차와 온보딩 정리가 실제 채택률을 좌우한다는 걸 다시 확인한 하루였다.
