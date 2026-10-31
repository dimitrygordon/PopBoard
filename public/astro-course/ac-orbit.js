// Kepler orbit sandbox: pick a planet or set a and e, watch the orbit, sweep equal areas, read P from P^2 = a^3.
import { position, periodYears, speedKmS, PLANETS, fmtYears } from "./ac-kepler.js";
import { reduceMotion } from "./ac-common.js";

const INK = "#3d3d3d", DIM = "#6b6b6b", RED = "#a34a3e", BLUE = "#3f6fa8";
const WEDGE = ["rgba(63,111,168,0.22)", "rgba(163,74,62,0.20)"];

export function mountOrbit(host, { big = false } = {}) {
  host.classList.add("kp");
  host.innerHTML = `
    <canvas width="600" height="600" aria-label="Orbit drawing: the Sun sits at one focus of the ellipse"></canvas>
    <p class="read-out" aria-live="polite"></p>
    <div class="row"><button type="button" data-k="play" aria-pressed="true">Pause</button>
      <button type="button" data-k="areas" aria-pressed="false">Equal areas</button>
      <select data-k="preset" aria-label="Planet"><option value="">Custom orbit</option>${PLANETS.map((p, i) => `<option value="${i}">${p.name}</option>`).join("")}<option value="x4">a = 4 AU (page 20)</option></select></div>
    <label>Semi-major axis a: <b data-o="a"></b><input type="range" data-k="a" min="0" max="1000" step="1"></label>
    <label>Eccentricity e: <b data-o="e"></b><input type="range" data-k="e" min="0" max="0.9" step="0.01"></label>
    <p class="note">Same time between dots: near the Sun the planet speeds up, far away it slows down. With equal areas on, each colored slice takes the same time and has the same area.</p>`;
  const q = (s) => host.querySelector(s);
  const cv = q("canvas"), ctx = cv.getContext("2d");
  const aIn = q('[data-k="a"]'), eIn = q('[data-k="e"]'), preset = q('[data-k="preset"]');
  const playBtn = q('[data-k="play"]'), areaBtn = q('[data-k="areas"]'), out = q(".read-out");
  // a slider is logarithmic from 0.3 AU to 40 AU
  const toA = (v) => 0.3 * Math.pow(40 / 0.3, v / 1000);
  const fromA = (a) => Math.round(1000 * Math.log(a / 0.3) / Math.log(40 / 0.3));
  let a = 1, e = 0.017, t = 0, playing = !reduceMotion(), areas = false, last = 0, raf = 0, alive = true;
  playBtn.textContent = playing ? "Pause" : "Play"; playBtn.setAttribute("aria-pressed", String(playing));
  const set = (na, ne) => { a = na; e = ne; aIn.value = fromA(a); eIn.value = e; t = 0; draw(); };
  set(1, 0.017); preset.value = "2";
  aIn.addEventListener("input", () => { a = toA(+aIn.value); preset.value = ""; draw(); });
  eIn.addEventListener("input", () => { e = +eIn.value; preset.value = ""; draw(); });
  preset.addEventListener("change", () => { const v = preset.value; if (v === "x4") set(4, 0.2); else if (v) set(PLANETS[+v].a, PLANETS[+v].e); });
  playBtn.addEventListener("click", () => { playing = !playing; playBtn.textContent = playing ? "Pause" : "Play"; playBtn.setAttribute("aria-pressed", String(playing)); if (playing) loop(); });
  areaBtn.addEventListener("click", () => { areas = !areas; areaBtn.setAttribute("aria-pressed", String(areas)); draw(); });

  function draw() {
    const W = cv.width, H = cv.height, P = periodYears(a);
    // the major axis fills 88% of the canvas; the ellipse center (x = -ae) sits mid-canvas
    const s = (W * 0.88) / (2 * a);
    const fx = (x) => W / 2 + (x + a * e) * s, fy = (y) => H / 2 - y * s;
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f6efdf"; ctx.fillRect(0, 0, W, H);
    // equal-area wedges: 12 slices, each 1/12 of the period
    const N = 12;
    if (areas) for (let k = 0; k < N; k++) {
      ctx.beginPath(); ctx.moveTo(fx(0), fy(0));
      for (let j = 0; j <= 24; j++) { const p = position(a, e, P * (k + j / 24) / N); ctx.lineTo(fx(p.x), fy(p.y)); }
      ctx.closePath(); ctx.fillStyle = WEDGE[k % 2]; ctx.fill();
    }
    // orbit path in pencil
    ctx.beginPath();
    for (let j = 0; j <= 240; j++) { const p = position(a, e, P * j / 240); j ? ctx.lineTo(fx(p.x), fy(p.y)) : ctx.moveTo(fx(p.x), fy(p.y)); }
    ctx.strokeStyle = INK; ctx.lineWidth = 2.4; ctx.setLineDash([]); ctx.stroke();
    // equal-time dots
    ctx.fillStyle = DIM;
    for (let k = 0; k < N; k++) { const p = position(a, e, P * k / N); ctx.beginPath(); ctx.arc(fx(p.x), fy(p.y), 3.2, 0, 7); ctx.fill(); }
    // Sun with a soft radial glow
    const g = ctx.createRadialGradient(fx(0), fy(0), 0, fx(0), fy(0), 46);
    g.addColorStop(0, "rgba(242,196,90,0.95)"); g.addColorStop(0.35, "rgba(242,196,90,0.55)"); g.addColorStop(1, "rgba(242,196,90,0)");
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(fx(0), fy(0), 46, 0, 7); ctx.fill();
    ctx.fillStyle = "#e8a83a"; ctx.strokeStyle = "#a8641c"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fx(0), fy(0), 12, 0, 7); ctx.fill(); ctx.stroke();
    // planet and its line to the Sun
    const p = position(a, e, t);
    ctx.strokeStyle = RED; ctx.lineWidth = 1.6; ctx.setLineDash([6, 5]); ctx.beginPath(); ctx.moveTo(fx(0), fy(0)); ctx.lineTo(fx(p.x), fy(p.y)); ctx.stroke(); ctx.setLineDash([]);
    ctx.fillStyle = BLUE; ctx.strokeStyle = INK; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(fx(p.x), fy(p.y), 10, 0, 7); ctx.fill(); ctx.stroke();
    ctx.fillStyle = INK; ctx.font = "24px 'Patrick Hand', 'Itim', sans-serif"; ctx.fillText("Sun", fx(0) - 18, fy(0) + 40);
    q('[data-o="a"]').textContent = `${a < 10 ? a.toFixed(2) : a.toFixed(1)} AU`;
    q('[data-o="e"]').textContent = e.toFixed(2);
    out.innerHTML = `P = ${fmtYears(P)} &nbsp;(P<sup>2</sup> = a<sup>3</sup>)<br>Now ${p.r.toFixed(2)} AU from the Sun, moving ${speedKmS(a, p.r).toFixed(1)} km/s`;
  }
  function loop() {
    cancelAnimationFrame(raf);
    last = 0;
    const step = (ts) => {
      if (!alive || !playing || !host.isConnected) return;
      if (last) { const P = periodYears(a); t += ((ts - last) / 1000) * (P / 6); } // one orbit every 6 seconds
      last = ts; draw(); raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
  }
  draw(); if (playing) loop();
  return { destroy() { alive = false; cancelAnimationFrame(raf); } };
}
