// DIY PBL Bookshare pages: Leo named sprites + exact loop.md motions. No baked text.
import { ART, h, fx } from "./bs-engine.js";
import { SLIDES } from "./bs-data.js";
import { PLACEMENTS, applyPlace } from "./bs-placements.js";
import { s09Cards, keytermsCards, S09_LABEL_SLOTS } from "./bs-layouts.js";
import { placeDecor, startDecorMotions, cancelDecorMotions } from "./bs-decor.js";
import { R6_DECOR } from "./bs-r6-decor-data.js";

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
  // If probe picked a soft-404 URL, fall back to the committed bg.webp once.
  bg.addEventListener("error", () => {
    const fallback = `${ART}${artId}/bg.webp`;
    if (bg.dataset.fallbackTried === "1" || bg.src.endsWith("/bg.webp") || bg.getAttribute("src") === fallback) return;
    bg.dataset.fallbackTried = "1";
    bg.src = fallback;
  }, { once: true });
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
  1:  { x: 90, y: 200, w: 920, h: 520, rot: 1 },
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

/** Cream-column rects keyed by art folder id (stable across renumbering). */
const IDEA_BY_ART = {
  s02: { x: 110, y: 200, w: 760, h: 560, rot: -1 },
  s03: { x: 110, y: 200, w: 760, h: 560, rot: 1 },
  s04: { x: 110, y: 200, w: 730, h: 540, rot: -1 },
  s05: { x: 110, y: 200, w: 800, h: 560, rot: -1 },
  s06: { x: 110, y: 200, w: 700, h: 560, rot: 1 },
  s07: { x: 110, y: 200, w: 700, h: 560, rot: -1 },
  s08: { x: 110, y: 200, w: 760, h: 560, rot: 1 },
  s09: { x: 110, y: 200, w: 860, h: 560, rot: -1 },
  s10: { x: 110, y: 200, w: 700, h: 520, rot: 1 },
  s11: { x: 110, y: 200, w: 780, h: 560, rot: -1 },
  s12: { x: 110, y: 200, w: 860, h: 560, rot: 1 },
  s13: { x: 110, y: 200, w: 880, h: 560, rot: -1 },
  s14: { x: 110, y: 200, w: 760, h: 560, rot: 1 },
  s15: { x: 110, y: 200, w: 720, h: 560, rot: -1 },
  s16: { x: 110, y: 200, w: 860, h: 560, rot: 1 },
  r6a: { x: 64, y: 140, w: 640, h: 760, rot: -1 },
  r6b: { x: 64, y: 140, w: 640, h: 760, rot: 1 },
  r6c: { x: 64, y: 140, w: 640, h: 760, rot: -1 },
  r6d: { x: 64, y: 140, w: 640, h: 760, rot: 1 },
  r6e: { x: 64, y: 140, w: 640, h: 760, rot: -1 },
  r6f: { x: 64, y: 140, w: 640, h: 760, rot: 1 },
  r6h: { x: 64, y: 140, w: 640, h: 760, rot: -1 },
  r6i: { x: 64, y: 140, w: 640, h: 760, rot: 1 },
  r6j: { x: 64, y: 140, w: 640, h: 760, rot: -1 },
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

/**
 * 1920x1080 design layer scaled with the stage (same transform as the art).
 * Children layout in design pixels; CSS transform scales them with the scene.
 */
/**
 * Sync design layer to the same transform as object-fit:cover for 1920x1080 art.
 * When the scene is taller/wider than 16:9 (mobile full view), cover crops; we
 * match that crop so labels stay glued to the artwork.
 */
function syncDesignLayer(root, layer) {
  const sw = root.clientWidth || 1;
  const sh = root.clientHeight || 1;
  const artW = 1920, artH = 1080;
  const sceneAspect = sw / sh;
  const artAspect = artW / artH;
  let scale, ox, oy;
  if (sceneAspect > artAspect) {
    // wider than art: scale by width, letterbox/crop top-bottom (cover crops)
    scale = sw / artW;
    ox = 0;
    oy = (sh - artH * scale) / 2;
  } else {
    // taller than art: scale by height, crop left-right
    scale = sh / artH;
    ox = (sw - artW * scale) / 2;
    oy = 0;
  }
  layer.style.transform = `translate(${ox}px, ${oy}px) scale(${scale})`;
}


/** Fit an s09 label so every glyph center stays inside its body parallelogram. */
function fitS09Label(el, maxDesignPx, bodyQuad) {
  if (!el || !bodyQuad || bodyQuad.length < 4) return fitArtText(el, maxDesignPx);
  const layer = el.closest(".bs-design-layer");
  if (!layer) return fitArtText(el, maxDesignPx);
  const inv = new DOMMatrix(getComputedStyle(layer).transform).inverse();
  const scene = el.closest(".bs-scene");
  const sr = scene.getBoundingClientRect();
  const poly = bodyQuad.map(([x, y]) => ({ x, y }));
  const pointIn = (pt) => {
    let inside = false;
    for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
      const xi = poly[i].x, yi = poly[i].y, xj = poly[j].x, yj = poly[j].y;
      const inter = ((yi > pt.y) !== (yj > pt.y))
        && (pt.x < ((xj - xi) * (pt.y - yi)) / ((yj - yi) || 1e-9) + xi);
      if (inter) inside = !inside;
    }
    return inside;
  };
  const glyphsInside = () => {
    const text = el.firstChild;
    if (!text || text.nodeType !== 3) {
      return el.scrollWidth <= el.clientWidth + 0.5 && el.scrollHeight <= el.clientHeight + 0.5;
    }
    for (let i = 0; i < text.length; i++) {
      if (/\s/.test(text.data[i])) continue;
      const r = document.createRange();
      r.setStart(text, i);
      r.setEnd(text, i + 1);
      const gr = r.getBoundingClientRect();
      if (gr.width < 0.5 && gr.height < 0.5) continue;
      const lx = (gr.left + gr.right) / 2 - sr.left;
      const ly = (gr.top + gr.bottom) / 2 - sr.top;
      const art = inv.transformPoint({ x: lx, y: ly });
      if (!pointIn(art)) return false;
    }
    return true;
  };
  let lo = 10, hi = Math.max(10, maxDesignPx || 36), best = 10;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    el.style.setProperty("font-size", mid + "px", "important");
    const boxOk = el.scrollWidth <= el.clientWidth + 0.5 && el.scrollHeight <= el.clientHeight + 0.5;
    if (boxOk && glyphsInside()) { best = mid; lo = mid; } else { hi = mid; }
  }
  el.style.setProperty("font-size", best + "px", "important");
  el.dataset.artFs = String(best);
  return best;
}



/** Shrink paper-panel text (discuss/resources/takeaways) until it fits. */
function fitPaperPanel(panel, startPx) {
  if (!panel) return;
  const kids = panel.querySelectorAll(".bs-dq-card, .bs-apa li, .bs-res-h, .bs-takeaways h3, .bs-takeaways li");
  const apply = (sz) => {
    const isRes = panel.classList.contains("bs-resources-panel");
    const lh = isRes ? "1.08" : "";
    kids.forEach((el) => {
      if (el.classList.contains("bs-res-h") || el.tagName === "H3") {
        el.style.setProperty("font-size", Math.max(sz * 1.12, sz) + "px", "important");
      } else {
        el.style.setProperty("font-size", sz + "px", "important");
      }
      if (lh) el.style.setProperty("line-height", lh, "important");
    });
    if (isRes) {
      const apa = panel.querySelector(".bs-apa");
      if (apa) apa.style.setProperty("row-gap", "0.18em", "important");
      panel.style.setProperty("line-height", lh, "important");
    }
  };
  const fits = () =>
    panel.scrollHeight <= panel.clientHeight + 1 && panel.scrollWidth <= panel.clientWidth + 1;
  let lo = 16;
  let hi = startPx || 34;
  apply(hi);
  if (fits()) return;
  // Binary search largest size that fits (design px).
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    apply(mid);
    if (fits()) lo = mid;
    else hi = mid;
  }
  apply(lo);
}

function ensureDesignLayer(root) {
  let layer = root.querySelector(":scope > .bs-design-layer");
  if (!layer) {
    layer = h("div", "bs-design-layer");
    root.appendChild(layer);
    const sync = () => syncDesignLayer(root, layer);
    sync();
    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(sync);
      ro.observe(root);
      layer._bsRo = ro;
    } else {
      window.addEventListener("resize", sync);
    }
  } else {
    syncDesignLayer(root, layer);
  }
  return layer;
}

/**
 * Fit text in design px inside its box. No floor, no ellipsis/line-clamp.
 * Measures layout px (pre-transform), so works inside .bs-design-layer.
 */
function fitArtText(el, maxDesignPx) {
  if (!el) return 0;
  if (el.clientHeight < 2 || el.clientWidth < 2) return 0;
  const prevDisplay = el.style.display;
  el.style.display = "block";
  el.style.whiteSpace = "normal";
  el.style.wordBreak = "normal";
  el.style.overflowWrap = "normal";
  el.style.textOverflow = "clip";
  el.style.webkitLineClamp = "unset";
  let lo = 1, hi = Math.max(1, maxDesignPx || 24), best = 1;
  for (let i = 0; i < 14; i++) {
    const mid = (lo + hi) / 2;
    el.style.setProperty("font-size", mid + "px", "important");
    const ok = el.scrollHeight <= el.clientHeight + 2
      && el.scrollWidth <= el.clientWidth + 2;
    if (ok) { best = mid; lo = mid; } else { hi = mid; }
  }
  el.style.setProperty("font-size", best + "px", "important");
  el.style.display = prevDisplay || "flex";
  el.dataset.artFs = String(best);
  return best;
}

/** Shrink idea panel title/bullets in design px until contents fit. */

/** Strip only a fully-wrapping pair of quotes; keep quotation marks inside the line. */
function stripOuterQuotes(text) {
  const s = String(text);
  if (s.length >= 2 && s.startsWith('"') && s.endsWith('"')) return s.slice(1, -1);
  return s;
}

/** Keep "(p. N)" / "(pp. N)" attached to the preceding word (no widow lines). */
function bindPageCites(text) {
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\(p\.\s+(\d+)\)/gi, "(p.&nbsp;$1)")
    .replace(/\(pp\.\s+(\d+)/gi, "(pp.&nbsp;$1")
    .replace(/(\S)\s+(\(p{1,2}\.&nbsp;)/g, "$1&nbsp;$2");
}

function fitIdeaPanel(panel) {
  if (!panel) return;
  const title = panel.querySelector(".bs-idea-title");
  const bullets = panel.querySelector(".bs-idea-bullets");
  const cite = panel.querySelector(".bs-idea-cite");
  const apply = (titleD, bulletD, citeD) => {
    if (title) title.style.setProperty("font-size", titleD + "px", "important");
    if (bullets) bullets.style.setProperty("font-size", bulletD + "px", "important");
    if (cite) cite.style.setProperty("font-size", citeD + "px", "important");
  };
  const fits = () =>
    panel.scrollHeight <= panel.clientHeight + 1
    && panel.scrollWidth <= panel.clientWidth + 1;
  apply(54, 40, 36);
  if (!fits()) {
    let lo = 0.5, hi = 1;
    for (let i = 0; i < 14; i++) {
      const mid = (lo + hi) / 2;
      apply(54 * mid, 40 * mid, 36 * mid);
      if (fits()) lo = mid;
      else hi = mid;
    }
    apply(54 * lo, 40 * lo, 36 * lo);
  }
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
  // Title block only (bg_cover / no cover_display). Marble/gear sprites were animation-only; dropped.
  const title = h("div", "bs-surface bs-surface--titleblock s01-titleblock on-art");
  const m = IDEA_MAP[1];
  applyRect(title, m.x, m.y, m.w, m.h, m.rot);
  title.innerHTML = `<div class="s01-book on-art-t">DIY Project Based Learning for Math and Science</div>
    <div class="s01-author on-art-b">Heather Wolpert-Gawron</div>
    <div class="s01-pub on-art-h">Routledge · Eye On Education · 2016</div>
    <div class="s01-byline on-art-b">Book Share by Dimitry Gordon</div>`;
  title.style.overflow = "hidden";
  ensureDesignLayer(root).appendChild(title);
  requestAnimationFrame(() => requestAnimationFrame(() => {
    const book = title.querySelector(".s01-book");
    const author = title.querySelector(".s01-author");
    const pub = title.querySelector(".s01-pub");
    const byline = title.querySelector(".s01-byline");
    const apply = (bookD, authorD, pubD, byD) => {
      if (book) book.style.setProperty("font-size", bookD + "px", "important");
      if (author) author.style.setProperty("font-size", authorD + "px", "important");
      if (pub) pub.style.setProperty("font-size", pubD + "px", "important");
      if (byline) byline.style.setProperty("font-size", byD + "px", "important");
    };
    // Panel-level binary fit only (per-glyph fitArtText was collapsing the title).
    let lo = 0.55, hi = 1;
    apply(78, 58, 40, 52);
    if (title.scrollHeight > title.clientHeight + 2) {
      for (let i = 0; i < 14; i++) {
        const mid = (lo + hi) / 2;
        apply(78 * mid, 58 * mid, 40 * mid, 52 * mid);
        if (title.scrollHeight <= title.clientHeight + 2) lo = mid;
        else hi = mid;
      }
      apply(78 * lo, 58 * lo, 40 * lo, 52 * lo);
    }
  }));
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
  const layer = ensureDesignLayer(root);
  const cards = s09Cards().filter((c) => (c.label || c.text));
  // ≥18px rendered at 1280 => ≥27 design. Each word is a layer child centered on
  // the visible cream midline at that word's own Y (slanted card edges).
  const TARGET_FS = 48;
  const MIN_FS = 27;
  cards.forEach((c, i) => {
    const label = c.label || c.text || "";
    const slot = S09_LABEL_SLOTS[label];
    if (!slot || !slot.words || !slot.words.length) return;
    const q = c.quad_xy || c.quad;
    const wrap = surface("genre", `s09-genre s09-g${i} on-art`);
    wrap.dataset.cardId = c.id || label || `g${i}`;
    wrap.dataset.label = label;
    wrap.dataset.quad = JSON.stringify(q);
    wrap.dataset.bodyQuad = JSON.stringify(q);
    wrap.dataset.rot = String(slot.rot);
    wrap.dataset.z = String(slot.z);
    if (slot.band) wrap.dataset.band = "1";
    wrap.style.position = "absolute";
    wrap.style.left = "0";
    wrap.style.top = "0";
    wrap.style.width = "0";
    wrap.style.height = "0";
    wrap.style.overflow = "visible";
    wrap.style.pointerEvents = "none";
    wrap.style.zIndex = String(10 + slot.z);
    wrap.textContent = "";
    const wordFs = [];
    slot.words.forEach((W, wi) => {
      const el = document.createElement("div");
      el.className = "s09-word on-art";
      el.dataset.label = label;
      el.dataset.word = W.word;
      el.dataset.rot = String(slot.rot);
      el.dataset.group = `s09-g${i}`;
      if (slot.band) el.dataset.band = "1";
      el.textContent = W.word;
      el.style.position = "absolute";
      el.style.left = (W.cx / 1920) * 100 + "%";
      el.style.top = (W.cy / 1080) * 100 + "%";
      el.style.width = (W.w / 1920) * 100 + "%";
      el.style.height = (W.h / 1080) * 100 + "%";
      el.style.transform = `translate(-50%, -50%) rotate(${slot.rot}deg)`;
      el.style.transformOrigin = "50% 50%";
      el.style.textAlign = "center";
      el.style.display = "flex";
      el.style.alignItems = "center";
      el.style.justifyContent = "center";
      el.style.lineHeight = "1";
      el.style.whiteSpace = "nowrap";
      el.style.padding = "0";
      el.style.boxSizing = "border-box";
      el.style.color = "#26376e";
      el.style.fontSize = TARGET_FS + "px";
      el.style.overflow = "hidden";
      el.style.pointerEvents = "none";
      el.style.zIndex = String(10 + slot.z);
      layer.appendChild(el);
      requestAnimationFrame(() => requestAnimationFrame(() => {
        let lo = slot.band ? 18 : MIN_FS;
        let hi = TARGET_FS;
        let best = lo;
        for (let step = 0; step < 16; step++) {
          const mid = (lo + hi) / 2;
          el.style.setProperty("font-size", mid + "px", "important");
          if (el.scrollWidth <= el.clientWidth + 0.5 && el.scrollHeight <= el.clientHeight + 0.5) {
            best = mid; lo = mid;
          } else {
            hi = mid;
          }
        }
        el.style.setProperty("font-size", best + "px", "important");
        el.dataset.artFs = String(best);
        wordFs[wi] = best;
        if (wordFs.filter((n) => n != null).length === slot.words.length) {
          wrap.dataset.artFs = String(Math.min(...wordFs));
        }
      }));
    });
    const cx = slot.words.reduce((s, W) => s + W.cx, 0) / slot.words.length;
    const cy = slot.words.reduce((s, W) => s + W.cy, 0) / slot.words.length;
    wrap.dataset.visCx = String(cx);
    wrap.dataset.visCy = String(cy);
    wrap.dataset.visW = String(Math.max(...slot.words.map((W) => W.w)));
    const y0 = Math.min(...slot.words.map((W) => W.cy - W.h / 2));
    const y1 = Math.max(...slot.words.map((W) => W.cy + W.h / 2));
    wrap.dataset.visH = String(y1 - y0);
    layer.appendChild(wrap);
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
  const layer = ensureDesignLayer(root);
  labels.forEach((L) => {
    const el = surface("label", `${L.cls} on-art`);
    el.textContent = L.text;
    el.style.left = (L.x / 1920) * 100 + "%";
    el.style.top = (L.y / 1080) * 100 + "%";
    el.style.transform = "rotate(-6deg)";
    layer.appendChild(el);
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
    el.style.width = (L.w / 1920) * 100 + "%";
    el.style.height = (L.h / 1080) * 100 + "%";
    el.style.transform = "translate(-50%, -50%)";
    el.style.display = "flex";
    el.style.alignItems = "center";
    el.style.justifyContent = "center";
    el.style.fontSize = "42px";
    el.style.fontWeight = "700";
    el.style.lineHeight = "1";
    el.style.color = "#26376e";
    el.style.mixBlendMode = "normal";
    el.style.overflow = "hidden";
    el.style.textAlign = "center";
    el.dataset.face = `${L.x},${L.y},${L.w},${L.h}`;
    layer.appendChild(el);
    requestAnimationFrame(() => requestAnimationFrame(() => fitArtText(el, 42)));
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
  // Leo art/keyterms/cards.json: rect_xywh, pin_xy, text_rect_xywh, max_font_px_*.
  // Cards live in the 1920 design layer so type is design-px then stage-scaled.
  const layer = ensureDesignLayer(root);
  const wall = h("div", "bs-term-wall");
  wall.style.cssText = "position:absolute;inset:0;width:100%;height:100%;";
  const layout = keytermsCards();
  const termList = (terms || []).map((x) => String(x).replace(/^"|"$/g, ""));
  layout.forEach((C, i) => {
    const term = C.term != null ? String(C.term).replace(/^"|"$/g, "") : (termList[i] || "");
    const rot = C.rotation_deg != null ? C.rotation_deg : (C.rot || 0);
    const rect = C.rect_xywh || [C.x, C.y, C.w, C.h];
    const [rx, ry, rw, rh] = rect;
    const wrap = h("div", `bs-term-card t${i} on-art`);
    applyRect(wrap, rx, ry, rw, rh, rot);
    wrap.style.overflow = "visible";
    wrap.style.boxSizing = "border-box";
    wrap.dataset.cardId = C.id || `term_${C.index != null ? C.index : i}`;

    const card = img(`${PAPER}/index_card.webp`, "bs-paper bs-term-paper");
    card.setAttribute("aria-hidden", "true");
    card.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;z-index:0;pointer-events:none;";
    wrap.appendChild(card);

    // Pin: art-space pin_xy is absolute; convert to card-local %.
    const pin = img(`${PAPER}/pushpin.webp`, "bs-paper-pin");
    pin.setAttribute("aria-hidden", "true");
    const pinSize = C.pin_size_px || (C.pin && C.pin.w) || 26;
    let pinLeftPct = 50, pinTopPct = -8;
    if (C.pin_xy) {
      pinLeftPct = ((C.pin_xy[0] - rx) / rw) * 100;
      pinTopPct = ((C.pin_xy[1] - ry) / rh) * 100;
    }
    pin.style.cssText = [
      "position:absolute",
      `left:${pinLeftPct}%`,
      `top:${pinTopPct}%`,
      `width:${(pinSize / rw) * 100}%`,
      "height:auto",
      "aspect-ratio:1",
      "transform:translate(-50%, -50%)",
      "z-index:8",
      "pointer-events:none",
    ].join(";");
    wrap.appendChild(pin);

    // Text into Leo text_rect (absolute art) mapped to card-local %.
    const text = h("div", "bs-term-text on-art-t");
    text.textContent = term;
    let tLeft = 8, tTop = 22, tW = 84, tH = 70;
    if (C.text_rect_xywh) {
      const [tx, ty, tw, th] = C.text_rect_xywh;
      tLeft = ((tx - rx) / rw) * 100;
      tTop = ((ty - ry) / rh) * 100;
      tW = (tw / rw) * 100;
      tH = (th / rh) * 100;
    }
    const maxDesk = C.max_font_px_desktop || 20;
    text.style.cssText = [
      "position:absolute",
      `left:${tLeft}%`,
      `top:${tTop}%`,
      `width:${tW}%`,
      `height:${tH}%`,
      "z-index:1",
      "display:flex",
      "align-items:center",
      "justify-content:center",
      "text-align:center",
      "line-height:1.12",
      "overflow:hidden",
      "box-sizing:border-box",
      "word-break:normal",
      "overflow-wrap:normal",
      "text-overflow:clip",
      `font-size:${maxDesk}px`,
    ].join(";");
    wrap.appendChild(text);
    wall.appendChild(wrap);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => fitArtText(text, maxDesk));
    });
  });
  layer.appendChild(wall);
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




function placeFigureCard(root, slide) {
  const fig = slide.figure;
  if (!fig || !fig.src) return;
  const layer = ensureDesignLayer(root);
  const artId = slide.art || `s${String(slide.n).padStart(2, "0")}`;
  const el = img(`${ART}${artId}/${fig.src}`, "bs-sp bs-r6-figure");
  el.alt = fig.alt || "";
  // Initial placement from data (design px); refined after decode against live stage.
  const x = fig.x ?? 1000, y = fig.y ?? 100, w = fig.w ?? 800, h = fig.h ?? 900;
  applyRect(el, x, y, w, h, fig.rot || 0);
  el.style.objectFit = "contain";
  el.style.objectPosition = "center center";
  el.style.pointerEvents = "none";
  layer.appendChild(el);
  const refine = () => {
    if (!el.naturalWidth || !el.naturalHeight) return;
    syncDesignLayer(root, layer);
    const stage = root.getBoundingClientRect();
    if (stage.width < 40 || stage.height < 40) return;
    const idea = root.querySelector(".bs-idea-panel");
    const ideaR = idea ? idea.getBoundingClientRect() : null;
    const natA = el.naturalWidth / el.naturalHeight;
    // Target: 52-55% stage width, or ~88% stage height if portrait-limited.
    let cssW = stage.width * 0.55;
    let cssH = cssW / natA;
    if (cssH > stage.height * 0.88) {
      cssH = stage.height * 0.88;
      cssW = cssH * natA;
    }
    // ≥3% gap from text column
    const minLeft = ideaR ? (ideaR.right + stage.width * 0.03) : (stage.left + stage.width * 0.40);
    let cssLeft = stage.left + stage.width - cssW - stage.width * 0.02;
    if (cssLeft < minLeft) {
      cssLeft = minLeft;
      cssW = Math.max(40, stage.left + stage.width - stage.width * 0.02 - cssLeft);
      cssH = cssW / natA;
      if (cssH > stage.height * 0.88) {
        cssH = stage.height * 0.88;
        cssW = cssH * natA;
        cssLeft = stage.left + stage.width - cssW - stage.width * 0.02;
      }
    }
    const cssTop = stage.top + (stage.height - cssH) / 2;
    // Map viewport CSS box back into design-layer pixels
    const inv = new DOMMatrix(getComputedStyle(layer).transform).inverse();
    const p0 = inv.transformPoint({ x: cssLeft - stage.left, y: cssTop - stage.top });
    const p1 = inv.transformPoint({ x: cssLeft - stage.left + cssW, y: cssTop - stage.top + cssH });
    const dx = Math.min(p0.x, p1.x), dy = Math.min(p0.y, p1.y);
    const dw = Math.abs(p1.x - p0.x), dh = Math.abs(p1.y - p0.y);
    applyRect(el, dx, dy, dw, dh, 0);
    el.style.objectFit = "contain";
  };
  if (el.complete && el.naturalWidth) {
    requestAnimationFrame(() => requestAnimationFrame(refine));
  } else {
    el.addEventListener("load", () => requestAnimationFrame(() => requestAnimationFrame(refine)), { once: true });
  }
}

function buildOnArtIdeaPanel(root, slide) {
  // Title + bullets written on cream left column (TEXT-ON-ART.md). No CSS card.
  const skip = !slide || ["title", "terms", "discuss", "resources", "conclude"].includes(slide.kind);
  if (skip || slide.onArt === false) return;
  if (!(slide.bullets && slide.bullets.length) && !slide.title) return;
  const layer = ensureDesignLayer(root);
  const m = IDEA_BY_ART[slide.art] || IDEA_MAP[slide.n] || IDEA_MAP[5] || IDEA_MAP[2];
  const panel = surface("idea", "bs-idea-panel on-art");
  if (slide.idea) panel.dataset.idea = String(slide.idea);
  applyRect(panel, m.x, m.y, m.w, m.h, m.rot);
  panel.style.overflow = "hidden";
  panel.style.boxSizing = "border-box";
  const title = h("div", "bs-idea-title on-art-t");
  title.textContent = slide.title || "";
  panel.appendChild(title);
  const bullets = (slide.bullets || []).slice(0, 5);
  if (bullets.length) {
    const ul = h("ul", "bs-idea-bullets on-art-b");
    bullets.forEach((b) => {
      const li = document.createElement("li");
      // Bind "(p. N)" to the preceding word so page cites do not widow/orphan.
      li.innerHTML = bindPageCites(stripOuterQuotes(b));
      ul.appendChild(li);
    });
    panel.appendChild(ul);
  }
  if (slide.chapter) {
    const cite = h("div", "bs-idea-cite on-art-h");
    cite.textContent = slide.chapter;
    panel.appendChild(cite);
  }
  layer.appendChild(panel);
  requestAnimationFrame(() => requestAnimationFrame(() => fitIdeaPanel(panel)));
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
  // Leo: panel opens on the article text; Narration tab shows the spoken script.
  parts.push(`<div class="bs-script bs-tabs" data-tab="article">`
    + `<div class="bs-tab-row" role="tablist">`
    + `<button type="button" class="bs-tab" role="tab" data-tab="article" aria-selected="true">Article</button>`
    + `<button type="button" class="bs-tab" role="tab" data-tab="narration" aria-selected="false">Narration</button>`
    + `</div>`
    + `<div class="bs-script-text bs-tab-article" role="tabpanel">${fx(slide.article || "")}</div>`
    + `<div class="bs-script-text bs-tab-narration" role="tabpanel" hidden>${fx(slide.narration)}</div>`
    + `</div>`);
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

    // Leo Round 7 moving pieces (loop.md). Merge pack defaults with any slide.decor.
    const pack = R6_DECOR[artId] || [];
    const slideDecor = Array.isArray(slide.decor) ? slide.decor : [];
    const decorSlide = { ...slide, art: artId, decor: slideDecor.length ? slideDecor : pack };
    placeDecor(root, decorSlide, ensureDesignLayer);
    // On-art title + bullets for teaching / exemplar slides
    buildOnArtIdeaPanel(root, slide);
    if (slide.figure) placeFigureCard(root, slide);

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
      ensureDesignLayer(root).appendChild(group);
      requestAnimationFrame(() => requestAnimationFrame(() => fitPaperPanel(panel, 34)));
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
        ensureDesignLayer(root).appendChild(group);
        requestAnimationFrame(() => requestAnimationFrame(() => fitPaperPanel(panel, 44)));
      } else {
        // sheet_flat_wide ~62% left; two-column APA; keep book spine clear (x>~1260)
        const group = h("div", "bs-paper-group");
        applyRect(group, 12, 8, 1240, 1064, 0);
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
        panel.style.cssText = "position:absolute;left:5%;top:7%;width:90%;height:86%;overflow:hidden;box-sizing:border-box;padding-top:4%;padding-bottom:4%;";
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
        ensureDesignLayer(root).appendChild(group);
        requestAnimationFrame(() => requestAnimationFrame(() => fitPaperPanel(panel, 44)));
      }
    } else if (slide.kind === "conclude") {
      if (BUILDERS.s17) BUILDERS.s17(root, T);
      const group = h("div", "bs-paper-group bs-paper-group--takeaways");
      // torn_page.webp is 924x572 (4-ring pad); height follows aspect at width 870.
      const padW = 870;
      const padH = Math.round(padW * (572 / 924)); // 539
      applyRect(group, 80, 110, padW, padH, 0);
      group.dataset.ringPitch = "0.29,0.44,0.58,0.73";
      const paper = img(`${PAPER}/torn_page.webp`, "bs-paper");
      paper.setAttribute("aria-hidden", "true");
      paper.style.cssText = "position:absolute;inset:0;width:100%;height:100%;object-fit:fill;";
      group.appendChild(paper);
      const tape = img(`${PAPER}/tape_a.webp`, "bs-paper-tape");
      tape.setAttribute("aria-hidden", "true");
      tape.style.cssText = "position:absolute;left:40%;top:-2%;width:26%;height:12%;object-fit:fill;transform:rotate(-5deg);z-index:8;";
      group.appendChild(tape);
      const box = surface("takeaways", "bs-takeaways bs-reveal on-art");
      // Full pad height so row tops can sit on ring pitch percents.
      box.style.cssText = "position:absolute;left:18%;top:0;width:74%;height:100%;overflow:visible;box-sizing:border-box;";
      const items = (slide.bullets || []).map((b) => fx(String(b).replace(/^\d+\.\s*/, "")));
      box.innerHTML = `<h3 class="on-art-t">Takeaways</h3><ol class="on-art-b bs-takeaways-ol">${items.map((b) => `<li>${b}</li>`).join("")}</ol>`;
      group.appendChild(box);
      ensureDesignLayer(root).appendChild(group);
      requestAnimationFrame(() => requestAnimationFrame(() => fitPaperPanel(box, 34)));
    } else if (BUILDERS[artId]) {
      BUILDERS[artId](root, T);
    }
    return { hold_after: slide.hold_after || 0 };
  },
}));

export const PAGE_COUNT = PAGES.length;
export { startDecorMotions, cancelDecorMotions, placeDecor };
