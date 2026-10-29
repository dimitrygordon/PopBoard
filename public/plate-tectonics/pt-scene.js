// Plate Tectonics view: a 2D canvas with a map strip (top view) over an inked cross-section.
// Art from art/*.webp (Tesla-cleared). Terracotta is the one accent. The sinking slab is plain
// gray cold rock: no glow, no blur, no additive blending anywhere near it.
import { outcome as modelOutcome, PIECES, FOSSILS, MAX_RATE } from "./pt-model.js";

export const ART = ["tex-continental-crust", "tex-oceanic-crust", "tex-mantle", "mid-ocean-ridge", "trench", "volcano", "eruption-plume", "lava-glow", "quake-burst", "mountains-fold", "slab-cross-section"];
export const FX_MS = { plume: 900, quake: 700 };

export function loadArt(base = "plate-tectonics/art/") {
  const imgs = {};
  return Promise.all(ART.map((n) => new Promise((res) => { const i = new Image(); i.onload = i.onerror = () => res(); i.src = base + n + ".webp"; imgs[n] = i; }))).then(() => imgs);
}

export function createScene(canvas, imgs) {
  const ctx = canvas.getContext("2d");
  let dpr = 1, box = { x: 0, y: 0, w: 300, h: 300 }, pal = {}, pats = {}, geo = null;
  const tile = (img, size) => { const c = document.createElement("canvas"); c.width = c.height = size; const g = c.getContext("2d"); g.imageSmoothingQuality = "high"; if (img.naturalWidth) g.drawImage(img, 0, 0, size, size); return c; };
  function makePatterns() {
    for (const [k, n, s] of [["cont", "tex-continental-crust", 220], ["ocean", "tex-oceanic-crust", 200], ["mantle", "tex-mantle", 320]]) pats[k] = ctx.createPattern(tile(imgs[n], Math.round(s * dpr)), "repeat");
  }
  function resize() {
    dpr = Math.min(2, devicePixelRatio || 1);
    canvas.width = Math.round(canvas.clientWidth * dpr); canvas.height = Math.round(canvas.clientHeight * dpr);
    makePatterns();
  }
  const fill = (pat) => { const m = new DOMMatrix().scale(1 / dpr); pat.setTransform?.(m); return pat; };
  function sprite(name, cx, bottom, w, { alpha = 1, flip = false, anchor = 1 } = {}) {
    const img = imgs[name]; if (!img || !img.naturalWidth || w <= 1) return null;
    const h = w * img.naturalHeight / img.naturalWidth;
    ctx.save(); ctx.globalAlpha *= alpha; ctx.translate(cx, bottom - h * anchor); if (flip) { ctx.translate(w / 2, 0); ctx.scale(-1, 1); ctx.translate(-w / 2, 0); }
    ctx.drawImage(img, flip ? 0 : -w / 2, 0, w, h); ctx.restore();
    return { x: cx - w / 2, y: bottom - h * anchor, w, h };
  }
  function rect(x0, x1, y0, y1, style) { if (x1 <= x0) return; ctx.fillStyle = style; ctx.fillRect(x0, y0, x1 - x0, y1 - y0); ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; ctx.strokeRect(x0, y0, x1 - x0, y1 - y0); }
  function label(text, x, y, align = "left", color = pal.dim) { ctx.font = "600 12px system-ui, sans-serif"; ctx.textAlign = align; ctx.fillStyle = color; ctx.fillText(text, x, y); }

  // ---------- geometry ----------
  function layout() {
    const { x, y, w, h } = box;
    const mapH = Math.round(Math.min(130, h * 0.24)), top = y + mapH + 18, xsH = h - mapH - 18;
    const seaY = top + xsH * 0.3;
    return { x, y, w, h, mapH, top, xsH, cx: x + w / 2, kmPx: w / 3000, seaY,
      cont: [seaY - xsH * 0.07, seaY + xsH * 0.2], ocean: [seaY + xsH * 0.09, seaY + xsH * 0.16], bottom: y + h };
  }

  // ---------- frame ----------
  function draw(st, now, fx, drag) {
    const o = modelOutcome(st), g = layout(); geo = g;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (fx.shake && !fx.reduced) { const k = Math.max(0, 1 - (now - fx.shake) / 400) * 4; ctx.translate((Math.random() - 0.5) * k, (Math.random() - 0.5) * k); }
    const dx = drag?.dx || 0, dy = drag?.dy || 0;
    drawMap(st, o, g, dx, dy);
    const anchors = drawSection(st, o, g, now, fx, dx);
    return { o, anchors };
  }
  function crustBand(type, g) { return type === "continental" ? g.cont : g.ocean; }
  function plateRect(type, x0, x1, g) { const [a, b] = crustBand(type, g); rect(x0, x1, a, b, fill(type === "continental" ? pats.cont : pats.ocean)); }

  function drawMap(st, o, g, dx, dy) {
    const y0 = g.y, y1 = g.y + g.mapH, half = Math.min(g.w * 0.3, (o.openKm * g.kmPx) / 2) - Math.min(g.w * 0.06, o.shortenKm * g.kmPx * 0.02);
    ctx.save(); ctx.beginPath(); ctx.rect(g.x, y0, g.w, g.mapH); ctx.clip();
    const lx = g.cx - Math.max(0, half), rx = g.cx + Math.max(0, half) + dx;
    rect(g.x, lx, y0, y1, fill(st.left === "continental" ? pats.cont : pats.ocean));
    if (half > 0) rect(lx, rx, y0, y1, fill(pats.ocean));
    rect(rx, g.x + g.w + 40, y0, y1, fill(st.right === "continental" ? pats.cont : pats.ocean));
    // A straight road drawn across both plates shows sideways slip.
    const slipPx = ((st.vy >= 0 ? 1 : -1) * o.slipKm * g.kmPx * 0.6 + dy) % (g.mapH * 0.8);
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 2.5; ctx.setLineDash([7, 5]);
    ctx.beginPath(); ctx.moveTo(g.x, y0 + g.mapH / 2); ctx.lineTo(lx, y0 + g.mapH / 2); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(rx, y0 + g.mapH / 2 + slipPx); ctx.lineTo(g.x + g.w, y0 + g.mapH / 2 + slipPx); ctx.stroke(); ctx.setLineDash([]);
    // Velocity arrow on the right plate (the accent).
    const ax = (rx + g.x + g.w) / 2, ay = y0 + g.mapH / 2, k = Math.min(g.w * 0.14, g.mapH * 0.9) / MAX_RATE;
    const ex = ax + st.vx * k, ey = ay + st.vy * k;
    if (Math.hypot(st.vx, st.vy) > 0.3) {
      ctx.strokeStyle = pal.accent; ctx.fillStyle = pal.accent; ctx.lineWidth = 4; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey); ctx.stroke();
      const an = Math.atan2(ey - ay, ex - ax); ctx.beginPath(); ctx.moveTo(ex + Math.cos(an) * 8, ey + Math.sin(an) * 8);
      ctx.lineTo(ex + Math.cos(an + 2.4) * 10, ey + Math.sin(an + 2.4) * 10); ctx.lineTo(ex + Math.cos(an - 2.4) * 10, ey + Math.sin(an - 2.4) * 10); ctx.fill();
    }
    ctx.beginPath(); ctx.arc(ax, ay, 7, 0, Math.PI * 2); ctx.fillStyle = pal.handle; ctx.fill(); ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; ctx.strokeRect(g.x, y0, g.w, g.mapH);
    label("Top view", g.x + 8, y0 + 16, "left", pal.ink);
  }

  function drawSection(st, o, g, now, fx, dx) {
    const anchors = {};
    ctx.save(); ctx.beginPath(); ctx.rect(g.x, g.top, g.w, g.bottom - g.top); ctx.clip();
    // Mantle: solid rock (textured, never drawn as liquid) with slow flow chevrons.
    rect(g.x, g.x + g.w, Math.min(g.ocean[1], g.cont[1]) - 1, g.bottom + 2, fill(pats.mantle));
    ctx.fillStyle = pal.sky; ctx.fillRect(g.x, g.top, g.w, g.cont[0] - g.top + 1);
    const flow = fx.reduced ? 0 : (now / 1000) * 6;
    ctx.strokeStyle = pal.flow; ctx.lineWidth = 1.5;
    for (let i = 0; i < 10; i++) {
      const yy = g.cont[1] + (g.bottom - g.cont[1]) * (0.35 + 0.4 * (i % 2)), dir = i % 2 ? -1 : 1;
      const xx = g.x + ((i * g.w / 5 + dir * flow) % g.w + g.w) % g.w;
      ctx.beginPath(); ctx.moveTo(xx - 6 * dir, yy - 5); ctx.lineTo(xx, yy); ctx.lineTo(xx - 6 * dir, yy + 5); ctx.stroke();
    }
    // Plates.
    const half = o.type === "divergent" ? Math.min(g.w * 0.32, (o.openKm * g.kmPx) / 2) : 0;
    const lx = g.cx - half, rx = g.cx + half + dx;
    const water = (x0, x1, type) => { if (type === "oceanic" && x1 > x0) { ctx.fillStyle = pal.sea; ctx.fillRect(x0, g.seaY, x1 - x0, g.ocean[0] - g.seaY); } };
    water(g.x, lx, st.left); water(rx, g.x + g.w, st.right);
    plateRect(st.left, g.x - 2, lx, g); plateRect(st.right, rx, g.x + g.w + 2, g);
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(g.x, g.seaY); ctx.lineTo(g.x + g.w, g.seaY); ctx.stroke();
    if (o.type === "divergent" && half > 0.5) {
      if (o.feature === "rift") {
        const vy = g.cont[0] + (g.cont[1] - g.cont[0]) * 0.35;
        rect(lx, rx, vy, g.cont[1], fill(pats.cont)); anchors.rift = { x: g.cx + dx / 2, y: vy - 10 };
      } else {
        water(lx, rx, "oceanic"); rect(lx, rx, g.ocean[0], g.ocean[1], fill(pats.ocean));
        if (st.hotspot) { ctx.fillStyle = pal.plume; ctx.fillRect(g.cx - 14, g.ocean[1], 28, g.bottom - g.ocean[1]); }
        const rw = Math.min(g.w * 0.34, 260), b = sprite("mid-ocean-ridge", g.cx + dx / 2, g.ocean[1] + rw * 0.05, rw);
        if (o.islandKm > 0) { const iw = Math.min(g.w * 0.22, 170) * (0.5 + 0.5 * o.islandKm / 2.1); sprite("volcano", g.cx + dx / 2, g.seaY + iw * 0.08, iw); }
        if (b) anchors.ridge = { x: g.cx + dx / 2, y: (o.islandKm > 0 ? g.seaY - Math.min(g.w * 0.22, 170) * 0.62 : b.y) - 6 };
      }
    } else if (o.type === "convergent" && o.shortenKm > 0) {
      if (o.feature === "mountains") {
        const frac = o.mountainKm / 8.8, hgt = (g.cont[0] - g.top - 6) * frac + (g.cont[1] - g.cont[0]) * 0.5, w = Math.min(g.w * 0.62, hgt * 1226 / 579);
        const b = sprite("mountains-fold", g.cx + dx * 0.5, g.cont[0] + (g.cont[1] - g.cont[0]) * 0.5, w);
        if (b) anchors.mountains = { x: g.cx, y: b.y - 6 };
      } else {
        const flip = o.subducting === "right", tw = Math.min(g.w * 0.62, 470);
        sprite("trench", g.cx + dx * 0.5, g.ocean[1] + tw * 0.32, tw, { alpha: Math.min(1, o.shortenKm / 80), flip });
        const over = flip ? st.left : st.right, vxPos = g.cx + (flip ? -1 : 1) * tw * 0.3;
        const top = over === "continental" ? g.cont[0] : g.seaY;
        if (o.volcano) {
          const vw = Math.min(g.w * 0.2, 150), v = sprite("volcano", vxPos, top + vw * 0.06, vw);
          if (v) { anchors.volcano = { x: vxPos, y: v.y - 6 }; anchors.crater = { x: vxPos, y: v.y + v.h * 0.06 }; }
        }
        anchors.trench = { x: g.cx + (flip ? 1 : -1) * tw * 0.12, y: g.ocean[0] - 8 };
      }
    }
    // Short particle puffs: eruption ash and quake rings.
    for (const p of fx.puffs) {
      const a = (now - p.t) / FX_MS[p.kind]; if (a >= 1) continue;
      if (p.kind === "plume" && anchors.crater) sprite("eruption-plume", anchors.crater.x, anchors.crater.y - a * 30, 60 + a * 30, { alpha: (1 - a) * 0.95 });
      if (p.kind === "plume" && anchors.crater && a < 0.6) sprite("lava-glow", anchors.crater.x, anchors.crater.y + 8, 44, { alpha: 0.9 * (1 - a / 0.6) });
      if (p.kind === "quake") sprite("quake-burst", g.cx, g.cont[0] + 40, 90 + a * 40, { alpha: 1 - a });
    }
    if (o.type === "transform") { ctx.strokeStyle = pal.ink; ctx.setLineDash([5, 4]); ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(g.cx, g.top); ctx.lineTo(g.cx, g.cont[1] + 20); ctx.stroke(); ctx.setLineDash([]); anchors.fault = { x: g.cx, y: g.cont[0] - 10 }; }
    ctx.restore();
    // Layer labels (crust types and the mantle).
    label(st.left === "continental" ? "Continental crust" : "Oceanic crust", g.x + 8, crustBand(st.left, g)[1] - 6, "left", pal.inkOn);
    label(st.right === "continental" ? "Continental crust" : "Oceanic crust", g.x + g.w - 8, crustBand(st.right, g)[1] - 6, "right", pal.inkOn);
    ctx.strokeStyle = pal.ink; ctx.lineWidth = 1.5; ctx.strokeRect(g.x, g.top, g.w, g.bottom - g.top);
    anchors.mantle = { x: g.x + 8, y: g.bottom - 10 };
    return anchors;
  }

  // ---------- fossil match ----------
  function puzzleGeo() { const s = Math.min(box.w / 150, box.h / 110), ox = box.x + (box.w - 130 * s) / 2, oy = box.y + (box.h - 100 * s) / 2; return { s, ox, oy }; }
  function drawPuzzle(off, fit) {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.clearRect(0, 0, canvas.width, canvas.height);
    const { s, ox, oy } = puzzleGeo();
    const piece = (pc, dx, dy, pat) => {
      const path = new Path2D(); pc.outline.forEach(([px, py], i) => (i ? path.lineTo : path.moveTo).call(path, ox + (px + dx) * s, oy + (py + dy) * s)); path.closePath();
      ctx.fillStyle = fill(pat); ctx.fill(path);
      ctx.save(); ctx.clip(path);
      FOSSILS.forEach((f, i) => { ctx.fillStyle = pal.fossil[i]; ctx.fillRect(box.x, oy + (f.y0 + dy) * s, box.w, (f.y1 - f.y0) * s); });
      ctx.restore();
      ctx.strokeStyle = pal.ink; ctx.lineWidth = 2; ctx.stroke(path);
      const c = pc.outline.reduce((a, [px, py]) => [a[0] + px, a[1] + py], [0, 0]).map((v) => v / pc.outline.length);
      ctx.font = "700 14px system-ui, sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = pal.inkOn; ctx.fillText(pc.name, ox + (c[0] + dx) * s, oy + (14 + dy) * s);
    };
    piece(PIECES.west, 0, 0, pats.cont); piece(PIECES.east, off.x, off.y, pats.cont);
    FOSSILS.forEach((f, i) => label(f.name, ox + 2 * s, oy + (f.y0 + f.y1) / 2 * s + 4, "left", pal.inkOn));
    if (fit) { ctx.strokeStyle = pal.accent; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(ox + 52 * s, oy + 4 * s); ctx.lineTo(ox + 57 * s, oy + 96 * s); ctx.stroke(); }
  }
  const puzzleToUnits = (px, py) => { const { s, ox, oy } = puzzleGeo(); return { x: (px - ox) / s, y: (py - oy) / s }; };

  return {
    resize, draw, drawPuzzle, puzzleToUnits,
    setBox(b) { box = b; }, get box() { return box; }, get geo() { return geo || layout(); },
    setPalette(p) { pal = p; },
    // Is a canvas point on the draggable right plate (either view)?
    hitRight(px, py) { const g = geo || layout(); return px > g.cx - 10 && px < g.x + g.w && py > g.y && py < g.bottom; }
  };
}
