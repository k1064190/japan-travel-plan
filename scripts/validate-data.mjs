import { readFile } from "node:fs/promises";

const REQUIRED_FIELDS = [
  "name_ko",
  "name_jp",
  "coords",
  "category",
  "emoji",
  "tags",
  "summary",
  "detail",
  "sources",
  "activities",
  "restaurants",
  "review_links",
];
const JAPAN_BOUNDS = { latMin: 30, latMax: 46, lngMin: 128, lngMax: 146 };
const UTILITY_TAGS = new Set(["교통허브", "숙소", "출국 준비", "공항", "출국"]);

export function validate(places, itinerary) {
  const errors = [];

  for (const [id, place] of Object.entries(places)) {
    for (const f of REQUIRED_FIELDS) {
      if (!(f in place)) errors.push(`${id}: missing field: ${f}`);
    }
    if (place.coords) {
      if (!Array.isArray(place.coords) || place.coords.length !== 2) {
        errors.push(`${id}: coords must be a 2-element array`);
      } else {
        const [lat, lng] = place.coords;
        if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
          errors.push(`${id}: coords must be finite numbers: [${lat}, ${lng}]`);
        } else if (
          lat < JAPAN_BOUNDS.latMin ||
          lat > JAPAN_BOUNDS.latMax ||
          lng < JAPAN_BOUNDS.lngMin ||
          lng > JAPAN_BOUNDS.lngMax
        ) {
          errors.push(`${id}: coords outside Japan: [${lat}, ${lng}]`);
        }
      }
    }
    if (place.category && !["main", "alt"].includes(place.category)) {
      errors.push(`${id}: invalid category: ${place.category}`);
    }
    if (place.review_links) {
      for (const [k, url] of Object.entries(place.review_links)) {
        if (!/^https:\/\//.test(url))
          errors.push(`${id}: review_links.${k} must use https:// (got: ${url})`);
      }
    }
    if (place.sources) {
      if (!Array.isArray(place.sources)) {
        errors.push(`${id}: sources must be an array`);
      } else {
        for (const s of place.sources) {
          if (!/^https?:\/\//.test(s?.url || ""))
            errors.push(`${id}: invalid url in sources`);
        }
      }
    }
  }

  if (!Array.isArray(itinerary.days)) {
    errors.push(`itinerary.days must be an array`);
    return { errors };
  }

  const referenced = new Set();
  for (const day of itinerary.days) {
    for (const stop of day.stops ?? []) {
      referenced.add(stop.place_id);
      if (!places[stop.place_id]) {
        errors.push(`${day.id}: unknown place_id: ${stop.place_id}`);
      }
      if (stop.time) {
        const m = /^(\d{2}):(\d{2})$/.exec(stop.time);
        if (!m) {
          errors.push(`${day.id} stop ${stop.place_id}: time must be HH:MM, got: ${stop.time}`);
        } else {
          const hh = Number(m[1]);
          const mm = Number(m[2]);
          if (hh > 23 || mm > 59) {
            errors.push(`${day.id} stop ${stop.place_id}: time out of range, got: ${stop.time}`);
          }
        }
      }
    }
  }

  for (const [id, place] of Object.entries(places)) {
    // Only main places need restaurants
    if (place.category !== "main") continue;
    if (!referenced.has(id)) continue;
    const inDay5 = (itinerary.days ?? []).some(
      (d) => d.id === "day5" && d.stops.some((s) => s.place_id === id),
    );
    if (inDay5) continue;
    // Utility stops (airport, hotel, checkout) are main but not dining destinations
    const tags = Array.isArray(place.tags) ? place.tags : [];
    if (tags.some((t) => UTILITY_TAGS.has(t))) continue;
    if (!Array.isArray(place.restaurants) || place.restaurants.length === 0) {
      errors.push(`${id}: main place ${id} has no restaurants`);
    }
  }

  return { errors };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const places = JSON.parse(await readFile("data/places.json", "utf8"));
  const itinerary = JSON.parse(await readFile("data/itinerary.json", "utf8"));
  const { errors } = validate(places, itinerary);
  if (errors.length) {
    for (const e of errors) console.error("✗", e);
    process.exit(1);
  }
  console.log(
    `✓ ${Object.keys(places).length} places, ${itinerary.days.length} days validated`,
  );
}
