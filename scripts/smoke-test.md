# Smoke Test Checklist

`assets/app.js` 또는 `data/*.json`을 수정한 뒤 회귀 점검용. 콘솔 에러가 0건이어야 통과.

## 준비

```bash
python3 -m http.server 8770 --bind 127.0.0.1
# http://127.0.0.1:8770/ 접속 (Chrome + DevTools Console 열어둘 것)
```

데이터 기준: `data/itinerary.json` — 5일 × 21 stop (Day1 3, Day2 6, Day3 7, Day4 3, Day5 2). `data/places.json` — 65 명소.

## 클릭쓰루 (21 stop)

각 Day 탭을 누르고 sidebar의 모든 stop 카드를 클릭. 각 클릭마다:

- map 마커가 해당 좌표로 이동/줌
- 디테일 패널이 열리고 헤더에 명소 한국어 이름이 표시
- URL hash가 `#dayN/<place_id>` 형태로 갱신
- 콘솔 에러 0건 (Tailwind CDN production 경고는 무시 OK)

| Day | Stop count | 주요 place_id (순서대로) |
| --- | --- | --- |
| day1 | 3 | kansai_airport, namba_hotel, dotonbori |
| day2 | 6 | fushimi_inari, kiyomizu_dera, sannenzaka_ninenzaka, gion_yasaka, nishiki_kawaramachi, namba_hotel |
| day3 | 7 | osaka_castle, kuromon_market, denden_town, umeda_sky, shinsekai_tsutenkaku, abeno_harukas, dotonbori |
| day4 | 3 | usj, universal_citywalk, namba_hotel |
| day5 | 2 | namba_hotel_checkout, kansai_airport_dep |

map 마커도 동일하게 클릭해 동일 디테일 패널이 열리는지 확인.

## 라우팅/공유

- [ ] `http://127.0.0.1:8770/#day3/osaka_castle` 새 탭으로 열기 → 오사카성 디테일이 즉시 표시됨
- [ ] `http://127.0.0.1:8770/#day9/foo` (invalid) → day1으로 fallback + URL `#day1`로 normalize + 디테일 패널 닫힌 상태
- [ ] 디테일 패널 × 클릭 → 패널 닫히고 hash가 `#dayN`으로 정리됨
- [ ] 다른 Day 탭 클릭 → 이전 Day의 디테일이 남지 않고 깨끗하게 닫힘
- [ ] 페이지 새로고침 → 직전 URL 상태 복원

## 모바일 (Chrome DevTools 디바이스 에뮬레이션)

- [ ] iPhone 12 Pro (390×844) — 하단 탭바 (지도/리스트) 표시, 탭 토글 동작
- [ ] iPhone 12 Pro — 안전영역 inset(env(safe-area-inset-bottom)) 적용으로 홈 인디케이터에 가리지 않음
- [ ] Pixel 7 (412×915) — 탭 타깃 ≥ 44×44px, 가로 스크롤 없음
- [ ] 디테일 패널이 모바일에서 화면 전체 모달로 뜨고 닫기 버튼 위치 정상

## 크로스 브라우저

- [ ] Chrome desktop — primary, 모든 위 항목 통과
- [ ] Firefox desktop — Leaflet 마커 렌더링, Tailwind CDN 로드, `gap-*` 유틸리티 정상
- [ ] (Safari/iOS는 실기 또는 시뮬레이터에서만)

## 검증 명령

```bash
node scripts/validate-data.mjs       # ✓ 65 places, 5 days validated
node --test tests/validate-data.test.mjs   # 11 pass
```

## 최근 실행

- 2026-05-18 — Doctor Cho / Claude Code Stage 4 QA. 21 stop 전부 통과, console 에러 0, invalid hash + day switch detail close 정상. (관련 commit 참조)
