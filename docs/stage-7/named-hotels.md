# Stage 7 — Named Hotels (Sugata + Ebisuhigashi)

## Why

이전 단계까지 숙소는 `namba_hotel` / `namba_hotel_checkout` 같은 abstract id로 표현 — 실제 예약된 호텔 두 곳과 위치·체크인/아웃 흐름이 일치하지 않았다. 사용자가 실제 예약을 알린 시점에 도착해, 1·2일차와 3·4일차의 박이 서로 다른 호텔이라는 사실을 데이터에 반영하지 않으면 Google Maps 길찾기 origin이 잘못 잡혀 시간 신빙성이 다시 떨어진다.

## What

- **places.json**에 호텔 3개 추가:
  - `sugata_hotel` — Sugata Hotel Osaka Shinsaibashi (Marriott Series), 신사이바시
  - `ebisuhigashi_hotel` — 2-1-24 Ebisuhigashi, 나니와구 (호텔명 미상)
  - `ebisuhigashi_hotel_checkout` — Day5 체크아웃용 utility stop
- **itinerary.json** 호텔 참조 교체:
  - Day1 체크인 stop `namba_hotel` → `sugata_hotel`
  - Day2 첫 transit origin + 마지막 stop → `sugata_hotel`
  - Day3 첫 transit origin → `ebisuhigashi_hotel`; 도톤보리 후 체크인 stop 추가
  - Day4 첫 transit origin + 마지막 stop → `ebisuhigashi_hotel`
  - Day5 첫 stop → `ebisuhigashi_hotel_checkout`
  - 출국 stop transit "from" → "에비스히가시 호텔"
- 도보 시간 1건 보정: day1/dotonbori 8→12분 (Sugata→Dotonbori는 ~900m, 이전 namba_hotel ~300m 기준 8분이 짧아짐)

## How

`/tmp/patch-hotels.mjs` 한 번 실행으로 places + itinerary 두 파일을 일관되게 patch. 검증 트리오:
- `npm run validate` → 68 places, 5 days ✓
- `npm test` → 11/11 ✓
- `npm run verify-walk` → 7 walking segments all within tolerance (한 곳만 보정 필요했음)

UI 변화 (검증 완료):
- Day1 `#day1/sugata_hotel` → 디테일 헤더 "수가타 호텔 오사카 신사이바시", Google Maps 버튼 origin=공항(34.4347), destination=Sugata(34.6767) ✓
- Day2 `#day2/fushimi_inari` → origin=Sugata(34.6767) ✓
- Day3 `#day3/osaka_castle` → origin=Ebisuhigashi(34.6515) ✓
- Day5 stops = `ebisuhigashi_hotel_checkout, kansai_airport_dep` ✓

좌표 정확도 trade-off:
- Sugata: 사용자가 준 Google Maps URL의 정확한 좌표 (34.6766637, 135.504813)
- Ebisuhigashi: 주소만 받아 츠텐카쿠(34.6513, 135.5063) 동쪽 1-2블록 추정 (34.6515, 135.508). 정확한 호텔이 다른 좌표면 `places.ebisuhigashi_hotel.coords` 한 줄 수정.

## Code locations

- `data/places.json` — sugata_hotel / ebisuhigashi_hotel / ebisuhigashi_hotel_checkout 추가
- `data/itinerary.json` — Day1-5 stops·transit_from_prev.origin_place_id 교체
- `/tmp/patch-hotels.mjs` (one-shot patch, repo에 commit 안 됨)
- 관련 commit: `795d6be data: name actual hotels for day1-4 stay`

## Retrospective

### 잘된 점
- Stage 6에서 도입한 `origin_place_id` 필드가 정확히 이 시나리오용. 데이터에 호텔 두 개를 추가해도 UI 코드 변경 0 — render·라우팅 그대로.
- `validate-data` + `verify-walk`가 데이터 변경 후 회귀를 즉시 잡음 (Sugata→Dotonbori 도보 시간이 짧다고 flag → 8→12분 보정 자동 발견).

### 다음에 가져갈 것
- Ebisuhigashi 호텔의 정확한 이름/좌표를 사용자가 확인하면 한 줄 patch로 보정. 현재는 주소 기반 추정.
- 호텔 logistics (Sugata→Ebisuhigashi 짐 옮기기 transit)는 itinerary stops에 명시되지 않음 — Day2 끝 Sugata, Day3 시작 Ebisuhigashi 사이의 짐 이동은 사용자가 알아서. 필요시 Day3 첫 stop 앞에 별도 logistics stop 추가 가능.

### 검증
- `node scripts/validate-data.mjs` → ✓ 68 places, 5 days validated
- `node --test tests/validate-data.test.mjs` → 11 pass
- `node scripts/verify-walk-times.mjs` → 7 도보, flagged 0
- browse smoke: Day1/Sugata, Day2/Day3 첫 stop origin, Day5 출발 모두 정상 — console error 0
