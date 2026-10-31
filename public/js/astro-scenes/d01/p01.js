// D01 p1 "Where are we in the universe?": the camera rides Earth's orbit facing the Sun,
// the Moon swings close in front, and the 8.3 light-minutes label rides the light path.
export default function build(ctx) {
  // mid sits at z = 0, so world coordinates go straight into layers.mid
  const { THREE: T, layers, palette: P, reducedMotion } = ctx;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const SUN = V(0, 0, -16), R = 16;
  // pencil-hatched spheres: ctx.pencil(base, accent) gives the shared graphite hatch texture
  const ball = (r, base, accent, basic) => { const map = ctx.pencil(base, accent); return new T.Mesh(new T.SphereGeometry(r, 32, 16), basic ? new T.MeshBasicMaterial({ map }) : new T.MeshLambertMaterial({ map })); };

  const sun = ctx.sketch(ball(2.2, "#f2c45a", "#c9862a", true), { delay: 0 }); sun.position.copy(SUN); layers.mid.add(sun);
  const pts = []; for (let i = 0; i <= 256; i++) { const a = i / 256 * Math.PI * 2; pts.push(V(Math.cos(a) * R, -0.9, Math.sin(a) * R).add(SUN)); }
  const orbit = ctx.sketch(new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color: P.gold })), { delay: 0.2 }); layers.mid.add(orbit);
  const earth = ctx.sketch(ball(0.45, "#5b88b8", "#3f6b3a"), { delay: 0.4 }); layers.mid.add(earth);
  const moon = ctx.sketch(ball(0.16, "#d8d4cc", "#7a7a7a"), { delay: 0.5 }); layers.mid.add(moon);
  const path = ctx.sketch(new T.Line(new T.BufferGeometry().setFromPoints([SUN, V(0, 0, 0)]), new T.LineDashedMaterial({ color: P.gold, dashSize: 0.35, gapSize: 0.22 })), { delay: 0.8 }); layers.mid.add(path);

  const sunTag = ctx.label("Sun", [0, 3.2, -16], { layer: "mid", h: 1.1 });
  const earthTag = ctx.label("Earth", [0, 0, 0], { layer: "mid", h: 0.32 });
  const moonTag = ctx.label("Moon", [0, 0, 0], { layer: "mid", h: 0.32 });
  const lightTag = ctx.label("1 AU ≈ 8.3 light-minutes", [0, 0, 0], { layer: "mid", h: 0.5, color: P.goldCss });
  const title = ctx.label("Where are we in the universe?", [0, 0, 0], { layer: "mid", h: 0.5 });
  ctx.sketch(sunTag, { delay: 0.6 }); ctx.sketch(lightTag, { delay: 1.2 });

  const C = V(0, 0.35, 0); let a = Math.PI / 2, spin = 0;
  ctx.touchable(earth, { r: 0.45 }); // grab hint: dragging spins Earth
  ctx.onDrag(({ dx }) => { spin = dx * 4; });
  function update(t, dt) {
    a = Math.PI / 2 + (reducedMotion ? 0 : Math.min(t, 600) * 0.006);
    C.set(SUN.x + Math.cos(a) * R, 0.35, SUN.z + Math.sin(a) * R); ctx.setCamera([C.x, C.y, C.z], [SUN.x, SUN.y, SUN.z]);
    const f = SUN.clone().sub(C).setY(0).normalize(), r = V(-f.z, 0, f.x);
    earth.position.copy(C).addScaledVector(f, 6).addScaledVector(r, 1.6).setY(-0.7); earth.rotation.y += dt * 0.5 + spin * dt;
    const b = t * 0.4 + 2.2; moon.position.copy(earth.position).addScaledVector(r, Math.cos(b) * 1.6).addScaledVector(f, -Math.sin(b) * 1.6).add(V(0, 0.35, 0));
    path.geometry.setFromPoints([SUN, earth.position]); path.computeLineDistances();
    earthTag.position.copy(earth.position).addScaledVector(r, -1.05).add(V(0, -0.35, 0)); moonTag.position.copy(moon.position).add(V(0, 0.32, 0));
    lightTag.position.copy(SUN).lerp(earth.position, 0.62).add(V(0, 0.32, 0));
    const cam = ctx.camera; if (cam) { const A = SUN.clone().project(cam), B = earth.position.clone().project(cam); const ang = Math.atan2(B.y - A.y, (B.x - A.x) * cam.aspect); lightTag.material.rotation = Math.abs(ang) > Math.PI / 2 ? ang + Math.PI : ang; }
    title.position.copy(C).addScaledVector(f, 9).setY(2.3);
  }
  update(0, 0);
  return { update, dispose() {} };
}
