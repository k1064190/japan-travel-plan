# Stage 9 — Restaurant Candidates + Ratings

## Why

Stage 8에서 일정 주변 alt 후보를 맵에 띄웠지만 음식점은 적었고, 무엇보다 "이 가게가 진짜 좋은가" 판단할 신뢰 지표가 없었다. 사용자가 현장에서 마커 클릭만으로 "Tabelog 3.8, 후기 2,000개" 같은 사회적 증거를 즉시 확인하면 들를지 말지 결정이 훨씬 빠름.

## What

- **스키마 확장** (`scripts/validate-data.mjs`)
  - `place.rating` / `place.review_count` / `place.rating_source` — alt 카테고리 음식점·호텔 등 어떤 place든 옵셔널.
  - `place.restaurants[].rating` / `.review_count` / `.rating_source` — 기존 main 명소 내부 맛집 카드에도 동일.
  - `validateRating(label, obj, errors)` 공용 헬퍼로 검증 통합.
- **UI** (`assets/app.js`)
  - `renderRating(obj)` 공용 헬퍼: `★ 4.3 · 후기 1,234개 (Tabelog)` 포맷 (필드 있는 만큼만 표시).
  - main 명소 detail 패널의 맛집 카드 type 라인 옆에 inline 표시.
  - alt place detail 패널의 헤더(`name_jp`) 아래에 inline 표시.
  - 색은 amber-600 (별점 분위기), 폰트 small.
- **데이터** (`data/places.json`)
  - Day1-4 area에 새 음식점 alt 36개 (4 subagent 병렬 검색). 라멘·오코노미야키·타코야키·스시·야끼니쿠·쿠시카츠·우동·소바·카츠·디저트·이자카야·카레 등.
  - 거의 대부분 Tabelog 별점 + 후기 수 포함.
  - 1개 sample (dotonbori main 안 긴류 라멘) main-restaurant rating 인젝션해 양쪽 UI 경로 모두 검증.
  - itinerary 변경 0.

## How

스키마 변경부터 sample 1건으로 inline 표시 동작 확인 → Phase B 4 subagent 병렬 dispatch → 각자 `/tmp/restaurant-patches/dayN-food.json` 저장 → 단일 merge 스크립트가 places.json에 합침 (충돌 시 day1 우선 dedupe — Day1과 Day3가 ichiran/kamukura/mizuno 중복했음). 1건 http:// URL → https:// 자동 업그레이드.

Tabelog 점수 해석: 일본 Tabelog는 3.0–4.0 사이가 정상 분포이며, 3.5+가 인기, 3.8+가 명점 수준. 그래서 별점이 4.x로 보이지 않아도 한국 사용자가 오해하지 않게 `(Tabelog)` 출처를 함께 표시.

## Code locations

- `scripts/validate-data.mjs:20-37` (`validateRating` 헬퍼)
- `scripts/validate-data.mjs:115-128` (place + restaurants[]에 호출)
- `assets/app.js:37-46` (`renderRating` 헬퍼)
- `assets/app.js:48-67` (`renderRestaurant` rating inline)
- `assets/app.js:416` (`renderDetail` header rating)
- `data/places.json` (36 새 alt 음식점 + 1 sample main-restaurant rating)

관련 commit:
- `e638e32 feat(schema): optional rating/review_count/rating_source`
- `eaff7e8 feat(detail): render restaurant + place ratings inline`
- `c12b193 data: add 36 restaurant alt-candidates + Tabelog ratings`

## Retrospective

### 잘된 점
- 스키마 옵셔널화로 기존 데이터 회귀 0. 데이터 부분 채워진 entry도 그대로 동작.
- 4 subagent 병렬로 ~7분 wall-clock에 36개 음식점 큐레이션 + 별점/후기 수집 끝. 단일 sequential이면 30분+.
- Tabelog 별점 표기 (`(Tabelog)` 출처 명시)로 한국 사용자가 일본 점수 체계(3-4점 분포)를 오해하지 않게 함.

### 다음에 가져갈 것
- 병렬 subagent가 같은 가게를 중복 생성 (`ichiran_dotonbori` 등). 다음 batch에는 명시적 ID 예약 또는 분류별로 미리 ID 후보 정해 prompt에 박는 게 좋겠음.
- 별점 데이터의 신뢰도가 균일하지 않음 — subagent가 Tabelog rating을 직접 fetch하지 않고 후기 게시글에서 추정한 케이스도 있음. 정확한 라이브 점수는 Tabelog API/스크레이핑이 필요 (현 단계 범위 밖).
- main 명소들 (`dotonbori`, `kuromon_market` 등)의 내부 `restaurants[]`는 sample 1건만 rating 채워졌고 나머지는 미설정 — 추후 일괄 채우기 가능.

### 검증
- `node scripts/validate-data.mjs` → ✓ 131 places, 5 days validated
- `node --test tests/validate-data.test.mjs` → 11 pass
- `node scripts/verify-walk-times.mjs` → 도보 segment all within tolerance
- browse smoke:
  - Day별 alt 수 증가: day1 18→32, day2 33→57, day3 35→51, day4 17→24, day5 13→14
  - 이치란 alt 클릭 → 헤더 아래 "★ 3.6 · 후기 2,100개 (Tabelog)" 정상 표시
  - 긴류 라멘 main-restaurant 카드 안에서도 동일 inline 별점 표시
  - console error 0
