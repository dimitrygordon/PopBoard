#!/usr/bin/env node
// Night Sky data pipeline (build time only). Reads the pinned sources in tools/night-sky/.cache
// (run fetch-sources.sh first) plus Leo's atlas manifest data/art/art-atlas.json, and writes
// public/night-sky/data/{stars.bin, stars-meta.json, constellations.json, bv-lut.json, manifest.json}.
// The atlas itself is built by build-art-atlas.py (Leo); its rects and anchors are merged here unchanged.
// Fails loudly on any data check in design_v1 section 8.4.
import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { gunzipSync } from "node:zlib";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { bvToTemperature, temperatureToSRGB, unitVector, angleBetweenDeg } from "../../public/night-sky/ns-astro.js";

const HERE = dirname(fileURLToPath(import.meta.url));
const CACHE = join(HERE, ".cache");
const OUT = join(HERE, "../../public/night-sky/data");
const SRC = JSON.parse(readFileSync(join(HERE, "sources.json"), "utf8"));
const ART = JSON.parse(readFileSync(join(OUT, "art/art-atlas.json"), "utf8"));

function fail(msg) { console.error("build-data: FAIL " + msg); process.exit(1); }

// ---- tiny CSV parser (handles quoted fields) ----
function parseCsvLine(line) {
  const out = []; let cur = "", q = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (q) { if (ch === '"') { if (line[i + 1] === '"') { cur += '"'; i++; } else q = false; } else cur += ch; }
    else if (ch === '"') q = true; else if (ch === ",") { out.push(cur); cur = ""; } else cur += ch;
  }
  out.push(cur); return out;
}

// ---- 1. HYG catalog ----
const csv = gunzipSync(readFileSync(join(CACHE, SRC.hyg.file))).toString("utf8").split(/\r?\n/);
const head = parseCsvLine(csv[0]); const col = Object.fromEntries(head.map((h, i) => [h, i]));
const rows = [];
for (let i = 1; i < csv.length; i++) {
  if (!csv[i]) continue;
  const f = parseCsvLine(csv[i]);
  const id = +f[col.id]; if (id === 0) continue; // Sol
  rows.push({ id, hip: f[col.hip] ? +f[col.hip] : 0, proper: f[col.proper], ra: +f[col.ra], dec: +f[col.dec], dist: +f[col.dist],
    mag: +f[col.mag], spect: f[col.spect], ci: f[col.ci] === "" ? NaN : +f[col.ci], bayer: f[col.bayer], flam: f[col.flam], con: f[col.con] });
}
if (rows.length !== SRC.hyg.expect.nonSolRows) fail(`non-Sol rows ${rows.length} != ${SRC.hyg.expect.nonSolRows}`);
const byHip = new Map();
for (const r of rows) if (r.hip && (!byHip.has(r.hip) || r.mag < byHip.get(r.hip).mag)) byHip.set(r.hip, r);

// ---- 2. Stellarium modern sky culture ----
const sc = JSON.parse(readFileSync(join(CACHE, SRC.stellarium.dir, "index.json"), "utf8"));
const isHip = (x) => Number.isInteger(x);
// index.json polylines may contain a style token such as "thin"; only integer Hipparcos IDs are stars.
const cons = sc.constellations.map((c) => ({ ...c, lines: c.lines.map((l) => l.filter(isHip)).filter((l) => l.length >= 2) }));
const skippedTokens = sc.constellations.reduce((n, c) => n + c.lines.reduce((m, l) => m + l.filter((x) => !isHip(x)).length, 0), 0);
if (cons.length !== SRC.stellarium.expect.constellations) fail("constellation count " + cons.length);
const neededHip = new Set();
for (const c of cons) {
  for (const l of c.lines) for (const h of l) neededHip.add(h);
  if (c.image) for (const a of c.image.anchors) neededHip.add(a.hip);
}
for (const h of neededHip) if (!byHip.has(h)) fail("line/anchor HIP missing from HYG: " + h);

// ---- 3. Select, sort ----
const limit = SRC.hyg.expect.magLimit;
const atLimit = rows.filter((r) => r.mag <= limit);
if (atLimit.length !== SRC.hyg.expect.starsAtLimit) fail(`stars at V<=${limit}: ${atLimit.length} != ${SRC.hyg.expect.starsAtLimit}`);
const chosen = new Set(atLimit);
for (const h of neededHip) chosen.add(byHip.get(h));
const stars = [...chosen].sort((a, b) => a.mag - b.mag || a.id - b.id);
const N = stars.length;
const idxOfHip = new Map(); stars.forEach((s, i) => { if (s.hip && !idxOfHip.has(s.hip)) idxOfHip.set(s.hip, i); });

// ---- 4. stars.bin: 24 bytes/star LE: f32 ra_rad, f32 dec_rad, f32 mag, f32 bv, f32 dist_pc, u32 hip ----
const buf = Buffer.alloc(24 * N);
let unknownDist = 0, noBv = 0;
stars.forEach((s, i) => {
  const o = i * 24;
  buf.writeFloatLE(s.ra * Math.PI / 12, o);
  buf.writeFloatLE(s.dec * Math.PI / 180, o + 4);
  buf.writeFloatLE(s.mag, o + 8);
  if (Number.isNaN(s.ci)) noBv++;
  buf.writeFloatLE(s.ci, o + 12);
  const dist = s.dist >= 100000 || !(s.dist > 0) ? NaN : s.dist; // HYG uses 100000 pc for "unknown"
  if (Number.isNaN(dist)) unknownDist++;
  buf.writeFloatLE(dist, o + 16);
  buf.writeUInt32LE(s.hip >>> 0, o + 20);
});

// ---- 5. stars-meta.json ----
const conStr = stars.map((s) => (s.con || "").padEnd(3, " ").slice(0, 3)).join("");
const spect = stars.map((s) => s.spect || "");
const names = [];
stars.forEach((s, i) => { if (s.proper || s.bayer || s.flam) names.push([i, s.proper || "", s.bayer || "", s.flam || ""]); });
const meta = { v: 1, n: N, fields: "names rows are [starIndex, proper, bayer, flamsteed]; con is 3 chars per star", con: conStr, spect, names };

// ---- 6. constellations.json; art rects and anchors come from Leo's art-atlas.json ----
if (ART.source.commit !== SRC.stellarium.commit) fail(`art-atlas.json commit ${ART.source.commit} != ${SRC.stellarium.commit}`);
let segs = 0;
const outCons = cons.map((c) => {
  const id = c.id.split(" ").pop();
  const lines = c.lines.map((l) => l.map((h) => idxOfHip.get(h)));
  segs += c.lines.reduce((s, l) => s + l.length - 1, 0);
  const uniq = [...new Set(lines.flat())];
  let vx = 0, vy = 0, vz = 0;
  for (const i of uniq) { const v = unitVector(stars[i].ra * 15, stars[i].dec); vx += v[0]; vy += v[1]; vz += v[2]; }
  const L = Math.hypot(vx, vy, vz);
  const rec = { id, latin: c.common_name.native, english: c.common_name.english,
    labelRa: +((Math.atan2(vy, vx) * 180 / Math.PI + 360) % 360 / 15).toFixed(4), labelDec: +(Math.asin(vz / L) * 180 / Math.PI).toFixed(4), lines };
  if (c.image) {
    const e = ART.entries[id];
    if (!e) fail("art-atlas.json has no entry for " + id);
    if (JSON.stringify(e.size) !== JSON.stringify(c.image.size)) fail(`art size mismatch ${id}`);
    if (JSON.stringify(e.anchors.map((a) => [a.hip, a.pos])) !== JSON.stringify(c.image.anchors.map((a) => [a.hip, a.pos]))) fail(`art anchors differ from index.json for ${id}`);
    const anchors = e.anchors.map((a) => ({ px: a.pos[0], py: a.pos[1], star: idxOfHip.get(a.hip), hip: a.hip, uv: a.uv }));
    // degenerate anchor triangle check: area in pixels and on the sky
    const [p, q, r] = anchors;
    const pixArea = Math.abs((q.px - p.px) * (r.py - p.py) - (r.px - p.px) * (q.py - p.py)) / 2;
    if (pixArea < 100) fail(`degenerate anchor triangle (pixels) in ${id}: ${pixArea}`);
    const sep = Math.min(...[[p, q], [q, r], [p, r]].map(([m, n]) => angleBetweenDeg(stars[m.star].ra * 15, stars[m.star].dec, stars[n.star].ra * 15, stars[n.star].dec)));
    if (sep < 0.2) fail(`degenerate anchor triangle (sky) in ${id}: min separation ${sep} deg`);
    rec.art = { file: e.source, size: e.size, atlasRect: e.atlasRect, uvRect: e.uvRect, anchors };
  }
  return rec;
});
if (segs !== SRC.stellarium.expect.segments) fail(`segments ${segs} != ${SRC.stellarium.expect.segments}`);
if (outCons.filter((c) => c.art).length !== SRC.stellarium.expect.withArt) fail("art count");

// ---- 7. checks (section 8.4) ----
const polaris = stars[idxOfHip.get(11767)];
if (90 - polaris.dec > 0.75) fail("Polaris not within 0.75 deg of the pole: dec " + polaris.dec);
const sirius = stars[idxOfHip.get(32349)];
if (Math.abs(sirius.mag - -1.44) > 0.005) fail("Sirius magnitude " + sirius.mag);

// ---- 8. B-V lookup (256 entries, bv -0.4 .. 2.0) ----
const lut = [];
for (let i = 0; i < 256; i++) {
  const bv = -0.4 + 2.4 * i / 255;
  const rgb = temperatureToSRGB(bvToTemperature(bv)).map((c) => c + 0.4 * (1 - c)); // pull 40% toward white
  lut.push(...rgb.map((c) => Math.round(Math.min(1, Math.max(0, c)) * 255)));
}

mkdirSync(OUT, { recursive: true });
writeFileSync(join(OUT, "stars.bin"), buf);
writeFileSync(join(OUT, "stars-meta.json"), JSON.stringify(meta));
writeFileSync(join(OUT, "constellations.json"), JSON.stringify({ v: 1, source: "Stellarium skycultures western @" + SRC.stellarium.commit.slice(0, 8), atlas: { size: [ART.atlas.width, ART.atlas.height], gutter: ART.atlas.gutter, file: "art/" + ART.atlas.webp, manifest: "art/art-atlas.json" }, constellations: outCons }));
writeFileSync(join(OUT, "bv-lut.json"), JSON.stringify({ bvMin: -0.4, bvMax: 2.0, n: 256, rgb: lut }));
const manifest = { v: 1, built: new Date().toISOString().slice(0, 10), stars: N, starsAtLimit: atLimit.length, magLimit: limit,
  forcedFainter: N - atLimit.length, faintestForced: stars[N - 1].mag, noBv, unknownDist, named: names.length,
  constellations: outCons.length, segments: segs, skippedLineTokens: skippedTokens, withArt: outCons.filter((c) => c.art).length,
  hyg: SRC.hyg.sha256, stellarium: SRC.stellarium.commit };
writeFileSync(join(OUT, "manifest.json"), JSON.stringify(manifest, null, 1) + "\n");
console.log("build-data: OK", manifest);
