// Dimitry's DIY PBL Bookshare: 20 pages, Leo art, teleprompter, no audio, Round 1 fixes.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const PUB = join(dirname(fileURLToPath(import.meta.url)), "..", "public");
const DIR = join(PUB, "diy-pbl-bookshare");
const TITLE = "Dimitry's DIY Project Based Learning for Math and Science Bookshare";
const { PAGES, PAGE_COUNT } = await import(pathToFileURL(join(DIR, "bs-pages.js")).href);
const { SLIDES } = await import(pathToFileURL(join(DIR, "bs-data.js")).href);
const { PLACEMENTS } = await import(pathToFileURL(join(DIR, "bs-placements.js")).href);
const files = ["bs-pages.js", "bs-engine.js", "bs-app.js", "bs.css", "bs-data.js", "bs-placements.js", "bs-transitions.js", "script.md"]
  .map((f) => readFileSync(join(DIR, f), "utf8"))
  .concat(readFileSync(join(PUB, "study-diy-pbl-bookshare.html"), "utf8"));

test("21 pages with titles, builds, and teleprompter script", () => {
  assert.equal(PAGE_COUNT, 21);
  assert.equal(PAGES.length, 21);
  assert.equal(SLIDES.length, 21);
  for (const p of PAGES) {
    assert.ok(p.title);
    assert.equal(typeof p.build, "function");
    assert.match(p.side, /bs-script/);
    assert.match(p.side, /Script \(read aloud\)/);
  }
});

test("canonical title and Courses band wiring", () => {
  const html = readFileSync(join(PUB, "study-diy-pbl-bookshare.html"), "utf8");
  const study = readFileSync(join(PUB, "study.html"), "utf8");
  const esc = TITLE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  assert.match(html, new RegExp(esc));
  assert.match(study, new RegExp(esc));
  assert.match(study, /data-course="diy-pbl-bookshare"/);
  assert.ok(existsSync(join(DIR, "art", "cover.webp")));
  assert.ok(existsSync(join(DIR, "art", "keyterms", "flip_card.webp")));
  assert.ok(existsSync(join(DIR, "art", "discussion", "note_card.webp")));
});

test("slide 1 uses real book title, author, and bg_cover (no floating cover_display)", () => {
  assert.equal(SLIDES[0].title, "DIY Project Based Learning for Math and Science");
  assert.notEqual(SLIDES[0].title, "Title");
  assert.match(SLIDES[0].narration, /seventeen minutes or so/);
  assert.ok(existsSync(join(DIR, "art", "s01", "bg_cover.webp")));
  assert.ok(existsSync(join(DIR, "art", "s01", "bg.webp")));
  const pages = readFileSync(join(DIR, "bs-pages.js"), "utf8");
  assert.ok(!/sprite\(root,\s*"s01",\s*"cover_display"/.test(pages));
  assert.match(pages, /bg_cover|no cover_display/);
  assert.match(pages, /Heather Wolpert-Gawron/);
  assert.match(pages, /Book Share by Dimitry Gordon/);
});

test("Tesla fixes: slide 5 fall-off wording; slide 10 C = vx + F and R = px", () => {
  assert.match(SLIDES[4].narration, /without falling off at the top/);
  assert.match(SLIDES[4].bullets.join(" "), /without falling off at the top/);
  // Round 3: equations live on chips; bullet 3 is the short break-even line
  assert.match(SLIDES[9].bullets.join(" "), /where cost meets revenue/);
  assert.match(SLIDES[9].bullets.join(" "), /Ch\. 2; Part II, p\. 120/);
  const pages = readFileSync(join(DIR, "bs-pages.js"), "utf8");
  assert.match(pages, /C = vx \+ F/);
  assert.match(pages, /R = px/);
  assert.ok(!/C = mx \+ b/.test(SLIDES[9].narration));
});

test("Round 1 structure: key terms, split conclude/discuss, resources APA", () => {
  assert.equal(SLIDES[16].title, "Key terms");
  assert.equal(SLIDES[17].title, "Conclude with direction");
  assert.equal(SLIDES[18].title, "Discussion questions");
  assert.equal(SLIDES[18].questions.length, 3);
  assert.match(SLIDES[18].questions[0], /In the video/);
  assert.equal(SLIDES[19].kind, "resources");
  assert.equal(SLIDES[19].title, "References");
  assert.ok(SLIDES[19].resources.length >= 8);
  assert.equal(SLIDES[20].kind, "resources");
  assert.equal(SLIDES[20].title, "Tools");
  assert.ok(SLIDES[20].resources.length >= 3);
  assert.match(SLIDES[19].resources.map((r) => r.html).join(" "), /Pashler[\s\S]*105-119/);
  assert.match(SLIDES[20].resources.map((r) => r.html).join(" "), /airnow\.gov/);
});

test("no audio controls; fullscreen hides text; script kept in normal view", () => {
  const html = readFileSync(join(PUB, "study-diy-pbl-bookshare.html"), "utf8");
  const app = readFileSync(join(DIR, "bs-app.js"), "utf8");
  const css = readFileSync(join(DIR, "bs.css"), "utf8");
  assert.ok(!html.includes('id="narrBtn"'));
  assert.ok(!html.includes('id="sayBtn"'));
  assert.match(html, /id="fsBtn"/);
  assert.match(html, /Full screen \(hide text\)/);
  assert.match(css, /body\.fl-full \.fl-side/);
  assert.match(css, /body\.fl-full \.bs-script/);
  // On-art panels must remain in full view (resources, terms, discuss, takeaways)
  assert.ok(!/body\.fl-full[^{]*\.bs-resources-panel\s*\{\s*display:\s*none/.test(css));
  assert.match(css, /\.bs-takeaways/);
  assert.ok(!app.includes("new Audio"));
});

test("Leo art webp exists for s01-s18; no Leo-art-pending badge in code", () => {
  for (let i = 1; i <= 18; i++) {
    const sid = `s${String(i).padStart(2, "0")}`;
    assert.ok(existsSync(join(DIR, "art", sid, "bg.webp")), sid);
  }
  const all = files.join("\n");
  assert.ok(!/Leo art pending/i.test(all));
  assert.ok(PLACEMENTS.s01 && PLACEMENTS.s05 && PLACEMENTS.s11);
});

test("script.md word count is 2550 to 2700", () => {
  const script = readFileSync(join(DIR, "script.md"), "utf8");
  const m = script.match(/\*\*Total words \(read-aloud\):\*\* (\d+)/);
  assert.ok(m);
  const n = Number(m[1]);
  assert.ok(n >= 2550 && n <= 2700, `words ${n}`);
  const words = SLIDES.reduce((a, s) => a + s.narration.split(/\s+/).length, 0);
  assert.equal(words, n);
});

test("no em-dashes in bookshare sources", () => {
  for (const s of files) assert.ok(!s.includes("\u2014"));
});

test("placements config matches Leo overlays.json FINAL", () => {
  assert.equal(PLACEMENTS.s07.checks.length, 1);
  assert.equal(PLACEMENTS.s07.blanks.length, 2);
  assert.equal(PLACEMENTS.s11.tips.length, 1);
  assert.equal(PLACEMENTS.s14.bubbles.length, 2);
  assert.ok(PLACEMENTS.keyterms.flip_card);
  assert.ok(PLACEMENTS.discussion.note_card);
  assert.ok(PLACEMENTS.s18.page);
  assert.match(readFileSync(join(DIR, "bs-pages.js"), "utf8"), /applyPlace/);
  assert.ok(existsSync(join(DIR, "art", "keyterms", "bg.webp")));
  assert.ok(existsSync(join(DIR, "art", "discussion", "bg.webp")));
  assert.ok(existsSync(join(DIR, "art", "s18", "page.webp")));
});


test("transitions: crossfade handoffs, theme bands, reduced-motion path", async () => {
  const { HANDOFFS, THEME_BAND, handoffKey } = await import(
    pathToFileURL(join(DIR, "bs-transitions.js")).href
  );
  for (let i = 1; i <= 20; i++) {
    const k = handoffKey(i, i + 1);
    assert.ok(HANDOFFS[k], `missing handoff ${k}`);
    assert.equal(HANDOFFS[k].mode, "crossfade");
  }
  assert.equal(Object.keys(HANDOFFS).length, 20);
  for (let n = 1; n <= 21; n++) assert.ok(THEME_BAND[n], `theme band ${n}`);
  assert.equal(THEME_BAND[3], "teal");
  assert.equal(THEME_BAND[7], "amber");
  assert.equal(THEME_BAND[10], "coral");
  assert.equal(THEME_BAND[14], "violet");
  assert.equal(THEME_BAND[20], "cream");
  const app = readFileSync(join(DIR, "bs-app.js"), "utf8");
  const css = readFileSync(join(DIR, "bs.css"), "utf8");
  assert.match(app, /navBusy/);
  assert.match(app, /clearFlipClones/);
  assert.match(app, /prefers-reduced-motion/);
  assert.match(app, /fadeScript/);
  assert.match(app, /loadLayouts/);
  assert.match(app, /ArrowRight/);
  assert.match(app, /maybeAdvance/);
  assert.match(app, /opacity .*ease/);
  assert.ok(!/runFlip\(/.test(app));
  assert.match(css, /prefers-reduced-motion:\s*reduce/);
  assert.match(css, /data-theme-band/);
});

test("transitions: no motif FLIP; script quiet-fades; layouts JSON wired", () => {
  const pages = readFileSync(join(DIR, "bs-pages.js"), "utf8");
  const app = readFileSync(join(DIR, "bs-app.js"), "utf8");
  const layouts = readFileSync(join(DIR, "bs-layouts.js"), "utf8");
  assert.ok(!/dataset\.magicId/.test(pages));
  assert.match(pages, /no flip_card/);
  assert.match(pages, /no note_card/);
  assert.match(pages, /s09Cards|keytermsCards/);
  assert.match(layouts, /s09\/cards\.json/);
  assert.match(layouts, /keyterms\/cards\.json/);
  assert.ok(existsSync(join(DIR, "art", "s09", "cards.json")));
  assert.ok(existsSync(join(DIR, "art", "keyterms", "cards.json")));
  assert.match(app, /fadeScript/);
  assert.ok(!/bs-script[^\n]*magicId/.test(pages));
});

test("Round 2 depth passages and Gold Standard bullet", () => {
  assert.match(SLIDES[6].narration, /empty row might turn into a reteach day/);
  assert.match(SLIDES[10].narration, /One of your forces points the wrong way/);
  assert.match(SLIDES[12].narration, /Costa's levels also give me a quick check/);
  assert.match(SLIDES[15].narration, /PBLWorks Gold Standard/);
  assert.ok(SLIDES[15].bullets.some((b) => /PBLWorks Gold Standard/.test(b)));
  const pages = readFileSync(join(DIR, "bs-pages.js"), "utf8");
  assert.match(pages, /bs-surface--idea/);
  assert.match(pages, /Book Share by Dimitry Gordon/);
  assert.match(pages, /Cost: C = vx \+ F/);
  assert.match(pages, /Revenue: R = px/);
});

test("TEXT-ON-ART: no CSS box chrome on stage text; ink/graphite; multiply", () => {
  const css = readFileSync(join(DIR, "bs.css"), "utf8");
  const pages = readFileSync(join(DIR, "bs-pages.js"), "utf8");
  assert.match(css, /mix-blend-mode:\s*multiply/);
  assert.match(css, /--ink:\s*#26376e/);
  assert.match(css, /--graphite:\s*#3b3530/);
  assert.match(css, /tick_ink\.webp/);
  assert.match(pages, /paperSprite/);
  assert.match(pages, /IDEA_MAP/);
  assert.match(pages, /index_card/);
  assert.match(pages, /sheet_flat/);
  assert.match(pages, /sheet_flat_wide/);
  assert.match(pages, /bs-resources-panel--compact/);
  assert.match(pages, /bs-resources-panel--wide/);
  assert.match(pages, /torn_page/);
  // Stage surfaces must not keep UI card shadows/backgrounds as the primary look
  assert.match(css, /\.bs-surface--idea[^{]*\{[\s\S]*?background:\s*none !important/);
  assert.match(css, /\.on-art[^{]*\{[\s\S]*?box-shadow:\s*none !important/);
  assert.ok(existsSync(join(DIR, "art", "paper", "tick_ink.webp")));
  assert.ok(existsSync(join(DIR, "art", "paper", "sheet_flat.webp")));
  assert.ok(existsSync(join(DIR, "art", "paper", "sheet_flat_wide.webp")));
  assert.ok(existsSync(join(DIR, "art", "keyterms", "bg_v2.webp")));
  assert.ok(existsSync(join(DIR, "art", "s01", "bg.webp")));
});

test("draw-in kept after crossfade; masks exist; reduced-motion path", () => {
  const app = readFileSync(join(DIR, "bs-app.js"), "utf8");
  assert.ok(existsSync(join(DIR, "bs-drawin.js")));
  assert.match(app, /startDrawIn/);
  assert.match(app, /runDrawIn/);
  assert.match(app, /await runDrawIn/);
  const drawin = readFileSync(join(DIR, "bs-drawin.js"), "utf8");
  assert.match(drawin, /hatch_mask/);
  assert.match(drawin, /line_order/);
  assert.match(drawin, /prefers-reduced-motion|reduced/);
  for (const sid of ["s01", "s05", "s11", "keyterms", "discussion"]) {
    assert.ok(existsSync(join(DIR, "art", sid, "line.webp")), sid + " line");
    assert.ok(existsSync(join(DIR, "art", sid, "hatch_mask.webp")), sid + " hatch");
  }
});

test("QA: no stray curled-paper sprites; keyterms cards.json; draw-in 40% line", () => {
  const pages = readFileSync(join(DIR, "bs-pages.js"), "utf8");
  const css = readFileSync(join(DIR, "bs.css"), "utf8");
  const drawin = readFileSync(join(DIR, "bs-drawin.js"), "utf8");
  assert.ok(!/sprite\(root,\s*"s04",\s*"journal_page"/.test(pages));
  assert.ok(!/sprite\(root,\s*"keyterms",\s*"flip_card"/.test(pages));
  assert.ok(!/sprite\(root,\s*"discussion",\s*"note_card"/.test(pages));
  assert.ok(!/sprite\(root,\s*"s18",\s*"page"/.test(pages));
  assert.ok(!/sprite\(root,\s*"s10",\s*"birac_block"/.test(pages));
  assert.ok(!/sprite\(root,\s*"s09",\s*"doc_card"/.test(pages));
  assert.ok(!/sprite\(root,\s*"s11",\s*"tip_card"/.test(pages));
  assert.match(pages, /bs-paper-group/);
  assert.match(pages, /s10-birac-letter/);
  assert.match(pages, /BIRAC_HAS_FIFTH_BLOCK/);
  assert.match(pages, /keytermsCards/);
  assert.match(pages, /fitArtText/);
  assert.match(css, /bs-paper-group/);
  assert.match(pages, /ensureDesignLayer/);
  assert.match(css, /bs-design-layer/);
  assert.match(drawin, /u \/ 0\.40/);
});

test("Round 4 Wendell voice: Socrates three script locks", () => {
  assert.match(SLIDES[0].narration, /seventeen minutes or so/);
  assert.match(SLIDES[3].narration, /borrows a distinction from the author A\. J\. Juliani/);
  assert.match(SLIDES[13].narration, /Here's the twist\. The author grades/);
  assert.doesNotMatch(SLIDES[0].narration, /fifteen minutes(?! or so)/);
  assert.doesNotMatch(SLIDES[13].narration, /The twist:/);
});

test("Round 3: tip 5, APA alpha order, no cite-only bullets, break-even wording", () => {
  assert.ok(SLIDES[10].bullets.some((b) => /Peers give first feedback/.test(b)));
  assert.equal(SLIDES[10].bullets.length, 5);
  assert.match(SLIDES[9].bullets[2], /where cost meets revenue/);
  assert.ok(!SLIDES[1].bullets.some((b) => /^\(Introduction/.test(String(b).trim())));
  assert.ok(!SLIDES[5].bullets.some((b) => /^\(Introduction/.test(String(b).trim())));
  const refs = SLIDES[19].resources.map((r) => r.html);
  assert.match(refs[0], /^Juliani/);
  assert.match(refs[1], /^Larmer/);
  assert.match(refs[2], /^Pashler/);
  assert.match(refs[3], /^PBLWorks/);
  assert.match(refs[4], /^Routledge/);
  assert.match(refs[5], /^Wiggins/);
  assert.match(refs[6], /^Wolpert-Gawron, H\. \(2011\)/);
  assert.match(refs[7], /^Wolpert-Gawron, H\. \(2016\)/);
  const tools = SLIDES[20].resources.map((r) => r.html);
  assert.match(tools[0], /^Desmos/);
  assert.match(tools[1], /^PhET/);
  assert.match(tools[2], /^U\.S\. Environmental/);
  const pages = readFileSync(join(DIR, "bs-pages.js"), "utf8");
  assert.match(pages, /slice\(0, 5\)/);
  assert.match(pages, /s10-birac-letter/);
  const css = readFileSync(join(DIR, "bs.css"), "utf8");
  assert.match(css, /text-indent:\s*-1\.\d+em/);
  assert.match(css, /bs-idea-cite[\s\S]*clamp\(15px/);
});


test("paper stage panels never use overflow auto/scroll", () => {
  const pages = readFileSync(join(DIR, "bs-pages.js"), "utf8");
  // Discuss / resources / takeaways inline styles must not enable scroll boxes
  const paperBlocks = pages.split("slide.kind ===").slice(1).filter((b) =>
    /discuss|resources|conclude/.test(b.slice(0, 40))
  );
  for (const block of paperBlocks) {
    const head = block.slice(0, 2500);
    assert.doesNotMatch(head, /overflow(?:-y|-x)?:\s*(auto|scroll)/i);
  }
  const css = readFileSync(join(DIR, "bs.css"), "utf8");
  assert.match(css, /\.bs-paper-group \.bs-discuss[^{]*\{[\s\S]*?overflow:\s*hidden !important/);
  assert.match(css, /\.bs-paper-group \.bs-resources-panel[^{]*\{[\s\S]*?overflow:\s*hidden !important/);
});
