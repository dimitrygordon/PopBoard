// Copy Leo's Unit 1 SVGs from /workspace/geometry-v2/u1-art/svg/ into
// public/geometry/figures/u01/ and refresh tools/geometry/u01-art-wiring.json.
// Slot files: u01-lNN-sNN.svg. Hook aliases: u01-lNN-hook.svg, u01-lNN-eratosthenes.svg.
// Lesson plates: u01-cover-lNN.svg, u01-lNN-cover.svg, or u01-lNN-plate.svg (used by build.mjs coverFor).
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const SRC = process.env.U01_ART_SRC || "/workspace/geometry-v2/u1-art/svg";
const DEST = path.join(ROOT, "public/geometry/figures/u01");
const WIRE = path.join(ROOT, "tools/geometry/u01-art-wiring.json");
const LEO_WIRES = [
  "/workspace/geometry-v2/u1-art/u01-art-wiring.json",
  "/workspace/geometry-v2/u1-art/u01-hooks-covers-wiring.json",
];

fs.mkdirSync(DEST, { recursive: true });

const alts = new Map();
for (const wire of LEO_WIRES) {
  if (!fs.existsSync(wire)) continue;
  for (const row of JSON.parse(fs.readFileSync(wire, "utf8"))) {
    if (row.slot && row.alt) alts.set(row.slot, row.alt);
  }
}

// Leo is redrawing these; do not copy or wire them. Covers fall back to the unit plate.
// Leo is still redrawing hook-l03-h4; keep it unwired as a placeholder.
const HOLD_BACK = new Set([
  "u01-hook-l03-h4",
]);
// Tesla's generator fixes must not be overwritten if slot files arrive later.
const KEEP_GENERATOR = new Set(["u01-l06-s09", "u01-l14-s16"]);


const slotRe = /^(u01-l\d{2}-s\d{2})\.svg$/;
const hookRe = /^(u01-l\d{2}-(?:hook|eratosthenes|s02))\.svg$/;
const hookNameRe = /^(u01-hook-l(\d{2})-h(\d+))\.svg$/;
const plateRe = /^(u01-(?:l\d{2}-(?:cover|plate)|cover-l\d{2}))\.svg$/;

// Short alt text describing the figure, not lesson prose.
const HOOK_ALTS = {
  "u01-hook-l01-h1": "Two equal segments, one with inward fins and one with outward fins, and a faint ruler underneath.",
  "u01-hook-l02-h2": "A table of circle region counts for 1 to 10 points, with the doubling guess crossed out from 6 on.",
  "u01-hook-l03-h3": "A three-legged stool and a four-legged chair on a wavy floor, with one chair leg off the floor.",
  "u01-hook-l03-h4": "A highway overpass crossing a road, with the two center lines drawn as lines with arrows.",
  "u01-hook-l03-h5": "A laser pointer with a straight beam ending in an arrowhead, labeled endpoint at the pointer.",
  "u01-hook-l04-h6": "A cross-section of Earth: a well at Syene lit to the bottom, a stick and shadow at Alexandria, parallel sun lines, and the 7.2 degree central angle.",
  "u01-hook-l04-h7": "An eye with two angle wedges, a small near Moon and a large far Sun fitting the same wedge, marked not to scale.",
  "u01-hook-l05-h10": "Line art of a salt cube, an icosahedral virus shell, and a cube with corners, edges, and faces counted.",
  "u01-hook-l05-h11": "Pascal's triangle, rows 0 to 7, with odd entries shaded and even entries blank.",
  "u01-hook-l06-h8": "A post in a circle with morning and afternoon shadow tips, a dashed north ray, and a flat sundial face with uneven hour lines.",
  "u01-hook-l06-h9": "A compass that snaps shut when lifted, next to a compass that holds its opening, labeled Euclid's compass and our compass.",
  "u01-hook-l07-h12": "A scroll reading 'A point is that which has no part,' with an arrow to the word part and a question mark.",
  "u01-hook-l09-h13": "A three-box planet checklist, Earth meeting all three tests and Pluto failing the last.",
  "u01-hook-l12-h14": "A globe triangle from the North Pole along two meridians to the equator, with three right-angle marks."
};

const files = fs.existsSync(SRC) ? fs.readdirSync(SRC).filter((f) => f.endsWith(".svg")).sort() : [];
const wiring = [];
const copied = [];
const skipped = [];
const dashes = [];
for (const name of files) {
  const slot = name.replace(/\.svg$/, "");
  const to = path.join(DEST, name);
  if (HOLD_BACK.has(slot) || KEEP_GENERATOR.has(slot)) {
    skipped.push(name);
    if (fs.existsSync(to)) fs.unlinkSync(to);
    continue;
  }
  const from = path.join(SRC, name);
  let text = fs.readFileSync(from, "utf8");
  if (/[\u2013\u2014]/.test(text)) {
    dashes.push(name);
    text = text.replace(/\u2013/g, "-").replace(/\u2014/g, "-");
  }
  fs.writeFileSync(to, text);
  copied.push(name);
  const hookM = name.match(hookNameRe);
  const isSlot = slotRe.test(name) || hookRe.test(name) || !!hookM;
  if (isSlot) wiring.push({ slot, file: name, alt: alts.get(slot) || HOOK_ALTS[slot] || "" });
}
// Drop leftover held-back or protected files if the source list no longer includes them.
for (const name of fs.existsSync(DEST) ? fs.readdirSync(DEST) : []) {
  const slot = name.replace(/\.svg$/, "");
  if ((HOLD_BACK.has(slot) || KEEP_GENERATOR.has(slot)) && name.endsWith(".svg")) {
    fs.unlinkSync(path.join(DEST, name));
    if (!skipped.includes(name)) skipped.push(name);
  }
}

// Alias each lesson's first hook (lowest H number) as u01-lNN-hook, and H6 as Eratosthenes.
const byLesson = new Map();
for (const row of wiring) {
  const m = row.slot.match(/^u01-hook-l(\d{2})-h(\d+)$/);
  if (!m) continue;
  const list = byLesson.get(m[1]) || [];
  list.push({ n: +m[2], row });
  byLesson.set(m[1], list);
}
for (const [lesson, list] of byLesson) {
  list.sort((a, b) => a.n - b.n);
  const pick = list[0].row;
  const alias = `u01-l${lesson}-hook`;
  if (!wiring.some((r) => r.slot === alias)) wiring.push({ slot: alias, file: pick.file, alt: pick.alt });
  const era = list.find((x) => x.n === 6);
  if (era) {
    const ealias = `u01-l${lesson}-eratosthenes`;
    if (!wiring.some((r) => r.slot === ealias)) wiring.push({ slot: ealias, file: era.row.file, alt: era.row.alt });
  }
}

wiring.sort((a, b) => a.slot.localeCompare(b.slot, undefined, { numeric: true }));
fs.writeFileSync(WIRE, JSON.stringify(wiring, null, 2) + "\n");
console.log(JSON.stringify({ copied: copied.length, wired: wiring.length, skipped, hooks: copied.filter((f) => hookNameRe.test(f) || hookRe.test(f)), plates: copied.filter((f) => plateRe.test(f)), dashes, src: SRC }, null, 2));
