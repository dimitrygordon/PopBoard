// D02 p23 "Why Eclipses Are Rare": the Moon's orbit hoop is tilted 5° against Earth's orbit plane; drag the Moon around and only the node crossings line up.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L23-3.webp",[25.5,31.437,69.375,60.171]],["v2/L23-2.webp",[0.062,12.233,14.0,29.161]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const S = V(-9, 0, 0); K.sun(1.2, S.toArray());
  const plane = K.add(new T.Mesh(new T.CircleGeometry(4.5, 48), K.flat(P.gold, 0.12, T.DoubleSide))); plane.rotation.x = -Math.PI / 2;
  K.ball(0.5, "earth"); const tilt = 5 * Math.PI / 180 * 2.5; const hoop = K.ring(3, P.blue, { tilt });
  const moon = K.litBall(0.2); const nodes = [V(3, 0, 0), V(-3, 0, 0)].map((p) => { const m = K.add(new T.Mesh(new T.OctahedronGeometry(0.12, 0), new T.MeshBasicMaterial({ color: P.gold }))); m.position.copy(p); return m; });
  K.label("Earth's orbit plane", [-3.4, -0.5, 2], { h: 0.28, color: P.goldCss }); K.label("Moon's orbit: tilted 5° (drawn steeper)", [0, 2.3, 0], { h: 0.3, color: P.blueCss });
  K.label("nodes", [3.2, 0.4, 0], { layer: "mid", h: 0.3, color: P.goldCss }); const ok = K.label("lined up: eclipse possible", [0, -2.1, 0], { h: 0.3, color: P.goldCss }), miss = K.label("passes above or below: no eclipse", [0, -2.1, 0], { h: 0.3 });
  const drag = K.scrub(6), cam = K.cam([-1, 3.5, 13], [-1, 0, 0], 0.25);
  return { update(t) { cam(t); const a = K.tick(t) * 0.3 + drag.v; moon.position.set(Math.cos(a) * 3, 0, Math.sin(a) * 3).applyAxisAngle(V(1, 0, 0), tilt); moon.userData.face(S);
    const lined = Math.abs(moon.position.y) < 0.12 && Math.abs(moon.position.z) < 0.6; ok.visible = lined; miss.visible = !lined; }, dispose() {} };
}
