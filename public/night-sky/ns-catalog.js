// Night Sky: catalog loading and parsing (pure parsing + fetch). Data files are in ./data (CC BY-SA 4.0,
// see data/CREDITS.md). stars.bin: 24 bytes per star, little endian:
// f32 ra_rad, f32 dec_rad, f32 mag, f32 bv (NaN = unknown), f32 dist_pc (NaN = unknown), u32 hip (0 = none).
export const RECORD_BYTES = 24;

export function parseStars(buf) {
  const dv = new DataView(buf);
  const n = buf.byteLength / RECORD_BYTES;
  if (!Number.isInteger(n)) throw new Error("stars.bin length is not a multiple of 24");
  const ra = new Float32Array(n), dec = new Float32Array(n), mag = new Float32Array(n), bv = new Float32Array(n), dist = new Float32Array(n);
  const hip = new Uint32Array(n), vec = new Float32Array(3 * n);
  for (let i = 0; i < n; i++) {
    const o = i * RECORD_BYTES;
    ra[i] = dv.getFloat32(o, true); dec[i] = dv.getFloat32(o + 4, true); mag[i] = dv.getFloat32(o + 8, true);
    bv[i] = dv.getFloat32(o + 12, true); dist[i] = dv.getFloat32(o + 16, true); hip[i] = dv.getUint32(o + 20, true);
    const cd = Math.cos(dec[i]);
    vec[3 * i] = cd * Math.cos(ra[i]); vec[3 * i + 1] = cd * Math.sin(ra[i]); vec[3 * i + 2] = Math.sin(dec[i]);
  }
  const indexOfHip = new Map();
  for (let i = 0; i < n; i++) if (hip[i] && !indexOfHip.has(hip[i])) indexOfHip.set(hip[i], i);
  return { n, ra, dec, mag, bv, dist, hip, vec, indexOfHip, starVec: (i) => [vec[3 * i], vec[3 * i + 1], vec[3 * i + 2]] };
}

const GREEK = { Alp: "α", Bet: "β", Gam: "γ", Del: "δ", Eps: "ε", Zet: "ζ", Eta: "η", The: "θ", Iot: "ι", Kap: "κ", Lam: "λ", Mu: "μ",
  Nu: "ν", Xi: "ξ", Omi: "ο", Pi: "π", Rho: "ρ", Sig: "σ", Tau: "τ", Ups: "υ", Phi: "φ", Chi: "χ", Psi: "ψ", Ome: "ω" };
/** Attach names: meta.names rows are [index, proper, bayer, flamsteed]; meta.con is 3 chars per star. */
export function attachMeta(stars, meta) {
  const names = new Map(meta.names.map((r) => [r[0], r]));
  stars.con = (i) => meta.con.slice(3 * i, 3 * i + 3).trim();
  stars.spect = (i) => meta.spect[i] || "";
  stars.proper = (i) => (names.get(i) || [])[1] || "";
  /** Bayer ("α Lyr"), Flamsteed, or HIP — never the proper name. */
  stars.catalogName = (i) => {
    const r = names.get(i), con = stars.con(i);
    if (r && r[2]) { const [g, k] = r[2].split("-"); return `${GREEK[g] || g}${k ? "¹²³⁴⁵⁶⁷⁸⁹"[+k - 1] || k : ""} ${con}`; }
    if (r && r[3]) return `${r[3]} ${con}`;
    return stars.hip[i] ? `HIP ${stars.hip[i]}` : "";
  };
  /** "Vega", else "α Lyr", else "15 Mon", else "HIP 12345". Bayer like "Alp-1" -> "α¹". */
  stars.label = (i) => (stars.proper(i) || stars.catalogName(i) || "Star");
  return stars;
}

/** Fetch and parse everything needed for first sky (art atlas loads later, on demand). */
export async function loadCatalog(base, fetchFn = fetch) {
  const [bin, meta, cons, lut, manifest] = await Promise.all([
    fetchFn(base + "stars.bin").then((r) => { if (!r.ok) throw new Error("stars.bin " + r.status); return r.arrayBuffer(); }),
    fetchFn(base + "stars-meta.json").then((r) => r.json()),
    fetchFn(base + "constellations.json").then((r) => r.json()),
    fetchFn(base + "bv-lut.json").then((r) => r.json()),
    fetchFn(base + "manifest.json").then((r) => r.json()),
  ]);
  const stars = attachMeta(parseStars(bin), meta);
  return { stars, constellations: cons, bvLut: lut, manifest };
}
