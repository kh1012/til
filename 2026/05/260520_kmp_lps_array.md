---
draft: true
type: "content"
domain: "backend"
category: "algorithm"
topic: "KMP 알고리즘과 LPS 배열"
updatedAt: "2026-05-20"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "kmp"
  - "lps"
  - "string matching"
  - "buildLPS"
  - "algorithm"

relatedCategories:
  - "javascript"
  - "datastructure"
---

# KMP 알고리즘과 LPS 배열 정리

> buildLPS가 마법처럼 보였던 이유는 인덱싱 감각과 부트스트랩 구조를 놓쳐서였다.

## 배경

긴 text 안에서 짧은 pattern을 찾는 문제를 KMP로 풀어봤다.
코드 자체는 짧은데, 한 줄 한 줄이 왜 그렇게 생겼는지가 안 잡혔다.
특히 `len = lps[len - 1]` 한 줄에서 한참 막혔다.
오늘은 그 막힘들을 순서대로 풀어낸 과정을 정리한다.

## KMP가 푸는 문제

핵심은 단순하다. 긴 text 안에서 짧은 pattern의 위치를 찾는다.

Naive 방식은 text의 모든 위치에서 pattern을 처음부터 비교한다.
한 글자라도 어긋나면 pattern을 한 칸 옮겨서 다시 처음부터 본다.
최악의 경우 O(n*m)이다. 이미 비교했던 글자들을 매번 버리고 다시 본다.

KMP의 아이디어는 이렇다. "이미 비교해서 알아낸 정보를 버리지 말자."
매칭이 깨졌을 때, 그동안 일치했던 부분에서 얻은 정보를 활용해 pattern을 똑똑하게 점프시킨다.
그 결과 O(n+m)이 된다.
이 "똑똑한 점프"를 가능하게 하는 사전 계산 결과가 LPS 배열이다.

## LPS 배열의 정의

LPS는 Longest Proper Prefix which is also Suffix의 약자다.

`lps[i]` = pattern[0..i]에서 진접두사이면서 동시에 진접미사인 가장 긴 길이.

여기서 "진(proper)"이 핵심이다. 자기 자신은 제외한다.
자기 자신을 포함하면 lps는 무조건 전체 길이가 되어버려서 정보로서 의미가 사라진다.

예시로 "ABABCABAB"의 lps는 다음과 같다.

```
pattern:  A  B  A  B  C  A  B  A  B
lps:      0  0  1  2  0  1  2  3  4
```

## 막혔던 지점들

학습하면서 헷갈렸던 순서 그대로 적는다.

### 막힘 1. "AB"인데 왜 lps[1]이 0이지?

lps 배열을 처음 보면서 가장 먼저 던진 질문이다.
"A"와 "B"가 같은 문자열 안에 있는데 왜 1이 아니지? 라고 생각했다.

해소된 순간은 비교 대상을 착각하고 있었다는 걸 알았을 때다.
LPS는 text vs pattern 비교가 아니다.
**같은 문자열 안에서 진접두사와 진접미사를 비교**하는 것이다.

"AB"의 진접두사는 "A", 진접미사는 "B"다.
서로 다른 글자니까 일치하는 길이는 0이 맞다.

이걸로 "자기 자신 제외" 정의가 왜 중요한지도 같이 풀렸다.
자기 자신을 포함하면 "AB"의 접두사 = 접미사 = "AB"가 되어 lps가 2가 되어버린다.
그러면 모든 lps가 전체 길이라서 아무 쓸모가 없다.

### 막힘 2. len이 "다음 비교할 인덱스"라는 게 헷갈림

코드에서 `pattern[len]`을 비교하는 부분이 이상했다.
len은 분명 "길이"인데 왜 배열 인덱스로 쓰지?

해소된 순간은 배열이 0부터 시작한다는 기본을 다시 떠올렸을 때다.

"len개가 채워졌다"는 말은 "인덱스 0부터 len-1까지 채워졌다"는 뜻이다.
그러면 다음 빈 자리는 자연스럽게 인덱스 len이 된다.

엘리베이터 비유로 확실히 잡혔다.
4명이 탔으면 다음 사람은 5번째, 인덱스로는 4번 자리에 선다.
**"지금까지의 개수"와 "다음에 채울 인덱스"가 같은 숫자**라는 게 핵심이다.

그래서 `pattern[len]`은 "지금까지 len글자가 접두사로 일치했으니, 다음에 비교할 접두사 글자"를 정확히 가리킨다.

### 막힘 3. `len = lps[len - 1]`이 도저히 이해 안 됨

KMP에서 제일 어려웠던 부분이다.
"왜 그냥 len - 1로 줄이면 안 되고, 굳이 lps[len - 1]을 가져오지?"가 안 풀렸다.

먼저 단순히 len - 1로 줄이면 안 되는 이유를 예시로 확인했다.
"ABCAB"에서 5글자가 매칭됐다가 다음 글자에서 깨졌다고 하자.
무작정 1만 줄여서 4글자로 보면 "ABCA"가 접두사, "BCAB"가 접미사인데 둘은 일치하지 않는다.
즉 1씩 줄이는 건 진접두사 = 진접미사 조건을 전혀 보장하지 못한다.

핵심 통찰은 이거였다.
**지금 매칭된 부분 pattern[0..len-1]도 결국 패턴의 일부분이고, 그 부분의 lps는 이미 계산되어 있다.**

그 `lps[len - 1]` 값이 바로 "그 부분 안에서 진접두사 = 진접미사를 만족하면서 안전하게 줄일 수 있는 길이"다.
그러니 매칭이 깨졌을 때 거기로 점프하면 조건이 깨지지 않는다.

lps를 만들면서 그 lps를 다시 참조해 자기 자신을 완성해 나가는 부트스트랩 구조다.
이 구조를 본 순간이 가장 우아했다.

### 막힘 4. buildLPS와 kmpSearch가 왜 거의 같은 코드?

두 함수를 나란히 놓으면 골격이 똑같아서 당황했다.

해소된 순간은 둘이 본질적으로 같은 일을 한다는 걸 알았을 때다.

buildLPS는 "패턴 안에서 진접두사가 진접미사와 얼마나 일치하는지" 추적한다.
kmpSearch는 "text 안에서 패턴이 얼마나 일치하는지" 추적한다.

"한쪽을 한 글자씩 늘려가면서 다른 쪽과 얼마나 일치하는지 추적한다"는 메커니즘이 완전히 동일하다.
달라진 건 변수 이름(len → j)과 비교 대상(pattern[i] → text[i])뿐이다.
그래서 buildLPS를 제대로 이해하면 kmpSearch는 거저 따라온다.

## 전체 코드

```javascript
function buildLPS(pattern) {
  const lps = new Array(pattern.length).fill(0);
  let len = 0;
  for (let i = 1; i < pattern.length; i++) {
    while (len > 0 && pattern[i] !== pattern[len]) {
      len = lps[len - 1];
    }
    if (pattern[i] === pattern[len]) len++;
    lps[i] = len;
  }
  return lps;
}

function kmpSearch(text, pattern) {
  if (pattern.length === 0) return 0;
  const lps = buildLPS(pattern);
  let j = 0;
  for (let i = 0; i < text.length; i++) {
    while (j > 0 && text[i] !== pattern[j]) {
      j = lps[j - 1];
    }
    if (text[i] === pattern[j]) j++;
    if (j === pattern.length) return i - j + 1;
  }
  return -1;
}
```

`i - j + 1`이 시작 위치인 이유는 간단하다.
"시작 위치 + (길이 - 1) = 마지막 위치" 공식을 역산한 것이다.
지금 i가 마지막 위치, j가 매칭된 길이니까 시작은 `i - j + 1`이다.

## 머릿속에 남긴 핵심 세 줄

- len = 직전까지 일치한 접두사 길이
- pattern[len] = 다음에 비교할 접두사 글자
- lps[len-1] = 매칭이 깨졌을 때 안전하게 줄일 수 있는 길이

## 시간복잡도

- buildLPS: O(m) 분할상환
- kmpSearch: O(n + m)

분할상환이 성립하는 이유는 len의 움직임에 있다.
len은 매 iteration에서 최대 1만 증가한다.
while 루프 안에서는 줄어들기만 한다.
전체에서 늘어난 양보다 더 줄어들 수는 없으니, 총 비교 횟수가 O(m)으로 묶인다.

## 정리

이번 학습의 가장 큰 깨달음은 두 가지다.

하나는 "개수와 다음 인덱스가 같다"는 인덱싱 감각이다.
다른 하나는 "매칭된 부분이 곧 패턴의 일부"라는 부트스트랩 직관이다.

이 두 가지가 잡히고 나니, 그 전에는 마법처럼 보이던 코드가 자연스럽게 읽혔다.
한 줄씩 "왜 이렇게 생겼지"를 끝까지 따라가면 결국 풀린다.
알고리즘 학습이 이래서 재밌다.
