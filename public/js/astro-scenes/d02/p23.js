// D02 p23 "Why eclipses are rare": a nearly edge-on view of Earth with the Moon's orbit tilted 5.1 deg
// to Earth's orbit plane (drawn exaggerated). Drag the Moon around its orbit; the Year slider (or Play)
// swings the Sun's direction around Earth. An eclipse needs a new or full Moon at a node: then the full
// Moon darkens in Earth's shadow, or the new Moon's shadow lands on Earth. The node line regresses
// clockwise seen from above, one turn per 18.6 years, sped up here (label text: deck.json sceneText.nodes).
// Geocentric; the eclipse test uses the true 5.1 deg tilt, only the drawing is exaggerated.
const ART = "v2/art/";
const TILT = 5.1, SHOW_TILT = 15, CAM_TILT = 12, R_MOON = 2.7, R_SUN = 4.7;
const NODE_YEARS = 18.6, SPEED = 6, MONTH_YEARS = 1 / 12.37, SYZYGY = 6, SOLAR = 1.5, LUNAR = 1.0;
const VIOLET = "#876DBE", RED = "#AD3B33", SHADOW = "#7B7E86";
const box = (b) => [b[0] / 16, b[1] / 9, (b[2] - b[0]) / 16, (b[3] - b[1]) / 9];
const rad = (d) => d * Math.PI / 180, deg = (r) => r * 180 / Math.PI;
const wrap = (a) => ((a % 360) + 540) % 360 - 180;

export default function build(ctx) {
  const { THREE: T, layers, palette: P, reducedMotion, phone } = ctx;
  const V = (x, y, z) => new T.Vector3(x, y, z);
  const ink = P.dark ? "#F3EAD7" : "#3D3D3D";
  ctx.art(ART + "p23-card.webp", { box: box([79, 38, 901, 419]), layer: "fg" });

  // the system sits where Earth is drawn and leans toward the viewer: a low oblique look at the planes
  const sys = new T.Group(), [ex, ey] = ctx.at(1000, 520); sys.position.set(ex, ey, 0); sys.rotation.x = rad(CAM_TILT); layers.mid.add(sys);
  const sprite = (src, size, color) => { const m = ctx.art(ART + src, { box: [0, 0, 1, 1], ink: false }); m.geometry.dispose(); m.geometry = new T.PlaneGeometry(size, size); m.position.set(0, 0, 0); if (color) m.material.color = new T.Color(color); sys.add(m); return m; };
  const earth = sprite("p23-earth.webp", 1.15), moon = sprite("p23-moon-full.webp", 0.46), sun = sprite("p23-sun.webp", 1.6);
  for (const m of [earth, moon, sun]) m.renderOrder = 3;
  const line = (pts, color, o = {}) => { const g = new T.BufferGeometry().setFromPoints(pts), m = o.dash ? new T.LineDashedMaterial({ color, dashSize: o.dash, gapSize: o.dash * 0.7, transparent: true, opacity: o.opacity ?? 1 }) : new T.LineBasicMaterial({ color, transparent: true, opacity: o.opacity ?? 1 }); const l = new T.Line(g, m); if (o.dash) l.computeLineDistances(); sys.add(l); return l; };
  const circle = (r, n = 128) => Array.from({ length: n + 1 }, (_, i) => V(Math.cos(i / n * 6.2832) * r, 0, -Math.sin(i / n * 6.2832) * r));

  // Earth's orbit plane: a faint pencil sheet with the Sun's path around its rim
  const plane = new T.Mesh(new T.CircleGeometry(R_SUN + 0.45, 96), new T.MeshBasicMaterial({ color: P.dark ? 0x3a4256 : 0xe4dccb, transparent: true, opacity: 0.55, side: T.DoubleSide, depthWrite: false }));
  plane.rotation.x = -Math.PI / 2; plane.renderOrder = -2; sys.add(plane);
  line(circle(R_SUN), P.ink, { dash: 0.22, opacity: 0.55 });
  ctx.sketch(plane, { delay: 0 });

  // the Moon's orbit, upper half solid and lower half dashed; the node line in red
  const half = () => Array.from({ length: 181 }, () => V(0, 0, 0));
  const upper = line(half(), VIOLET, { opacity: 0.95 }), lower = line(half(), VIOLET, { dash: 0.14, opacity: 0.6 }), nodes = line([V(0, 0, 0), V(1, 0, 0)], RED, { dash: 0.18 });
  const knot = [0, 1].map(() => { const m = new T.Mesh(new T.CircleGeometry(0.09, 20), new T.MeshBasicMaterial({ color: RED })); sys.add(m); return m; });
  // shadows: Earth's points away from the Sun; the Moon's toward Earth when it is new
  const cone = (len, r0) => { const g = new T.ConeGeometry(r0, len, 32, 1, true); g.translate(0, len / 2, 0); g.rotateX(-Math.PI / 2); return new T.Mesh(g, new T.MeshBasicMaterial({ color: SHADOW, transparent: true, opacity: 0.3, depthWrite: false, side: T.DoubleSide })); };
  const earthShadow = cone(4.6, 0.55), moonShadow = cone(R_MOON, 0.24); sys.add(earthShadow, moonShadow);
  const spot = new T.Mesh(new T.CircleGeometry(0.16, 24), new T.MeshBasicMaterial({ color: 0x2a2a2a, transparent: true, opacity: 0 })); sys.add(spot);

  const moonTag = ctx.label("Moon's orbit (tilt exaggerated)", [0, 0, 0], { layer: "mid", h: 0.42, color: VIOLET }); sys.add(moonTag);
  const planeTag = ctx.label("Earth's orbit plane", [0, 0, 0], { layer: "mid", h: 0.4, color: ink }); sys.add(planeTag);
  // the node label, word for word from deck.json, written along the bottom of the page
  const note = ctx.paint([440, 770, 1560, 890], { layer: "fg" });
  const noteText = (ctx.text && ctx.text.nodes) || "";
  const drawNote = () => note.redraw((g) => {
    g.fillStyle = RED; g.font = `${(phone ? 38 : 30)}px "Gochi Hand"`; g.textBaseline = "top";
    const words = noteText.split(" "), lines = [""]; for (const w of words) { const t = lines[lines.length - 1] ? lines[lines.length - 1] + " " + w : w; if (g.measureText(t).width > 1080 && lines[lines.length - 1]) lines.push(w); else lines[lines.length - 1] = t; }
    lines.forEach((l, i) => g.fillText(l, 450, 778 + i * (phone ? 42 : 34)));
  });
  drawNote();
  if (globalThis.document && document.fonts) document.fonts.load('30px "Gochi Hand"').then(drawNote, () => {});
  ctx.touchable(moon, { r: 0.4 });

  // state: years since the start; u = the Moon's angle from its ascending node
  let years = 0, u = 90, playing = false, dragging = false;
  const sunLon = () => 180 + 360 * years, node = () => 270 - 360 * years * SPEED / NODE_YEARS;
  const slider = ctx.ui && ctx.ui.slider({ label: "Year", min: 0, max: 3.1, step: 0.01, value: 0, fmt: (v) => v.toFixed(2) }, (v) => { years = v; playing = false; play && play.set("Play"); place(); });
  const play = ctx.ui && ctx.ui.button("Play", () => { playing = !playing; play.set(playing ? "Pause" : "Play"); });

  // ecliptic (x, y) with y away from the viewer; tilt i in degrees; height above the plane from sin u
  function orbitPoint(Om, uu, i, r = R_MOON) {
    const O = rad(Om), U = rad(uu), I = rad(i);
    const x = r * (Math.cos(O) * Math.cos(U) - Math.sin(O) * Math.sin(U) * Math.cos(I)), y = r * (Math.sin(O) * Math.cos(U) + Math.cos(O) * Math.sin(U) * Math.cos(I));
    return V(x, r * Math.sin(U) * Math.sin(I), -y);
  }
  const face = (m) => { m.rotation.set(-sys.rotation.x, 0, 0); };
  function place() {
    const Om = node(), ls = sunLon(), S = V(Math.cos(rad(ls)) * R_SUN, 0, -Math.sin(rad(ls)) * R_SUN);
    sun.position.copy(S); face(sun); face(earth); face(moon);
    const up = [], lo = [];
    for (let k = 0; k <= 180; k++) { up.push(orbitPoint(Om, k, SHOW_TILT)); lo.push(orbitPoint(Om, 180 + k, SHOW_TILT)); }
    upper.geometry.setFromPoints(up); lower.geometry.setFromPoints(lo); lower.computeLineDistances();
    const n1 = orbitPoint(Om, 0, SHOW_TILT, R_MOON * 1.25), n2 = orbitPoint(Om, 180, SHOW_TILT, R_MOON * 1.25);
    nodes.geometry.setFromPoints([n1, n2]); nodes.computeLineDistances();
    knot[0].position.copy(orbitPoint(Om, 0, SHOW_TILT)); knot[1].position.copy(orbitPoint(Om, 180, SHOW_TILT)); knot.forEach(face);
    const M = orbitPoint(Om, u, SHOW_TILT); moon.position.copy(M);
    // shadows point away from the Sun
    const away = S.clone().negate().normalize();
    earthShadow.quaternion.copy(new T.Quaternion().setFromUnitVectors(V(0, 0, -1), away));
    moonShadow.position.copy(M); moonShadow.quaternion.copy(new T.Quaternion().setFromUnitVectors(V(0, 0, -1), S.clone().sub(M).negate().normalize()));
    // the eclipse test, with the true 5.1 deg tilt
    const lm = Om + deg(Math.atan2(Math.sin(rad(u)) * Math.cos(rad(TILT)), Math.cos(rad(u)))), beta = deg(Math.asin(Math.sin(rad(TILT)) * Math.sin(rad(u))));
    const elong = wrap(lm - ls), solar = Math.abs(elong) < SYZYGY && Math.abs(beta) < SOLAR, lunar = Math.abs(wrap(elong - 180)) < SYZYGY && Math.abs(beta) < LUNAR;
    moon.material.color.set(lunar ? 0xc0623f : 0xffffff);
    earthShadow.material.opacity = lunar ? 0.5 : 0.22; moonShadow.material.opacity = solar ? 0.5 : 0;
    spot.material.opacity = solar ? 0.75 : 0; spot.position.copy(S.clone().normalize().multiplyScalar(0.05)).add(V(0, M.y * 0.2, 0.7)); face(spot);
    // labels: Moon's orbit above its far side, the plane's name at its front-right rim
    moonTag.position.copy(orbitPoint(Om, 90, SHOW_TILT)).add(V(0, 0.55, 0));
    planeTag.position.set(R_SUN * 0.35, -0.25, R_SUN + 0.9);
    slider && slider.set(Math.round(years * 100) / 100);
  }
  // drag the Moon: pick the orbit angle whose screen position is nearest the pointer
  const ndcOf = (u2) => sys.localToWorld(orbitPoint(node(), u2, SHOW_TILT)).project(ctx.camera);
  ctx.onPointer(({ phase, ndc }) => {
    if (!ndc) return false;
    sys.updateMatrixWorld(true); ctx.camera.updateMatrixWorld();
    let best = u, bd = 1e9; for (let k = 0; k < 360; k += 2) { const p = ndcOf(k), d = Math.hypot(p.x - ndc[0], (p.y - ndc[1]) / 1.8); if (d < bd) { bd = d; best = k; } }
    if (phase === "down") { if (bd > 0.12) return false; dragging = true; playing = false; play && play.set("Play"); }
    if (!dragging) return false;
    if (phase === "up") { dragging = false; return true; }
    u = best; place(); return true;
  });
  place();
  return {
    update(t, dt) {
      if (!playing || dragging) return;
      // one month every 3 s (reduced motion: the Moon jumps in 30 deg steps)
      const step = reducedMotion ? 0 : dt; if (!step && t % 1 > 0.05) return;
      const dy = (step || 0.25) * MONTH_YEARS / 3; years = Math.min(3.1, years + dy); u = (u + 360 * dy / MONTH_YEARS) % 360;
      if (years >= 3.1) { playing = false; play && play.set("Play"); }
      place();
    },
    dispose() {},
  };
}
