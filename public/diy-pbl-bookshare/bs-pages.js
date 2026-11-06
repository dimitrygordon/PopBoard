// DIY PBL Bookshare pages: Leo named sprites + exact loop.md motions. No baked text.
import { ART, h, fx } from "./bs-engine.js";
import { SLIDES } from "./bs-data.js";
import { PLACEMENTS, applyPlace } from "./bs-placements.js";

export { SLIDES };

const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;

function img(src, cls) {
  const el = document.createElement("img");
  el.className = cls || "";
  el.alt = "";
  el.decoding = "async";
  el.draggable = false;
  el.src = src;
  return el;
}

function sceneRoot(scene, artId) {
  const root = h("div", "bs-scene");
  root.dataset.art = artId;
  const bg = img(`${ART}${artId}/bg.webp`, "bs-bg");
  root.appendChild(bg);
  scene.appendChild(root);
  return root;
}

function sprite(root, artId, name, cls, place, magicId) {
  const el = img(`${ART}${artId}/${name}.webp`, `bs-sp ${cls || ""}`);
  el.dataset.magicId = magicId || name;
  if (place) applyPlace(el, place);
  root.appendChild(el);
  return el;
}
function P(artId) { return PLACEMENTS[artId] || {}; }

function loopOrOnce(T, node, keyframes, t, d) {
  if (reduced()) {
    T.A(node, [keyframes[keyframes.length - 1]], 0, 0.01);
    return;
  }
  T.loop(node, keyframes, t, d);
}

/* ---- per-slide builds from loop.md ---- */
function buildS01(root, T) {
  const p = P("s01");
  const cover = sprite(root, "s01", "cover_display", "s01-cover", p.cover);
  const marble = sprite(root, "s01", "marble", "s01-marble", p.marble);
  const gear = sprite(root, "s01", "gear", "s01-gear", p.gear);
  const title = h("div", "s01-titleblock");
  applyPlace(title, p.titleblock);
  title.innerHTML = `<div class="s01-book">DIY Project Based Learning for Math and Science</div>
    <div class="s01-author">Heather Wolpert-Gawron</div>
    <div class="s01-pub">Routledge · Eye On Education · 2016</div>`;
  root.appendChild(title);
  cover.style.opacity = "1";
  if (reduced()) return;
  T.A(cover, [
    { transform: "translate(40px, 50px)" },
    { transform: "translate(0, 0)" },
  ], 0.05, 2.5, "cubic-bezier(.22,1,.36,1)");
  loopOrOnce(T, cover, [
    { transform: "translateY(0)" },
    { transform: "translateY(-6px)" },
    { transform: "translateY(0)" },
  ], 2.6, 4);
  loopOrOnce(T, marble, [
    { transform: "translateX(0)" },
    { transform: "translateX(420px)" },
  ], 0.2, 3.5);
  loopOrOnce(T, gear, [
    { transform: "rotate(0deg)" },
    { transform: "rotate(360deg)" },
  ], 0, 6);
  T.fadeUp(title, 0.4, 0.7, 12);
}

function buildS02(root, T) {
  const p = P("s02");
  const w1 = sprite(root, "s02", "walker", "s02-walker s02-w1", p.w1);
  const w2 = sprite(root, "s02", "walker", "s02-walker s02-w2", p.w2);
  const glow = sprite(root, "s02", "lantern_glow", "s02-glow", p.glow);
  if (reduced()) return;
  loopOrOnce(T, w1, [
    { transform: "translate(0,0)" }, { transform: "translate(180px,-6px)" }, { transform: "translate(360px,0)" },
  ], 0, 5);
  loopOrOnce(T, w2, [
    { transform: "translate(0,0)" }, { transform: "translate(160px,-4px)" }, { transform: "translate(320px,0)" },
  ], 0.4, 5);
  loopOrOnce(T, glow, [
    { opacity: 0.4 }, { opacity: 1 }, { opacity: 0.4 },
  ], 0, 1.2);
}

function buildS03(root, T) {
  const fp = sprite(root, "s03", "footprints", "s03-fp", P("s03").footprints);
  if (reduced()) return;
  // stepped along path (approx positions in right half)
  loopOrOnce(T, fp, [
    { offset: 0, transform: "translate(0,0)", opacity: 0 },
    { offset: 0.05, opacity: 1 },
    { offset: 0.25, transform: "translate(70px,-40px)" },
    { offset: 0.5, transform: "translate(140px,-90px)" },
    { offset: 0.75, transform: "translate(210px,-150px)" },
    { offset: 0.95, transform: "translate(280px,-210px)", opacity: 1 },
    { offset: 1, opacity: 0 },
  ], 0, 4);
}

function buildS04(root, T) {
  const page = sprite(root, "s04", "journal_page", "s04-page", P("s04").journal_page);
  if (reduced()) return;
  loopOrOnce(T, page, [
    { transform: "perspective(600px) rotateY(0deg)", opacity: 1 },
    { transform: "perspective(600px) rotateY(-90deg)", opacity: 0.3 },
    { transform: "perspective(600px) rotateY(0deg)", opacity: 1 },
  ], 0, 3.5);
}

function buildS05(root, T) {
  const marble = sprite(root, "s05", "marble", "s05-marble", P("s05").marble);
  if (reduced()) return;
  loopOrOnce(T, marble, [
    { offset: 0, transform: "translate(0,0)", opacity: 1 },
    { offset: 0.28, transform: "translate(90px,110px)" }, // down hill
    { offset: 0.45, transform: "translate(150px,70px)" }, // enter loop
    { offset: 0.58, transform: "translate(175px,20px)" }, // near top
    { offset: 0.72, transform: "translate(155px,95px)", opacity: 1 }, // fall inward
    { offset: 0.85, transform: "translate(155px,140px)", opacity: 0.2 },
    { offset: 1, transform: "translate(0,0)", opacity: 0 },
  ], 0, 4.5);
}

function buildS06(root, T) {
  const p = P("s06");
  const heart = sprite(root, "s06", "heart", "s06-heart", p.heart);
  const standards = sprite(root, "s06", "standards", "s06-standards", p.standards);
  const puzzle = sprite(root, "s06", "puzzle", "s06-puzzle", p.puzzle);
  [heart, standards, puzzle].forEach((el) => { el.style.opacity = "0.3"; });
  if (reduced()) {
    [heart, standards, puzzle].forEach((el) => { el.style.opacity = "1"; });
    return;
  }
  // light in order 1.2s each, hold 1s, fade, repeat ~5.5s
  T.loop(heart, [{ opacity: 0.3 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0.3 }], 0, 5.5);
  T.loop(standards, [{ opacity: 0.3 }, { opacity: 0.3 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0.3 }], 0, 5.5);
  T.loop(puzzle, [{ opacity: 0.3 }, { opacity: 0.3 }, { opacity: 0.3 }, { opacity: 1 }, { opacity: 1 }, { opacity: 0.3 }], 0, 5.5);
}

function buildS07(root, T) {
  const p = P("s07");
  const checks = [];
  for (let i = 0; i < 5; i++) {
    const c = sprite(root, "s07", "checkmark", `s07-check s07-c${i}`, (p.checks || [])[i]);
    c.style.opacity = "0";
    checks.push(c);
  }
  const b1 = sprite(root, "s07", "blank_row", "s07-blank s07-b0", (p.blanks || [])[0]);
  const b2 = sprite(root, "s07", "blank_row", "s07-blank s07-b1", (p.blanks || [])[1]);
  if (reduced()) {
    checks.forEach((c) => { c.style.opacity = "1"; });
    return;
  }
  checks.forEach((c, i) => {
    // fill from bottom: c0 is bottom
    const delay = i * 0.6;
    T.loop(c, [
      { offset: 0, opacity: 0 },
      { offset: Math.min(0.95, (delay + 0.05) / 6), opacity: 0 },
      { offset: Math.min(0.98, (delay + 0.6) / 6), opacity: 1 },
      { offset: 0.85, opacity: 1 },
      { offset: 1, opacity: 0 },
    ], 0, 6);
  });
  loopOrOnce(T, b1, [{ opacity: 0.3 }, { opacity: 0.8 }, { opacity: 0.3 }], 0, 1.5);
  loopOrOnce(T, b2, [{ opacity: 0.3 }, { opacity: 0.8 }, { opacity: 0.3 }], 0.3, 1.5);
}

function buildS08(root, T) {
  const cloud = sprite(root, "s08", "cloud", "s08-cloud", P("s08").cloud);
  if (reduced()) return;
  loopOrOnce(T, cloud, [
    { transform: "translateX(0)" },
    { transform: "translateX(380px)" },
  ], 0, 8);
}

function buildS09(root, T) {
  const p = P("s09");
  const cards = [];
  for (let i = 0; i < 3; i++) {
    cards.push(sprite(root, "s09", "doc_card", `s09-card s09-c${i}`, (p.cards || [])[i]));
  }
  if (reduced()) return;
  cards.forEach((c, i) => {
    const ang = (i - 1) * 8;
    T.loop(c, [
      { transform: `rotate(0deg)` },
      { transform: `rotate(${ang}deg)` },
      { transform: `rotate(0deg)` },
    ], 0, 4);
  });
}

function buildS10(root, T) {
  const p = P("s10");
  const glow = sprite(root, "s10", "breakeven_glow", "s10-glow", p.glow);
  const blocks = [];
  for (let i = 0; i < 5; i++) {
    const b = sprite(root, "s10", "birac_block", `s10-block s10-b${i}`, (p.blocks || [])[i]);
    b.style.opacity = "0";
    blocks.push(b);
  }
  const letters = h("div", "s10-birac");
  applyPlace(letters, p.birac);
  letters.innerHTML = ["B", "I", "R", "A", "C"].map((L, i) => `<span class="s10-L s10-L${i}">${L}</span>`).join("");
  root.appendChild(letters);
  const eq = h("div", "s10-eq");
  applyPlace(eq, p.eq);
  eq.innerHTML = `<span>C = vx + F</span><span>R = px</span>`;
  root.appendChild(eq);
  T.fade(eq, 0.2, 0.5);
  if (reduced()) {
    glow.style.opacity = "1";
    blocks.forEach((b) => { b.style.opacity = "1"; });
    return;
  }
  loopOrOnce(T, glow, [
    { transform: "scale(0.8)", opacity: 0.5 },
    { transform: "scale(1.2)", opacity: 1 },
    { transform: "scale(0.8)", opacity: 0.5 },
  ], 1.5, 1.5);
  blocks.forEach((b, i) => {
    T.loop(b, [
      { offset: 0, opacity: 0 },
      { offset: (0.4 * i) / 5, opacity: 0 },
      { offset: (0.4 * (i + 1)) / 5, opacity: 1 },
      { offset: 0.85, opacity: 1 },
      { offset: 1, opacity: 0 },
    ], 0, 5);
  });
  [...letters.children].forEach((L, i) => {
    T.loop(L, [
      { offset: 0, opacity: 0 },
      { offset: (0.4 * i) / 5, opacity: 0 },
      { offset: (0.4 * (i + 1)) / 5, opacity: 1 },
      { offset: 0.85, opacity: 1 },
      { offset: 1, opacity: 0 },
    ], 0, 5);
  });
}

function buildS11(root, T) {
  const p = P("s11");
  const tips = [];
  for (let i = 0; i < 5; i++) {
    const t = sprite(root, "s11", "tip_card", `s11-tip s11-t${i}`, (p.tips || [])[i]);
    t.style.opacity = "0";
    tips.push(t);
  }
  const pen = sprite(root, "s11", "red_pen", "s11-pen", p.pen);
  if (reduced()) {
    tips.forEach((t) => { t.style.opacity = "1"; });
    return;
  }
  tips.forEach((t, i) => {
    T.loop(t, [
      { offset: 0, opacity: 0, transform: "scaleY(0.2)" },
      { offset: (0.8 * i) / 5.5, opacity: 0, transform: "scaleY(0.2)" },
      { offset: (0.8 * (i + 1)) / 5.5, opacity: 1, transform: "scaleY(1)" },
      { offset: 0.85, opacity: 1 },
      { offset: 1, opacity: 0 },
    ], 0, 5.5);
  });
  loopOrOnce(T, pen, [
    { transform: "rotate(-2deg)" },
    { transform: "rotate(2deg)" },
    { transform: "rotate(-2deg)" },
  ], 0, 2.5);
}

function buildS12(root, T) {
  const needle = sprite(root, "s12", "needle", "s12-needle", P("s12").needle);
  if (reduced()) return;
  loopOrOnce(T, needle, [
    { transform: "rotate(-20deg)" },
    { transform: "rotate(20deg)" },
    { transform: "rotate(-20deg)" },
  ], 0, 2.5);
}

function buildS13(root, T) {
  const barbell = sprite(root, "s13", "barbell", "s13-barbell", P("s13").barbell);
  if (reduced()) return;
  loopOrOnce(T, barbell, [
    { transform: "rotate(-6deg) translateY(0)" },
    { transform: "rotate(6deg) translateY(-2px)" },
    { transform: "rotate(-6deg) translateY(0)" },
  ], 0, 1.2);
}

function buildS14(root, T) {
  const p = P("s14");
  const bubbles = [];
  for (let i = 0; i < 4; i++) {
    bubbles.push(sprite(root, "s14", "q_bubble", `s14-q s14-q${i}`, (p.bubbles || [])[i]));
  }
  if (reduced()) return;
  bubbles.forEach((b, i) => {
    T.loop(b, [
      { offset: 0, transform: "translateY(40px) scale(0.4)", opacity: 0 },
      { offset: 0.15, opacity: 1, transform: "translateY(20px) scale(1)" },
      { offset: 0.7, transform: "translateY(-120px) scale(1)", opacity: 1 },
      { offset: 0.9, transform: "translateY(-140px) scale(0.2)", opacity: 0 },
      { offset: 1, opacity: 0 },
    ], i * 0.6, 4);
  });
}

function buildS15(root, T) {
  const block = sprite(root, "s15", "block", "s15-block", P("s15").block);
  if (reduced()) return;
  loopOrOnce(T, block, [
    { offset: 0, transform: "translate(0,0)", opacity: 1 },
    { offset: 0.72, transform: "translate(160px,120px)", opacity: 1 },
    { offset: 0.88, transform: "translate(160px,120px)", opacity: 1 },
    { offset: 1, transform: "translate(0,0)", opacity: 0 },
  ], 0, 2.5);
}

function buildS16(root, T) {
  const p = P("s16");
  const mag = sprite(root, "s16", "magnifier", "s16-mag", p.magnifier);
  const stylus = sprite(root, "s16", "stylus", "s16-stylus", p.stylus);
  if (reduced()) return;
  loopOrOnce(T, mag, [
    { transform: "translateX(0)" },
    { transform: "translateX(220px)" },
    { transform: "translateX(0)" },
  ], 0, 4);
  loopOrOnce(T, stylus, [
    { transform: "translateY(0)", opacity: 0.4 },
    { transform: "translateY(-10px)", opacity: 1 },
    { transform: "translateY(0)", opacity: 0.4 },
  ], 0, 3);
}

function buildS17Lanterns(root, T) {
  const p = P("s17");
  const glows = [];
  for (let i = 0; i < 4; i++) {
    glows.push(sprite(root, "s17", "glow", `s17-glow s17-g${i}`, (p.glows || [])[i]));
  }
  if (reduced()) {
    glows.forEach((g) => { g.style.opacity = "1"; });
    return;
  }
  glows.forEach((g, i) => {
    T.loop(g, [
      { offset: 0, opacity: 0.15 },
      { offset: (0.7 * i) / 5, opacity: 0.15 },
      { offset: (0.7 * (i + 1)) / 5, opacity: 1 },
      { offset: 0.75, opacity: 1 },
      { offset: 1, opacity: 0.15 },
    ], 0, 5);
  });
}

function buildKeyTermsOverlay(root, T, terms) {
  const wall = h("div", "bs-term-wall");
  terms.forEach((term, i) => {
    const card = h("div", `bs-term-card t${i} bs-reveal`);
    card.textContent = String(term).replace(/^"|"$/g, "");
    if (i === 0) card.dataset.magicId = "flip_card";
    wall.appendChild(card);
    if (!reduced()) {
      T.A(card, [
        { transform: "scale(0.92)" },
        { transform: "scale(1)" },
      ], 0.1 + i * 0.12, 0.35);
    }
  });
  root.appendChild(wall);
}

function buildS18Page(root, T) {
  const page = sprite(root, "s18", "page", "s18-page", P("s18").page);
  if (reduced()) return;
  loopOrOnce(T, page, [
    { transform: "perspective(700px) rotateY(0deg)" },
    { transform: "perspective(700px) rotateY(-75deg)" },
    { transform: "perspective(700px) rotateY(0deg)" },
  ], 0, 3);
}

const BUILDERS = {
  s01: buildS01, s02: buildS02, s03: buildS03, s04: buildS04, s05: buildS05,
  s06: buildS06, s07: buildS07, s08: buildS08, s09: buildS09, s10: buildS10,
  s11: buildS11, s12: buildS12, s13: buildS13, s14: buildS14, s15: buildS15,
  s16: buildS16, s17: buildS17Lanterns, s18: buildS18Page,
};

function sideHTML(slide) {
  const parts = [];
  if (slide.bullets && slide.bullets.length) {
    parts.push(`<ul class="bs-side-bullets">${slide.bullets.map((b) => `<li>${fx(b)}</li>`).join("")}</ul>`);
  }
  if (slide.questions && slide.questions.length) {
    parts.push(`<ol class="bs-side-q">${slide.questions.map((q) => `<li>${fx(q)}</li>`).join("")}</ol>`);
  }
  if (slide.resources && slide.resources.length) {
    // Resources also rendered large in the scene; side gets a short note
    parts.push(`<p class="aside">Full APA list is on the storyboard. Scroll the art panel if needed.</p>`);
  }
  if (slide.chapter) {
    parts.push(`<p class="aside">${fx(slide.chapter)}</p>`);
  }
  // Teleprompter: KEEP in normal view (Dimitry). Hidden in fl-full via CSS.
  parts.push(`<div class="bs-script"><p class="aside">Script (read aloud)</p><p class="bs-script-text">${fx(slide.narration)}</p></div>`);
  return parts.join("");
}

export const PAGES = SLIDES.map((slide) => ({
  title: slide.title,
  kicker: slide.kicker || "",
  guide: slide.guide || "",
  cap: slide.guide || "",
  idea: slide.idea,
  kind: slide.kind,
  hold_after: slide.hold_after || 0,
  side: sideHTML(slide),
  build(scene, T) {
    const artId = slide.art || `s${String(slide.n).padStart(2, "0")}`;
    const root = sceneRoot(scene, artId);
    root.dataset.kind = slide.kind || "";
    if (slide.idea) root.dataset.idea = String(slide.idea);

    if (slide.kind === "terms") {
      // key terms: use s17 bg soft + code-side flipping cards (Leo note E / B2)
      buildKeyTermsOverlay(root, T, slide.bullets || []);
      if (BUILDERS.s17) BUILDERS.s17(root, T);
    } else if (slide.kind === "discuss") {
      const panel = h("div", "bs-discuss");
      (slide.questions || []).forEach((q, i) => {
        const card = h("div", `bs-dq-card dq${i} bs-reveal`);
        card.innerHTML = `<b>Q${i + 1}.</b> ${fx(q)}`;
        if (i === 0) card.dataset.magicId = "note_card";
        panel.appendChild(card);
      });
      root.appendChild(panel);
    } else if (slide.kind === "resources") {
      const panel = h("div", "bs-resources-panel bs-reveal");
      const ul = h("ul", "bs-apa");
      (slide.resources || []).forEach((r) => {
        const li = document.createElement("li");
        li.innerHTML = r.html; // trusted APA strings we authored (italic titles)
        ul.appendChild(li);
      });
      panel.appendChild(ul);
      root.appendChild(panel);
      // Do not mount blank page.webp sprite over the bookshelf
    } else if (slide.kind === "conclude") {
      if (BUILDERS.s17) BUILDERS.s17(root, T);
      const box = h("div", "bs-takeaways");
      const items = (slide.bullets || []).map((b) => fx(String(b).replace(/^\d+\.\s*/, "")));
      box.classList.add("bs-reveal");
      box.innerHTML = `<h3>Takeaways</h3><ol>${items.map((b) => `<li>${b}</li>`).join("")}</ol>`;
      root.appendChild(box);
    } else if (BUILDERS[artId]) {
      BUILDERS[artId](root, T);
    }
    return { hold_after: slide.hold_after || 0 };
  },
}));

export const PAGE_COUNT = PAGES.length;
