# Stage 13 — "맵에서 보기" Button + GPS Self-Location

## Why

사이드바·맵 마커 클릭은 디테일 패널 + 맵 flyTo를 동시에 실행하지만 디테일 패널이 맵을 일부 가려서 "이 가게가 거기랑 정확히 어디 붙어있는지" 실제 위치를 보고 싶을 때 한 번 더 액션이 필요했다. 그리고 현장에서 자기 위치 기준으로 어떤 후보가 가까운지 직관적으로 보려면 GPS가 필요.

## What

- **디테일 헤더에 `📍 맵에서 보기` 버튼** — 클릭 시:
  - 디테일 패널 close
  - `state.map.flyTo(place.coords, 18, {duration: 0.8})` — zoom 18로 가까이
  - 모바일이면 `setMobileView("map")`로 맵 탭 자동 전환
  - 일정 stops와 alt 후보 모두 같은 `renderDetail` 경로라 한 번에 둘 다 지원.
- **Leaflet 커스텀 컨트롤 `📍 내 위치 (GPS)`** — 맵 좌상단:
  - `navigator.geolocation.getCurrentPosition` + `enableHighAccuracy: true`
  - 성공 → 파란 점 마커(`내 위치` 툴팁) + 정확도 circle 오버레이 + `flyTo` zoom 16
  - 권한 거부 / 신호 없음 / timeout 별로 한국어 에러 메시지 (geolocation error code 1/2/3 매핑)
  - 재클릭 시 기존 마커 제거 후 새로 생성 → 중복 누적 방지
- CSS `.leaflet-control-locate` — 30×30 흰색 버튼, hover 시 slate-100, Leaflet 기본 컨트롤 스타일 호환.

## How

- `initMap()` 끝에 `addLocateControl()` 호출 — Leaflet `L.Control.extend({ position: 'topleft', onAdd() {...} })` 패턴으로 버튼을 컨트롤로 등록. `L.DomEvent.disableClickPropagation`로 맵 클릭과 분리.
- `requestLocation()`은 별도 함수로 분리해 컨트롤 onclick에 binding. `userLocationMarker` / `userLocationAccuracy` 모듈 상태로 두어 재클릭 시 cleanup.
- 디테일 헤더 버튼은 `renderDetail`의 innerHTML에 `<button id="detail-locate">` 추가 + 끝에 click 핸들러 attach (기존 `#detail-close` 패턴 동일).

브라우저 보안:
- HTTPS 또는 localhost 컨텍스트에서만 geolocation 동작 — 현재 사이트는 LAN HTTP라 일부 브라우저는 거부 가능. Stage 4 README의 `python3 -m http.server`는 localhost로 띄우는 게 안전.
- 데스크톱은 IP 기반 (수백 m 오차), 모바일은 GPS (수 m 정확) — 현장에서는 사용자 폰으로 접속 가정.

## Code locations

- `assets/app.js:224-313` (initMap → addLocateControl, requestLocation, userLocationMarker/Accuracy state)
- `assets/app.js:520-523` (detail 헤더 `#detail-locate` 버튼)
- `assets/app.js:592-601` (detail-locate 클릭 핸들러)
- `assets/styles.css:67-78` (.leaflet-control-locate)
- 관련 commit: `5ccca23 feat(map): '맵에서 보기' button + GPS '내 위치' control`

## Retrospective

### 잘된 점
- Leaflet 커스텀 컨트롤 패턴 사용 — Leaflet 기본 zoom 컨트롤 옆에 자연스럽게 자리. 별도 floating UI 안 만들고도 동일 룩.
- 디테일 헤더 버튼이 alt 후보·일정 stop 둘 다 지원 — `renderDetail` 단일 경로.
- 권한 거부·신호 없음·timeout 모두 별도 한국어 에러로 분기.

### 다음에 가져갈 것
- `watchPosition`으로 이동 추적은 안 했음 — 현장에서 걷는 동안 마커가 따라오면 좋겠지만 배터리·메모리 영향. 향후 토글 옵션으로 추가 가능.
- 위치 마커가 두 번 누르면 새로 떨어지지만 zoom-out 후 위치 잃으면 사용자가 다시 찾기 어려움. "다시 내 위치로" 단축키 또는 컨트롤 더블탭 동작 검토.
- 권한 거부 시 alert()으로 처리 — 더 매끄럽게 토스트 또는 inline 메시지로 대체 가능.
- iOS Safari는 HTTPS만 허용. LAN HTTP에선 일부 사용자 거부될 수 있음 — 사용자가 모바일에서 실제 테스트 시 알림 필요.

### 검증
- `npm run validate` → ✓ 169 places, 5 days validated
- `npm test` → 11 pass
- browse smoke:
  - `.leaflet-control-locate` 컨트롤 + `#detail-locate` 버튼 모두 렌더링
  - `#detail-locate` 클릭 → 디테일 패널 hidden, flyTo zoom 18 호출 (호출 자체 검증)
  - console error 0
- GPS는 헤드리스 브라우저에서 권한 부여가 안 됨 — 실 디바이스 (스마트폰 또는 데스크톱 직접 클릭)에서 사용자 검증 필요.
