# 동시성 (React 18)

> 학습 URL: https://tech.remember.co.kr/%EC%BD%94%EB%93%9C-%ED%95%9C-%EC%A4%84%EB%A1%9C-%EA%B2%BD%ED%97%98%ED%95%98%EB%8A%94-react-%EB%8F%99%EC%8B%9C%EC%84%B1%EC%9D%98-%EB%A7%88%EB%B2%95-5ff18aee148d

## 학습 진행도

- ✅ [React는 동시성을 왜 연구했을까?](/2025/01_August/250804_transition-1.md/#react는-동시성을-왜-연구-했을까)
- ✅ [블로킹](/2025/01_August/250804_transition-1.md/#블로킹)
- ✅ [디바운싱 or 스로틀링](/2025/01_August/250804_transition-1.md/#디바운싱-or-스로틀링)
- ✅ [즉각적인 반응과 지연을 예상하는 상태변화](/2025/01_August/250804_transition-1.md/#즉각적인-반응과-지연을-예상하는-상태변화)
- ✅ [레인(Lane)모델과 동시성 렌더링](#레인lane모델과-동시성-렌더링)
- ✅ [레인의 구현방식](#레인의-구현방식)
- 🚧 [비트연산]()
- 🚧 [우선순위]()
- 🚧 [Expiration Time 모델의 한계와 레인모델의 장점]()
- 🚧 [레인모델이 동시성을 지원하는 방식]()
- 🚧 [만료시간 관리]()
- 🚧 [얽힘(Entanglement) 메커니즘]()
- 🚧 [useDeferredValue와 useTransition]()

## 레인(Lane)모델과 동시성 렌더링

- 2020년 구현
- Expiration Time 모델의 한계 해결을 위해 설계
  > ### Expiration Time 모델?
  >
  > - JWT 기반, 세션을 토큰으로 저장 시, 만료 시간 설정을 통해 보안 유지 (일정 시간 후 재인증 필요)
  > - 쿠키/로컬스토리지에서의 수동 만료시간 관리. (만료 후, 쿠키(4KB)는 자동삭제 가능, 로컬 스토리지(5-10MB)는 체크 필요,)
- React의 각 업데이트는 서로 다른 `차선`에 배치.
- 추월 차선과 저속 주행 차선으로 구분한다는 게 핵심 개념.
- 레인은 업데이트와 우선순위를 표시하는 것. 어떤 작업이 얼마나 중요한지를 나타냄.
- 이 우선순위를 통해 어떤 업데이트를 먼저 처리할지, 잠시 미룰지 결정할 수 있음.

## 레인의 구현방식

- 레인은 32비트 정수로 구현.
- 각 비트는 하나의 `차선`
- 낮은 비트 (우측) 일수록 우선순위 높음
- 실제 구현 부 ([react-reconciler/src/ReactFiberLane.new.js](https://github.com/facebook/react/blob/9e3b772b8cabbd8cadc7522ebe3dde3279e79d9e/packages/react-reconciler/src/ReactFiberLane.new.js#L34-L71%3E))
- 각 `차선`이 비트로 정의되어 있음.

```ts
const TotalLanes = 31;

const NoLanes: Lanes = /*                        */ 0b0000000000000000000000000000000;
const NoLane: Lane = /*                          */ 0b0000000000000000000000000000000;

const SyncLane: Lane = /*                        */ 0b0000000000000000000000000000001;

const InputContinuousHydrationLane: Lane = /*    */ 0b0000000000000000000000000000010;
const InputContinuousLane: Lane = /*             */ 0b0000000000000000000000000000100;

const DefaultHydrationLane: Lane = /*            */ 0b0000000000000000000000000001000;
const DefaultLane: Lane = /*                     */ 0b0000000000000000000000000010000;

const TransitionHydrationLane: Lane = /*         */ 0b0000000000000000000000000100000;
const TransitionLanes: Lanes = /*                */ 0b0000000001111111111111111000000;
const TransitionLane1: Lane = /*                 */ 0b0000000000000000000000001000000;

const RetryLanes: Lanes = /*                     */ 0b0000111110000000000000000000000;
const RetryLane1: Lane = /*                      */ 0b0000000010000000000000000000000;

const IdleHydrationLane: Lane = /*               */ 0b0010000000000000000000000000000;
const IdleLane: Lane = /*                        */ 0b0100000000000000000000000000000;

const OffscreenLane: Lane = /*                   */ 0b1000000000000000000000000000000;
```
