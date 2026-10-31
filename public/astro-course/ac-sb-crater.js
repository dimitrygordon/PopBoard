// Crater sandbox (deck 7): impactor size, speed and material in, crater size and shape out.
import { crater, MATERIALS, G_EARTH, G_MOON, transitionDiameter } from "./ac-impact.js";

const INK = "#3d3d3d", ROCK = "#c9b48f", ROCK2 = "#a8916b", SKY = "#f6efdf", RED = "#a34a3e", BLUE = "#3f6fa8";
const fmtLen = (m) => (m >= 1000 ? `${(m / 1000).toFixed(m >= 1e4 ? 0 : 1)} km` : `${Math.round(m)} m`);
function fmtEnergy(mt) {
  if (mt < 1e-3) return `${(mt * 1e6).toFixed(0)} tons of TNT`;
  if (mt < 1) return `${(mt * 1000).toFixed(0)} kilotons of TNT`;
  if (mt < 1e4) return `${mt.toFixed(mt < 10 ? 1 : 0)} megatons of TNT`;
  return `${(mt / 1e6).toFixed(mt < 1e7 ? 1 : 0)} million megatons of TNT`;
}
const SHAPE = { bowl: "Simple bowl", peak: "Complex: central peak and terraces", rings: "Huge: peak ring or multi-ring basin (simplified cutoff)" };
const PRESETS = {
  meteor: { L: 40, v: 12.8, mat: "iron", body: "earth", name: "Meteor Crater, Arizona" },
  chicx: { L: 10000, v: 20, mat: "stone", body: "earth", name: "Chicxulub" },
  pebble: { L: 1, v: 20, mat: "stone", body: "moon", name: "1 m rock on the Moon" }
};

export function mountCrater(host) {
  host.classList.add("kp");
  host.innerHTML = `
    <canvas width="800" height="440" aria-label="Cross-section of the ground with the crater the impact would dig"></canvas>
    <p class="read-out" aria-live="polite"></p>
    <label>Impactor size: <b data-o="L"></b><input type="range" data-k="L" min="0" max="1000" step="1"></label>
    <label>Impact speed: <b data-o="v"></b><input type="range" data-k="v" min="11" max="72" step="0.5"></label>
    <div class="row"><select data-k="mat" aria-label="What the impactor is made of"><option value="iron">Iron</option><option value="stone">Stone</option><option value="ice">Ice (comet)</option></select>
      <select data-k="body" aria-label="Where it hits"><option value="earth">Hits Earth</option><option value="moon">Hits the Moon</option></select></div>
    <div class="row"><select data-k="preset" aria-label="Real impact"><option value="">Real impacts</option>${Object.entries(PRESETS).map(([k, p]) => `<option value="${k}">${p.name}</option>`).join("")}</select></div>
    <p class="note">Doubling the speed makes the crater about 1.4 times wider. Doubling the size makes it about 1.7 times wider. Scaling from Collins, Melosh &amp; Marcus (2005), for a 45&deg; hit into rock.</p>`;
  const q = (s) => host.querySelector(s);
  const cv = q("canvas"), ctx = cv.getContext("2d");
  const LIn = q('[data-k="L"]'), vIn = q('[data-k="v"]'), mat = q('[data-k="mat"]'), body = q('[data-k="body"]'), preset = q('[data-k="preset"]');
  const toL = (x) => Math.pow(10, x / 1000 * 4.3); // 1 m to 20 km
  const fromL = (L) => Math.round(1000 * Math.log10(L) / 4.3);
  const apply = (p) => { LIn.value = fromL(p.L); vIn.value = p.v; mat.value = p.mat; body.value = p.body; draw(); };
  for (const el of [LIn, vIn, mat, body]) el.addEventListener("input", () => { preset.value = ""; draw(); });
  preset.addEventListener("change", () => { if (preset.value) apply(PRESETS[preset.value]); });

  function draw() {
    const L = toL(+LIn.value), v = +vIn.value, g = body.value === "moon" ? G_MOON : G_EARTH;
    const c = crater(L, v * 1000, MATERIALS[mat.value], g);
    const W = cv.width, H = cv.height, ground = H * 0.38;
    // horizontal scale: crater spans about 60% of the canvas; depth drawn at the same scale (stretched if tiny)
    const s = (W * 0.6) / c.D;
    const stretch = Math.max(1, (H * 0.16) / (c.depth * s));
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = SKY; ctx.fillRect(0, 0, W, H);
    const cx = W / 2, R = c.D * s / 2, d = c.depth * s * stretch;
    // ground with the crater cut out
    ctx.beginPath(); ctx.moveTo(0, ground);
    const rim = Math.min(18, d * 0.12);
    ctx.lineTo(cx - R * 1.35, ground);
    ctx.quadraticCurveTo(cx - R * 1.08, ground - rim, cx - R, ground - rim);
    const prof = (u) => { // u from -1 to 1 across the crater, returns depth below rim
      const bowl = (1 - u * u);
      if (c.shape === "bowl") return d * bowl;
      const flat = Math.min(1, bowl * 2.2);
      let y = d * flat;
      const a = Math.abs(u);
      if (c.shape === "peak" && a < 0.18) y -= d * 0.55 * (1 - a / 0.18);
      if (c.shape === "rings") { if (a > 0.38 && a < 0.55) y -= d * 0.45 * Math.sin((a - 0.38) / 0.17 * Math.PI); if (a < 0.12) y -= d * 0.2 * (1 - a / 0.12); }
      return y;
    };
    for (let i = 0; i <= 80; i++) { const u = -1 + 2 * i / 80; ctx.lineTo(cx + u * R, ground - rim + prof(u) + rim * (1 - u * u) * 0); }
    ctx.lineTo(cx + R, ground - rim);
    ctx.quadraticCurveTo(cx + R * 1.08, ground - rim, cx + R * 1.35, ground);
    ctx.lineTo(W, ground); ctx.lineTo(W, H); ctx.lineTo(0, H); ctx.closePath();
    ctx.fillStyle = ROCK; ctx.fill();
    ctx.strokeStyle = INK; ctx.lineWidth = 3; ctx.stroke();
    // pencil hatching in the rock
    ctx.save(); ctx.clip(); ctx.strokeStyle = ROCK2; ctx.lineWidth = 1.2;
    for (let x = -H; x < W; x += 14) { ctx.beginPath(); ctx.moveTo(x, H); ctx.lineTo(x + H, 0); ctx.stroke(); }
    ctx.restore();
    // width arrow
    ctx.strokeStyle = BLUE; ctx.fillStyle = BLUE; ctx.lineWidth = 2.2;
    const ay = ground - rim - 30;
    ctx.beginPath(); ctx.moveTo(cx - R, ay); ctx.lineTo(cx + R, ay); ctx.stroke();
    for (const [x, dir] of [[cx - R, 1], [cx + R, -1]]) { ctx.beginPath(); ctx.moveTo(x, ay); ctx.lineTo(x + 12 * dir, ay - 7); ctx.lineTo(x + 12 * dir, ay + 7); ctx.closePath(); ctx.fill(); }
    ctx.font = "26px 'Patrick Hand', 'Itim', sans-serif"; ctx.textAlign = "center";
    ctx.fillText(`${fmtLen(c.D)} wide`, cx, ay - 12);
    ctx.fillStyle = RED; ctx.fillText(`${fmtLen(c.depth)} deep${stretch > 1.05 ? " (depth stretched)" : ""}`, cx, Math.min(H - 14, ground + d + 34));
    ctx.textAlign = "left";
    q('[data-o="L"]').textContent = fmtLen(L);
    q('[data-o="v"]').textContent = `${v} km/s`;
    q(".read-out").innerHTML = `${SHAPE[c.shape]}<br>Crater ${fmtLen(c.D)} wide, ${fmtLen(c.depth)} deep<br>Energy: about ${fmtEnergy(c.megatons)}<br><span class="note">Bowl turns complex above about ${fmtLen(transitionDiameter(g))} here.</span>`;
  }
  apply(PRESETS.meteor); preset.value = "meteor";
  return { destroy() {} };
}
