# Stage 14 — Marker Highlight Burst

## Why

Stage 13에서 "맵에서 보기" 버튼을 추가했지만 사용자가 "맵으로 이동은 되는데 그 자리에서 정확히 어디인지 찾기가 힘듦"이라고 보고. numbered 마커 + alt 마커가 같은 화면에 겹쳐있을 때 활성 마커를 시각적으로 즉시 찾을 수 있는 신호가 필요.

## What

- `highlightLocation(coords, color?)` 헬퍼 — `.highlight-ring` divIcon 마커를 잠깐 띄움. CSS `@keyframes highlight-burst`로 0.25× → 3× scale + opacity 0.95 → 0 fade, 1.4s ease-out. 1.5초 후 자동 removeLayer.
- 3개 경로에 통합:
  - `selectStop()` — 일정 stop 클릭 (사이드바 또는 맵 numbered 마커)
  - `selectAlt()` — alt 후보 마커/사이드바 카드 클릭
  - `#detail-locate` 클릭 — flyTo 600ms 후 burst 발생 (카메라 안착 타이밍과 맞춤)
- ring 색은 day color로 inline-style — 활성 day와 일관된 시각 신호.
- `interactive: false` + `keyboard: false`로 ring이 클릭 가로채지 않음.
- `zIndexOffset: 2000`으로 numbered/alt 마커 위에 표시.

## How

CSS:
```css
@keyframes highlight-burst {
  0%   { transform: scale(0.25); opacity: 0.95; }
  100% { transform: scale(3);    opacity: 0; }
}
.highlight-ring {
  width: 60px; height: 60px; border-radius: 50%;
  border: 4px solid #3b82f6;
  pointer-events: none;
  animation: highlight-burst 1.4s ease-out forwards;
}
```

JS helper:
```js
function highlightLocation(coords, color) {
  if (!Array.isArray(coords) || !state.map) return;
  const ringColor = color || dayColor(state.activeDay);
  const icon = L.divIcon({
    className: "",
    html: `<div class="highlight-ring" style="border-color:${ringColor}"></div>`,
    iconSize: [60, 60], iconAnchor: [30, 30],
  });
  const marker = L.marker(coords, { icon, interactive: false, keyboard: false, zIndexOffset: 2000 }).addTo(state.map);
  setTimeout(() => {
    if (state.map && state.map.hasLayer(marker)) state.map.removeLayer(marker);
  }, 1500);
}
```

`#detail-locate`에서는 flyTo(0.8s) 이후 카메라 안착 시점에 burst가 절정에 닿도록 `setTimeout(... , 600)` 추가.

## Code locations

- `assets/styles.css:80-98` (`@keyframes highlight-burst` + `.highlight-ring`)
- `assets/app.js:311-330` (`highlightLocation` 헬퍼)
- `assets/app.js:401` (`selectAlt`)
- `assets/app.js:441` (`selectStop`)
- `assets/app.js:670-672` (`#detail-locate` click handler, delayed burst)
- 관련 commit: `adf3615 feat(map): highlight ring burst when location is picked`

## Retrospective

### 잘된 점
- 단일 헬퍼 + 3 경로 wiring — 일정 stop / alt 후보 / detail-locate 어느 경로로 와도 동일 시각 신호.
- divIcon + CSS animation 조합 → Leaflet circleMarker가 안 되는 부드러운 scale·fade를 자연스럽게 처리.
- setTimeout cleanup이 map.hasLayer 가드해서 활성 day 변경으로 인한 map clear 후에도 안전.
- ring 색이 day color에 binding되어 사이드바·numbered 마커와 일관성 유지.

### 다음에 가져갈 것
- 비활성화 토글: 사용자가 너무 자극적이라 느끼면 `prefers-reduced-motion` 매체쿼리로 비활성화 옵션 추가.
- 마커 모양에 따른 anchor 조정 — 현재 30,30 고정. numbered 마커는 위쪽 정렬, alt 마커는 중앙이라 살짝 어긋날 수 있음.
- detail-locate의 600ms 지연이 매직 넘버 — Leaflet `moveend` 이벤트에 binding하면 더 정확하게 안착 후 burst 가능.

### 검증
- `npm run validate` → ✓ 169 places, 5 days
- `npm test` → 11 pass
- browse smoke:
  - detail-locate 클릭 → 1.4s 동안 ring 1개 표시, 1.5s 후 0개 (자동 cleanup) ✓
  - 일정 stop 클릭 → ring 1개 spawn
  - alt 후보 클릭 → ring 1개 spawn
  - 연속 클릭 시 ring 누적 OK (각자 자동 cleanup)
  - console error 0
  - 스크린샷에서 ring이 도톤보리 numbered 마커 주위에 확장되어 시각적으로 명확 (`/tmp/highlight-burst.png`)
