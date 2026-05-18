# Stage 5 — Curated Korean Blog Links

## Why

기존 "한국어 후기 검색"은 네이버·구글·유튜브 검색창 진입 링크 3개에 불과해 현장에서 매번 직접 검색·정렬·평가하는 시간이 들었다. 이미 신뢰할 만한 한국어 후기/가이드 글이 인터넷에 충분하니, 각 명소·맛집·활동에 대해 사전에 큐레이션된 블로그 포스트를 데이터에 박아두면 클릭 한 번에 본문으로 진입할 수 있다.

## What

- **데이터 스키마 확장** (`data/places.json` + `scripts/validate-data.mjs`)
  - 명소 레벨 `curated_links: [{title, url, source, snippet?}, ...]`
  - 맛집 객체 `link: {title, url, source}`
  - 활동 항목 `string | {text, link?}` 양쪽 허용 (역호환)
  - 모든 URL `https://` 강제 + title/source 비어있지 않도록 validator 추가
- **UI 렌더링** (`assets/app.js`) — `renderActivity` / `renderRestaurant` / `renderCuratedLink` 헬퍼 3개
  - 큐레이션된 블로그 카드 그리드 (제목 + 출처 + 1줄 스니펫)
  - 활동 줄 끝 `후기 →` inline 링크
  - 맛집 카드 하단 `한국어 후기 보기 →` 링크
  - 기존 네이버/구글/유튜브 검색 그리드는 폴백 (`더 찾아보기`)으로 격하
- **데이터 채우기** (65 places 전체)
  - 65/65 명소: 3개씩 `curated_links` (총 **195개** 큐레이션 링크)
  - 40/41 메인 맛집: 1개씩 `link` (1개는 적합 한국어 후기 없어 plain)
  - 48/172 활동: main 명소의 활동은 wrap, alt는 plain string으로 둠

## How

Phase 단위로 진행:
- **Phase A** — 스키마 + UI + Day1 main 3개 (kansai_airport, namba_hotel, dotonbori). 패턴 검증.
- **Phase B** — 나머지 62개 명소. Day별·분류별로 7개 background subagent를 병렬 dispatch:
  - Day2 main (5), Day3 main (6), Day4-5 main (3), Day1 alt (9), Day2 alt (16), Day3 alt (20), Day4 alt (3)
  - 각 subagent: `WebSearch`로 한국어 블로그 검색 → 신뢰 가능한 글 큐레이션 → `/tmp/curated-patches/<name>.json` 저장
  - 메인은 `/tmp/merge-patches.mjs`로 7개 patch JSON을 `data/places.json`에 일괄 merge
  - 중간에 충돌 없음 (subagent는 read-only, merge만 단일 라이터)

큐레이션 우선순위:
1. 한국 1차 블로그 (`blog.naver.com`, `brunch.co.kr`, `*.tistory.com`)
2. 한국 여행 플랫폼 커뮤니티/모먼트 (`myrealtrip.com`, `kr.trip.com`, `tripstore.kr`)
3. 한국 KKday/Klook 블로그
4. 한국어 공식 가이드/매거진 (`osaka-info.kr`, `LIVE JAPAN KR`, `MATCHA KR`) — 개인 블로그 부족한 niche에만

활동 큐레이션은 main 명소에만 적용. alt 명소의 활동은 "둘러보기" "사진 찍기" 등 generic이라 명소 link로 커버.

## Code locations

- `scripts/validate-data.mjs:20-39` (`validateCuratedLink` 헬퍼)
- `scripts/validate-data.mjs:84-115` (curated_links / activities / restaurants 옵셔널 검증)
- `assets/app.js:28-66` (`renderActivity`, `renderRestaurant`, `renderCuratedLink` 헬퍼)
- `assets/app.js:222-265` (`renderDetail` 큐레이션 섹션 + 폴백 검색 그리드)
- `data/places.json` (65 명소 전체 `curated_links` 추가)
- `docs/stage-5/curated-content.md` (이 문서)

관련 commit:
- `e8c0d62 feat(schema): validator support for curated links + activity objects`
- `4b9260c feat(detail): render curated blog links + per-restaurant + per-activity links`
- `e562fe4 data(day1-main): curated Korean blog links for kansai_airport, namba_hotel, dotonbori`
- `3ff8616 data: curated Korean blog links for remaining 62 places (Day2-5 + alts)`

## Retrospective

### 잘된 점
- 7개 background subagent 병렬 dispatch로 62 명소 큐레이션이 ~6분 wall-clock에 끝남. 단일 sequential이면 1시간+.
- patch JSON 분리 + merge 스크립트 패턴 — subagent는 read-only, 메인만 places.json 라이터. 충돌·partial-write 없이 안전.
- 스키마 옵셔널화 (`curated_links`, `restaurants[].link`, activity object)로 Day1 main 3개 → 65개 확장 도중 기존 데이터/UI 회귀 0.
- `더 찾아보기` 폴백 그리드 보존 — 큐레이션이 부족하다고 느낄 때도 즉시 더 검색 가능.

### 다음에 가져갈 것
- subagent가 가끔 `japan-travel-note.com` 등 출처가 모호한 사이트나 가이드 페이지를 fallback으로 선택. 한국 1차 블로그 비중을 더 높이려면 큐레이션 prompt에 "프로모션 가이드성 글보다 개인 후기 우선" 같은 규칙을 더 강하게 박아도 좋겠음.
- alt 명소의 활동도 link를 채우려면 별도 phase가 필요. 현재는 생략 (alt activities 124개는 plain string). 사용자가 alt 깊게 보지 않을 가능성 고려한 trade-off.
- 데이터 양이 commit 1건에 +1925 lines — 데이터 변경은 자동 큐레이션 결과여서 검토 부담이 큼. 다음에 데이터 큰 변경 있을 땐 review 트리오에 출처 도메인 분포 + 의심 URL 샘플링을 정리해서 줘야 함.

### 검증
- `node scripts/validate-data.mjs` → ✓ 65 places, 5 days validated
- `node --test tests/validate-data.test.mjs` → 11 pass
- `browse` 스크립트로 main 6 spot 샘플 검증: console error 0, curated 3개 + activity/restaurant 링크 정상 렌더링
- alt 4 spot 데이터 직접 확인: curated 3개 각각 정상

### 알려진 미해결
- `osaka_castle`의 "공원 내 야채 레스토랑" 맛집 1개는 한국어 후기 부재로 link 없이 plain object 유지 (40/41).
- `sannenzaka_ninenzaka`의 인력거 활동 1개는 plain string 유지 (한국어 전용 후기 부재).
- alt 활동 124개는 의도적으로 plain string.
