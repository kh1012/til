---
type: "content"
domain: "frontend"
category: "react"
topic: "rendering"
updatedAt: "2026-01-29"

satisfaction:
  score: 90
  reason: "ref object로 부터 시작된 렌더링 흐름에 대한 고민"

keywords:
  - "render"
  - "react"
  - "refObject"

relatedCategories:
  - "typescript"
---

# React Engine Rendering

RefObject를 가지고 anchorElement를 Popup 컴포넌트에 붙이다가...  
화면에 초기 상태에 anchorEl이 null인 상태를 확인했고 근데 어쩌다 왜 동작할까라는 의구심에서 이 학습이 시작됨. 

## Process
1. Trigger: 상태 변경 || 부모 컴포넌트 리렌더 발생
2. Render Phase: 컴포넌트 호출하여 V-DOM 생성 후 이전 트리와 비교 (Diffing)
3. Commit Phase: 계산된 변경 사항을 실제 브라우저 DOM에 적용 <-- 이 시점에 ref.current에 대입됨. (단순 대입, 리엑트 엔진 '아몰랑 상태')
4. Passive Phase: 브라우저가 화면을 그린 후 useEffect와 같은 후속 조치 실행
