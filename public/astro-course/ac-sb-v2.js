// Storybook v2 slide sandboxes (D01): powers of ten, eclipse, waves, Doppler, gravitation.
// Each mount(host) builds a canvas plus controls and returns { destroy }.
import { reduceMotion } from "./ac-common.js";
const INK = "#3d3d3d", BLUE = "#3f6fa8", RED = "#a34a3e", GOLD = "#c9862a";

function shell(host, label, controls, note) {
  host.classList.add("kp");
  host.innerHTML = `<canvas width="800" height="450" aria-label="${label}"></canvas><p class="read-out" aria-live="polite"></p>${controls}<p class="note">${note}</p>`;
  const cv = host.querySelector("canvas");
  return { cv, g: cv.getContext("2d"), out: host.querySelector(".read-out"), q: (s) => host.querySelector(s) };
}
function loop(draw) {
  let raf = 0, alive = true, t0 = performance.now();
  const f = () => { if (!alive) return; draw((performance.now() - t0) / 1000); if (!reduceMotion()) raf = requestAnimationFrame(f); };
  f(); return { redraw: () => draw((performance.now() - t0) / 1000), destroy() { alive = false; cancelAnimationFrame(raf); } };
}
function glow(g, x, y, r, c) { const gr = g.createRadialGradient(x, y, r * 0.2, x, y, r); gr.addColorStop(0, c); gr.addColorStop(1, "rgba(242,196,90,0)"); g.fillStyle = gr; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }

const STEPS = [["Earth", "10^7 m"], ["Earth and Moon", "10^9 m"], ["Inner Solar System", "10^12 m"], ["Solar System", "10^13 m"], ["Nearby stars", "10^17 m"], ["Milky Way", "10^21 m"], ["Local Group", "10^23 m"], ["Observable universe", "10^27 m"]];
export function mountPowers(host) {
  const s = shell(host, "Zoom from Earth out to the observable universe", `<label>Zoom: <b data-o="z"></b><input type="range" data-k="z" min="0" max="7" step="0.01" value="0"></label>`, "Each notch of the slider is a step out. The view widens by powers of ten.");
  const z = s.q('[data-k="z"]');
  const L = loop(() => {
    const v = +z.value, i = Math.round(v), { g, cv } = s; g.clearRect(0, 0, 800, 450);
    for (let k = 0; k < STEPS.length; k++) { const r = 30 * Math.pow(2.2, k - v); if (r < 2 || r > 1400) continue; g.strokeStyle = k % 2 ? BLUE : GOLD; g.lineWidth = 2; g.beginPath(); g.arc(400, 225, r, 0, 7); g.stroke(); if (r > 20 && r < 260) { g.fillStyle = INK; g.font = "18px Patrick Hand, sans-serif"; g.fillText(STEPS[k][0], 400 + r * 0.72, 225 - r * 0.72); } }
    g.fillStyle = BLUE; g.beginPath(); g.arc(400, 225, Math.max(1.5, 12 * Math.pow(2.2, -v)), 0, 7); g.fill();
    s.out.innerHTML = `${STEPS[i][0]}: about ${STEPS[i][1].replace(/\^(\d+)/, "<sup>$1</sup>")} across`; s.q('[data-o="z"]').textContent = STEPS[i][0];
  });
  z.addEventListener("input", L.redraw); return L;
}

export function mountEclipse(host) {
  const s = shell(host, "Drag the Moon in front of the Sun", "", "The Sun is about 400 times wider than the Moon and about 400 times farther away, so from Earth they look the same size.");
  let mx = 160, my = 300, drag = false;
  const pos = (e) => { const r = s.cv.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * 800, (e.clientY - r.top) / r.height * 450]; };
  s.cv.addEventListener("pointerdown", (e) => { const [x, y] = pos(e); if (Math.hypot(x - mx, y - my) < 60) { drag = true; s.cv.setPointerCapture(e.pointerId); } });
  s.cv.addEventListener("pointermove", (e) => { if (drag) { [mx, my] = pos(e); L.redraw(); } });
  s.cv.addEventListener("pointerup", () => { drag = false; });
  const L = loop((t) => {
    const { g } = s; g.clearRect(0, 0, 800, 450);
    const d = Math.hypot(mx - 520, my - 200), cover = Math.max(0, 1 - d / 120);
    if (d < 6) { glow(g, 520, 200, 120, "rgba(242,232,190,0.9)"); }
    glow(g, 520, 200, 70 + 4 * Math.sin(t), "rgba(242,196,90,0.6)");
    g.fillStyle = "#f2c45a"; g.beginPath(); g.arc(520, 200, 60, 0, 7); g.fill();
    g.fillStyle = "#4a4f5c"; g.strokeStyle = INK; g.beginPath(); g.arc(mx, my, 60, 0, 7); g.fill(); g.stroke();
    s.out.textContent = d < 6 ? "Total eclipse! The Moon exactly covers the Sun and the corona shows." : `Sun covered: about ${Math.round(Math.min(1, cover) * 100)}%`;
  });
  return L;
}

export function mountWaves(host) {
  const bands = [["Radio", 0], ["Microwave", 1], ["Infrared", 2], ["Visible", 3], ["Ultraviolet", 4], ["X-ray", 5], ["Gamma", 6]];
  const s = shell(host, "Light waves from radio to gamma", `<label>Band: <b data-o="b"></b><input type="range" data-k="b" min="0" max="6" step="0.01" value="3"></label>`, "Slide toward gamma: the wavelength gets shorter and each photon carries more energy.");
  const b = s.q('[data-k="b"]');
  const L = loop((t) => {
    const v = +b.value, { g } = s; g.clearRect(0, 0, 800, 450);
    const lam = 260 * Math.pow(0.55, v);
    g.strokeStyle = v > 2.5 && v < 3.5 ? "#6a4c93" : BLUE; g.lineWidth = 3; g.beginPath();
    for (let x = 0; x <= 800; x += 2) { const y = 180 + 70 * Math.sin((x / lam - t * 0.5) * 6.283); x ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke();
    bands.forEach(([n], i) => { const on = Math.round(v) === i; g.fillStyle = on ? GOLD : "#b9b0a0"; g.fillRect(30 + i * 108, 330, 90, 60); g.fillStyle = INK; g.font = "16px Patrick Hand, sans-serif"; g.fillText(n, 38 + i * 108, 410); });
    s.out.textContent = `${bands[Math.round(v)][0]}: telescope ${Math.round(v) + 1} of 7 is listening`; s.q('[data-o="b"]').textContent = bands[Math.round(v)][0];
  });
  b.addEventListener("input", L.redraw); return L;
}

export function mountDoppler(host) {
  const s = shell(host, "A moving star squeezes and stretches its waves", `<label>Speed: <b data-o="v"></b><input type="range" data-k="v" min="-0.6" max="0.6" step="0.01" value="0.3"></label>`, "Waves bunch up ahead of the star (bluer) and stretch out behind it (redder).");
  const sp = s.q('[data-k="v"]');
  const L = loop((t) => {
    const v = +sp.value, { g } = s; g.clearRect(0, 0, 800, 450);
    const x = 400 + Math.sin(t * 0.3) * 0;
    for (let k = 0; k < 9; k++) { const age = ((t * 0.8 + k) % 9), r = age * 40, cx = x - v * age * 40; g.strokeStyle = k % 2 ? "rgba(63,111,168,0.6)" : "rgba(163,74,62,0.6)"; g.beginPath(); g.arc(cx, 225, r, 0, 7); g.stroke(); }
    glow(g, x, 225, 26, "rgba(242,196,90,0.9)"); g.fillStyle = "#f2c45a"; g.beginPath(); g.arc(x, 225, 12, 0, 7); g.fill();
    g.font = "20px Patrick Hand, sans-serif"; g.fillStyle = v >= 0 ? BLUE : RED; g.fillText(v >= 0 ? "bluer ahead" : "redder ahead", v >= 0 ? 640 : 40, 60); g.fillStyle = v >= 0 ? RED : BLUE; g.fillText(v >= 0 ? "redder behind" : "bluer behind", v >= 0 ? 40 : 640, 60);
    s.q('[data-o="v"]').textContent = `${Math.round(Math.abs(v) * 100)}% of wave speed, moving ${v >= 0 ? "right" : "left"}`;
    s.out.textContent = v === 0 ? "Not moving: same wavelength all around." : "";
  });
  return L;
}

export function mountGravity(host) {
  const s = shell(host, "Two masses pull on each other", `<label>Distance d: <b data-o="d"></b><input type="range" data-k="d" min="1" max="3" step="0.01" value="1"></label><label>Mass 1: <b data-o="m"></b><input type="range" data-k="m" min="1" max="3" step="0.5" value="1"></label>`, "F<sub>g</sub> = G m<sub>1</sub> m<sub>2</sub> / d<sup>2</sup>. Double d and both arrows shrink to a quarter.");
  const dIn = s.q('[data-k="d"]'), mIn = s.q('[data-k="m"]');
  const L = loop(() => {
    const d = +dIn.value, m = +mIn.value, F = m / (d * d), { g } = s; g.clearRect(0, 0, 800, 450);
    const a = 400 - d * 110, b = 400 + d * 110, len = 110 * F;
    g.fillStyle = "#9a9a9a"; g.beginPath(); g.arc(a, 225, 24 * Math.cbrt(m), 0, 7); g.fill(); g.beginPath(); g.arc(b, 225, 24, 0, 7); g.fill();
    const arrow = (x, dir) => { g.strokeStyle = RED; g.fillStyle = RED; g.lineWidth = 4; g.beginPath(); g.moveTo(x, 225); g.lineTo(x + dir * len, 225); g.stroke(); g.beginPath(); g.moveTo(x + dir * (len + 12), 225); g.lineTo(x + dir * len, 217); g.lineTo(x + dir * len, 233); g.fill(); g.font = "italic 20px Patrick Hand, sans-serif"; g.fillText("F", x + dir * len / 2 - 6, 205); g.font = "14px Patrick Hand, sans-serif"; g.fillText("g", x + dir * len / 2 + 5, 210); };
    arrow(a + 26, 1); arrow(b - 26, -1);
    s.q('[data-o="d"]').textContent = `${d.toFixed(1)} d`; s.q('[data-o="m"]').textContent = `${m} m`;
    s.out.textContent = `F_g is ${F >= 1 ? F.toFixed(2) : "1/" + (1 / F).toFixed(1)} times the starting pull`;
  });
  dIn.addEventListener("input", L.redraw); mIn.addEventListener("input", L.redraw); return L;
}
