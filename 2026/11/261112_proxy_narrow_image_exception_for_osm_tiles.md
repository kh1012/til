---
type: "content"
domain: "backend"
category: "build-infra"
topic: "엄격한 프록시 보안 경계 안에서 OSM 타일 이미지 요청만 허용하는 좁은 예외를 설계한 결정"
updatedAt: "2026-11-12"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "security-boundary"
  - "proxy"
  - "allowlist"
  - "csrf-prevention"
  - "plugin-sandbox"

relatedCategories:
  - "typescript"
---

# 엄격한 프록시 보안 경계 안에서 OSM 타일 이미지 요청만 허용하는 좁은 예외를 설계한 결정

> plugin-builder 프록시는 플러그인 코드가 임의 주소로 직접 나가지 못하게 CSP·세션 필터·marker 헤더 검사로 막아 두고 있다. Leaflet 지도용 OpenStreetMap 타일을 쓰려는 요청이 들어오자, 전체 경계를 느슨하게 푸는 대신 이미지 요청 한 종류에만 통하는 좁은 예외(D516)를 만들었다.

## 배경

plugin-builder의 프록시는 플러그인이 임의 외부 주소를 직접 호출하지 못하도록 세 겹으로 막아 둔 상태였다(CSP img-src, 세션 필터링, marker 헤더 검사 — [[261103_build_time_literal_url_check_vs_runtime_csp]], [[261104_baseurl_host_restriction_removed_credential_query_blocked]]와 같은 축). 사용자가 Leaflet로 지도를 그리려면 OpenStreetMap 타일 서버를 불러와야 하는데, 이 경계 안에서는 통과할 길이 없었다. 직접 CSP를 풀기, 프록시에 예외 추가, 런타임에 blob 지원 — 세 가지 방법을 검토한 뒤 사용자가 두 번째를 선택했다.

## 핵심 내용

**예외의 범위를 요청 종류 하나로 좁힌다**: 프록시는 `Sec-Fetch-Dest: image`이고 `Sec-Fetch-Site: same-origin`인 요청만 받는다. 둘 중 하나라도 어긋나면 기존 규칙(차단)이 그대로 적용된다.

**허용 대상은 상수 allowlist, 플러그인이 넓힐 수 없게 한다**: 타일 호스트 목록은 매니페스트로 확장 가능한 설정이 아니라 코드에 박힌 고정 상수다. 플러그인 작성자가 자기 매니페스트에 호스트를 추가해서 범위를 넓히는 길을 원천적으로 막은 것 — 허용 목록을 사용자 입력 경로에 두면 그 경로가 곧 우회 경로가 된다는 전제.

**쿼리스트링 금지로 유출 경로를 막는다**: 요청 경로는 `z/x/y.png` 형식의 타일 좌표 패턴만 허용하고 쿼리스트링은 전부 거절한다. 쿼리스트링을 허용하면 그 안에 임의 데이터를 실어 내보내는 경로가 생기므로, 타일 요청에 꼭 필요하지 않은 형태는 통째로 잘라냈다.

**업스트림으로 나가는 헤더에서 민감 정보를 벗긴다**: referer, 쿠키, API 키 등 인증 관련 헤더는 업스트림 요청에서 제거하고, User-Agent만 `PluginBuilder/<version> (+product-url)` 형태로 붙인다. 응답은 content-type(png/jpeg/webp)과 크기(1MiB 이하)를 검증한 것만 통과시킨다.

**리소스 제한을 OSM 쪽 정책에 맞춘다**: 디스크 캐시 TTL은 업스트림 max-age를 1시간~7일 범위로 clamp하고 전체 200MB로 제한한다. 동시 연결은 호스트당 2개로 제한 — OSM 자체 사용 정책을 넘지 않도록 맞춘 수치다. 캐시 정리 중 파일 삭제가 실패해도(권한 오류 등) 캐시 인덱스 갱신은 그대로 진행하도록 try/catch로 감쌌다 — 삭제 실패가 캐시 정리 전체를 멈추지 않게 한 것.

## 정리

보안 경계를 "풀 것인가 말 것인가"로 보지 않고, 요청 종류·호스트·경로 형태·헤더라는 축을 각각 따로 판단했다. 경계를 넓힌 축(이미지 요청 한 종류)과 계속 좁게 유지한 축(호스트 allowlist, 쿼리스트링 금지, 민감 헤더 제거)을 분리한 것은 [[261104_baseurl_host_restriction_removed_credential_query_blocked]]에서 쓴 방식과 같다. 예외를 만들 때 "이 요청만 통과시킨다"가 아니라 "이 요청이 통과하는 동안 어떤 경로로도 기존 경계를 우회할 수 없는가"를 축마다 따로 확인하는 게 핵심이다.
