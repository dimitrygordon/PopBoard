// D02 p26 "Spring and Neap Tides": Sun, Earth and Moon; drag the Moon from in line with the Sun (big spring bulges) to a right angle (smaller neap range).
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L26-12.webp",[14.625,58.555,19.875,20.659]],["v2/L26-13.webp",[1.312,59.442,9.188,18.758]],["v2/L26-14.webp",[49.625,59.442,9.188,18.758]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const S = V(-9, 0, 0); K.sun(1.2, S.toArray()); K.ball(1, "earth"); const water = K.add(new T.Mesh(new T.SphereGeometry(1, K.SEG, K.SEG >> 1), K.flat(P.blue, 0.35)));
  const moon = K.litBall(0.3); K.ring(4, P.ink, { dash: 0.15 });
  const fm = K.arrow(P.blue), fs = K.arrow(P.gold); const lm = K.tag("Moon's tide pull", { h: 0.26, color: P.blueCss }), ls = K.tag("Sun's tide pull (a bit under half)", { h: 0.26, color: P.goldCss });
  const sp = K.label("spring tide: biggest range", [0, 2.3, 0], { h: 0.34, color: P.goldCss }), np = K.label("neap tide: smallest range", [0, 2.3, 0], { h: 0.34 }); K.notToScale();
  const drag = K.scrub(5), cam = K.cam([-2.5, 5, 15], [-2.5, 0, 0], 0.2);
  return { update(t) { cam(t); const a = Math.PI + K.tick(t) * 0.25 + drag.v, m = V(Math.cos(a), 0, Math.sin(a)); moon.position.copy(m).multiplyScalar(4); moon.userData.face(S);
    // tidal stretch along the Moon line plus 0.46 of that along the Sun line
    const sx = 0.3 * m.x * m.x + 0.14, sz = 0.3 * m.z * m.z; water.scale.set(1.05 + sx, 1.03, 1.05 + sz); fm.userData.set(m.clone().multiplyScalar(1.2), m, 1.2); fs.userData.set(V(-1.2, 0.2, 0), V(-1, 0, 0), 0.55);
    K.at(lm, m.clone().multiplyScalar(2.6), 0, 0.4); K.at(ls, V(-2.4, 0.6, 0)); const al = Math.abs(m.x); sp.visible = al > 0.9; np.visible = al < 0.3; }, dispose() {} };
}
