# 오사카·교토 여행 2026.05.22–26

Doctor Cho의 4박 5일 인터랙티브 여행 플랜.

- 데스크톱: 좌측 day별 사이드바 + 큰 Leaflet 지도 + 우측 디테일 패널 (C안 융합형)
- 모바일: 하단 탭바로 지도/리스트 토글, 디테일은 전체 화면 모달
- 단일 HTML + ES6 vanilla JS + JSON 데이터 분리
- Hash 라우팅: `#day3/osaka_castle` 같은 URL로 공유 가능

## 사용 방법

`fetch()`가 `file://`에서 막히므로 로컬 HTTP 서버가 필요합니다.

```bash
python3 -m http.server 8770 --bind 127.0.0.1
# http://127.0.0.1:8770/ 접속
```

또는 정적 호스팅: `index.html`, `assets/`, `data/` 만 정적 서버에 올리면 동작.

## 데이터 수정

- `data/itinerary.json` — Day별 stop 순서, 시간, 교통편
- `data/places.json` — 65개 명소 (좌표·설명·맛집·후기 검색 링크)

수정 후 반드시 검증:

```bash
node scripts/validate-data.mjs       # 스키마/좌표/참조/URL 안전성 65 places, 5 days
node --test tests/validate-data.test.mjs   # 11 유닛 테스트
```

UI 회귀 확인: `scripts/smoke-test.md` 체크리스트.

## 디렉토리 구조

| Path | 역할 |
| --- | --- |
| `index.html` | 페이지 셸 (Tailwind CDN + Leaflet CDN) |
| `assets/app.js` | 전체 컨트롤러 (vanilla ES6: render/route/state) |
| `assets/styles.css` | day 색상 변수, 모바일 반응형, 안전영역 inset |
| `data/itinerary.json` | 5일 × 21 stop 일정 + transit 정보 |
| `data/places.json` | 65개 명소 (메인 + 대체) |
| `scripts/validate-data.mjs` | 데이터 검증 스크립트 |
| `scripts/smoke-test.md` | 수동 QA 체크리스트 |
| `tests/` | 검증 스크립트 유닛 테스트 |
| `docs/stage-N/` | 단계별 진행 기록 + 시각화 HTML |
| `docs/superpowers/specs/` | 설계 문서 |
| `docs/superpowers/plans/` | 구현 계획 |
