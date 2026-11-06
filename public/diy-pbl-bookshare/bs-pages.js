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
  // TEXT-ON-ART: no journal_page sprite (stray curled note on the open book).
  void root; void T;
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
  // No doc_card sprite (looked like a stray sticky). Genre labels stay on the drawn fan.
  // Centered on each drawn card, below the header icon (TEXT-ON-ART / Round 3)
  const genres = [
    // Scene-% centers of each drawn card body (verified against full-view shots)
    { text: "Lab report", left: 61.2, top: 24.5 },        // flask card white body under red header
    { text: "Business letter", left: 59.5, top: 60 },     // envelope card body
    { text: "Executive summary", left: 69.5, top: 58 },   // wax-seal card body
    { text: "Problem statement", left: 86.5, top: 58 },   // clipboard card body
  ];
  genres.forEach((g, i) => {
    const el = surface("genre", `s09-genre s09-g${i} on-art`);
    // Two-line wrap so long labels fit inside narrow card bodies
    el.textContent = g.text.replace(" ", "\n");
    el.style.left = g.left + "%";
    el.style.top = g.top + "%";
    el.style.transform = "translate(-50%, -50%) rotate(-2deg)";
    el.style.textAlign = "center";
    el.style.maxWidth = "7.5%";
    el.style.lineHeight = "1.12";
    el.style.whiteSpace = "pre-line";
    el.style.fontSize = "clamp(11px, 1.15cqw, 18px)";
    root.appendChild(el);
  });
  void T;
}

function buildS10(root, T) {
  const p = P("s10");
  // No breakeven_glow sprite: it sat above the intersection as a stray orange dot;
  // the break-even glow is already baked into bg.webp. (DOM, not Leo.)
  // No birac_block sprite: bg already draws a 4-block stack.

  // Graph labels: sit ON the drawn lines near their tips / glow (art coords).
  const labels = [
    { cls: "s10-lab-rev", text: "Revenue", x: 1510, y: 300 },
    { cls: "s10-lab-cost", text: "Cost", x: 1365, y: 595 },
    { cls: "s10-lab-be", text: "Break-even", x: 1240, y: 455 },
  ];
  labels.forEach((L) => {
    const el = surface("label", `${L.cls} on-art`);
    el.textContent = L.text;
    el.style.left = (L.x / 1920) * 100 + "%";
    el.style.top = (L.y / 1080) * 100 + "%";
    el.style.transform = "rotate(-8deg)";
    root.appendChild(el);
  });

  // BIRAC letters top->bottom (reader scan). Data-driven for Leo's 5th block.
  // Flip BIRAC_HAS_FIFTH_BLOCK to true when the 5th-block art lands; C moves onto that face.
  const BIRAC_HAS_FIFTH_BLOCK = false;
  const biracFaces = [
    { ch: "B", x: 1780, y: 338 }, // top block front face
    { ch: "I", x: 1780, y: 410 },
    { ch: "R", x: 1780, y: 500 },
    { ch: "A", x: 1777, y: 562 }, // bottom of the current 4-stack
    // C: on 5th block when ready; until then, small on the table under the stack
    BIRAC_HAS_FIFTH_BLOCK
      ? { ch: "C", x: 1780, y: 670 }   // TODO: set to the 5th-block face center from overlays
      : { ch: "C", x: 1777, y: 655, small: true },
  ];
  biracFaces.forEach((L) => {
    // No on-art / multiply: solid bold ink so letters stay readable on coral blocks
    const el = surface("label", "s10-birac-letter" + (L.small ? " s10-birac-letter--small" : ""));
    el.textContent = L.ch;
    el.style.left = (L.x / 1920) * 100 + "%";
    el.style.top = (L.y / 1080) * 100 + "%";
    el.style.transform = "translate(-50%, -50%) rotate(-2deg)";
    // ~1.4x original clamp(16px, 1.85cqw, 28px); small C a bit tighter on the table
    el.style.fontSize = L.small
      ? "clamp(16px, 1.9cqw, 28px)"
      : "clamp(22px, 2.6cqw, 39px)";
    el.style.fontWeight = "700";
    el.style.color = "#26376e";
    el.style.mixBlendMode = "normal";
    root.appendChild(el);
  });

  // Formula lines: append into the cream idea panel so they sit with the bullets
  const panel = root.querySelector(".bs-idea-panel");
  if (panel) {
    const eqs = h("div", "bs-idea-eqs on-art-b");
    eqs.innerHTML = `<div class="s10-chip-cost">Cost: C = vx + F</div><div class="s10-chip-rev">Revenue: R = px</div>`;
    panel.appendChild(eqs);
  }

  void T;
  void p;
}


function buildS11(root, T) {
  const p = P("s11");
  // No tip_card sprite (stray sticky on the notebook). Keep red_pen loop.
  const pen = sprite(root, "s11", "red_pen", "s11-pen", p.red_pen);
  if (reduced()) return;
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
  // 8 index cards on cork board (board ~140,197 to 1102,675). 2x4, no overlap.
  const wall = h("div", "bs-term-wall");
  const terms8 = (terms || []).slice(0, 8);
  const gapX = 18, gapY = 28;
  const boardX = 155, boardY = 210, boardW = 930, boardH = 450;
  const cols = 4, rows = 2;
  const cardW = Math.floor((boardW - gapX * (cols - 1)) / cols); // ~219
  const cardH = Math.floor((boardH - gapY * (rows - 1)) / rows); // ~211
  terms8.forEach((term, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const x = boardX + col * (cardW + gapX);
    const y = boardY + row * (cardH + gapY);
    const rot = KT_ROTS[i] || 0;
    const wrap = h("div", `bs-term-card t${i} bs-reveal on-art`);
    applyRect(wrap, x, y, cardW, cardH, rot);
    wrap.style.overflow = "hidden";
    wrap.style.boxSizing = "border-box";
    const card = img(`${PAPER}/index_card.webp`, "bs-paper bs-term-paper");
    card.setAttribute("aria-hidden", "true");
    card.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:0;pointer-events:none;";
    wrap.appendChild(card);
    const text = h("div", "bs-term-text on-art-t");
    text.textContent = String(term).replace(/^"|"$/g, "");
    text.style.cssText = "position:relative;z-index:1;padding:22% 10% 10%;width:100%;height:100%;box-sizing:border-box;display:flex;align-items:center;justify-content:center;text-align:center;line-height:1.15;hyphens:auto;";
    wrap.appendChild(text);
    const pin = img(`${PAPER}/pushpin.webp`, "bs-paper-pin");
    pin.setAttribute("aria-hidden", "true");
    pin.style.cssText = "position:absolute;left:50%;top:-12px;width:40px;height:40px;transform:translateX(-50%);z-index:8;pointer-events:none;";
    wrap.appendChild(pin);
    if (i === 0) wrap.dataset.magicId = "term_lead";
    wall.appendChild(wrap);
    if (!reduced()) {
      T.A(wrap, [
        { transform: `rotate(${rot}deg) scale(0.94)` },
        { transform: `rotate(${rot}deg) scale(1)` },
      ], 0.1 + i * 0.1, 0.3);
    }
  });
  root.appendChild(wall);
}



function buildKeytermsArt(root, T) {
  // TEXT-ON-ART: easel stays as drawn; no flip_card/pushpin stray note.
  void root; void T;
}

function buildDiscussionArt(root, T) {
  // TEXT-ON-ART: kids + cork stay as drawn; no note_card stray sprite.
  void root; void T;
}

function buildS18Page(root, T) {
  // TEXT-ON-ART: no page.webp curled note on the teal spine.
  void root; void T;
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
  const bullets = (slide.bullets || []).slice(0, 5);
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
      // One rotated group: paper + text share -1deg so ink sits on the sheet
      const group = h("div", "bs-paper-group");
      applyRect(group, 50, 30, 920, 1020, 0);
      group.style.transformOrigin = "50% 50%";
      const paper = img(`${PAPER}/sheet_large.webp`, "bs-paper");
      paper.setAttribute("aria-hidden", "true");
      // sheet_large has ~13deg baked clockwise tilt; counter-rotate so ruled lines are horizontal
      paper.style.cssText = "position:absolute;left:-6%;top:-4%;width:112%;height:112%;object-fit:fill;transform:rotate(-12deg);transform-origin:50% 50%;";
      group.appendChild(paper);
      const tape1 = img(`${PAPER}/tape_a.webp`, "bs-paper-tape");
      tape1.setAttribute("aria-hidden", "true");
      tape1.style.cssText = "position:absolute;left:8%;top:2%;width:22%;height:6%;object-fit:fill;transform:rotate(-4deg);z-index:8;";
      group.appendChild(tape1);
      const tape2 = img(`${PAPER}/tape_b.webp`, "bs-paper-tape");
      tape2.setAttribute("aria-hidden", "true");
      tape2.style.cssText = "position:absolute;right:10%;top:3%;width:22%;height:6%;object-fit:fill;transform:rotate(4deg);z-index:8;";
      group.appendChild(tape2);
      const panel = surface("discuss", "bs-discuss on-art");
      panel.style.cssText = "position:absolute;left:18%;top:16%;width:64%;height:70%;overflow:hidden;box-sizing:border-box;padding:0;font-size:clamp(11px,1.15cqw,19px);";
      (slide.questions || []).forEach((q, i) => {
        const card = h("div", `bs-dq-card dq${i} bs-reveal`);
        card.innerHTML = `<b>Q${i + 1}.</b> ${fx(q)}`;
        panel.appendChild(card);
      });
      group.appendChild(panel);
      root.appendChild(group);
      buildDiscussionArt(root, T);
    } else if (slide.kind === "resources") {
      const nRes = (slide.resources || []).length;
      const isTools = /tools/i.test(slide.title || "") || nRes <= 4;
      if (isTools) {
        const group = h("div", "bs-paper-group");
        applyRect(group, 60, 140, 900, 580, 0);
        const paper = img(`${PAPER}/torn_page.webp`, "bs-paper");
        paper.setAttribute("aria-hidden", "true");
        paper.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;";
        group.appendChild(paper);
        const tape = img(`${PAPER}/tape_a.webp`, "bs-paper-tape");
        tape.setAttribute("aria-hidden", "true");
        tape.style.cssText = "position:absolute;left:38%;top:-2%;width:26%;height:12%;object-fit:fill;transform:rotate(-4deg);z-index:8;";
        group.appendChild(tape);
        const panel = surface("resources", "bs-resources-panel bs-resources-panel--compact bs-reveal on-art");
        // torn_page: keep text >=130px from left punched holes (~15% of 880)
        panel.style.cssText = "position:absolute;left:16%;top:14%;width:72%;height:72%;overflow:hidden;box-sizing:border-box;";
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
        group.appendChild(panel);
        root.appendChild(group);
      } else {
        const group = h("div", "bs-paper-group");
        applyRect(group, 40, 20, 940, 1040, 0);
        const paper = img(`${PAPER}/sheet_large.webp`, "bs-paper");
        paper.setAttribute("aria-hidden", "true");
        paper.style.cssText = "position:absolute;left:-6%;top:-4%;width:112%;height:112%;object-fit:fill;transform:rotate(-12deg);transform-origin:50% 50%;";
        group.appendChild(paper);
        const tape1 = img(`${PAPER}/tape_a.webp`, "bs-paper-tape");
        tape1.setAttribute("aria-hidden", "true");
        tape1.style.cssText = "position:absolute;left:8%;top:2%;width:22%;height:6%;object-fit:fill;transform:rotate(-4deg);z-index:8;";
        group.appendChild(tape1);
        const tape2 = img(`${PAPER}/tape_b.webp`, "bs-paper-tape");
        tape2.setAttribute("aria-hidden", "true");
        tape2.style.cssText = "position:absolute;right:10%;top:3%;width:22%;height:6%;object-fit:fill;transform:rotate(4deg);z-index:8;";
        group.appendChild(tape2);
        const panel = surface("resources", "bs-resources-panel bs-reveal on-art");
        panel.style.cssText = "position:absolute;left:14%;top:12%;width:72%;height:78%;overflow:hidden;box-sizing:border-box;";
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
        group.appendChild(panel);
        root.appendChild(group);
      }
    } else if (slide.kind === "conclude") {
      if (BUILDERS.s17) BUILDERS.s17(root, T);
      const group = h("div", "bs-paper-group");
      applyRect(group, 80, 110, 870, 560, 0);
      const paper = img(`${PAPER}/torn_page.webp`, "bs-paper");
      paper.setAttribute("aria-hidden", "true");
      paper.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;";
      group.appendChild(paper);
      const tape = img(`${PAPER}/tape_a.webp`, "bs-paper-tape");
      tape.setAttribute("aria-hidden", "true");
      tape.style.cssText = "position:absolute;left:40%;top:-2%;width:26%;height:12%;object-fit:fill;transform:rotate(-5deg);z-index:8;";
      group.appendChild(tape);
      const box = surface("takeaways", "bs-takeaways bs-reveal on-art");
      box.style.cssText = "position:absolute;left:16%;top:14%;width:74%;height:72%;overflow:hidden;box-sizing:border-box;";
      const items = (slide.bullets || []).map((b) => fx(String(b).replace(/^\d+\.\s*/, "")));
      box.innerHTML = `<h3 class="on-art-t">Takeaways</h3><ol class="on-art-b">${items.map((b) => `<li>${b}</li>`).join("")}</ol>`;
      group.appendChild(box);
      root.appendChild(group);
    } else if (BUILDERS[artId]) {
      BUILDERS[artId](root, T);
    }
    return { hold_after: slide.hold_after || 0 };
  },
}));

export const PAGE_COUNT = PAGES.length;
