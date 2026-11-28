// Round 12: the red supergiant (H2, V2) and the red giant (S2 and the other cool giants) are Leo's own style B frames, baked offline
// (tools/stellar-life/bake). Each star has 3 boil variants of the disc (same layout, strokes re-jittered) and one soft halo layer.
// Textures are shared by every Scenes instance (the compare view builds two) and only the kind on screen stays in GPU memory.
export const BAKE = {
  rsg: { dir: "tex/rsg", teff: 3357, hueFloor: 0, patches: [[-0.24, 0.519], [0.036, 0.126], [-0.04, -0.348], [-0.449, 0.086]] },   // frame3a styleB, 3,357 K
  rg: { dir: "tex/rg", teff: 3089, hueFloor: 0.4, patches: [[0.121, 0.436], [-0.055, -0.539], [-0.034, -0.019], [0.46, -0.349]] },    // frame2b styleB, 3,089 K
  extentA: 1.32, extentB: 2.0, discPx: 2048,   // layer A is +-1.32 R, layer B (halo) +-2.0 R; A is 2048 px square
};
const cache = {};
// returns { a: [tex, tex, tex], b: tex, ready, promise }
export function bakedSet(T, kind, base = import.meta.url) {
  const key = kind; if (cache[key]) { cache[key].last = performance.now(); sweep(kind); return cache[key]; }
  const set = { kind, a: [], b: null, ready: false, bytes: 0, promise: null, last: performance.now() };
  const load = (f) => new Promise((res, rej) => { const t = new T.TextureLoader().load(new URL(f, base).href, (tx) => res(tx), undefined, rej); set._pending = set._pending || []; set._pending.push(t); return t; });
  const mk = (tx, mip) => { tx.colorSpace = T.NoColorSpace; tx.wrapS = tx.wrapT = T.ClampToEdgeWrapping; tx.magFilter = T.LinearFilter; tx.generateMipmaps = !!mip; tx.minFilter = mip ? T.LinearMipmapLinearFilter : T.LinearFilter; tx.anisotropy = mip ? 4 : 1; tx.needsUpdate = true; return tx; };
  const cfg = BAKE[kind];
  set.promise = Promise.all([0, 1, 2].map((i) => load(`${cfg.dir}-a${i}.webp`)).concat([load(`${cfg.dir}-halo.webp`)])).then((t) => {
    set.a = t.slice(0, 3).map((x) => mk(x, true)); set.b = mk(t[3], false); set.ready = true; return set;
  }).catch((e) => { set.failed = true; console.warn("baked star textures failed", kind, e && e.message); return set; });
  cache[key] = set; return set;
}
function sweep(keep) {   // a kind not asked for in the last 20 s leaves GPU memory (the compare view asks for both every frame)
  if (typeof location !== "undefined" && /[?&]manual=1/.test(location.search)) return;   // headless checks keep both resident
  const now = performance.now(); for (const k of Object.keys(cache)) if (k !== keep && now - cache[k].last > 20000) releaseBaked(k);
}
export function releaseBaked(kind) {
  const set = cache[kind]; if (!set || !set.ready) return;
  for (const t of set.a.concat([set.b])) t.dispose(); delete cache[kind];
}
export function bakedMemoryBytes() {   // GPU bytes of what is resident now: RGBA8, mip chain on layer A
  let n = 0; for (const k of Object.keys(cache)) { const s = cache[k]; if (!s.ready) continue; n += 3 * BAKE.discPx * BAKE.discPx * 4 * (4 / 3) + 512 * 512 * 4; } return n;
}
