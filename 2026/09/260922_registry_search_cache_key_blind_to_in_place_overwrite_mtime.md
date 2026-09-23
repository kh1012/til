---
type: "content"
domain: "backend"
category: "build-infra"
topic: "레지스트리 JSON을 writeFileSync로 제자리 덮어써도 macOS에서는 부모 디렉터리 mtime이 그대로라, mtime 하나만 보는 검색 캐시 키가 deprecated 토글 변경을 못 알아채는 사례"
updatedAt: "2026-09-22"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "mtime-cache-invalidation"
  - "in-place-overwrite"
  - "macos-directory-mtime"
  - "writeFileSync"
  - "stale-cache-key"

relatedCategories:
  - "testing"
---

# 레지스트리 JSON을 writeFileSync로 제자리 덮어써도 macOS에서는 부모 디렉터리 mtime이 그대로라, mtime 하나만 보는 검색 캐시 키가 deprecated 토글 변경을 못 알아채는 사례

> `deprecated` 필드를 토글해도 `/api/registry/search` 검색 결과에 반영되지 않는 버그를 실측으로 추적했다. 원인은 캐시 키가 디렉터리 mtime 하나뿐인데, 엔트리 JSON을 `writeFileSync`로 제자리 덮어쓰는 방식은 macOS에서 부모 디렉터리 mtime을 바꾸지 않는다는 사실이었다.

## 배경

`server/lib/registry-search.ts:232`의 `deprecated` 필터를 손보려던 참이었다. 즉시 실행·MCP·화면 세 소비자가 전부 같은 `/api/registry/search` 엔드포인트를 타므로, 캐시가 틀리면 셋 다 동시에 틀린 값을 본다. 작업 전에 캐시가 실제로 최신 상태를 반영하는지부터 확인했다.

## 핵심 내용

`vite-harness-api-registry.ts:20`의 검색 캐시는 디렉터리 mtime 하나만 캐시 키로 쓴다. 그런데 엔트리 JSON은 새 파일을 추가하는 게 아니라 기존 파일을 `writeFileSync`로 제자리 덮어쓰는 방식으로 갱신된다.

실측으로 확인한 값:

- 파일을 제자리 덮어쓴 시각: `1790083480` (부모 디렉터리 mtime 그대로)
- 새 파일을 추가한 시각: `1790083482` (부모 디렉터리 mtime 갱신됨)

macOS에서는 디렉터리 안 파일 하나의 **내용**이 바뀌어도 그 디렉터리 자체의 mtime은 바뀌지 않는다. 디렉터리 mtime은 디렉터리 엔트리 목록(파일 추가/삭제/이름 변경)이 바뀔 때만 갱신된다. 그래서 `deprecated` 값처럼 기존 엔트리 파일 내용만 고치는 갱신은 캐시 키에 아무 흔적도 남기지 않고, 캐시는 계속 옛 검색 결과를 돌려준다.

## 정리

캐시 무효화를 디렉터리 mtime 하나에 의존하면 "파일 추가/삭제"는 잡아도 "기존 파일 내용 변경"은 못 잡는다. 두 갱신 방식이 파일시스템 레벨에서 다른 신호를 낸다는 전제 자체가 틀렸던 것이다. `deprecated` 필터를 고치기 전에 이 캐시 무효화 조건부터 바로잡아야 한다는 순서로 계획에 반영했다 — 필터를 맞게 고쳐도 캐시가 안 갈리면 화면에 안 보이는 건 같기 때문이다.
