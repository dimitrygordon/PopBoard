// Speed records: work out each record holder's average speed (100 m divided by the record time), pick
// the right answer, then race two dots down a 100 m track at those speeds.
import { add, fontPx, svg, path, tween } from "../kit.js";
const R = { bolt: { t: 9.58, who: "Usain Bolt" }, flojo: { t: 10.49, who: "Florence Griffith-Joyner" } };
const X0 = 200, X1 = 1400, TY = { bolt: 250, flojo: 300 };
export default function build(ctx) {
  const { art, ui, say, layer, reduce } = ctx;
  const s = svg(layer); path(s, `M ${X0} 225 H ${X1} V 325 H ${X0} Z M ${X0} 275 H ${X1}`, { fill: "rgba(247,246,242,0.85)", stroke: "#1F2F5C", "stroke-width": 3 });
  const dot = { bolt: path(s, "", { fill: "#5B8FC9", stroke: "#1F2F5C", "stroke-width": 2 }), flojo: path(s, "", { fill: "#9B7BC8", stroke: "#1F2F5C", "stroke-width": 2 }) };
  const cap = fontPx(add(layer, "div", "cap", [200, 340, 1400, 420], "Work out each average speed, then pick it."), 26); cap.style.textAlign = "center";
  const ok = {};
  const put = (k, f) => dot[k].setAttribute("d", `M ${X0 + f * (X1 - X0) - 14} ${TY[k]} a 14 14 0 1 0 28 0 a 14 14 0 1 0 -28 0`);
  const pick = (k, v) => {
    const right = (100 / R[k].t).toFixed(2), good = v === right; if (good) ok[k] = true;
    say(good ? `Yes: 100 m / ${R[k].t} s = ${right} m/s for ${R[k].who}.` : `Not quite. Divide 100 m by ${R[k].t} s.`, good);
    cap.textContent = `${ok.bolt ? "Bolt " + (100 / 9.58).toFixed(2) + " m/s" : "Bolt ?"}   ${ok.flojo ? "Griffith-Joyner " + (100 / 10.49).toFixed(2) + " m/s" : "Griffith-Joyner ?"}`;
  };
  ui.button("Bolt: 9.58 m/s", () => pick("bolt", "9.58"));
  ui.button("Bolt: 10.44 m/s", () => pick("bolt", "10.44"));
  ui.button("Griffith-Joyner: 9.53 m/s", () => pick("flojo", "9.53"));
  ui.button("Griffith-Joyner: 10.49 m/s", () => pick("flojo", "10.49"));
  ui.button("Race", async () => {
    if (!ok.bolt || !ok.flojo) return say("Work out both average speeds first.");
    await tween(4000, (k) => { const t = k * 10.49; for (const r in R) put(r, Math.min(1, t / R[r].t)); }, reduce);
    say(`Bolt finishes 0.91 s sooner. When he crosses the line, Griffith-Joyner is about ${(100 - 9.58 * 100 / 10.49).toFixed(0)} m behind.`, true);
  });
  put("bolt", 0); put("flojo", 0);
  return { destroy() {} };
}
