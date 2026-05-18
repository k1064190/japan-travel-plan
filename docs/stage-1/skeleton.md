# Stage 1 — Project Skeleton + Routing + End-to-End

## Why
설계 전체를 한 번에 만들기 전에 데이터 → 지도 → 사이드바 → 디테일 → 라우팅의 와이어링이 처음부터 끝까지 동작하는지 5개 sample 명소로 검증한다. 60개 데이터를 채운 뒤 와이어링이 안 맞으면 되돌리기 비싸기 때문.

## What
- `index.html` 골격 + Leaflet 1.9.4 / Tailwind play CDN / Pretendard CDN 임포트
- `assets/styles.css` day 색상 CSS 변수(`--day-1` ~ `--day-5`) + numbered-marker 스타일 + 모바일 media query
- `assets/app.js` 데이터 로더(error handling 포함), Leaflet 마커, 사이드바, 디테일 패널, hash router, XSS-safe `esc()`/`safeHref()` 헬퍼
- `data/itinerary.json` Day1 5개 stop
- `data/places.json` 5개 sample (간사이공항, 난바숙소, 구로몬, 덴덴타운, 도톤보리)

## How
Vanilla ES6, 단일 모듈 (`assets/app.js`). 상태는 in-memory `state` 객체. 지도는 `fitBounds`로 day 전체 보이도록 시작, 클릭 시 `flyTo`. URL hash는 `#dayN/placeId` 포맷, 새로고침해도 상태 복원. `boot()`는 데이터 fetch 실패 시 한국어 에러 메시지를 표시.

## Code locations
- `index.html` (스켈레톤 + CDN imports)
- `assets/styles.css` (day 색상 CSS vars + numbered-marker + 모바일 media query)
- `assets/app.js` — `DAY_COLORS` / `dayColor` / `esc` / `safeHref` helpers
- `assets/app.js` — `state`, `loadData`, `initMap`
- `assets/app.js` — `renderDay`, `selectStop` (지도 + 마커)
- `assets/app.js` — `renderSidebar`, `renderDetail`, `renderProgressBar` (UI)
- `assets/app.js` — `parseHash`, `boot`, `hashchange` listener (라우팅)
- `data/places.json`, `data/itinerary.json` (5 places, Day1)

## Retrospective
- 잘 된 점: TDD 없이도 per-task spec+code 리뷰가 critical 이슈 6개를 사전 차단 (loadData 에러 처리, XSS escaping, null 가드, DAY_COLORS 폴백, hashchange race, aria-label).
- 잘 된 점: Tailwind play CDN + Pretendard로 빌드 단계 없이 미려한 UI 확보, 단일 HTML로 로컬 실행 가능.
- 조심할 점 (Stage 2 직전 처리): renderSidebar/renderDetail에 place 가드 추가 (60개 데이터 타이포 대비), 같은 날 내 hashchange 시 sidebar 동기화.
- Stage 3로 이연: `mobile-tabs` 비어 있음 (계획대로 Stage 3.1에서 채움), `.numbered-marker.active` CSS는 dead code지만 Stage 3.3에서 활성화 예정이므로 보존.
- Stage 2 readiness: Ready with caveats — Critical 가드 픽스 후 진입.
