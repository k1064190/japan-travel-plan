# Stage 10 — Sidebar Candidate Cards + Filter Toggles

## Why

Stage 8/9에서 alt 후보·맛집을 맵에 회색 마커로 노출했지만 사이드바 일정 탭에서는 보이지 않았다. 작은 마커는 폰 화면에서 정확히 누르기 어렵고 별점을 한눈에 정렬해서 보기도 불편. 사이드바에 일정 stops 아래로 카드 형태로 노출하면 (1) 별점 내림차순으로 어디가 가장 인기 있는지 즉시 파악, (2) 큰 터치 타깃, (3) "맛집만"·"먼 후보도" 같은 필터를 켜서 의도한 후보만 좁혀볼 수 있다.

## What

- **사이드바 "주변 후보" 섹션** — 일정 stops 목록 아래에 추가. 활성 day의 alt 후보를 카드로 나열.
  - 별점 내림차순 정렬 (rating 없는 entry는 맨 뒤 + 한국어 가나다순)
  - 카드 클릭 → `selectAlt(id)` (디테일 패널 오픈, 맵도 flyTo)
  - emoji + 이름 + 태그 3개 + 인라인 별점
- **필터 토글** (체크박스 2개 inline)
  - **맛집만**: `isFoodPlace(place)` — rating 필드 또는 음식 키워드 태그 매칭 (라멘/스시/카츠/카페/이자카야/디저트 등 정규식)
  - **먼 후보도 보기**: 반경을 `ALT_PROXIMITY_KM` (2 km) → `ALT_FAR_KM` (8 km)으로 확장. 츠루하시 코리아타운 같이 멀지만 의도적으로 추가된 entry를 사이드바·맵 둘 다에 노출.
- 맵 마커와 사이드바 카드가 같은 필터 state를 공유 — 토글 한 번에 둘 다 갱신.

## How

- `state.filterFood` / `state.showFarCandidates` 두 boolean을 state 객체에 추가.
- `altCandidatesForDay(day, opts)`가 `opts.foodOnly` / `opts.far`를 받게 시그니처 확장. `renderDay`와 `renderSidebar` 양쪽에서 동일 옵션 객체로 호출.
- `renderSidebar`이 day stops `<ul>` 뒤에 `candidateSection` 블록을 emit. 카드 그리드는 `altCandidatesForDay` 결과를 `.sort()`로 rating desc.
- 토글 change 이벤트는 state 업데이트 후 `renderDay` + `renderSidebar` 둘 다 호출해 맵·사이드바 동기 갱신.

## Code locations

- `assets/app.js:137-172` (state 필드 + `ALT_PROXIMITY_KM`/`ALT_FAR_KM` + `FOOD_TAG_RE` + `isFoodPlace`)
- `assets/app.js:180-205` (`altCandidatesForDay` opts 파라미터)
- `assets/app.js:247-251` (renderDay가 state 옵션 전달)
- `assets/app.js:347-471` (`renderSidebar` 후보 섹션 + 토글 핸들러)
- 관련 commit: `b523602 feat(sidebar): candidates section under itinerary stops + filter toggles`

## Retrospective

### 잘된 점
- `altCandidatesForDay`에 opts 파라미터만 더하니 맵·사이드바 양쪽 호출자가 자연스럽게 토글 지원. 단일 source of truth.
- `isFoodPlace` 휴리스틱이 단순한데도 잘 동작 — rating 있는 entry는 거의 식당이라 양호한 신호. 음식 키워드 정규식이 backstop.
- 별점 내림차순 정렬 후 첫 카드가 가장 신뢰도 높은 곳 — Day1에선 야끼니쿠 M (Tabelog 3.78), Day2에선 야마모토 멘조 (3.92) 같은 식.

### 다음에 가져갈 것
- 필터 토글 state는 화면 새로고침 시 사라짐 — `localStorage` 저장해서 다시 와도 사용자 선호 유지하면 좋겠음.
- 사이드바 후보가 30개+ 되면 스크롤 길어짐 — 가상화 또는 "더 보기" 페이지네이션 도입 검토.
- 거리 표시 — 현재 활성 stop에서 몇 km 떨어졌는지 카드에 표시하면 "지금 위치에서 가까운 후보" 판별 빠름.

### 검증
- `node scripts/validate-data.mjs` → ✓ 131 places, 5 days validated
- `node --test tests/validate-data.test.mjs` → 11 pass
- browse smoke:
  - Day1 sidebar 후보 40개, 별점 내림차순 (Tabelog 3.78 → 3.71 → 3.71 → ...)
  - 첫 카드 클릭 → 디테일 패널 정상 오픈
  - 맛집만 토글: 40 → 21 (음식점만)
  - Day3 먼 후보 토글: 26 → 36, 츠루하시 코리아타운 노출 ✓
  - 맛집만 + 먼 후보 동시: 73개 candidates
  - console error 0

### 한계 (이연)

Phase C — Tabelog/Google **실제 별점 fetch (limitations #2, #3)**는 이 세션에서 시도했으나 Anthropic API 사용량 한도(`You've hit your limit · resets 2:30pm Asia/Seoul`)로 dispatch된 subagent 두 개가 즉시 종료. 한도 풀린 뒤 별도 세션에서 동일 prompt로 재실행 가능. 절차 메모:
1. 새 branch `feature/real-ratings`
2. 4 subagent (day1-4) dispatch — 각자 day 영역의 식당 entry들에 대해 WebSearch + WebFetch로 Tabelog/Google 페이지 가져와 별점·후기 수 추출 → `/tmp/rating-patches/dayN.json` patch JSON
3. 메인이 일괄 merge — alt entry rating 갱신 + main 명소 `restaurants[]` 안 식당 rating 채우기
4. UI 변경 없음 (Stage 9에서 이미 양쪽 경로 지원).

현재 별점 데이터는 subagent의 검색 추정치이며 fetch 시점·실제 페이지값과 차이가 있을 수 있음. UI에서 `(Tabelog)` 출처 표기는 그대로 유지 — 사용자가 클릭하면 review_links 또는 curated_links로 실제 페이지 확인 가능.
