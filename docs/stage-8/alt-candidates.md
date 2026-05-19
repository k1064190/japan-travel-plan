# Stage 8 — Alt-Candidate Markers + Catalog Expansion

## Why

지금까지는 일정에 박힌 stop만 맵에 표시 — 그래서 "가는 길에 들를 만한 곳"이 시각적으로 보이지 않았다. places.json에 alt 카테고리 60+ 후보가 이미 있었지만 UI 상에서 발견 불가능. 사용자가 현장에서 일정대로 움직이면서 "여기 근처에 뭐 있지?"를 즉시 확인할 수 있게 만들 차례.

## What

- **UI**: 활성 day의 itinerary stop들 좌표 기준 1.5 km 반경 안 alt 카테고리 명소를 작은 회색 원형 마커로 맵에 표시. 호버 시 명소명 툴팁, 클릭 시 디테일 패널 (큐레이션 링크/활동/후기 검색 표시, 시간·duration은 "후보 — 일정에 들어있지 않음" 라벨로 대체).
- **데이터**: 4개 background subagent가 day별로 새 alt 후보 27개 추가:
  - Day1 area: 7개 (난바·신사이바시·도톤보리 카페·신사·야식)
  - Day2 area: 8개 (교토 동쪽 사찰·% Arabica·철학의 길)
  - Day3 area: 8개 (오사카 미술관·키타하마 카페·코리아타운)
  - Day4 area: 4개 (덴포잔 공원·시티워크 타코파·환승역)
- itinerary 변경 0건 (사용자 명시 요구).

## How

`renderDay`가 active day stops를 그리기 전에 `altCandidatesForDay(day)`를 호출 — 모든 alt 카테고리 place들 중 active day stops 중 어느 하나라도 1.5 km 안에 있는 것 (현재 day의 stop 자체는 제외) 반환. 각 candidate를 `altLayer`에 새 회색 마커로 추가, 클릭 핸들러는 `selectAlt(placeId)`. selectAlt는 numbered 마커처럼 sidebar 활성화는 안 하고 `renderDetail`만 호출.

`renderDetail`은 `stop.time === null`이면 시간 라벨을 "후보 — 일정에 들어있지 않음"으로 교체 + transit 카드 자동 생략 (transit_from_prev: null).

데이터 추가는 4개 subagent가 WebSearch로 한국어 후기 큐레이션 → `/tmp/alt-patches/dayN-new.json` 저장 → 단일 merge 스크립트로 places.json에 일괄 추가. 신규 27 entries 모두 schema 통과 (https URL, 일본 좌표 범위, curated_links 3개 each).

## Code locations

- `assets/app.js:122-181` (state.altLayer, haversineKm, altCandidatesForDay, selectAlt)
- `assets/app.js:222-244` (renderDay 첫 부분 — alt 마커 그리기)
- `assets/app.js:401` (renderDetail 시간 라벨 분기)
- `assets/styles.css:44-66` (`.alt-marker` 스타일)
- `data/places.json` (27 새 entries)
- 관련 commit: `cc0e349 feat(map)`, `0aff6cb data: add 27 alt-candidate places`

## Retrospective

### 잘된 점
- 데이터 변경 0 (itinerary 그대로) — 시각적으로만 후보 노출. 사용자가 일정 그대로 따라가면서 부담 없이 둘러볼 수 있음.
- 4 subagent 병렬로 ~6분 wall-clock에 27개 큐레이션 끝. 각자 day별 area에 집중해 컨텐츠 중복 없음.
- 좌표 기반 자동 필터 (1.5 km) — `day_hint` 같은 별도 데이터 필드 없이도 자동 매칭. 향후 alt 추가 시 그냥 좌표만 정확하면 자동 노출.

### 다음에 가져갈 것
- ALT_PROXIMITY_KM (1.5)이 적절한지 사용자 경험으로 조정 필요. Day1 18개·Day3 35개는 약간 빽빽함 — 1.0 km로 좁히거나 카테고리별로 다른 거리 (사찰/카페 0.5 km, 시장/공원 1.5 km 등) 휴리스틱.
- 마커 클러스터링 (leaflet.markercluster) 도입 — 줌 아웃 시 점들이 겹쳐 보이는 문제 해소.
- alt 마커 토글 (켜고/끄기) 옵션 — 일정만 보고 싶을 때.

### 검증
- `node scripts/validate-data.mjs` → ✓ 95 places, 5 days validated
- `node --test tests/validate-data.test.mjs` → 11 pass
- `node scripts/verify-walk-times.mjs` → 7 도보, flagged 0
- browse smoke (per day):
  - day1: numbered 6, alt 18
  - day2: numbered 12, alt 33
  - day3: numbered 16, alt 35
  - day4: numbered 6, alt 17
  - day5: numbered 4, alt 13
  - alt 클릭 → 디테일 패널 정상 ("후보 — 일정에 들어있지 않음" 라벨 표시), console error 0
