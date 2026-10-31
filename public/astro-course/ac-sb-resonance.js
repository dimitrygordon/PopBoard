// Orbital resonance sandbox (decks 4, 6, 7): moons or planets whose periods make simple ratios
// keep lining up at the same few spots, so the tugs add up. Change the ratio and the line-ups scatter.
const INK = "#3d3d3d", DIM = "#8c8170", COLORS = ["#a34a3e", "#3f6fa8", "#3f6b3a"], GOLD = "rgba(201,150,46,";

export const SYSTEMS = {
  galilean: { name: "Io, Europa, Ganymede (1 : 2 : 4)", center: "Jupiter", centerColor: "#d9a066", bodies: [["Io", 1.769], ["Europa", 3.551], ["Ganymede", 7.155]], unit: "days", radii: [0.42, 0.62, 0.86] },
  pluto: { name: "Neptune and Pluto (3 : 2)", center: "Sun", centerColor: "#f2c45a", bodies: [["Neptune", 164.8], ["Pluto", 247.9]], unit: "years", radii: [0.6, 0.86] }
};
// Angle of each line-up (conjunction) between bodies i and j, over n of the outer body's orbits.
export function conjunctions(P1, P2, count) {
  const syn = 1 / Math.abs(1 / P1 - 1 / P2); // synodic period
  const out = [];
  for (let k = 1; k <= count; k++) { const t = k * syn; out.push(((t / P1) % 1) * 360); }
  return out;
}

export function mountResonance(host, { system = "galilean" } = {}) {
  host.classList.add("kp");
  host.innerHTML = `
    <canvas width="600" height="600" aria-label="Orbits seen from above. Gold marks show where neighbors have lined up."></canvas>
    <p class="read-out" aria-live="polite"></p>
    <div class="row"><button type="button" data-k="play" aria-pressed="true">Pause</button><button type="button" data-k="clear">Clear marks</button></div>
    <div class="row"><select data-k="sys" aria-label="System">${Object.entries(SYSTEMS).map(([k, s]) => `<option value="${k}">${s.name}</option>`).join("")}</select></div>
    <label>Outer period, times the real one: <b data-o="f"></b><input type="range" data-k="f" min="0.8" max="1.25" step="0.005" value="1"></label>
    <p class="note">At 1.00 the line-ups land on the same few spots again and again, so each tug pushes the same way: that keeps orbits stretched (and Io hot). Nudge the slider and the marks spread all the way around.</p>`;
  const q = (s) => host.querySelector(s);
  const cv = q("canvas"), ctx = cv.getContext("2d");
  const sysIn = q('[data-k="sys"]'), fIn = q('[data-k="f"]'), playBtn = q('[data-k="play"]');
  let sys = SYSTEMS[system], t = 0, marks = [], last = 0, raf = 0, alive = true;
  let playing = !matchMedia("(prefers-reduced-motion: reduce)").matches;
  sysIn.value = system;
  const periods = () => sys.bodies.map((b, i) => (i === sys.bodies.length - 1 ? b[1] * +fIn.value : b[1]));
  const reset = () => { t = 0; marks = []; draw(); };
  sysIn.addEventListener("change", () => { sys = SYSTEMS[sysIn.value]; fIn.value = 1; reset(); });
  fIn.addEventListener("input", reset);
  q('[data-k="clear"]').addEventListener("click", () => { marks = []; draw(); });
  playBtn.textContent = playing ? "Pause" : "Play"; playBtn.setAttribute("aria-pressed", String(playing));
  playBtn.addEventListener("click", () => { playing = !playing; playBtn.textContent = playing ? "Pause" : "Play"; playBtn.setAttribute("aria-pressed", String(playing)); if (playing) loop(); });

  const ang = (P, tt) => 2 * Math.PI * (tt / P);
  function step(dt) {
    const P = periods(), n = P.length;
    const before = P.map((p) => ang(p, t)); t += dt; const after = P.map((p) => ang(p, t));
    // a line-up between neighbors happens when their angle difference wraps past a whole turn
    for (let i = 0; i < n - 1; i++) {
      const d0 = Math.floor((before[i] - before[i + 1]) / (2 * Math.PI)), d1 = Math.floor((after[i] - after[i + 1]) / (2 * Math.PI));
      if (d1 !== d0) marks.push({ a: after[i + 1], r: sys.radii[i + 1], i });
    }
    if (marks.length > 240) marks.splice(0, marks.length - 240);
  }
  function draw() {
    const W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, Rm = W * 0.46, P = periods();
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#f6efdf"; ctx.fillRect(0, 0, W, H);
    sys.radii.forEach((r) => { ctx.beginPath(); ctx.arc(cx, cy, r * Rm, 0, 7); ctx.strokeStyle = DIM; ctx.lineWidth = 1.6; ctx.setLineDash([7, 6]); ctx.stroke(); });
    ctx.setLineDash([]);
    for (const m of marks) {
      const x = cx + Math.cos(m.a) * m.r * Rm, y = cy - Math.sin(m.a) * m.r * Rm;
      const g = ctx.createRadialGradient(x, y, 0, x, y, 16); g.addColorStop(0, GOLD + "0.75)"); g.addColorStop(1, GOLD + "0)");
      ctx.fillStyle = g; ctx.beginPath(); ctx.arc(x, y, 16, 0, 7); ctx.fill();
    }
    const g = ctx.createRadialGradient(cx, cy, 0, cx, cy, 52); g.addColorStop(0, "rgba(242,196,90,0.6)"); g.addColorStop(1, "rgba(242,196,90,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 52, 0, 7); ctx.fill();
    ctx.fillStyle = sys.centerColor; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(cx, cy, 22, 0, 7); ctx.fill(); ctx.stroke();
    ctx.font = "22px 'Patrick Hand', 'Itim', sans-serif"; ctx.textAlign = "center"; ctx.fillStyle = INK; ctx.fillText(sys.center, cx, cy + 46);
    sys.bodies.forEach((b, i) => {
      const a = ang(P[i], t), x = cx + Math.cos(a) * sys.radii[i] * Rm, y = cy - Math.sin(a) * sys.radii[i] * Rm;
      ctx.fillStyle = COLORS[i]; ctx.beginPath(); ctx.arc(x, y, 11, 0, 7); ctx.fill(); ctx.stroke();
      ctx.fillStyle = INK; ctx.fillText(b[0], x, y - 18);
    });
    ctx.textAlign = "left";
    const f = +fIn.value;
    q('[data-o="f"]').textContent = f.toFixed(3);
    const ratio = P.map((p) => (p / P[0]).toFixed(2)).join(" : ");
    q(".read-out").innerHTML = `Periods ${P.map((p) => p.toFixed(2)).join(", ")} ${sys.unit}<br>Ratio ${ratio}${Math.abs(f - 1) < 0.0025 ? " (in resonance)" : " (off resonance)"}`;
  }
  function loop() {
    cancelAnimationFrame(raf); last = 0;
    const tick = (ts) => {
      if (!alive || !playing || !host.isConnected) return;
      if (last) { const dt = Math.min(0.05, (ts - last) / 1000) * periods()[0] * 0.6; for (let k = 0; k < 8; k++) step(dt / 8); }
      last = ts; draw(); raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
  }
  // start with a few orbits of history so the marks already show the pattern
  for (let k = 0; k < 4000; k++) step(periods()[periods().length - 1] * 3 / 4000);
  draw(); if (playing) loop();
  return { destroy() { alive = false; cancelAnimationFrame(raf); } };
}
