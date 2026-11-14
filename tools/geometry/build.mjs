// Builds the Geometry course from docs/geometry/progression.md (the plan) and tools/geometry/content/*.mjs
// (the lesson text). Writes:
//   public/geometry/geo-catalog.js        the library catalog (one storybook per lesson)
//   public/geometry/decks/<slug>/deck.json the pages of each storybook (drawn by public/geometry/geo-page.js)
//   public/geometry/covers/*.svg           unit covers and the course card (public/geometry/geo-covers.js)
// Usage: node tools/geometry/build.mjs [--check]   (--check verifies the outputs are current, writes nothing)
import fs from "node:fs";
import { unit04 } from "./u04-template.mjs";
import { unit04Figure } from "./u04-art.mjs";
import { unit01, unit01Slots } from "./u01-template.mjs";
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
const unit04Data = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/geometry/u04-v2.json"), "utf8"));
const unit01Data = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/geometry/u01-v2.json"), "utf8"));
const { coverSvg } = await import(pathToFileURL(path.join(PUB, "geo-covers.js")));
const artMap = JSON.parse(fs.readFileSync(path.join(ROOT, "tools/geometry/art-map.json"), "utf8"));

// the 48 flagged interactives: lesson -> gx/<file>.js export name
export const GXMAP = {
  "1.1": "u01.illusion", "1.2": "u01.chords", "1.3": "u01.streets", "1.4": "u01.earth", "1.5": "u01.sierpinski", "1.6": "u01.euclid", "1.8": "u01.truth", "1.9": "u01.kite", "1.10": "u01.shuffle", "1.12": "u01.wall",
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

const coverFor = (l) => {
  if (l.q === 1) {
    for (const name of [`u01-cover-l${pad(l.lesson)}.svg`, `u01-l${pad(l.lesson)}-cover.svg`, `u01-l${pad(l.lesson)}-plate.svg`]) {
      if (fs.existsSync(path.join(PUB, "figures/u01", name))) return `figures/u01/${name}`;
    }
  }
  return artMap.lessons[l.key] || artMap.units[String(l.q)] || `covers/u${pad(l.q)}.svg`;
};
const tagFor = (l) => `GEOMETRY \u00b7 UNIT ${l.q} \u00b7 LESSON ${l.q}.${l.lesson}`;
const stdsFor = (l) => { const a = (l.target.match(/^Assess (G\..+?)\.?$/) || [])[1]; return a ? a.split(",").map((s) => s.trim()) : lessonStds[l.key] || []; };

const decks = {}, catalog = [], missing = [];
for (const u of units) {
  const lessonsWithText = u.lessons.filter((l) => content[l.key]);
  for (const l of u.lessons) {
    const kind = kindOf(l), c = content[l.key], source = citations[l.key], jacobs = source && { section: source.section, pages: source.pages, references: source.references, relationship: source.relationship }, stds = stdsFor(l), pages = [];
    if (kind === "other") missing.push(l.key);
    if (!jacobs) throw new Error(`Missing Jacobs citation for ${l.key}`);
    const page = (title, geo, extra = {}) => {
      const n=pages.length+1;
      if(l.q===4 && ["worked-example","practice","common-mistake"].includes(geo.kind))geo={...geo,figure:unit04Figure(l.lesson,n,geo.figure)};
      pages.push({ n, title, items: [], ...extra, geo: { tag: tagFor(l), title, ...geo } });
    };
    page(l.title, { kind: "cover", jacobs, title: l.title, target: md(l.target) + (l.key === "4.10" ? "<br>Two-day lesson: Day 1 interior case; Day 2 exterior and endpoint cases." : ""), stds: stds.join(" \u00b7 "), cover: `geometry/${coverFor(l)}` }, { html: `<h2>${esc(l.title)}</h2><p>${md(l.target)}</p>` });
    if (l.q === 1) {
      unit01(page, l, c, unit01Data[l.key], GXMAP[l.key], unit01Data);
    } else if (l.q === 4) {
      unit04(page, l, c, unit04Data[l.key], GXMAP[l.key]);
    } else if (kind === "lesson") {
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
// Printable learners receive only prompts and given figures, never a hidden key.
for (const form of ["A", "B"]) {
  const items=unit04Data["4.16"].forms[form];
  const figures=decks["u04-l16"].slides.filter(s=>s.geo.kind==="practice").slice(form==="A"?0:12,form==="A"?12:24);
  const body=items.map((item,i)=>`<section class="item"><h2>${i+1}.</h2><p>${esc(item.prompt)}</p><figure>${figures[i].geo.figure.svg}</figure><div class="work" aria-label="Space for working"></div></section>`).join("");
  outputs.set(path.join(PUB,"forms",`unit04-${form.toLowerCase()}.html`),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unit 4, Form ${form}</title><style>body{max-width:850px;margin:24px auto;padding:16px;font:18px/1.4 Georgia,serif;color:#111;background:white}h1{font-size:30px}.item{break-inside:avoid;border-top:1px dashed #777;padding:12px 0}h2{display:inline;font-size:20px}figure{margin:0;width:100%;max-width:500px}svg{width:100%;height:auto}.work{min-height:130px}@media screen{.item:last-child{min-height:calc(100svh - 32px)}}@media print{body{margin:0;padding:0}.item{break-after:page}.item:last-child{break-after:auto}button,a{display:none}}</style></head><body><h1>Geometry Unit 4: Form ${form}</h1><p>Name: ____________________ Date: ______________</p><p>Show equations, proof reasons and ordered correspondence. All figures are supplied inline. Do not use trig or the distance formula for SSA explanations.</p><p>Original aligned items. Related scope: Jacobs 4.2 to 4.7, pp. 139 to 175; Chapter 4 review, pp. 176 to 180.</p>${body}</body></html>\n`);
}
for (const form of ["A", "B"]) {
  const items=unit01Data["1.14"].forms[form];
  const figures=decks["u01-l14"].slides.filter(s=>s.geo.kind==="practice").slice(form==="A"?0:12,form==="A"?12:24);
  const body=items.map((item,i)=>`<section class="item"><h2>${i+1}.</h2><p>${esc(item.prompt)}</p>${figures[i].geo.figure.svg?`<figure>${figures[i].geo.figure.svg}</figure>`:""}<div class="work" aria-label="Space for working"></div></section>`).join("");
  outputs.set(path.join(PUB,"forms",`unit01-${form.toLowerCase()}.html`),`<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unit 1, Form ${form}</title><style>body{max-width:850px;margin:24px auto;padding:16px;font:18px/1.4 Georgia,serif;color:#111;background:white}h1{font-size:30px}.item{break-inside:avoid;border-top:1px dashed #777;padding:12px 0}h2{display:inline;font-size:20px}figure{margin:0;width:100%;max-width:500px}svg{width:100%;height:auto}.work{min-height:130px}@media print{body{margin:0;padding:0}.item{break-after:page}.item:last-child{break-after:auto}a{display:none}}</style></head><body><h1>Geometry Unit 1: Form ${form}</h1><p>Name: ____________________ Date: ______________</p><p>Show every reason. A drawing is not evidence unless the problem gives it.</p><p>Original aligned items. Related scope: Jacobs Introduction and Chapters 1 and 2.</p>${body}</body></html>\n`);
}
// Unit 1 figure inventory for Leo: every slot that still needs supplied art, with its spec text and builder data.
{
  const builderFor=(id)=>{const [,L,S]=id.match(/l(\d+)-s(\d+)/).map(Number);const v=unit01Data[`1.${L}`];if(L===13)return v.practice[S-3].diagram;if(L===14){const f=S<16?"A":"B";return v.forms[f][S-(f==="A"?4:16)].diagram;}const key={5:"W1",6:"W2",9:"P1",10:"P2",11:"P3"}[S];return key?v.builderDiagrams[key]||"":"";};
  const by=(st)=>unit01Slots.filter(s=>s.status===st);
  const lines=["# Unit 1: figure commission from the final spec","","Student wording: Socrates. Math: Euclid. Build: feat/geometry-v2-u01. Black strokes on white, live text labels, no color coding. Use class=\"given\" or data-step=\"0\" for marks that draw when the page opens, data-step=\"N\" (1-based, matching the student step table) for marks that draw when that step is revealed, and class=\"conclusion\" for marks that wait for Show all or Reveal. Full layer convention: docs/geometry/v2/LEO-LAYER-CONVENTION.md. Builder coordinates are layout data only; never draw them as learner labels.","","Wire supplied SVGs in tools/geometry/u01-art-wiring.json as {slot, file, alt}, with files in public/geometry/figures/u01/u01-<slot>.svg. A supplied file replaces any generator figure or the clean waiting slot for that id.","",`Counts: ${unit01Slots.length} figure slots. ${by("generator").length} drawn by the generator, ${by("leo").length} supplied by Leo, ${by("none").length} live text only, ${by("pending").length} NEED LEO ART.`,"","## Needs Leo art (clean waiting slots until delivered)",""];
  for(const s of by("pending"))lines.push(`- [ ] ${s.id}: ${s.spec}`,`  - Builder spec: ${builderFor(s.id)||"none given"}`);
  lines.push("","## Drawn by the generator (review for style; replace by wiring an SVG if wanted)","");
  for(const s of by("generator"))lines.push(`- ${s.id}: ${s.spec}`,`  - Builder spec: ${builderFor(s.id)||"none given"}`);
  lines.push("","## Supplied by Leo","");for(const s of by("leo"))lines.push(`- [x] ${s.id}`);
  lines.push("","## Live text only (no figure)","");for(const s of by("none"))lines.push(`- ${s.id}: ${s.spec}`);
  outputs.set(path.join(ROOT,"docs/geometry/v2/LEO-DIAGRAMS-unit01.md"),lines.join("\n")+"\n");
}
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
