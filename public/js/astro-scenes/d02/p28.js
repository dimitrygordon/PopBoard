// D02 p28 "The Moon Is Drifting Away": Earth spins and carries its tidal bulge a little ahead of the Moon; the Moon's orbit ring creeps outward while a 3.8 cm per year counter rolls.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L28-2.webp",[0.375,12.376,28.813,22.902]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const earth = K.ball(0.9, "earth"); const water = K.add(new T.Mesh(new T.SphereGeometry(0.9, K.SEG, K.SEG >> 1), K.flat(P.blue, 0.35))); water.scale.set(1.3, 1.04, 1.04);
  const ring = K.ring(4, P.ink, { dash: 0.15 }); const moon = K.ball(0.3, "moon");
  const pull = K.arrow(P.gold); K.label("bulge runs ahead and tugs the Moon forward", [0, 2.4, 0], { h: 0.3 });
  const yrs = []; for (let k = 0; k < 6; k++) { const s = K.label(`+${(3.8 * (k + 1) * 10).toFixed(0)} cm in ${(k + 1) * 10} years`, [0, -2.2, 0], { h: 0.32, color: P.goldCss }); s.visible = false; yrs.push(s); }
  K.notToScale(); const cam = K.cam([0, 3.5, 9], [0, 0, 0], 0.2);
  return { update(t, dt) { cam(t); const k = K.tick(t), r = 4 + Math.min(1, k * 0.01); ring.scale.setScalar(r / 4); const a = k * 0.3; moon.position.set(Math.cos(a) * r, 0, -Math.sin(a) * r); earth.rotation.y += dt * 2;
    water.rotation.y = a + 0.35; const dir = V(Math.cos(a + 0.35), 0, -Math.sin(a + 0.35)); pull.userData.set(dir.clone().multiplyScalar(1.3), V(-dir.z, 0, dir.x).negate().multiplyScalar(-1).normalize(), 0.7); const i = Math.floor(k * 0.5) % 6; yrs.forEach((s, j) => (s.visible = j === i)); }, dispose() {} };
}
