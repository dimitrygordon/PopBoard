// D02 p25 "Tides": Earth with an exaggerated water shell lined up with the Moon; drag to spin Earth and a coast pin rises and falls through two highs and two lows in 24 h 50 min.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L25-2.webp",[0.375,12.0,38.75,22.345]],["v2/L25-4.webp",[84.375,51.724,7.75,16.966]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const earth = K.ball(1.4, "earth"); const water = K.add(new T.Mesh(new T.SphereGeometry(1.4, K.SEG, K.SEG >> 1), K.flat(P.blue, 0.35))); water.scale.set(1.35, 1.05, 1.05);
  const moon = K.ball(0.4, "moon", { pos: [6, 0, 0] }); K.label("Moon", [6, 0.7, 0], { layer: "mid", h: 0.35 });
  const pin = K.add(new T.Mesh(new T.ConeGeometry(0.08, 0.35, 6), K.flat(P.red)));
  const tide = K.tag("", { h: 0.3, color: P.goldCss }), hi = K.label("high tide", [0, 2.2, 0], { h: 0.32, color: P.goldCss }), lo = K.label("low tide", [0, 2.2, 0], { h: 0.32 });
  K.label("two bulges stay lined up with the Moon", [0, -2.2, 0], { h: 0.3 }); K.notToScale();
  const drag = K.scrub(6), cam = K.cam([2, 2, 13], [2, 0, 0], 0.2);
  return { update(t) { cam(t); const a = K.tick(t) * 0.4 + drag.v; earth.rotation.y = a; const p = V(Math.cos(-a), 0, Math.sin(-a)); const c2 = Math.cos(2 * -a);
    const R = 1.4 * (1.2 + 0.15 * c2); pin.position.copy(p).multiplyScalar(R + 0.15); pin.lookAt(p.clone().multiplyScalar(5)); pin.rotateX(Math.PI / 2); hi.visible = c2 > 0.7; lo.visible = c2 < -0.7; }, dispose() {} };
}
