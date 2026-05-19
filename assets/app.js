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
  const stars = `★ ${obj.rating.toFixed(1)}`;
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
};

const ALT_PROXIMITY_KM = 1.5;

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

/** Return alt-category place ids within ALT_PROXIMITY_KM of any of the
 *  given day's stop coordinates. Excludes ids already in the day's stops. */
function altCandidatesForDay(day) {
  if (!day?.stops?.length) return [];
  const stopIds = new Set(day.stops.map((s) => s.place_id));
  const stopCoords = day.stops
    .map((s) => state.places[s.place_id]?.coords)
    .filter((c) => Array.isArray(c));
  const out = [];
  for (const [id, place] of Object.entries(state.places)) {
    if (place.category !== "alt") continue;
    if (stopIds.has(id)) continue;
    if (!Array.isArray(place.coords)) continue;
    const near = stopCoords.some(
      (sc) => haversineKm(sc, place.coords) <= ALT_PROXIMITY_KM,
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
}

function renderDay(dayId) {
  const day = state.itinerary.days.find((d) => d.id === dayId);
  if (!day) return;
  state.activeDay = dayId;
  document.body.style.setProperty("--active-day", dayColor(dayId));
  state.markerLayer.clearLayers();
  state.altLayer.clearLayers();
  state.routeLayer.clearLayers();

  const color = dayColor(dayId);
  const coords = [];

  // Alt-candidate markers under the numbered ones (smaller, grey).
  for (const altId of altCandidatesForDay(day)) {
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
    </ul>`;
  sidebar.querySelectorAll("button[data-stop]").forEach((btn) => {
    btn.addEventListener("click", () =>
      selectStop(state.activeDay, Number(btn.dataset.stop)),
    );
  });
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
  const transitCard = t
    ? `
    <div class="mx-5 mt-4 p-3 rounded border-l-4 bg-slate-50" style="border-color:${color}">
      <div class="text-xs uppercase tracking-wide text-slate-500">전 stop에서 오는 길</div>
      <div class="font-semibold mt-1">${esc(t.from)} → ${esc(t.to)}</div>
      <div class="text-sm text-slate-600 mt-1">
        ${esc(t.mode)} · ${esc(t.minutes)}분${t.cost_jpy ? ` · ¥${esc(t.cost_jpy)}` : " · 무료"}
      </div>
      ${t.note ? `<div class="text-xs text-slate-500 mt-1">${esc(t.note)}</div>` : ""}
      ${dirButton}
    </div>`
    : "";

  const rl = place.review_links || {};
  detail.innerHTML = `
    <div class="h-40 flex items-center justify-center text-7xl relative" style="background:linear-gradient(135deg,${color}33,${color}66)">
      ${esc(place.emoji)}
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
}

function setMobileView(view) {
  document
    .getElementById("sidebar")
    .classList.toggle("active", view === "list");
  document
    .getElementById("map")
    .classList.toggle("hidden-mobile", view === "list");
  document.querySelectorAll("#mobile-tabs button").forEach((b) => {
    b.classList.toggle("active", b.dataset.view === view);
  });
}

function renderMobileTabs() {
  document.querySelectorAll("#mobile-tabs button").forEach((btn) => {
    btn.addEventListener("click", () => setMobileView(btn.dataset.view));
  });
  setMobileView("map");
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
