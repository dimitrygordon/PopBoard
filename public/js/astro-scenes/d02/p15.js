// D02 p15 "Seasons": the Sun and a tilted Earth on an orbit ring with the tilt fixed toward Polaris; drag Earth through the months and the northern light patch goes direct in summer and slanted, spread out in winter.
import { kit, cardsPage, BODY } from "../kit.js";

const ART = [["v2/L15-4.webp",[0.25,10.955,24.625,26.115]],["v2/L15-7.webp",[46.562,23.057,6.938,14.268]]]; // the page's own cutouts, as depth planes

export default function build(ctx) {
  const K = kit(ctx), { T, V, P, RM } = K;
  K.stars(); K.art(ART);
  K.sun(1); K.ring(6, P.gold);
  const e = K.tiltedEarth(0.7);
  const beam = K.arrow(P.gold, { r: 0.06 }), patch = new T.Mesh(new T.CircleGeometry(0.2, 20), new T.MeshBasicMaterial({ color: P.gold, transparent: true, side: T.DoubleSide })); K.add(patch);
  ["June", "Sept", "Dec", "March"].forEach((m, i) => K.label(m, [Math.cos(i * Math.PI / 2 + Math.PI) * 7.2, -0.9, Math.sin(i * Math.PI / 2 + Math.PI) * 7.2], { layer: "mid", h: 0.45 }));
  const sum = K.label("northern summer: direct, small, bright patch", [0, 2.6, 0], { h: 0.3, color: P.goldCss }), win = K.label("northern winter: slanted, spread-out patch", [0, 2.6, 0], { h: 0.3, color: P.blueCss });
  K.label("axis always points to Polaris", [0, -2.5, 0], { h: 0.28 }); K.notToScale([3.8, -2.1, 0]);
  const drag = K.scrub(5), cam = K.cam([0, 6, 15], [0, -0.5, 0], 0.2), tilt = 23.4 * Math.PI / 180, lat = 40 * Math.PI / 180, Z = V(0, 0, 1);
  return { update(t, dt) { cam(t); const a = Math.PI + K.tick(t) * 0.12 + drag.v, p = V(Math.cos(a) * 6, 0, Math.sin(a) * 6); e.position.copy(p); e.userData.spin.rotation.y += dt;
    // the patch sits at 40° N on the noon side; the axis leans toward -x for good, so Earth at -x (June) tips the north toward the Sun
    const toSun = p.clone().negate().normalize(), n2 = V(toSun.x * Math.cos(lat), Math.sin(lat), toSun.z * Math.cos(lat)).applyAxisAngle(Z, tilt).normalize();
    patch.position.copy(p).addScaledVector(n2, 0.72); patch.lookAt(patch.position.clone().add(n2)); const cosI = Math.max(0.2, n2.dot(toSun)); patch.scale.set(1 / cosI, 1, 1);
    beam.userData.set(p.clone().addScaledVector(toSun, 2.8).addScaledVector(n2, 0.5), toSun.clone().negate(), 1.9); sum.visible = cosI > 0.85; win.visible = cosI < 0.55; }, dispose() {} };
}
