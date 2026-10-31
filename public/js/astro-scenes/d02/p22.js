// D02 p22 "Eclipses": Sun, Moon and Earth on a rail with shadow cones; drag the Moon between Sun and Earth for a solar eclipse or behind Earth for a lunar eclipse.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L22-3.webp",[0.0,31.995,6.375,34.067]],["v2/L22-6.webp",[0.0,66.321,6.375,33.679]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const S = V(-8, 0, 0); K.sun(1.2, S.toArray()); K.add(K.line([V(-9, -1.4, 0), V(6, -1.4, 0)], P.ink));
  K.ball(0.6, "earth"); const moon = K.litBall(0.22);
  const eShadow = K.add(K.cone(0.6, 5, P.ink, 0.25)); eShadow.geometry.rotateZ(Math.PI / 2); eShadow.position.set(2.5, 0, 0);
  const mShadow = K.add(K.cone(0.22, 3, P.ink, 0.3)); mShadow.geometry.rotateZ(Math.PI / 2);
  const sol = K.label("solar eclipse: the Moon's shadow lands on Earth", [-1, 2.6, 0], { h: 0.32, color: P.goldCss }), lun = K.label("lunar eclipse: the Moon slides into Earth's shadow", [-1, 2.6, 0], { h: 0.32, color: P.goldCss });
  K.label("Sun", [-8, -1.9, 0], { layer: "mid", h: 0.4 }); K.label("Earth", [0, -1.1, 0], { layer: "mid", h: 0.35 }); K.notToScale([4, -2.6, 0]);
  const drag = K.scrub(6), cam = K.cam([-1, 3, 15], [-1, 0, 0], 0.25);
  return { update(t) { cam(t); const a = Math.PI + K.tick(t) * 0.3 + drag.v; moon.position.set(Math.cos(a) * 2.2, 0, Math.sin(a) * 2.2); moon.userData.face(S);
    mShadow.position.copy(moon.position).add(V(1.5, 0, 0)); const c = Math.cos(a); sol.visible = c < -0.97; lun.visible = c > 0.97; mShadow.visible = c < -0.6; }, dispose() {} };
}
