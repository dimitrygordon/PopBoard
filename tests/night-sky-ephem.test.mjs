// Night Sky tier B ephemeris (design_v1 T8): Sun, Moon (topocentric) and planets vs astropy get_body
// at 20 seeded random instants 1950..2040, observer Jasper (38.39, -86.93), no refraction.
// Known answers: tests/fixtures/night-sky-astropy.json (tools/night-sky/astropy-known-answers.py).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { sunPosition, moonTopocentric, planetPosition, moonPhase, PLANETS } from "../public/night-sky/ns-ephem.js";
import { lstDeg, equatorialToHorizontal, DEG, RAD } from "../public/night-sky/ns-astro.js";

const FX = JSON.parse(readFileSync(new URL("./fixtures/night-sky-astropy.json", import.meta.url), "utf8"));
const { lat, lon } = FX.observer;
const sep = (a, b) => Math.acos(Math.min(1, Math.sin(a.alt * DEG) * Math.sin(b.alt * DEG) + Math.cos(a.alt * DEG) * Math.cos(b.alt * DEG) * Math.cos((a.az - b.az) * DEG))) * RAD;
const altaz = (p, t) => equatorialToHorizontal(p.raDeg, p.decDeg, lat, lstDeg(t, lon));
const worst = {};
const TOL = { sun: 0.05, moon: 0.5, mercury: 0.25, venus: 0.25, mars: 0.25, jupiter: 0.25, saturn: 0.25 };

test("T8: Sun within 0.05 deg, Moon within 0.5 deg (topocentric), planets within 0.25 deg of astropy", () => {
  for (const rec of FX.bodies) {
    const t = rec.unixMs;
    const got = { sun: altaz(sunPosition(t), t), moon: altaz(moonTopocentric(t, lat, lon), t) };
    for (const p of PLANETS) got[p] = altaz(planetPosition(p, t), t);
    for (const [b, tol] of Object.entries(TOL)) {
      const d = sep(got[b], rec[b]);
      worst[b] = Math.max(worst[b] || 0, d);
      assert.ok(d < tol, `${b} at ${rec.utc}: ${d.toFixed(4)} deg off (tol ${tol})`);
    }
  }
  console.log("T8 worst separation (deg):", Object.fromEntries(Object.entries(worst).map(([k, v]) => [k, +v.toFixed(4)])));
});

test("Moon phase: full near 2026-12-24 05:28 UTC (about 100% lit), new near 2026-12-09 (about 0%)", () => {
  // Phase dates are checked against the computed elongation, not typed from an almanac: full means elongation near 180.
  const full = moonPhase(Date.UTC(2026, 11, 24, 5, 28)), nw = moonPhase(Date.UTC(2026, 11, 9, 0, 52));
  assert.ok(full.elongationDeg > 170 && full.fraction > 0.99, JSON.stringify(full));
  assert.ok(nw.elongationDeg < 10 && nw.fraction < 0.01, JSON.stringify(nw));
});
