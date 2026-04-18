---
draft: true
type: "content"
domain: "devops"
category: "cli"
topic: "grep 기본 옵션과 파이프(|), wc 차이 정리"
updatedAt: "2026-04-18"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "grep"
  - "CLI"
  - "shell"
  - "pipe"
  - "wc"
  - "ripgrep"

relatedCategories:
  - "shell"
  - "terminal"
  - "claude-code"
---

# grep 기본 옵션과 파이프, wc 차이

> Claude Code가 코드베이스를 탐색할 때 늘 쓰는 `grep -rn`과 `| wc -l` 조합. 매번 눈으로만 스쳐보던 이 한 줄이 실제로 뭘 하는지 제대로 뜯어봤다.

## 배경

Claude Code가 규칙 감사를 할 때마다 아래 같은 명령을 반복해서 돌린다.

```bash
grep -rn "text-\(xs\|sm\|base\|lg\|xl\|2xl\)" src/ | wc -l
```

프로젝트의 `frontend-rules.md`에도 "검출 방법"으로 grep 패턴이 거의 규칙마다 붙어 있다. 그런데 정작 `-r`, `-n`, `|`, `wc -l`이 각각 무슨 역할을 하는지 흐릿하게만 알고 있었다. 읽지 못하는 도구로 감사를 한다는 게 이상해서 기본부터 정리했다.

## 핵심 내용

### 1. `grep` — 파일에서 패턴 매칭하기

`grep`은 "**g**lobally search a **r**egular **e**xpression and **p**rint"의 약자다. 입력에서 정규식(또는 고정 문자열)에 매칭되는 **줄**을 출력한다.

```bash
grep "pattern" file.txt
```

가장 단순한 형태는 파일 하나에서 패턴을 찾는 것이다. 매칭되는 줄이 그대로 stdout으로 나온다. 매칭이 하나도 없으면 아무 출력 없이 종료 코드만 1로 반환한다(매칭되면 0).

### 2. `-r` — 디렉토리 재귀 탐색

`-r`은 `--recursive`의 약자로, 파일 하나가 아니라 **디렉토리 전체를 재귀적으로** 뒤진다.

```bash
grep -r "useState" src/
```

이 명령은 `src/` 이하 모든 파일을 열어 `useState`가 포함된 줄을 찾는다. 출력 포맷이 약간 달라져서 각 줄 앞에 **파일 경로**가 붙는다.

```
src/features/chat/ui/ChatInput.tsx:const [value, setValue] = useState("");
src/shared/ui/Input.tsx:  const [focused, setFocused] = useState(false);
```

`-R`도 비슷하지만 심볼릭 링크 처리 방식이 다르다. 코드베이스 감사에서는 그냥 `-r`이면 충분하다.

### 3. `-n` — 줄 번호 표시

`-n`은 `--line-number`의 약자. 매칭된 줄의 **파일 내 줄 번호**를 함께 출력한다.

```bash
grep -rn "useState" src/
```

출력은 이렇게 바뀐다.

```
src/features/chat/ui/ChatInput.tsx:42:const [value, setValue] = useState("");
src/shared/ui/Input.tsx:15:  const [focused, setFocused] = useState(false);
```

`파일경로:줄번호:매칭된_줄` 포맷이다. 에디터가 이 포맷을 이해해서 클릭하면 해당 라인으로 점프하는 경우가 많다. Claude Code가 `file_path:line_number`로 코드 위치를 안내하는 것도 같은 관습이다.

### 4. `|` — 파이프, 앞 명령의 출력을 뒤 명령의 입력으로

`|`(파이프)는 grep 옵션이 아니라 **쉘의 기본 문법**이다. 앞 명령의 **stdout**을 뒤 명령의 **stdin**으로 연결한다.

```bash
grep -rn "useState" src/ | wc -l
```

이 문장은 이렇게 읽는다.

1. `grep -rn "useState" src/`를 실행한다.
2. 그 결과(매칭된 줄들)를 화면에 출력하지 않고 **다음 명령의 입력으로 보낸다**.
3. `wc -l`이 그 입력을 받아 처리한다.

파이프는 원래 유닉스 철학인 "작은 도구를 조합해서 큰 일을 한다"의 핵심이다. grep은 매칭만, wc는 세기만 할 줄 알면 되고, 둘을 조합해서 "매칭된 줄의 개수를 센다"가 된다.

### 5. `wc` vs `wc -l` — 무엇을 세는가

`wc`는 "**w**ord **c**ount"의 약자인데, 사실 기본 동작은 세 가지를 모두 세는 것이다.

```bash
echo "hello world" | wc
#       1       2      12
```

출력은 순서대로 **줄 수(lines) / 단어 수(words) / 바이트 수(bytes)**다.

| 옵션 | 세는 대상 |
|------|-----------|
| `wc` | 줄, 단어, 바이트 전부 |
| `wc -l` | 줄(line) 수만 |
| `wc -w` | 단어(word) 수만 |
| `wc -c` | 바이트(char) 수만 |
| `wc -m` | 문자(멀티바이트 고려) 수만 |

그래서 `grep -rn "..." src/ | wc -l`은 결국 **"매칭된 줄이 몇 개인지"**를 하나의 숫자로 뽑는다. 규칙 위반이 몇 건 있는지 빠르게 셀 때 제일 자주 쓰는 조합이다.

### 6. 한눈에 정리

```bash
grep -rn "text-xs" src/ | wc -l
```

이 한 줄을 분해하면:

- `grep` — 패턴 매칭 도구
- `-r` — `src/` 디렉토리를 재귀로 훑는다
- `-n` — 매칭된 줄의 번호를 같이 출력
- `"text-xs"` — 찾을 패턴
- `src/` — 탐색 대상 경로
- `|` — grep의 출력을 다음 명령으로 보내는 파이프
- `wc -l` — 받은 입력의 줄 수를 센다

즉 "**`src/` 전체에서 `text-xs`가 등장하는 줄의 개수**"를 구하는 명령이다.

### 7. Claude Code는 사실 ripgrep을 쓴다

한 가지 덧붙이면, Claude Code 내부의 Grep 툴은 BSD/GNU grep이 아니라 **ripgrep(`rg`)** 기반이다. `.gitignore`를 자동 존중하고 훨씬 빠르다. 그래서 시스템 프롬프트에도 "ALWAYS use Grep for search tasks. NEVER invoke `grep` or `rg` as a Bash command"라고 명시되어 있다. 옵션 이름은 대부분 같아서(`-n`, `-r`은 동일, `-i`는 대소문자 무시 등) 기본기를 익혀 두면 그대로 쓴다.

## 정리

- 매일 스쳐 보던 `grep -rn "..." src/ | wc -l`이 사실은 **"재귀 탐색(`-r`) + 줄 번호(`-n`) + 파이프(`|`) + 줄 세기(`wc -l`)"** 네 가지가 조합된 문장이었다.
- 파이프 `|`는 grep의 옵션이 아니라 **쉘 문법**이라는 것, 앞 명령의 stdout을 뒤 명령의 stdin으로 연결한다는 걸 다시 분명히 했다.
- `wc`는 기본이 "줄/단어/바이트" 전부이고, `-l`을 붙여야 줄만 센다. 이 구분을 몰라서 괜히 출력이 세 숫자로 나와 당황한 적이 많았다.
- 앞으로 Claude Code가 감사 결과로 "27 violations found"라고 말할 때, 그게 어떤 grep + wc 조합에서 나온 숫자인지 머릿속에서 명확히 그릴 수 있게 됐다. 도구의 내부를 읽을 줄 알아야 도구를 신뢰할 수 있다.
