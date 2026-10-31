// D02 p02 "Why Does the Moon Change Shape?": a lamp Sun lights a Moon that circles in front of you so its phases cycle; three vote cards stand up, wobble and flip when picked.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L02-7.webp",[37.25,78.643,8.0,16.206]],["v2/L02-8.webp",[59.25,78.643,8.0,16.206]],["v2/L02-12.webp",[26.188,78.894,8.062,16.08]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const lamp = K.sun(0.7, [-5, 0.8, -3]);
  K.label("Sun (lamp)", [-5, -0.4, -3], { layer: "mid", h: 0.3 });
  const moon = K.litBall(0.55, "moon");
  const opts = ["A) Earth's shadow", "B) Clouds or dust", "C) We see more or less of its lit half"], cards = [];
  opts.forEach((o, i) => { const c = K.card(3.6, 0.6, { pos: [2.2, 1.3 - i * 0.85, 0.5] }); const f = ctx.label(o, [0, 0, 0.05], { layer: "mid", h: 0.26 }); c.add(f); K.sk(f);
    const b = ctx.label(i === 2 ? "Test it with the lamp!" : "Hmm, test it later", [0, 0, -0.05], { layer: "mid", h: 0.26, color: P.goldCss }); c.add(b); b.visible = false; cards.push({ c, f, b, tgt: 0 }); });
  K.title("Why does the Moon change shape? Vote!", [0, 2.3, 0]);
  let pick = -1; ctx.onDrag(({ x, y }) => { if (x < 0.5) return; const i = Math.max(0, Math.min(2, Math.floor((y - 0.25) / 0.17))); if (i !== pick) { pick = i; cards[i].tgt = Math.PI - cards[i].tgt; } });
  const cam = K.cam([0, 0.4, 13], [0, 0.3, 0], 0.25);
  return { update(t, dt) { cam(t); const a = K.tick(t) * 0.5 + 1; moon.position.set(-1.6 + Math.cos(a) * 1.3, 0.2, Math.sin(a) * 1.3 + 2); moon.userData.face(lamp.position);
    cards.forEach((k, i) => { k.c.rotation.y += (k.tgt + (RM ? 0 : Math.sin(t * 1.2 + i) * 0.06) - k.c.rotation.y) * Math.min(1, dt * 5 || 1); const back = Math.cos(k.c.rotation.y) < 0; k.f.visible = !back; k.b.visible = back; }); }, dispose() {} };
}
