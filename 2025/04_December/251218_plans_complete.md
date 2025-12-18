---
type: "skill"
domain: "frontend"
category: "side-project"
topic: "plans-gantt-chart"
updatedAt: "2025-12-18"

satisfaction:
score: 95
reason: Feature 단위 일정 관리라는 복잡한 문제를 성능, UX, 동시성 관점에서 끝까지 구현했고, 공통 컴포넌트 구조로 재사용성을 확보했다.

keywords:
- gantt-chart
- schedule-management
- react-performance
- optimistic-lock
- zustand
- feature-planning
- draft-mode
- milestone

relatedCategories:
- react
- nextjs
- performance
- state-management
---

# Plans Gantt Chart 구현

Feature 단위 일정 관리를 위해 간트 차트 기반 계획 관리 시스템을 구현했다.  
단순한 시각화가 아니라, 편집과 읽기 전용 모드를 분리하고, 동시 편집 제어(Optimistic Lock),  
마일스톤 기반 산출물 가시화(Flag), 대규모 상태 관리(Zustand)와 성능 최적화까지 포함한 구조를 설계했다.

핵심은 기능 구현 자체가 아니라,  
복잡한 일정 관리 문제를 UI, 상태, 데이터, UX 관점에서 분해하고 다시 조립한 과정이다.  

![heatmap.png](https://raw.githubusercontent.com/kh1012/til/main/assets/251218_admin_plan.png)

## 프로젝트 개요

### 목표
- Feature 단위 계획을 트리 + 타임라인으로 한눈에 표현
- Draft 기반 편집 경험 제공 (Undo / Redo 포함)
- 읽기 전용 페이지에서 동일 UI 재사용
- 협업 환경에서 동시 편집 충돌 방지

### 주요 페이지
- /admin/plans/gantt : 편집 가능 (Admin / Owner)
- /plans/gantt : 읽기 전용 (전체 멤버)

### 기술 스택
- Frontend: React 18, Next.js 15, TypeScript
- State: Zustand
- Style: Tailwind CSS
- DB: Supabase (PostgreSQL)
- Toast: Sonner

## 핵심 인사이트

## 1) 성능 최적화는 참조 안정성에서 시작된다

CommandPalette에 인라인 콜백을 전달하면서 매 렌더링마다 새로운 함수 참조가 생성되었다.  
이로 인해 useMemo 의존성이 불필요하게 깨지고, toast 중복 생성 같은 부작용이 발생했다.

    <CommandPalette
      onStartEditing={() => handleStartEditing()}
      onStopEditing={() => handleStopEditing()}
    />

해결은 useCallback으로 콜백 참조를 고정하는 것이다.

    const handleStartEditing = useCallback(() => {
      // start logic
    }, []);

    const handleStopEditing = useCallback(() => {
      // stop logic
    }, []);

    <CommandPalette
      onStartEditing={handleStartEditing}
      onStopEditing={handleStopEditing}
    />

배운 점:  
useCallback은 미세 최적화 도구가 아니라, 의존성 그래프를 안정화하기 위한 핵심 장치다.

## 2) 동시성 제어는 기술보다 UX가 먼저다

낙관적 락을 구현하는 것만으로는 충분하지 않았다.  
사용자는 왜 막혔는지, 언제 풀리는지, 계속 작업할 수 있는지를 알아야 한다.

    interface LockState {
      isLocked: boolean;
      lockedByName?: string;
      lockedByUserId?: string;
      lockedAt?: Date;
      expiresAt?: Date;
    }

    const HEARTBEAT_INTERVAL = 30000;
    const INACTIVITY_TIMEOUT = 600000;

버튼 문구도 UX 관점에서 재정의했다.

    <button onClick={extendLock}>Extend</button>

락 상태를 UI에 투명하게 노출했다.

    <div className="lock-status">
      <span>락 유지 시간: remainingTime</span>
      <span>마지막 활동: inactivityTime 전</span>
      <button onClick={extendLock}>Extend</button>
    </div>

배운 점:  
락은 숨기면 충돌을 만들고, 노출하면 사용자가 스스로 조절한다.

## 3) Flag 기반 산출물 조회는 기간이 아니라 누적 이력이다

초기 구현은 Flag 기간과 겹치는 plan만 조회했다.

    const overlappingPlans = plans.filter(p =>
      p.endDate >= flag.startDate && p.startDate <= flag.endDate
    );

이 방식은 Flag 이전에 완료된 기획/디자인을 누락시켰다.  
개선 방식은 다음과 같다.

    const featureKeys = Array.from(
      new Set(overlappingPlans.map(p => p.featureKey))
    );

    const allFeaturePlans = plans.filter(p =>
      featureKeys.includes(p.featureKey)
    );

    const specPlans = allFeaturePlans.filter(p =>
      p.stage === "상세 기획" && p.endDate !== null
    );

    const designPlans = allFeaturePlans.filter(p =>
      p.stage === "화면 디자인" && p.endDate !== null
    );

배운 점:  
마일스톤 기준 산출물은 특정 시점의 스냅샷이 아니라,  
Feature 단위 누적 이력의 요약이다.

## 4) Read-only와 Editable은 페이지가 아니라 모드다

하나의 공통 컴포넌트로 두 페이지를 커버했다.

    interface DraftGanttViewProps {
      readOnly?: boolean;
      title?: string;
    }

    function DraftGanttView({ readOnly, title }: DraftGanttViewProps) {
      return (
        <>
          {!readOnly && <CommandPalette />}
          {!readOnly && <LockIndicator />}
          {readOnly && <DisabledOverlay />}
          <GanttTimeline />
        </>
      );
    }

    <DraftGanttView readOnly={false} title="계획 관리" />
    <DraftGanttView readOnly={true} title="계획" />

배운 점:  
권한 분기는 라우트보다 UI 모드로 푸는 것이 유지보수에 강하다.

## 5) 사용자 정의 순서는 데이터로 저장해야 한다

드래그 정렬 결과를 유지하기 위해 order_index를 분리했다.

    ALTER TABLE plans ADD COLUMN order_index INTEGER;

    UPDATE plans
    SET order_index = ROW_NUMBER() OVER (
      PARTITION BY workspace_id
      ORDER BY created_at
    );

    CREATE INDEX idx_plans_order
    ON plans(workspace_id, order_index);

프론트엔드에서는 드래그 종료 시 index를 재계산한다.

    const updatedRows = reorderedRows.map((row, index) => ({
      ...row,
      orderIndex: index,
    }));

로딩 시에는 order_index 기준으로 정렬한다.

    supabase
      .from("plans")
      .select("*")
      .order("order_index", { ascending: true });

배운 점:  
보이는 순서는 UI 상태가 아니라 영속 데이터다.

## 기술적 배움

- CustomEvent를 사용해 깊은 컴포넌트 트리 간 통신을 단순화했다.
- Zustand에서 Map 기반 Draft 상태와 Undo / Redo 히스토리를 구성했다.
- Sonner의 custom toast로 기존 스타일을 유지하면서 성능을 확보했다.
- 모바일에서는 모든 기능을 유지하기보다 핵심 흐름 위주로 재구성했다.

## 향후 개선 방향

- react-window 기반 Virtualization
- Web Worker로 계산 로직 분리
- 실시간 협업(WebSocket)과 변경 이력 추적
- 일정 충돌 감지 및 리스크 예측

## 결론

이번 작업은 단순히 간트 차트를 만든 것이 아니라,  
복잡한 일정 관리 문제를 구조적으로 해석하고 협업 환경에 맞게 재설계한 경험이었다.

- 성능은 참조 안정성에서 시작된다
- 동시성은 UX로 드러나야 해결된다
- 마일스톤은 시점이 아니라 누적 이력이다

다음 단계에서는 관리 도구를 넘어,  
의사결정을 돕는 시스템으로 확장해 나가야 한다.
