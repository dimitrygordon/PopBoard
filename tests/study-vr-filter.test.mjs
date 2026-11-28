// Study library: VR capable badge on module cards, and a VR-only filter next to search.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const html = readFileSync(
  join(dirname(fileURLToPath(import.meta.url)), "..", "public", "study.html"),
  "utf8"
);

const VR_IDS = [
  "night-sky",
  "spaceships",
  "fourth-dimension",
  "stellar-life",
  "gravity-force"
];

function builtinsRegion() {
  const start = html.indexOf("var BUILTIN_MODULES = [");
  const end = html.indexOf("\n];", start);
  assert.ok(start > 0 && end > start, "BUILTIN_MODULES missing");
  return { start, end, block: html.slice(start, end) };
}

function builtinBlock(id) {
  const { start: regionStart, end: regionEnd, block } = builtinsRegion();
  const token = `id: "${id}"`;
  const local = block.indexOf(token);
  assert.ok(local > 0, "missing builtin " + id);
  const start = regionStart + local;
  const next = html.indexOf('id: "', start + token.length);
  const end = next > 0 && next < regionEnd ? next : regionEnd;
  return html.slice(start, end);
}

function allBuiltinIds() {
  return [...builtinsRegion().block.matchAll(/id:\s*"([^"]+)"/g)].map((m) => m[1]);
}

test("VR capability is an explicit vr flag on each module, not a name match", () => {
  for (const id of VR_IDS) {
    const block = builtinBlock(id);
    assert.match(block, new RegExp(`id: "${id}"[\\s\\S]*\\bvr:\\s*true\\b`));
    assert.match(block, /kind: "builtin"/);
    assert.match(block, /file: "study-/);
  }
  assert.equal((html.match(/\bvr:\s*true\b/g) || []).length, VR_IDS.length);
});

test("only the five immersive-VR modules are flagged", () => {
  const flagged = [];
  for (const id of allBuiltinIds()) {
    if (/\bvr:\s*true\b/.test(builtinBlock(id))) flagged.push(id);
  }
  assert.deepEqual(flagged.sort(), [...VR_IDS].sort());
  assert.match(builtinBlock("night-sky"), /file: "study-night-sky\.html"/);
  assert.match(builtinBlock("spaceships"), /file: "study-spaceships\.html"/);
  assert.match(builtinBlock("fourth-dimension"), /file: "study-fourth-dimension\.html"/);
  assert.match(builtinBlock("stellar-life"), /file: "study-stellar-life\.html"/);
  assert.match(builtinBlock("gravity-force"), /file: "study-gravity-force\.html"/);
  assert.doesNotMatch(builtinBlock("stars"), /\bvr:\s*true\b/);
  assert.doesNotMatch(builtinBlock("space-sandbox"), /\bvr:\s*true\b/);
});

test("VR only toggle sits next to the module name search", () => {
  const rowStart = html.indexOf('class="search-row"');
  const grid = html.indexOf('id="cardGrid"');
  const search = html.indexOf('id="searchInput"');
  const btn = html.indexOf('id="vrFilterBtn"');
  assert.ok(rowStart > 0 && rowStart < search && search < btn && btn < grid);
  const row = html.slice(rowStart, grid);
  assert.match(row, /placeholder="Search modules\.\.\."/);
  assert.match(row, />VR only</);
  assert.match(row, /aria-label="Show only VR modules"/);
  assert.match(row, /aria-pressed="false"/);
  assert.doesNotMatch(row, /\u2014|\u2013/);
  const courses = html.indexOf('id="coursesBand"');
  assert.ok(courses > 0 && courses < rowStart);
});

test("cards get a compact VR capable badge; the filter combines with name search and ?vr=1", () => {
  assert.match(html, /badge\.className = "vr-badge"/);
  assert.match(html, /badge\.setAttribute\("aria-label", "VR capable"\)/);
  assert.match(html, /vr: !!m\.vr/);
  assert.match(html, /if \(vrOnly && !m\.vr\) return false;/);
  assert.match(
    html,
    /m\.name\.toLowerCase\(\)\.indexOf\(ft\) !== -1 \|\| m\.description\.toLowerCase\(\)\.indexOf\(ft\) !== -1/
  );
  assert.match(html, /\.get\("vr"\) === "1"/);
  assert.match(html, /searchParams\.set\("vr", "1"\)/);
  assert.match(html, /searchParams\.delete\("vr"\)/);
  assert.match(html, /history\.replaceState/);
  assert.match(html, /applyVrFilter\(vrFilterFromSearch\(location\.search\), false\)/);
  assert.match(html, /COURSE_IDS\.indexOf\(m\.id\) === -1/);
});

test("badge and filter styles match the existing pill language", () => {
  assert.match(html, /\.vr-badge\{/);
  assert.match(html, /\.vr-filter-btn\{/);
  assert.match(html, /\.vr-filter-btn\[aria-pressed="true"\]\{/);
  assert.match(html, /\.module-card:has\(\.vr-badge\) \.fun-badges/);
});
