# Stage 3 — Mobile Responsiveness + Detail Polish

## Why
현장에서 스마트폰으로 봐야 하는 게 최종 사용 시나리오. Stage 1-2의 데스크톱 레이아웃은 모바일에서 짜그라지기 때문에 별도의 mobile UX가 필요. 그리고 정보가 많아진 만큼 디테일 패널이 정리되어 있어야 한 화면에 들어옴.

## What
- 모바일 하단 탭바 (지도/일정) — `<nav id="mobile-tabs">`에 두 버튼, JS로 토글
- 모바일 디테일 패널이 풀스크린 모달 (z-index 1500)
- `selectStop` 호출 시 모바일에선 자동으로 지도 view로 복귀
- 디테일 패널 폴리시:
  - 상단 emoji 그라데이션 hero (h-40, text-7xl) + 둥근 close 버튼
  - 전 stop에서 오는 길 transit card (border-left + day 색상)
  - 태그 chip (`#야경`, `#먹거리` 등)
  - 추천 활동: ▸ marker + day 색상
  - 맛집 카드: name + price_range 같은 row, type/tip 아래
  - 후기 버튼 3-col grid (네이버 블로그 / 구글 웹 / 유튜브 영상)
- 활성 마커 pulse 애니메이션 (`@keyframes pulse-marker`, 1.4s ease-in-out)
- `--active-day` CSS 변수가 day 전환 시 자동 갱신 (모바일 탭 아이콘 색 동기화)

## How
`@media (max-width: 767px)` 분기로 사이드바를 absolute 풀스크린, 디테일을 fixed 풀스크린으로 전환. `setMobileView(view)` 함수가 sidebar/map class를 토글하고 탭 버튼 active 상태 갱신. `selectStop`에서 `matchMedia("(max-width: 767px)")` 체크 후 자동으로 지도 복귀. 활성 마커는 `state.markerLayer.eachLayer`로 모든 마커에서 `.active` 제거 후 `markers[stopIndex]`에만 추가, CSS animation으로 pulse.

## Code locations
- `index.html` — `<nav id="mobile-tabs">` 마크업
- `assets/styles.css` — 모바일 media query 블록, `@keyframes pulse-marker`, `.numbered-marker.active` 룰
- `assets/app.js` — `setMobileView`, `renderMobileTabs`, `renderDay`의 `--active-day` 설정, `selectStop`의 active marker toggle + matchMedia mobile close, `renderDetail` 전체 (transit card, chip, restaurant cards, 후기 grid)

## Retrospective
- 잘 된 점: 데스크톱 레이아웃 손대지 않고 `md:hidden` Tailwind 클래스 + `@media (max-width: 767px)` CSS로 모바일 전용 UX 추가. 분기점이 명확.
- 잘 된 점: `--active-day` CSS 변수 1개로 mobile tab 아이콘 색 + 마커 pulse 색을 한 번에 동기화. JS-CSS 사이 단일 source of truth.
- 잘 된 점: `selectStop`의 marker active toggle 패턴이 정확 — `eachLayer` 클린업 + 인덱스 기반 부착. `clearLayers()` 시점에 자동 정리됨.
- 조심한 점: marker pulse animation이 무한 반복이라 배터리 영향 미미하지만 있음 — 1.4s 주기는 충분히 잔잔. UX 우선.
- 조심한 점: 모바일 디테일이 풀스크린이지만 하단 `bottom: 3.5rem`으로 탭바 영역 비워둠. 닫기 버튼은 우상단 + 탭바로도 종료 가능.
- 이연: Stage 4 — iOS safe-area 처리 (env(safe-area-inset-bottom)), Firefox 검증, 명시적 smoke test 체크리스트.
