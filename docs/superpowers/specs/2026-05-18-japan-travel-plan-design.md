# 일본 여행 플랜 인터랙티브 웹사이트 — 설계 문서

날짜: 2026-05-18
저자: Claude Code (브레인스토밍 by Doctor Cho)
여행 일정: 2026-05-22(금) ~ 2026-05-26(화), 오사카·교토 4박 5일

## 1. 목적

ChatGPT가 만든 오사카·교토 여행 루트를 인터랙티브 웹사이트로 변환한다. 사용자(Doctor Cho)가 데스크톱에서 일정을 수립하고, 현장에서 모바일로 지도를 보면서 시간대순으로 명소를 따라갈 수 있도록 한다. 각 명소에 대한 상세 설명, 출처, 추천 활동, 맛집 정보를 한 화면에서 본다.

## 2. 사용자 요구사항 (확정)

- **레이아웃**: C안 융합형 (데스크톱은 사이드바+큰 맵, 모바일은 탭 토글)
- **맵 엔진**: Leaflet + OpenStreetMap (무료, API 키 불필요)
- **사용 환경**: 데스크톱 + 모바일 양쪽 모두
- **명소 범위**: 메인 명소 15개 + 대체지 약 45개 = 약 60개 전체 조사
- **사진**: placeholder(이모지·색상 그라데이션) — 외부 이미지 링크 없음
- **데이터 분리**: 단일 HTML + JSON 분리 구조

## 3. 시스템 구조

### 3.1 파일 구조

```
japan_travel_plan/
├── index.html                    # 메인 페이지 (Leaflet + Tailwind CDN)
├── assets/
│   ├── app.js                    # 앱 로직
│   └── styles.css                # 커스텀 CSS (Tailwind로 부족한 부분)
├── data/
│   ├── itinerary.json            # 일정 (day별 시간순 명소 ID + 이동수단/시간)
│   └── places.json               # 60개 명소 상세 정보
├── docs/
│   ├── superpowers/specs/        # 이 설계 문서
│   └── stage-N/<slug>.md         # 단계별 진행 기록 (CLAUDE.md 규칙)
└── README.md                     # 사용법 (옵션)
```

### 3.2 핵심 컴포넌트

| 컴포넌트 | 역할 |
| --- | --- |
| **상단 헤더** | 여행 제목, Day1~5 progress bar (현재 선택된 day 강조) |
| **사이드바 (좌측, 데스크톱)** | Day 탭 + 시간순 타임라인 카드. 카드 클릭 → 지도 fly-to + 디테일 패널 |
| **지도 패널 (메인)** | Leaflet 지도, day별 색상의 번호 마커, polyline 동선, 활성 핀 강조 |
| **디테일 패널 (우측 슬라이드)** | 명소 사진(placeholder), 설명, 출처, 추천 활동, 맛집 카드, 후기 검색 링크 |
| **모바일 네비** | 하단 탭바 (지도 / 일정 / 디테일) 토글 |

### 3.3 데이터 스키마

**itinerary.json**
```json
{
  "days": [
    {
      "id": "day1",
      "date": "2026-05-22",
      "weekday": "금",
      "title": "도착 + 난바 적응 + 야경",
      "color": "#e11d48",
      "stops": [
        {
          "place_id": "kansai_airport",
          "time": "16:00",
          "transit_from_prev": null,
          "duration_minutes": 30
        },
        {
          "place_id": "namba_hotel",
          "time": "17:00",
          "transit_from_prev": {
            "mode": "난카이 라피트",
            "from": "간사이공항",
            "to": "난바",
            "minutes": 34,
            "cost_jpy": 1490,
            "note": "특급권+승차권. 공항급행은 약 45분 970엔"
          },
          "duration_minutes": 30
        }
      ]
    }
  ]
}
```

**places.json**
```json
{
  "dotonbori": {
    "name_ko": "도톤보리",
    "name_jp": "道頓堀",
    "coords": [34.6687, 135.5012],
    "category": "main",          // main | alt
    "tags": ["야경", "맛집거리", "쇼핑"],
    "summary": "오사카 미나미의 대표 번화가. 글리코상 네온, 도톤보리 강을 따라 늘어선 식당과 가게들.",
    "detail": "약 600m 길이의 강변 거리. 1612년 운하 개통 이후 극장가로 발달했고, 지금은 오사카 야식과 쇼핑의 중심. 한국인이 가장 많이 찍는 사진 스팟이 글리코상 앞 다이코쿠바시 다리.",
    "sources": [
      {"title": "오사카관광공사 도톤보리", "url": "https://osaka-info.jp/..."}
    ],
    "activities": [
      "글리코상 인증샷 (다이코쿠바시)",
      "도톤보리 강 유람선 (Tonbori River Cruise, 20분, 1500엔)",
      "에비스바시 위에서 야경 보기"
    ],
    "restaurants": [
      {
        "name": "金龍ラーメン (긴류 라멘)",
        "type": "돈코츠 라멘",
        "tip": "24시간 영업, 김치/부추 셀프 토핑",
        "price_range": "~1000엔"
      }
    ],
    "review_links": {
      "naver": "https://search.naver.com/search.naver?where=blog&query=오사카+도톤보리+후기",
      "google": "https://www.google.com/search?q=도톤보리+후기+한국어&hl=ko",
      "youtube": "https://www.youtube.com/results?search_query=오사카+도톤보리+한국인+후기"
    }
  }
}
```

### 3.4 데이터 플로우

1. **페이지 로드** → `itinerary.json`, `places.json` 동시 fetch
2. **첫 화면**: Day1 자동 선택, 지도가 Day1 모든 핀이 보이도록 자동 fit-bounds
3. **사이드바 카드 클릭** → URL hash 업데이트 (`#day1/dotonbori`) → 지도 fly-to(coords) → 디테일 패널 열림 + place 데이터 렌더
4. **지도 마커 클릭** → 사이드바 해당 카드로 스크롤 + 같은 디테일 패널 열림
5. **Day 탭 전환** → 지도 마커 전부 새로 그리기 + bounds fit + 사이드바 리스트 교체

### 3.5 라우팅

- `#day1` → Day1 첫 명소 표시
- `#day1/dotonbori` → Day1 + 도톤보리 디테일 패널 열림
- 새로고침해도 상태 유지

## 4. 시각 디자인

### 4.1 색상 (Day별)

| Day | 날짜 | 색상 (Tailwind) | hex |
| --- | --- | --- | --- |
| Day1 | 5/22 금 | rose-600 | #e11d48 |
| Day2 | 5/23 토 (교토) | violet-600 | #7c3aed |
| Day3 | 5/24 일 (오사카 도심) | sky-600 | #0284c7 |
| Day4 | 5/25 월 (USJ) | emerald-600 | #059669 |
| Day5 | 5/26 화 (출발) | slate-500 | #64748b |

### 4.2 명소 placeholder

이미지 대신 카테고리별 이모지 + day 색상 그라데이션 배경:
- 음식·시장: 🍜 🦑
- 사찰·신사: ⛩️
- 성·궁전: 🏯
- 전망대: 🗼
- 쇼핑: 🛍️
- 테마파크: 🎢
- 교통허브: ✈️ 🚆
- 자연·공원: 🌸 🦌

### 4.3 타이포그래피

- 한글 우선: Pretendard (CDN), fallback `system-ui`
- 본문 14-16px, 카드 제목 18-20px, 상단 헤더 24-28px

## 5. 기술 스택

| 영역 | 선택 | 이유 |
| --- | --- | --- |
| 맵 | Leaflet 1.9.x (CDN) | 무료, 키 불필요, 가벼움 |
| 타일 | OSM standard tile + Stadia 옵션 | 무료 사용 가능 |
| 마커 클러스터 | leaflet.markercluster (선택) | 60개 핀이 겹칠 때만 필요 |
| CSS | Tailwind CDN (play CDN) | 빠른 프로토타입, 빌드 단계 없음 |
| 폰트 | Pretendard | 한글 가독성 |
| JS | Vanilla ES6 | 프레임워크 불필요한 규모 |
| 라우팅 | Hash router (직접 구현) | 라이브러리 불필요 |

## 6. 명소 조사 전략

60개 명소를 효율적으로 조사하기 위해:

1. **Day별로 Explore subagent 5개 병렬 실행** (Day1~5)
2. 각 subagent는 해당 day의 메인+대체지를 WebSearch로 조사
3. 각 명소당 수집할 정보:
   - 좌표 (위/경도) — OSM/Google maps 검색
   - 1-2줄 요약 + 한 문단 상세 설명
   - 출처 1-2개 (공식 관광 사이트, 위키 등)
   - 추천 활동 2-3개
   - **메인 명소만**: 추천 맛집 3-5개 (이름, 종류, 가격대, 팁)
   - 한국어 후기 검색 링크 (네이버/구글/유튜브)
4. 결과를 `places.json`으로 통합

## 7. 단계별 구현 계획 (writing-plans 스킬에서 상세화)

대략적 단계:

- **Stage 1**: 프로젝트 골격 + 라우팅 + sample 데이터(5개 명소)로 끝-끝 동작 검증 (지도 핀, 사이드바 카드, 디테일 패널, hash URL 모두 동작)
- **Stage 2**: 60개 명소 데이터 조사 + `places.json` / `itinerary.json` 완성 (Day별 병렬 Explore subagent)
- **Stage 3**: 모바일 반응형 (탭바, 풀스크린 디테일 모달, 한 손 조작), 디테일 패널 디자인 폴리싱
- **Stage 4**: QA — 모든 명소 클릭 검증, URL 공유 테스트, Chrome/Firefox/Safari/Android 체크, 최종 리뷰

각 단계 끝에:
- `docs/stage-N/<slug>.md` 작성
- code-reviewer + gemini-subagent + codex-subagent 리뷰 루프 (CLAUDE.md 규칙)
- `stage-docs-visualizer` 스킬로 시각화

## 8. 비-목표 (YAGNI)

다음은 일부러 제외:
- 백엔드/DB — 정적 파일로 충분
- 사용자 계정/로그인 — 1인용
- 실시간 교통정보 API — 정적 권장 시간만 표시
- 다국어 UI — 한국어만
- 빌드 시스템 (Webpack/Vite) — 단순 CDN
- 외부 이미지 — 사용자 결정대로 placeholder만
- 오프라인 PWA — 모바일에서도 인터넷 사용 가정

## 9. 위험과 완화

| 위험 | 완화 |
| --- | --- |
| 60개 명소 조사가 너무 오래 걸림 | Day별 병렬 subagent로 분산, 대체지는 간단 요약만 |
| OSM 타일 서버 사용량 정책 | 개인 사용 수준이므로 OK, 필요 시 Stadia 무료 티어로 전환 |
| Leaflet과 Tailwind CDN 충돌 | Leaflet CSS를 head에서 먼저 로드 |
| 좌표 부정확 | OSM Nominatim API로 1차 검색 후 사람이 검증 |
| 일본어 명소 검색 정확도 | name_jp 필드로 일본어 이름 같이 저장, 영문/일문 키워드도 후기 링크에 포함 |

## 10. 성공 기준

- [ ] 데스크톱(Chrome/Firefox) + 모바일(Safari iOS, Chrome Android)에서 동작
- [ ] Day1~5 모든 명소가 지도에 표시됨
- [ ] 명소 클릭 시 지도 이동 + 디테일 표시가 200ms 이내
- [ ] 각 메인 명소에 맛집 3개 이상, 출처 1개 이상
- [ ] URL 공유 시 같은 상태 복원
- [ ] 모바일에서 한 손으로 조작 가능 (탭바, 큰 터치 영역)
