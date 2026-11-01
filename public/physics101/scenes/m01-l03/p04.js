// Do the dates agree? Drag each Chauvet error bar along the timeline; the gold box marks where all
// three ranges overlap, and disappears when they no longer agree.
import { add, handle, fontPx, svg, path } from "../kit.js";
const PX = 1344 / 2200, X = (v) => 160 + (v - 29500) * PX; // Leo's timeline: 29,500 to 31,700 years
const D = [{ id: "date-1", c: 30940, u: 610 }, { id: "date-2", c: 30790, u: 600 }, { id: "date-3", c: 30230, u: 530 }];
const fmt = (v) => Math.round(v).toLocaleString("en-US");
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const band = path(s, "", { fill: "rgba(226,182,84,0.28)", stroke: "#E2B654", "stroke-width": 4 });
  const cap = fontPx(add(layer, "div", "cap", [400, 560, 1200, 610], ""), 26); cap.style.textAlign = "center";
  const off = D.map(() => 0);
  const check = (quiet) => {
    const lo = Math.max(...D.map((d, i) => d.c + off[i] - d.u)), hi = Math.min(...D.map((d, i) => d.c + off[i] + d.u));
    if (lo < hi) { band.setAttribute("d", `M ${X(lo)} 600 H ${X(hi)} V 800 H ${X(lo)} Z`); cap.textContent = `All three overlap from ${fmt(lo)} to ${fmt(hi)} years: they agree.`; }
    else { band.setAttribute("d", ""); cap.textContent = "No region shared by all three: these dates do not agree."; }
    if (!quiet) say(lo < hi ? "The ranges still overlap, so the measurements agree." : "The overlap is gone. Measurements agree only when their uncertainty ranges overlap.", lo < hi);
  };
  D.forEach((d, i) => {
    const home = art.box(d.id); let o0 = 0;
    const h = handle(ctx, home, `Error bar ${fmt(d.c)} plus or minus ${d.u} years: drag left or right`, {
      start: () => { art.touched(d.id); o0 = off[i]; },
      move: (dx) => { off[i] = o0 + dx / PX; art.set(d.id, { dx: off[i] * PX }); check(true); },
      end: () => { h.style.left = ((home[0] + off[i] * PX) / 16) + "%"; check(); },
    });
  });
  art.touchable(D.map((d) => d.id));
  ui.button("Back to the measured dates", () => { off.fill(0); D.forEach((d) => art.set(d.id, { dx: 0 })); for (const [i, b] of [...layer.querySelectorAll(".hit")].entries()) b.style.left = (art.box(D[i].id)[0] / 16) + "%"; check(); });
  check(true);
  return { destroy() {} };
}
