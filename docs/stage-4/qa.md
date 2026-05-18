# Stage 4 — QA, Cross-Browser, Final Polish

## Why

마지막 가드레일. (1) 21개 stop이 전부 클릭으로 열리는가, (2) URL 공유와 invalid hash가 graceful하게 처리되는가, (3) iOS 모바일 안전영역에 탭바가 가려지지 않는가, (4) 누가 보든 README로 실행이 되는가.

## What

- `scripts/smoke-test.md` — 21 stop 회귀 체크리스트 (Day별 place_id 표 + 라우팅·모바일·크로스브라우저 항목)
- `assets/app.js` — hash routing 정규화 + 디테일 패널 자동 close 로직 (smoke에서 발견된 두 이슈에 대한 fix) + `buildHash()` 헬퍼 (리뷰 피드백 반영 리팩토링)
- `assets/styles.css` — `#mobile-tabs` 에 `padding-bottom: env(safe-area-inset-bottom, 0)` + 높이 가산
- `README.md` — 실행 / 데이터 수정 / 검증 / 디렉토리 구조 가이드
- 최종 리뷰 트리오 통과 (code-reviewer-pro + gemini-subagent — codex는 MCP 도구 등록 에러로 fallback)

## How

`/home/cwh/.claude/skills/gstack/browse/dist/browse` (headless Chromium)로 `http://127.0.0.1:8770/` 에 접속해 21개 stop을 hash 변경으로 자동 순회. 각 stop의 디테일 헤더가 로드되는지 확인 → 21/21 모두 한국어 명소명이 정확히 표시됨.

추가 시나리오:
- `#day9/foo` (invalid) → 이전엔 URL이 `#day9/foo`로 유지되고 이전 day의 detail panel이 stale 상태로 남았음. fix: `boot()` + `hashchange` 양쪽에서 `history.replaceState` 로 URL을 정규화하고, place segment 없는 hash로 가면 detail을 hidden 처리.
- Same-day stop switch (`#day3/osaka_castle` → `#day3/kuromon_market`) → 디테일 헤더만 갱신, 정상.
- Mobile viewport (390×844) → 탭바 표시, safe-area inset 적용 (헤드리스에선 0px이지만 CSS rule 자체는 합당).

검증:
- `node scripts/validate-data.mjs` → ✓ 65 places, 5 days validated
- `node --test tests/validate-data.test.mjs` → 11 pass

## Code locations

- `scripts/smoke-test.md`
- `README.md`
- `assets/app.js:325-336` (`buildHash` 헬퍼)
- `assets/app.js:344-355` (`boot()` URL 정규화 + 옵셔널 체이닝)
- `assets/app.js:365-400` (`hashchange` handler — 정규화 + day-only hash시 detail close)
- `assets/styles.css:81-85` (`#mobile-tabs` safe-area-inset)
- `docs/stage-4/qa.md` (이 문서)

관련 commit:
- `42b3967 fix(routing): normalize invalid hash + close detail on day switch`
- `adfbce5 fix(mobile): safe-area-inset-bottom on #mobile-tabs ...`
- `522feda test(qa): manual smoke checklist for click-through verification`
- `8d2e1a8 docs: README with run/validate/test instructions`
- `d373c60 refactor(routing): extract buildHash() helper + optional chaining`

## Retrospective

### 잘된 점
- Headless 브라우저 스크립트로 21 stop을 빠르게 순회 — 수동 클릭쓰루 대비 시간 절약 + 매번 정확히 동일한 시퀀스 보장.
- Smoke test가 의도된 가드레일 역할을 함 — invalid hash와 day-switch detail close 두 이슈 모두 manual review로는 못 잡았을 라우팅 엣지케이스.
- 리뷰 트리오 피드백 합집합으로 정리 → 헬퍼 추출 + 옵셔널 체이닝으로 작은 리팩토링을 끝내 회귀 없이 안전성 보강.

### 다음에 가져갈 것
- `parseHash`가 invalid 입력에 대해 silent fallback 하기보다 caller가 정상화하도록 시그널을 주는 패턴(예: `valid: false`)이 더 명확할 수 있음 — 다음 비슷한 SPA에서 고려.
- Codex CLI가 MCP 도구 schema 충돌로 실패한 건 환경 문제(특정 MCP 서버의 tool spec). gemini와 code-reviewer-pro 둘이서도 동일한 핵심 finding을 잡았으므로 stage gate에는 영향 없었지만, codex 환경은 따로 점검 필요.
- Firefox 실기 테스트는 헤드리스에서 검증 불가 — 본 단계에서는 CSS/JS feature 호환성만 가정. 실제 사용 전 한 번 띄워 확인 권장.

### 리뷰 처리 요약

| Reviewer | Finding | 처리 |
| --- | --- | --- |
| code-reviewer-pro | Critical: 옵셔널 체이닝 없는 `find().stops[idx].place_id` | 적용 (`d373c60`) |
| gemini-subagent | MAJOR: brittle property access | 위와 동일하게 처리 |
| gemini-subagent | MINOR: boot()/hashchange 중복 로직 | `buildHash()` 추출로 해소 |
| gemini-subagent | MAJOR: 디테일 패널 visibility regression (same-day switch) | **Dismiss** — 코드 구조 오독. `else`는 `if (open)` 페어로 day 같은 케이스(`open=true`)에선 if 블록만 실행. 실제 same-day switch도 정상 동작 검증 완료. |
| codex-subagent | (MCP 도구 schema 에러로 본문 미생성) | 다음 환경 점검 항목 |
