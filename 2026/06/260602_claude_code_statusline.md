---
draft: true
type: "content"
domain: "devops"
category: "claude-code"
topic: "Claude Code 커스텀 status line 제작과 bash 함정"
updatedAt: "2026-06-02"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "claude-code"
  - "statusline"
  - "bash"
  - "shell-script"
  - "jq"

relatedCategories:
  - "shell"
  - "devtools"
---

# FE 모노레포용 Claude Code status line 직접 만들기

> 모델·context·git 기본 정보에 더해 모노레포 위치·dev 서비스 포트·tsc/eslint 에러·usage까지 보여주는 3줄 status line을 bash로 만들며 만난 함정과 패턴 정리.

## 배경

Claude Code는 `settings.json`의 `statusLine.command`에 지정한 셸 스크립트를 **매 렌더마다** 실행하고, stdin으로 세션 상태 JSON을 넘겨준다. 그 출력(stdout)이 화면 하단 status line이 된다. FE pnpm 모노레포 작업에 맞춰 정보를 추가하려고 직접 만들었는데, "셸 스크립트 한 장"치고는 함정이 꽤 많았다.

## 핵심 내용

### 1. stdin JSON은 추측하지 말고 실측한다

`input=$(cat)` 다음에 임시로 `echo "$input" > /tmp/dbg.json` 한 줄을 넣고 한 번 렌더시키면 실제 구조를 그대로 잡을 수 있다. 최신 CC(2.1.156)에서는 생각보다 많은 게 stdin에 **직접** 들어온다:

```json
{
  "model": { "display_name": "Opus 4.8 (1M context)" },
  "context_window": { "used_percentage": 9, "context_window_size": 1000000, "total_input_tokens": 88958 },
  "cost": { "total_cost_usd": 1.15, "total_lines_added": 15 },
  "rate_limits": {
    "five_hour":  { "used_percentage": 35, "resets_at": 1780386000 },
    "seven_day":  { "used_percentage": 3,  "resets_at": 1780732800 }
  },
  "workspace": { "repo": { "name": "..." } }, "cwd": "...", "effort": { "level": "xhigh" }
}
```

특히 **rate limit(5시간/주간 사용률)과 비용이 stdin에 그대로** 있어서, ccusage 같은 외부 CLI나 OAuth 캐시 없이 stdin만 파싱하면 됐다. `resets_at`은 unix epoch(초). 반대로 "현재 편집 중인 파일" 같은 필드는 없어서 git으로 폴백해야 한다.

### 2. 렌더 경로는 무조건 빨라야 한다 — 무거운 건 캐시로

status line은 매 렌더 도니까 오래 걸리면 타임아웃으로 죽는다. 그래서 **tsc/eslint 같은 무거운 검사는 절대 렌더 안에서 돌리지 않는다.** 별도 watch 스크립트가 `tsc --noEmit --watch` 출력의 `Found N errors`를 파싱해 `/tmp/cc-tsc-errors-<proj>` 캐시에 써두고, status line은 그 파일만 `cat` 한다.

프로파일링해 보니 진짜 병목은 의외로 `git status`였다(대형 worktree에서 ~0.45s). 원인은 untracked 파일 스캔이라 옵션 하나로 해결됐다:

```bash
# 0.45s -> 0.13s. untracked 스캔을 건너뛰어도 dirty 표시/최근수정 파일엔 충분
git status --porcelain --untracked-files=no
```

포트 체크도 포트마다 `nc`로 두드리지 않고 `netstat -an -p tcp` **한 번** 호출로 LISTEN 목록을 받아 대조한다. (macOS netstat은 `127.0.0.1.9111`, `*.9111`처럼 포트 앞이 점이라 `sub(/.*[.:]/,"",n)`로 끝의 포트만 떼야 한다.)

### 3. macOS 시스템 bash는 아직 3.2다

`/bin/bash`는 3.2.57. `declare -A`(연관배열) 같은 bash4 기능을 쓰면 `declare: -A: invalid option`으로 깨진다. status line이 어떤 bash로 실행될지 보장 못 하니, **연관배열 대신 `case` 함수**로 매핑을 짰다.

```bash
eff_cl() { case "$1" in low) printf %s "$GRY";; high) printf %s "$CYN";; max) printf %s "$RED";; esac; }
```

### 4. `IFS=$'\t' read`는 빈 필드를 삼킨다 (가장 날카로운 함정)

여러 필드를 jq `@tsv`로 뽑아 `IFS=$'\t' read`로 한 번에 받았더니, rate_limits가 없는 입력에서 값이 한 칸씩 밀려 `5h false%` 같은 괴현상이 났다.

원인: **tab/space/newline은 IFS-whitespace라, `read`가 연속된 구분자를 하나로 합치고 빈 필드를 없앤다.** 즉 빈 값 두 개가 인접하면 필드가 붕괴해 정렬이 깨진다. 해결은 구분자를 whitespace가 아닌 문자로 바꾸는 것 — **US(Unit Separator, `0x1f`)**:

```bash
# jq: 탭 대신 US로 join (빈 필드 보존)
TSV=$(printf '%s' "$input" | jq -r '[ .a//"", .b//"", ... ] | map(tostring) | join("")')
IFS=$'\037' read -r A B C ... <<EOF
$TSV
EOF
```

비-whitespace 구분자는 `read`가 합치지 않아 빈 필드가 그대로 유지된다.

### 5. watch 자동기동은 mkdir 원자 락으로

매번 watch를 손으로 띄우기 귀찮아서, status line이 watch가 죽어 있으면 자동으로 백그라운드 기동하게 했다. 그런데 pidfile/pgrep 가드는 **race에 취약**했다 — 렌더가 빠르게 연속되면 `nohup`으로 띄운 watch가 `exec`을 끝내고 `ps`에 보이기 전에 다음 렌더가 또 띄워서, watch가 8개씩 떴다.

해결은 **`mkdir`의 원자성**. 동시 렌더 중 정확히 하나만 디렉터리 생성에 성공한다:

```bash
LOCK="/tmp/cc-watch-$PROJ.lock"
if mkdir "$LOCK" 2>/dev/null; then          # 원자적 — 동시에 한 명만 성공
  nohup bash watch.sh "$tgt" >log 2>&1 &
  echo $! > "$LOCK/pid"
else
  lpid=$(cat "$LOCK/pid" 2>/dev/null)        # 락 주인이 죽었으면 stale 정리 → 다음 렌더가 재기동
  { [ -z "$lpid" ] || ! kill -0 "$lpid" 2>/dev/null; } && rm -rf "$LOCK"
fi
```

### 6. 카운트 착시 — pgrep은 자식 서브셸까지 센다

위를 디버깅할 때 `pgrep -f statusline-watch.sh | wc -l`이 5를 찍어서 "아직도 중복!"이라 오해했다. 실제로는 watch **1개**가 만든 자식들(`run_tsc &` 서브셸, `( … ) | while` 파이프)이 부모의 커맨드라인을 그대로 상속해 다중으로 잡힌 것뿐이었다. 진짜 인스턴스 수는 `ppid==1`(detach된 메인)로 세야 정확하다.

```bash
ps -o pid,ppid,command -p $(pgrep -f watch.sh)   # ppid 보면 부모-자식이 드러난다
```

### 7. OSC 8 하이퍼링크 밑줄은 escape로 끌 수 없다

서비스 라벨을 iTerm2 OSC 8(`\e]8;;URL\e\\텍스트\e]8;;\e\\`)로 클릭 가능하게 했더니 밑줄이 생겼다. 밑줄/하이라이트는 **터미널이 링크에 입히는 장식**이라 SGR(`\e[24m`)로 끄려 해도 안 먹는다. "밑줄 없이 클릭만"은 사실상 불가 — 링크를 빼거나 밑줄을 감수하는 선택뿐이다.

## 정리

- **외부 상태는 추측하지 말고 한 줄 덤프로 실측한다.** stdin에 이미 있는 걸 외부 CLI로 다시 가져오는 헛수고를 막아준다.
- **"매번 실행되는 자리"에는 무거운 일을 두지 않는다.** 무거운 검사는 watch가 캐시에 써두고, hot path는 캐시만 읽는다. 이 분리가 status line의 핵심 설계였다.
- bash는 **3.2 호환, IFS-whitespace 붕괴, 원자적 락(mkdir), pgrep 착시** — 한 장짜리 스크립트에도 함정이 빽빽하다. 셸은 "되는 것"과 "견고한 것" 사이 간극이 크다.
- 터미널 escape는 **내가 제어하는 것(색·텍스트)과 터미널이 제어하는 것(링크 장식)의 경계**를 알아야 한다.
