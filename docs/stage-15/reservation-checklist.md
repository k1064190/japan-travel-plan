# Stage 15 — Reservation Checklist

## Why

Stage 14까지 정보 표시·큐레이션·맵·UI는 완성. 출발 전 실제 사용자 액션은 **예약** — USJ 입장권, 난카이 라피트, 오사카성·청수사·하루카스·가이유칸·도톤보리 리버크루즈 등은 사전 e-티켓이 가격·대기 모두 유리. 호텔은 이미 별도 예약 완료, 식당 웨이팅은 범위 밖. **paid 입장권·교통 12개 + transit 2개 = 14개**의 한국어 친화적 예약 URL을 데이터에 박고, 별도 "예약 체크리스트" 패널을 추가해 사용자가 진행 상태를 localStorage에 저장하며 추적한다.

## What

- 스키마: `place.booking` (optional object) + `transit_from_prev.booking_url` (optional https string).
  - `booking.required` (boolean), `booking.url` (https), `booking.advance_days`, `booking.ticket_price_jpy`, `booking.notes`.
- 12개 place에 `booking` 추가 — USJ, 오사카성, 하루카스300, 가이유칸, 톤보리 리버크루즈, 츠텐카쿠, 청수사, 뵤도인, 고다이지, 엔토쿠인, 기온코너, 후시미 사케 박물관.
- 2개 transit에 `booking_url` — Day1 sugata_hotel(KIX→난바 라피트), Day5 kansai_airport_dep(난바→KIX 라피트).
- `renderBooking(place, color)` — 디테일 패널 Activities와 Restaurants 사이에 "예약" 섹션 + 필수/선택 뱃지 + 가격 + 사전 권장일 + 노트.
- transit 카드에 `🎫 e-티켓 예약 →` 인라인 버튼.
- 새 패널 `#checklist` aside (데스크톱) + 모바일 3번째 탭 "🎫 예약" — 14개 카드를 미완료/필수/사전권장일 순으로 정렬, 완료 시 strikethrough + 회색.
- 진행 progress bar — "필수 N/M 완료".
- `localStorage["reservations"]` JSON 객체로 영속. setReservationDone(id, bool) 헬퍼.
- 데스크톱 progress-bar 우측에 `🎫 예약 X/Y` 토글 버튼.

## How

데이터 큐레이션을 subagent 4개 병렬로 처리:
- **Group 1** — USJ + 라피트 KIX↔난바 (KKday `/ko/product/2247`, `19691`).
- **Group 2** — 오사카 명소 5개 (KKday `34511`, `19513`, `4849`, `173350`, `174504`).
- **Group 3** — 교토 명소 6개 (KKday `250175`, `249783` + 공식 사이트).
- **Group 4** — verifier: 1-3 결과를 cross-check, gap-fill. 결과는 0 corrections, 14/14 통과.

각 subagent가 `/tmp/booking-patches/group{N}.json` 출력 → `/tmp/merge-bookings.mjs`가 일괄 머지. http→https 강제 변환 포함. Group 3에서 발견된 정정사항: 청수사 500엔 ✓, 뵤도인 700엔 (구가격 600엔 → 인상), 고다이지+엔토쿠인 통합권 1200엔 (구가격 900엔 → 인상). 모든 가격 plan과 부분 일치, 정정값 적용.

validator는 `validateBooking(label, b, errors)` 헬퍼 추가 — `validateCuratedLink` 패턴 그대로 follow. transit 검증 블록에 `booking_url` https check 추가.

체크리스트는 `collectReservationItems()`가 places + itinerary 양쪽에서 booking을 모은 뒤 정렬 — 미완료 > 완료, 필수 > 선택, 사전권장일 빠른 순. 14개 항목 중 필수 6개(USJ, 오사카성, 하루카스, 가이유칸, 뵤도인, 기온코너) + transit 2개(라피트 양방향) = **8개 필수**. 선택 6개는 정보 표시용.

## Code locations

| 파일 | 변경 |
| --- | --- |
| `scripts/validate-data.mjs:42-69` | `validateBooking` 헬퍼 추가 |
| `scripts/validate-data.mjs:163-165` | place.booking 검증 호출 |
| `scripts/validate-data.mjs:212-217` | transit booking_url https check |
| `tests/validate-data.test.mjs:107-156` | 4개 새 케이스 (15 pass) |
| `assets/app.js:125-150` | `renderBooking(place, color)` 헬퍼 |
| `assets/app.js:617-622` | transit 카드 inline e-티켓 버튼 |
| `assets/app.js:687-689` | 디테일 패널 booking 슬롯 (Activities 다음) |
| `assets/app.js:802-998` | mobile tabs 확장 + reservation 관련 함수들 (`loadReservations`, `setReservationDone`, `collectReservationItems`, `renderChecklistPanel`, `renderChecklistToggle`) |
| `assets/app.js:784` | `renderProgressBar`에서 `renderChecklistToggle` 호출 |
| `assets/styles.css:102-109` | `.checklist-card.checklist-done` strikethrough |
| `assets/styles.css:144-158` | 모바일 `#checklist.active-mobile` 절대배치 |
| `index.html:46-50` | `#checklist` aside |
| `index.html:67-73` | 3번째 모바일 탭 "🎫 예약" |
| `data/places.json` | 12 entries에 `booking` 추가 |
| `data/itinerary.json` | Day1[1] + Day5[1]에 `transit_from_prev.booking_url` |

## Retrospective

### 잘된 점

- 4-subagent 병렬 큐레이션 패턴(Stage 11/12와 동일) — 14개 항목을 ~16분만에 완성. Group 4 verifier가 KKday 봇 차단(403)을 우회해 검색 결과로 cross-check, 0 corrections로 마무리.
- 스키마는 옵셔널만 추가 → 169 places 모두 회귀 없이 통과.
- `validateBooking`이 `validateCuratedLink` 골격을 그대로 따라 11→15 케이스 확장이 매끄러움.
- 체크리스트가 별도 패널이라 기존 디테일/사이드바 흐름 무영향.

### 다음에 가져갈 것

- Group 3에서 plan의 사전가격(뵤도인 600엔, 고다이지 통합권 900엔)이 outdated로 확인 — 향후 데이터 작업 전에 가격 정합성 사전 검증 step을 plan에 박을 것.
- 라피트 KIX→난바 transit은 Day1 첫 stop이 아니라 "두 번째 stop의 transit_from_prev"에 들어가야 함 — merge 스크립트가 `stop.place_id === id` 단순 매칭으로 시작해 한 번 빈 매칭, 수동 patch로 마무리. 다음번엔 "arrival" vs "departure" 의미를 patch JSON에 명시할 것.
- 데스크톱에서 detail + checklist 두 패널이 동시 열리면 우측 약 800px 차지. 작은 모니터(<1366px)에서 답답할 수 있음. 향후 상호 배타 토글 추가 가능.

### 검증

- `node scripts/validate-data.mjs` → ✓ 169 places, 5 days
- `node --test tests/validate-data.test.mjs` → 15 pass (was 11, +4 new cases)
- `npm run verify-walk` → 변동 없이 통과
- merge 결과: 12 place.booking, 2 transit booking_url, 1 auto-fix (fushimi_sake http→https)
- 4-subagent group files: `/tmp/booking-patches/group{1..4}.json` 모두 valid JSON
