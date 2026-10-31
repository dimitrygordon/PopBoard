// D02 p31 "One More Question": the Moon orbits Earth always showing one face while the question card folds up beside it.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L31-2.webp",[0.188,9.957,7.375,20.199]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  K.ball(0.8, "earth"); K.ring(3.5, P.ink, { dash: 0.15 }); const moon = K.ball(0.32, "moon"); const mark = new T.Mesh(new T.CircleGeometry(0.1, 10), new T.MeshBasicMaterial({ color: P.red, side: T.DoubleSide })); mark.position.set(-0.33, 0, 0); mark.rotation.y = Math.PI / 2; moon.add(mark);
  const card = K.card(4.2, 0.9, { pos: [0, 2.2, 1] }); const q = ctx.label("Why one face? Use the word tides.", [0, 0, 0.05], { layer: "mid", h: 0.32 }); card.add(q); K.sk(q);
  const cam = K.cam([0, 2.5, 9], [0, 0.4, 0], 0.25);
  return { update(t) { cam(t); const a = K.tick(t) * 0.35; moon.position.set(Math.cos(a) * 3.5, 0, -Math.sin(a) * 3.5); moon.rotation.y = a; card.rotation.x = RM ? 0 : Math.max(0, 1.4 - t * 1.2); }, dispose() {} };
}
