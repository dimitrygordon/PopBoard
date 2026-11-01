// Plot Table 1: tap the grid to plot each point (snaps to 0.5 s and 1 m), then drag the two ends of
// the line to the best fit. Leo's points appear as each Table 1 point is plotted.
import { add, handle, fontPx, svg, path, follow, tapArea, clamp } from "../kit.js";
const fx = (t) => 470 + t * 680 / 6, fy = (p) => 700 - p * 550 / 30, tx = (x) => (x - 470) * 6 / 680, py = (y) => (700 - y) * 30 / 550;
const TAB = [0, 1, 2, 3, 4, 5].map((t) => [t, 5 * t]), PTS = ["pt0", "pt1", "pt2", "pt3", "pt4", "pt5"];
export default function build(ctx) {
  const { art, ui, say, layer } = ctx;
  const s = svg(layer); const miss = path(s, "", { stroke: "#B5473A", "stroke-width": 4 }), fit = path(s, "", { stroke: "#E2B654", "stroke-width": 6 });
  const cap = fontPx(add(layer, "div", "cap", [1180, 150, 1580, 330], ""), 26); cap.style.whiteSpace = "pre-line";
  const got = new Set(), wrong = [];
  const ends = [[0, 0], [6, 30]];
  const tally = () => { cap.textContent = `${got.size} of 6 points plotted` + (wrong.length ? `\n${wrong.length} off the table` : ""); };
  TAB.forEach((_, i) => art.show(PTS[i], false));
  tapArea(ctx, [440, 140, 1170, 720], "Graph grid: tap to plot a point", (p) => {
    const t = clamp(Math.round(tx(p[0]) * 2) / 2, 0, 6), x = clamp(Math.round(py(p[1])), 0, 30), i = TAB.findIndex(([a, b]) => a === t && b === x);
    if (i >= 0) { got.add(i); art.show(PTS[i], true); say(`(${t.toFixed(1)} s, ${x.toFixed(1)} m) is in Table 1.`, true); }
    else { wrong.push([t, x]); miss.setAttribute("d", wrong.map(([a, b]) => `M ${fx(a) - 10} ${fy(b) - 10} l 20 20 m 0 -20 l -20 20`).join(" ")); say(`(${t.toFixed(1)} s, ${x.toFixed(1)} m) is not a Table 1 point. Check the time and the position.`); }
    tally(); if (got.size === 6) say("All six points: they line up. Now drag the line's ends through them.", true);
  });
  const err = () => TAB.reduce((e, [t, p]) => { const [a, b] = ends, k = (b[1] - a[1]) / (b[0] - a[0] || 1e-9); return e + Math.abs(a[1] + k * (t - a[0]) - p); }, 0) / 6;
  const drawFit = () => fit.setAttribute("d", `M ${fx(ends[0][0])} ${fy(ends[0][1])} L ${fx(ends[1][0])} ${fy(ends[1][1])}`);
  ["start", "end"].forEach((nm, i) => {
    const b0 = [fx(ends[i][0]) - 30, fy(ends[i][1]) - 30, fx(ends[i][0]) + 30, fy(ends[i][1]) + 30], e0 = ends[i].slice();
    const h = handle(ctx, b0, `Best-fit line ${nm}: drag to fit the points`, {
      start: () => { art.touched("fitline"); art.show("fitline", false); },
      move: (dx, dy) => { ends[i] = [clamp(e0[0] + tx(470 + dx), 0, 6), clamp(e0[1] + py(700 + dy), 0, 30)]; drawFit(); },
      end: () => { follow(h, b0, fx(ends[i][0]) - fx(e0[0]), fy(ends[i][1]) - fy(e0[1])); const e = err(); say(e < 1 ? `A good fit: the line misses the points by ${e.toFixed(1)} m on average. It rises 5 m each second.` : `On average the line misses the points by ${e.toFixed(1)} m. Keep adjusting.`, e < 1); },
    });
  });
  ui.button("Start over", () => { got.clear(); wrong.length = 0; miss.setAttribute("d", ""); fit.setAttribute("d", ""); art.show("fitline", true); TAB.forEach((_, i) => art.show(PTS[i], false)); tally(); say(""); });
  art.touchable(["fitline"]);
  tally();
  return { destroy() {} };
}
