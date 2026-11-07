// Builds the Geometry course from docs/geometry/progression.md (the plan) and tools/geometry/content/*.mjs
// (the lesson text). Writes:
//   public/geometry/geo-catalog.js        the library catalog (one storybook per lesson)
//   public/geometry/decks/<slug>/deck.json the pages of each storybook (drawn by public/geometry/geo-page.js)
//   public/geometry/covers/*.svg           unit covers and the course card (public/geometry/geo-covers.js)
// Usage: node tools/geometry/build.mjs [--check]   (--check verifies the outputs are current, writes nothing)
import fs from "node:fs";
import { worked, practice, mistake, exitBody } from "./template-v2.mjs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const PUB = path.join(ROOT, "public/geometry");
const CHECK = process.argv.includes("--check");
const plan = fs.readFileSync(path.join(ROOT, "docs/geometry/progression.md"), "utf8");
const content = {};
for (const f of ["u01-u04", "u05-u08", "u09-u12"]) Object.assign(content, (await import(pathToFileURL(path.join(ROOT, `tools/geometry/content/${f}.mjs`)))).default);
const citations = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/geometry/jacobs-map.json"), "utf8"));
// Unit 4 pilot content is held in drafts until the revised specification is approved.
const { coverSvg } = await import(pathToFileURL(path.join(PUB, "geo-covers.js")));
const artMap = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/geometry/art-map.json"), "utf8"));

// the 44 flagged interactives: lesson -> gx/<file>.js export name
export const GXMAP = {
  "1.2": "u01.chords", "1.5": "u01.sierpinski", "1.6": "u01.euclid",
  "2.5": "u02.bisect", "2.7": "u02.vertical", "2.9": "u02.perpdrop", "2.10": "u02.parallel", "2.12": "u02.rosette",
  "3.2": "u03.translate", "3.3": "u03.reflect", "3.4": "u03.rotate", "3.5": "u03.tworeflect", "3.6": "u03.golf", "3.11": "u03.tessellate",
  "4.2": "u04.parts", "4.11": "u04.ssa", "4.12": "u04.copytri",
  "5.2": "u05.extangle", "5.4": "u05.triineq", "5.9": "u05.transversal", "5.13": "u05.slopes",
  "6.2": "u06.parallelogram", "6.7": "u06.varignon", "6.9": "u06.turtle", "6.10": "u06.pentagon",
  "7.3": "u07.shear", "7.6": "u07.pythag", "7.7": "u07.pytree",
  "8.2": "u08.dilate", "8.3": "u08.dilprops", "8.6": "u08.divide", "8.13": "u08.fractals",
  "9.5": "u09.ratios",
  "10.2": "u10.center", "10.5": "u10.inscribed", "10.9": "u10.secant", "10.11": "u10.circum", "10.12": "u10.incenter", "10.13": "u10.euler", "10.14": "u10.napoleon",
  "11.3": "u11.pi", "11.5": "u11.wedges",
  "12.2": "u12.cross", "12.3": "u12.cavalieri"
};

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const md = (s) => esc(s).replace(/\*\*(.+?)\*\*/g, "<b>$1</b>").replace(/\*(.+?)\*/g, "<i>$1</i>");
const plain = (h) => String(h).replace(/<sup>(.*?)<\/sup>/g, "^$1").replace(/<[^>]+>/g, "").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">");
const pad = (n) => String(n).padStart(2, "0");

// ---- parse the plan ----
const units = [];
let cur = null;
for (const line of plan.split("\n")) {
  const h = line.match(/^## Unit (\d+): (.+?) \((.+)\)\s*$/);
  if (h) { cur = { n: +h[1], title: h[2].replace(/ \+ (Midterm|Final)$/, ""), full: h[2], when: h[3], lessons: [], meta: {} }; units.push(cur); continue; }
  if (/^## /.test(line)) { cur = null; continue; }
  if (!cur) continue;
  const m = line.match(/^- (Big idea|Standards|Misconceptions|Prior knowledge): (.+)$/);
  if (m) { cur.meta[m[1]] = m[2]; continue; }
  const r = line.match(/^\|\s*(\d+)\.(\d+)\s*\|(.*)\|\s*$/);
  if (r) {
    const cells = r[3].split("|").map((c) => c.trim());
    cur.lessons.push({ q: +r[1], lesson: +r[2], key: `${r[1]}.${r[2]}`, title: cells[0], target: cells[1], hook: cells[2], inter: cells[3] || "" });
  }
}
if (units.length !== 12) throw new Error(`expected 12 units, found ${units.length}`);
const all = units.flatMap((u) => u.lessons);
if (all.length !== 180) throw new Error(`expected 180 lessons, found ${all.length}`);
const flagged = all.filter((l) => /^Interactive:/.test(l.inter)).map((l) => l.key).sort();
const mapped = Object.keys(GXMAP).sort();
if (flagged.join() !== mapped.join()) throw new Error(`interactive map mismatch: plan ${flagged.join(" ")} vs map ${mapped.join(" ")}`);

// standards per lesson, from the plan's "Indiana standards coverage check"
const lessonStds = {};
const add = (k, code) => { (lessonStds[k] = lessonStds[k] || []).includes(code) || lessonStds[k].push(code); };
const covSec = plan.split("## Indiana standards coverage check")[1].split("\n## ")[0];
for (const line of covSec.split("\n").filter((l) => /^- G\./.test(l))) {
  let baseCode = "";
  for (const seg of line.slice(2).split("|").map((s) => s.trim()).filter(Boolean)) {
    const mm = seg.match(/^([A-Za-z0-9.]+): (.+)$/);
    if (!mm) continue;
    let code = mm[1];
    if (/^G\./.test(code)) baseCode = code.replace(/[a-z]$/, ""); else code = baseCode + code;
    for (const item of mm[2].split(",").map((s) => s.trim())) {
      let x;
      if ((x = item.match(/^(\d+)\.(\d+) to (\d+)\.(\d+)$/))) { for (let i = +x[2]; i <= +x[4]; i++) add(`${x[1]}.${i}`, code); }
      else if ((x = item.match(/^(\d+)\.(\d+)$/))) add(item, code);
      else if ((x = item.match(/^Unit (\d+)$/))) units[+x[1] - 1].lessons.forEach((l) => add(l.key, code));
    }
  }
}

// ---- lesson kinds ----
const kindOf = (l) => {
  if (/^Midterm/i.test(l.title)) return "midterm";
  if (/^Final/i.test(l.title)) return "final";
  if (/Assessment$/.test(l.title) || /^Assess /.test(l.target)) return "assessment";
  if (/^Review/.test(l.title)) return "review";
  if (/Quiz|Reteach|Flex/.test(l.title)) return "quiz";
  if (/Project|Design Challenge/i.test(l.title) && !content[l.key]) return "project";
  return content[l.key] ? "lesson" : "other";
};

const coverFor = (l) => artMap.lessons[l.key] || artMap.units[String(l.q)] || `covers/u${pad(l.q)}.svg`;
const tagFor = (l) => `GEOMETRY \u00b7 UNIT ${l.q} \u00b7 LESSON ${l.q}.${l.lesson}`;
const stdsFor = (l) => { const a = (l.target.match(/^Assess (G\..+?)\.?$/) || [])[1]; return a ? a.split(",").map((s) => s.trim()) : lessonStds[l.key] || []; };

const decks = {}, catalog = [], missing = [];
for (const u of units) {
  const lessonsWithText = u.lessons.filter((l) => content[l.key]);
  for (const l of u.lessons) {
    const kind = kindOf(l), c = content[l.key], source = citations[l.key], jacobs = source && { section: source.section, pages: source.pages, references: source.references, relationship: source.relationship }, stds = stdsFor(l), pages = [];
    if (kind === "other") missing.push(l.key);
    if (!jacobs) throw new Error(`Missing Jacobs citation for ${l.key}`);
    const page = (title, geo, extra = {}) => pages.push({ n: pages.length + 1, title, items: [], ...extra, geo: { tag: tagFor(l), title, ...geo } });
    page(l.title, { kind: "cover", jacobs, title: l.title, target: md(l.target), stds: stds.join(" \u00b7 "), cover: `geometry/${coverFor(l)}` }, { html: `<h2>${esc(l.title)}</h2><p>${md(l.target)}</p>` });
    if (kind === "lesson") {
      const hook = `<p class="gx-lead">${md(l.hook)}</p><p class="gx-goal"><b>Goal:</b> ${md(l.target)}</p>`;
      page("Get started", { kind: "text", body: hook, fig: c.fig }, { html: hook });
      page("The big idea", { kind: "text", body: c.idea, fig: c.fig }, { html: c.idea });
      if (GXMAP[l.key]) { const how = md(l.inter.replace(/^Interactive: (sandbox|construction)\.\s*/, "")); page("Try it", { kind: "gx", gx: GXMAP[l.key] }, { html: `<p>${how}</p><p>Use the controls in the panel. Drag the hollow points on the board.</p>` }); }
      for (const example of c.workedExamples || []) worked(page, { ...example, figure: example.figure || c.figure });
      for (const item of c.practice || []) practice(page, { ...item, figure: item.figure || c.figure });
      const q = `<p class="gx-q">${c.check[0]}</p><p class="gx-hint">Work it out, then press <b>Show the answer</b>.</p>`;
      page("Check yourself", { kind: "text", body: q, fig: c.checkFig || null }, { html: `<p>${c.check[0]}</p>`, reveal: plain(c.check[1]) });
      const commonMistake = c.commonMistake || {
        prompt: source.misconception ? `A student says: ${source.misconception.split(" Surface it:")[0]}` : "A student says one successful drawing proves every case. What is missing?",
        correction: c.idea + (!source.misconception ? "<p>A drawing can suggest a conjecture. A general claim requires a reason covering every stated case.</p>" : "")
      };
      mistake(page, commonMistake.prompt, commonMistake.correction, commonMistake.figure || c.figure);
      const exit = exitBody(c.exitTicket || [plain(c.check[0]), "Explain the reason behind your answer in one sentence."]);
      page("Exit ticket", { kind: "exit-ticket", body: exit }, { html: exit });
    } else {
      // review, assessment, project and exam lessons are built from the plan itself
      const scope = kind === "midterm" ? units.slice(0, 6) : kind === "final" ? units : [u];
      const targets = scope.flatMap((x) => x.lessons.filter((y) => kindOf(y) === "lesson").map((y) => `<li><b>${y.key}</b> ${md(y.target)}</li>`));
      const intro = kind === "review" || kind === "quiz" ? `<p class="gx-lead">${md(l.hook || "Practice the lessons so far, then check your answers.")}</p><p class="gx-goal"><b>Goal:</b> ${md(l.target)}</p>` : kind === "project" ? `<p class="gx-lead">${md(l.hook)}</p><p class="gx-goal"><b>Goal:</b> ${md(l.target)}</p>` : `<p class="gx-lead">${kind === "assessment" ? `This assessment covers ${esc(stds.join(", "))}.` : `The ${kind} covers ${kind === "midterm" ? "Units 1 to 6" : "the whole year"}.`} Use the targets below as a checklist: can you do each one without notes?</p>`;
      page(kind === "project" ? "The project" : "What to know", { kind: "text", body: intro + (kind === "project" ? "" : `<ul class="gx-list">${(kind === "final" || kind === "midterm" ? scope.map((x) => `<li><b>Unit ${x.n}</b> ${md(x.title)}: ${md((x.meta["Big idea"] || "").split(" Essential question:")[0])}</li>`) : targets).join("")}</ul>`), fig: null }, { html: intro });
      if (kind === "review" || kind === "assessment" || kind === "quiz") {
        const pool = kind === "quiz" ? lessonsWithText.filter((y) => y.lesson < l.lesson) : lessonsWithText;
        const picks = pool.filter((y) => y.lesson % 3 === 1 || pool.length < 6).slice(0, 4);
        for (const y of picks) { const cc = content[y.key]; page(`Practice: ${y.key}`, { kind: "text", body: `<p class="gx-q">${cc.check[0]}</p><p class="gx-hint">From lesson ${y.key}, ${esc(y.title)}.</p>`, fig: null }, { html: `<p>${cc.check[0]}</p>`, reveal: plain(cc.check[1]) }); }
        if (u.meta.Misconceptions) { const mis = `<p>Watch out for these common mistakes:</p><ul class="gx-list">${u.meta.Misconceptions.split(";").map((s) => `<li>${md(s.trim())}</li>`).join("")}</ul>`; page("Common traps", { kind: "text", body: mis, fig: null }, { html: mis }); }
      }
    }
    const slug = `u${pad(l.q)}-l${pad(l.lesson)}`;
    decks[slug] = { jacobs, key: `U${pad(l.q)}-L${pad(l.lesson)}`, slides: pages };
    catalog.push({ key: `U${pad(l.q)}-L${pad(l.lesson)}`, slug, q: l.q, module: u.title, lesson: l.lesson, title: l.title, tag: tagFor(l), sub: `Unit ${l.q}: ${u.title}`, jacobs, slides: pages.length, pages: [], standards: stds, built: true, cover: coverFor(l), kind, gx: GXMAP[l.key] || null });
  }
}
if (missing.length) throw new Error(`lessons with no text and no generated kind: ${missing.join(" ")}`);

// ---- write ----
const outputs = new Map();
outputs.set(path.join(PUB, "geo-catalog.js"), `// Geometry catalog, generated by tools/geometry/build.mjs from docs/geometry/progression.md. Do not edit by hand.\n// One storybook per lesson (q = unit number). "cover" is a path under geometry/, swappable in tools/geometry/art-map.json.\nexport const DECKS = ${JSON.stringify(catalog, null, 1)};\nexport const UNITS = ${JSON.stringify(units.map((u) => ({ n: u.n, title: u.title, when: u.when, bigIdea: u.meta["Big idea"] || "", standards: u.meta.Standards || "" })), null, 1)};\n`);
for (const [slug, d] of Object.entries(decks)) outputs.set(path.join(PUB, "decks", slug, "deck.json"), JSON.stringify(d) + "\n");
for (let n = 1; n <= 12; n++) outputs.set(path.join(PUB, "covers", `u${pad(n)}.svg`), coverSvg(n));
outputs.set(path.join(PUB, "covers", "course.svg"), coverSvg("course"));
let stale = 0;
for (const [f, s] of outputs) {
  const old = fs.existsSync(f) ? fs.readFileSync(f, "utf8") : null;
  if (old === s) continue;
  stale++;
  if (!CHECK) { fs.mkdirSync(path.dirname(f), { recursive: true }); fs.writeFileSync(f, s); }
}
const nGx = Object.keys(GXMAP).length;
console.log(`geometry: ${catalog.length} lessons, ${Object.values(decks).reduce((s, d) => s + d.slides.length, 0)} pages, ${nGx} interactives, ${outputs.size} files, ${stale} ${CHECK ? "stale" : "written"}`);
if (CHECK && stale) process.exit(1);
