// D02 p27 "One Face Forever": the Moon orbits Earth with a crater mark; drag to switch tidal lock off and watch the face turn away; locked, it spins once per orbit and always faces Earth.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = []; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  K.ball(0.8, "earth"); K.ring(4, P.ink, { dash: 0.15 });
  const moon = K.ball(0.4, "moon"); const mark = new T.Mesh(new T.CircleGeometry(0.12, 12), new T.MeshBasicMaterial({ color: P.red, side: T.DoubleSide })); mark.position.set(-0.41, 0, 0); mark.rotation.y = Math.PI / 2; moon.add(mark);
  const on = K.label("tidal lock ON: one spin per orbit", [0, 2.4, 0], { h: 0.32, color: P.goldCss }), off = K.label("lock OFF: the marked face turns away", [0, 2.4, 0], { h: 0.32 });
  K.label("crater mark", [0, -2.4, 0], { h: 0.26, color: P.blueCss }); K.notToScale();
  let lock = true, last = 0; ctx.onDrag(({ dx }) => { if (Math.abs(dx) > 0.15 && Math.sign(dx) !== last) { lock = !lock; last = Math.sign(dx); } });
  const cam = K.cam([0, 3.5, 8.5], [0, 0, 0], 0.2);
  return { update(t) { cam(t); const a = K.tick(t) * 0.4 + 0.5; moon.position.set(Math.cos(a) * 4, 0, -Math.sin(a) * 4); moon.rotation.y = lock ? a : 0; on.visible = lock; off.visible = !lock; }, dispose() {} };
}
