# Stage 11 — Real Ratings (Tabelog WebFetch)

## Why

Stage 9에서 알트 식당과 일부 main 명소 맛집에 별점·후기 수를 박았지만 그 값은 subagent의 검색·추정치. UI에 `(Tabelog)`이라고 출처 표기를 했음에도 실제 Tabelog 페이지를 직접 본 게 아니었음. 사용자가 정렬해서 보는 순간 신뢰도가 떨어지는 약점. Stage 10에서 사이드바 정렬·필터까지 끝낸 상태라 별점의 정확성이 가장 큰 남은 일.

## What

- **데이터 갱신** — 4 background subagent가 WebSearch로 정확한 Tabelog URL 찾고 WebFetch로 페이지 내용 직접 fetch해 별점·후기 수 추출. 총 61 entries 실측 데이터로 교체:
  - 34 alt entries
  - 27 main 명소 `restaurants[]` 안 식당
- **omen_kodaiji 폐점 처리** — Tabelog 【閉店】 라벨 확인 → `name_ko`에 `[폐점]` 접두사 + tags 첫 번째에 "폐점" + rating/review_count/rating_source 필드 제거 (영업 중인 가게처럼 점수가 보이지 않게).
- **알려진 한계 해결 매핑**:
  - Stage 9 limitation #2 (main 명소 restaurants[] 별점) → 27 entry 실측으로 채움
  - Stage 9 limitation #3 (추정치 → 실측) → 61 entries 실측 교체

## How

- 새 branch `feature/real-ratings`, 4 background subagent 병렬 dispatch (Day1-4 area별)
- 각 subagent: places.json의 식당 entry 목록을 받아 → 정확한 Tabelog URL 검색 → WebFetch로 페이지 fetch → `Extract rating (3.xx) and review_count` prompt로 별점/후기 수만 추출
- 실패 entry는 `failed[]` 배열에 기록 + Tabelog URL이 잘못된 경우 patch JSON의 `note` 필드에 정확한 URL 기록
- 메인이 `/tmp/merge-ratings.mjs` 한 번 실행해 places.json에 일괄 적용 — alt는 `rating` 필드 갱신, main 명소 restaurants[]는 name으로 매칭해서 객체에 rating 필드 추가

검증:
- `validate-data.mjs` 통과 — rating field schema (number 0-5, integer review_count, non-empty source) 검증 그대로 적용
- `verify-walk-times.mjs` 통과
- browse smoke로 사이드바에 새 별점 표시 + omen_kodaiji [폐점] 라벨 확인

## Code locations

- `data/places.json` (61 rating updates + omen_kodaiji 폐점 처리)
- 패치 입력: `/tmp/rating-patches/day{1,2,3,4}.json` (subagent 산출, repo에 commit 안 됨)
- 머지 스크립트: `/tmp/merge-ratings.mjs` (이번 한 번 실행)
- 관련 commit: `194f644 data: replace estimated ratings with WebFetch'd Tabelog actuals`

## Retrospective

### 잘된 점
- 4 subagent 병렬 dispatch로 ~13 분 wall-clock에 110+ entry 식당의 별점 fetch 완료. WebFetch 자체는 Tabelog 페이지당 ~2-4초.
- 추정치와 실측의 차이가 의미 있는 entry 다수 발견:
  - `katsukura_shijo` 3.55 → 3.21 (큰 폭)
  - `kamukura_dotonbori` 3.52 → 3.20
  - `mizuno_okonomiyaki` 3.71 → 3.57
  - `yamamoto_menzo` 3.92 → 3.98 (반대로 실측이 더 높음)
  - `daiichi_asahi` 후기 3,200 → 6,583
- Tabelog `閉店` 라벨까지 검출 — `omen_kodaiji` 폐점 처리는 큐레이션 추정치만으로는 못 잡았을 finding.
- 4 subagent 모두 places.json 직접 수정 안 하고 patch JSON으로 분리 → merge 충돌 없이 단일 라이터.

### 다음에 가져갈 것
- 19 entries fetch 실패 — 대부분 (1) 백화점 식품관·dining complex (단일 Tabelog entity 없음), (2) 시장 노점 (개별 Tabelog 페이지 없음), (3) 특정 지점이 Tabelog 미등록. 이건 데이터 구조 한계가 아니라 Tabelog 커버리지 한계. 해당 entry는 추정치도 의미 없으므로 별점 미설정 그대로.
- subagent들이 Tabelog URL이 잘못 가리키는 케이스 다수 발견 (지오 코드만 같은 다른 가게로 매핑). 정확한 URL은 patch JSON의 `note` 필드에 기록됐지만 `data/places.json`의 `sources[]`·`curated_links[]`에는 아직 반영 안 됨. 별도 cleanup 작업.
- 별점은 fetch 시점(2026-05-19) 기준이라 한 달 후엔 변동. 정기 재실행이 필요. cron으로 자동화 가능 (그러나 Anthropic API 한도 고려 필요).
- USJ 내부 5개 식당이 의외로 모두 Tabelog 페이지 존재 — main의 큰 dining complex (오사카죠 미라이자, 조 테라스 등)는 entity 아님이라 fetch 불가. 이 경계는 데이터로 표현하기 모호 — 사용자에게 "이 카테고리는 별점 의미 없음" 시각 표시 (예: tags에 "dining complex") 도입 검토.

### 검증
- `node scripts/validate-data.mjs` → ✓ 131 places, 5 days validated
- `node --test tests/validate-data.test.mjs` → 11 pass
- `node scripts/verify-walk-times.mjs` → 도보 segment all within tolerance
- browse smoke:
  - Day1 사이드바 top 5 카드 별점 변경 확인 (Tabelog 실측값)
  - Day2 야마모토 멘조 ★ 3.98 (실측 ↑)
  - osaka_castle 디테일 패널 — main restaurants[] 별점은 다 dining complex라 미설정 그대로 (fetch 실패)
  - console error 0

### 한계
- Tabelog 별점은 `fetched_at` 시점값. 한 달 이상 지나면 약간 변동. 재실행으로 갱신 가능.
- 일부 한국 사용자가 보기엔 Tabelog 점수 체계 (3.0-4.0 분포)가 낮아 보일 수 있음 — `(Tabelog)` 출처 표기로 맥락 제공.
- 사용 패턴이 한국어 후기 위주라면 Naver Place 또는 Google Maps 한국어 후기 점수도 별도로 표시하는 향후 작업이 가치 있음.
