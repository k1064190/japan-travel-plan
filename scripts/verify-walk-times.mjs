// scripts/verify-walk-times.mjs
//
// Sanity-checks each "도보" (pure walking) transit_from_prev in
// data/itinerary.json against a haversine-distance + 보행속도 휴리스틱.
//
// Why heuristic instead of a routing API:
//   - OSRM public demo (router.project-osrm.org) returns driving times even
//     for /foot/ requests (≈34 km/h), making it useless for walking sanity.
//     Verified empirically on 2026-05.
//   - GraphHopper / OpenRouteService require API keys.
//   - For sanity-checking the *planned* minutes of pure walks (≤ 2 km), a
//     haversine distance + 5 km/h base speed + 1.25 우회(detour) factor is
//     accurate to within ±2 minutes, which is enough to flag obviously
//     mis-typed values (e.g. 30분 instead of 5분).
//
// Transit (subway/JR/private rail) segments are NOT checked here. Click the
// "Google Maps에서 실제 경로·시간 보기 →" button in each stop's detail
// panel — Google Maps gives realtime transit predictions including transfers.
//
// Run:
//   node scripts/verify-walk-times.mjs
//
// Output:
//   - per pure-walking segment: planned vs estimated minutes + distance
//   - exit 2 if any segment differs by ≥ TOLERANCE_MIN minutes AND
//     ≥ TOLERANCE_RATIO ratio.

import { readFile } from "node:fs/promises";

const WARN_ONLY = process.argv.includes("--warn-only");

const WALK_KMH = 5.0; // adult walking, no obstacles
const DETOUR_FACTOR = 1.25; // streets aren't straight lines
const TOLERANCE_RATIO = 0.5; // 50% delta to flag
const TOLERANCE_MIN = 3; // and ≥ 3 minutes absolute

function haversineMeters(c1, c2) {
  const toRad = (d) => (d * Math.PI) / 180;
  const R = 6371e3;
  const lat1 = toRad(c1[0]);
  const lat2 = toRad(c2[0]);
  const dLat = lat2 - lat1;
  const dLng = toRad(c2[1] - c1[1]);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function estimateWalkMinutes(c1, c2) {
  const straightMeters = haversineMeters(c1, c2);
  const walkMeters = straightMeters * DETOUR_FACTOR;
  return (walkMeters / 1000 / WALK_KMH) * 60;
}

async function main() {
  const places = JSON.parse(await readFile("data/places.json", "utf8"));
  const itinerary = JSON.parse(await readFile("data/itinerary.json", "utf8"));
  const flagged = [];
  let checked = 0;
  let skipped = 0;

  for (let di = 0; di < itinerary.days.length; di++) {
    const day = itinerary.days[di];
    for (let si = 0; si < day.stops.length; si++) {
      const stop = day.stops[si];
      const t = stop.transit_from_prev;
      if (!t) continue;
      // Pure walking only — hybrids like "JR환상선+도보" mix transit and walk;
      // the haversine + walk-speed heuristic doesn't model rail, so they're
      // deferred to per-stop verification via the Google Maps button in the UI.
      if (String(t.mode).trim() !== "도보") {
        skipped++;
        continue;
      }
      const dest = places[stop.place_id];
      let origin;
      if (si > 0) {
        origin = places[day.stops[si - 1].place_id];
      } else if (di > 0) {
        const prevDay = itinerary.days[di - 1];
        const last = prevDay.stops?.[prevDay.stops.length - 1];
        if (last) origin = places[last.place_id];
      }
      if (!origin || !dest) {
        console.log(`  ${day.id}/${stop.place_id}: skipping (missing origin/dest place)`);
        skipped++;
        continue;
      }
      const estMin = estimateWalkMinutes(origin.coords, dest.coords);
      const straight = haversineMeters(origin.coords, dest.coords);
      const planned = Number(t.minutes);
      const delta = Math.abs(planned - estMin);
      const ratio = planned > 0 ? delta / planned : 1;
      const flag = delta >= TOLERANCE_MIN && ratio >= TOLERANCE_RATIO;
      const tag = flag ? "⚠" : " ";
      console.log(
        `${tag} ${day.id}/${stop.place_id.padEnd(28)} planned ${String(planned).padStart(3)}분  est ${estMin.toFixed(1).padStart(5)}분  Δ ${delta.toFixed(1).padStart(4)}분  (${straight.toFixed(0).padStart(5)}m 직선)`,
      );
      if (flag) flagged.push({ day: day.id, place_id: stop.place_id, planned, est: estMin });
      checked++;
    }
  }

  console.log(`\n— checked: ${checked} walking segments, skipped: ${skipped} non-walking/missing`);
  console.log(`  (transit segments must be verified per-stop via the Google Maps button in the UI)`);
  if (flagged.length) {
    console.log(`\n⚠ flagged (|Δ| ≥ ${TOLERANCE_MIN}분 AND ≥ ${TOLERANCE_RATIO * 100}% delta):`);
    for (const f of flagged) {
      console.log(`  ${f.day}/${f.place_id}: planned ${f.planned}분 vs est ${f.est.toFixed(1)}분`);
    }
    if (WARN_ONLY) {
      console.log("(--warn-only: not exiting non-zero)");
    } else {
      process.exit(2);
    }
  } else {
    console.log("✓ all walking segments within tolerance");
  }
}

main().catch((err) => {
  console.error("fatal:", err);
  process.exit(1);
});
