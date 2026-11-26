// Night Sky URL scheme and reducer (design_v1 section 11.2).
import test from "node:test";
import assert from "node:assert/strict";
import { parseQuery, serialize, reduce, simTimeMs, defaultState, PLACES, MIN_MS, MAX_MS } from "../public/night-sky/ns-state.js";

const W = Date.UTC(2026, 10, 26, 6, 0);

test("defaults: Jasper, all three constellation toggles off, planets on, ground on, speed 1, look south", () => {
  const s = parseQuery("", W);
  assert.equal(s.loc, "jasper"); assert.equal(s.lat, 38.3914); assert.equal(s.lon, -86.9311); assert.equal(s.tz, "America/New_York");
  assert.equal(s.lines, false); assert.equal(s.art, false); assert.equal(s.names, false);
  assert.equal(s.planets, true); assert.equal(s.ground, true); assert.equal(s.clock.speed, 1); assert.equal(s.look, "south");
  assert.equal(simTimeMs(s, W), W); assert.equal(serialize(s, W), "");
});

test("all 8 combinations of lines/art/names parse and serialize back to the same string; none implies another", () => {
  for (let k = 0; k < 8; k++) {
    const q = [["lines", k & 1], ["art", k & 2], ["names", k & 4]].filter(([, on]) => on).map(([n]) => `${n}=1`).join("&");
    const s = parseQuery(q, W);
    assert.equal(s.lines, !!(k & 1)); assert.equal(s.art, !!(k & 2)); assert.equal(s.names, !!(k & 4));
    assert.equal(serialize(s, W), q);
    for (const key of ["lines", "art", "names"]) {
      const t = reduce(s, { type: "toggle", key, wallMs: W });
      for (const other of ["lines", "art", "names"]) if (other !== key) assert.equal(t[other], s[other], `${key} changed ${other}`);
      assert.equal(t[key], !s[key]);
    }
  }
});

test("bad inputs fall back to defaults and never throw; unknown params survive a round trip", () => {
  for (const q of ["lat=999", "speed=abc", "date=2026-13-40", "time=25:61", "utc=yesterday", "loc=mars", "grid=foo", "mag=9", "trails=-1", "look=up", "hl=<b>", "lines=2&art=yes", "tz=Not/AZone"]) {
    let s; assert.doesNotThrow(() => { s = parseQuery(q, W); }, q);
    assert.equal(serialize(s, W), "", q);
  }
  assert.doesNotThrow(() => serialize(parseQuery("%E0%A4%A&&=&lines", W), W));
  const s = parseQuery("lab=six-months&foo=bar&lines=1&zap=1%2C2", W);
  assert.equal(serialize(s, W), "lines=1&lab=six-months&foo=bar&zap=1,2");
});

test("utc wins over date/time; lat/lon win over loc; date/time are read in the observer's zone", () => {
  let s = parseQuery("date=2026-12-20&time=22:00&utc=2026-06-21T03:00:00Z", W);
  assert.equal(simTimeMs(s, W), Date.parse("2026-06-21T03:00:00Z"));
  s = parseQuery("date=2026-12-20&time=22:00", W);
  assert.equal(simTimeMs(s, W), Date.parse("2026-12-21T03:00:00Z"));
  s = parseQuery("loc=sydney&lat=10&lon=20&tz=UTC", W);
  assert.equal(s.lat, 10); assert.equal(s.lon, 20); assert.equal(s.tz, "UTC");
  s = parseQuery("loc=sydney&date=2026-12-21&time=21:00", W);
  assert.equal(simTimeMs(s, W), Date.parse("2026-12-21T10:00:00Z")); // AEDT = UTC+11
});

test("spec example links parse as documented", () => {
  const s = parseQuery("date=2026-12-20&time=21:00&lines=1&art=1&names=1&speed=0&look=south", W);
  assert.ok(s.lines && s.art && s.names); assert.equal(s.clock.speed, 0); assert.equal(simTimeMs(s, W + 5e6), Date.parse("2026-12-21T02:00:00Z"));
  const np = parseQuery("loc=northpole&trails=6&speed=600", W);
  assert.equal(np.lat, 90); assert.equal(np.trails, 6); assert.equal(np.clock.speed, 600);
  const sy = parseQuery("loc=sydney&names=1", W);
  assert.equal(sy.lat, PLACES.sydney.lat); assert.ok(sy.names);
  assert.equal(parseQuery("art=1", W).lines, false);
});

test("lock=time blocks time actions; lock=sky blocks toggles; place still works", () => {
  const s = parseQuery("lock=time,sky&date=2026-12-20&time=22:00&speed=0", W);
  for (const a of [{ type: "jump", deltaMs: 3600e3 }, { type: "setSpeed", speed: 60 }, { type: "now" }, { type: "togglePlay" }, { type: "toggle", key: "lines" }, { type: "helpOff" }])
    assert.equal(reduce(s, { ...a, wallMs: W }), s, a.type);
  assert.equal(reduce(s, { type: "setPlace", loc: "quito", wallMs: W }).loc, "quito");
});

test("clock: simTime = t0 + speed * (wall - w0); speed change re-anchors; dates clamp to 1900..2050 with a note", () => {
  let s = parseQuery("utc=2026-12-21T03:00:00Z&speed=60", W);
  assert.equal(simTimeMs(s, W + 1000), Date.parse("2026-12-21T03:01:00Z"));
  s = reduce(s, { type: "setSpeed", speed: 0, wallMs: W + 1000 });
  assert.equal(simTimeMs(s, W + 99999), Date.parse("2026-12-21T03:01:00Z"));
  s = reduce(s, { type: "jump", months: 6, wallMs: W + 2000 });
  assert.equal(simTimeMs(s, W + 3000), Date.parse("2027-06-21T02:01:00Z")); // 22:01 EST Dec 20 -> 22:01 EDT Jun 20 (same wall clock)
  const lo = parseQuery("utc=1850-01-01T00:00Z", W); assert.equal(simTimeMs(lo, W), MIN_MS); assert.ok(lo.clampNote);
  const hi = parseQuery("date=2099-01-01", W); assert.equal(simTimeMs(hi, W), MAX_MS); assert.ok(hi.clampNote);
});

test("Help off clears all three; Reset restores sky defaults", () => {
  let s = parseQuery("lines=1&art=1&names=1&grid=eq&trails=6&mag=5", W);
  assert.deepEqual([reduce(s, { type: "helpOff", wallMs: W })].map((x) => [x.lines, x.art, x.names])[0], [false, false, false]);
  s = reduce(s, { type: "reset", wallMs: W });
  assert.equal(serialize(s, W), "");
});

test("defaultState is serializable (plain object for multiplayer later)", () => {
  const s = defaultState(W);
  assert.deepEqual(JSON.parse(JSON.stringify(s)), s);
});
