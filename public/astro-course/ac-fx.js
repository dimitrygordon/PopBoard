// Page overlays from the motion spec, drawn on one 2D canvas above the scene (glows only via createRadialGradient).
import { reduceMotion } from "./ac-common.js";

export function mountFx(stage, fx, layers, startAt) {
  if (!fx || !fx.length) return { destroy() {}, pulse() {} };
  const cv = document.createElement("canvas"); cv.className = "pop-fx"; cv.setAttribute("aria-hidden", "true");
  stage.appendChild(cv);
  const g = cv.getContext("2d");
  let raf = 0, alive = true, t0 = performance.now(), pulseAt = 0;
  const still = reduceMotion();
  function size() { const r = stage.getBoundingClientRect(), d = Math.min(devicePixelRatio || 1, 1.5); cv.width = Math.round(r.width * d); cv.height = Math.round(r.height * d); }
  size();
  const P = (pt) => [pt[0] / 100 * cv.width, pt[1] / 100 * cv.height];
  const dark = () => document.documentElement.getAttribute("data-theme") === "dark";
  const ink = () => dark() ? "#f3ead7" : "#3d3d3d", gold = () => dark() ? "#e2b654" : "#c9862a", blue = () => dark() ? "#7fa6d9" : "#3f6fa8";
  function frame() {
    if (!alive) return;
    const t = still ? 999 : (performance.now() - t0) / 1000 - startAt;
    g.clearRect(0, 0, cv.width, cv.height);
    const u = cv.width / 960;
    for (const f of fx) {
      if (f.type === "travel") {
        const [ax, ay] = P(f.from), [bx, by] = P(f.to);
        const tt = Math.max(0, t - pulseAt), k = f.once ? Math.min(1, tt / f.period) : (tt / f.period) % 1;
        const x = ax + (bx - ax) * k, y = ay + (by - ay) * k;
        const r = g.createRadialGradient(x, y, 0, x, y, 14 * u);
        r.addColorStop(0, "rgba(242,196,90,0.95)"); r.addColorStop(1, "rgba(242,196,90,0)");
        g.fillStyle = r; g.beginPath(); g.arc(x, y, 14 * u, 0, 7); g.fill();
        g.fillStyle = ink(); g.beginPath(); g.arc(x, y, 3 * u, 0, 7); g.fill();
        g.font = `${18 * u}px "Gochi Hand", cursive`;
        if (f.counter) { const [c0, c1, unit] = f.counter, v = c0 + (c1 - c0) * k; g.fillText(`${v.toFixed(1)}${unit}`, x - 20 * u, y - 18 * u); }
        else if (f.label && k > 0.4) g.fillText(f.label, (ax + bx) / 2, (ay + by) / 2 - 12 * u);
      } else if (f.type === "rainbow") {
        const k = still ? 1 : Math.min(1, Math.max(0, t / 2.2));
        const cols = ["#a34a3e", "#c9862a", "#e2b654", "#3f6b3a", "#3f6fa8", "#6a4c93"];
        cols.forEach((c, i) => { g.strokeStyle = c; g.globalAlpha = 0.55; g.lineWidth = 4 * u; g.beginPath(); g.moveTo(cv.width * 0.72, cv.height * (0.16 + i * 0.012)); g.lineTo(cv.width * (0.72 - 0.68 * k), cv.height * (0.5 + i * 0.03)); g.stroke(); });
        g.globalAlpha = 1;
      } else if (f.type === "tether") {
        const L = layers.find((l) => l.kind === "moon") || layers[2]; if (!L) continue;
        const cx = (L.box[0] + L.box[2] * 0.4) / 100 * cv.width, cy = (L.box[1] + L.box[3] * 0.5) / 100 * cv.height, a = t * 0.3;
        const mx = cx + Math.cos(a) * L.box[2] / 100 * cv.width * 0.48, my = cy + Math.sin(a) * L.box[3] / 100 * cv.height * 0.32;
        g.setLineDash([4 * u, 5 * u]); g.strokeStyle = ink(); g.globalAlpha = 0.5; g.beginPath(); g.moveTo(cx, cy); g.lineTo(mx, my); g.stroke(); g.setLineDash([]); g.globalAlpha = 1;
      } else if (f.type === "ticks" || f.type === "taps") {
        const marks = layers.filter((l) => l.box[0] < 15 && l.box[3] > 5);
        marks.forEach((l, i) => {
          const k = Math.min(1, Math.max(0, (t - i * 0.5) / 0.5)); if (k <= 0) return;
          const x = (l.box[0] + l.box[2] + 1.5) / 100 * cv.width, y = (l.box[1] + l.box[3] / 2) / 100 * cv.height;
          g.strokeStyle = f.type === "ticks" ? (dark() ? "#9fd39a" : "#3f6b3a") : ink(); g.lineWidth = 3 * u; g.lineCap = "round";
          if (f.type === "ticks") { g.beginPath(); g.moveTo(x, y); g.lineTo(x + 6 * u * Math.min(1, k * 2), y + 6 * u * Math.min(1, k * 2)); if (k > 0.5) g.lineTo(x + 6 * u + 12 * u * (k - 0.5) * 2, y + 6 * u - 16 * u * (k - 0.5) * 2); g.stroke(); }
          else { const bob = Math.abs(Math.sin(t * 3 + i)) * 6 * u * (still ? 0 : 1); g.beginPath(); g.moveTo(x + 4 * u, y - bob); g.lineTo(x + 22 * u, y - 18 * u - bob); g.stroke(); }
        });
      } else if (f.type === "footprints") {
        const n = Math.floor(Math.min(14, t * 2));
        g.fillStyle = gold();
        for (let i = 0; i < n; i++) { const x = cv.width * (0.7 + i * 0.02), y = cv.height * (0.93 - (i % 2) * 0.02); g.beginPath(); g.ellipse(x, y, 3 * u, 5 * u, 0.3, 0, 7); g.fill(); }
      } else if (f.type === "guessLine" && f.go) {
        const [ax, ay] = P(f.from), k = Math.min(1, (t - f.go) / 2);
        g.setLineDash([3 * u, 6 * u]); g.strokeStyle = blue(); g.lineWidth = 2 * u; g.beginPath(); g.moveTo(ax, ay); g.lineTo(ax + (cv.width * 0.95 - ax) * k, ay); g.stroke(); g.setLineDash([]);
      }
    }
    if (!still) raf = requestAnimationFrame(frame);
  }
  frame();
  addEventListener("resize", size);
  return {
    pulse() { pulseAt = (performance.now() - t0) / 1000 - startAt; if (still) frame(); },
    guess() { for (const f of fx) if (f.type === "guessLine") f.go = (performance.now() - t0) / 1000 - startAt; if (still) frame(); },
    destroy() { alive = false; cancelAnimationFrame(raf); removeEventListener("resize", size); cv.remove(); }
  };
}
