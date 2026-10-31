// D02 p19 "Part 3: The Moon": a Moon drifts across over a gently rippling sea that stretches away from you.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L19-3.webp",[73.688,38.082,15.062,33.85]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  const seg = K.phone ? 20 : 40, geo = new T.PlaneGeometry(30, 20, seg, seg); const sea = K.add(new T.Mesh(geo, new T.MeshLambertMaterial({ color: P.blue, wireframe: true, transparent: true, opacity: 0.5 }))); sea.rotation.x = -Math.PI / 2; sea.position.set(0, -1.4, -6);
  const moon = K.ball(0.9, "moon"); K.label("Part 3: The Moon", [0, -0.5, -2], { h: 0.45 }); K.label("seen in daytime too", [0, -1.0, -2], { h: 0.28, color: P.blueCss });
  const base = geo.attributes.position.array.slice(), cam = K.cam([0, 0.2, 7], [0, 0.6, -5], 0.2);
  return { update(t) { cam(t); const k = K.tick(t); moon.position.set(-5 + ((k * 0.3) % 10), 2.2, -6); moon.rotation.y = k * 0.1;
    const a = geo.attributes.position.array; for (let i = 0; i < a.length; i += 3) a[i + 2] = base[i + 2] + Math.sin(base[i] * 0.8 + k) * 0.12 + Math.cos(base[i + 1] * 0.6 + k * 0.7) * 0.1; geo.attributes.position.needsUpdate = true; }, dispose() {} };
}
