// Orbital Mechanics & Gravity Playground: renderer.
// Art by Leo (public/orbits/assets/, recipes from the pack README).
// Bodies are 256px WebP (planets/), FX stay PNG (fx/).
// Layer order per frame: far tile, near tile (lighter), trails + ghost,
// glows (lighter), bodies (planets source-over, stars lighter), FX, then
// the DOM HUD. Colors and trail numbers come from tokens.css via --ob-*.
// Sprites are pre-scaled into an offscreen cache per size bucket; no shadowBlur.

const ASSET = "orbits/assets/";
const PLANETS = ["planet_rocky_rust", "planet_teal_ocean", "planet_ice", "planet_lava", "planet_desert", "planet_pale_moon"];
const GIANTS = ["planet_gas_giant_banded", "planet_ringed_giant"];
const IMAGES = [
  ...PLANETS.map((n) => "planets/" + n), ...GIANTS.map((n) => "planets/" + n),
  "planets/star_yellow", "planets/star_red_dwarf", "planets/star_blue_giant", "planets/white_dwarf",
  "fx/glow_gold", "fx/glow_red", "fx/glow_blue", "fx/glow_white_soft", "fx/lagrange_marker",
  "fx/collision_flash", "fx/collision_shockring", "fx/debris_1", "fx/debris_2", "fx/debris_3", "fx/debris_4",
  "fx/ember", "fx/starfield_far_tile", "fx/starfield_near_tile", "fx/trail_dot"
];

export function readTokens(root) {
  const cs = getComputedStyle(root || document.documentElement);
  const v = (n, d) => (cs.getPropertyValue(n).trim() || d);
  return {
    voidTop: v("--ob-void-top", "#14123a"), voidMid: v("--ob-void-mid", "#0b0a22"), voidBottom: v("--ob-void-bottom", "#030308"),
    trailRgb: v("--ob-trail-color", "246, 213, 142"),
    trailWidth: parseFloat(v("--ob-trail-width", "1.25")) || 1.25,
    trailHead: parseFloat(v("--ob-trail-alpha-head", "0.85")) || 0.85,
    trailLength: parseInt(v("--ob-trail-length", "240"), 10) || 240,
    ghostDash: v("--ob-ghost-dash", "1 6").split(/\s+/).map(Number),
    ghostAlpha: parseFloat(v("--ob-ghost-alpha", "0.55")) || 0.55,
    goldRgb: v("--ob-gold-rgb", "226, 179, 92"),
    gold: v("--ob-gold-300", "#f6d58e"),
    arrow: v("--ob-gold-300", "#f6d58e"),
    arrowWidth: parseFloat(v("--ob-velocity-width", "1.5")) || 1.5,
    select: v("--ob-gold-100", "#fff1d0"),
    lagrange: v("--ob-stable", "#9fe3c4"),
    danger: v("--ob-danger", "#ff7a4a"),
    mono: v("--orb-mono", "monospace")
  };
}

// Pixel radius a body is drawn at. Real radii are tiny, so this floors them.
export function drawRadius(body, scale) {
  const min = body.kind === "star" ? 14 : 6;
  const extra = body.kind === "star" ? 0 : Math.min(8, Math.cbrt(body.m * 1e6));
  return Math.max(min + extra, body.r * scale);
}

function hash(id) {
  let h = 0; const s = String(id);
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

// Which sprite a body wears. Exported for tests and for Leo to retune.
export function spriteFor(body) {
  if (body.kind === "star") {
    if (body.m >= 1.5) return { img: "planets/star_blue_giant", glow: "fx/glow_blue", size: 2.5 };
    if (body.m < 0.3) return { img: "planets/star_red_dwarf", glow: "fx/glow_red", size: 2.5 };
    return { img: "planets/star_yellow", glow: "fx/glow_gold", size: 2.5 };
  }
  const h = hash(body.id);
  if (body.m >= 5e-4) {
    const n = GIANTS[h % 2];
    return { img: "planets/" + n, size: n === "planet_ringed_giant" ? 4 : 2 };
  }
  return { img: "planets/" + PLANETS[h % PLANETS.length], size: 2 };
}

export function createRenderer(canvas, opts = {}) {
  const ctx = canvas.getContext("2d");
  const reducedMotion = !!opts.reducedMotion;
  let tokens = readTokens();
  const img = {};
  for (const k of IMAGES) { const i = new Image(); i.decoding = "async"; i.src = ASSET + k + (k.startsWith("planets/") ? ".webp" : ".png"); img[k] = i; }
  const ready = (k) => img[k] && img[k].complete && img[k].naturalWidth > 0;
  const cache = new Map();
  let patterns = null, bg = null, dprNow = 1;
  const fx = [];

  // Pre-scaled sprite, bucketed to 4 css px.
  function sprite(key, cssSize) {
    if (!ready(key)) return null;
    const bucket = Math.max(4, Math.ceil(cssSize / 4) * 4);
    const ck = key + "@" + bucket + "x" + dprNow;
    let c = cache.get(ck);
    if (!c) {
      const px = Math.ceil(bucket * dprNow);
      c = document.createElement("canvas"); c.width = c.height = px;
      const g = c.getContext("2d"); g.imageSmoothingQuality = "high";
      g.drawImage(img[key], 0, 0, px, px);
      c.css = bucket;
      if (cache.size > 400) cache.clear();
      cache.set(ck, c);
    }
    return c;
  }
  function blit(key, x, y, size, alpha = 1, rot = 0) {
    const c = sprite(key, size);
    if (!c) return false;
    ctx.globalAlpha = alpha;
    if (rot) { ctx.save(); ctx.translate(x, y); ctx.rotate(rot); ctx.drawImage(c, -size / 2, -size / 2, size, size); ctx.restore(); }
    else ctx.drawImage(c, x - size / 2, y - size / 2, size, size);
    ctx.globalAlpha = 1;
    return true;
  }

  function refreshTokens() { tokens = readTokens(); cache.clear(); patterns = null; bg = null; }

  function draw(view) {
    const { w, h, dpr, cam } = view;
    dprNow = dpr;
    const t = reducedMotion ? 0 : (view.time || 0);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.globalCompositeOperation = "source-over";
    const toX = (x) => (x - cam.x) * cam.scale + w / 2;
    const toY = (y) => -(y - cam.y) * cam.scale + h / 2;

    drawBackground(w, h, cam);
    if (view.trails) drawTrails(view.trails, toX, toY, dpr);
    if (view.ghost) drawGhost(view.ghost, toX, toY, dpr);
    // Glows, additive.
    ctx.globalCompositeOperation = "lighter";
    const breathe = reducedMotion ? 0.9 : 0.9 + 0.1 * Math.sin(t * 1.3);
    for (const b of view.bodies) {
      if (b.kind !== "star") continue;
      const r = drawRadius(b, cam.scale), s = spriteFor(b);
      blit(s.glow, toX(b.x), toY(b.y), r * 7 * Math.cbrt(Math.max(b.m, 0.05)) , breathe);
    }
    if (view.lagrange) drawLagrange(view.lagrange, toX, toY, t);
    ctx.globalCompositeOperation = "source-over";
    for (const b of view.bodies) drawBody(b, toX(b.x), toY(b.y), drawRadius(b, cam.scale), b.id === view.selectedId, t);
    if (view.sling) drawSling(view.sling, toX, toY, cam);
    if (view.escape) drawEscape(view.escape, toX, toY);
    drawFx(view.now || performance.now(), toX, toY);
    ctx.globalCompositeOperation = "source-over";
  }

  // Far tile + near tile (lighter) + vignette, composed once into a CSS-pixel
  // cache and re-composed only when the parallax offset moves a whole pixel.
  function drawBackground(w, h, cam) {
    if (!patterns && ready("fx/starfield_far_tile") && ready("fx/starfield_near_tile")) {
      patterns = { far: ctx.createPattern(img["fx/starfield_far_tile"], "repeat"), near: ctx.createPattern(img["fx/starfield_near_tile"], "repeat") };
      bg = null;
    }
    const key = patterns ? [w, h, Math.round(cam.x * cam.scale * 0.05), Math.round(cam.y * cam.scale * 0.05)].join() : "plain" + w + "x" + h;
    if (!bg || bg.key !== key) {
      bg = bg || document.createElement("canvas");
      bg.width = w; bg.height = h; bg.key = key;
      const g = bg.getContext("2d");
      if (patterns) {
        for (const [pat, f, op] of [[patterns.far, 0.05, "source-over"], [patterns.near, 0.15, "lighter"]]) {
          const ox = ((-cam.x * cam.scale * f) % 1024 + 1024) % 1024;
          const oy = ((cam.y * cam.scale * f) % 1024 + 1024) % 1024;
          pat.setTransform(new DOMMatrix([1, 0, 0, 1, ox, oy]));
          g.globalCompositeOperation = op; g.fillStyle = pat; g.fillRect(0, 0, w, h);
        }
        g.globalCompositeOperation = "source-over";
      } else { g.fillStyle = tokens.voidMid; g.fillRect(0, 0, w, h); }
      const vg = g.createRadialGradient(w / 2, h * 0.35, 0, w / 2, h * 0.35, Math.max(w, h) * 0.95);
      vg.addColorStop(0, hexA(tokens.voidTop, 0.35)); vg.addColorStop(0.45, hexA(tokens.voidMid, 0.25)); vg.addColorStop(1, hexA(tokens.voidBottom, 0.85));
      g.fillStyle = vg; g.fillRect(0, 0, w, h);
    }
    ctx.drawImage(bg, 0, 0, w, h);
  }

  // Fading trail: alpha head*(i/n)^1.6, batched into bands so one path per band.
  function drawTrails(trails, toX, toY, dpr) {
    const BANDS = 10;
    ctx.lineCap = "round"; ctx.lineJoin = "round";
    ctx.lineWidth = tokens.trailWidth * Math.min(dpr, 2) / dpr * 1.2;
    for (const pts of trails) {
      const total = pts.length / 2;
      const n = Math.min(total, tokens.trailLength);
      if (n < 2) continue;
      const start = total - n;
      for (let band = 0; band < BANDS; band++) {
        const i0 = Math.floor((band * (n - 1)) / BANDS), i1 = Math.floor(((band + 1) * (n - 1)) / BANDS);
        if (i1 <= i0) continue;
        const a = tokens.trailHead * Math.pow((i1 / (n - 1)), 1.6);
        ctx.strokeStyle = `rgba(${tokens.trailRgb}, ${a.toFixed(3)})`;
        ctx.beginPath();
        let k = (start + i0) * 2;
        ctx.moveTo(toX(pts[k]), toY(pts[k + 1]));
        for (let i = i0 + 1; i <= i1; i++) { k = (start + i) * 2; ctx.lineTo(toX(pts[k]), toY(pts[k + 1])); }
        ctx.stroke();
      }
    }
  }

  // Ghost: dotted (1 6), round caps, fading toward the end.
  function drawGhost(ghost, toX, toY) {
    ctx.save();
    ctx.setLineDash(tokens.ghostDash); ctx.lineCap = "round"; ctx.lineWidth = 2;
    const BANDS = 6;
    for (const pts of ghost.paths) {
      const n = pts.length / 2;
      if (n < 2) continue;
      for (let band = 0; band < BANDS; band++) {
        const i0 = Math.floor((band * (n - 1)) / BANDS), i1 = Math.floor(((band + 1) * (n - 1)) / BANDS);
        if (i1 <= i0) continue;
        ctx.strokeStyle = `rgba(${tokens.trailRgb}, ${(tokens.ghostAlpha * (1 - band / BANDS)).toFixed(3)})`;
        ctx.beginPath(); ctx.moveTo(toX(pts[i0 * 2]), toY(pts[i0 * 2 + 1]));
        for (let i = i0 + 1; i <= i1; i++) ctx.lineTo(toX(pts[i * 2]), toY(pts[i * 2 + 1]));
        ctx.stroke();
      }
    }
    ctx.restore();
    if (ghost.end) {
      const x = toX(ghost.end.x), y = toY(ghost.end.y);
      ctx.strokeStyle = tokens.danger; ctx.lineWidth = 1.5; ctx.lineCap = "round";
      ctx.beginPath(); ctx.moveTo(x - 5, y - 5); ctx.lineTo(x + 5, y + 5); ctx.moveTo(x + 5, y - 5); ctx.lineTo(x - 5, y + 5); ctx.stroke();
    }
  }

  // Lagrange markers: pulse scale 0.85..1.15 and alpha 0.45..1 over 2.6 s.
  function drawLagrange(points, toX, toY, t) {
    const ph = reducedMotion ? 0.5 : 0.5 - 0.5 * Math.cos((t / 2.6) * Math.PI * 2);
    const size = 30 * (0.85 + 0.3 * ph), alpha = 0.45 + 0.55 * ph;
    for (const [k, p] of Object.entries(points)) {
      const x = toX(p.x), y = toY(p.y);
      if (!blit("fx/lagrange_marker", x, y, size, alpha, reducedMotion ? 0 : ph * Math.PI / 4)) {
        ctx.strokeStyle = tokens.lagrange; ctx.beginPath(); ctx.moveTo(x - 7, y); ctx.lineTo(x + 7, y); ctx.moveTo(x, y - 7); ctx.lineTo(x, y + 7); ctx.stroke();
      }
      ctx.globalCompositeOperation = "source-over";
      ctx.font = `600 11px ${tokens.mono}`; ctx.textAlign = "left"; ctx.textBaseline = "middle";
      ctx.fillStyle = tokens.lagrange; ctx.fillText(k, x + 12, y - 12);
      ctx.globalCompositeOperation = "lighter";
    }
  }

  function drawBody(b, x, y, r, selected, t) {
    const s = spriteFor(b);
    if (b.kind === "star") {
      ctx.globalCompositeOperation = "lighter";
      if (!blit(s.img, x, y, r * 2 * s.size)) { ctx.fillStyle = "#fff1d0"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
      ctx.globalCompositeOperation = "source-over";
    } else {
      // Light is baked from the upper left: wobble a few degrees, never spin.
      const wob = reducedMotion ? 0 : Math.sin(t * 0.7 + (hash(b.id) % 628) / 100) * 0.07;
      if (!blit(s.img, x, y, r * 2 * s.size, 1, wob)) { ctx.fillStyle = "#8fb3ff"; ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }
    }
    if (selected) {
      ctx.strokeStyle = `rgba(${tokens.goldRgb}, 0.9)`; ctx.lineWidth = 1.25;
      ctx.setLineDash([2, 5]); ctx.lineCap = "round";
      ctx.beginPath(); ctx.arc(x, y, r + 7, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
    }
  }

  // Slingshot: gold line body -> finger, open chevron on the launch side, glow at the tip.
  function drawSling(s, toX, toY) {
    const ax = toX(s.x), ay = toY(s.y), px = s.px, py = s.py;
    ctx.strokeStyle = `rgba(${tokens.goldRgb}, 0.45)`; ctx.lineWidth = tokens.arrowWidth; ctx.lineCap = "round";
    ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(px, py); ctx.stroke();
    const dx = ax - px, dy = ay - py, L = Math.hypot(dx, dy);
    if (L > 4) {
      const ex = ax + dx * 0.6, ey = ay + dy * 0.6, ux = dx / L, uy = dy / L;
      ctx.strokeStyle = tokens.arrow; ctx.lineWidth = tokens.arrowWidth;
      ctx.beginPath(); ctx.moveTo(ax, ay); ctx.lineTo(ex, ey);
      ctx.moveTo(ex - 9 * ux + 6 * uy, ey - 9 * uy - 6 * ux); ctx.lineTo(ex, ey); ctx.lineTo(ex - 9 * ux - 6 * uy, ey - 9 * uy + 6 * ux);
      ctx.stroke();
      ctx.globalCompositeOperation = "lighter"; blit("fx/glow_gold", ex, ey, 46, 0.7); ctx.globalCompositeOperation = "source-over";
    }
    drawBody({ id: s.id || "new", kind: s.kind, m: s.m, r: 0 }, ax, ay, s.kind === "star" ? 14 : 7, false, 0);
  }

  function drawEscape(e, toX, toY) {
    const x = toX(e.x), y = toY(e.y);
    ctx.strokeStyle = tokens.danger; ctx.lineWidth = 1.25; ctx.setLineDash([1, 5]); ctx.lineCap = "round";
    ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  // Collision FX in world coords: flash, shock ring, debris, embers.
  function burst(x, y, kind = "merge") {
    const now = performance.now();
    if (reducedMotion) { fx.push({ type: "flash", x, y, t0: now, life: 250, s0: 0.8, s1: 0.8 }); return; }
    fx.push({ type: "flash", x, y, t0: now, life: 600, s0: 0.2, s1: 1.8 });
    fx.push({ type: "ring", x, y, t0: now, life: 500, s0: 0.3, s1: 2 });
    if (kind === "ejected") return;
    const n = 8 + Math.floor(Math.random() * 9);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, sp = 60 + Math.random() * 140;
      fx.push({ type: Math.random() < 0.6 ? "debris" : "ember", key: "fx/debris_" + (1 + (i % 4)), x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp, rot: Math.random() * 6, spin: (Math.random() - 0.5) * 8, t0: now, life: 600 + Math.random() * 600 });
    }
  }

  function drawFx(now, toX, toY) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i], k = (now - f.t0) / f.life;
      if (k >= 1) { fx.splice(i, 1); continue; }
      const x = toX(f.x), y = toY(f.y);
      if (f.type === "flash" || f.type === "ring") {
        ctx.globalCompositeOperation = "lighter";
        const sz = 90 * (f.s0 + (f.s1 - f.s0) * k);
        blit(f.type === "flash" ? "fx/collision_flash" : "fx/collision_shockring", x, y, sz, 1 - k);
      } else {
        const sec = (now - f.t0) / 1000;
        ctx.globalCompositeOperation = f.type === "ember" ? "lighter" : "source-over";
        blit(f.type === "ember" ? "fx/ember" : f.key, x + f.vx * sec, y + f.vy * sec, f.type === "ember" ? 10 : 12, 1 - k, f.rot + f.spin * sec);
      }
    }
    ctx.globalCompositeOperation = "source-over";
  }

  return { draw, refreshTokens, drawRadius, burst, get fxCount() { return fx.length; } };
}

function hexA(hex, a) {
  const m = /^#([0-9a-f]{6})$/i.exec(hex);
  if (!m) return `rgba(0,0,0,${a})`;
  const n = parseInt(m[1], 16);
  return `rgba(${n >> 16}, ${(n >> 8) & 255}, ${n & 255}, ${a})`;
}
