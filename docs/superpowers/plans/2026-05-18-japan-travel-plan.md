# Japan Travel Plan Interactive Site — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a single-page interactive website that lets Doctor Cho follow a 4-night Osaka/Kyoto itinerary (2026-05-22 ~ 2026-05-26) on desktop and mobile, with a Leaflet map, day-by-day timeline, and detail panels showing place descriptions, recommended activities, restaurants, sources, and Korean review search links — all for ~60 places (15 main + ~45 alternates).

**Architecture:** Static site (no backend). `index.html` loads Leaflet + Tailwind via CDN. Two JSON files — `data/itinerary.json` (day-by-day stop order with transit info) and `data/places.json` (60-place catalog) — drive the UI. Vanilla ES6 modules in `assets/app.js` handle data fetch, map rendering, sidebar, detail panel, and hash routing. Day-color coding (rose/violet/sky/emerald/slate) ties markers, cards, and progress bar together. Desktop = sidebar + big map + slide-in detail; mobile = bottom tab bar toggle.

**Tech Stack:** Leaflet 1.9 (CDN), Tailwind Play CDN, Pretendard font (CDN), Vanilla ES6 (no bundler), Node 20+ for offline JSON validator scripts only.

**Reference spec:** `docs/superpowers/specs/2026-05-18-japan-travel-plan-design.md`

---

## File Structure

| File | Responsibility |
| --- | --- |
| `index.html` | Page shell, CDN imports, root containers (`#map`, `#sidebar`, `#detail`, `#mobile-tabs`, `#progress-bar`) |
| `assets/app.js` | Bootstrap, data loader, controller for map/sidebar/detail/router |
| `assets/styles.css` | Day-color CSS variables, custom marker styles, mobile media queries Tailwind cannot express |
| `data/itinerary.json` | Day-by-day stop order with `place_id`, time, transit info, duration |
| `data/places.json` | 60-place catalog keyed by `place_id` |
| `scripts/validate-data.mjs` | Node script that validates JSON schema + cross-refs |
| `tests/validate-data.test.mjs` | Tests for the validator |
| `docs/stage-N/<slug>.md` | Per-stage progress log (CLAUDE.md requirement) |
| `README.md` | "Double-click `index.html` to open" + dev notes |

**Decomposition rationale:**
- `app.js` is split internally into modules (`mapView`, `sidebar`, `detail`, `router`, `data`) via ES6 imports so each concern is in its own file under `assets/` if it grows.
- Data files are separate from UI so future trip plans can be swapped without touching code.
- Validator lives under `scripts/` to keep it out of the runtime bundle.

---

## Stage 1 — Project Skeleton + Routing + End-to-End Verification

**Outcome:** Single HTML page loads, displays a Leaflet map of Osaka, shows 5 sample places as numbered markers, sidebar lists them in time order, clicking a card opens a detail panel and updates URL hash. Refreshing the page restores state. No real data yet — just enough scaffolding to prove the wiring works.

### Task 1.1: Initialize project skeleton

**Files:**
- Create: `index.html`
- Create: `assets/styles.css`
- Create: `assets/app.js`
- Create: `data/.gitkeep`
- Create: `scripts/.gitkeep`
- Create: `tests/.gitkeep`
- Create: `.gitignore`

- [ ] **Step 1: Create `.gitignore`**

```
node_modules/
.DS_Store
*.log
.vscode/
.idea/
```

- [ ] **Step 2: Create directory placeholders**

```bash
mkdir -p assets data scripts tests
touch data/.gitkeep scripts/.gitkeep tests/.gitkeep
```

- [ ] **Step 3: Create minimal `index.html`**

```html
<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>오사카·교토 여행 2026.05.22-26</title>

  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"
        integrity="sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=" crossorigin="">
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"
          integrity="sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=" crossorigin=""></script>

  <script src="https://cdn.tailwindcss.com"></script>
  <link rel="stylesheet" as="style" crossorigin
        href="https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/static/pretendard.min.css" />

  <link rel="stylesheet" href="assets/styles.css">
</head>
<body class="h-screen w-screen overflow-hidden bg-slate-50 font-[Pretendard,system-ui,sans-serif]">

  <header id="progress-bar" class="h-14 border-b bg-white flex items-center px-4 gap-2"></header>

  <main class="flex h-[calc(100vh-3.5rem)]">
    <aside id="sidebar" class="w-96 border-r bg-white overflow-y-auto md:block hidden"></aside>
    <section id="map" class="flex-1"></section>
    <aside id="detail" class="w-[420px] border-l bg-white overflow-y-auto hidden"></aside>
  </main>

  <nav id="mobile-tabs" class="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t flex"></nav>

  <script type="module" src="assets/app.js"></script>
</body>
</html>
```

- [ ] **Step 4: Create minimal `assets/styles.css`**

```css
:root {
  --day-1: #e11d48;
  --day-2: #7c3aed;
  --day-3: #0284c7;
  --day-4: #059669;
  --day-5: #64748b;
}

#map { z-index: 0; }

.numbered-marker {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 50%;
  color: white;
  font-weight: 700;
  font-size: 14px;
  border: 2px solid white;
  box-shadow: 0 2px 6px rgba(0,0,0,0.3);
}

.numbered-marker.active {
  transform: scale(1.25);
  z-index: 1000 !important;
}

@media (max-width: 767px) {
  main { height: calc(100vh - 3.5rem - 3.5rem); }
}
```

- [ ] **Step 5: Create minimal `assets/app.js`**

```javascript
console.log('app loaded');
```

- [ ] **Step 6: Verify**

Open `index.html` in a browser. Confirm the header bar and a blank gray area appear (no JS errors in console).

- [ ] **Step 7: Commit**

```bash
git add .gitignore index.html assets/ data/.gitkeep scripts/.gitkeep tests/.gitkeep
git commit -m "chore: scaffold project skeleton (HTML shell + CDN imports + day-color vars)"
```

---

### Task 1.2: Create sample data files

**Files:**
- Create: `data/places.json`
- Create: `data/itinerary.json`

- [ ] **Step 1: Create `data/places.json` with 5 sample places**

```json
{
  "kansai_airport": {
    "name_ko": "간사이 국제공항",
    "name_jp": "関西国際空港",
    "coords": [34.4347, 135.2441],
    "category": "main",
    "emoji": "✈️",
    "tags": ["교통허브"],
    "summary": "오사카만 인공섬 위에 지어진 24시간 운영 공항.",
    "detail": "1994년 개항. 난카이 라피트로 난바까지 34분, 공항급행으로 약 45분.",
    "sources": [
      {"title": "Kansai Airports 공식", "url": "https://www.kansai-airports.co.jp/en/"}
    ],
    "activities": ["라피트 티켓 자판기에서 난바행 구입", "1층 도착장 SIM/포켓와이파이 픽업"],
    "restaurants": [],
    "review_links": {
      "naver": "https://search.naver.com/search.naver?where=blog&query=%EA%B0%84%EC%82%AC%EC%9D%B4%EA%B3%B5%ED%95%AD+%EB%82%9C%EB%B0%94+%EC%9D%B4%EB%8F%99+%ED%9B%84%EA%B8%B0",
      "google": "https://www.google.com/search?q=%EA%B0%84%EC%82%AC%EC%9D%B4%EA%B3%B5%ED%95%AD+%EB%82%9C%EB%B0%94+%EC%9D%B4%EB%8F%99+%ED%9B%84%EA%B8%B0&hl=ko",
      "youtube": "https://www.youtube.com/results?search_query=%EA%B0%84%EC%82%AC%EC%9D%B4%EA%B3%B5%ED%95%AD+%EB%82%9C%EB%B0%94+%EC%9D%B4%EB%8F%99"
    }
  },
  "namba_hotel": {
    "name_ko": "난바 숙소권",
    "name_jp": "難波",
    "coords": [34.6661, 135.5019],
    "category": "main",
    "emoji": "🏨",
    "tags": ["숙소"],
    "summary": "난바·신사이바시는 오사카 첫 여행 정석 숙박권.",
    "detail": "도톤보리, 구로몬, 닛폰바시, 신사이바시 모두 도보권.",
    "sources": [{"title": "Trip.com 오사카 숙소 가이드", "url": "https://kr.trip.com/guide/destination/osaka-itinerary.html"}],
    "activities": ["체크인 후 짐 풀고 가벼운 차림으로 외출"],
    "restaurants": [],
    "review_links": {
      "naver": "https://search.naver.com/search.naver?where=blog&query=%EB%82%9C%EB%B0%94+%EC%88%99%EC%86%8C+%EC%B6%94%EC%B2%9C",
      "google": "https://www.google.com/search?q=%EB%82%9C%EB%B0%94+%EC%88%99%EC%86%8C+%EC%B6%94%EC%B2%9C&hl=ko",
      "youtube": "https://www.youtube.com/results?search_query=%EB%82%9C%EB%B0%94+%EC%88%99%EC%86%8C"
    }
  },
  "kuromon_market": {
    "name_ko": "구로몬시장",
    "name_jp": "黒門市場",
    "coords": [34.6660, 135.5063],
    "category": "main",
    "emoji": "🦑",
    "tags": ["먹거리", "시장"],
    "summary": "약 580m 아케이드에 150여 점포가 늘어선 \"오사카의 부엌\".",
    "detail": "참치 해체쇼, 와규 꼬치, 성게, 사과 캔디 같은 길거리 음식이 강점. 오전이 신선도가 좋고 늦은 오후엔 일부 점포가 닫는다.",
    "sources": [{"title": "오사카관광공사 구로몬시장", "url": "https://osaka-info.jp/spot/kuromon-ichiba-market/"}],
    "activities": ["참치 해체쇼 구경 (점포에 따라 11시·14시)", "와규 꼬치+성게 시식", "닛폰바시 방향 도보 5분 이동 준비"],
    "restaurants": [
      {"name": "마구로야 쿠로기 (まぐろや黒銀)", "type": "참치", "tip": "오토로 초밥/해체쇼", "price_range": "1000~3000엔"},
      {"name": "타카하시 (高橋)", "type": "와규 꼬치·이세 새우", "tip": "줄 길면 옆 분점", "price_range": "500~2000엔"},
      {"name": "이시바시 (石橋食品)", "type": "어묵·반찬", "tip": "사케 안주용 픽업", "price_range": "300~1000엔"}
    ],
    "review_links": {
      "naver": "https://search.naver.com/search.naver?where=blog&query=%EA%B5%AC%EB%A1%9C%EB%AA%AC%EC%8B%9C%EC%9E%A5+%EB%A7%9B%EC%A7%91",
      "google": "https://www.google.com/search?q=%EA%B5%AC%EB%A1%9C%EB%AA%AC%EC%8B%9C%EC%9E%A5+%EB%A7%9B%EC%A7%91&hl=ko",
      "youtube": "https://www.youtube.com/results?search_query=%EA%B5%AC%EB%A1%9C%EB%AA%AC%EC%8B%9C%EC%9E%A5"
    }
  },
  "denden_town": {
    "name_ko": "덴덴타운·닛폰바시 오타로드",
    "name_jp": "でんでんタウン・日本橋",
    "coords": [34.6580, 135.5060],
    "category": "main",
    "emoji": "🛍️",
    "tags": ["전자상가", "애니메이션", "피규어"],
    "summary": "오사카의 아키하바라. 전자제품·애니·피규어·게임 전문점 밀집.",
    "detail": "사카이스지를 따라 남쪽으로 약 800m. 만다라케, 슈퍼포테토, 멜론북스, 라신반, 점프숍, 빔즈 컬렉션 등.",
    "sources": [{"title": "닛폰바시 상점가 진흥회 공식", "url": "https://www.denden-town.or.jp/"}],
    "activities": ["만다라케 본관 1F→지하 순으로 훑기", "슈퍼포테토에서 레트로 게임 가격 비교", "오타로드 끝에서 난바까지 도보로 복귀"],
    "restaurants": [
      {"name": "이치란 닛폰바시점", "type": "돈코츠 라멘", "tip": "1인 칸막이석", "price_range": "1000~1500엔"},
      {"name": "551 호라이 닛폰바시점", "type": "차슈만", "tip": "포장만, 줄 항상 있음", "price_range": "200~1000엔"}
    ],
    "review_links": {
      "naver": "https://search.naver.com/search.naver?where=blog&query=%EB%8D%B4%EB%8D%B4%ED%83%80%EC%9A%B4+%ED%9B%84%EA%B8%B0",
      "google": "https://www.google.com/search?q=%EB%8D%B4%EB%8D%B4%ED%83%80%EC%9A%B4+%ED%9B%84%EA%B8%B0&hl=ko",
      "youtube": "https://www.youtube.com/results?search_query=%EB%8D%B4%EB%8D%B4%ED%83%80%EC%9A%B4"
    }
  },
  "dotonbori": {
    "name_ko": "도톤보리",
    "name_jp": "道頓堀",
    "coords": [34.6687, 135.5012],
    "category": "main",
    "emoji": "🍜",
    "tags": ["야경", "맛집거리", "쇼핑"],
    "summary": "오사카 미나미의 대표 번화가. 글리코상 네온과 강변 야경.",
    "detail": "약 600m 길이의 강변 거리. 1612년 운하 개통 이후 극장가로 발달했고, 지금은 오사카 야식과 쇼핑의 중심. 한국인이 가장 많이 찍는 사진 스팟이 글리코상 앞 다이코쿠바시 다리.",
    "sources": [{"title": "오사카관광공사 도톤보리", "url": "https://osaka-info.jp/spot/dotonbori/"}],
    "activities": ["글리코상 인증샷 (다이코쿠바시)", "도톤보리 강 유람선 (Tonbori River Cruise, 20분, 1500엔)", "에비스바시 위에서 야경 보기"],
    "restaurants": [
      {"name": "金龍ラーメン (긴류 라멘)", "type": "돈코츠 라멘", "tip": "24시간, 김치/부추 셀프 토핑", "price_range": "~1000엔"},
      {"name": "쿠쿠루 도톤보리본점", "type": "타코야키", "tip": "잉크 묻은 문어 모형이 간판", "price_range": "500~800엔"},
      {"name": "오사카오쇼 도톤보리", "type": "교자 정식", "tip": "야식용 든든", "price_range": "800~1500엔"}
    ],
    "review_links": {
      "naver": "https://search.naver.com/search.naver?where=blog&query=%EB%8F%84%ED%86%A4%EB%B3%B4%EB%A6%AC+%EB%A7%9B%EC%A7%91",
      "google": "https://www.google.com/search?q=%EB%8F%84%ED%86%A4%EB%B3%B4%EB%A6%AC+%EB%A7%9B%EC%A7%91&hl=ko",
      "youtube": "https://www.youtube.com/results?search_query=%EB%8F%84%ED%86%A4%EB%B3%B4%EB%A6%AC+%EC%95%BC%EA%B2%BD"
    }
  }
}
```

- [ ] **Step 2: Create `data/itinerary.json` with Day1 only**

```json
{
  "trip": {
    "title": "오사카·교토 여행",
    "subtitle": "Doctor Cho's 4박 5일",
    "start_date": "2026-05-22",
    "end_date": "2026-05-26"
  },
  "days": [
    {
      "id": "day1",
      "date": "2026-05-22",
      "weekday": "금",
      "title": "도착 + 난바 적응 + 야경",
      "color_var": "--day-1",
      "stops": [
        {
          "place_id": "kansai_airport",
          "time": "16:00",
          "transit_from_prev": null,
          "duration_minutes": 30
        },
        {
          "place_id": "namba_hotel",
          "time": "17:10",
          "transit_from_prev": {"mode": "난카이 라피트", "from": "간사이공항", "to": "난바", "minutes": 34, "cost_jpy": 1490, "note": "특급권+승차권"},
          "duration_minutes": 30
        },
        {
          "place_id": "kuromon_market",
          "time": "18:00",
          "transit_from_prev": {"mode": "도보", "from": "난바 숙소", "to": "구로몬시장", "minutes": 8, "cost_jpy": 0, "note": ""},
          "duration_minutes": 60
        },
        {
          "place_id": "denden_town",
          "time": "19:10",
          "transit_from_prev": {"mode": "도보", "from": "구로몬시장", "to": "덴덴타운", "minutes": 7, "cost_jpy": 0, "note": ""},
          "duration_minutes": 60
        },
        {
          "place_id": "dotonbori",
          "time": "20:20",
          "transit_from_prev": {"mode": "도보", "from": "덴덴타운", "to": "도톤보리", "minutes": 12, "cost_jpy": 0, "note": ""},
          "duration_minutes": 120
        }
      ]
    }
  ]
}
```

- [ ] **Step 3: Commit**

```bash
git add data/places.json data/itinerary.json
git commit -m "feat(data): add sample places (5) and Day1 itinerary"
```

---

### Task 1.3: Wire up data loading and map

**Files:**
- Modify: `assets/app.js` (replace contents)

- [ ] **Step 1: Replace `assets/app.js` with data loader + map init**

```javascript
const DAY_COLORS = {day1:'#e11d48',day2:'#7c3aed',day3:'#0284c7',day4:'#059669',day5:'#64748b'};

const state = {
  itinerary: null,
  places: null,
  activeDay: 'day1',
  activeStopIndex: 0,
  map: null,
  markerLayer: null,
  routeLayer: null,
};

async function loadData() {
  const [it, pl] = await Promise.all([
    fetch('data/itinerary.json').then(r => r.json()),
    fetch('data/places.json').then(r => r.json()),
  ]);
  state.itinerary = it;
  state.places = pl;
}

function initMap() {
  state.map = L.map('map', { zoomControl: true }).setView([34.668, 135.501], 13);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap'
  }).addTo(state.map);
  state.markerLayer = L.layerGroup().addTo(state.map);
  state.routeLayer = L.layerGroup().addTo(state.map);
}

function renderDay(dayId) {
  const day = state.itinerary.days.find(d => d.id === dayId);
  if (!day) return;
  state.activeDay = dayId;
  state.markerLayer.clearLayers();
  state.routeLayer.clearLayers();

  const color = DAY_COLORS[dayId];
  const coords = [];

  day.stops.forEach((stop, i) => {
    const place = state.places[stop.place_id];
    if (!place) return;
    const icon = L.divIcon({
      className: '',
      html: `<div class="numbered-marker" style="background:${color}">${i + 1}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const marker = L.marker(place.coords, { icon }).addTo(state.markerLayer);
    marker.on('click', () => selectStop(dayId, i));
    coords.push(place.coords);
  });

  if (coords.length > 1) {
    L.polyline(coords, { color, weight: 3, opacity: 0.6, dashArray: '6,8' }).addTo(state.routeLayer);
  }
  if (coords.length > 0) {
    state.map.fitBounds(L.latLngBounds(coords).pad(0.2));
  }
}

function selectStop(dayId, stopIndex) {
  state.activeDay = dayId;
  state.activeStopIndex = stopIndex;
  const stop = state.itinerary.days.find(d => d.id === dayId).stops[stopIndex];
  const place = state.places[stop.place_id];
  state.map.flyTo(place.coords, 16, { duration: 0.8 });
  location.hash = `#${dayId}/${stop.place_id}`;
  renderSidebar();
  renderDetail(stop, place);
}

function renderSidebar() {
  const sidebar = document.getElementById('sidebar');
  const day = state.itinerary.days.find(d => d.id === state.activeDay);
  const color = DAY_COLORS[state.activeDay];
  sidebar.innerHTML = `
    <div class="p-4 border-b" style="border-color:${color}">
      <div class="text-xs uppercase tracking-wide" style="color:${color}">${day.date} (${day.weekday})</div>
      <h2 class="text-lg font-bold mt-1">${day.title}</h2>
    </div>
    <ul>
      ${day.stops.map((stop, i) => {
        const place = state.places[stop.place_id];
        const active = i === state.activeStopIndex;
        const transit = stop.transit_from_prev
          ? `<div class="text-xs text-slate-500 mb-1">↳ ${stop.transit_from_prev.mode} · ${stop.transit_from_prev.minutes}분${stop.transit_from_prev.cost_jpy ? ` · ¥${stop.transit_from_prev.cost_jpy}` : ''}</div>`
          : '';
        return `
          <li>
            ${transit}
            <button data-stop="${i}" class="w-full text-left p-3 border-b hover:bg-slate-50 ${active ? 'bg-slate-100' : ''}">
              <div class="flex items-center gap-3">
                <div class="numbered-marker" style="background:${color};width:28px;height:28px;font-size:12px">${i + 1}</div>
                <div class="flex-1">
                  <div class="font-semibold">${place.name_ko}</div>
                  <div class="text-xs text-slate-500">${stop.time} · ${stop.duration_minutes}분</div>
                </div>
                <div class="text-2xl">${place.emoji}</div>
              </div>
            </button>
          </li>`;
      }).join('')}
    </ul>`;
  sidebar.querySelectorAll('button[data-stop]').forEach(btn => {
    btn.addEventListener('click', () => selectStop(state.activeDay, Number(btn.dataset.stop)));
  });
}

function renderDetail(stop, place) {
  const detail = document.getElementById('detail');
  detail.classList.remove('hidden');
  const color = DAY_COLORS[state.activeDay];
  detail.innerHTML = `
    <div class="h-32 flex items-center justify-center text-6xl" style="background:linear-gradient(135deg,${color}22,${color}55)">${place.emoji}</div>
    <div class="p-5">
      <button id="detail-close" class="float-right text-slate-400 hover:text-slate-700 text-xl">×</button>
      <div class="text-xs uppercase tracking-wide" style="color:${color}">${stop.time} · ${stop.duration_minutes}분</div>
      <h2 class="text-2xl font-bold mt-1">${place.name_ko}</h2>
      <div class="text-sm text-slate-500">${place.name_jp}</div>
      <p class="mt-3 text-slate-700">${place.summary}</p>
      <p class="mt-2 text-sm text-slate-600">${place.detail}</p>

      ${place.activities.length ? `
        <h3 class="mt-5 font-semibold">여기서 해야 할 것</h3>
        <ul class="mt-2 list-disc list-inside text-sm space-y-1">
          ${place.activities.map(a => `<li>${a}</li>`).join('')}
        </ul>` : ''}

      ${place.restaurants.length ? `
        <h3 class="mt-5 font-semibold">추천 맛집</h3>
        <div class="mt-2 space-y-2">
          ${place.restaurants.map(r => `
            <div class="border rounded p-2">
              <div class="font-semibold text-sm">${r.name} <span class="text-xs text-slate-500">${r.type}</span></div>
              <div class="text-xs text-slate-600 mt-1">${r.tip}</div>
              <div class="text-xs text-slate-400 mt-1">${r.price_range}</div>
            </div>`).join('')}
        </div>` : ''}

      <h3 class="mt-5 font-semibold">한국어 후기 검색</h3>
      <div class="mt-2 flex gap-2 text-sm">
        <a class="px-3 py-1 rounded border" href="${place.review_links.naver}" target="_blank">네이버</a>
        <a class="px-3 py-1 rounded border" href="${place.review_links.google}" target="_blank">구글</a>
        <a class="px-3 py-1 rounded border" href="${place.review_links.youtube}" target="_blank">유튜브</a>
      </div>

      ${place.sources.length ? `
        <h3 class="mt-5 font-semibold text-xs text-slate-500">출처</h3>
        <ul class="text-xs text-slate-500 mt-1 space-y-1">
          ${place.sources.map(s => `<li>- <a class="underline" href="${s.url}" target="_blank">${s.title}</a></li>`).join('')}
        </ul>` : ''}
    </div>`;
  detail.querySelector('#detail-close').addEventListener('click', () => {
    detail.classList.add('hidden');
    history.replaceState(null, '', `#${state.activeDay}`);
  });
}

function renderProgressBar() {
  const bar = document.getElementById('progress-bar');
  bar.innerHTML = `
    <div class="font-bold text-slate-800 mr-4">${state.itinerary.trip.title}</div>
    <div class="flex gap-1">
      ${state.itinerary.days.map(d => `
        <button data-day="${d.id}" class="px-3 py-1 rounded text-xs font-semibold border ${d.id === state.activeDay ? 'text-white' : 'text-slate-600'}"
                style="${d.id === state.activeDay ? `background:${DAY_COLORS[d.id]};border-color:${DAY_COLORS[d.id]}` : `border-color:${DAY_COLORS[d.id]};color:${DAY_COLORS[d.id]}`}">
          ${d.id.toUpperCase()} · ${d.date.slice(5)}
        </button>`).join('')}
    </div>`;
  bar.querySelectorAll('button[data-day]').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activeStopIndex = 0;
      renderDay(btn.dataset.day);
      renderSidebar();
      renderProgressBar();
      document.getElementById('detail').classList.add('hidden');
      location.hash = `#${btn.dataset.day}`;
    });
  });
}

function parseHash() {
  const [day, placeId] = location.hash.replace('#', '').split('/');
  if (!day) return { day: 'day1', stopIndex: 0, open: false };
  const dayObj = state.itinerary.days.find(d => d.id === day);
  if (!dayObj) return { day: 'day1', stopIndex: 0, open: false };
  if (!placeId) return { day, stopIndex: 0, open: false };
  const idx = dayObj.stops.findIndex(s => s.place_id === placeId);
  return { day, stopIndex: idx >= 0 ? idx : 0, open: idx >= 0 };
}

async function boot() {
  await loadData();
  initMap();
  const { day, stopIndex, open } = parseHash();
  state.activeDay = day;
  state.activeStopIndex = stopIndex;
  renderDay(day);
  renderSidebar();
  renderProgressBar();
  if (open) {
    const stop = state.itinerary.days.find(d => d.id === day).stops[stopIndex];
    renderDetail(stop, state.places[stop.place_id]);
  }
}

window.addEventListener('hashchange', () => {
  const { day, stopIndex, open } = parseHash();
  if (day !== state.activeDay) {
    state.activeDay = day;
    state.activeStopIndex = stopIndex;
    renderDay(day);
    renderSidebar();
    renderProgressBar();
  }
  if (open) {
    const stop = state.itinerary.days.find(d => d.id === day).stops[stopIndex];
    renderDetail(stop, state.places[stop.place_id]);
  }
});

boot();
```

- [ ] **Step 2: Serve and verify**

Static `fetch()` of local files needs an HTTP server (browsers block `file://` fetch).

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

Then open `http://127.0.0.1:8765/`. Verify:
- Header shows "오사카·교토 여행" + 1 day button (DAY1).
- Map shows 5 red numbered markers from kansai_airport (south) to dotonbori (north).
- Sidebar lists 5 stops in time order.
- Clicking a sidebar card flies the map and opens the right detail panel.
- Clicking a map marker does the same.
- URL hash updates (e.g. `#day1/dotonbori`).
- Refreshing the page restores the same detail.

- [ ] **Step 3: Commit**

```bash
git add assets/app.js
git commit -m "feat: end-to-end wiring (data load, map markers, sidebar, detail panel, hash routing)"
```

---

### Task 1.4: Stage 1 docs + review loop

**Files:**
- Create: `docs/stage-1/skeleton.md`

- [ ] **Step 1: Write the stage doc**

Create `docs/stage-1/skeleton.md` with the five sections required by CLAUDE.md:

```markdown
# Stage 1 — Project Skeleton + Routing + End-to-End

## Why
설계 전체를 한 번에 만들기 전에, "데이터 → 지도 → 사이드바 → 디테일 → 라우팅"의 와이어링이 처음부터 끝까지 동작하는지 5개 sample 명소로 검증한다. 60개 데이터를 채운 뒤 와이어링이 안 맞으면 되돌리기 비싸기 때문.

## What
- `index.html` 골격 + Leaflet/Tailwind/Pretendard CDN
- `assets/app.js` 데이터 로더, Leaflet 마커, 사이드바, 디테일 패널, hash router
- `assets/styles.css` day 색상 CSS 변수
- `data/itinerary.json` Day1 (5 stops)
- `data/places.json` 5개 sample (간사이공항, 난바숙소, 구로몬, 덴덴타운, 도톤보리)

## How
Vanilla ES6, 단일 모듈. 상태는 in-memory `state` 객체. 지도는 `fitBounds`로 day 전체 보이도록 시작, 클릭 시 `flyTo`. URL hash는 `#dayN/placeId` 포맷, 새로고침해도 상태 복원.

## Code locations
- `index.html`
- `assets/app.js`
- `assets/styles.css`
- `data/places.json`
- `data/itinerary.json`

## Retrospective
TBD — 작성 시점에 채움. 무엇이 잘 됐고 다음 단계에서 무엇을 조심할지.
```

- [ ] **Step 2: Run code-reviewer subagent**

```
Agent: code-reviewer
Task: Review the diff for Stage 1 (project skeleton + end-to-end wiring).
Focus: data flow correctness, XSS risk (we use innerHTML with data from JSON), accessibility of clickable elements, mobile readiness.
Files: index.html, assets/app.js, assets/styles.css, data/places.json, data/itinerary.json
```

- [ ] **Step 3: Run gemini-subagent and codex-subagent reviews in parallel**

Send one message with both Skill invocations targeting the same diff. Capture both reports.

- [ ] **Step 4: Address findings**

For each finding: fix the code, push back with evidence, or explicitly dismiss in the stage doc. XSS-via-innerHTML is the most likely flag — if so, switch to text-node assignment for user-derived strings (place names, summaries) and keep template HTML for static structure.

- [ ] **Step 5: Update `docs/stage-1/skeleton.md`** with the Retrospective section filled in (what was flagged, what was fixed, what was dismissed and why).

- [ ] **Step 6: Run `stage-docs-visualizer` skill** to regenerate `docs/stage-1/visual/index.html`.

- [ ] **Step 7: Commit**

```bash
git add docs/stage-1/ assets/
git commit -m "docs(stage-1): skeleton + review outcomes; visualizer updated"
```

---

## Stage 2 — Full Data: 60 Places + Complete Itinerary

**Outcome:** `data/places.json` contains all ~60 places, `data/itinerary.json` covers Day1~Day5 with realistic transit info. A Node validator script catches schema errors and dangling `place_id` refs.

### Task 2.1: Master place catalog

**Files:**
- Create: `docs/stage-2/place-catalog.md`

- [ ] **Step 1: Write the master list** as a markdown table. Source of truth for what each day's research subagent must produce.

```markdown
# Place Catalog (60)

Per CLAUDE.md design + GPT plan. Categories: main = full profile w/ restaurants; alt = lite profile (summary, coords, activities, review links — no restaurants).

## Day 1 (5/22 금) — 도착 + 난바
| id | name_ko | category | source line |
| --- | --- | --- | --- |
| kansai_airport | 간사이 국제공항 | main | 도착 |
| namba_hotel | 난바 숙소권 | main | 숙소 |
| dotonbori | 도톤보리 | main | 야경 |
| shinsaibashi_suji | 신사이바시스지 | alt | 도톤보리 대체 |
| hozenji_yokocho | 호젠지요코초 | alt | 도톤보리 대체 |
| amerikamura | 아메리카무라 | alt | 도톤보리 대체 |
| namba_walk | 난바워크 | alt | 도톤보리 대체 |
| rinku_town | 린쿠타운 | alt | 공항 대체 |
| izumisano | 이즈미사노 | alt | 공항 대체 |
| airport_hotel | 공항근처 호텔 | alt | 공항 대체 |
| nippombashi | 닛폰바시 | alt | 숙소 대체 |
| umeda | 우메다 (숙소 후보) | alt | 숙소 대체 |

## Day 2 (5/23 토) — 교토 당일치기
| id | name_ko | category | source line |
| --- | --- | --- | --- |
| fushimi_inari | 후시미이나리 | main | 아침 |
| kiyomizu_dera | 청수사 | main | 오전~낮 |
| sannenzaka_ninenzaka | 산넨자카·니넨자카 | main | 낮 |
| gion_yasaka | 기온·야사카신사 | main | 오후 |
| nishiki_kawaramachi | 니시키시장·가와라마치 | main | 오후~저녁 |
| tofukuji | 도후쿠지 | alt | 후시미 대체 |
| fushimi_sake | 후시미 사케 거리 | alt | 후시미 대체 |
| byodoin | 우지 뵤도인 | alt | 후시미 대체 |
| kodaiji | 고다이지 | alt | 청수사 대체 |
| yasaka_pagoda | 야사카의 탑 | alt | 청수사 대체 |
| entokuin | 엔토쿠인 | alt | 청수사 대체 |
| ishibekoji | 이시베코지 | alt | 산넨자카 대체 |
| nene_no_michi | 네네노미치 | alt | 산넨자카 대체 |
| kiyomizu_zaka | 기요미즈자카 | alt | 산넨자카 대체 |
| maruyama_park | 마루야마공원 | alt | 기온 대체 |
| chionin | 지온인 | alt | 기온 대체 |
| shijo_kawaramachi | 시조카와라마치 | alt | 기온 대체 |
| pontocho | 폰토초 | alt | 기온/가와라마치 대체 |
| teramachi | 테라마치 | alt | 니시키 대체 |
| shinkyogoku | 신쿄고쿠 | alt | 니시키 대체 |
| kiyamachi | 기야마치 | alt | 니시키 대체 |

## Day 3 (5/24 일) — 오사카 도심
| id | name_ko | category | source line |
| --- | --- | --- | --- |
| osaka_castle | 오사카성 | main | 오전 |
| kuromon_market | 구로몬시장 | main | 점심 |
| denden_town | 덴덴타운·닛폰바시 오타로드 | main | 점심 후 |
| umeda_sky | 우메다 스카이빌딩 | main | 오후 |
| shinsekai_tsutenkaku | 신세카이·츠텐카쿠 | main | 저녁 |
| abeno_harukas | 아베노 하루카스 | main | 선택 |
| osaka_museum_history | 오사카 역사박물관 | alt | 오사카성 대체 |
| miraiza_osakajo | 미라이자 오사카성 | alt | 오사카성 대체 |
| jo_terrace | 조 테라스 | alt | 오사카성 대체 |
| nakanoshima | 나카노시마 | alt | 오사카성 대체 |
| sennichimae | 센니치마에 도구야스지 | alt | 구로몬 대체 |
| namba_parks | 난바 파크스 | alt | 덴덴타운 대체 |
| bic_camera_namba | 빅카메라 난바 | alt | 덴덴타운 대체 |
| shinsaibashi_parco | 신사이바시 PARCO | alt | 덴덴타운 대체 |
| grand_front | 그랜드프론트 | alt | 우메다 대체 |
| lucua | 루쿠아 | alt | 우메다 대체 |
| hep_five | 헵파이브 | alt | 우메다 대체 |
| nakazakicho | 나카자키초 | alt | 우메다 대체 |
| jan_jan_yokocho | 장장요코초 | alt | 신세카이 대체 |
| tennoji_park | 텐노지공원 | alt | 신세카이 대체 |
| tennoji_zoo | 덴노지동물원 | alt | 신세카이 대체 |
| spa_world | 스파월드 | alt | 신세카이 대체 |
| tennoji_mio | 텐노지 미오 | alt | 하루카스 대체 |
| qs_mall | 큐즈몰 | alt | 하루카스 대체 |
| tenshiba | 텐시바 | alt | 하루카스 대체 |
| shitennoji | 시텐노지 | alt | 하루카스 대체 |

## Day 4 (5/25 월) — USJ
| id | name_ko | category | source line |
| --- | --- | --- | --- |
| usj | 유니버설 스튜디오 재팬 | main | 하루 종일 |
| universal_citywalk | 유니버설 시티워크 | alt | USJ 대체 |
| tempozan_kaiyukan | 덴포잔·가이유칸 | alt | USJ 대체 |
| sakurajima_area | 사쿠라지마역 주변 | alt | USJ 대체 |

## Day 5 (5/26 화) — 출발
| id | name_ko | category | source line |
| --- | --- | --- | --- |
| namba_hotel_checkout | 난바 체크아웃 | main | 아침 |
| kansai_airport_dep | 간사이공항 출국 | main | 출발 |
```

- [ ] **Step 2: Commit**

```bash
git add docs/stage-2/place-catalog.md
git commit -m "docs(stage-2): master catalog of 60 places for research"
```

---

### Task 2.2: Day1 research (5/22 — Namba arrival)

**Files:**
- Modify: `data/places.json` (merge in Day1 entries)

- [ ] **Step 1: Dispatch Explore subagent for Day1**

Brief the subagent with the exact list from the catalog (Task 2.1 → Day 1 table). Prompt template:

```
Task: Research these Japan travel places and return JSON entries matching the schema below.

Places (IDs from catalog):
- main: kansai_airport, namba_hotel, dotonbori
- alt: shinsaibashi_suji, hozenji_yokocho, amerikamura, namba_walk, rinku_town, izumisano, airport_hotel, nippombashi, umeda

Schema for each place_id:
{
  "name_ko": "한국어",
  "name_jp": "日本語",
  "coords": [lat, lng],  // verify via OSM/Google
  "category": "main" | "alt",
  "emoji": "single emoji matching category",
  "tags": [...],
  "summary": "1-2 sentence Korean summary",
  "detail": "1 paragraph Korean detail",
  "sources": [{"title": "...", "url": "https://..."}],  // 1-2 official/wiki sources
  "activities": [...],  // 2-3 specific things to do, Korean
  "restaurants": [        // main only — empty array for alt
    {"name": "...", "type": "...", "tip": "...", "price_range": "..."}
  ],
  "review_links": {
    "naver": "https://search.naver.com/search.naver?where=blog&query=<urlencoded korean query>",
    "google": "https://www.google.com/search?q=<urlencoded>&hl=ko",
    "youtube": "https://www.youtube.com/results?search_query=<urlencoded>"
  }
}

Rules:
- Coords must be inside Japan (lat 30-46, lng 128-146). Verify each.
- For main places: 3-5 restaurants with name (Korean + Japanese if possible), type, one-line tip, price range in yen.
- Korean review queries: use evergreen phrases like "<장소명> 후기" — not date-specific.
- Sources: prefer 일본정부관광국 (jnto.go.jp), 오사카관광공사 (osaka-info.jp), 교토관광공사, Wikipedia, official site of the place. Cite real URLs only — DO NOT fabricate.
- Return the entire response as a single JSON object keyed by place_id (no markdown, no commentary).

dotonbori, namba_hotel, kansai_airport already exist as samples in data/places.json — preserve those but improve summaries if needed.
```

- [ ] **Step 2: Validate the subagent's JSON**

Run `node scripts/validate-data.mjs` (will be created in Task 2.7). For now, manually inspect: every coords inside Japan, every required field present, no markdown fences, no `null` for required fields.

- [ ] **Step 3: Merge into `data/places.json`**

Open the existing `data/places.json`. For each new key from the subagent: add or replace. Keep the file sorted alphabetically by key for diff readability.

- [ ] **Step 4: Commit**

```bash
git add data/places.json
git commit -m "feat(data): Day1 places (12 entries — 3 main + 9 alt)"
```

---

### Task 2.3: Day2 research (5/23 — Kyoto day trip)

**Files:**
- Modify: `data/places.json`

- [ ] **Step 1: Dispatch Explore subagent for Day2**

Same prompt template as Task 2.2, with this place list:

```
- main: fushimi_inari, kiyomizu_dera, sannenzaka_ninenzaka, gion_yasaka, nishiki_kawaramachi
- alt: tofukuji, fushimi_sake, byodoin, kodaiji, yasaka_pagoda, entokuin, ishibekoji, nene_no_michi, kiyomizu_zaka, maruyama_park, chionin, shijo_kawaramachi, pontocho, teramachi, shinkyogoku, kiyamachi
```

Special instructions: many of these are 교토 sites — sources should include 교토관광공사 (kyoto.travel) where possible.

- [ ] **Step 2: Validate**

Run `node scripts/validate-data.mjs`. Re-check Kyoto coords (lat ~34.9-35.1, lng ~135.7-135.8).

- [ ] **Step 3: Merge into `data/places.json` and commit**

```bash
git add data/places.json
git commit -m "feat(data): Day2 Kyoto places (20 entries — 5 main + 15 alt)"
```

---

### Task 2.4: Day3 research (5/24 — Osaka loop)

**Files:**
- Modify: `data/places.json`

- [ ] **Step 1: Dispatch Explore subagent for Day3**

Place list:

```
- main: osaka_castle, umeda_sky, shinsekai_tsutenkaku, abeno_harukas (note: kuromon_market and denden_town already in samples — improve/keep)
- alt: osaka_museum_history, miraiza_osakajo, jo_terrace, nakanoshima, sennichimae, namba_parks, bic_camera_namba, shinsaibashi_parco, grand_front, lucua, hep_five, nakazakicho, jan_jan_yokocho, tennoji_park, tennoji_zoo, spa_world, tennoji_mio, qs_mall, tenshiba, shitennoji
```

- [ ] **Step 2: Validate**

Coords check: lat ~34.6-34.7, lng ~135.5.

- [ ] **Step 3: Merge into `data/places.json` and commit**

```bash
git add data/places.json
git commit -m "feat(data): Day3 Osaka loop places (24 entries — 4 main + 20 alt; kuromon/denden refined)"
```

---

### Task 2.5: Day4 research (5/25 — USJ)

**Files:**
- Modify: `data/places.json`

- [ ] **Step 1: Dispatch Explore subagent for Day4**

```
- main: usj
- alt: universal_citywalk, tempozan_kaiyukan, sakurajima_area
```

For `usj`, restaurants = top recommended in-park food (e.g., Studio Stars Restaurant, Mel's Drive-In, Three Broomsticks) — verify each via official USJ site.

- [ ] **Step 2: Validate and commit**

```bash
git add data/places.json
git commit -m "feat(data): Day4 USJ + Universal City alts (4 entries)"
```

---

### Task 2.6: Day5 research (5/26 — Departure)

**Files:**
- Modify: `data/places.json`

- [ ] **Step 1: Dispatch Explore subagent for Day5**

```
- main: namba_hotel_checkout (reuse namba_hotel coords; emoji 🧳; activities focus on 짐 보관/공항 라피트 시간 확인), kansai_airport_dep (reuse kansai_airport coords; activities focus on 출국 절차/면세점 픽업/탑승구 이동)
```

These are mostly reused locations but with departure-flavored activities. No restaurants needed (alt-style profile is fine even though category is "main" — clarify in note inside `detail`).

- [ ] **Step 2: Merge and commit**

```bash
git add data/places.json
git commit -m "feat(data): Day5 departure stops (2 entries; reuse airport/namba coords)"
```

---

### Task 2.7: Build the data validator (TDD)

**Files:**
- Create: `scripts/validate-data.mjs`
- Create: `tests/validate-data.test.mjs`
- Create: `package.json`

- [ ] **Step 1: Create `package.json`**

```json
{
  "name": "japan-travel-plan",
  "version": "0.1.0",
  "type": "module",
  "scripts": {
    "test": "node --test tests/",
    "validate": "node scripts/validate-data.mjs"
  }
}
```

- [ ] **Step 2: Write failing tests in `tests/validate-data.test.mjs`**

```javascript
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { validate } from '../scripts/validate-data.mjs';

describe('validate(places, itinerary)', () => {
  const goodPlace = {
    name_ko: '도톤보리', name_jp: '道頓堀',
    coords: [34.6687, 135.5012],
    category: 'main', emoji: '🍜', tags: ['야경'],
    summary: 's', detail: 'd',
    sources: [{ title: 't', url: 'https://example.com' }],
    activities: ['a'], restaurants: [{ name: 'n', type: 't', tip: 'x', price_range: '~1000엔' }],
    review_links: { naver: 'https://x', google: 'https://x', youtube: 'https://x' },
  };
  const goodItinerary = {
    trip: { title: 't', subtitle: 's', start_date: '2026-05-22', end_date: '2026-05-26' },
    days: [{ id: 'day1', date: '2026-05-22', weekday: '금', title: 't', color_var: '--day-1',
      stops: [{ place_id: 'p1', time: '16:00', transit_from_prev: null, duration_minutes: 30 }] }],
  };

  it('passes on valid input', () => {
    const r = validate({ p1: goodPlace }, goodItinerary);
    assert.deepEqual(r.errors, []);
  });

  it('fails when itinerary references unknown place_id', () => {
    const r = validate({}, goodItinerary);
    assert.ok(r.errors.some(e => e.includes('unknown place_id: p1')));
  });

  it('fails when coords are outside Japan', () => {
    const bad = { ...goodPlace, coords: [0, 0] };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some(e => e.includes('coords outside Japan')));
  });

  it('fails when main place has no restaurants (except day5 reuse)', () => {
    const bad = { ...goodPlace, restaurants: [] };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some(e => e.includes('main place p1 has no restaurants')));
  });

  it('skips restaurant check for day5 reuse places', () => {
    const bad = { ...goodPlace, restaurants: [] };
    const itin = { ...goodItinerary, days: [{ ...goodItinerary.days[0], id: 'day5' }] };
    const r = validate({ p1: bad }, itin);
    assert.ok(!r.errors.some(e => e.includes('no restaurants')));
  });

  it('fails when required field missing', () => {
    const bad = { ...goodPlace };
    delete bad.summary;
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some(e => e.includes('missing field: summary')));
  });

  it('fails when review_link URL is not http(s)', () => {
    const bad = { ...goodPlace, review_links: { ...goodPlace.review_links, naver: 'javascript:alert(1)' } };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some(e => e.includes('invalid url')));
  });
});
```

- [ ] **Step 3: Run tests to confirm they fail**

```bash
node --test tests/
```

Expected: all tests fail with "Cannot find module '../scripts/validate-data.mjs'" or similar.

- [ ] **Step 4: Create `scripts/validate-data.mjs`**

```javascript
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

const REQUIRED_FIELDS = ['name_ko','name_jp','coords','category','emoji','tags','summary','detail','sources','activities','restaurants','review_links'];
const JAPAN_BOUNDS = { latMin: 30, latMax: 46, lngMin: 128, lngMax: 146 };

export function validate(places, itinerary) {
  const errors = [];

  for (const [id, place] of Object.entries(places)) {
    for (const f of REQUIRED_FIELDS) {
      if (!(f in place)) errors.push(`${id}: missing field: ${f}`);
    }
    if (place.coords) {
      const [lat, lng] = place.coords;
      if (lat < JAPAN_BOUNDS.latMin || lat > JAPAN_BOUNDS.latMax ||
          lng < JAPAN_BOUNDS.lngMin || lng > JAPAN_BOUNDS.lngMax) {
        errors.push(`${id}: coords outside Japan: [${lat}, ${lng}]`);
      }
    }
    if (place.review_links) {
      for (const [k, url] of Object.entries(place.review_links)) {
        if (!/^https?:\/\//.test(url)) errors.push(`${id}: invalid url in review_links.${k}`);
      }
    }
    if (place.sources) {
      for (const s of place.sources) {
        if (!/^https?:\/\//.test(s.url || '')) errors.push(`${id}: invalid url in sources`);
      }
    }
  }

  const referenced = new Set();
  for (const day of itinerary.days ?? []) {
    for (const stop of day.stops ?? []) {
      referenced.add(stop.place_id);
      if (!places[stop.place_id]) {
        errors.push(`${day.id}: unknown place_id: ${stop.place_id}`);
      }
    }
  }

  for (const [id, place] of Object.entries(places)) {
    if (place.category !== 'main') continue;
    if (!referenced.has(id)) continue;
    const inDay5 = (itinerary.days ?? []).some(d => d.id === 'day5' && d.stops.some(s => s.place_id === id));
    if (inDay5) continue;
    if (!Array.isArray(place.restaurants) || place.restaurants.length === 0) {
      errors.push(`${id}: main place ${id} has no restaurants`);
    }
  }

  return { errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const places = JSON.parse(await readFile('data/places.json', 'utf8'));
  const itinerary = JSON.parse(await readFile('data/itinerary.json', 'utf8'));
  const { errors } = validate(places, itinerary);
  if (errors.length) {
    for (const e of errors) console.error('✗', e);
    process.exit(1);
  }
  console.log(`✓ ${Object.keys(places).length} places, ${itinerary.days.length} days validated`);
}
```

- [ ] **Step 5: Run tests to confirm they pass**

```bash
node --test tests/
```

Expected: all 7 tests pass.

- [ ] **Step 6: Run validator against real data**

```bash
node scripts/validate-data.mjs
```

If errors, fix each one in `data/places.json` (most likely missing fields from subagent output or out-of-bounds coords from a research mistake) and rerun until clean.

- [ ] **Step 7: Commit**

```bash
git add package.json scripts/validate-data.mjs tests/validate-data.test.mjs
git commit -m "test: add data validator (schema, Japan bounds, place_id refs, URL safety)"
```

---

### Task 2.8: Build complete itinerary.json

**Files:**
- Modify: `data/itinerary.json`

- [ ] **Step 1: Replace `data/itinerary.json` with all 5 days**

Use the schedule grid in the GPT plan (final table from the markdown). Each main stop gets a `place_id` ref and realistic transit info. Reference table for transit times:

| From → To | Mode | Minutes | Yen |
| --- | --- | --- | --- |
| Kansai Airport → Namba | 난카이 라피트 | 34 | 1490 |
| Kansai Airport → Namba | 난카이 공항급행 | 45 | 970 |
| Namba → Kuromon | 도보 | 8 | 0 |
| Kuromon → Denden Town | 도보 | 7 | 0 |
| Denden Town → Dotonbori | 도보 | 12 | 0 |
| Namba → Fushimi Inari | JR 나라선/케이한 | 35-45 | 200-410 |
| Fushimi Inari → Kiyomizu-dera | 케이한+버스 | 25-30 | 300 |
| Kiyomizu → Sannenzaka | 도보 | 5 | 0 |
| Sannenzaka → Gion/Yasaka | 도보 | 15 | 0 |
| Gion → Nishiki/Kawaramachi | 도보 | 15 | 0 |
| Kawaramachi → Namba | 한큐+미도스지 | 50-60 | 600 |
| Namba → Osaka Castle Park | 미도스지+JR환상선 | 20 | 240 |
| Osaka Castle → Kuromon | 환상선+도보 | 20 | 190 |
| Kuromon → Denden | 도보 | 7 | 0 |
| Denden → Umeda Sky | 미도스지+도보 | 25 | 240 |
| Umeda → Shinsekai | 미도스지+사카이스지선 | 25 | 240 |
| Shinsekai → Abeno Harukas | 도보 | 15 | 0 |
| Abeno → Namba | 미도스지 | 8 | 190 |
| Namba → USJ | 미도스지+JR유메사키선 | 35 | 280 |
| USJ → Namba | JR유메사키선+미도스지 | 35 | 280 |
| Namba → Kansai Airport | 난카이 라피트 | 34 | 1490 |

Full file:

```json
{
  "trip": {
    "title": "오사카·교토 여행",
    "subtitle": "Doctor Cho 4박 5일",
    "start_date": "2026-05-22",
    "end_date": "2026-05-26"
  },
  "days": [
    {
      "id": "day1", "date": "2026-05-22", "weekday": "금",
      "title": "도착 + 난바 적응 + 야경", "color_var": "--day-1",
      "stops": [
        {"place_id": "kansai_airport", "time": "16:00", "transit_from_prev": null, "duration_minutes": 30},
        {"place_id": "namba_hotel",    "time": "17:10", "transit_from_prev": {"mode":"난카이 라피트","from":"간사이공항","to":"난바","minutes":34,"cost_jpy":1490,"note":"특급권+승차권"}, "duration_minutes": 30},
        {"place_id": "kuromon_market", "time": "18:00", "transit_from_prev": {"mode":"도보","from":"난바 숙소","to":"구로몬시장","minutes":8,"cost_jpy":0,"note":""}, "duration_minutes": 60},
        {"place_id": "denden_town",    "time": "19:10", "transit_from_prev": {"mode":"도보","from":"구로몬시장","to":"덴덴타운","minutes":7,"cost_jpy":0,"note":""}, "duration_minutes": 60},
        {"place_id": "dotonbori",      "time": "20:20", "transit_from_prev": {"mode":"도보","from":"덴덴타운","to":"도톤보리","minutes":12,"cost_jpy":0,"note":""}, "duration_minutes": 120}
      ]
    },
    {
      "id": "day2", "date": "2026-05-23", "weekday": "토",
      "title": "교토 당일치기", "color_var": "--day-2",
      "stops": [
        {"place_id": "fushimi_inari",        "time": "08:30", "transit_from_prev": {"mode":"미도스지+JR나라선","from":"난바","to":"이나리역","minutes":45,"cost_jpy":410,"note":"이른 시간 추천"}, "duration_minutes": 120},
        {"place_id": "kiyomizu_dera",        "time": "11:30", "transit_from_prev": {"mode":"JR+버스","from":"이나리","to":"청수사","minutes":35,"cost_jpy":420,"note":"교토역 환승"}, "duration_minutes": 90},
        {"place_id": "sannenzaka_ninenzaka", "time": "13:30", "transit_from_prev": {"mode":"도보","from":"청수사","to":"산넨자카","minutes":5,"cost_jpy":0,"note":"내리막 골목"}, "duration_minutes": 60},
        {"place_id": "gion_yasaka",          "time": "15:00", "transit_from_prev": {"mode":"도보","from":"산넨자카","to":"기온","minutes":15,"cost_jpy":0,"note":"이시베코지 경유"}, "duration_minutes": 90},
        {"place_id": "nishiki_kawaramachi",  "time": "17:00", "transit_from_prev": {"mode":"도보","from":"기온","to":"가와라마치","minutes":15,"cost_jpy":0,"note":"폰토초 경유 가능"}, "duration_minutes": 120},
        {"place_id": "namba_hotel",          "time": "20:00", "transit_from_prev": {"mode":"한큐+미도스지","from":"가와라마치","to":"난바","minutes":60,"cost_jpy":600,"note":"우메다 환승"}, "duration_minutes": 30}
      ]
    },
    {
      "id": "day3", "date": "2026-05-24", "weekday": "일",
      "title": "오사카 도심 (성·시장·전망)", "color_var": "--day-3",
      "stops": [
        {"place_id": "osaka_castle",        "time": "09:00", "transit_from_prev": {"mode":"미도스지+JR환상선","from":"난바","to":"오사카죠공원","minutes":20,"cost_jpy":240,"note":""}, "duration_minutes": 120},
        {"place_id": "kuromon_market",      "time": "12:00", "transit_from_prev": {"mode":"JR환상선+도보","from":"오사카죠","to":"닛폰바시","minutes":20,"cost_jpy":190,"note":""}, "duration_minutes": 60},
        {"place_id": "denden_town",         "time": "13:30", "transit_from_prev": {"mode":"도보","from":"구로몬","to":"덴덴타운","minutes":7,"cost_jpy":0,"note":""}, "duration_minutes": 90},
        {"place_id": "umeda_sky",           "time": "15:30", "transit_from_prev": {"mode":"미도스지+도보","from":"닛폰바시","to":"우메다 스카이빌딩","minutes":25,"cost_jpy":240,"note":""}, "duration_minutes": 90},
        {"place_id": "shinsekai_tsutenkaku","time": "18:00", "transit_from_prev": {"mode":"미도스지+사카이스지선","from":"우메다","to":"신세카이","minutes":25,"cost_jpy":240,"note":""}, "duration_minutes": 90},
        {"place_id": "abeno_harukas",       "time": "20:00", "transit_from_prev": {"mode":"도보","from":"신세카이","to":"덴노지","minutes":15,"cost_jpy":0,"note":"체력 남으면 선택"}, "duration_minutes": 60},
        {"place_id": "dotonbori",           "time": "21:30", "transit_from_prev": {"mode":"미도스지","from":"덴노지","to":"난바","minutes":8,"cost_jpy":190,"note":"야식"}, "duration_minutes": 60}
      ]
    },
    {
      "id": "day4", "date": "2026-05-25", "weekday": "월",
      "title": "유니버설 스튜디오 재팬", "color_var": "--day-4",
      "stops": [
        {"place_id": "usj", "time": "08:00", "transit_from_prev": {"mode":"미도스지+JR유메사키선","from":"난바","to":"유니버설시티역","minutes":35,"cost_jpy":280,"note":"오픈런"}, "duration_minutes": 720},
        {"place_id": "universal_citywalk", "time": "20:30", "transit_from_prev": {"mode":"도보","from":"USJ","to":"시티워크","minutes":2,"cost_jpy":0,"note":"저녁 식사/기념품"}, "duration_minutes": 60},
        {"place_id": "namba_hotel", "time": "22:30", "transit_from_prev": {"mode":"JR유메사키선+미도스지","from":"유니버설시티","to":"난바","minutes":35,"cost_jpy":280,"note":""}, "duration_minutes": 30}
      ]
    },
    {
      "id": "day5", "date": "2026-05-26", "weekday": "화",
      "title": "체크아웃 + 출국", "color_var": "--day-5",
      "stops": [
        {"place_id": "namba_hotel_checkout", "time": "10:00", "transit_from_prev": null, "duration_minutes": 30},
        {"place_id": "kansai_airport_dep",   "time": "11:30", "transit_from_prev": {"mode":"난카이 라피트","from":"난바","to":"간사이공항","minutes":34,"cost_jpy":1490,"note":"출국 2시간 전 도착"}, "duration_minutes": 180}
      ]
    }
  ]
}
```

- [ ] **Step 2: Run validator**

```bash
node scripts/validate-data.mjs
```

Fix any errors (likely missing place_ids that need to be added to places.json from earlier tasks).

- [ ] **Step 3: Open in browser and click through Day1→Day5**

Start the dev server (`python3 -m http.server 8765 --bind 127.0.0.1`), open `http://127.0.0.1:8765/`, and click each Day tab. Confirm each day's markers appear and detail panels render.

- [ ] **Step 4: Commit**

```bash
git add data/itinerary.json
git commit -m "feat(data): full 5-day itinerary with realistic transit info"
```

---

### Task 2.9: Stage 2 docs + review loop

**Files:**
- Create: `docs/stage-2/data.md`

- [ ] **Step 1: Write `docs/stage-2/data.md`** with Why/What/How/Code locations/Retrospective sections per CLAUDE.md format.

```markdown
# Stage 2 — Complete Data (60 places + 5 days)

## Why
Stage 1의 와이어링이 동작함을 확인했으니, 진짜 정보를 채워야 한다. 사용자가 현장에서 보고 따라갈 수 있는 수준 — 좌표가 정확하고, 출처가 있고, 메인 명소엔 맛집이 있고, 후기 검색 링크가 살아 있어야 한다.

## What
- `docs/stage-2/place-catalog.md`: 60개 명소 마스터 리스트 (id, 한국어명, main/alt 분류)
- `data/places.json`: 60개 모두 채워짐 (메인 15개 + 대체 45개)
- `data/itinerary.json`: Day1~Day5, 모든 stop에 transit_from_prev/duration_minutes
- `scripts/validate-data.mjs`: 스키마/일본 좌표 범위/place_id 참조/URL 안전성 검증
- `tests/validate-data.test.mjs`: 7개 테스트 케이스 통과

## How
Day별로 Explore subagent를 별도 호출해 병렬 조사. 각 subagent에 동일한 JSON 스키마를 strict하게 강제. 결과는 validator를 통과해야 머지. TDD로 validator를 먼저 만들었고, 실제 데이터의 errors를 보면서 데이터(주로 subagent output)를 수정.

## Code locations
- `data/places.json`
- `data/itinerary.json`
- `scripts/validate-data.mjs`
- `tests/validate-data.test.mjs`
- `docs/stage-2/place-catalog.md`

## Retrospective
TBD — 작성 시점에 채움.
```

- [ ] **Step 2: Run review trio**

In one message, dispatch:
- `code-reviewer` subagent on the Stage 2 diff
- `gemini-subagent` skill on the same diff
- `codex-subagent` skill on the same diff

Focus areas to specify in each prompt: data accuracy (do coords plausibly match the place name?), URL safety (review_links and sources), schema consistency across all 60 places.

- [ ] **Step 3: Address findings**

Common likely findings:
- Coord typos (a place 100m off the actual location)
- Stale review_link URLs (search.naver redirects)
- Restaurants for alt places (should be empty per schema)
- Source URLs that return 404

Fix in `data/places.json`, rerun `node scripts/validate-data.mjs`, and document the fix or dismissal in the Retrospective.

- [ ] **Step 4: Finalize Retrospective + run stage-docs-visualizer + commit**

```bash
git add docs/stage-2/ data/
git commit -m "docs(stage-2): data complete + review outcomes; visualizer updated"
```

---

## Stage 3 — Mobile Responsiveness + Detail Polish

**Outcome:** Site usable on a 375px-wide phone in landscape and portrait. Detail panel becomes a full-screen modal on mobile. Bottom tab bar switches between Map / Itinerary / (Detail). Header progress bar collapses gracefully. Touch targets ≥ 44×44.

### Task 3.1: Mobile bottom tab bar

**Files:**
- Modify: `index.html` (`#mobile-tabs` content)
- Modify: `assets/app.js` (add `renderMobileTabs` and `setMobileView`)
- Modify: `assets/styles.css` (mobile media queries)

- [ ] **Step 1: Replace `#mobile-tabs` block in `index.html`**

```html
<nav id="mobile-tabs" class="md:hidden fixed bottom-0 left-0 right-0 h-14 bg-white border-t flex z-[1000]">
  <button data-view="map" class="flex-1 flex flex-col items-center justify-center text-xs">
    <span class="text-xl">🗺️</span>지도
  </button>
  <button data-view="list" class="flex-1 flex flex-col items-center justify-center text-xs">
    <span class="text-xl">📋</span>일정
  </button>
</nav>
```

- [ ] **Step 2: Add CSS for mobile views in `assets/styles.css`**

```css
@media (max-width: 767px) {
  body { font-size: 14px; }
  main { height: calc(100vh - 3.5rem - 3.5rem); position: relative; }
  #sidebar {
    position: absolute; top: 0; left: 0; right: 0; bottom: 0;
    width: 100%; z-index: 500; border-right: none;
    display: none;
  }
  #sidebar.active { display: block; }
  #map.hidden-mobile { visibility: hidden; }

  #detail {
    position: fixed; top: 0; left: 0; right: 0; bottom: 3.5rem;
    width: 100%; z-index: 1500; border-left: none;
  }

  #mobile-tabs button.active { color: var(--day-1); }
  .numbered-marker { width: 28px; height: 28px; font-size: 12px; }
}
```

- [ ] **Step 3: Add `setMobileView` and `renderMobileTabs` to `assets/app.js`**

Find the `renderProgressBar` function and add these new functions just below it:

```javascript
function setMobileView(view) {
  document.getElementById('sidebar').classList.toggle('active', view === 'list');
  document.getElementById('map').classList.toggle('hidden-mobile', view === 'list');
  document.querySelectorAll('#mobile-tabs button').forEach(b => {
    b.classList.toggle('active', b.dataset.view === view);
  });
}

function renderMobileTabs() {
  document.querySelectorAll('#mobile-tabs button').forEach(btn => {
    btn.addEventListener('click', () => setMobileView(btn.dataset.view));
  });
  setMobileView('map');
}
```

- [ ] **Step 4: Call `renderMobileTabs()` once in `boot()`**

In `boot()`, after `renderProgressBar();`, add:

```javascript
renderMobileTabs();
```

Also, in `selectStop()`, after `renderDetail(...)`, add to auto-close the list view on mobile and surface the detail:

```javascript
if (window.matchMedia('(max-width: 767px)').matches) {
  setMobileView('map');
}
```

- [ ] **Step 5: Verify in mobile viewport**

Open Chrome DevTools, toggle device toolbar (iPhone 12 Pro / 390x844). Reload `http://127.0.0.1:8765/`. Confirm:
- Map fills the screen above the bottom tabs.
- Bottom tabs show 지도 / 일정.
- Tap 일정 → sidebar slides up (full-screen list).
- Tap a card → detail modal covers screen, map view restores when closed.
- Tap a marker → detail modal slides up directly.

- [ ] **Step 6: Commit**

```bash
git add index.html assets/app.js assets/styles.css
git commit -m "feat(mobile): bottom tab bar (map/list) + full-screen detail modal"
```

---

### Task 3.2: Detail panel polish

**Files:**
- Modify: `assets/app.js` (`renderDetail` function)

- [ ] **Step 1: Improve `renderDetail` to show transit info card + restaurant images-by-emoji**

Replace the `renderDetail` function with this enhanced version:

```javascript
function renderDetail(stop, place) {
  const detail = document.getElementById('detail');
  detail.classList.remove('hidden');
  const color = DAY_COLORS[state.activeDay];
  const t = stop.transit_from_prev;
  const transitCard = t ? `
    <div class="mx-5 mt-4 p-3 rounded border-l-4 bg-slate-50" style="border-color:${color}">
      <div class="text-xs uppercase tracking-wide text-slate-500">전 stop에서 오는 길</div>
      <div class="font-semibold mt-1">${t.from} → ${t.to}</div>
      <div class="text-sm text-slate-600 mt-1">
        ${t.mode} · ${t.minutes}분${t.cost_jpy ? ` · ¥${t.cost_jpy}` : ' · 무료'}
      </div>
      ${t.note ? `<div class="text-xs text-slate-500 mt-1">${t.note}</div>` : ''}
    </div>` : '';

  detail.innerHTML = `
    <div class="h-40 flex items-center justify-center text-7xl relative" style="background:linear-gradient(135deg,${color}33,${color}66)">
      ${place.emoji}
      <button id="detail-close" class="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 text-slate-600 text-xl">×</button>
    </div>
    ${transitCard}
    <div class="p-5">
      <div class="text-xs uppercase tracking-wide" style="color:${color}">${stop.time} · ${stop.duration_minutes}분 체류</div>
      <h2 class="text-2xl font-bold mt-1">${place.name_ko}</h2>
      <div class="text-sm text-slate-500">${place.name_jp}</div>
      <div class="mt-2 flex gap-1 flex-wrap">
        ${place.tags.map(tag => `<span class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">#${tag}</span>`).join('')}
      </div>
      <p class="mt-3 text-slate-700">${place.summary}</p>
      <p class="mt-2 text-sm text-slate-600 leading-relaxed">${place.detail}</p>

      ${place.activities.length ? `
        <h3 class="mt-5 font-semibold text-slate-800">여기서 해야 할 것</h3>
        <ul class="mt-2 space-y-1 text-sm">
          ${place.activities.map(a => `<li class="flex gap-2"><span style="color:${color}">▸</span><span>${a}</span></li>`).join('')}
        </ul>` : ''}

      ${place.restaurants.length ? `
        <h3 class="mt-5 font-semibold text-slate-800">추천 맛집 (${place.restaurants.length})</h3>
        <div class="mt-2 space-y-2">
          ${place.restaurants.map(r => `
            <div class="border rounded-lg p-3 hover:bg-slate-50">
              <div class="flex items-baseline justify-between gap-2">
                <div class="font-semibold text-sm">${r.name}</div>
                <div class="text-xs text-slate-500 whitespace-nowrap">${r.price_range}</div>
              </div>
              <div class="text-xs text-slate-500 mt-1">${r.type}</div>
              <div class="text-sm text-slate-700 mt-1">${r.tip}</div>
            </div>`).join('')}
        </div>` : ''}

      <h3 class="mt-5 font-semibold text-slate-800">한국어 후기 검색</h3>
      <div class="mt-2 grid grid-cols-3 gap-2 text-sm text-center">
        <a class="px-3 py-2 rounded border hover:bg-slate-50" href="${place.review_links.naver}" target="_blank" rel="noopener">네이버<br><span class="text-xs text-slate-400">블로그</span></a>
        <a class="px-3 py-2 rounded border hover:bg-slate-50" href="${place.review_links.google}" target="_blank" rel="noopener">구글<br><span class="text-xs text-slate-400">웹</span></a>
        <a class="px-3 py-2 rounded border hover:bg-slate-50" href="${place.review_links.youtube}" target="_blank" rel="noopener">유튜브<br><span class="text-xs text-slate-400">영상</span></a>
      </div>

      ${place.sources.length ? `
        <h3 class="mt-5 font-semibold text-xs uppercase tracking-wide text-slate-500">출처</h3>
        <ul class="text-xs text-slate-500 mt-1 space-y-1">
          ${place.sources.map(s => `<li>· <a class="underline hover:text-slate-800" href="${s.url}" target="_blank" rel="noopener">${s.title}</a></li>`).join('')}
        </ul>` : ''}

      <div class="h-8"></div>
    </div>`;
  detail.querySelector('#detail-close').addEventListener('click', () => {
    detail.classList.add('hidden');
    history.replaceState(null, '', `#${state.activeDay}`);
  });
}
```

- [ ] **Step 2: Verify on desktop + mobile viewport**

Reload. Click a detail. Confirm:
- Transit card appears between header and body (skip for first stop with `null` transit).
- Tags appear as chips.
- Restaurants laid out as cards.
- Review buttons grid 3-col, large enough to tap.
- Close (×) button works.

- [ ] **Step 3: Commit**

```bash
git add assets/app.js
git commit -m "feat(detail): transit card, tag chips, restaurant cards, larger review buttons"
```

---

### Task 3.3: Active-day color sync

**Files:**
- Modify: `assets/app.js` (`renderMobileTabs`/`renderProgressBar`/`setMobileView`)
- Modify: `assets/styles.css`

- [ ] **Step 1: Update mobile-tabs active color to match day**

Currently `#mobile-tabs button.active` is hardcoded to `--day-1`. Make it dynamic by setting a CSS variable on body.

In `assets/styles.css`, change:

```css
#mobile-tabs button.active { color: var(--active-day); }
```

In `assets/app.js`, inside `renderDay()`, after `state.activeDay = dayId;`, add:

```javascript
document.body.style.setProperty('--active-day', DAY_COLORS[dayId]);
```

- [ ] **Step 2: Add subtle active-pin pulse**

In `assets/styles.css`:

```css
@keyframes pulse-marker {
  0%, 100% { transform: scale(1.25); }
  50% { transform: scale(1.4); }
}
.numbered-marker.active { animation: pulse-marker 1.4s ease-in-out infinite; }
```

In `assets/app.js`, inside `selectStop`, after `state.activeStopIndex = stopIndex;`, add:

```javascript
state.markerLayer.eachLayer(m => {
  const el = m.getElement();
  if (!el) return;
  const div = el.querySelector('.numbered-marker');
  if (div) div.classList.remove('active');
});
const activeMarker = state.markerLayer.getLayers()[stopIndex];
if (activeMarker) {
  const el = activeMarker.getElement();
  if (el) el.querySelector('.numbered-marker')?.classList.add('active');
}
```

- [ ] **Step 3: Verify**

Reload, switch days, tap stops. Active marker pulses with day color; mobile tab icon also matches day color.

- [ ] **Step 4: Commit**

```bash
git add assets/app.js assets/styles.css
git commit -m "feat(polish): day-color sync for mobile tabs + pulsing active marker"
```

---

### Task 3.4: Stage 3 docs + review loop

**Files:**
- Create: `docs/stage-3/mobile-polish.md`

- [ ] **Step 1: Write `docs/stage-3/mobile-polish.md`** with the 5 required sections.

```markdown
# Stage 3 — Mobile Responsiveness + Detail Polish

## Why
현장에서 스마트폰으로 봐야 하는 게 최종 사용 시나리오. Stage 1-2의 데스크톱 레이아웃은 모바일에서 짜그라지기 때문에 별도의 mobile UX가 필요. 그리고 정보가 많아진 만큼 디테일 패널이 정리되어 있어야 한 화면에 들어옴.

## What
- 모바일 하단 탭바 (지도/일정)
- 디테일 패널이 모바일에선 풀스크린 모달
- 디테일 패널 폴리시: transit card, tag chips, 맛집 카드, 큰 후기 버튼
- 활성 마커 펄스 애니메이션 + day 색상 동기화

## How
`@media (max-width: 767px)` 기반 분기. 사이드바를 absolute로 띄워 풀스크린 토글. 디테일은 fixed + z-index 1500. JS는 `matchMedia`로 모바일 여부 감지하고 자동 view 전환.

## Code locations
- `assets/styles.css` (mobile media queries)
- `assets/app.js` (`renderMobileTabs`, `setMobileView`, `renderDetail`, marker pulse)
- `index.html` (`#mobile-tabs`)

## Retrospective
TBD.
```

- [ ] **Step 2: Run review trio (code-reviewer + gemini + codex)**

Focus: mobile a11y (tap targets ≥ 44×44), z-index stacking correctness (Leaflet vs detail modal), animation performance.

- [ ] **Step 3: Address + finalize retrospective + stage-docs-visualizer + commit**

```bash
git add docs/stage-3/ assets/ index.html
git commit -m "docs(stage-3): mobile polish + review outcomes; visualizer updated"
```

---

## Stage 4 — QA, Cross-Browser, Final Polish

**Outcome:** All 60 places clickable without errors. URL sharing works (open `#day3/osaka_castle` in a new tab → exact same view). Site checked on Chrome desktop, Firefox desktop, Safari iOS (sim), Chrome Android (sim). Known issues documented or fixed. README written.

### Task 4.1: Automated click-through smoke test via browse skill

**Files:**
- Create: `scripts/smoke-test.md` (manual checklist captured)

- [ ] **Step 1: Start the local server**

```bash
python3 -m http.server 8765 --bind 127.0.0.1
```

- [ ] **Step 2: Use the `connect-chrome` or `browse` skill to open the site**

Navigate to `http://127.0.0.1:8765/`. For each day (Day1~Day5):
- Click each stop card in the sidebar.
- Confirm: map flies to coords, detail panel opens, no console errors.
- Click each map marker — confirm same result.
- Click the × on the detail panel — confirm it closes and URL hash drops the place id.
- Reload while a detail is open — confirm it restores.

- [ ] **Step 3: Write the smoke checklist as evidence**

Create `scripts/smoke-test.md`:

```markdown
# Smoke Test Checklist

Run after any change to app.js or data files. Evidence required: console screenshot per day.

- [ ] Day1 — 5 stops clickable, transit cards correct
- [ ] Day2 — 6 stops clickable, Kyoto coords centered
- [ ] Day3 — 7 stops clickable, longest day
- [ ] Day4 — 3 stops (USJ + citywalk + return)
- [ ] Day5 — 2 stops (checkout + airport)
- [ ] Hash `#day3/osaka_castle` deep-link opens exact view
- [ ] Hash `#day9` invalid → falls back to day1 gracefully
- [ ] Refresh restores state
- [ ] No console errors on any page

Last run: <date> by <name>.
```

- [ ] **Step 4: Commit**

```bash
git add scripts/smoke-test.md
git commit -m "test(qa): manual smoke checklist for click-through verification"
```

---

### Task 4.2: Cross-browser sanity check

- [ ] **Step 1: Test in Chrome desktop**

Already done in earlier stages. Re-verify after Stage 3 changes.

- [ ] **Step 2: Test in Firefox desktop**

Open the same URL. Look for: marker icon rendering, Tailwind CDN load, `gap-` utility support (modern Firefox is fine).

- [ ] **Step 3: Test mobile via DevTools device emulation**

Chrome DevTools → iPhone 12 Pro + Pixel 7. Verify tap targets, bottom-tab safe-area on iOS (add `padding-bottom: env(safe-area-inset-bottom)` if cropped).

If safe-area cropping observed, in `assets/styles.css` add:

```css
#mobile-tabs { padding-bottom: env(safe-area-inset-bottom); height: calc(3.5rem + env(safe-area-inset-bottom)); }
```

Then in `main` height calc, swap to:

```css
@media (max-width: 767px) {
  main { height: calc(100vh - 3.5rem - 3.5rem - env(safe-area-inset-bottom)); }
}
```

- [ ] **Step 4: Commit any fixes**

```bash
git add assets/styles.css
git commit -m "fix(mobile): iOS safe-area for bottom tab bar"
```

(Skip this commit if no fix needed.)

---

### Task 4.3: Write `README.md`

**Files:**
- Create: `README.md`

- [ ] **Step 1: Create `README.md`**

```markdown
# 오사카·교토 여행 2026.05.22-26

Doctor Cho의 4박 5일 여행 플랜 인터랙티브 사이트.

## 사용 방법

로컬 HTTP 서버 필요 (`fetch()`가 `file://`에서 막힘):

```bash
python3 -m http.server 8765 --bind 127.0.0.1
# http://127.0.0.1:8765/ 접속
```

또는 호스팅: `index.html`, `assets/`, `data/`만 정적 서버에 올리면 됨.

## 데이터 수정

- `data/itinerary.json` — Day별 stop 순서, 시간, 교통편
- `data/places.json` — 60개 명소 (좌표·설명·맛집·후기 링크)

수정 후 검증:

```bash
node scripts/validate-data.mjs
```

테스트 실행:

```bash
node --test tests/
```

## 디렉토리 구조

| Path | 역할 |
| --- | --- |
| `index.html` | 페이지 셸 |
| `assets/app.js` | 전체 컨트롤러 (vanilla ES6) |
| `assets/styles.css` | day 색상, 모바일 반응형 |
| `data/*.json` | 일정 + 명소 데이터 |
| `scripts/validate-data.mjs` | 데이터 검증 |
| `tests/` | 검증 스크립트 테스트 |
| `docs/stage-N/` | 단계별 진행 기록 |
| `docs/superpowers/specs/` | 설계 문서 |
| `docs/superpowers/plans/` | 구현 계획 |
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: README with run/validate/test instructions"
```

---

### Task 4.4: Stage 4 docs + final review

**Files:**
- Create: `docs/stage-4/qa.md`

- [ ] **Step 1: Write `docs/stage-4/qa.md`** per the standard 5-section format.

```markdown
# Stage 4 — QA + Cross-Browser + README

## Why
모든 명소 클릭 가능한지, URL 공유가 되는지, 모바일 safe-area에 막혀 탭바가 가려지지 않는지, README가 있어서 누가 보든 실행 방법을 알 수 있는지 — 마지막 가드레일.

## What
- `scripts/smoke-test.md`: 수동 회귀 체크리스트
- `assets/styles.css`: iOS safe-area 처리 (필요시)
- `README.md`: 실행/검증/테스트 가이드
- 최종 리뷰 트리오 통과

## How
`browse` 스킬로 60개 stop 전체 클릭, console 에러 없음 확인. Chrome/Firefox/모바일 device emulation. 발견된 이슈는 즉시 픽스.

## Code locations
- `scripts/smoke-test.md`
- `README.md`
- (필요시) `assets/styles.css`

## Retrospective
TBD.
```

- [ ] **Step 2: Final review trio**

Dispatch code-reviewer + gemini-subagent + codex-subagent on the entire branch diff vs `master`. Focus: any regression introduced by Stage 3 polish, any unhandled error case, security (XSS via place.summary using innerHTML — if flagged, switch to `textContent` for user-derived fields and assemble structure via `createElement`).

- [ ] **Step 3: Address + finalize Retrospective + stage-docs-visualizer**

- [ ] **Step 4: Commit**

```bash
git add docs/stage-4/
git commit -m "docs(stage-4): QA + final review outcomes; visualizer updated"
```

- [ ] **Step 5: Open the PR**

```bash
git push -u origin feature/japan-travel-plan
gh pr create --title "Japan travel plan interactive site (2026.05.22-26)" --body "$(cat <<'EOF'
## Summary
- C안 융합형 레이아웃 (데스크톱 사이드바+큰 맵, 모바일 탭 토글)
- Leaflet + OSM, 단일 HTML + JSON 분리
- 60개 명소(메인 15 + 대체 45) 데이터 + 5일 itinerary
- Hash routing, URL 공유 지원
- 데이터 validator (스키마, 좌표 범위, 참조 무결성, URL 안전성)

## Test plan
- [x] `node --test tests/` 통과
- [x] `node scripts/validate-data.mjs` 통과
- [x] `docs/stage-4/qa.md` smoke 체크리스트 완주
- [x] Chrome 데스크톱 + Chrome DevTools mobile emulation OK

## Stage docs
- `docs/stage-1/skeleton.md`
- `docs/stage-2/data.md`
- `docs/stage-3/mobile-polish.md`
- `docs/stage-4/qa.md`

## Spec & Plan
- `docs/superpowers/specs/2026-05-18-japan-travel-plan-design.md`
- `docs/superpowers/plans/2026-05-18-japan-travel-plan.md`
EOF
)"
```

- [ ] **Step 6: Run `codex-pr-review` skill on the PR**

CLAUDE.md global rule. Address findings, then merge.

---

## Self-Review Notes

Cross-checked against `docs/superpowers/specs/2026-05-18-japan-travel-plan-design.md`:

| Spec requirement | Covered by |
| --- | --- |
| C안 융합 레이아웃 | Task 1.1 + Stage 3 (Task 3.1) |
| Leaflet + OSM | Task 1.3 |
| 60개 명소 (main 15 + alt 45) | Stage 2 catalog + research tasks (2.2–2.6) |
| 데이터 분리 (JSON) | Task 1.2 + Stage 2 |
| Day별 색상 코딩 | Task 1.1 (CSS vars) + 1.3 (markers/sidebar) + 3.3 (active sync) |
| Placeholder 이미지 (emoji + 그라데이션) | Task 1.3 (detail header) + 1.3 (markers) |
| Hash 라우팅 | Task 1.3 |
| 디테일: 설명/출처/활동/맛집/후기 링크 | Task 1.3 → Task 3.2 (polish) |
| 모바일 반응형 | Stage 3 (Task 3.1, 3.2, 4.2 safe-area) |
| 단계별 docs/stage-N/*.md + review loop | Tasks 1.4, 2.9, 3.4, 4.4 |
| Git 워크플로 (feature branch, PR) | feature/japan-travel-plan + Task 4.4 step 5 |
| codex-pr-review | Task 4.4 step 6 |

No placeholder strings, no "TBD" outside Retrospective sections (filled at end of each stage), no references to undefined functions. Function names (`renderDay`, `selectStop`, `renderSidebar`, `renderDetail`, `renderProgressBar`, `renderMobileTabs`, `setMobileView`, `parseHash`, `boot`, `loadData`, `initMap`) consistent across all tasks.
