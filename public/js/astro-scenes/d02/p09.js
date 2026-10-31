// D02 p09 "How Fast the Sky Turns": a protractor wedge stands up from Polaris; drag to set the hours and the sky turns 15 degrees each hour, a full 360 at 24 h.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L09-3.webp",[0.25,12.517,29.625,28.198]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  // looking straight at Polaris: the sky disk turns counterclockwise about the view axis
  const sky = K.add(K.specks(K.phone ? 90 : 220, () => { const r = 0.6 + Math.random() * 5.5, a = Math.random() * 6.28; return [Math.cos(a) * r, Math.sin(a) * r, -0.5 - Math.random() * 2]; }, P.ink, 0.1));
  const wedge = K.add(new T.Mesh(new T.CircleGeometry(4, 24, Math.PI / 2, Math.PI * 2), K.flat(P.gold, 0.35, T.DoubleSide)));
  const ticks = new T.Group(); for (let h = 0; h < 24; h++) { const a = Math.PI / 2 + h / 24 * 6.28; ticks.add(K.line([V(Math.cos(a) * 4, Math.sin(a) * 4, 0), V(Math.cos(a) * 4.35, Math.sin(a) * 4.35, 0)], P.ink)); } K.add(ticks);
  K.add(K.line(K.ringPts(4, 96).map((p) => V(p.x, p.z, 0)), P.ink));
  const pol = K.add(new T.Mesh(new T.OctahedronGeometry(0.14, 0), new T.MeshBasicMaterial({ color: P.gold })));
  K.label("Polaris", [0, 0.4, 0], { layer: "mid", h: 0.32, color: P.goldCss }); K.label("360° ÷ 24 h = 15° per hour", [0, 2.6, 0], { h: 0.42 });
  const hrs = []; for (let h = 1; h <= 24; h++) { const s = K.label(`${h} h = ${h * 15}°`, [0, -2.6, 0], { h: 0.42, color: P.goldCss }); s.visible = false; hrs.push(s); }
  const drag = K.scrub(24, 0, 0, 23.99), cam = K.cam([0, 0, 19], [0, 0, 0], 0.25);
  return { update(t) { cam(t); const h = drag.touched ? Math.floor(drag.v) + 1 : 1 + (RM ? 5 : Math.floor(t * 0.8) % 24);
    wedge.geometry.setDrawRange(0, h * 3); sky.rotation.z = h * 15 * Math.PI / 180; hrs.forEach((s, i) => (s.visible = i === h - 1)); }, dispose() {} };
}
