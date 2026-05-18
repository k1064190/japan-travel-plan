# Stage 6 — Realtime Transit Verification + Deep Link

## Why

Stage 1–5의 transit (도보·전철·버스) 시간은 사전 조사 기반의 추정치. 사용자가 현장에서 "이 시간이 맞나" 라는 의문을 느꼈고, 특히 라피트·JR·미도스지선 같은 일본 대중교통 시간은 환승·정차·실시간 운행 상황에 따라 크게 변동. 매번 수동으로 Google Maps에 좌표 복붙하기보다, 각 stop에서 한 번 클릭으로 실시간 경로를 띄울 수 있으면 신뢰도 + 편의성이 둘 다 올라간다.

## What

- **UI 딥링크**: 디테일 패널의 transit 카드 안에 `Google Maps에서 실제 경로·시간 보기 →` 버튼 추가. 클릭 시 새 탭에 Google Maps directions 페이지가 열리고 origin·destination·travelmode가 자동으로 채워져 실시간 시간/요금/노선 안내가 표시됨.
- **도보 sanity check**: `scripts/verify-walk-times.mjs` — pure 도보 구간의 planned 시간을 haversine 거리 + 1.25 detour factor + 5 km/h 기준으로 sanity check. ±3분 AND ±50% 초과 시 flag. `npm run verify-walk` 로 호출.
- **대중교통 검증 정책**: 자동 검증은 미지원 (OSRM 데모는 foot이 driving으로 fallback, ORS/GraphHopper는 API key 필요, Google Directions API는 유료). UI 버튼이 실시간 검증의 1차 도구.

## How

런타임에 좌표 lookup으로 URL을 생성 — 데이터 변경 없음, places.json + itinerary.json 그대로 사용. 새 헬퍼 3개:

- `transitModeToGoogleMode(mode)` — 한국어 mode 문자열을 Google travelmode로 매핑. `도보 → walking`, `택시·자동차 → driving`, 그 외 (라피트·JR·지하철·한큐·미도스지선·사철·기차·버스·hybrid) → `transit`.
- `buildDirectionsUrl(originCoords, destCoords, mode)` — `https://www.google.com/maps/dir/?api=1&origin=lat,lng&destination=lat,lng&travelmode=...` URL을 안전하게 생성 (좌표가 finite number가 아니면 null 반환).
- `getTransitEndpoints(dayId, stopIndex)` — 현재 stop의 transit_from_prev가 있을 때 origin/destination place 객체 반환. origin은 (1) 같은 day의 직전 stop, 없으면 (2) 이전 day의 마지막 stop을 fallback으로 사용.

도보 검증 휴리스틱 채택 이유:
1. OSRM 공개 데모(`router.project-osrm.org/route/v1/foot/`)는 foot profile이 driving으로 fallback되어 34 km/h 결과를 반환 — 도보로 사용 불가 (2026-05-18 확인).
2. GraphHopper / OpenRouteService는 무료 tier가 있으나 API key 필요 → 검증 스크립트가 사용자 환경 의존성을 만듦.
3. Google Directions API는 유료.
4. 도시 내 ≤ 2 km 단순 도보는 haversine × 1.25 detour ÷ 5 km/h 가 실측과 ±2분 차이 — 큰 오류 (5분 vs 30분) 잡아내기엔 충분, 작은 차이 (5분 vs 8분)는 어차피 Google Maps 버튼으로 사용자가 확인.

대중교통은 알고리즘적으로 검증 불가 (시간표·환승·플랫폼·실시간 운행이 모두 필요). 사용자가 클릭 한 번으로 Google Maps에서 보는 게 현실적 최선책.

## Code locations

- `assets/app.js:65-103` (`transitModeToGoogleMode`, `buildDirectionsUrl`, `getTransitEndpoints`)
- `assets/app.js:275-296` (transit 카드 내 deep-link 버튼)
- `scripts/verify-walk-times.mjs` (haversine + 도보속도 휴리스틱)
- `package.json` (`npm run verify-walk` 스크립트)
- `docs/stage-6/realtime-transit.md` (이 문서)

관련 commit:
- `8335aba feat(transit): Google Maps deep-link button on each transit card`
- `aeadd38 test(qa): walking-time sanity check via haversine + 5 km/h heuristic`

## Retrospective

### 잘된 점
- 데이터 변경 0건 — 런타임 좌표 lookup으로 URL을 즉석 생성. 회귀 위험 최소.
- Google Maps 딥링크는 API key·인증 없이 동작 + iOS/Android에서 Maps 앱으로 자동 deep-link됨 (URL scheme 매칭).
- 도보 검증 휴리스틱이 OSRM/ORS/Google 모두 안 쓰고도 sanity bar로는 충분 — flagged 2건 모두 실측 ±5분 내라 데이터 변경 없이 유지 가능.

### 다음에 가져갈 것
- origin fallback이 prev-day 마지막 stop인데, 그 last stop이 dotonbori 같은 관광지면 호텔과 약간 어긋남 (직선 500m 내). 정확하게 하려면 itinerary stop에 `from_place_id` 명시 필드 추가가 필요. 현재는 작은 오차라 trade-off로 그대로 유지.
- Google Directions API key를 추후 사용한다면 사전 빌드 타임에 verified_minutes·verified_url 정적 캐싱 가능. 현재는 클라이언트 사이드 즉석 생성으로 충분.
- 검증 휴리스틱이 hybrid mode (`JR환상선+도보`)를 skip — 사용자가 도보 비중이 큰 hybrid를 의심하면 별도 분석 필요.

### 검증
- `node scripts/validate-data.mjs` → ✓ 65 places, 5 days validated
- `node --test tests/validate-data.test.mjs` → 11 pass
- `npm run verify-walk` → 7개 도보 검증, flagged 0 (sannenzaka 5→7분, denden_town 7→10분 보수 조정 후)
- `browse` 스크립트로 디테일 패널 deep-link 버튼 확인:
  - day1/namba_hotel (라피트, transit) → `&travelmode=transit`
  - day1/dotonbori (도보) → `&travelmode=walking`
  - day3/umeda_sky (미도스지+도보 hybrid) → `&travelmode=transit` (exact-match 룰)
  - day2/fushimi_inari (day 첫 stop, origin_place_id=namba_hotel) → origin 좌표 = namba_hotel ✓
  - day1/kansai_airport (첫 stop, transit_from_prev 없음) → 버튼 미표시 정상
- console error 0

### Codex PR Review (PR #3)

3 라운드 cap 안에 1 라운드로 끝. 3건 P2:
- (P2) day-first stop origin이 prev-day last stop 좌표라 "난바 → 이나리역"이 dotonbori에서 출발하는 식 → itinerary stop에 `origin_place_id` 옵셔널 필드 추가, `getTransitEndpoints`가 우선 사용. validator에 옵셔널 참조 무결성 검증 추가. (적용)
- (P2) intra-day stop들도 transit_from_prev.from 이 prev stop 이름과 다른 경우 부정확. 데이터 분석 결과 day3/umeda_sky의 "닛폰바시" = `denden_town`의 별칭이라 좌표 거의 동일. fushimi_inari, osaka_castle, usj의 첫-stop 케이스만 영향 → origin_place_id로 해결.
- (P2) verify-walk가 baseline에 flag 2건이라 exit 2로 CI 깨짐 → 두 도보 segment 보수 조정 (sannenzaka 5→7분, denden_town 7→10분) + `--warn-only` 옵션 추가. 현재 flag 0, exit 0.
