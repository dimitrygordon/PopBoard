// D02 p8 "Diurnal motion": looking north over the treeline, the sky turns counterclockwise about
// Polaris at 15.04 degrees per hour of sim time. Drag the sky (or the Time slider) to run the clock;
// each star leaves its colored pencil trail behind it, up to one full turn, and outer stars set
// behind the trees. Art: Leo's d02-p08 layers (decks/d02/v2/art).
const ART = "v2/art/";
const POLE = [1057, 400], RATE = 15.04, HOURS = 24;
// the drawn trails, measured from p08-trails.png: radius px, color, start and end in math degrees (ccw, y up)
const TRAILS = [
  [50, "#7EB2E4", 224, 344], [92, "#886EC0", 84, 199], [131, "#DF7979", 155, 270], [173, "#E68839", 201, 315],
  [215, "#7EB2E4", 113, 227], [257, "#886EC0", 243, 357], [299, "#DF7979", 130, 242], [341, "#E58739", 179, 242], [383, "#8FCA85", 99, 212],
];
// top of the treeline (p08-horizon.png alpha), every 24 px; trails are clipped below it so stars set behind the trees
const TREES = [[516, 659], [548, 652], [572, 653], [596, 660], [644, 659], [668, 655], [692, 660], [716, 672], [764, 680], [788, 677], [812, 650], [836, 647], [860, 651], [884, 685], [908, 617], [932, 641], [956, 594], [980, 628], [1004, 616], [1028, 621], [1052, 648], [1100, 645], [1124, 616], [1148, 619], [1172, 642], [1196, 629], [1220, 648], [1244, 604], [1268, 652], [1316, 659], [1340, 649], [1364, 639], [1388, 670], [1436, 662], [1484, 660], [1507, 660]];
const box = (b) => [b[0] / 16, b[1] / 9, (b[2] - b[0]) / 16, (b[3] - b[1]) / 9];
const rad = (d) => d * Math.PI / 180;

export default function build(ctx) {
  const { THREE: T, layers, reducedMotion, palette: P } = ctx;
  const art = (n, b, o = {}) => ctx.art(ART + n, { box: box(b), ...o });
  // the horizon sits on the fg layer, in front of the turning sky
  art("p08-labels.webp", [83, 40, 1388, 833], { layer: "fg" });
  art("p08-fg-art.webp", [79, 26, 1306, 599], { layer: "fg" });
  art("p08-horizon.webp", [516, 593, 1507, 768], { layer: "fg", ink: false });
  const sky = ctx.paint([POLE[0] - 400, 0, POLE[0] + 400, 800]);
  art("p08-polaris.webp", [1015, 358, 1099, 441]);

  // a grab point that rides the outer drawn star, for the gold touch outline
  const grab = new T.Object3D(); layers.mid.add(grab); ctx.touchable(grab, { r: 0.35 });

  let hours = 0, playing = !reducedMotion, dragging = null;
  const slider = ctx.ui && ctx.ui.slider({ label: "Time", min: 0, max: HOURS, step: 0.1, value: 0, fmt: (v) => `${v.toFixed(1)} h` }, (v) => { hours = v; playing = false; play && play.set("Play"); draw(); });
  const play = ctx.ui && ctx.ui.button(playing ? "Pause" : "Play", () => { if (!playing && hours >= HOURS) hours = 0; playing = !playing; play.set(playing ? "Pause" : "Play"); });

  function pencilArc(g, r, color, a0, a1) {
    // canvas angles run clockwise (y down), so a math-ccw arc from a0 to a1 is drawn anticlockwise
    for (const [w, al, j] of [[4.2, 0.9, 0], [1.6, 0.45, 1.6], [1.4, 0.35, -1.5]]) {
      g.strokeStyle = color; g.globalAlpha = al; g.lineWidth = w;
      g.beginPath(); g.arc(POLE[0], POLE[1], r + j, -rad(a0), -rad(a1), true); g.stroke();
    }
    g.globalAlpha = 1;
  }
  function draw() {
    const turn = RATE * hours;
    sky.redraw((g) => {
      g.save(); g.beginPath(); g.moveTo(POLE[0] - 400, 0); g.lineTo(POLE[0] + 400, 0); g.lineTo(POLE[0] + 400, TREES[TREES.length - 1][1] + 12);
      for (let i = TREES.length - 1; i >= 0; i--) g.lineTo(TREES[i][0], TREES[i][1] + 12);
      g.lineTo(POLE[0] - 400, TREES[0][1] + 12); g.closePath(); g.clip();
      for (const [r, c, s, e] of TRAILS) {
        const head = e + turn, tail = Math.max(s, head - 360);
        pencilArc(g, r, c, tail, head);
        const x = POLE[0] + r * Math.cos(rad(head)), y = POLE[1] - r * Math.sin(rad(head));
        g.fillStyle = c; g.globalAlpha = 0.35; g.beginPath(); g.arc(x, y, 10, 0, 7); g.fill();
        g.globalAlpha = 1; g.fillStyle = P.dark ? "#FCFAF1" : "#3a3a3a"; g.beginPath(); g.arc(x, y, 4.5, 0, 7); g.fill();
      }
      g.restore();
    });
    const [r, , , e] = TRAILS[6], hd = rad(e + turn);
    const p = ctx.at(POLE[0] + r * Math.cos(hd), POLE[1] - r * Math.sin(hd)); grab.position.set(p[0], p[1], 0.05);
    slider && slider.set(Math.round(hours * 10) / 10);
  }
  const angleAt = (x, y) => Math.atan2(-(y - POLE[1]), x - POLE[0]) * 180 / Math.PI;
  ctx.onPointer(({ phase, x, y }) => {
    if (phase === "down") {
      const d = Math.hypot(x - POLE[0], y - POLE[1]);
      if (d > 430 || d < 20 || y > 640) return false;
      dragging = { a: angleAt(x, y) }; playing = false; play && play.set("Play"); return true;
    }
    if (!dragging) return false;
    if (phase === "move") {
      const a = angleAt(x, y); let da = a - dragging.a; if (da > 180) da -= 360; if (da < -180) da += 360;
      dragging.a = a; hours = Math.min(HOURS, Math.max(0, hours + da / RATE)); draw();
    } else dragging = null;
    return true;
  });
  draw();
  let last = -1;
  return {
    update(t, dt) {
      if (!playing || dragging) return;
      // 1 sim hour per second; the run stops after a full day, one full turn
      hours = Math.min(HOURS, hours + dt); if (hours >= HOURS) { playing = false; play && play.set("Play"); }
      if (Math.abs(hours - last) > 0.02) { last = hours; draw(); }
    },
    dispose() {},
  };
}
