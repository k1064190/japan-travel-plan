# 다음 세션에서 이어할 작업 (Resume Notes)

작성: 2026-05-18 21:50
브랜치: `feature/japan-travel-plan`
마지막 commit: `e78e81c docs: regenerate stage visuals (1-3) after stage 3 completion`

## 현재까지 완료

| Stage | 상태 | 주요 결과 |
| --- | --- | --- |
| **Spec + Plan** | ✅ | `docs/superpowers/specs/2026-05-18-japan-travel-plan-design.md`, `docs/superpowers/plans/2026-05-18-japan-travel-plan.md` |
| **Stage 1** | ✅ | 골격 + 라우팅 + sample 데이터 + per-task/stage 리뷰 |
| **Stage 2** | ✅ | 65 명소 + 5일 itinerary + validator (11 tests) |
| **Stage 3** | ✅ | 모바일 탭바 + 디테일 패널 폴리시 + day 색상 동기화 + safe-area-inset |

각 stage에 `docs/stage-N/<slug>.md` + `docs/stage-N/visual/index.html` 모두 동기화됨.

## 남은 작업 (Stage 4 — QA, Cross-Browser, README, PR)

`docs/superpowers/plans/2026-05-18-japan-travel-plan.md` 의 Stage 4 섹션 참고. 4개 task:

1. **Task 4.1: Smoke test checklist** — `scripts/smoke-test.md` 작성 + `connect-chrome` 또는 `browse` 스킬로 5일치 stop 전부 클릭 검증 (console 에러 없음 확인)
2. **Task 4.2: Cross-browser sanity check** — Chrome / Firefox / Chrome DevTools 모바일 emulation. iOS safe-area는 Stage 3에서 이미 처리됨, Firefox 마커 렌더링과 Tailwind CDN 로드 확인 위주
3. **Task 4.3: README.md** — 실행 방법 (`python3 -m http.server`), 데이터 수정 가이드 (`node scripts/validate-data.mjs`, `node --test tests/`), 디렉토리 구조 표
4. **Task 4.4: Stage 4 docs + final review + PR**
   - `docs/stage-4/qa.md` (5-section format)
   - Final code-reviewer-pro 리뷰 (전체 branch diff)
   - `git push -u origin feature/japan-travel-plan`
   - `gh pr create` (PR 본문은 plan의 Task 4.4 step 5 참고)
   - `codex-pr-review` 스킬로 PR 리뷰

## 실행 방식

지난 세션은 `superpowers:subagent-driven-development` 패턴으로 실행 — task당 implementer + spec reviewer + code-quality reviewer dispatch. Stage 단위로 `code-reviewer-pro` 종합 review까지. 같은 패턴으로 이어가면 됨.

## 알려진 미해결 / 의도적 이연

- Stage 3 review 모든 핵심 항목은 적용 완료 (`30dd43f`).
- USJ Finnegan's Bar & Grill 폐점 (2025-11-03) — Park Side Grille로 교체 완료.
- `kansai_airport` ↔ `kansai_airport_dep`, `namba_hotel` ↔ `namba_hotel_checkout` 좌표가 의도된 2m 오프셋 — 같은 시설이라 같은 위치, marker stacking 회피.
- `nippombashi`와 `denden_town`은 동일 거리지만 의도된 conceptual overlap (광역 vs 전자상가).

## 빠른 동작 확인

```bash
cd /home/cwh/projects/japan_travel_plan
node scripts/validate-data.mjs   # ✓ 65 places, 5 days validated
node --test tests/validate-data.test.mjs   # 11 pass
python3 -m http.server 8765 --bind 127.0.0.1   # http://127.0.0.1:8765/
```

## 루트의 source 파일

`May 18, 2026 04-52-52 PM Markdown Content.md` (49KB, untracked) — 원본 ChatGPT 대화 (오사카·교토 여행 루트 v3). 의도적으로 untracked 유지 — git history에 49KB 원본 텍스트를 넣을 필요는 없음. 필요하면 `git add` 한 줄로 추가.
