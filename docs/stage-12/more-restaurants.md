# Stage 12 — More Restaurants (with WebFetched Ratings)

## Why

Stage 9에서 36개 식당을 추가하고 Stage 11에서 실측 별점으로 교체했지만, 일정 area별로 좀 더 다양성과 깊이가 필요했다. 특히 사용자가 "더 많이 찾아서 정리해줘"라고 명시. 카테고리 분포 (한 동네 라멘 한두 곳, 야끼니쿠 한 곳 정도)에서 명점 추가로 후보가 풍부해지면 사이드바·맵에서 사용자 선택지가 넓어진다.

## What

- **38 new alt 식당 entries** (Day별 area + WebFetched Tabelog 별점/후기 수 한 번에)
  - Day1 (11): 신사이바시·도톤보리·난바 — 치토세, 메오토 젠자이, 하리주 스키야키, 혼케 오타코, 코가류, 호쿠쿄쿠세이 오므라이스, 리로 커피, 긴큐에몬 도톤보리, 쿠쿠루 본점 등
  - Day2 (12): 교토 — 이노다 커피, 스마트 커피, 잇포도 다실, 기온 츠지리, 멘바카 파이어라멘, 야오사다 정식, 타카야스 라멘, 곤타로 우동, 기온 오카루, 사료 츠지리, 기온 토쿠야 (와라비모찌, 100명점), 키타가와 한베에
  - Day3 (10→9 after dedupe): 오사카 — 그릴 본, 다루마 츠텐카쿠, 야마짱 아베노, 키지 우메다, 무기토멘스케 (라멘 백명점), 소라 츠루하시, 학운대, 메이게츠칸 야끼니쿠, 나카무라야 고로케 등
  - Day4 (6): USJ·시티워크·덴포잔 — 버바 검프, Top of Universal 32F 뷔페, 쿠쿠루 시티워크, 자유켄 텐포잔, 아이즈야 (원조 타코야키), 코토네 도미다시 라멘
- **별점·후기 모두 Tabelog WebFetch 실측** (추정치 없음)
- **dedupe**: Day1·Day3가 치토세 본점을 다른 id로 둘 다 추가 → Day1 entry 유지 (좌표·area 일치)
- 1건 http→https URL 자동 업그레이드 (aizuya tempozan)

places.json: 131 → **169** (1 entry removed after codex P2)

## How

새 branch `feature/more-restaurants`, 4 background subagent 병렬 dispatch (Day1-4 area별):

각 subagent 절차:
1. places.json read → 기존 170+ id Set으로 중복 회피
2. 추천 카테고리 (라멘·야끼니쿠·우동·디저트·카페·이자카야 등)에서 새 식당 8-12개 후보
3. 각 후보에 대해 WebSearch `店名 tabelog` → 정확한 URL 확보
4. WebFetch로 Tabelog 페이지 → 별점/후기 수 직접 추출
5. 좌표는 Tabelog/Google/Yahoo Maps에서 정확 확인
6. patch JSON에 저장

메인이 `/tmp/merge-more-restaurants.mjs` 한 번 실행해 places.json에 일괄 추가. id 충돌 0건.

검증:
- `npm run validate` → ✓ 169 places, 5 days validated
- `npm test` → 11 pass
- `npm run verify-walk` → 도보 segment all within tolerance
- browse smoke: Day1 사이드바 후보 54개 (rating-desc sort)

## Code locations

- `data/places.json` (38 새 alt 식당 entries; UI 코드 변경 0 — 기존 Stage 8/9/10/11 인프라 그대로 활용)
- 패치 입력: `/tmp/more-restaurants/day{1,2,3,4}.json`
- 머지 스크립트: `/tmp/merge-more-restaurants.mjs`
- 관련 commit: `76c8457 data: add 39 more restaurant alt-candidates (1 later removed) with WebFetched ratings`

## Retrospective

### 잘된 점
- 코드 변경 0 — Stage 8-11에서 만든 alt 마커·사이드바·정렬·필터·실측 별점 인프라 그대로 활용. 데이터 추가만으로 즉시 UI에 반영됨.
- WebFetch 결과로 정확한 별점·후기 수 한 번에 수집 — Stage 9→Stage 11처럼 두 번 라운드 안 돌고 한 단계로 완결.
- 각 day area별 카테고리 다양성 향상:
  - Day1: 타코야키 4개 (kogaryu/ganso_ajiho/honke_ootako/kukuru) — 한국 여행자 인기 4대장
  - Day2: 잇포도·이노다·스마트커피 같은 교토 노포 킷사텐 추가
  - Day3: 무기토멘스케 (Tabelog 라멘 백명점 3년 연속, 3.84/2325)·기지 우메다 같은 명점
  - Day4: 시티워크 4F·5F·32F + 텐포잔 안 다른 가게로 USJ 전후 옵션 확대
- Day1·Day3 subagent가 치토세 본점을 양쪽에서 발견했으나 dedupe로 깨끗하게 해결.

### 다음에 가져갈 것
- 동일 식당이 day별 area 경계에서 다른 id로 추가되는 케이스 (치토세). 다음 batch에는 patch JSON에 "alias_check" 필드로 비슷한 이름 미리 신고하게 하면 충돌 사전 탐지 가능.
- 별점 분포가 Tabelog 특성상 3.2–3.8 좁은 폭. 사용자가 더 변별력 있는 정렬을 원하면 review_count도 weighting (예: rating × log(review_count))을 옵션으로.
- 일부 가게가 폐점·이전한 경우가 있을 수 있음 — 정기 fetch 재실행으로 갱신 필요.

### 검증
- `node scripts/validate-data.mjs` → ✓ 169 places, 5 days validated
- `node --test tests/validate-data.test.mjs` → 11 pass
- browse smoke:
  - Day1 sidebar 54개 (이전 40 + 새 14: 12개 추가, 일부 area outside)
  - Day2 sidebar 87개 (이전 65 + 22)
  - Day3 sidebar 75개 (이전 26 + 49 — 먼 후보 토글 off에서도 많아짐)
  - Day4 sidebar 57개 (이전 26 + 31)
  - Day5 sidebar 42개
  - Day1 top 5 정렬: 야끼니쿠 M 3.78 → 치토세 3.72 → 이마이 3.58 → 메오토 젠자이 3.58 → 하리주 스키야키 3.57
  - console error 0
