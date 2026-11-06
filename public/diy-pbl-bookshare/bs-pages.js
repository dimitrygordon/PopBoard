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

/** Reusable on-art text surface. Leo will reskin `.bs-surface` variants later.
 *  kind: idea | chip | label | titleblock | genre | discuss | tools
 */
function surface(kind, extraClass = "") {
  return h("div", `bs-surface bs-surface--${kind}${extraClass ? " " + extraClass : ""}`);
}


const PAPER = `${ART}paper`;

/** Leo TEXT-ON-ART.md per-slide cream-column rects (1920x1080 -> %). */
const IDEA_MAP = {
  1:  { x: 110, y: 250, w: 890, h: 390, rot: 1 },
  2:  { x: 110, y: 200, w: 760, h: 560, rot: -1 },
  3:  { x: 110, y: 200, w: 760, h: 560, rot: 1 },
  4:  { x: 110, y: 220, w: 730, h: 540, rot: -1 },
  5:  { x: 110, y: 200, w: 800, h: 560, rot: -1 },
  6:  { x: 110, y: 200, w: 700, h: 560, rot: 1 },
  7:  { x: 110, y: 200, w: 700, h: 560, rot: -1 },
  8:  { x: 110, y: 200, w: 760, h: 560, rot: 1 },
  9:  { x: 110, y: 200, w: 860, h: 560, rot: -1 },
  10: { x: 110, y: 200, w: 700, h: 520, rot: 1 },
  11: { x: 110, y: 200, w: 780, h: 560, rot: -1 },
  12: { x: 110, y: 200, w: 860, h: 560, rot: 1 },
  13: { x: 110, y: 200, w: 880, h: 560, rot: -1 },
  14: { x: 110, y: 200, w: 760, h: 560, rot: 1 },
  15: { x: 110, y: 200, w: 720, h: 560, rot: -1 },
  16: { x: 110, y: 200, w: 860, h: 560, rot: 1 },
};
const KT_ROTS = [-2, 1.5, -1, 2, 1, -2.5, 2, -1];

function pctRect(x, y, w, h) {
  return {
    left: (x / 1920) * 100,
    top: (y / 1080) * 100,
    width: (w / 1920) * 100,
    height: (h / 1080) * 100,
  };
}
function applyRect(el, x, y, w, h, rot) {
  const r = pctRect(x, y, w, h);
  el.style.left = r.left + "%";
  el.style.top = r.top + "%";
  el.style.width = r.width + "%";
  el.style.height = r.height + "%";
  if (rot != null) el.style.transform = `rotate(${rot}deg)`;
}
function paperSprite(root, name, x, y, w, h, rot, cls) {
  const el = img(`${PAPER}/${name}.webp`, `bs-paper ${cls || ""}`);
  el.setAttribute("aria-hidden", "true");
  applyRect(el, x, y, w, h, rot);
  root.appendChild(el);
  return el;
}
function paperTape(root, name, x, y, w, h, rot) {
  const el = img(`${PAPER}/${name}.webp`, "bs-paper-tape");
  el.setAttribute("aria-hidden", "true");
  applyRect(el, x, y, w, h, rot);
  root.appendChild(el);
  return el;
}
function paperPin(root, x, y, size) {
  const el = img(`${PAPER}/pushpin.webp`, "bs-paper-pin");
  el.setAttribute("aria-hidden", "true");
  applyRect(el, x, y, size, size, 0);
  root.appendChild(el);
  return el;
}



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
  // TEXT-ON-ART: book baked into bg_cover; no cover_display sprite
  const marble = sprite(root, "s01", "marble", "s01-marble", p.marble);
  const gear = sprite(root, "s01", "gear", "s01-gear", p.gear);
  const title = h("div", "bs-surface bs-surface--titleblock s01-titleblock on-art");
  const m = IDEA_MAP[1];
  applyRect(title, m.x, m.y, m.w, m.h, m.rot);
  title.innerHTML = `<div class="s01-book on-art-t">DIY Project Based Learning for Math and Science</div>
    <div class="s01-author on-art-b">Heather Wolpert-Gawron</div>
    <div class="s01-pub on-art-h">Routledge · Eye On Education · 2016</div>
    <div class="s01-byline on-art-b">Book Share by Dimitry Gordon</div>`;
  root.appendChild(title);
  if (reduced()) return;
  // Marble stays near drawn gear; do not roll across the book
  loopOrOnce(T, marble, [
    { transform: "translate(0,0)" },
    { transform: "translate(4px,-3px)" },
    { transform: "translate(0,0)" },
  ], 0.2, 2.8);
  loopOrOnce(T, gear, [
    { transform: "rotate(0deg)" },
    { transform: "rotate(360deg)" },
  ], 0, 6);
  T.fadeUp(title, 0.4, 0.7, 12);
}

function buildS02(root, T) {
  const p = P("s02");
  const walkers = (p.walkers || []).map((place, i) =>
    sprite(root, "s02", "walker", `s02-walker s02-w${i}`, place));
  const glow = sprite(root, "s02", "lantern_glow", "s02-glow", p.lantern_glow);
  if (reduced()) return;
  walkers.forEach((w, i) => {
    const dx = i === 0 ? 180 : 160;
    loopOrOnce(T, w, [
      { transform: "translate(0,0)" },
      { transform: `translate(${dx}px,-6px)` },
      { transform: `translate(${dx * 2}px,0)` },
    ], i * 0.4, 5);
  });
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
  // Leo FINAL: one checkmark climbs rows (~45px); two blank shimmer lines
  const check = sprite(root, "s07", "checkmark", "s07-check", (p.checks || [])[0]);
  const b1 = sprite(root, "s07", "blank_row", "s07-blank s07-b0", (p.blanks || [])[0]);
  const b2 = sprite(root, "s07", "blank_row", "s07-blank s07-b1", (p.blanks || [])[1]);
  if (reduced()) return;
  // climb several checklist rows then reset (45px display ≈ 4.17% of 1080)
  loopOrOnce(T, check, [
    { transform: "translateY(0px)", opacity: 1 },
    { transform: "translateY(45px)", opacity: 1 },
    { transform: "translateY(90px)", opacity: 1 },
    { transform: "translateY(135px)", opacity: 1 },
    { transform: "translateY(180px)", opacity: 1 },
    { transform: "translateY(180px)", opacity: 0 },
    { transform: "translateY(0px)", opacity: 0 },
  ], 0, 5.5);
  loopOrOnce(T, b1, [{ opacity: 0.3 }, { opacity: 0.85 }, { opacity: 0.3 }], 0, 1.5);
  loopOrOnce(T, b2, [{ opacity: 0.3 }, { opacity: 0.85 }, { opacity: 0.3 }], 0.3, 1.5);
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
  const card = sprite(root, "s09", "doc_card", "s09-card", (p.cards || [])[0]);
  // Labels for genre cards painted in the bg fan (Leo FINAL). Positions in % of 1920x1080.
  // Positions tuned to Leo FINAL fan (1920x1080 %): beaker, clipboard, envelope, seal cards.
  const genres = [
    { text: "Lab report", left: 54, top: 34 },
    { text: "Problem statement", left: 78, top: 48 },
    { text: "Business letter", left: 68, top: 30 },
    { text: "Executive summary", left: 64, top: 58 },
  ];
  genres.forEach((g, i) => {
    const el = surface("genre", `s09-genre s09-g${i}`);
    el.textContent = g.text;
    el.style.left = g.left + "%";
    el.style.top = g.top + "%";
    root.appendChild(el);
  });
  if (reduced()) return;
  loopOrOnce(T, card, [
    { transform: "rotate(-4deg)" },
    { transform: "rotate(4deg)" },
    { transform: "rotate(-4deg)" },
  ], 0, 3.2);
}

function buildS10(root, T) {
  const p = P("s10");
  const glow = sprite(root, "s10", "breakeven_glow", "s10-glow", p.breakeven_glow);
  const block = sprite(root, "s10", "birac_block", "s10-block", (p.blocks || [])[0]);

  // Two equation chips (was one run-together string)
  const chipCost = surface("chip", "s10-chip s10-chip-cost");
  chipCost.textContent = "Cost: C = vx + F";
  chipCost.style.left = "8%";
  chipCost.style.bottom = "14%";
  root.appendChild(chipCost);
  const chipRev = surface("chip", "s10-chip s10-chip-rev");
  chipRev.textContent = "Revenue: R = px";
  chipRev.style.left = "8%";
  chipRev.style.bottom = "8%";
  root.appendChild(chipRev);

  // Graph line / point labels checked against Leo art: cost shallower above 0,
  // revenue steeper from origin, glow at break-even (1120,430 ≈ 58.3%, 39.8%).
  const labels = [
    { cls: "s10-lab-cost", text: "Cost", left: 42, top: 48 },
    { cls: "s10-lab-rev", text: "Revenue", left: 52, top: 28 },
    { cls: "s10-lab-be", text: "Break-even", left: 56, top: 36 },
  ];
  labels.forEach((L) => {
    const el = surface("label", L.cls);
    el.textContent = L.text;
    el.style.left = L.left + "%";
    el.style.top = L.top + "%";
    root.appendChild(el);
  });

  // BIRAC letters on the stacked blocks (right of graph). Bottom→top: B I R A C
  // Block sprite sits near (80.2%, 59.3%); stack rises above it in the bg.
  const birac = ["B", "I", "R", "A", "C"];
  birac.forEach((letter, i) => {
    const el = surface("label", `s10-birac-letter s10-birac-${letter}`);
    el.textContent = letter;
    el.style.left = "82.5%";
    // five blocks stacked; ~5.5% vertical spacing upward from near block top
    el.style.top = (62 - i * 5.5) + "%";
    root.appendChild(el);
  });

  if (reduced()) return;
  loopOrOnce(T, glow, [{ opacity: 0.35 }, { opacity: 1 }, { opacity: 0.35 }], 0, 1.4);
  loopOrOnce(T, block, [
    { transform: "translateY(0)" },
    { transform: "translateY(-6px)" },
    { transform: "translateY(0)" },
  ], 0, 2.8);
}

function buildS11(root, T) {
  const p = P("s11");
  const tip = sprite(root, "s11", "tip_card", "s11-tip", (p.tips || [])[0]);
  const pen = sprite(root, "s11", "red_pen", "s11-pen", p.red_pen);
  if (reduced()) return;
  loopOrOnce(T, tip, [
    { transform: "rotate(-3deg) translateY(0)" },
    { transform: "rotate(2deg) translateY(-4px)" },
    { transform: "rotate(-3deg) translateY(0)" },
  ], 0, 2.6);
  loopOrOnce(T, pen, [
    { transform: "rotate(-2deg)" },
    { transform: "rotate(2deg)" },
    { transform: "rotate(-2deg)" },
  ], 0.2, 2.2);
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
  // Leo FINAL: bg only (barbell baked into scene). No overlay sprites.
  void root; void T;
}

function buildS14(root, T) {
  const p = P("s14");
  const bubbles = (p.bubbles || []).map((place, i) =>
    sprite(root, "s14", "q_bubble", `s14-q s14-q${i}`, place));
  if (reduced()) return;
  bubbles.forEach((b, i) => {
    loopOrOnce(T, b, [
      { transform: "translateY(0) scale(1)", opacity: 0.85 },
      { transform: "translateY(-28px) scale(1.05)", opacity: 1 },
      { transform: "translateY(-50px) scale(1)", opacity: 0.2 },
      { transform: "translateY(0) scale(1)", opacity: 0 },
    ], i * 0.45, 3.2);
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
  // 8 index cards pinned on cork board (TEXT-ON-ART keyterms/bg_v2)
  const wall = surface("terms", "bs-term-wall");
  (terms || []).slice(0, 8).forEach((term, i) => {
    const x = 170 + 235 * (i % 4);
    const y = 225 + 225 * Math.floor(i / 4);
    const rot = KT_ROTS[i] || 0;
    const wrap = h("div", `bs-term-card t${i} bs-reveal on-art`);
    applyRect(wrap, x, y, 225, 175, rot);
    const card = img(`${PAPER}/index_card.webp`, "bs-paper bs-term-paper");
    card.setAttribute("aria-hidden", "true");
    card.style.position = "absolute";
    card.style.inset = "0";
    card.style.width = "100%";
    card.style.height = "100%";
    card.style.objectFit = "fill";
    wrap.appendChild(card);
    const text = h("div", "bs-term-text on-art-t");
    text.textContent = String(term).replace(/^"|"$/g, "");
    wrap.appendChild(text);
    // pin overlaps top center ~14px
    const pin = img(`${PAPER}/pushpin.webp`, "bs-paper-pin");
    pin.setAttribute("aria-hidden", "true");
    pin.style.position = "absolute";
    pin.style.left = "50%";
    pin.style.top = "-14px";
    pin.style.width = "48px";
    pin.style.height = "48px";
    pin.style.transform = "translateX(-50%)";
    pin.style.zIndex = "8";
    wrap.appendChild(pin);
    if (i === 0) wrap.dataset.magicId = "term_lead";
    wall.appendChild(wrap);
    if (!reduced()) {
      T.A(wrap, [
        { transform: `rotate(${rot}deg) scale(0.92)` },
        { transform: `rotate(${rot}deg) scale(1)` },
      ], 0.1 + i * 0.12, 0.35);
    }
  });
  root.appendChild(wall);
}


function buildKeytermsArt(root, T) {
  const p = P("keyterms");
  sprite(root, "keyterms", "flip_card", "kt-flip", p.flip_card, "flip_card");
  sprite(root, "keyterms", "pushpin", "kt-pin", p.pushpin, "pushpin");
  if (reduced()) return;
  const flip = root.querySelector(".kt-flip");
  const pin = root.querySelector(".kt-pin");
  if (flip) loopOrOnce(T, flip, [
    { transform: "rotateY(0deg)" },
    { transform: "rotateY(180deg)" },
    { transform: "rotateY(0deg)" },
  ], 0.4, 3.5);
  if (pin) loopOrOnce(T, pin, [
    { transform: "translateY(0)" },
    { transform: "translateY(3px)" },
    { transform: "translateY(0)" },
  ], 0, 2.2);
}

function buildDiscussionArt(root, T) {
  const p = P("discussion");
  sprite(root, "discussion", "note_card", "dq-note", p.note_card, "note_card");
  sprite(root, "discussion", "pushpin", "dq-pin", p.pushpin, "pushpin");
  if (reduced()) return;
  const note = root.querySelector(".dq-note");
  const pin = root.querySelector(".dq-pin");
  if (note) loopOrOnce(T, note, [
    { transform: "rotate(-2deg)" },
    { transform: "rotate(2deg)" },
    { transform: "rotate(-2deg)" },
  ], 0, 3);
  if (pin) loopOrOnce(T, pin, [
    { transform: "translateY(0)" },
    { transform: "translateY(3px)" },
    { transform: "translateY(0)" },
  ], 0, 2.2);
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


function buildOnArtIdeaPanel(root, slide) {
  // Title + bullets written on cream left column (TEXT-ON-ART.md). No CSS card.
  if (!slide || slide.n < 2 || slide.n > 16) return;
  const m = IDEA_MAP[slide.n] || IDEA_MAP[2];
  const panel = surface("idea", "bs-idea-panel on-art");
  if (slide.idea) panel.dataset.idea = String(slide.idea);
  applyRect(panel, m.x, m.y, m.w, m.h, m.rot);
  const title = h("div", "bs-idea-title on-art-t");
  title.textContent = slide.title || "";
  panel.appendChild(title);
  const bullets = (slide.bullets || []).slice(0, 4);
  if (bullets.length) {
    const ul = h("ul", "bs-idea-bullets on-art-b");
    bullets.forEach((b) => {
      const li = document.createElement("li");
      li.textContent = String(b).replace(/^"|"$/g, "");
      ul.appendChild(li);
    });
    panel.appendChild(ul);
  }
  if (slide.chapter) {
    const cite = h("div", "bs-idea-cite on-art-h");
    cite.textContent = slide.chapter;
    panel.appendChild(cite);
  }
  root.appendChild(panel);
}


function sideHTML(slide) {
  const parts = [];
  // Round 2: bullets live on-art (bs-surface--idea). Side panel is teleprompter only,
  // so normal view does not show the same bullets twice.
  if (slide.questions && slide.questions.length) {
    parts.push(`<ol class="bs-side-q">${slide.questions.map((q) => `<li>${fx(q)}</li>`).join("")}</ol>`);
  }
  if (slide.resources && slide.resources.length) {
    parts.push(`<p class="aside">Full APA list is on the storyboard.</p>`);
  }
  if (slide.chapter) {
    parts.push(`<p class="aside">${fx(slide.chapter)}</p>`);
  }
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

    // Round 2 B1: on-art title + bullets for teaching slides 2-16
    if (slide.n >= 2 && slide.n <= 16) buildOnArtIdeaPanel(root, slide);

    if (slide.kind === "terms") {
      buildKeyTermsOverlay(root, T, slide.bullets || []);
      buildKeytermsArt(root, T);
    } else if (slide.kind === "discuss") {
      // sheet_large taped left; kids stay x>950
      paperSprite(root, "sheet_large", 60, 50, 840, 980, -1);
      paperTape(root, "tape_a", 90, 40, 220, 60, -8);
      paperTape(root, "tape_b", 680, 55, 220, 60, 6);
      const panel = surface("discuss", "bs-discuss on-art");
      applyRect(panel, 150, 140, 680, 820, -1);
      (slide.questions || []).forEach((q, i) => {
        const card = surface("discuss-card", `bs-dq-card dq${i} bs-reveal`);
        card.innerHTML = `<b>Q${i + 1}.</b> ${fx(q)}`;
        panel.appendChild(card);
      });
      root.appendChild(panel);
      buildDiscussionArt(root, T);
    } else if (slide.kind === "resources") {
      const nRes = (slide.resources || []).length;
      const isTools = /tools/i.test(slide.title || "") || nRes <= 4;
      if (isTools) {
        // torn_page for Tools (slide 21)
        paperSprite(root, "torn_page", 70, 150, 880, 560, 1.5);
        paperTape(root, "tape_a", 400, 140, 220, 60, -4);
        const panel = surface("resources", "bs-resources-panel bs-resources-panel--compact bs-reveal on-art");
        applyRect(panel, 220, 230, 660, 420, 1.5);
        const heading = h("div", "bs-res-h on-art-t");
        heading.textContent = slide.resHeading || slide.title || "Tools";
        panel.appendChild(heading);
        const ul = h("ul", "bs-apa on-art-b");
        (slide.resources || []).forEach((r) => {
          const li = document.createElement("li");
          li.innerHTML = r.html;
          ul.appendChild(li);
        });
        panel.appendChild(ul);
        root.appendChild(panel);
      } else {
        // sheet_large for References (slide 20)
        paperSprite(root, "sheet_large", 50, 40, 900, 1000, -0.8);
        paperTape(root, "tape_a", 80, 30, 220, 60, -6);
        paperTape(root, "tape_b", 700, 45, 220, 60, 5);
        const panel = surface("resources", "bs-resources-panel bs-reveal on-art");
        applyRect(panel, 130, 110, 760, 880, -0.8);
        const heading = h("div", "bs-res-h on-art-t");
        heading.textContent = slide.resHeading || slide.title || "References";
        panel.appendChild(heading);
        const ul = h("ul", "bs-apa on-art-b");
        (slide.resources || []).forEach((r) => {
          const li = document.createElement("li");
          li.innerHTML = r.html;
          ul.appendChild(li);
        });
        panel.appendChild(ul);
        root.appendChild(panel);
      }
      if (BUILDERS.s18) BUILDERS.s18(root, T);
    } else if (slide.kind === "conclude") {
      if (BUILDERS.s17) BUILDERS.s17(root, T);
      // torn_page taped top center
      paperSprite(root, "torn_page", 90, 120, 850, 540, 2);
      paperTape(root, "tape_a", 420, 118, 220, 60, -5);
      const box = surface("takeaways", "bs-takeaways bs-reveal on-art");
      applyRect(box, 230, 200, 670, 420, 2);
      const items = (slide.bullets || []).map((b) => fx(String(b).replace(/^\d+\.\s*/, "")));
      box.innerHTML = `<h3 class="on-art-t">Takeaways</h3><ol class="on-art-b">${items.map((b) => `<li>${b}</li>`).join("")}</ol>`;
      root.appendChild(box);
    } else if (BUILDERS[artId]) {
      BUILDERS[artId](root, T);
    }
    return { hold_after: slide.hold_after || 0 };
  },
}));

export const PAGE_COUNT = PAGES.length;
