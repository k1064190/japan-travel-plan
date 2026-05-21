const DAY_COLORS = {
  day1: "#e11d48",
  day2: "#7c3aed",
  day3: "#0284c7",
  day4: "#059669",
  day5: "#64748b",
};

/** Returns the color for a day ID, falling back to slate if unknown. */
function dayColor(dayId) {
  return DAY_COLORS[dayId] ?? "#94a3b8";
}

/** Escapes HTML special chars so user-derived strings are safe in innerHTML. */
function esc(s) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** Returns url only if it starts with https://, else "#". For href= safety. */
function safeHref(url) {
  return url && /^https:\/\//.test(url) ? url : "#";
}

function renderActivity(a, color) {
  const text = typeof a === "string" ? a : a?.text || "";
  const link = typeof a === "object" ? a?.link : null;
  const linkBit = link?.url
    ? ` <a href="${safeHref(link.url)}" target="_blank" rel="noopener" class="text-xs underline text-slate-500 hover:text-slate-800" title="${esc(link.title || "")}">후기 →</a>`
    : "";
  return `<li class="flex gap-2"><span style="color:${color}">▸</span><span>${esc(text)}${linkBit}</span></li>`;
}

function renderRating(obj) {
  if (typeof obj?.rating !== "number" || obj.rating <= 0) return "";
  const stars = `★ ${obj.rating.toFixed(2)}`;
  const count =
    typeof obj.review_count === "number" && obj.review_count > 0
      ? ` · 후기 ${obj.review_count.toLocaleString()}개`
      : "";
  const src = obj.rating_source ? ` (${esc(obj.rating_source)})` : "";
  return `<span class="text-xs text-amber-600 font-semibold whitespace-nowrap">${stars}${esc(count)}${src}</span>`;
}

function renderRestaurant(r) {
  const linkBit = r?.link?.url
    ? `<a href="${safeHref(r.link.url)}" target="_blank" rel="noopener" class="block mt-2 text-xs underline text-slate-500 hover:text-slate-800" title="${esc(r.link.title || "")}">한국어 후기 보기 →</a>`
    : "";
  const rating = renderRating(r);
  return `
    <div class="border rounded-lg p-3 hover:bg-slate-50">
      <div class="flex items-baseline justify-between gap-2">
        <div class="font-semibold text-sm">${esc(r.name)}</div>
        <div class="text-xs text-slate-500 whitespace-nowrap">${esc(r.price_range)}</div>
      </div>
      <div class="text-xs text-slate-500 mt-1 flex items-center gap-2 flex-wrap">
        <span>${esc(r.type)}</span>
        ${rating}
      </div>
      <div class="text-sm text-slate-700 mt-1">${esc(r.tip)}</div>
      ${linkBit}
    </div>`;
}

/** Map Korean transit mode strings to Google Maps travelmode values.
 *  Walking and driving require *exact* (trimmed) matches — hybrids like
 *  "미도스지+도보" or "JR환상선+도보" are mixed-mode and must route as
 *  transit, otherwise Google would try to walk a 5 km rail leg. */
function transitModeToGoogleMode(mode) {
  if (!mode) return "transit";
  const m = String(mode).trim();
  if (m === "도보" || /^walk(ing)?$/i.test(m)) return "walking";
  if (/^(택시|렌터카|자동차|taxi|car)$/i.test(m)) return "driving";
  return "transit";
}

/** Build a Google Maps directions URL between two coordinate pairs. */
function buildDirectionsUrl(originCoords, destCoords, mode) {
  if (!Array.isArray(originCoords) || !Array.isArray(destCoords)) return null;
  const [olat, olng] = originCoords;
  const [dlat, dlng] = destCoords;
  if (![olat, olng, dlat, dlng].every(Number.isFinite)) return null;
  const params = new URLSearchParams({
    api: "1",
    origin: `${olat},${olng}`,
    destination: `${dlat},${dlng}`,
    travelmode: transitModeToGoogleMode(mode),
  });
  return `https://www.google.com/maps/dir/?${params.toString()}`;
}

/** Resolve origin/destination places for a given day/stop's transit_from_prev.
 *  Origin precedence: explicit transit_from_prev.origin_place_id > previous
 *  same-day stop > previous-day last stop. The explicit field is what user-
 *  authored intent (e.g., "departing from the hotel") should look like. */
function getTransitEndpoints(dayId, stopIndex) {
  if (!state.itinerary || !state.places) return null;
  const dayIdx = state.itinerary.days.findIndex((d) => d.id === dayId);
  if (dayIdx < 0) return null;
  const day = state.itinerary.days[dayIdx];
  const currStop = day.stops?.[stopIndex];
  if (!currStop?.transit_from_prev) return null;
  const dest = state.places[currStop.place_id];
  if (!dest) return null;
  let origin = null;
  const explicit = currStop.transit_from_prev.origin_place_id;
  if (explicit) {
    origin = state.places[explicit];
  }
  if (!origin && stopIndex > 0) {
    const prev = day.stops[stopIndex - 1];
    origin = state.places[prev?.place_id];
  }
  if (!origin && dayIdx > 0) {
    const prevDay = state.itinerary.days[dayIdx - 1];
    const last = prevDay.stops?.[prevDay.stops.length - 1];
    origin = state.places[last?.place_id];
  }
  return origin ? { origin, dest } : null;
}

function renderBooking(place, color) {
  const b = place?.booking;
  if (!b?.url) return "";
  const reqBadge = b.required
    ? '<span class="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-red-100 text-red-700">필수</span>'
    : '<span class="ml-2 text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600">선택</span>';
  const price =
    Number.isInteger(b.ticket_price_jpy) && b.ticket_price_jpy > 0
      ? `¥${b.ticket_price_jpy.toLocaleString()}`
      : "";
  const advance =
    Number.isInteger(b.advance_days) && b.advance_days > 0
      ? `${b.advance_days}일 전 권장`
      : "당일 가능";
  const meta = [price, advance].filter(Boolean).join(" · ");
  const notes = b.notes
    ? `<div class="text-xs text-slate-600 mt-1">${esc(b.notes)}</div>`
    : "";
  return `
    <h3 class="mt-5 font-semibold text-slate-800">예약${reqBadge}</h3>
    <a href="${safeHref(b.url)}" target="_blank" rel="noopener" class="mt-2 block border rounded-lg p-3 hover:bg-slate-50">
      <div class="text-xs uppercase tracking-wide" style="color:${color}">공식 예약·티켓</div>
      <div class="font-semibold text-sm mt-1">예약 페이지 열기 →</div>
      ${meta ? `<div class="text-xs text-slate-500 mt-1">${esc(meta)}</div>` : ""}
      ${notes}
    </a>`;
}

function renderCuratedLink(link, color) {
  const snippet = link?.snippet
    ? `<div class="text-xs text-slate-600 mt-1 leading-snug">${esc(link.snippet)}</div>`
    : "";
  return `
    <a href="${safeHref(link?.url)}" target="_blank" rel="noopener" class="block border rounded-lg p-3 hover:bg-slate-50">
      <div class="text-xs uppercase tracking-wide" style="color:${color}">${esc(link?.source || "")}</div>
      <div class="font-semibold text-sm mt-1">${esc(link?.title || "")}</div>
      ${snippet}
    </a>`;
}

const state = {
  itinerary: null,
  places: null,
  activeDay: "day1",
  activeStopIndex: 0,
  map: null,
  markerLayer: null,
  altLayer: null,
  routeLayer: null,
  filterFood: false, // "맛집만" 토글
  showFarCandidates: false, // 반경 너머 후보도 함께
};

const ALT_PROXIMITY_KM = 2.0;
const ALT_FAR_KM = 8.0; // showFarCandidates 켰을 때 인정 거리

const FOOD_TAG_RE =
  /맛집|라멘|스시|회전초밥|카츠|우동|소바|야끼니쿠|쿠시카츠|타코야키|오코노미야키|디저트|카페|이자카야|카레|화과자|두부|텐푸라|스키야키|장어|파르페|베이커리|야끼소바|정식/;

// Places with a numeric rating are assumed to be food venues (the rating
// schema is only populated for restaurants in the current data). Unrated
// places need an explicit food-keyword tag to count as food.
function isFoodPlace(place) {
  if (!place) return false;
  if (typeof place.rating === "number") return true;
  return (place.tags || []).some((t) => FOOD_TAG_RE.test(t));
}

function haversineKm(c1, c2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371;
  const lat1 = toRad(c1[0]);
  const lat2 = toRad(c2[0]);
  const dLat = lat2 - lat1;
  const dLng = toRad(c2[1] - c1[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/** Return alt-category place ids within the configured radius of the day's
 *  stops. Opts:
 *  - foodOnly: keep only food places (isFoodPlace)
 *  - far: use ALT_FAR_KM instead of ALT_PROXIMITY_KM
 *  Always excludes ids already in the day's stops. */
function isClosedPlace(place) {
  return (place?.tags || []).includes("폐점");
}

function altCandidatesForDay(day, opts = {}) {
  if (!day?.stops?.length) return [];
  const radius = opts.far ? ALT_FAR_KM : ALT_PROXIMITY_KM;
  const stopIds = new Set(day.stops.map((s) => s.place_id));
  const stopCoords = day.stops
    .map((s) => state.places[s.place_id]?.coords)
    .filter((c) => Array.isArray(c));
  const out = [];
  for (const [id, place] of Object.entries(state.places)) {
    if (place.category !== "alt") continue;
    if (stopIds.has(id)) continue;
    if (!Array.isArray(place.coords)) continue;
    if (isClosedPlace(place)) continue; // hide [폐점] entries from candidates
    if (opts.foodOnly && !isFoodPlace(place)) continue;
    const near = stopCoords.some(
      (sc) => haversineKm(sc, place.coords) <= radius,
    );
    if (near) out.push(id);
  }
  return out;
}

async function loadData() {
  const [it, pl] = await Promise.all([
    fetch("data/itinerary.json").then((r) => {
      if (!r.ok) throw new Error(`itinerary.json: HTTP ${r.status}`);
      return r.json();
    }),
    fetch("data/places.json").then((r) => {
      if (!r.ok) throw new Error(`places.json: HTTP ${r.status}`);
      return r.json();
    }),
  ]);
  state.itinerary = it;
  state.places = pl;
}

function initMap() {
  state.map = L.map("map", { zoomControl: true }).setView(
    [34.668, 135.501],
    13,
  );
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
    attribution: "&copy; OpenStreetMap",
  }).addTo(state.map);
  // Stack order: routes (bottom) → alt candidates → numbered stops (top).
  // The numbered stop markers must be on top so clicks land on them, not on
  // an overlapping alt candidate (alts are smaller but can sit at the same
  // coordinate when a stop is also itself a candidate's neighbor).
  state.routeLayer = L.layerGroup().addTo(state.map);
  state.altLayer = L.layerGroup().addTo(state.map);
  state.markerLayer = L.layerGroup().addTo(state.map);
  state.highlightLayer = L.layerGroup().addTo(state.map);

  addLocateControl();
}

let userLocationMarker = null;
let userLocationAccuracy = null;

function addLocateControl() {
  const LocateControl = L.Control.extend({
    options: { position: "topleft" },
    onAdd() {
      const btn = L.DomUtil.create(
        "button",
        "leaflet-bar leaflet-control-locate",
      );
      btn.type = "button";
      btn.innerHTML = "📍";
      btn.title = "내 위치 (GPS)";
      btn.setAttribute("aria-label", "내 위치로 이동");
      L.DomEvent.disableClickPropagation(btn);
      L.DomEvent.on(btn, "click", requestLocation);
      return btn;
    },
  });
  state.map.addControl(new LocateControl());
}

function requestLocation() {
  if (!("geolocation" in navigator)) {
    alert("이 브라우저는 GPS를 지원하지 않습니다.");
    return;
  }
  // Browser policy: Geolocation requires HTTPS or localhost. LAN-HTTP may
  // surface the PERMISSION_DENIED error path (code 1) on some browsers.
  navigator.geolocation.getCurrentPosition(
    (pos) => {
      const { latitude, longitude, accuracy } = pos.coords;
      const ll = [latitude, longitude];
      if (userLocationMarker) state.map.removeLayer(userLocationMarker);
      if (userLocationAccuracy) state.map.removeLayer(userLocationAccuracy);
      userLocationAccuracy = L.circle(ll, {
        radius: Math.max(20, Math.min(accuracy || 50, 500)),
        color: "#3b82f6",
        weight: 1,
        opacity: 0.4,
        fillColor: "#3b82f6",
        fillOpacity: 0.1,
      }).addTo(state.map);
      userLocationMarker = L.circleMarker(ll, {
        radius: 8,
        color: "#1d4ed8",
        weight: 2,
        fillColor: "#3b82f6",
        fillOpacity: 0.9,
      })
        .bindTooltip("내 위치", { permanent: false, direction: "top" })
        .addTo(state.map);
      state.map.flyTo(ll, 16, { duration: 0.8 });
    },
    (err) => {
      const reasons = {
        1: "위치 권한이 거부됐습니다. 브라우저 설정에서 허용해주세요.",
        2: "위치를 확인할 수 없습니다 (신호 없음).",
        3: "위치 요청이 시간 초과됐습니다.",
      };
      alert(reasons[err.code] || `위치 오류: ${err.message}`);
    },
    { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 },
  );
}

/** Drop a short-lived expanding ring at the given coords so the user can
 *  spot the exact pin after a flyTo. Auto-removes when the CSS animation
 *  finishes (~1.4s). Day-color borders so the ring matches the marker.
 *  Markers go into state.highlightLayer so renderDay can clear them when
 *  the user switches days before the timer fires. */
function highlightLocation(coords, color) {
  if (!Array.isArray(coords) || !state.highlightLayer) return;
  const ringColor = color || dayColor(state.activeDay);
  const icon = L.divIcon({
    className: "",
    html: `<div class="highlight-ring" style="border-color:${ringColor}"></div>`,
    iconSize: [60, 60],
    iconAnchor: [30, 30],
  });
  const marker = L.marker(coords, {
    icon,
    interactive: false,
    keyboard: false,
    zIndexOffset: 2000,
  }).addTo(state.highlightLayer);
  setTimeout(() => {
    if (state.highlightLayer && state.highlightLayer.hasLayer(marker)) {
      state.highlightLayer.removeLayer(marker);
    }
  }, 1500);
}

let pendingLocateBurst = null;
function scheduleLocateBurst(coords, delayMs) {
  if (pendingLocateBurst) clearTimeout(pendingLocateBurst);
  pendingLocateBurst = setTimeout(() => {
    pendingLocateBurst = null;
    highlightLocation(coords);
  }, delayMs);
}

function renderDay(dayId) {
  const day = state.itinerary.days.find((d) => d.id === dayId);
  if (!day) return;
  state.activeDay = dayId;
  document.body.style.setProperty("--active-day", dayColor(dayId));
  state.markerLayer.clearLayers();
  state.altLayer.clearLayers();
  state.routeLayer.clearLayers();
  state.highlightLayer.clearLayers();
  if (pendingLocateBurst) {
    clearTimeout(pendingLocateBurst);
    pendingLocateBurst = null;
  }

  const color = dayColor(dayId);
  const coords = [];

  // Alt-candidate markers under the numbered ones (smaller, grey).
  const altIds = altCandidatesForDay(day, {
    foodOnly: state.filterFood,
    far: state.showFarCandidates,
  });
  for (const altId of altIds) {
    const altPlace = state.places[altId];
    const altIcon = L.divIcon({
      className: "",
      html: `<div class="alt-marker" title="${esc(altPlace.name_ko)}" style="border-color:${color}">${esc(altPlace.emoji || "·")}</div>`,
      iconSize: [22, 22],
      iconAnchor: [11, 11],
    });
    const altMarker = L.marker(altPlace.coords, {
      icon: altIcon,
      keyboard: false,
    }).addTo(state.altLayer);
    altMarker.bindTooltip(esc(altPlace.name_ko), {
      direction: "top",
      offset: [0, -10],
    });
    altMarker.on("click", () => selectAlt(altId));
  }

  day.stops.forEach((stop, i) => {
    const place = state.places[stop.place_id];
    if (!place) return;
    const icon = L.divIcon({
      className: "",
      html: `<div class="numbered-marker" style="background:${color}">${i + 1}</div>`,
      iconSize: [32, 32],
      iconAnchor: [16, 16],
    });
    const marker = L.marker(place.coords, { icon }).addTo(state.markerLayer);
    marker.on("click", () => selectStop(dayId, i));
    coords.push(place.coords);
  });

  if (coords.length > 1) {
    L.polyline(coords, {
      color,
      weight: 3,
      opacity: 0.6,
      dashArray: "6,8",
    }).addTo(state.routeLayer);
  }
  if (coords.length > 0) {
    state.map.fitBounds(L.latLngBounds(coords).pad(0.2));
  }
}

function selectAlt(placeId) {
  const place = state.places[placeId];
  if (!place) return;
  state.map.flyTo(place.coords, 16, { duration: 0.8 });
  highlightLocation(place.coords);
  // Render the detail panel with a minimal "stop" — no time/duration/transit
  renderDetail(
    {
      place_id: placeId,
      time: null,
      duration_minutes: null,
      transit_from_prev: null,
    },
    place,
  );
  if (window.matchMedia("(max-width: 767px)").matches) {
    setMobileView("map");
  }
}

function selectStop(dayId, stopIndex) {
  const day = state.itinerary.days.find((d) => d.id === dayId);
  if (!day || !day.stops[stopIndex]) return;
  state.activeDay = dayId;
  state.activeStopIndex = stopIndex;
  state.markerLayer.eachLayer((m) => {
    const el = m.getElement();
    if (el) {
      const inner = el.querySelector(".numbered-marker");
      if (inner) inner.classList.remove("active");
    }
    m.setZIndexOffset(0);
  });
  const markers = state.markerLayer.getLayers();
  if (markers[stopIndex]) {
    const el = markers[stopIndex].getElement();
    if (el) el.querySelector(".numbered-marker")?.classList.add("active");
    markers[stopIndex].setZIndexOffset(1000);
  }
  const stop = day.stops[stopIndex];
  const place = state.places[stop.place_id];
  if (!place) return;
  state.map.flyTo(place.coords, 16, { duration: 0.8 });
  highlightLocation(place.coords);
  location.hash = `#${dayId}/${stop.place_id}`;
  renderSidebar();
  renderDetail(stop, place);
  if (window.matchMedia("(max-width: 767px)").matches) {
    setMobileView("map");
  }
}

function renderSidebar() {
  const sidebar = document.getElementById("sidebar");
  const day = state.itinerary.days.find((d) => d.id === state.activeDay);
  const color = dayColor(state.activeDay);

  // Compute candidate list (filtered + sorted by rating desc; no-rating last)
  const altIds = altCandidatesForDay(day, {
    foodOnly: state.filterFood,
    far: state.showFarCandidates,
  });
  const altPlaces = altIds
    .map((id) => ({ id, place: state.places[id] }))
    .filter(({ place }) => !!place)
    .sort((a, b) => {
      const ra = Number.isFinite(a.place.rating) ? a.place.rating : -1;
      const rb = Number.isFinite(b.place.rating) ? b.place.rating : -1;
      if (rb !== ra) return rb - ra;
      return (a.place.name_ko || "").localeCompare(b.place.name_ko || "", "ko");
    });

  const altCardsHtml = altPlaces
    .map(({ id, place }) => {
      const ratingHtml = renderRating(place);
      const tagsLine = (place.tags || [])
        .slice(0, 3)
        .map((t) => esc(t))
        .join(" · ");
      return `
        <li>
          <button data-alt="${esc(id)}" class="w-full text-left p-3 border-b hover:bg-slate-50">
            <div class="flex items-center gap-3">
              <div class="alt-marker shrink-0" style="border-color:${color}">${esc(place.emoji || "·")}</div>
              <div class="flex-1 min-w-0">
                <div class="font-semibold text-sm truncate">${esc(place.name_ko)}</div>
                <div class="text-xs text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                  <span>${tagsLine}</span>
                  ${ratingHtml}
                </div>
              </div>
            </div>
          </button>
        </li>`;
    })
    .join("");

  // Always show controls when the day has stops — otherwise a day with zero
  // candidates at the current radius would hide the '먼 후보도' toggle the user
  // needs to discover anything.
  const candidateSection = day.stops?.length
    ? `
    <div class="p-3 border-t border-b bg-slate-50">
      <div class="flex items-center justify-between gap-2 mb-2">
        <h3 class="font-semibold text-sm text-slate-700">주변 후보 (${altPlaces.length})</h3>
      </div>
      <div class="flex items-center gap-3 flex-wrap text-xs">
        <label class="inline-flex items-center gap-1 cursor-pointer">
          <input type="checkbox" id="filter-food" ${state.filterFood ? "checked" : ""}> 맛집만
        </label>
        <label class="inline-flex items-center gap-1 cursor-pointer">
          <input type="checkbox" id="filter-far" ${state.showFarCandidates ? "checked" : ""}> 먼 후보도 보기
        </label>
      </div>
    </div>
    <ul>${altCardsHtml}</ul>`
    : "";

  sidebar.innerHTML = `
    <div class="p-4 border-b" style="border-color:${color}">
      <div class="text-xs uppercase tracking-wide" style="color:${color}">${esc(day.date)} (${esc(day.weekday)})</div>
      <h2 class="text-lg font-bold mt-1">${esc(day.title)}</h2>
    </div>
    <ul>
      ${day.stops
        .map((stop, i) => {
          const place = state.places[stop.place_id];
          if (!place) return "";
          const active = i === state.activeStopIndex;
          const tp = stop.transit_from_prev;
          const costLabel =
            tp == null || tp.cost_jpy == null
              ? ""
              : tp.cost_jpy === 0
                ? " · 무료"
                : ` · ¥${esc(tp.cost_jpy)}`;
          const transit = tp
            ? `<div class="text-xs text-slate-500 mb-1">↳ ${esc(tp.mode)} · ${esc(tp.minutes)}분${costLabel}</div>`
            : "";
          return `
          <li>
            ${transit}
            <button data-stop="${i}" class="w-full text-left p-3 border-b hover:bg-slate-50 ${active ? "bg-slate-100" : ""}">
              <div class="flex items-center gap-3">
                <div class="numbered-marker" style="background:${color};width:28px;height:28px;font-size:12px">${i + 1}</div>
                <div class="flex-1">
                  <div class="font-semibold">${esc(place.name_ko)}</div>
                  <div class="text-xs text-slate-500">${esc(stop.time)} · ${esc(stop.duration_minutes)}분</div>
                </div>
                <div class="text-2xl">${esc(place.emoji)}</div>
              </div>
            </button>
          </li>`;
        })
        .join("")}
    </ul>
    ${candidateSection}`;
  sidebar.querySelectorAll("button[data-stop]").forEach((btn) => {
    btn.addEventListener("click", () =>
      selectStop(state.activeDay, Number(btn.dataset.stop)),
    );
  });
  sidebar.querySelectorAll("button[data-alt]").forEach((btn) => {
    btn.addEventListener("click", () => selectAlt(btn.dataset.alt));
  });
  const foodFilter = sidebar.querySelector("#filter-food");
  if (foodFilter) {
    foodFilter.addEventListener("change", (e) => {
      state.filterFood = e.target.checked;
      renderDay(state.activeDay);
      renderSidebar();
    });
  }
  const farFilter = sidebar.querySelector("#filter-far");
  if (farFilter) {
    farFilter.addEventListener("change", (e) => {
      state.showFarCandidates = e.target.checked;
      renderDay(state.activeDay);
      renderSidebar();
    });
  }
}

function renderDetail(stop, place) {
  if (!place) {
    console.warn(`renderDetail: missing place for stop`, stop);
    return;
  }
  const detail = document.getElementById("detail");
  detail.classList.remove("hidden");
  const color = dayColor(state.activeDay);
  const t = stop.transit_from_prev;
  const endpoints = t
    ? getTransitEndpoints(state.activeDay, state.activeStopIndex)
    : null;
  const dirUrl = endpoints
    ? buildDirectionsUrl(endpoints.origin.coords, endpoints.dest.coords, t.mode)
    : null;
  const dirButton = dirUrl
    ? `<a href="${safeHref(dirUrl)}" target="_blank" rel="noopener" class="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded border hover:bg-slate-100" style="border-color:${color};color:${color}">Google Maps에서 실제 경로·시간 보기 →</a>`
    : "";
  const transitBookingButton =
    t && typeof t.booking_url === "string" && /^https:\/\//.test(t.booking_url)
      ? `<a href="${safeHref(t.booking_url)}" target="_blank" rel="noopener" class="inline-block mt-2 ml-2 text-xs font-semibold px-3 py-1 rounded border bg-white hover:bg-slate-100" style="border-color:${color};color:${color}">🎫 e-티켓 예약 →</a>`
      : "";
  const transitCard = t
    ? `
    <div class="mx-5 mt-4 p-3 rounded border-l-4 bg-slate-50" style="border-color:${color}">
      <div class="text-xs uppercase tracking-wide text-slate-500">전 stop에서 오는 길</div>
      <div class="font-semibold mt-1">${esc(t.from)} → ${esc(t.to)}</div>
      <div class="text-sm text-slate-600 mt-1">
        ${esc(t.mode)} · ${esc(t.minutes)}분${t.cost_jpy ? ` · ¥${esc(t.cost_jpy)}` : " · 무료"}
      </div>
      ${t.note ? `<div class="text-xs text-slate-500 mt-1">${esc(t.note)}</div>` : ""}
      ${dirButton}${transitBookingButton}
    </div>`
    : "";

  const rl = place.review_links || {};
  detail.innerHTML = `
    <div class="h-40 flex items-center justify-center text-7xl relative" style="background:linear-gradient(135deg,${color}33,${color}66)">
      ${esc(place.emoji)}
      <button id="detail-locate" aria-label="맵에서 위치 보기" class="absolute top-2 right-12 px-3 h-9 rounded-full bg-white/90 text-slate-700 text-xs font-semibold hover:bg-white">📍 맵에서 보기</button>
      <button id="detail-close" aria-label="상세 패널 닫기" class="absolute top-2 right-2 w-9 h-9 rounded-full bg-white/90 text-slate-600 text-xl">×</button>
    </div>
    ${transitCard}
    <div class="p-5">
      <div class="text-xs uppercase tracking-wide" style="color:${color}">${stop.time ? `${esc(stop.time)} · ${esc(stop.duration_minutes)}분 체류` : "후보 — 일정에 들어있지 않음"}</div>
      <h2 class="text-2xl font-bold mt-1">${esc(place.name_ko)}</h2>
      <div class="text-sm text-slate-500">${esc(place.name_jp)}</div>
      ${(() => {
        const r = renderRating(place);
        return r ? `<div class="mt-1">${r}</div>` : "";
      })()}
      <div class="mt-2 flex gap-1 flex-wrap">
        ${(place.tags || []).map((tag) => `<span class="text-xs px-2 py-1 rounded bg-slate-100 text-slate-600">#${esc(tag)}</span>`).join("")}
      </div>
      <p class="mt-3 text-slate-700">${esc(place.summary)}</p>
      <p class="mt-2 text-sm text-slate-600 leading-relaxed">${esc(place.detail)}</p>

      ${
        place.activities && place.activities.length
          ? `
        <h3 class="mt-5 font-semibold text-slate-800">여기서 해야 할 것</h3>
        <ul class="mt-2 space-y-1 text-sm">
          ${place.activities.map((a) => renderActivity(a, color)).join("")}
        </ul>`
          : ""
      }

      ${renderBooking(place, color)}

      ${
        place.restaurants && place.restaurants.length
          ? `
        <h3 class="mt-5 font-semibold text-slate-800">추천 맛집 (${place.restaurants.length})</h3>
        <div class="mt-2 space-y-2">
          ${place.restaurants.map((r) => renderRestaurant(r)).join("")}
        </div>`
          : ""
      }

      ${
        Array.isArray(place.curated_links) && place.curated_links.length
          ? `
        <h3 class="mt-5 font-semibold text-slate-800">한국어 블로그 후기</h3>
        <div class="mt-2 space-y-2">
          ${place.curated_links.map((link) => renderCuratedLink(link, color)).join("")}
        </div>`
          : ""
      }

      <h3 class="mt-5 font-semibold text-xs uppercase tracking-wide text-slate-500">${Array.isArray(place.curated_links) && place.curated_links.length ? "더 찾아보기" : "한국어 후기 검색"}</h3>
      <div class="mt-2 grid grid-cols-3 gap-2 text-sm text-center">
        <a class="px-3 py-2 rounded border hover:bg-slate-50" href="${safeHref(rl.naver)}" target="_blank" rel="noopener">네이버<br><span class="text-xs text-slate-400">블로그</span></a>
        <a class="px-3 py-2 rounded border hover:bg-slate-50" href="${safeHref(rl.google)}" target="_blank" rel="noopener">구글<br><span class="text-xs text-slate-400">웹</span></a>
        <a class="px-3 py-2 rounded border hover:bg-slate-50" href="${safeHref(rl.youtube)}" target="_blank" rel="noopener">유튜브<br><span class="text-xs text-slate-400">영상</span></a>
      </div>

      ${
        place.sources && place.sources.length
          ? `
        <h3 class="mt-5 font-semibold text-xs uppercase tracking-wide text-slate-500">출처</h3>
        <ul class="text-xs text-slate-500 mt-1 space-y-1">
          ${place.sources.map((s) => `<li>· <a class="underline hover:text-slate-800" href="${safeHref(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a></li>`).join("")}
        </ul>`
          : ""
      }

      <div class="h-8"></div>
    </div>`;
  detail.querySelector("#detail-close").addEventListener("click", () => {
    detail.classList.add("hidden");
    history.replaceState(null, "", `#${state.activeDay}`);
  });
  detail.querySelector("#detail-locate").addEventListener("click", () => {
    if (!Array.isArray(place.coords)) return;
    // Close the panel so the map is unobstructed, then fly in close.
    detail.classList.add("hidden");
    // Same hash hygiene as #detail-close: drop the place segment so a
    // reload doesn't reopen the panel that the user just dismissed.
    history.replaceState(null, "", `#${state.activeDay}`);
    if (window.matchMedia("(max-width: 767px)").matches) {
      setMobileView("map");
    }
    state.map.flyTo(place.coords, 18, { duration: 0.8 });
    // Burst the highlight ring slightly after flyTo so the user sees it
    // land — flyTo with duration 0.8s; trigger the ring at ~600ms so the
    // 1.4s animation peaks roughly when the camera settles. Use
    // scheduleLocateBurst so a quick day-change between click and burst
    // cancels the stale ring instead of dropping it on the wrong pin.
    scheduleLocateBurst(place.coords, 600);
  });
}

function renderProgressBar() {
  const bar = document.getElementById("progress-bar");
  bar.innerHTML = `
    <div class="font-bold text-slate-800 mr-4">${esc(state.itinerary.trip.title)}</div>
    <div class="flex gap-1">
      ${state.itinerary.days
        .map(
          (d) => `
        <button data-day="${esc(d.id)}" class="px-3 py-1 rounded text-xs font-semibold border ${d.id === state.activeDay ? "text-white" : "text-slate-600"}"
                style="${d.id === state.activeDay ? `background:${dayColor(d.id)};border-color:${dayColor(d.id)}` : `border-color:${dayColor(d.id)};color:${dayColor(d.id)}`}">
          ${esc(d.id.toUpperCase())} · ${esc(d.date.slice(5))}
        </button>`,
        )
        .join("")}
    </div>`;
  bar.querySelectorAll("button[data-day]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.activeStopIndex = 0;
      renderDay(btn.dataset.day);
      renderSidebar();
      renderProgressBar();
      document.getElementById("detail").classList.add("hidden");
      location.hash = `#${btn.dataset.day}`;
    });
  });
  renderChecklistToggle();
}

function setMobileView(view) {
  document
    .getElementById("sidebar")
    .classList.toggle("active", view === "list");
  document
    .getElementById("checklist")
    .classList.toggle("active-mobile", view === "checklist");
  document
    .getElementById("map")
    .classList.toggle("hidden-mobile", view === "list" || view === "checklist");
  document.querySelectorAll("#mobile-tabs button").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
  });
}

function renderMobileTabs() {
  document.querySelectorAll("#mobile-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const view = btn.dataset.view;
      if (view === "checklist") {
        renderChecklistPanel();
        document.getElementById("checklist").classList.remove("hidden");
      }
      setMobileView(view);
    });
  });
  setMobileView("map");
}

const RESERVATIONS_KEY = "reservations";

function loadReservations() {
  try {
    const raw = localStorage.getItem(RESERVATIONS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

function setReservationDone(id, done) {
  const map = loadReservations();
  if (done) map[id] = true;
  else delete map[id];
  try {
    localStorage.setItem(RESERVATIONS_KEY, JSON.stringify(map));
  } catch {
    /* quota or disabled — silent */
  }
}

/** Collect all reservation items: place.booking entries + transit booking_url. */
function collectReservationItems() {
  const items = [];
  for (const [id, place] of Object.entries(state.places || {})) {
    if (place?.booking?.url) {
      items.push({
        id: `place:${id}`,
        kind: "place",
        place_id: id,
        name: place.name_ko,
        emoji: place.emoji,
        url: place.booking.url,
        required: !!place.booking.required,
        advance_days: Number.isInteger(place.booking.advance_days)
          ? place.booking.advance_days
          : 0,
        ticket_price_jpy: Number.isInteger(place.booking.ticket_price_jpy)
          ? place.booking.ticket_price_jpy
          : 0,
        notes: place.booking.notes || "",
      });
    }
  }
  for (const day of state.itinerary?.days || []) {
    for (const stop of day.stops || []) {
      const url = stop.transit_from_prev?.booking_url;
      if (typeof url === "string" && /^https:\/\//.test(url)) {
        const place = state.places?.[stop.place_id];
        const t = stop.transit_from_prev;
        items.push({
          id: `transit:${day.id}:${stop.place_id}`,
          kind: "transit",
          place_id: stop.place_id,
          name: `${t.from || ""} → ${t.to || place?.name_ko || ""}`,
          emoji: "🎫",
          url,
          required: true,
          advance_days: 1,
          ticket_price_jpy: Number.isFinite(t.cost_jpy) ? t.cost_jpy : 0,
          notes: t.note || `${day.id.toUpperCase()} ${t.mode || ""}`.trim(),
        });
      }
    }
  }
  return items;
}

function renderChecklistPanel() {
  const panel = document.getElementById("checklist");
  if (!panel) return;
  const items = collectReservationItems();
  const done = loadReservations();
  const required = items.filter((i) => i.required);
  const completedCount = required.filter((i) => done[i.id]).length;
  const sorted = items.slice().sort((a, b) => {
    const da = !!done[a.id];
    const db = !!done[b.id];
    if (da !== db) return da ? 1 : -1; // pending first
    if (a.required !== b.required) return a.required ? -1 : 1; // required first
    return (a.advance_days || 0) - (b.advance_days || 0); // sooner first
  });
  const cardsHtml = sorted
    .map((it) => {
      const isDone = !!done[it.id];
      const reqBadge = it.required
        ? '<span class="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-red-100 text-red-700">필수</span>'
        : '<span class="ml-2 text-[10px] font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">선택</span>';
      const price =
        it.ticket_price_jpy > 0
          ? `¥${it.ticket_price_jpy.toLocaleString()}`
          : "";
      const advance =
        it.advance_days > 0 ? `${it.advance_days}일 전 권장` : "당일 가능";
      const meta = [price, advance].filter(Boolean).join(" · ");
      const notes = it.notes
        ? `<div class="text-xs text-slate-500 mt-1">${esc(it.notes)}</div>`
        : "";
      return `
        <li class="checklist-card ${isDone ? "checklist-done" : ""} border-b p-3">
          <div class="flex items-start gap-2">
            <input type="checkbox" data-checklist-id="${esc(it.id)}" ${isDone ? "checked" : ""} class="mt-1 shrink-0" aria-label="${esc(it.name)} 예약 완료" />
            <div class="flex-1 min-w-0">
              <div class="flex items-center gap-1 flex-wrap">
                <span>${esc(it.emoji || "·")}</span>
                <span class="font-semibold text-sm">${esc(it.name)}</span>
                ${reqBadge}
              </div>
              <div class="text-xs text-slate-500 mt-1">${esc(meta)}</div>
              ${notes}
              <a href="${safeHref(it.url)}" target="_blank" rel="noopener" class="inline-block mt-2 text-xs font-semibold px-3 py-1 rounded border bg-white hover:bg-slate-100 text-slate-700">예약하기 →</a>
            </div>
          </div>
        </li>`;
    })
    .join("");

  const total = required.length;
  const pct = total > 0 ? Math.round((completedCount / total) * 100) : 0;
  panel.innerHTML = `
    <div class="p-4 border-b sticky top-0 bg-white z-10">
      <div class="flex items-center justify-between gap-2">
        <h2 class="text-lg font-bold">🎫 예약 체크리스트</h2>
        <button id="checklist-close" aria-label="체크리스트 닫기" class="w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-600 hidden md:block">×</button>
      </div>
      <div class="text-xs text-slate-500 mt-1">필수 ${completedCount}/${total} 완료${total === 0 ? " — 예약할 항목이 없습니다" : ""}</div>
      <div class="mt-2 h-2 bg-slate-200 rounded overflow-hidden">
        <div class="h-full bg-emerald-500 transition-all" style="width:${pct}%"></div>
      </div>
    </div>
    <ul>${cardsHtml || '<li class="p-4 text-sm text-slate-500">예약 항목 없음</li>'}</ul>`;

  panel.querySelectorAll("input[data-checklist-id]").forEach((cb) => {
    cb.addEventListener("change", (e) => {
      setReservationDone(e.target.dataset.checklistId, e.target.checked);
      renderChecklistPanel();
      renderChecklistToggle();
    });
  });
  const closeBtn = panel.querySelector("#checklist-close");
  if (closeBtn) {
    closeBtn.addEventListener("click", () => {
      panel.classList.add("hidden");
      renderChecklistToggle();
    });
  }
}

function renderChecklistToggle() {
  const bar = document.getElementById("progress-bar");
  if (!bar) return;
  let btn = bar.querySelector("#checklist-toggle");
  const items = collectReservationItems();
  const required = items.filter((i) => i.required);
  const done = loadReservations();
  const completedCount = required.filter((i) => done[i.id]).length;
  const isOpen = !document
    .getElementById("checklist")
    .classList.contains("hidden");
  const label = `🎫 예약 ${completedCount}/${required.length}`;
  if (!btn) {
    btn = document.createElement("button");
    btn.id = "checklist-toggle";
    btn.className =
      "ml-auto md:inline-flex hidden items-center px-3 h-9 rounded border text-xs font-semibold hover:bg-slate-50";
    btn.addEventListener("click", () => {
      const panel = document.getElementById("checklist");
      if (panel.classList.contains("hidden")) {
        renderChecklistPanel();
        panel.classList.remove("hidden");
      } else {
        panel.classList.add("hidden");
      }
      renderChecklistToggle();
    });
    bar.appendChild(btn);
  }
  btn.textContent = isOpen
    ? `✕ 예약 ${completedCount}/${required.length}`
    : label;
}

function parseHash() {
  const [day, placeId] = location.hash.replace("#", "").split("/");
  if (!day) return { day: "day1", stopIndex: 0, open: false };
  const dayObj = state.itinerary.days.find((d) => d.id === day);
  if (!dayObj) return { day: "day1", stopIndex: 0, open: false };
  if (!placeId) return { day, stopIndex: 0, open: false };
  const idx = dayObj.stops.findIndex((s) => s.place_id === placeId);
  return { day, stopIndex: idx >= 0 ? idx : 0, open: idx >= 0 };
}

function buildHash(day, stopIndex, open) {
  if (!open) return `#${day}`;
  const placeId = state.itinerary.days.find((d) => d.id === day)?.stops?.[
    stopIndex
  ]?.place_id;
  return placeId ? `#${day}/${placeId}` : `#${day}`;
}

async function boot() {
  try {
    await loadData();
  } catch (err) {
    document.body.innerHTML =
      `<p style="padding:2rem;font-family:sans-serif;color:#dc2626">` +
      `데이터를 불러오지 못했습니다: ${err.message}</p>`;
    return;
  }
  initMap();
  const { day, stopIndex, open } = parseHash();
  const expectedHash = buildHash(day, stopIndex, open);
  if (location.hash !== expectedHash) {
    history.replaceState(null, "", expectedHash);
  }
  state.activeDay = day;
  state.activeStopIndex = stopIndex;
  renderDay(day);
  renderProgressBar();
  if (open) {
    selectStop(day, stopIndex);
  } else {
    renderSidebar();
  }
  renderMobileTabs();
}

window.addEventListener("hashchange", () => {
  if (!state.itinerary) return;
  const { day, stopIndex, open } = parseHash();
  const expectedHash = buildHash(day, stopIndex, open);
  if (location.hash !== expectedHash) {
    history.replaceState(null, "", expectedHash);
  }
  const dayChanged = day !== state.activeDay;
  const stopChanged = stopIndex !== state.activeStopIndex;
  const detail = document.getElementById("detail");
  const detailVisible = !detail.classList.contains("hidden");
  if (!dayChanged && !stopChanged && open === detailVisible) {
    return;
  }
  state.activeDay = day;
  state.activeStopIndex = stopIndex;
  if (dayChanged) {
    renderDay(day);
    renderProgressBar();
  }
  if (open) {
    selectStop(day, stopIndex);
  } else {
    renderSidebar();
    detail.classList.add("hidden");
  }
});

boot();
