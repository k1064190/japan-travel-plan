# Stage 16 — USJ Interior Attractions

## Why

Stage 4 USJ를 단일 stop으로 처리했지만 실제로는 11개 zone, 50개+ 어트랙션이 있는 곳. Day 4 하루 종일을 한 점으로만 표시하면 "USJ에서 뭘 할지" 계획이 불가능. 한국인 관광객은 보통 Mario Kart·Forbidden Journey·Hollywood Dream 같은 인기 라이드 + 닌텐도 정리권 + 시즌 이벤트(Cool Japan, Detective Conan 콜라보) 같은 운영 디테일을 미리 알아야 동선·대기시간을 최적화한다. 그래서 USJ 내부를 별도 어트랙션 단위로 데이터화하고 맵·디테일에서 탐색 가능하게 만든다.

## What

- 스키마 옵셔널 3필드 추가:
  - `place.parent` — 자식임을 표시하는 부모 place id 참조
  - `place.park_zone` — 표시용 zone 라벨 (자유 문자열)
  - `place.attraction_type` — enum `ride` / `show` / `food` / `shop` / `event` / `landmark`
- USJ 자식 52개 entry — 16 rides / 13 events / 12 food / 6 shops / 4 shows / 1 landmark.
- Zone 분포: 슈퍼 닌텐도 월드(8), 위저딩 월드(8), 미니언 파크(5), 쥬라기 공원(5), 할리우드(5), 뉴욕(5), 유니버설 원더랜드(5), USJ 공통 이벤트(5), 애미티 빌리지(3), 샌프란시스코(2), 워터월드(1).
- 폐장/시즌 종료 5개도 detail에 "현재 운영 종료" 표기로 보존 (Spider-Man 4K3D 2024-01-22 폐장, Backdraft 2023-05 폐장 발표, Sesame Street Fun World 2026-05-10 폐장 — 여행 시작 12일 전, Demon Slayer XR Ride 2025-01 종료).
- 자식 위치는 USJ 부지 [34.665~34.668, 135.431~135.434] 안에서 zone 중심 ±5-10m 오프셋 (어트랙션별 정확 좌표는 USJ 미공개 — 후속 검증 가능).
- UI:
  - `state.usjLayer` — Day 4가 활성일 때 USJ 자식 마커 자동 노출. zone별 색상으로 시각 구분, 22px 작은 핀이 numbered marker 아래에 깔림.
  - 디테일 패널 USJ 본 페이지 안에 "🎢 USJ 내부 (52)" 섹션 — zone별 색상 카드 그룹화, attraction_type 뱃지 + 평점 표시.
  - 자식 디테일에 "← USJ로 돌아가기" back-nav + zone 컬러 뱃지.
- Validator: parent가 자기 자식이 아닌 root place를 가리키는지 검증, parent 있으면 restaurants 요구 면제 (food zone 자식이 restaurants를 다시 가질 필요 없음), attraction_type enum 강제.

## How

1. 4-subagent 병렬 큐레이션 (Stage 11/12/15 패턴):
   - Group 1: 슈퍼 닌텐도 월드 (8) — USJ 공식 한국어 + Wikipedia + 나무위키 + TDR Explorer
   - Group 2: 해리포터 + 미니언 (13) — USJ 공식 + Wikipedia EN + KKday Korea + TDR Explorer (Hogwarts Magical Night 시즌 확인)
   - Group 3: 할리우드 + 뉴욕 + 샌프란시스코 + 원더랜드 (17) — 폐장·재개장 cross-check가 핵심. Inside Universal, WDW News Today 보도 활용
   - Group 4: 쥬라기 + 워터월드 + 애미티 + 공통 이벤트 (14) — 2026-05 운영 여부 정밀 검증 (Cool Japan/Conan 콜라보 6/30까지, Halloween Horror Nights·Wonder Christmas는 시즌 외)
2. 각 subagent가 `/tmp/usj-patches/group{N}.json` 출력 → `/tmp/merge-usj.mjs`가 일괄 머지. 머지는 중복 placeId 시 첫 entry 유지, `restaurants: []`/`tags: []`/`review_links` 백필.
3. Validator `parent` 참조 검증 + `attraction_type` enum + parent 있으면 `restaurants` REQUIRED_FIELDS 면제. 테스트 +3 (passing child / unknown parent / invalid type).
4. UI:
   - 새 `state.usjLayer`가 `routeLayer`·`altLayer` 다음에 깔림 (numbered marker는 위에 유지)
   - `drawChildMarkers(parentId, color)`가 renderDay 안에서 each stop의 children을 zone color 22px 핀으로 그림
   - `renderUsjChildren(parent, parentId, color)`가 자식을 zone별 그룹화해 디테일 패널 안 카드 그리드로 렌더
   - 자식 디테일은 parent가 있으면 transit card 위에 "← USJ로 돌아가기" 버튼, name 아래 zone color 뱃지
   - `selectAlt(id)` 재사용 — 맵 핀 클릭, 카드 클릭, back-nav 모두 같은 진입점

## Code locations

| 파일 | 변경 |
| --- | --- |
| `scripts/validate-data.mjs:1-50` | `CHILD_EXEMPT_FIELDS`, `ATTRACTION_TYPES`, child detection |
| `scripts/validate-data.mjs:115-138` | parent/park_zone/attraction_type 검증 |
| `tests/validate-data.test.mjs` | +3 cases (15 → 18 pass) |
| `assets/app.js:125-167` | `renderUsjChildren(parent, parentId, color)` |
| `assets/app.js:421-422` | `state.usjLayer` 초기화 |
| `assets/app.js:434` | renderDay clear |
| `assets/app.js:481-496` | renderDay에서 `drawChildMarkers` 호출 |
| `assets/app.js:498-522` | `PARK_ZONE_HUE`, `zoneColor` (prefix 매칭) |
| `assets/app.js:524-552` | `getChildren`, `drawChildMarkers` |
| `assets/app.js:716-723` | renderDetail 내 backNav + zoneBadge + childrenSection 변수 |
| `assets/app.js:739-749` | innerHTML에 backNav + zoneBadge + childrenSection 슬롯 |
| `assets/app.js:817-825` | data-child + back-nav 이벤트 핸들러 |
| `assets/styles.css:44-67` | `.park-child-marker` |
| `data/places.json` | 52 신규 entries (`usj_smw_*`, `usj_hp_*`, `usj_mp_*`, `usj_hw_*`, `usj_ny_*`, `usj_sf_*`, `usj_uw_*`, `usj_jp_*`, `usj_ww_*`, `usj_am_*`, `usj_event_*`) |
| `docs/stage-16/usj-interior.md` | 이 문서 |

## Retrospective

### 잘된 점

- 4-subagent 병렬이 ~28분만에 52 entry 큐레이션 완료. Group 3 verifier가 5개 폐장·종료 항목을 정확히 식별 (오늘 2026-05-21 기준 Sesame Street 폐장 11일 전 등).
- `parent` 한 필드로 children/restaurants/zone 트리를 깔끔히 표현 — 새 JSON 파일 없이 places.json 안에서 흡수.
- `zoneColor` prefix 매칭이 "슈퍼 닌텐도 월드 / 동키콩 컨트리" 같은 sub-zone 명칭도 부모 색으로 자연스럽게 fallback.
- Validator는 169 places 회귀 없이 옵셔널 필드만 추가 — Stage 15와 동일한 비파괴 확장 패턴.

### 다음에 가져갈 것

- 어트랙션별 정확 좌표는 USJ가 공개하지 않아 zone center ±5-10m 추정 — 실사용 시 핀이 zone 안 어딘가에 떨어지지만 정확 위치는 아님. OSM 기여자가 USJ 내부 폴리곤·노드 작성하면 후속 보정 가능.
- 폐장 어트랙션 표시 — 현재는 detail 본문에 "현재 운영 종료"만 텍스트로 두지만, 별도 시각 표시 (회색 핀, "폐장" 뱃지)가 더 명확.
- 정리권 / 익스프레스 패스 필요 여부를 tag로만 표시 — Stage 15 booking 인프라(필수 뱃지 + advance_days)와 연결하면 일관성 ↑.
- Day 4 itinerary는 1 stop 그대로 유지. 사용자 요청이 늘면 USJ 안에서 시간 단위 sub-stop 분할 가능 (오전 = SMW, 오후 = HP, 밤 = 퍼레이드 등).

### 검증

- `node scripts/validate-data.mjs` → ✓ 221 places, 5 days (169 + 52)
- `node --test tests/validate-data.test.mjs` → 14 pass (11 + 3 new cases)
- `node /tmp/merge-usj.mjs` → 52 entries added, 0 duplicates after final run
- 데이터 분포 확인: 16 ride / 13 event / 12 food / 6 shop / 4 show / 1 landmark
- 폐장/시즌 종료 5개 detail에 표기 확인
