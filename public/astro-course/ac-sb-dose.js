// Radiation dose sandbox (deck 24.5): plan a Mars mission and see the dose on a log-scale chart
// next to the deck's reference numbers.
import { missionDose, RATE, WORKER_LIMIT } from "./ac-dose.js";

const INK = "#3d3d3d", DIM = "#6b6b6b", RED = "#a34a3e", BLUE = "#3f6fa8", GREEN = "#3f6b3a", GOLD = "#c9962e";
const fmt = (mSv) => (mSv >= 1000 ? `${(mSv / 1000).toFixed(2)} Sv` : `${mSv < 10 ? mSv.toFixed(1) : Math.round(mSv)} mSv`);

export function mountDose(host) {
  host.classList.add("kp");
  host.innerHTML = `
    <canvas width="800" height="460" aria-label="Bar chart of radiation doses on a log scale"></canvas>
    <p class="read-out" aria-live="polite"></p>
    <label>Days in deep space (both legs): <b data-o="tr"></b><input type="range" data-k="tr" min="0" max="900" step="10" value="360"></label>
    <label>Days on Mars: <b data-o="su"></b><input type="range" data-k="su" min="0" max="900" step="10" value="500"></label>
    <label>Share of Mars time spent underground: <b data-o="ug"></b><input type="range" data-k="ug" min="0" max="1" step="0.05" value="0"></label>
    <p class="note">Rates from the deck: about ${RATE.transit.toFixed(1)} mSv a day in deep space and ${RATE.surface.toFixed(2)} mSv a day on Mars. Simplified: a few meters of rock blocks most of it. The chart is logarithmic: each step right is 10 times more.</p>`;
  const q = (s) => host.querySelector(s);
  const cv = q("canvas"), ctx = cv.getContext("2d");
  const tr = q('[data-k="tr"]'), su = q('[data-k="su"]'), ug = q('[data-k="ug"]');
  for (const el of [tr, su, ug]) el.addEventListener("input", draw);

  function draw() {
    const d = missionDose({ transitDays: +tr.value, surfaceDays: +su.value, undergroundShare: +ug.value });
    const rows = [
      ["1 year on Earth", 2.4, GREEN],
      ["Worker limit, 1 year", WORKER_LIMIT, DIM],
      ["6-month trip", 330, BLUE],
      ["500 days on Mars", 320, BLUE],
      ["Your mission", d.total, RED]
    ];
    const W = cv.width, H = cv.height, x0 = 230, x1 = W - 30, top = 30, rowH = (H - top - 60) / rows.length;
    const lo = 1, hi = 10000; // 1 mSv to 10 Sv
    const X = (v) => x0 + (Math.log10(Math.max(lo, v)) - Math.log10(lo)) / (Math.log10(hi) - Math.log10(lo)) * (x1 - x0);
    ctx.clearRect(0, 0, W, H); ctx.fillStyle = "#f6efdf"; ctx.fillRect(0, 0, W, H);
    ctx.font = "22px 'Patrick Hand', 'Itim', sans-serif";
    // decade grid
    for (const v of [1, 10, 100, 1000, 10000]) {
      ctx.strokeStyle = "rgba(61,61,61,0.22)"; ctx.lineWidth = 1.2; ctx.setLineDash([5, 6]);
      ctx.beginPath(); ctx.moveTo(X(v), top - 10); ctx.lineTo(X(v), H - 50); ctx.stroke(); ctx.setLineDash([]);
      // axis ticks read 1 mSv, 10 mSv, 100 mSv, 1 Sv, 10 Sv; the last one is right-aligned so it never runs off a narrow canvas
      const tick = v >= 1000 ? `${v / 1000} Sv` : `${v} mSv`;
      const w = ctx.measureText(tick).width;
      ctx.fillStyle = DIM; ctx.textAlign = "left"; ctx.fillText(tick, Math.max(2, Math.min(X(v) - w / 2, W - w - 4)), H - 22);
    }
    // 1 Sv: the deck's whole-mission number
    ctx.strokeStyle = GOLD; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X(1000), top - 14); ctx.lineTo(X(1000), H - 50); ctx.stroke();
    rows.forEach(([label, v, color], i) => {
      const y = top + i * rowH + rowH * 0.2, h = rowH * 0.6;
      ctx.fillStyle = INK; ctx.textAlign = "right"; ctx.fillText(label, x0 - 12, y + h * 0.72);
      ctx.fillStyle = color; ctx.globalAlpha = 0.75;
      // slightly wobbly pencil bar
      ctx.beginPath(); ctx.moveTo(x0, y); ctx.lineTo(X(v), y + 1.5); ctx.lineTo(X(v) - 1, y + h); ctx.lineTo(x0, y + h - 1); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1; ctx.strokeStyle = INK; ctx.lineWidth = 1.6; ctx.stroke();
      ctx.fillStyle = INK; ctx.textAlign = "left";
      const lx = X(v) + 8; ctx.fillText(fmt(v), Math.min(lx, W - 90), y + h * 0.72);
    });
    ctx.textAlign = "left";
    q('[data-o="tr"]').textContent = `${tr.value} days`;
    q('[data-o="su"]').textContent = `${su.value} days`;
    q('[data-o="ug"]').textContent = `${Math.round(+ug.value * 100)}%`;
    q(".read-out").innerHTML = `Your mission: about ${fmt(d.total)} (${fmt(d.transit)} in space + ${fmt(d.surface)} on Mars)<br>That is about ${Math.round(d.earthYears)} years of Earth's natural background.`;
  }
  draw();
  return { destroy() {} };
}
