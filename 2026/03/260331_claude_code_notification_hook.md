---
draft: true
type: "content"
domain: "devops"
category: "claude-code"
topic: "Claude Code Notification hook stdin JSON 파싱으로 ntfy 알림 개선"
updatedAt: "2026-03-31"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "claude-code"
  - "hooks"
  - "ntfy"
  - "notification"
  - "jq"

relatedCategories:
  - "shell"
  - "productivity"
---

# Claude Code Notification hook으로 ntfy 알림 커스터마이징

> `$CLAUDE_NOTIFICATION_MESSAGE`만으로는 "trigger"밖에 안 오던 ntfy 알림을 stdin JSON 파싱으로 `[프로젝트] 입력 대기` 형태로 개선

## 배경

Claude Code에 ntfy.sh webhook을 연결해 모바일 알림을 받고 있었는데, 알림 내용이 항상 "trigger"로만 와서 어떤 터미널인지, 무슨 상황인지 구분이 안 됐다. 여러 탭에서 동시에 Claude Code를 쓰는 환경이라 프로젝트 구분이 필수였다.

## 핵심 내용

### 1. Notification hook의 실제 데이터

`settings.json`의 Notification hook은 `$CLAUDE_NOTIFICATION_MESSAGE` 환경변수 외에 **stdin으로 JSON**을 받는다. 디버그 스크립트로 캡처한 실제 데이터:

```json
{
  "session_id": "da668e0a-...",
  "transcript_path": "/Users/.../.jsonl",
  "cwd": "/Users/kh1012/MIDAS/Source/maxys_proto_2/maxys/frontend-3",
  "hook_event_name": "Notification",
  "message": "Claude is waiting for your input",
  "notification_type": "idle_prompt"
}
```

핵심 필드:
- `notification_type`: `idle_prompt`(입력 대기), `permission_prompt`(권한 요청) 등
- `cwd`: 현재 작업 디렉토리 → 프로젝트명 추출 가능
- `message`: 고정 문구라 그대로 쓰면 의미 없음

### 2. 디버그 → 구현 2단계 접근

먼저 stdin을 파일에 기록하는 디버그 스크립트를 만들어 실제 JSON 구조를 확인하고, 그 다음에 최종 스크립트를 작성했다. hook에서 어떤 데이터가 오는지 문서만으로는 불확실할 때 유용한 패턴.

```bash
# 디버그 단계
INPUT=$(cat)
echo "$(date) $INPUT" >> /tmp/claude-ntfy-debug.log
```

### 3. 최종 스크립트 구조

```bash
#!/bin/bash
INPUT=$(cat)
TYPE=$(echo "$INPUT" | jq -r '.notification_type // "unknown"')
CWD=$(echo "$INPUT" | jq -r '.cwd // ""')
PROJECT=$(basename "$CWD")

case "$TYPE" in
  idle_prompt)       LABEL="입력 대기" ;;
  permission_prompt) LABEL="권한 요청" ;;
  *)                 LABEL="$TYPE" ;;
esac

MSG="[$PROJECT] $LABEL"
curl -s -o /dev/null -H "Title: Claude Code" -d "$MSG" ntfy.sh/topic
```

### 4. settings.json 설정

기존에 terminal-notifier와 curl을 별도 hook으로 두던 것을 하나의 스크립트로 통합:

```json
{
  "hooks": {
    "Notification": [{
      "matcher": "",
      "hooks": [{
        "type": "command",
        "command": "~/.claude/hooks/ntfy-notify.sh"
      }]
    }]
  }
}
```

## 정리

- Claude Code hook은 환경변수뿐 아니라 **stdin JSON**으로 풍부한 컨텍스트를 제공한다
- `cwd`에서 프로젝트명을 추출하면 멀티탭 환경에서 어떤 세션인지 즉시 구분 가능
- hook 커스터마이징 시 디버그 스크립트로 실제 데이터를 먼저 캡처하는 것이 안전한 접근법
- `notification_type`으로 case 분기하면 향후 새 유형이 추가돼도 대응 가능
