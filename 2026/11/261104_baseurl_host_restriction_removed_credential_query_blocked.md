---
type: "content"
domain: "backend"
category: "build-infra"
topic: "baseURL 호스트 제한을 풀면서 계정·질의·조각 포함 주소는 계속 막은 보안 경계 재설계"
updatedAt: "2026-11-04"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "url-validation"
  - "security-boundary"
  - "allowlist"
  - "credential-leak"
  - "input-sanitization"

relatedCategories:
  - "typescript"
---

# baseURL 호스트 제한을 풀면서 계정·질의·조각 포함 주소는 계속 막은 보안 경계 재설계

> plugin-builder의 `isBaseUrl`은 원래 `midasit.com` 도메인만 받았다. localhost·사내 dv 서버를 예외 없이 받아야 한다는 사용자 결정(2026-11-04)에 맞춰 호스트 제한을 걷어내면서, 그 자리를 계정·질의·조각이 든 주소를 막는 검사로 채웠다.

## 배경

`apps/builder/shared/software-base.ts`의 `isBaseUrl`은 제품(Civil NX·Gen NX)의 API 주소를 검증한다. 이 주소로 MAPI Key가 실려 나간다. 기존에는 `midasit.com` 도메인만 받았는데, 로컬 개발 서버(`localhost`)와 사내 dv 서버 주소를 예외 없이 받아야 한다는 요구가 들어왔다.

## 핵심 내용

**호스트 제한은 풀되 자리는 남긴다**: 도메인 체크를 완전히 지우지 않고 `BASE_ALLOW`(빈 배열)와 `hostAllowed()` 함수로 옮겼다. `hostAllowed`는 목록이 비면 모든 호스트를 받는다. 나중에 다시 제한할 일이 생기면 `BASE_ALLOW` 배열만 채우면 되고, 검사 로직(`isBaseUrlIn`) 자체는 건드리지 않아도 된다.

**호스트 제한을 푸는 대신 주소 형태를 조인다**: 이 주소로 비밀 값(MAPI Key)이 나간다는 전제가 바뀌지 않았으므로, 호스트를 열어주는 대신 주소 자체에 비밀이 묻어날 수 있는 형태를 차단했다.
- 계정·암호(`@`), 질의(`?`), 조각(`#`), 역빗금을 포함한 주소는 거절
- `http:`, `https:` 두 scheme만 받음 (이전엔 https만)
- `URL` 생성자로 파싱 실패하면 거절, `url.username`/`url.password`가 있어도 거절

**타입 가드로 사용자 입력과 설정 파일 값을 같은 함수로 거른다**: `isBaseUrl`은 `v is string` 타입 가드라 `filter(isBaseUrl)`처럼 바로 쓸 수 있다. 설정 파일(`settings.json`)에서 읽은 값이든 사용자가 입력창에 넣은 값이든 같은 검사를 거친다.

## 정리

허용 범위를 넓히는 변경이라고 검사를 느슨하게 만드는 게 아니라, 넓히는 축(호스트)과 계속 막아야 하는 축(주소에 비밀이 섞여 들어가는 형태)을 분리했다. 호스트는 비워서 전부 받고, 그 대신 비밀 유출 경로가 될 수 있는 문자(`@`, `?`, `#`, `\`)는 그대로 막아 두는 식이다. 허용 목록을 되살릴 자리(`BASE_ALLOW`)를 코드에 남겨 둔 것도, "지금은 열어뒀지만 나중에 다시 좁힐 수 있다"는 걸 구조로 표현한 것이다.
