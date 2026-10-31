// D02 p20 "Moon Phases": the Sun lamp, Earth and an orbiting Moon whose lit half always faces the Sun; drag the Moon around Earth and the inset shows the phase seen from Earth.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L20-6.webp",[60.125,45.674,9.562,19.466]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const S = V(-7, 0, 0); K.sun(1, S.toArray()); K.label("sunlight", [-5.2, 1.3, 0], { layer: "mid", h: 0.4, color: P.goldCss });
  for (let i = -1; i <= 1; i++) { const a = K.arrow(P.gold, { r: 0.03 }); a.userData.set(V(-5.6, i * 0.9, 0), V(1, 0, 0), 1.6); }
  K.ball(0.5, "earth"); K.ring(3, P.ink, { dash: 0.15 }); const moon = K.litBall(0.28);
  const inset = K.litBall(0.55, "moon", { layer: "fg" }); inset.position.set(3.0, 1.5, 0); K.label("seen from Earth", [3.0, 0.6, 0], { h: 0.28 });
  const names = ["new", "waxing crescent", "first quarter", "waxing gibbous", "full", "waning gibbous", "third quarter", "waning crescent"], tags = names.map((n) => { const s = K.label(n, [3.0, 0.2, 0], { h: 0.32, color: P.goldCss }); s.visible = false; return s; });
  K.label("the lit half always faces the Sun", [-1.5, -2.6, 0], { h: 0.3 }); K.notToScale([3.4, -2.5, 0]);
  const drag = K.scrub(6), cam = K.cam([-1.5, 6, 13], [-1.5, -0.3, 0], 0.2), eye = V(), W = V();
  return { update(t) { cam(t); const a = Math.PI + K.tick(t) * 0.25 + drag.v; moon.position.set(Math.cos(a) * 3, 0, -Math.sin(a) * 3); // counterclockwise seen from the north moon.userData.face(S);
    // inset: turn its lit half so the viewer sees what Earth sees (angle Sun-Moon-Earth)
    const toS = S.clone().sub(moon.position).normalize(), toE = moon.position.clone().negate().normalize(), ang = Math.acos(Math.max(-1, Math.min(1, toS.dot(toE)))), side = Math.sign(toE.clone().cross(toS).y) || 1;
    inset.getWorldPosition(W); inset.lookAt(eye.set(W.x + Math.sin(ang) * side * 10, W.y, W.z + Math.cos(ang) * 10));
    const ph = ((((a - Math.PI) % 6.28) + 6.28) % 6.28) / 6.28, i = Math.round(ph * 8) % 8; tags.forEach((s, j) => (s.visible = j === i)); }, dispose() {} };
}
