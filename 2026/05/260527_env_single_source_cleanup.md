---
draft: true
type: "content"
domain: "devops"
category: "env"
topic: ".env 단일 출처로 로컬/서버 환경 설정 정리"
updatedAt: "2026-05-27"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "cross-env"
  - "dotenv"
  - "single source of truth"
  - "DATABASE_URL"
  - "KDS"

relatedCategories:
  - "tooling"
  - "backend"
---

# .env 단일 출처로 환경 설정 정리

> dev 스크립트에 박혀 있던 cross-env 주입을 걷어내고, DB·KDS 접속값을 .env 한 곳으로 모은 작업.

## 배경

서버 KDS URI가 없던 시절에는 로컬 기준 값을 dev 스크립트에 cross-env로 직접 주입해 실행했다. 이후 서버 전환이 끝나 접속값이 .env에 이미 정의돼 있으니, 스크립트에 남은 주입은 중복이자 혼란의 원인이었다. 환경 전환을 .env 수정만으로 끝낼 수 있도록 출처를 하나로 모으는 정리 작업.

## 핵심 내용

### 개별 커밋 기록 (시간순)

- `3d7456e04` chore: dev:full-web의 cross-env 환경변수 주입 제거
  - DB·KDS 접속값이 이미 .env에 정의돼 있어 cross-env 주입은 중복이었다.
  - cross-env는 서버 KDS URI가 없던 시절 로컬 기준으로 실행하려고 넣었던 것이라, 서버 전환 이후로는 불필요.
  - DATABASE_URL과 KDS 접속 모두 .env를 단일 출처로 삼아, 환경 전환을 .env 수정만으로 가능하게 정리.

- `0cd7977c9` chore(web): .env.example에 VWORLD_API_KEY 추가
  - 신규로 쓰이는 VWORLD_API_KEY를 .env.example에 등재해, 다른 사람이 필요한 환경변수 목록을 example만 봐도 알 수 있게 했다.

## 정리

작은 chore 두 건이지만 결은 하나다. 환경 설정의 **단일 출처(single source of truth)** 를 .env로 통일하는 것. 과거 제약(서버 KDS URI 부재) 때문에 임시로 스크립트에 박아둔 값은, 제약이 풀리면 곧장 부채가 된다. cross-env 주입과 .env가 같은 값을 두 군데서 들고 있으면 어느 쪽이 진짜인지 헷갈리고 환경 전환 시 실수를 부른다. 출처를 .env 하나로 모으면 전환이 "파일 한 곳 수정"으로 끝난다. 동시에 .env.example을 갱신해 두는 것까지가 한 세트라는 점도 같이 챙겼다. 실제 값은 .env에, 키 목록은 example에 둬야 새로 들어온 사람이 빠진 변수를 바로 안다.
