# Stage 2 — Complete Data (65 places + 5 days)

## Why
Stage 1의 와이어링이 동작함을 확인했으니, 진짜 정보를 채워야 한다. 사용자가 현장에서 보고 따라갈 수 있는 수준 — 좌표가 정확하고, 출처가 있고, 메인 명소엔 맛집이 있고, 후기 검색 링크가 살아 있어야 한다.

## What
- `docs/stage-2/place-catalog.md`: 65 명소 마스터 리스트 (id, 한국어명, main/alt 분류)
- `data/places.json`: 총 **65개 명소** 채워짐
  - Day 1: 12 (3 main + 9 alt)
  - Day 2: 21 (5 main + 16 alt) — 교토
  - Day 3: 26 (6 main + 20 alt) — 오사카 도심 (kuromon/denden 포함)
  - Day 4: 4 (1 main + 3 alt) — USJ + 시티워크
  - Day 5: 2 (2 main) — 출국 utility stops
- `data/itinerary.json`: Day1~Day5, 21 stops, 모든 stop에 transit_from_prev/duration_minutes
- `scripts/validate-data.mjs`: 스키마 / 일본 좌표 범위 / place_id 참조 / URL 안전성 / main → restaurants (utility 태그 예외) 검증
- `tests/validate-data.test.mjs`: 8개 테스트 케이스 통과
- `package.json`: `npm test`, `npm run validate` 스크립트

## How
Day별로 별도의 subagent (general-purpose) 호출. 각 subagent에 마스터 카탈로그의 해당 day 부분 + JSON 스키마를 strict하게 prompt로 전달. 좌표는 WebSearch로 Wikipedia/공식 사이트에서 추출 후 카탈로그 범위 검증. 결과를 implementer가 직접 places.json에 머지하고 commit.

TDD로 validator를 먼저 만들었고 (`tests/` 작성 → 실패 확인 → `scripts/` 작성 → 통과 확인), 실제 데이터의 검증 결과를 보며 한 가지 정책을 조정: **utility 태그 (`교통허브`, `숙소`, `출국 준비`, `공항`, `출국`) 가 있는 main 명소는 restaurants가 비어도 OK**. 공항·호텔·체크아웃 같은 유틸리티 stop이 dining destination 으로 분류되지 않게 하려는 의도.

## Code locations
- `data/places.json` (65 entries)
- `data/itinerary.json` (5 days, 21 stops)
- `scripts/validate-data.mjs` (`validate(places, itinerary)`)
- `tests/validate-data.test.mjs` (8 tests)
- `package.json` (`test`, `validate` scripts)
- `docs/stage-2/place-catalog.md` (마스터 리스트)

## Retrospective
- 잘 된 점: Day별 분리 dispatch로 60+ 명소 조사를 ~25분 안에 완료. 좌표는 모두 일본 영역 + 도시별 sub-bound 검증 통과.
- 잘 된 점: 메인 명소의 맛집은 실제 검증된 가게만 (奥丹清水 1635년, 串かつだるま 원조, ARABICA, 茶寮都路里 등) — 검색→찾기 쉬움.
- 잘 된 점: TDD validator가 첫 실행에서 정책 빈틈 (utility tag 예외 필요) 을 정확히 잡아냄. 이후 그것이 8번째 테스트로 영속화됨.
- 조심한 점: nippombashi와 denden_town의 좌표가 거의 같음 (실제로 같은 거리). 의도된 conceptual overlap — 광역 닛폰바시 vs 전자상가 덴덴타운.
- 조심한 점: 도시 경계 검사 (Kyoto bounds 34.5-35.5, Osaka bounds 34.5-34.8) 로 좌표 오류 사전 차단.
- 변경 사항: 마스터 카탈로그는 64로 표기되었으나 Day 2 alt가 한 개 더 추가되어 (의도된 보완: ishibekoji + nene_no_michi + yasaka_pagoda 등 모두 가까운 옛 골목들) 최종 65개. 큰 차이 없음.
- 이연: Stage 3로 — mobile 탭 활성화, marker 펄스 활성화 (`.numbered-marker.active` 활용).
