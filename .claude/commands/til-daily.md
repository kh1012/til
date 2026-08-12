# TIL 자동 생성 (일일 배치, 무인 실행)

launchd `com.kh1012.til-daily`가 매일 11:45에 `~/.claude/til-daily-cron.sh`를 통해
이 커맨드를 무인(non-interactive) 실행한다. 대화 상대가 없으므로 주제를 대화 맥락이 아니라
**secall/claude-mem 세션 기록**에서 스스로 찾아야 한다. 나머지(파일 경로, 프론트메터,
git commit/push)는 [til.md](til.md)의 규칙을 그대로 따르되, "주제 파악"만 아래 1~3절로
대체한다.

## 1. 대상 날짜

- 실행일에서 하루를 뺀 날짜("어제")를 대상으로 한다. secall 야간 배치(`com.kh1012.secall-sync`,
  23:30)가 그 전날 세션을 이미 인덱싱해둔 뒤이므로, 11:45 시점엔 어제 세션 기록이 완전하다.
- 대상 날짜로 이미 파일이 존재하는지 먼저 확인한다: til 레포에서
  `{YYYY}/{MM}/{YYMMDD}_*.md` 패턴을 찾는다. 이미 있으면 — 이미 처리된 날짜다. 아무것도
  만들지 말고 표준출력에 `skip: already have a TIL for {YYMMDD}`를 남기고 종료한다
  (재실행/재시도 안전장치).

## 2. 세션 기록에서 주제 후보 찾기

- `mcp__secall__recall`로 대상 날짜의 세션을 훑는다. temporal 쿼리(예: `"since {YYYY-MM-DD}"`,
  대상 날짜 하루만 보고 싶으면 결과의 `date` 필드로 그 날짜만 필터)와 keyword/semantic을
  함께 조합해서 쓴다. 특정 project로 좁히지 말고 그 날 있었던 세션 전부를 대상으로 한다.
- 결과에서 `⚖결정`, `●버그수정`, `◆신규기능`, `○발견`처럼 "왜 이렇게 했는지"가 남는 turn을
  우선한다. `mcp__secall__get`으로 앞뒤 turn을 몇 개 더 읽어 배경을 파악한다.
- 단순 반복 작업(포맷팅, 오탈자, 의존성 버전만 올리는 커밋, 별다른 판단 없는 잡무)은
  후보에서 제외한다.
- claude-mem `mem-search`/`session_start_context`로 보강해도 된다 — 당일~최근 세션은 이쪽
  색인이 더 빠를 수 있다.
- **하루 최대 1건**만 고른다. 후보가 여럿이면 가장 기술적으로 깊거나, 나중에 같은 문제를
  또 만났을 때 다시 찾아볼 가치가 있는 것 하나를 고른다.

## 3. 학습거리가 없으면 조용히 종료

- 대상 날짜에 세션이 없거나, 있어도 전부 잡무/반복 작업이면 파일을 만들지 않는다.
  "매일 뭐라도 써야 한다"는 압박에 지지 말 것 — 노이즈보다 침묵이 낫다.
- 이 경우 표준출력에 `skip: no notable session activity for {YYMMDD}`를 남기고 종료한다.

## 4. 파일 생성 · Git push

- 파일 경로, 프론트메터 스키마(`draft`/`type`/`domain`/`category`/`topic`/`updatedAt`/
  `satisfaction`/`keywords`/`relatedCategories`), 마크다운 본문 구조, 커밋 메시지 형식
  (`Add TIL: {topic}`)은 [til.md](til.md) 2~4절과 동일하다. `updatedAt`은 대상 날짜(어제)로
  쓴다 — 실행일(오늘)이 아니다.
- `category`는 `rule.md`의 `skillTopics` 분류를 참고해 고른다.
- `draft: true`는 이 커맨드가 생성한 글에는 붙이지 않는다 — 세션 기록에서 이미 실제로
  겪은 일을 정리하는 것이므로 초안이 아니라 완결된 기록이다. `draft` 필드 자체를
  생략한다.
- git add/commit 후 `git push origin main`. push가 실패해도(네트워크 등) 비정상 종료하지
  않고 로그에 이유를 남긴다 — 로컬 커밋은 남아 있으니 사용자가 나중에 수동으로 push할 수
  있다. 단, 이 경우 다음날 실행은 대상 날짜 파일이 이미 로컬에 있으므로 재시도하지
  않는다(1절 참고).

## 5. 완료 안내

- 표준출력에 생성된 파일 경로와 push 결과를 한 줄로 남긴다.
