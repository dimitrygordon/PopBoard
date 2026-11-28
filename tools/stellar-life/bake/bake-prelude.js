// Bake harness for Leo's style B scenes (injected into a COPY of ui/styleb.html and ui/styleb2.html by patch_bake.py).
// The scene code is untouched: it still runs in its own 1920 x 1080 virtual pixel space with the same seeded RNG, so the
// layout is Leo's frame exactly. Only the sink changes: a transform scales virtual px to texture px, the background and the
// orbit lines are not drawn (their RNG draws still happen), and a boil variant re-jitters the strokes.
const BAKE = (() => {
  const q = new URLSearchParams(location.search);
  const o = { on: q.get('bake') === '1', layer: q.get('layer') || 'A', variant: +(q.get('v') || 0), N: +(q.get('N') || 2048), k: +(q.get('k') || 1),
    amp: +(q.get('amp') || 2.0), nvar: +(q.get('nvar') || 3), n: 0, hide: 0, inBg: false, noGlow: false, noDraw: false, cx: 0, cy: 0 };
  const dummyCtx = document.createElement('canvas').getContext('2d');
  const hs = (i, k) => { let x = Math.imul(i + 1, 374761393) ^ Math.imul(k + 7, 668265263); x = Math.imul(x ^ (x >>> 13), 1274126177); return ((x ^ (x >>> 16)) >>> 0) / 4294967296; };
  const TWO = Math.PI * 2;
  o.setup = (c, ctx, P) => { if (!o.on) return; c.width = o.N; c.height = o.N; o.ctx = ctx; o.P = P; o.noGlow = o.layer === 'A'; };
  o.place = (ctx, P) => { if (!o.on) return; o.cx = P.cx; o.cy = P.cy; ctx.setTransform(o.k, 0, 0, o.k, o.N / 2 - o.k * P.cx, o.N / 2 - o.k * P.cy); };
  o.startBg = () => { o.inBg = true; };
  o.endBg = (ctx) => { o.inBg = false; ctx.save(); ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, o.N, o.N); ctx.restore(); };
  // called where Leo's code finishes the halo glow dabs (just before the back orbit half)
  o.afterHalo = () => { if (o.layer === 'B') o.noDraw = true; o.noGlow = o.layer === 'A' ? false : o.noGlow; };
  o.stroke = (fn, ctx_, pts, w, rgb, alpha, R, opts) => {
    if (o.inBg || o.hide || o.noDraw) { fn(dummyCtx, pts, w, rgb, alpha, R, opts); return; }
    const i = o.n++; const v = o.variant;
    if (v === 0) { fn(ctx_, pts, w, rgb, alpha, R, opts); return; }
    // variant v: same stroke, same place in the RNG stream, but re-jittered. Offsets are relative to variant 0 and periodic in v / nvar,
    // so the cycle 0 -> 1 -> 2 -> 0 has steps of similar size and closes without a jump (Leo's boil: per-stroke sin offsets, point wobble, width pulse).
    const u = v / o.nvar, a = o.amp, m1 = 1 + Math.floor(hs(i, 2) * 3), m2 = 1 + Math.floor(hs(i, 4) * 3);
    const ox = a * (Math.sin(TWO * (u * m1 + hs(i, 3))) - Math.sin(TWO * hs(i, 3))), oy = a * (Math.sin(TWO * (u * m2 + hs(i, 5))) - Math.sin(TWO * hs(i, 5)));
    const p2 = pts.map(([x, y], j) => [x + ox + a * 0.5 * (Math.sin(TWO * (u * 2 + hs(i, 6) + j * 0.17)) - Math.sin(TWO * (hs(i, 6) + j * 0.17))), y + oy + a * 0.5 * (Math.sin(TWO * (u * 2 + hs(i, 7) + j * 0.13)) - Math.sin(TWO * (hs(i, 7) + j * 0.13)))]);
    const w2 = w * (1 + 0.07 * (Math.sin(TWO * (u + hs(i, 8))) - Math.sin(TWO * hs(i, 8))));
    const Rv = rng((Math.imul(i + 1, 2654435761) ^ Math.imul(v, 40503) ^ 0x9E3779B9) >>> 0);
    fn(ctx_, p2, w2, rgb, alpha, Rv, opts);
    const burn = 6 * (opts && opts.bristles !== undefined ? opts.bristles : 5); for (let b = 0; b < burn; b++) R();   // keep the main stream aligned with the original
  };
  o.glow = (fn, x, y, r, rgb, a) => { if (o.inBg || o.noGlow || o.noDraw) return; fn(x, y, r, rgb, a); };
  // equal-bleed ring/dab add, same maths as Leo's addBleed, but in texture px so it works at any scale
  const sdec = (c) => { c = c / 255; return c <= 0.04045 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4); };
  const senc = (c) => { c = Math.min(1, Math.max(0, c)); const v = c <= 0.0031308 ? 12.92 * c : 1.055 * Math.pow(c, 1 / 2.4) - 0.055; return Math.round(v * 255); };
  o.addBleed = (x, y, rOuter, rgb, alpha, { rInner = 0, rPeak = 0 } = {}) => {
    if (o.inBg || o.noDraw) return; const ctx = o.ctx, k = o.k, N = o.N;
    const xd = o.N / 2 + k * (x - o.cx), yd = o.N / 2 + k * (y - o.cy), rd = rOuter * k;
    const x0 = Math.max(0, Math.floor(xd - rd)), y0 = Math.max(0, Math.floor(yd - rd)), x1 = Math.min(N, Math.ceil(xd + rd)), y1 = Math.min(N, Math.ceil(yd + rd)); const bw = x1 - x0, bh = y1 - y0; if (bw <= 0 || bh <= 0 || alpha <= 0) return;
    const img = ctx.getImageData(x0, y0, bw, bh), d = img.data, lr = sdec(rgb[0]), lg = sdec(rgb[1]), lb = sdec(rgb[2]);
    for (let py = 0; py < bh; py++) for (let px = 0; px < bw; px++) {
      const dist = Math.hypot((x0 + px + 0.5 - xd) / k, (y0 + py + 0.5 - yd) / k); if (dist >= rOuter || dist < rInner) continue;
      let wgt = rPeak > 0 ? (dist < rPeak ? (dist - rInner) / Math.max(1e-6, rPeak - rInner) : (rOuter - dist) / Math.max(1e-6, rOuter - rPeak)) : 1 - dist / rOuter;
      wgt *= alpha; if (wgt <= 0) continue;
      const i = (py * bw + px) * 4; const R_ = sdec(d[i]) + lr * wgt, G_ = sdec(d[i + 1]) + lg * wgt, B_ = sdec(d[i + 2]) + lb * wgt; const over = Math.max(0, Math.max(R_, G_, B_) - 1);
      d[i] = senc(Math.min(1, R_ + over)); d[i + 1] = senc(Math.min(1, G_ + over)); d[i + 2] = senc(Math.min(1, B_ + over));
    }
    ctx.putImageData(img, x0, y0);
  };
  return o;
})();
