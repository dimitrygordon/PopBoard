// Physics 101 storybooks on the shared Astronomy Course engine: catalog, course registry, pages, and content rules.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { DECKS } from "../public/physics101/p101-catalog.js";
import { DECKS as ASTRO } from "../public/astro-course/ac-catalog.js";
import { COURSES, courseId, themeKey, pageKey, standardsLine } from "../public/astro-course/ac-courses.js";
import { searchDeck } from "../public/astro-course/ac-render.js";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const read = (f) => readFileSync(join(PUB, f), "utf8");

const LESSONS = {
  1: ["A Physics Toolkit", ["Methods of Science", "Mathematics and Physics", "Measurement", "Graphing Data"]],
  2: ["Representing Motion", ["Picturing Motion", "Where and When?", "Position-Time Graphs", "How Fast?"]],
  3: ["Accelerated Motion", ["Acceleration", "Motion with Constant Acceleration", "Free Fall"]],
  4: ["Forces in One Dimension", ["Force and Motion", "Weight and Drag Force", "Newton's Third Law"]],
  5: ["Displacement and Force in Two Dimensions", ["Vectors", "Friction", "Forces in Two Dimensions"]],
  6: ["Motion in Two Dimensions", ["Projectile Motion", "Circular Motion", "Relative Velocity"]],
  7: ["Gravitation",["Planetary Motion and Gravitation","Using the Law of Universal Gravitation"]],
  8: ["Rotational Motion",["Describing Rotational Motion","Rotational Dynamics","Equilibrium"]],
  9: ["Momentum and Its Conservation",["Impulse and Momentum","Conservation of Momentum"]],
  10: ["Energy and Its Conservation",["Work and Energy","The Many Forms of Energy","Conservation of Energy","Machines"]],
  11: ["Thermal Energy",["Temperature, Heat, and Thermal Energy","Changes of State and Thermodynamics"]],
  12: ["States of Matter",["Properties of Fluids","Forces Within Liquids","Fluids at Rest and in Motion","Solids"]],
  13: ["Vibrations and Waves",["Periodic Motion","Wave Properties","Wave Behavior"]],
  14: ["Sound",["Properties and Detection of Sound","The Physics of Music"]],
  15: ["Fundamentals of Light",["Illumination","The Wave Nature of Light"]],
  16: ["Reflection and Refraction",["Reflection of Light","Curved Mirrors","Refraction of Light","Convex and Concave Lenses"]],
  17: ["Interference and Diffraction",["Interference","Diffraction"]],
  18: ["Electrostatics",["Electric Charge","Electrostatic Force","Measuring Electric Fields","Applications of Electric Fields"]],
  19: ["Current Electricity",["Current and Circuits","Using Electrical Energy","Simple Circuits","Applications of Circuits"]],
  20: ["Magnetism",["Understanding Magnetism","Applying Magnetic Forces"]],
  21: ["Electromagnetism",["Inducing Currents","Applications of Induced Currents","Electric and Magnetic Forces on Particles","Electric and Magnetic Fields in Space"]],
  22: ["Quantum Theory and the Atom",["A Particle Model of Waves","Matter Waves","Bohr's Model of the Atom","The Quantum Model of the Atom"]],
  23: ["Solid-State Electronics",["Conduction in Solids","Electronic Components"]],
  24: ["Nuclear and Particle Physics",["The Nucleus","Nuclear Decay and Reactions","The Building Blocks of Matter"]]
};

test("catalog lists every module 1-24 lesson once, in course order, grouped by module", () => {
  const want = Object.entries(LESSONS).flatMap(([m, [, ls]]) => ls.map((t, i) => [+m, i + 1, t]));
  assert.equal(DECKS.length, want.length);
  DECKS.forEach((d, i) => {
    const [m, l, t] = want[i];
    assert.equal(d.title, t);
    assert.equal(d.q, m);
    assert.equal(d.lesson, l);
    assert.equal(d.module, LESSONS[m][0]);
    assert.equal(d.slug, `m${String(m).padStart(2, "0")}-l${String(l).padStart(2, "0")}`);
    assert.equal(d.key, d.slug.toUpperCase());
  });
  assert.equal(new Set(DECKS.map((d) => d.slug)).size, DECKS.length);
});

const BUILT = ["m01-l01", "m01-l02", "m01-l03", "m01-l04", "m02-l01", "m02-l02", "m02-l03", "m02-l04", "m03-l01", "m03-l02", "m03-l03", "m04-l01", "m04-l02", "m04-l03", "m05-l01", "m05-l02", "m05-l03", "m06-l01", "m06-l02", "m06-l03", "m07-l01", "m07-l02", "m08-l01", "m08-l02", "m08-l03", "m09-l01", "m09-l02", "m10-l01", "m10-l02", "m10-l03", "m10-l04", "m11-l01", "m11-l02", "m12-l01", "m12-l02", "m12-l03", "m12-l04", "m13-l01", "m13-l02", "m13-l03", "m14-l01", "m14-l02", "m15-l01", "m15-l02", "m16-l01", "m16-l02", "m16-l03", "m16-l04", "m17-l01", "m17-l02", "m18-l01", "m18-l02", "m18-l03", "m18-l04", "m19-l01", "m19-l02", "m19-l03", "m19-l04", "m20-l01", "m20-l02", "m21-l01", "m21-l02", "m21-l03", "m21-l04", "m22-l01", "m22-l02", "m22-l03", "m22-l04", "m23-l01", "m23-l02", "m24-l01", "m24-l02", "m24-l03"];
test("every lesson after Module 24 is still a coming-soon placeholder with no lesson text", () => {
  for (const d of DECKS.filter((x) => !BUILT.includes(x.slug))) {
    assert.equal(d.built, false, d.key);
    assert.equal(d.slides, 0, d.key);
    assert.deepEqual(d.pages, [], d.key);
    assert.ok(!existsSync(join(PUB, "physics101", "decks", d.slug)), "no deck folder yet for " + d.slug);
  }
});

test("course registry: Astronomy stays the default, Physics 101 has its own pages and keys", () => {
  assert.equal(courseId({ documentElement: { dataset: {} } }), "astronomy");
  assert.equal(courseId({ documentElement: { dataset: { course: "physics101" } } }), "physics101");
  assert.equal(courseId({ documentElement: { dataset: { course: "nope" } } }), "astronomy");
  const a = COURSES.astronomy, p = COURSES.physics101;
  // unchanged Astronomy keys, so saved pages and themes carry over
  assert.equal(themeKey(a), "popboard.astronomy-course.theme");
  assert.equal(pageKey(a, "d01"), "popboard.astronomy-course.page.d01");
  assert.equal(themeKey(p), "popboard.physics101.theme");
  assert.equal(pageKey(p, "m01-l01"), "popboard.physics101.page.m01-l01");
  assert.equal(p.param, "lesson");
  for (const c of [a, p]) for (const f of [c.library, c.story]) assert.ok(existsSync(join(PUB, f)), f);
  assert.equal(p.group(DECKS[0]), "Module 1");
  assert.equal(p.label(DECKS[0]), "Lesson 1");
  assert.equal(a.group(ASTRO[0]), "Q1");
  assert.equal(a.label(ASTRO[0]), "Deck 1");
});

test("library search finds lessons by title and module", () => {
  const hits = (q) => DECKS.filter((d) => searchDeck(d, q)).map((d) => d.slug);
  assert.deepEqual(hits("free fall"), ["m03-l03"]);
  assert.deepEqual(hits("Accelerated Motion"), ["m03-l01", "m03-l02", "m03-l03"]);
  assert.equal(hits("").length, DECKS.length);
  assert.deepEqual(hits("zzzz"), []);
});

test("pages name the course, reuse the engine, and have module filters", () => {
  const lib = read("study-physics101.html"), story = read("study-physics101-story.html");
  for (const h of [lib, story]) {
    assert.match(h, /<html[^>]*data-course="physics101"/);
    assert.match(h, /popboard\.physics101\.theme/);
    assert.match(h, /name="viewport"/);
    assert.match(h, /astro-course\/ac-theme\.css/);
    assert.match(h, /physics101\/p101\.css/);
  }
  assert.match(lib, /src="astro-course\/ac-library-ui\.js"/);
  assert.match(story, /src="astro-course\/ac-story\.js"/);
  // module buttons are built from the catalog (ac-library-ui.js), so the page only carries "All"
  assert.match(lib, /class="lib-filters"[^>]*data-auto="module"/);
  assert.match(lib, /id="q" type="search"/);
  // one engine: no forked reader or library under physics101/ (sq-*.js are Study Questions, not a reader)
  assert.deepEqual(readdirSync(join(PUB, "physics101")).filter((f) => f.endsWith(".js")), ["p101-catalog.js", "sq-core.js", "sq-page.js", "sq-tab.js", "tryit.js"]);
});

test("Study library links to Physics 101 next to the Astronomy Course", () => {
  const study = read("study.html");
  const a = study.indexOf('file: "study-astronomy-course.html"'), p = study.indexOf('file: "study-physics101.html"');
  assert.ok(a > 0 && p > a);
});

test("Physics 101 files: no em-dashes, no mascot, no Firebase", () => {
  const files = ["study-physics101.html", "study-physics101-story.html", "physics101/p101-catalog.js", "physics101/p101.css", "astro-course/ac-courses.js"];
  for (const f of files) {
    const src = read(f);
    assert.ok(!src.includes("\u2014"), "em-dash in " + f);
    assert.ok(!/jasper/i.test(src), "mascot in " + f);
    assert.ok(!/firebase/i.test(src), "firebase in " + f);
  }
});

test("standards line: codes joined with a middle dot, empty when none, shown under the cover title", () => {
  assert.equal(standardsLine({ standards: ["PH.1.2", "PH.1.3"] }), "PH.1.2 \u00b7 PH.1.3");
  assert.equal(standardsLine({ standards: [" PH.1.2 ", ""] }), "PH.1.2");
  assert.equal(standardsLine({ standards: [] }), "");
  assert.equal(standardsLine({}), "");
  for (const d of DECKS) assert.ok(Array.isArray(d.standards), d.key);
  const lib = read("astro-course/ac-library-ui.js"), story = read("astro-course/ac-story.js"), css = read("physics101/p101.css");
  assert.match(lib, /<h2>\$\{esc\(d\.title\)\}<\/h2>\$\{standardsLine\(d\)/);
  assert.match(story, /<h2>\$\{esc\(meta\.title\)\}<\/h2>\$\{standardsLine\(meta\)/);
  assert.match(css, /\.stds[^{]*\{[^}]*--ac-note-font/);
});

test("library strips: short M# \u00b7 L# label, one color variable per module", () => {
  const p = COURSES.physics101;
  assert.equal(p.strip(DECKS[5]), "M2 \u00b7 L2");
  assert.equal(p.group(DECKS[5]) + " \u00b7 " + p.label(DECKS[5]), "Module 2 \u00b7 Lesson 2");
  assert.equal(COURSES.astronomy.strip, null);
  const css = read("physics101/p101.css");
  assert.match(css, /--p101-m1:\s*#E2B654/i);
  for (let m = 1; m <= 6; m++) assert.match(css, new RegExp(`data-q="${m}"\\] \\.strip \\{ background: var\\(--p101-m${m}\\)`));
});

test("standards from the standards map: every lesson has codes or the Science & Engineering Practices tag", () => {
  const want = { "m03-l03": ["HS-PS2-1"], "m04-l01": ["HS-PS2-1"], "m04-l02": ["HS-PS2-1", "HS-PS2-3", "HS-PS2-4"], "m04-l03": ["HS-PS2-1"],
    "m05-l02": ["HS-PS2-1"], "m05-l03": ["HS-PS2-1"], "m06-l02": ["HS-PS2-1"],
    "m07-l01": ["HS-PS2-1","HS-PS2-4"], "m07-l02": ["HS-PS2-1","HS-PS2-4"], "m08-l02": ["HS-PS2-1"], "m08-l03": ["HS-PS2-1"], "m09-l01": ["HS-PS2-1","HS-PS2-2","HS-PS2-3"], "m09-l02": ["HS-PS2-2"], "m10-l01": ["HS-PS3-1"], "m10-l02": ["HS-PS3-1","HS-PS3-2"], "m10-l03": ["HS-PS2-2","HS-PS3-1","HS-PS3-2","HS-PS3-3"], "m11-l01": ["HS-PS3-1","HS-PS3-2"], "m11-l02": ["HS-PS3-1","HS-PS3-2"], "m13-l01": ["HS-PS3-1","HS-PS3-2"], "m13-l02": ["HS-PS4-1"], "m13-l03": ["HS-PS4-1"], "m14-l01": ["HS-PS4-1"], "m14-l02": ["HS-PS4-1"], "m15-l01": ["HS-PS4-1"], "m15-l02": ["HS-PS3-3","HS-PS4-1","HS-PS4-3"], "m16-l03": ["HS-PS4-1"], "m17-l01": ["HS-PS4-1","HS-PS4-3"], "m17-l02": ["HS-PS4-1","HS-PS4-3"], "m18-l01": ["HS-PS2-4"], "m18-l02": ["HS-PS2-4"], "m18-l03": ["HS-PS2-4","HS-PS3-5"], "m18-l04": ["HS-PS3-2","HS-PS3-5"], "m19-l01": ["HS-PS3-2","HS-PS3-3"], "m19-l02": ["HS-PS3-1","HS-PS3-3"], "m19-l03": ["HS-PS3-1"], "m20-l01": ["HS-PS3-5"], "m20-l02": ["HS-PS3-3","HS-PS3-5"], "m21-l01": ["HS-PS3-3","HS-PS3-5"], "m21-l02": ["HS-PS3-3","HS-PS3-5"], "m21-l04": ["HS-PS4-1","HS-PS4-4"], "m22-l01": ["HS-PS4-3"], "m22-l02": ["HS-PS4-3"], "m22-l03": ["HS-PS4-3"], "m22-l04": ["HS-PS4-3"], "m24-l03": ["HS-PS3-5"] };
  assert.equal(DECKS.length, 73);
  for (const d of DECKS) assert.deepEqual(d.standards, want[d.slug] || ["Science & Engineering Practices"], d.slug);
  const m1 = DECKS.find((d) => d.slug === "m01-l01");
  assert.equal(standardsLine(m1), "Science & Engineering Practices");
  assert.equal(standardsLine(DECKS.find((d) => d.slug === "m04-l02")), "HS-PS2-1 \u00b7 HS-PS2-3 \u00b7 HS-PS2-4");
  assert.match(read("astro-course/ac-story.js"), /page === 1 && standardsLine\(meta\)/);
});

test("course index has exactly one module filter per module, each tinted with its accent", () => {
  const lib = read("study-physics101.html"), ui = read("astro-course/ac-library-ui.js"), css = read("physics101/p101.css");
  const mods = [...new Set(DECKS.map((d) => d.q))].sort((a, b) => a - b);
  assert.deepEqual(mods, Array.from({ length: 24 }, (_, i) => i + 1));
  // no hand-written module buttons left to drift; only "All"
  assert.deepEqual([...lib.matchAll(/data-q="(\d+)"/g)].map((m) => m[1]), ["0"]);
  // the generator emits one pill per distinct module in the catalog
  assert.match(ui, /new Set\(DECKS\.map\(\(d\) => d\.q\)\)/);
  assert.match(ui, /class="mod-pill" data-q="\$\{m\}"[^`]*--pill:var\(--p101-m\$\{m\}\)/);
  const leo = { 16: "#AA5B5E", 17: "#4AC7E4", 18: "#677C3F", 19: "#9C7040", 20: "#72748E", 21: "#36A896", 22: "#3583AD", 23: "#8A669E", 24: "#36815A" };
  for (const m of mods) {
    const hex = css.match(new RegExp(`--p101-m${m}: (#[0-9A-Fa-f]{6})`));
    assert.ok(hex, `accent for module ${m}`);
    if (leo[m]) assert.equal(hex[1].toUpperCase(), leo[m]);
  }
});
