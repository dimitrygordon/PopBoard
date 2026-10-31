// D02 p21 "Activity: Lamp and Ball Moon": a lamp, a ball on a pencil and your head; drag the ball around your head and its lit part changes through 8 stops.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L21-10.webp",[64.938,92.224,4.5,7.776]],["v2/L21-11.webp",[70.125,92.224,4.5,7.776]],["v2/L21-12.webp",[75.25,92.224,4.5,7.776]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const L = V(0, 0.6, -7); K.sun(0.6, L.toArray()); const shade = K.add(K.cone(0.8, 0.8, P.gold, 0.5)); shade.position.set(0, 1.1, -7);
  K.label("lamp = Sun", [0, -0.4, -7], { layer: "mid", h: 0.4 });
  const ball = K.litBall(0.16), stick = K.add(K.pencilProp()); stick.scale.setScalar(0.6);
  K.label("you are Earth: hold the ball at arm's length and turn", [0, -1.1, -1], { h: 0.24 });
  const stops = []; for (let i = 0; i < 8; i++) { const s = K.label(`stop ${i + 1} of 8`, [0, 0, 0], { h: 0.2, color: P.goldCss }); s.visible = false; stops.push(s); }
  const drag = K.scrub(6), H = V(0, 0.6, 0), look = V();
  return { update(t) { const a = -Math.PI / 2 + K.tick(t) * 0.3 + drag.v; ball.position.set(Math.cos(a) * 2.4, 0.8, Math.sin(a) * 2.4); ball.userData.face(L); stick.position.copy(ball.position).add(V(0, -1.05, 0));
    // the camera is your head: it looks a little past the ball so the lamp stays in view when they line up
    look.copy(ball.position).sub(H).normalize().multiplyScalar(5).add(H); ctx.setCamera([0, 0.6, 0], look.toArray());
    const i = Math.round((((a + Math.PI / 2) % 6.28 + 6.28) % 6.28) / 6.28 * 8) % 8; stops.forEach((s, j) => { s.visible = j === i; K.at(s, ball.position, 0, 0.4); }); }, dispose() {} };
}
