---
type: "content"
domain: "frontend"
category: "react"
topic: "렌더 핫패스의 선형탐색을 WeakMap 참조 캐시로 없애기"
updatedAt: "2026-08-14"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "weakmap"
  - "memoization"
  - "reference-equality"
  - "performance"
  - "react"
  - "gallery-virtualization"

relatedCategories:
  - "typescript"
  - "performance"
---

# 렌더 핫패스의 선형탐색을 WeakMap 참조 캐시로 없애기

> 카드 191장짜리 컴포넌트 갤러리에서 "기여자 아바타"를 그릴 때마다 별칭 맵 전체를 `Object.entries`로 훑고 있었다 — 캐시를 msgpack이나 Map<string,...>이 아니라 WeakMap으로 만든 이유는 "무효화를 안 해도 되게" 만들기 위해서였다.

## 배경

maxflow의 ui-harness 갤러리(컴포넌트 쇼케이스 앱, 191개 엔트리)에서 세 번째 라운드 성능 최적화 세션이었다. 이전 두 라운드(트렌드 워커 분리, 캐시 키 축소, ripgrep 비동기화 등)로 이미 32초→36ms 같은 굵직한 병목은 잡아둔 상태였고, 이번엔 "카드 하나하나가 렌더될 때마다 반복되는" 잔여 비용을 찾는 감사였다. `ContributorAvatars` 컴포넌트가 최악의 사례로 지목됐다 — 카드 191장 × 히스토리 이벤트 수 × 닉네임 수만큼 `resolveActor`가 `Object.entries(map)` 전체를 매번 선형 탐색하고 있었다.

## 핵심 내용

**문제의 구조**: `resolveActor(map, actor)`는 정확히 일치하는 키를 먼저 찾고, 없으면 각 레코드의 `aliases` 배열까지 뒤져서 별칭 매칭을 한다. 이 별칭 규칙(정확 일치 우선 → `entries` 순서상 첫 별칭) 자체는 도메인 요구사항이라 없앨 수 없었다. 문제는 이 탐색이 **맵이 안 바뀌었어도 호출할 때마다 처음부터 다시 도는** 것이었다.

**해결: WeakMap 역인덱스, 무효화 로직 없이.** 맵(`NicknamesMap`) 하나당 인덱스를 한 번만 만들어 두는 방식을 썼다:

```ts
const actorIndexes = new WeakMap<NicknamesMap, Map<string, [string, AvatarRecord]>>();

function actorIndexOf(map: NicknamesMap) {
  let idx = actorIndexes.get(map);
  if (!idx) {
    idx = new Map();
    for (const [name, record] of Object.entries(map)) idx.set(name, [name, record]);
    for (const [name, record] of Object.entries(map)) {
      for (const alias of record.aliases ?? []) {
        if (!idx.has(alias)) idx.set(alias, [name, record]);  // 정확 일치 우선순위 보존
      }
    }
    actorIndexes.set(map, idx);
  }
  return idx;
}
```

일반적인 캐시라면 "맵이 갱신됐을 때 캐시를 지워야 한다"는 무효화 로직이 따라붙는다. 여기서는 그 로직을 아예 안 짰다 — 코드베이스에서 이 닉네임 맵은 항상 **통째로 새 객체로 교체**되지 갱신(mutate)되지 않는다는 불변식이 이미 있었기 때문이다. `WeakMap`을 객체 참조로 키를 잡으면, 맵이 바뀌면 참조가 달라져 자연히 캐시 미스가 나고, 옛 맵 객체는 가비지 컬렉션되면서 캐시 엔트리도 같이 사라진다. **"이 데이터가 wholesale replace로만 바뀐다"는 불변식만 있으면, WeakMap 하나로 캐시와 무효화를 동시에 얻는다.**

같은 패턴을 `contributorsOf(events, map)`에도 이중으로 적용했다 — `WeakMap<HistoryEvent[], WeakMap<NicknamesMap, string[]>>` 형태로 `(events 참조, map 참조)` 쌍을 키로 메모했다. 이때 전제조건이 하나 더 필요했는데, `getHistory(entry)`가 매 호출마다 배열을 새로 만들어 반환하고 있어서 참조가 매번 달라지는 바람에 이 메모가 무력화됐다. 그래서 사이드카 배열(레지스트리에서 항상 통째로 교체되는 값)을 그대로 참조로 넘기는 `getHistoryStable`을 별도로 만들어 붙였다 — **캐시 키로 쓸 참조 자체가 안정적인지부터 확인해야 WeakMap 메모가 의미 있다**는 게 여기서 배운 전제조건이다.

**측정된 효과**: 같은 세션에서 검색 랭킹도 정렬 비교자 안에서 매칭 함수를 매번 호출하던(카드당 ~2,900회 낭비) 패턴을 이미 다른 화면(pages/flows/palette/search)이 쓰던 `rankRecords` 단일 패스 방식으로 통일해, 가장 무거운 진입점에서 TBT(Total Blocking Time)가 510ms→488ms(−4%)로 줄었다.

## 정리

렌더마다 반복되는 선형 탐색을 만나면 반사적으로 `Map`/`useMemo`로 캐시하고 무효화 조건을 따로 짜기 쉽다. 하지만 데이터가 "부분 수정이 아니라 항상 통째로 교체된다"는 불변식이 코드베이스에 이미 있다면, `WeakMap`으로 객체 참조 자체를 키로 써서 무효화 로직을 아예 안 짜도 된다. 단, 이 트릭은 캐시 키로 넘기는 참조가 실제로 안정적일 때만 성립한다 — `getHistory`처럼 매번 새 배열을 만들어 반환하는 함수를 그대로 키로 쓰면 캐시가 매번 미스 나서 조용히 무력화된다는 걸 이번에 확인했다.
