// Packs Leo's panel icons (tools/night-sky/icons-src/*.svg, unchanged) into one file, public/night-sky/ui/icons.json,
// to keep public/ under the file budget (tests/study-questions.test.mjs) and to load 1 request instead of 24.
// Usage: node tools/night-sky/pack-icons.mjs
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const HERE = dirname(fileURLToPath(import.meta.url));
const SRC = join(HERE, "icons-src"), OUT = join(HERE, "../../public/night-sky/ui/icons.json");
const icons = {};
for (const f of readdirSync(SRC).filter((f) => f.endsWith(".svg")).sort()) icons[f.slice(0, -4)] = readFileSync(join(SRC, f), "utf8").trim();
writeFileSync(OUT, JSON.stringify({ source: "Leo, night-sky ui/icons (SVG text verbatim)", icons }, null, 1) + "\n");
console.log(Object.keys(icons).length, "icons ->", OUT);
