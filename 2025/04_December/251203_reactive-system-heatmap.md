---
type: "skill"
domain: "frontend"
category: "side-project"
topic: "til-reactive-system-heatmap"
updatedAt: "2025-12-03"

satisfaction:
  score: 95
  reason: 자기 전 떠올린 아이디어를 실제 기능으로 하루 만에 구현하고, 시스템적 기준까지 정립했기 때문.

keywords:
- "reactive-system"
- "review-cycle"
- "heatmap"
- "learning-system"
- "memory-retention"
- "react-transition"

relatedCategories:
- "architecture"
- "react"
- "ui-ux"
- "learning-model"
---

# 재활성(Re-active) 시스템 설계와 히트맵 적용기

오늘의 핵심은 단순한 UI 리팩토링이 아니다.  
**TIL 시스템에 '재활성(Re-active)'이라는 개념을 도입했고, 이를 실제  
히트맵 로직과 UI에 녹여냈다는 점이 본질이다.**  
히트맵은 이제 단순 학습 현황표가 아니라, **시간 경과에 따른 기억 약화를  
감지하고 다시 활성화하도록 유도하는 학습 보조 시스템**이 되었다.  

## 1. 재활성(Re-active) 시스템 개념 정립

### 정의

재활성(Re-active)이란 **특정 토픽의 마지막 학습일로부터 일정 기간이
지났을 때 '다시 활성화가 필요함'을 알려주는 시스템**이다.\
"복습"이라는 기능적 단어 대신, 기억을 재점화한다는 의미를 가진 "재활성"이라는 용어를 선택했다.

### 왜 필요한가? - 에빙하우스 망각 곡선

인간의 기억은 아래처럼 기하급수적으로 감소한다. - 학습 직후 → 100%\
- 1일 후 → 약 70%  
- 1주 후 → 약 50%  
- 1개월 후 → 약 20%

따라서 학습 시스템이 제 기능을 하려면 **'기억이 사라지는 순간'을
감지하고 적절히 다시 불러오도록 도와야 한다**.

재활성 시스템은 이를 위해 다음 3단계 주기를 사용한다: - **30일 → 90일 → 180일**

### 재활성 레벨 구조

| 레벨     | 조건       | 색상 | 의미             |
|----------|------------|------|------------------|
| NONE     | < 30일     | -    | 최근 학습        |
| LEVEL_1  | ≥ 30일     | 🟡   | 1차 재활성 필요 |
| LEVEL_2  | ≥ 90일     | 🟠   | 2차 재활성 필요 |
| LEVEL_3  | ≥ 180일    | 🔴   | 긴급 재활성 필요 |

## 2. 적용 대상에 대한 기준 확립

``` ts
export const RE_ACTIVE_ENABLED_DOMAINS = ['frontend'];
```

## 3. 히트맵 로직에 재활성 시스템 통합

### 1) 토픽 단위 레벨 계산

``` ts
function getDaysElapsed(dateString: string): number { ... }
function getReviewLevel(dateString: string): ReviewLevel { ... }
```

### 2) UI 반영 방식

-   히트맵 토픽: 3px 내부 테두리
-   리스트 뷰: 레벨 태그
-   트리 네비게이션: 컬러 배지

## 4. 리팩토링은 '수단'일 뿐, 목적은 재활성 시스템의 구현

-   파일 구조 정리 (1,070줄 → 130줄)
-   역할 기반 파일 분리
-   useTransition 적용
