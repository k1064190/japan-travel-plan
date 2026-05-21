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
// Child places (places nested under a `parent`, e.g. USJ interior attractions)
// are visitor-facing in their own right but don't need their own restaurant
// list — diners go to the parent's restaurants instead.
const CHILD_EXEMPT_FIELDS = new Set(["restaurants"]);
const ATTRACTION_TYPES = new Set([
  "ride",
  "show",
  "food",
  "shop",
  "event",
  "landmark",
]);
const JAPAN_BOUNDS = { latMin: 30, latMax: 46, lngMin: 128, lngMax: 146 };
const UTILITY_TAGS = new Set(["교통허브", "숙소", "출국 준비", "공항", "출국"]);

function isPlainObject(v) {
  return v != null && typeof v === "object" && !Array.isArray(v);
}

function validateRating(label, obj, errors) {
  if ("rating" in obj) {
    if (typeof obj.rating !== "number" || !Number.isFinite(obj.rating) || obj.rating < 0 || obj.rating > 5) {
      errors.push(`${label}.rating must be a number between 0 and 5 (got: ${obj.rating})`);
    }
  }
  if ("review_count" in obj) {
    if (!Number.isInteger(obj.review_count) || obj.review_count < 0) {
      errors.push(`${label}.review_count must be a non-negative integer`);
    }
  }
  if ("rating_source" in obj) {
    if (typeof obj.rating_source !== "string" || obj.rating_source.trim() === "") {
      errors.push(`${label}.rating_source must be a non-empty string`);
    }
  }
}

function validateBooking(label, b, errors) {
  if (!isPlainObject(b)) {
    errors.push(`${label}: must be an object`);
    return;
  }
  if (typeof b.required !== "boolean") {
    errors.push(`${label}.required must be a boolean`);
  }
  if (typeof b.url !== "string" || !/^https:\/\//.test(b.url)) {
    errors.push(`${label}.url must use https:// (got: ${b.url})`);
  }
  if ("advance_days" in b) {
    if (!Number.isInteger(b.advance_days) || b.advance_days < 0) {
      errors.push(`${label}.advance_days must be a non-negative integer`);
    }
  }
  if ("ticket_price_jpy" in b) {
    if (!Number.isInteger(b.ticket_price_jpy) || b.ticket_price_jpy < 0) {
      errors.push(`${label}.ticket_price_jpy must be a non-negative integer`);
    }
  }
  if ("notes" in b) {
    if (typeof b.notes !== "string") {
      errors.push(`${label}.notes must be a string when present`);
    }
  }
}

function validateCuratedLink(label, link, errors) {
  if (!isPlainObject(link)) {
    errors.push(`${label}: must be an object`);
    return;
  }
  if (typeof link.title !== "string" || link.title.trim() === "") {
    errors.push(`${label}.title must be a non-empty string`);
  }
  if (typeof link.url !== "string" || !/^https:\/\//.test(link.url)) {
    errors.push(`${label}.url must use https:// (got: ${link.url})`);
  }
  if (typeof link.source !== "string" || link.source.trim() === "") {
    errors.push(`${label}.source must be a non-empty string`);
  }
  if ("snippet" in link) {
    if (typeof link.snippet !== "string") {
      errors.push(`${label}.snippet must be a string when present`);
    } else if (link.snippet.trim() === "") {
      errors.push(`${label}.snippet must not be empty when present`);
    }
  }
}

export function validate(places, itinerary) {
  const errors = [];

  if (!isPlainObject(places)) {
    errors.push(`places must be an object`);
    return { errors };
  }
  if (!isPlainObject(itinerary)) {
    errors.push(`itinerary must be an object`);
    return { errors };
  }

  for (const [id, place] of Object.entries(places)) {
    if (!isPlainObject(place)) {
      errors.push(`${id}: place entry must be an object`);
      continue;
    }
    const isChild = typeof place.parent === "string" && place.parent !== "";
    for (const f of REQUIRED_FIELDS) {
      if (isChild && CHILD_EXEMPT_FIELDS.has(f)) continue;
      if (!(f in place)) errors.push(`${id}: missing field: ${f}`);
    }
    if ("parent" in place) {
      if (typeof place.parent !== "string" || place.parent.trim() === "") {
        errors.push(`${id}.parent must be a non-empty string`);
      } else if (!places[place.parent]) {
        errors.push(`${id}.parent refers to unknown place: ${place.parent}`);
      } else if (
        typeof places[place.parent]?.parent === "string" &&
        places[place.parent].parent !== ""
      ) {
        errors.push(`${id}.parent must not itself be a child place`);
      }
    }
    if ("park_zone" in place) {
      if (typeof place.park_zone !== "string" || place.park_zone.trim() === "") {
        errors.push(`${id}.park_zone must be a non-empty string`);
      }
    }
    if ("attraction_type" in place) {
      if (!ATTRACTION_TYPES.has(place.attraction_type)) {
        errors.push(
          `${id}.attraction_type must be one of ${[...ATTRACTION_TYPES].join("/")} (got: ${place.attraction_type})`,
        );
      }
    }
    if ("coords" in place) {
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
    if ("curated_links" in place) {
      if (!Array.isArray(place.curated_links)) {
        errors.push(`${id}: curated_links must be an array`);
      } else {
        place.curated_links.forEach((link, i) => {
          validateCuratedLink(`${id}.curated_links[${i}]`, link, errors);
        });
      }
    }
    if (Array.isArray(place.restaurants)) {
      place.restaurants.forEach((r, i) => {
        if (isPlainObject(r)) {
          if ("link" in r) {
            validateCuratedLink(`${id}.restaurants[${i}].link`, r.link, errors);
          }
          validateRating(`${id}.restaurants[${i}]`, r, errors);
        }
      });
    }
    validateRating(id, place, errors);
    if ("booking" in place) {
      validateBooking(`${id}.booking`, place.booking, errors);
    }
    if (Array.isArray(place.activities)) {
      place.activities.forEach((a, i) => {
        if (isPlainObject(a)) {
          if (typeof a.text !== "string" || a.text.trim() === "") {
            errors.push(`${id}.activities[${i}].text must be a non-empty string`);
          }
          if ("link" in a) {
            validateCuratedLink(`${id}.activities[${i}].link`, a.link, errors);
          }
        } else if (typeof a !== "string") {
          errors.push(`${id}.activities[${i}] must be a string or object with text/link`);
        }
      });
    }
  }

  if (!Array.isArray(itinerary.days)) {
    errors.push(`itinerary.days must be an array`);
    return { errors };
  }

  const referenced = new Set();
  for (const day of itinerary.days) {
    if (!isPlainObject(day)) {
      errors.push(`itinerary.days contains a non-object entry`);
      continue;
    }
    if (!("stops" in day)) {
      errors.push(`${day.id ?? "(unknown day)"}: missing field: stops`);
      continue;
    }
    if (!Array.isArray(day.stops)) {
      errors.push(`${day.id ?? "(unknown day)"}: stops must be an array`);
      continue;
    }
    for (const stop of day.stops) {
      referenced.add(stop.place_id);
      if (!places[stop.place_id]) {
        errors.push(`${day.id}: unknown place_id: ${stop.place_id}`);
      }
      if (isPlainObject(stop.transit_from_prev) && "origin_place_id" in stop.transit_from_prev) {
        const opid = stop.transit_from_prev.origin_place_id;
        if (typeof opid !== "string" || !places[opid]) {
          errors.push(`${day.id} stop ${stop.place_id}: transit_from_prev.origin_place_id refers to unknown place: ${opid}`);
        }
      }
      if (isPlainObject(stop.transit_from_prev) && "booking_url" in stop.transit_from_prev) {
        const url = stop.transit_from_prev.booking_url;
        if (typeof url !== "string" || !/^https:\/\//.test(url)) {
          errors.push(`${day.id} stop ${stop.place_id}: transit_from_prev.booking_url must use https:// (got: ${url})`);
        }
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
      (d) => d?.id === "day5" && (d.stops ?? []).some((s) => s.place_id === id),
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
