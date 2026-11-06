// DIY PBL Bookshare pages: Leo named sprites + exact loop.md motions. No baked text.
import { ART, h, fx } from "./bs-engine.js";
import { SLIDES } from "./bs-data.js";
import { PLACEMENTS, applyPlace } from "./bs-placements.js";
import { s09Cards, keytermsCards } from "./bs-layouts.js";

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

/** Prefer Leo redraw (bg_v6.webp / bg_next.webp) when present; else bg.webp. */
function artBgUrl(artId) {
  // Hooks for Leo s08 / s16 redraws (and any future per-slide pass).
  const prefer = ["bg_v6.webp", "bg_next.webp", "bg_v2.webp"];
  // Sync path pick: try known Leo filenames via data attribute; actual 404 avoided by
  // only switching when window.__bsArtBg has been probed at boot.
  const map = (typeof window !== "undefined" && window.__bsArtBg) || {};
  if (map[artId]) return `${ART}${artId}/${map[artId]}`;
  return `${ART}${artId}/bg.webp`;
}

function sceneRoot(scene, artId) {
  const root = h("div", "bs-scene");
  root.dataset.art = artId;
  const bg = img(artBgUrl(artId), "bs-bg");
  root.appendChild(bg);
  scene.appendChild(root);
  return root;
}

function sprite(root, artId, name, cls, place) {
  const el = img(`${ART}${artId}/${name}.webp`, `bs-sp ${cls || ""}`);
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

/** Shrink text font until it fits in the box (max 2 lines), floor at minPx. */
function fitCardText(el, minPx, maxPx) {
  if (!el) return;
  const box = el.getBoundingClientRect();
  if (box.height < 4 || box.width < 4) return;
  let lo = minPx, hi = maxPx, best = minPx;
  el.style.whiteSpace = "normal";
  for (let i = 0; i < 10; i++) {
    const mid = (lo + hi) / 2;
    el.style.fontSize = mid + "px";
    // allow wrap; treat overflow as too big
    const ok = el.scrollHeight <= box.height + 1 && el.scrollWidth <= box.width + 1;
    if (ok) { best = mid; lo = mid; } else { hi = mid; }
  }
  el.style.fontSize = best + "px";
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



function loopOrOnce() { /* decorative motion removed (Leo polish) */ }

/* ---- per-slide builds from loop.md ---- */
function buildS01(root, T) {
  // Title block only. Marble/gear sprites were animation-only; dropped.
  const title = h("div", "bs-surface bs-surface--titleblock s01-titleblock on-art");
  const m = IDEA_MAP[1];
  applyRect(title, m.x, m.y, m.w, m.h, m.rot);
  title.innerHTML = `<div class="s01-book on-art-t">DIY Project Based Learning for Math and Science</div>
    <div class="s01-author on-art-b">Heather Wolpert-Gawron</div>
    <div class="s01-pub on-art-h">Routledge · Eye On Education · 2016</div>
    <div class="s01-byline on-art-b">Book Share by Dimitry Gordon</div>`;
  root.appendChild(title);
  void T;
}

function buildS02(root, T) {
  // Walkers + lantern_glow were animation-only; dropped. Art stands alone.
  void root; void T;
}

function buildS03(root, T) {
  // Footprints sprite was animation-only; dropped.
  void root; void T;
}

function buildS04(root, T) {
  // Leo: curled note was the journal_page sprite (not bg). Keep it unmounted.
  void root; void T;
}

function buildS05(root, T) {
  // Marble bob removed; sprite dropped (animation-only).
  void root; void T;
}

function buildS06(root, T) {
  // Motifs stay as static art props (no opacity pulse).
  const p = P("s06");
  sprite(root, "s06", "heart", "s06-heart", p.heart);
  sprite(root, "s06", "standards", "s06-standards", p.standards);
  sprite(root, "s06", "puzzle", "s06-puzzle", p.puzzle);
  void T;
}

function buildS07(root, T) {
  // Climbing checkmark + blank-row shimmer were animation-only; dropped.
  void root; void T;
}

function buildS08(root, T) {
  // Cloud glide removed. Leo redraw hook: artBgUrl prefers bg_v6/bg_next when probed.
  void root; void T;
}

function buildS09(root, T) {
  // Labels from art/s09/cards.json quads (TL,TR,BR,BL). Centered + rotated with each card.
  const cards = s09Cards();
  cards.forEach((c, i) => {
    const q = c.quad;
    if (!q || q.length < 4) return;
    const cx = (q[0][0] + q[1][0] + q[2][0] + q[3][0]) / 4;
    const cy = (q[0][1] + q[1][1] + q[2][1] + q[3][1]) / 4;
    // Width along top edge; height along left edge (for font sizing)
    const topW = Math.hypot(q[1][0] - q[0][0], q[1][1] - q[0][1]);
    const sideH = Math.hypot(q[3][0] - q[0][0], q[3][1] - q[0][1]);
    const rot = c.rot != null ? c.rot : Math.atan2(q[1][1] - q[0][1], q[1][0] - q[0][0]) * 180 / Math.PI;
    const el = surface("genre", `s09-genre s09-g${i} on-art`);
    el.dataset.cardId = c.id || `g${i}`;
    const label = c.text || "";
    el.textContent = label.includes(" ") ? label.replace(" ", "\n") : label;
    el.style.left = (cx / 1920) * 100 + "%";
    el.style.top = (cy / 1080) * 100 + "%";
    el.style.width = (topW / 1920) * 100 + "%";
    el.style.height = (sideH / 1080) * 100 + "%";
    el.style.transform = `translate(-50%, -50%) rotate(${rot}deg)`;
    el.style.transformOrigin = "50% 50%";
    el.style.textAlign = "center";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.lineHeight = "1.12";
    el.style.whiteSpace = "pre-line";
    el.style.padding = "4%";
    el.style.boxSizing = "border-box";
    el.style.fontSize = "clamp(10px, 1.05cqw, 17px)";
    el.style.overflow = "hidden";
    el.style.pointerEvents = "none";
    root.appendChild(el);
  });
  void T;
}

function buildS10(root, T) {
  const p = P("s10");
  // No breakeven_glow / birac_block sprites: glow + 5-block stack are baked into bg_v5.
  // Graph labels are NOT in the art (faces.json graph_labels: []) - DOM only, once.

  // Sampled from bg_v5: teal tip ~(1557,369), glow ~(1287,599), coral below-right.
  const labels = [
    { cls: "s10-lab-rev", text: "Revenue", x: 1481, y: 313 },      // above-left of teal tip (~1557,369)
    { cls: "s10-lab-cost", text: "Cost", x: 1500, y: 531 },         // ~15px below coral, right of cross
    { cls: "s10-lab-be", text: "Break-even", x: 1177, y: 477 },     // right edge ~15px left of glow; above it
  ];
  labels.forEach((L) => {
    const el = surface("label", `${L.cls} on-art`);
    el.textContent = L.text;
    el.style.left = (L.x / 1920) * 100 + "%";
    el.style.top = (L.y / 1080) * 100 + "%";
    el.style.transform = "rotate(-6deg)";
    root.appendChild(el);
  });

  // Letter rects from art/s10/faces.json (v5). Center each letter in its face.
  const BIRAC_HAS_FIFTH_BLOCK = true;
  const biracFaces = [
    { ch: "B", x: 1726, y: 206, w: 48, h: 52 },
    { ch: "I", x: 1724, y: 294, w: 48, h: 54 },
    { ch: "R", x: 1727, y: 384, w: 48, h: 52 },
    { ch: "A", x: 1722, y: 472, w: 48, h: 52 },
    { ch: "C", x: 1721, y: 560, w: 48, h: 53 },
  ];
  if (!BIRAC_HAS_FIFTH_BLOCK) {
    // 4-block fallback: drop C
    biracFaces.pop();
  }
  biracFaces.forEach((L) => {
    const el = surface("label", "s10-birac-letter");
    el.textContent = L.ch;
    // Center of face rect (xywh art coords)
    const cx = L.x + L.w / 2;
    const cy = L.y + L.h / 2;
    el.style.left = (cx / 1920) * 100 + "%";
    el.style.top = (cy / 1080) * 100 + "%";
    el.style.transform = "translate(-50%, -50%)";
    // Fit fully inside ~48x52 face with a little padding
    el.style.fontSize = "clamp(15px, 1.7cqw, 26px)";
    el.style.fontWeight = "700";
    el.style.lineHeight = "1";
    el.style.color = "#26376e";
    el.style.mixBlendMode = "normal";
    el.dataset.face = `${L.x},${L.y},${L.w},${L.h}`;
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
  // Red pen stays as static prop (no wobble).
  const p = P("s11");
  if (p.red_pen) sprite(root, "s11", "red_pen", "s11-pen", p.red_pen);
  void T;
}

function buildS12(root, T) {
  // Needle stays as static prop (no swing).
  const place = P("s12").needle;
  if (place) sprite(root, "s12", "needle", "s12-needle", place);
  void T;
}

function buildS13(root, T) {
  // Leo FINAL: bg only (barbell baked into scene). No overlay sprites.
  void root; void T;
}

function buildS14(root, T) {
  // Floating q_bubble sprites were animation-only; dropped.
  void root; void T;
}

function buildS15(root, T) {
  // Sliding block sprite was animation-only; dropped.
  void root; void T;
}

function buildS16(root, T) {
  // Magnifier/stylus glides removed. Leo redraw hook via artBgUrl (bg_v6/bg_next).
  void root; void T;
}

function buildS17Lanterns(root, T) {
  // Pulsing glow sprites removed (Leo: no glow/pulse overlays).
  void root; void T;
}

function buildKeyTermsOverlay(root, T, terms) {
  // Cards + pins from art/keyterms/cards.json. Text fits inside card below pin.
  const wall = h("div", "bs-term-wall");
  const layout = keytermsCards();
  const termList = (terms || []).map((t) => String(t).replace(/^"|"$/g, ""));
  layout.forEach((C, i) => {
    const term = C.term != null ? String(C.term).replace(/^"|"$/g, "") : (termList[i] || "");
    const rot = C.rot || 0;
    const wrap = h("div", `bs-term-card t${i} on-art`);
    applyRect(wrap, C.x, C.y, C.w, C.h, rot);
    wrap.style.overflow = "hidden";
    wrap.style.boxSizing = "border-box";
    wrap.dataset.cardId = C.id || `t${i}`;

    const card = img(`${PAPER}/index_card.webp`, "bs-paper bs-term-paper");
    card.setAttribute("aria-hidden", "true");
    card.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:0;pointer-events:none;";
    wrap.appendChild(card);

    // Pin at top edge of the card (above text). Size from JSON, positioned in card-local %.
    const pin = img(`${PAPER}/pushpin.webp`, "bs-paper-pin");
    pin.setAttribute("aria-hidden", "true");
    const pinW = C.pin && C.pin.w ? C.pin.w : 36;
    const pinH = C.pin && C.pin.h ? C.pin.h : 36;
    const pinLeftPct = 50;
    const pinTopPx = -Math.round(pinH * 0.35);
    pin.style.cssText = `position:absolute;left:${pinLeftPct}%;top:${pinTopPx}px;width:${(pinW / C.w) * 100}%;height:auto;aspect-ratio:1;transform:translateX(-50%);z-index:8;pointer-events:none;`;
    wrap.appendChild(pin);

    const padTop = (C.pad_top_frac != null ? C.pad_top_frac : 0.08);
    // Extra top pad so text clears the pin head (~pin sits on top edge)
    const pinClear = Math.max(padTop, (pinH * 0.55) / C.h);
    const text = h("div", "bs-term-text on-art-t");
    text.textContent = term;
    text.style.cssText = [
      "position:absolute",
      `left:${padTop * 100}%`,
      `right:${padTop * 100}%`,
      `top:${(pinClear + padTop) * 100}%`,
      `bottom:${padTop * 100}%`,
      "z-index:1",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "text-align:center",
      "line-height:1.15",
      "overflow:hidden",
      "box-sizing:border-box",
      "hyphens:auto",
      "font-size:clamp(11px, 2.8cqh, 22px)",
    ].join(";");
    wrap.appendChild(text);
    wall.appendChild(wrap);
    requestAnimationFrame(() => fitCardText(text, 11, 22));
  });
  root.appendChild(wall);
  void T;
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
      // Nearly full-height sheet_flat in left cream; kids stay x>950 (right edge ~930).
      // No scroll: all Qs must fit in full view (tight lh, not locked to ruled pitch).
      const group = h("div", "bs-paper-group");
      applyRect(group, 40, 15, 890, 1050, -0.5);
      group.style.transformOrigin = "50% 50%";
      const paper = img(`${PAPER}/sheet_flat.webp`, "bs-paper");
      paper.setAttribute("aria-hidden", "true");
      paper.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;";
      group.appendChild(paper);
      const tape1 = img(`${PAPER}/tape_a.webp`, "bs-paper-tape");
      tape1.setAttribute("aria-hidden", "true");
      tape1.style.cssText = "position:absolute;left:8%;top:1%;width:20%;height:4.5%;object-fit:fill;transform:rotate(-3deg);z-index:8;";
      group.appendChild(tape1);
      const tape2 = img(`${PAPER}/tape_b.webp`, "bs-paper-tape");
      tape2.setAttribute("aria-hidden", "true");
      tape2.style.cssText = "position:absolute;right:8%;top:1.5%;width:20%;height:4.5%;object-fit:fill;transform:rotate(3deg);z-index:8;";
      group.appendChild(tape2);
      const panel = surface("discuss", "bs-discuss on-art");
      panel.style.cssText = "position:absolute;left:9%;top:5.5%;width:82%;height:90%;overflow:hidden;box-sizing:border-box;padding:0;";
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
        // Compact sheet_flat (~40% width) on left cream; body type, no scroll
        const group = h("div", "bs-paper-group");
        applyRect(group, 50, 30, 760, 1020, 0);
        const paper = img(`${PAPER}/sheet_flat.webp`, "bs-paper");
        paper.setAttribute("aria-hidden", "true");
        paper.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;";
        group.appendChild(paper);
        const tape = img(`${PAPER}/tape_a.webp`, "bs-paper-tape");
        tape.setAttribute("aria-hidden", "true");
        tape.style.cssText = "position:absolute;left:38%;top:-1%;width:22%;height:5%;object-fit:fill;transform:rotate(-3deg);z-index:8;";
        group.appendChild(tape);
        const panel = surface("resources", "bs-resources-panel bs-resources-panel--compact bs-reveal on-art");
        panel.style.cssText = "position:absolute;left:11%;top:8%;width:78%;height:84%;overflow:hidden;box-sizing:border-box;";
        const heading = h("div", "bs-res-h on-art-t");
        heading.textContent = slide.resHeading || slide.title || "Tools";
        panel.appendChild(heading);
        const ul = h("ul", "bs-apa bs-apa-single on-art-b");
        (slide.resources || []).forEach((r) => {
          const li = document.createElement("li");
          li.innerHTML = r.html;
          ul.appendChild(li);
        });
        panel.appendChild(ul);
        group.appendChild(panel);
        root.appendChild(group);
      } else {
        // sheet_flat_wide ~55% left; two-column APA; teal book stays clear (x>~1260)
        const group = h("div", "bs-paper-group");
        applyRect(group, 30, 15, 1050, 1050, 0);
        const paper = img(`${PAPER}/sheet_flat_wide.webp`, "bs-paper");
        paper.setAttribute("aria-hidden", "true");
        paper.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;";
        group.appendChild(paper);
        const tape1 = img(`${PAPER}/tape_a.webp`, "bs-paper-tape");
        tape1.setAttribute("aria-hidden", "true");
        tape1.style.cssText = "position:absolute;left:6%;top:1%;width:16%;height:5%;object-fit:fill;transform:rotate(-3deg);z-index:8;";
        group.appendChild(tape1);
        const tape2 = img(`${PAPER}/tape_b.webp`, "bs-paper-tape");
        tape2.setAttribute("aria-hidden", "true");
        tape2.style.cssText = "position:absolute;right:6%;top:1.5%;width:16%;height:5%;object-fit:fill;transform:rotate(3deg);z-index:8;";
        group.appendChild(tape2);
        const panel = surface("resources", "bs-resources-panel bs-resources-panel--wide bs-reveal on-art");
        panel.style.cssText = "position:absolute;left:5%;top:7%;width:90%;height:86%;overflow:hidden;box-sizing:border-box;";
        const heading = h("div", "bs-res-h on-art-t");
        heading.textContent = slide.resHeading || slide.title || "References";
        panel.appendChild(heading);
        const ul = h("ul", "bs-apa bs-apa-two on-art-b");
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
