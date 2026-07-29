---
draft: true
type: "content"
domain: "frontend"
category: "react"
topic: "제품 표면(web/cad-web)의 진입과 생성 순간에 남아 있던 체감 결함들을 걷어낸 기록. Headers 인스턴스를 객체 spread로 병합해 content-type과 attempt id가 통째로 사라지던 프로젝트 생성 실패, blur 시점 draft가 헤더 셀렉터에 새어 생성 전에 완료처럼 보이던 문제, 도면 정리 진입 시 '아직 모른다' 상태가 없어 로딩 카드가 깜빡이던 문제, 층 전환마다 전 층 검수를 다시 계산해 1.7초 멈추던 문제를 다뤘다"
updatedAt: "2026-07-29"

satisfaction:
  score: 0
  reason: ""

keywords:
  - "headers-spread"
  - "orval-mutator"
  - "content-type"
  - "optimistic-draft"
  - "skeleton"
  - "layout-shift"
  - "dirty-checking"
  - "requestAnimationFrame"
  - "cad-web"

relatedCategories:
  - "performance"
  - "design-system"
  - "typescript"
---

# 진입과 생성, 그 짧은 순간에 숨어 있던 결함들

> 프로젝트 생성이 조용히 422로 죽던 원인이 Headers 인스턴스의 spread였다는 걸 찾았고, 생성 중인데 이미 끝난 것처럼 보이던 헤더 셀렉터를 걷어냈다. cad-web 쪽은 진입 순간 "아직 모른다"를 표현할 상태가 없어 로딩 카드가 깜빡이던 문제와, 층 전환마다 전 층을 다시 계산해 1.7초 멈추던 문제를 잡았다.

## 배경

하네스 작업 사이사이에 제품 코드 쪽 결함이 끼어든 날이었다. 공통점이 하나 있다. 전부 "무언가가 시작되는 순간"의 문제다. 프로젝트를 만들기 시작하는 순간, 도면 정리 화면에 들어서는 순간, 층을 바꾸는 순간. 기능은 결국 동작하지만 그 짧은 구간에서 사용자가 보는 것이 사실과 어긋나 있었다.

## 핵심 내용

### 개별 작업 기록 (시간순)

- Headers 인스턴스 헤더 유실로 프로젝트 생성이 실패하던 문제 수정
  - generated mutator가 `X-Maxflow-Attempt-Id`를 붙이면서 헤더를 Headers 인스턴스로 넘기기 시작했는데, api client는 그대로 객체 spread로 병합하고 있었다. Headers는 own enumerable property가 없어서 spread 결과가 빈 객체가 된다. generated 클라이언트가 붙인 Content-Type과 attempt id가 통째로 사라졌다.
  - 여기에 두 번째 층이 겹쳤다. 본문은 mutator에서 이미 `JSON.stringify`된 문자열이라 client의 `isJsonBody` 판정도 false가 됐다. 결국 content-type 없이 JSON이 전송되고 API가 422로 거부했다. 사용자에게는 프로젝트명만 채운 생성이 "프로젝트 생성에 실패했습니다"로 끝나는 것으로만 보였다.
  - client에서 호출자 headers를 Headers로 정규화해 병합하도록 고쳤다(plain object와 Headers 양쪽 수용). generated-mutator 테스트에 content-type과 attempt id가 fetch까지 도달하는지 확인하는 회귀 케이스를 넣었다. 같은 수정이 커밋 두 개로 중복 기록됐다.

- 프로젝트 생성 중 헤더 셀렉터가 미리 갱신되던 문제
  - 프로젝트명 필드의 blur 시점에 `projectCreateDraftNameAtom`이 세팅되고, 헤더 셀렉터가 이를 그대로 타이틀로 노출하고 있었다. 문제는 "프로젝트 생성" 버튼 클릭이 곧 그 input의 blur를 유발한다는 점이다. 실제 생성이 진행 중인 로딩 내내 이미 생성이 끝난 것처럼 보였다.
  - 생성 페이지에서는 고정 라벨("새 프로젝트")만 노출하고, 실제 프로젝트 반영은 생성 완료 후 workflows 경로로 이동한 뒤 서버 데이터로만 이뤄지도록 draft 미리보기 경로를 제거했다.

- 도면 정리 진입 시 로딩 카드 깜빡임 제거 (probing 스켈레톤)
  - 진입 즉시 `folderLoadStart`가 도면 유무와 무관하게 진행 바를 세워서, 저장된 도면이 없는 프로젝트에서도 "자동 처리 중" 카드를 먼저 확정 렌더한 뒤 폴더 선택 화면으로 되돌아갔다. 원인은 상태 모델에 "아직 모른다"가 없어서 그 구간을 loading으로 표현한 것이었다.
  - `CadStatus`에 `probing`을 추가해 도면 유무 확인 구간을 따로 뒀다. autoLoad면 초기 상태부터 probing으로 시작해 effect 왕복에 끼던 빈 화면 프레임을 없앴고, 무인자 `openFolder`(진입 자동 복원)는 probe로 표시해 진행 바를 세우지 않게 했다. `foldersLoaded`가 `autoProgress`까지 함께 확정하도록 바꿔 목록 확정 한 번의 전이로 최종 화면에 도달한다. probing 구간은 `EmptyFileUploadCard`와 같은 실루엣의 스켈레톤으로 렌더하고, keep-alive 청크 로딩 fallback도 같은 스켈레톤을 쓰게 통일했다.

- 진입 스켈레톤 높이를 폴더 선택 카드와 일치
  - 스켈레톤 내부가 152px, 실제 `EmptyFileUploadCard` 내부가 169.5px이라 전환 때 17.5px 튀었다. 실제 카드의 텍스트 블록 구조(제목 line-height 20px, 설명 2줄 45.5px)를 같은 높이로 재현해 카드 전체 251.5px 대 252px, 서브픽셀 수준까지 맞췄다.

- 도면 정리 검수 재계산을 변경된 층으로 한정 + rAF로 페인트 우선
  - 층 전환이나 편집마다 전 층 검수를 다시 계산해 메인 스레드가 길게 막혔다. 실측으로 층당 중심선 167~394개, 정자동 사옥 29층 기준 층 전환 약 1.7초, 편집 1회 약 125ms였다.
  - 층별 검수 입력(scene·editLines·editColumns·detection) 참조를 캐시해 dirty 판정을 넣었다. 층 전환 시 계산이 29회에서 1회로 준다. 판정 로직(closure·dangling·anomalies) 자체는 건드리지 않아 검수 결과는 이전과 동일하다.
  - `refreshInactiveReviews`의 `alignment`·`baseFloorId` 의존성은 제거했다. `computeFloorReviewFor`가 읽지 않는 값이라 불필요한 재계산만 유발하고 있었다.
  - 재계산을 이중 rAF로 미뤄 편집 결과가 먼저 페인트되게 했다. pending이면 취소 후 재등록하므로 같은 프레임에 몰린 편집은 자연히 1회로 합쳐진다.
  - 갱신 표시는 직전 재계산이 150ms를 넘었을 때만 검토 큐 위에 띄운다. 계산이 동기라 타이머 기반 지연 표시는 원리상 발화하지 못하기 때문에 직전 비용으로 예측하는 방식을 택했다. 큐 자체는 그대로 유지해 편집마다 사라졌다 돌아오는 깜박임을 없앴다.

## 정리

Headers 건이 오늘 가장 배울 게 많았다. `{...headers}`는 plain object 시절엔 완벽히 맞는 코드였고, 바뀐 쪽은 호출자였다. Headers는 own enumerable property가 없어 spread가 조용히 빈 객체를 만든다. 타입도 통과하고 런타임 에러도 없고 요청도 나간다. 증상은 서버가 422를 뱉는 것뿐이라, 원인을 찾으려면 클라이언트 코드가 아니라 실제 네트워크로 나간 헤더를 봐야 했다. 웹 표준 객체를 plain object처럼 다루는 코드는 이런 식으로만 무너진다.

여기서 회귀 테스트를 "mutator가 Headers를 넘기는가"가 아니라 "content-type과 attempt id가 fetch까지 도달하는가"로 잡은 게 맞는 선택이었다고 본다. 중간 표현이 아니라 경계 밖으로 나가는 값을 단언해야 다음에 표현이 또 바뀌어도 잡힌다.

나머지 셋은 결이 같다. **상태 모델에 없는 상태는 결국 다른 상태로 위장한다.** cad-web 진입이 딱 그랬다. "도면이 있는지 아직 모른다"라는 실제 상태가 타입에 없으니 그 구간을 loading으로 표현했고, loading은 화면에서 진행 바를 세우는 의미라 도면이 없는 프로젝트에서도 "자동 처리 중"이 먼저 떴다가 사라졌다. `probing`을 추가한 건 UI 수정이 아니라 모델 수정이다. 헤더 셀렉터 건도 마찬가지다. "입력했지만 아직 만들지 않은 이름"이 draft atom을 타고 "현재 프로젝트" 자리에 앉아 있었다. 서버 데이터만 그 자리를 채우게 한 순간 문제가 사라졌다.

검수 재계산은 dirty 판정이 정공법이었다는 것 외에, rAF를 쓴 이유가 기억할 만하다. 계산을 빠르게 만드는 것과 계산을 뒤로 미는 것은 다른 처방이고, 사용자가 체감하는 건 후자다. 편집 결과가 먼저 페인트되면 재계산이 여전히 100ms대여도 즉각 반응한 것으로 느껴진다. 같은 이유로 "150ms를 넘었을 때만 갱신 표시"라는 예측 방식이 나왔다. 동기 계산 앞에서 타이머 기반 지연 표시는 절대 발화하지 못한다는 걸 인정하고, 직전 비용을 대리 지표로 삼은 것이다. 원칙대로면 계산을 워커로 빼는 게 맞지만, 지금 규모에서는 과한 투자라 판단했다.
