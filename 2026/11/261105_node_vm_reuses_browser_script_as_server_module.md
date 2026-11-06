---
type: "content"
domain: "fullstack"
category: "javascript"
topic: "DOM 없는 브라우저 스크립트를 node:vm으로 서버에서 그대로 재사용한 아이디어 그래프 파서 설계"
updatedAt: "2026-11-05"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "node-vm"
  - "classic-script"
  - "code-reuse"
  - "dual-environment"
  - "pure-function-design"

relatedCategories:
  - "build-infra"
---

# DOM 없는 브라우저 스크립트를 node:vm으로 서버에서 그대로 재사용한 아이디어 그래프 파서 설계

> claude-multi-accounts 메모 앱에 "아이디어 그래프"(```idea 블록) 기능을 추가하면서, 파싱·레이아웃 로직을 브라우저용으로 한 번만 짜고 서버에서도 `node:vm`으로 그대로 돌려 쓰는 구조를 택했다.

## 배경

메모 앱에 키워드→노드 가로 트리 그래프를 보여주는 ```idea 블록을 추가하는 작업이었다. 이 블록은 두 군데에서 같은 파싱·조작 로직이 필요했다.

- 브라우저: 메모 미리보기·화면에서 ```idea 블록을 그래프로 렌더링
- 서버: 에이전트가 `skill cc-idea`로 `/api/idea`를 호출해 새 아이디어를 기록할 때, 같은 문법을 읽고 써야 함

## 핵심 내용

**순수 함수로만 짜서 두 환경 모두에서 통하게 한다**: `web/idea.js`(405줄)는 `ideaParse`, `ideaAdd`, `ideaToggleLine`, `ideaLayout` 등 25개 이상의 전역 함수로 구성되는데, 전부 DOM을 건드리지 않는다. 문자열을 받아 트리 구조를 만들고, 트리를 다시 문자열로 되돌리는 순수 변환만 한다. 화면에 그리는 부분은 `web/idea-view.js`라는 별도 파일로 분리해서, 렌더링 책임을 파싱 책임에서 떼어냈다.

**브라우저 classic script를 고치지 않고 서버 모듈처럼 로드한다**: 브라우저에서는 `<script>` 태그로 그대로 불러 전역 함수로 쓴다. 서버(`server/idea.mjs`)에서는 같은 파일을 `node:vm`으로 실행해서, 수정 없이 동일한 전역 함수 집합을 Node 쪽 모듈 스코프 안으로 끌어온다. 파싱 로직을 브라우저용·서버용으로 각각 구현하거나, 서버용만 CommonJS/ESM으로 다시 포팅하는 길을 피했다.

**API 경로를 메모 경로와 분리해 충돌을 막는다**: `/api/idea`를 메모 CRUD 경로(`/api/memos/...`)와 별도로 둬서, 메모 id와 라우팅이 겹치지 않게 했다. 원격 제어 허용 목록(`server/remote.mjs`)에서는 제외해, 에이전트·로컬에서만 쓰도록 범위를 좁혔다.

**테스트도 20개 이상을 양쪽에 맞춰 둔다**: `web/idea.test.mjs`(12개)는 파싱·레이아웃·완료 물려받기 같은 순수 로직을, `server/idea.test.mjs`(5개)는 메모 생성·편집·낙관적 동시성 재시도 같은 서버 통합을 검증한다.

**기존 배열에 항목을 끼워 넣을 때 테스트가 순서·개수를 하드코딩하고 있었다**: 통합 과정에서 `web/highlight.js`의 프리셋 배열에 `"idea"`를 추가했더니, `web/highlight.test.mjs`가 프리셋 배열을 `["cli", "todo", "progress", "decision"]`로 통째로 하드코딩 비교하고 있어 회귀가 났다. 로직 자체는 그대로였고, 테스트 기대값 배열만 새 항목만큼 늘리면 되는 유지보수 이슈였다.

## 정리

같은 파싱 로직을 브라우저·서버 양쪽에서 써야 할 때, 포팅하거나 중복 구현하는 대신 "DOM 의존 없는 순수 함수 파일 + `node:vm`으로 서버에서 그대로 실행"하는 방법을 썼다. 렌더링(`idea-view.js`)과 파싱(`idea.js`)을 처음부터 분리해 둔 덕에 이 재사용이 가능했다 — 만약 파싱 함수 안에서 DOM을 직접 건드렸다면 `node:vm`으로 돌려도 서버에서 터졌을 것이다.
