// D02 p10 "Polaris & latitude": drag the observer on the Earth inset (or the Latitude slider) from the
// equator to the North Pole. The sightline, Polaris and the labels turn about the eye, and the yellow
// altitude wedge is redrawn live: the altitude of Polaris equals your latitude. Starts at 39 deg (Vincennes).
// Art: Leo's d02-p10 layers; the baked 39 deg pieces (wedge, sightline, globe marks) are drawn here instead.
const ART = "v2/art/";
const EYE = [703, 591], GLOBE = [274.5, 666.5], GR = 115, START = 39;
const YELLOW = "#F2D155", RED = "#B13A34", GOLD = "#E8A849", GLOW = "#FFD893";
const box = (b) => [b[0] / 16, b[1] / 9, (b[2] - b[0]) / 16, (b[3] - b[1]) / 9];
const rad = (d) => d * Math.PI / 180;

export default function build(ctx) {
  const { THREE: T, layers, palette: P, phone } = ctx;
  const ink = P.dark ? "#F3EAD7" : "#3D3D3D", fs = phone ? 1.3 : 1;
  const art = (n, b, o = {}) => ctx.art(ART + n, { box: box(b), ...o });
  art("p10-labels.webp", [84, 36, 1480, 813], { layer: "fg" });
  art("p10-fg-art.webp", [79, 114, 749, 311], { layer: "fg" });
  art("p10-ground.webp", [517, 727, 1468, 776]);
  art("p10-horizon.webp", [919, 589, 1418, 595]);
  art("p10-observer.webp", [658, 570, 709, 727]);
  art("p10-earth-inset.webp", [155, 473, 395, 811], { ink: false });
  const live = ctx.paint([0, 0, 1600, 900], { z: 0.02 });
  const star = art("p10-polaris.webp", [1227, 74, 1325, 172], { z: 0.04 });

  // the observer dot on the globe carries the gold touch outline
  const grab = new T.Object3D(); layers.mid.add(grab); ctx.touchable(grab, { r: 0.3 });
  let lat = START, dragging = false;
  const slider = ctx.ui && ctx.ui.slider({ label: "Latitude", min: 0, max: 90, step: 1, value: START, fmt: (v) => `${v}° N` }, (v) => { lat = v; draw(); });

  function arrow(g, x, y, ang, s = 14) { g.beginPath(); g.moveTo(x - s * Math.cos(ang - 0.45), y + s * Math.sin(ang - 0.45)); g.lineTo(x, y); g.lineTo(x - s * Math.cos(ang + 0.45), y + s * Math.sin(ang + 0.45)); g.stroke(); }
  function pencil(g, color, w, path, dash) {
    g.strokeStyle = color; g.setLineDash(dash || []);
    for (const [lw, a, j] of [[w, 0.9, 0], [w * 0.45, 0.4, 1.1]]) { g.globalAlpha = a; g.lineWidth = lw; g.save(); g.translate(j, -j * 0.6); path(); g.stroke(); g.restore(); }
    g.globalAlpha = 1; g.setLineDash([]);
  }
  function starShape(g, x, y, r) {
    g.beginPath(); for (let i = 0; i < 8; i++) { const a = i * Math.PI / 4, rr = i % 2 ? r * 0.38 : r; g.lineTo(x + rr * Math.cos(a), y - rr * Math.sin(a)); } g.closePath();
    g.fillStyle = GOLD; g.fill(); g.strokeStyle = ink; g.lineWidth = 1.5; g.stroke();
  }
  // Polaris rides the sightline 740 px out (where it is drawn at 39 deg), but never climbs into the
// title: at most 471 px above the eye, easing to 416 px as it swings over the title's right end.
function polarisAt(phi) {
  const cap = phi < 70 ? 471 : 471 - 55 * Math.min(1, (phi - 70) / 12), D = Math.min(740, cap / Math.max(0.01, Math.sin(rad(phi))));
  return [EYE[0] + D * Math.cos(rad(phi)), EYE[1] - D * Math.sin(rad(phi)), D];
}

  function draw() {
    const phi = lat, a = rad(phi), [px, py, D] = polarisAt(phi);
    live.redraw((g) => {
      // altitude wedge, pencil yellow, from the north horizon up to the sightline
      g.fillStyle = YELLOW; g.globalAlpha = P.dark ? 0.62 : 0.5; g.beginPath(); g.moveTo(EYE[0], EYE[1]); g.arc(EYE[0], EYE[1], 216, 0, -a, true); g.closePath(); g.fill(); g.globalAlpha = 1;
      pencil(g, YELLOW, 3, () => { g.beginPath(); g.arc(EYE[0], EYE[1], 216, 0, -a, true); });
      pencil(g, ink, 2.2, () => { g.beginPath(); g.arc(EYE[0], EYE[1], 216, -Math.max(0, a - 0.12), -a, true); });
      g.strokeStyle = ink; g.lineWidth = 2.2; arrow(g, EYE[0] + 216 * Math.cos(a), EYE[1] - 216 * Math.sin(a), a + Math.PI / 2);
      // north horizon from the eye to the drawn dashes
      pencil(g, ink, 2.4, () => { g.beginPath(); g.moveTo(EYE[0] + 26, EYE[1]); g.lineTo(919, EYE[1]); }, [12, 9]);
      // dashed sightline to Polaris
      const e0 = 30, e1 = D - 48;
      pencil(g, ink, 2.6, () => { g.beginPath(); g.moveTo(EYE[0] + e0 * Math.cos(a), EYE[1] - e0 * Math.sin(a)); g.lineTo(EYE[0] + e1 * Math.cos(a), EYE[1] - e1 * Math.sin(a)); }, [12, 9]);
      g.lineWidth = 2.6; g.strokeStyle = ink; arrow(g, EYE[0] + e1 * Math.cos(a), EYE[1] - e1 * Math.sin(a), a, 16);
      // live angle and Polaris labels
      g.fillStyle = ink; g.textBaseline = "middle"; g.textAlign = "center";
      g.font = `${60 * fs}px "Cabin Sketch"`; const la = rad(Math.max(phi * 0.3, 4)); g.fillText(`${phi}°`, EYE[0] + 285 * Math.cos(la), EYE[1] - 285 * Math.sin(la));
      g.font = `${40 * fs}px "Gochi Hand"`; g.textAlign = "right"; g.fillText("Polaris", px - 58, py - 17);
      // where you are: the slide's own label at Vincennes, the latitude elsewhere
      g.font = `${36.7 * fs}px "Gochi Hand"`; g.textAlign = "left"; g.fillText(Math.abs(phi - 39) < 0.5 ? "Vincennes, IN (38.7° N)" : `${phi}° N`, 583, 798);

      // the Earth inset: radius to the observer, their horizon (tangent), and the line to Polaris
      const ox = GLOBE[0] + GR * Math.cos(a), oy = GLOBE[1] - GR * Math.sin(a), tx = -Math.sin(a), ty = -Math.cos(a);
      pencil(g, RED, 2.6, () => { g.beginPath(); g.moveTo(GLOBE[0], GLOBE[1]); g.lineTo(ox, oy); });
      pencil(g, RED, 2.6, () => { g.beginPath(); g.moveTo(ox - 75 * tx, oy - 75 * ty); g.lineTo(ox + 75 * tx, oy + 75 * ty); });
      pencil(g, ink, 1.8, () => { g.beginPath(); g.moveTo(ox, oy - 8); g.lineTo(ox, 425); }, [6, 6]);
      starShape(g, ox, 412, 13);
      pencil(g, RED, 2, () => { g.beginPath(); g.arc(GLOBE[0], GLOBE[1], 32, 0, -a, true); });
      pencil(g, RED, 2, () => { g.beginPath(); g.arc(ox, oy, 28, -Math.PI / 2, Math.atan2(ty, tx), true); });
      g.fillStyle = RED; g.beginPath(); g.arc(ox, oy, 6.5, 0, 7); g.fill();
    });
    const sp = ctx.at(px, py); star.position.x = sp[0]; star.position.y = sp[1];
    const op = ctx.at(GLOBE[0] + GR * Math.cos(a), GLOBE[1] - GR * Math.sin(a)); grab.position.set(op[0], op[1], 0.05);
    slider && slider.set(phi);
  }
  ctx.onPointer(({ phase, x, y }) => {
    if (phase === "down") {
      if (Math.hypot(x - GLOBE[0], y - GLOBE[1]) > GR + 45) return false;
      dragging = true;
    }
    if (!dragging) return false;
    if (phase === "up") { dragging = false; return true; }
    const d = Math.atan2(-(y - GLOBE[1]), x - GLOBE[0]) * 180 / Math.PI;
    lat = Math.round(Math.min(90, Math.max(0, d)));
    draw(); return true;
  });
  draw();
  // canvas text waits for the hand fonts
  if (globalThis.document && document.fonts) Promise.all(['40px "Gochi Hand"', '60px "Cabin Sketch"'].map((f) => document.fonts.load(f))).then(draw, () => {});
  return { update() {}, dispose() {} };
}
