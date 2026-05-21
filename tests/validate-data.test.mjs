import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { validate } from "../scripts/validate-data.mjs";

const goodPlace = {
  name_ko: "도톤보리",
  name_jp: "道頓堀",
  coords: [34.6687, 135.5012],
  category: "main",
  emoji: "🍜",
  tags: ["야경"],
  summary: "s",
  detail: "d",
  sources: [{ title: "t", url: "https://example.com" }],
  activities: ["a"],
  restaurants: [
    { name: "n", type: "t", tip: "x", price_range: "~1000엔" },
  ],
  review_links: {
    naver: "https://x.com",
    google: "https://x.com",
    youtube: "https://x.com",
  },
};

const goodItinerary = {
  trip: { title: "t", subtitle: "s", start_date: "2026-05-22", end_date: "2026-05-26" },
  days: [
    {
      id: "day1",
      date: "2026-05-22",
      weekday: "금",
      title: "t",
      color_var: "--day-1",
      stops: [{ place_id: "p1", time: "16:00", transit_from_prev: null, duration_minutes: 30 }],
    },
  ],
};

describe("validate(places, itinerary)", () => {
  it("passes on valid input", () => {
    const r = validate({ p1: goodPlace }, goodItinerary);
    assert.deepEqual(r.errors, []);
  });

  it("fails when itinerary references unknown place_id", () => {
    const r = validate({}, goodItinerary);
    assert.ok(r.errors.some((e) => e.includes("unknown place_id: p1")));
  });

  it("fails when coords are outside Japan", () => {
    const bad = { ...goodPlace, coords: [0, 0] };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some((e) => e.includes("coords outside Japan")));
  });

  it("fails when referenced main place has no restaurants (non-day5)", () => {
    const bad = { ...goodPlace, restaurants: [] };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some((e) => e.includes("no restaurants")));
  });

  it("skips restaurant check for day5 referenced places", () => {
    const bad = { ...goodPlace, restaurants: [] };
    const itin = {
      ...goodItinerary,
      days: [{ ...goodItinerary.days[0], id: "day5" }],
    };
    const r = validate({ p1: bad }, itin);
    assert.ok(!r.errors.some((e) => e.includes("no restaurants")));
  });

  it("skips restaurant check for places with utility tags (교통허브, 숙소)", () => {
    const bad = { ...goodPlace, restaurants: [], tags: ["교통허브"] };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(!r.errors.some((e) => e.includes("no restaurants")));
  });

  it("fails when required field missing", () => {
    const bad = { ...goodPlace };
    delete bad.summary;
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some((e) => e.includes("missing field: summary")));
  });

  it("fails when review_link URL is not https://", () => {
    const bad = {
      ...goodPlace,
      review_links: { ...goodPlace.review_links, naver: "javascript:alert(1)" },
    };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some((e) => e.includes("must use https://")));
  });

  it("fails when coords does not have exactly 2 elements", () => {
    const bad = { ...goodPlace, coords: [34.6, 135.5, 10] };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some((e) => e.includes("2-element array")));
  });

  it("fails when category is not main/alt", () => {
    const bad = { ...goodPlace, category: "mian" };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some((e) => e.includes("invalid category")));
  });

  it("passes when place.booking is a valid object", () => {
    const withBooking = {
      ...goodPlace,
      booking: {
        required: true,
        url: "https://www.kkday.com/ko/product/12345",
        advance_days: 3,
        ticket_price_jpy: 8600,
        notes: "n",
      },
    };
    const r = validate({ p1: withBooking }, goodItinerary);
    assert.deepEqual(r.errors, []);
  });

  it("fails when place.booking.url is not https://", () => {
    const bad = {
      ...goodPlace,
      booking: { required: true, url: "http://example.com" },
    };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some((e) => e.includes("booking.url must use https://")));
  });

  it("fails when place.booking.required is not a boolean", () => {
    const bad = {
      ...goodPlace,
      booking: { required: "yes", url: "https://example.com" },
    };
    const r = validate({ p1: bad }, goodItinerary);
    assert.ok(r.errors.some((e) => e.includes("booking.required must be a boolean")));
  });

  it("fails when transit_from_prev.booking_url is not https://", () => {
    const itin = {
      ...goodItinerary,
      days: [{
        ...goodItinerary.days[0],
        stops: [{
          place_id: "p1",
          time: "16:00",
          transit_from_prev: { booking_url: "javascript:alert(1)" },
          duration_minutes: 30,
        }],
      }],
    };
    const r = validate({ p1: goodPlace }, itin);
    assert.ok(r.errors.some((e) => e.includes("transit_from_prev.booking_url must use https://")));
  });

  it("fails when stop time is not HH:MM", () => {
    const itin = {
      ...goodItinerary,
      days: [{
        ...goodItinerary.days[0],
        stops: [{ place_id: "p1", time: "8:30", transit_from_prev: null, duration_minutes: 30 }],
      }],
    };
    const r = validate({ p1: goodPlace }, itin);
    assert.ok(r.errors.some((e) => e.includes("time must be HH:MM")));
  });
});
