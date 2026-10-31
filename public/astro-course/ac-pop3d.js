// Pop-up 3D set pieces that need real depth (D01: cosmic address rings, Newton's cannon, seasons).
// They join the page's shared scene and renderer; spheres use a pencil-hatch texture, never gloss.
const INK = "#3d3d3d";

export function pencilTexture(T, base, accent, phone) {
  const n = phone ? 128 : 256, c = document.createElement("canvas"); c.width = n * 2; c.height = n;
  const g = c.getContext("2d");
  g.fillStyle = base; g.fillRect(0, 0, c.width, c.height);
  g.strokeStyle = accent; g.globalAlpha = 0.6; g.lineWidth = 1.5;
  for (let i = -c.height; i < c.width; i += 5) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i + c.height, c.height); g.stroke(); }
  g.globalAlpha = 0.3; g.strokeStyle = INK;
  for (let i = 0; i < c.width; i += 9) { g.beginPath(); g.moveTo(i, 0); g.lineTo(i - c.height * 0.6, c.height); g.stroke(); }
  const t = new T.CanvasTexture(c); t.colorSpace = T.SRGBColorSpace; return t;
}
function sphere(T, r, base, accent, phone) {
  const seg = phone ? 16 : 32;
  const m = new T.Mesh(new T.SphereGeometry(r, seg, seg / 2), new T.MeshLambertMaterial({ map: pencilTexture(T, base, accent, phone) }));
  return m;
}
function ring(T, r, color) {
  const pts = []; for (let i = 0; i <= 96; i++) { const a = i / 96 * Math.PI * 2; pts.push(new T.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r)); }
  return new T.Line(new T.BufferGeometry().setFromPoints(pts), new T.LineBasicMaterial({ color, transparent: true }));
}
function lights(T, g) { g.add(new T.AmbientLight(0xffffff, 1.6)); const d = new T.DirectionalLight(0xfff2d8, 1.4); d.position.set(-3, 4, 6); g.add(d); }

export function build(kind, T, scene, o) {
  const g = new T.Group(); scene.add(g); lights(T, g);
  const ctl = o.controls || {};
  let api = { update() {}, pointer: null };
  if (kind === "rings") {
    // Earth first, Observable Universe last; drag or the scrubber pulls the camera back through each ring.
    const names = ["Earth", "Solar System", "Milky Way", "Local Group", "Laniakea", "Observable Universe"];
    g.position.set(3.5, -0.4, 0.6); g.rotation.x = 0.9;
    const earth = sphere(T, 0.3, "#5b88b8", "#2f5a3a", o.phone); g.add(earth);
    const rings = names.slice(1).map((n, i) => { const r = ring(T, 0.55 * Math.pow(1.45, i), i % 2 ? "#3f6fa8" : "#c9862a"); r.position.y = -0.12 * i; g.add(r); return r; });
    let level = 0, shown = 0, touched = false;
    if (ctl.onLevel) ctl.onLevel(names, (v) => { level = v; touched = true; });
    api.update = (t, dt) => {
      if (!touched && !o.still) { level = Math.min(5, Math.max(0, (t - 1) / 1.6)); ctl.setLevel && ctl.setLevel(level); }
      shown += (level - shown) * Math.min(1, dt * 3 || 1);
      rings.forEach((r, i) => { r.material.opacity = Math.max(0.08, Math.min(1, shown - i + 1)); r.scale.setScalar(1 + Math.max(0, Math.min(1, shown - i)) * 0.08); });
      g.scale.setScalar(1 / Math.pow(1.12, shown)); earth.rotation.y += dt * 0.3;
    };
    let x0 = 0, l0 = 0;
    api.pointer = (e, r, ph) => { if (ph === "down") { x0 = e.clientX; l0 = level; touched = true; return true; } if (ph === "move") { level = Math.max(0, Math.min(5, l0 + (e.clientX - x0) / r.width * 8)); ctl.setLevel && ctl.setLevel(level); } };
  } else if (kind === "cannon") {
    // Newton's mountain: slow lands nearby, faster lands farther, orbital speed goes all the way round.
    g.position.set(2.6, -0.4, 0.4);
    const R = 1.6, earth = sphere(T, R, "#5b88b8", "#3f6b3a", o.phone); g.add(earth);
    const mtn = new T.Mesh(new T.ConeGeometry(0.22, 0.4, 8), new T.MeshLambertMaterial({ color: 0x8a7a66 })); mtn.position.y = R + 0.12; g.add(mtn);
    const ball = new T.Mesh(new T.SphereGeometry(0.06, 10, 8), new T.MeshLambertMaterial({ color: 0x3d3d3d })); g.add(ball);
    const trail = []; const trailGeo = new T.BufferGeometry(); const trailLine = new T.Line(trailGeo, new T.LineDashedMaterial({ color: 0x3d3d3d, dashSize: 0.06, gapSize: 0.05 })); g.add(trailLine);
    let p = null, v = null, speed = 0.6;
    const fire = () => { p = new T.Vector2(0, R + 0.34); v = new T.Vector2(speed * 1.35, 0); trail.length = 0; };
    if (ctl.onCannon) ctl.onCannon((s) => { speed = s; }, fire);
    const GM = 1.35 * 1.35 * (R + 0.34);
    api.update = (t, dt) => {
      earth.rotation.y += dt * 0.05;
      if (!p) { ball.position.set(0, R + 0.34, 0); return; }
      for (let k = 0; k < 4; k++) {
        const h = dt / 4, r2 = p.lengthSq(), r = Math.sqrt(r2), a = p.clone().multiplyScalar(-GM / (r2 * r));
        v.addScaledVector(a, h); p.addScaledVector(v, h);
        if (p.length() < R) { p.setLength(R); v.set(0, 0); }
      }
      ball.position.set(p.x, p.y, 0); trail.push(new T.Vector3(p.x, p.y, 0)); if (trail.length > 400) trail.shift();
      trailGeo.setFromPoints(trail); trailLine.computeLineDistances();
    };
    api.pointer = (e, r, ph) => { if (ph === "down") { fire(); return true; } };
  } else if (kind === "seasons") {
    // Tilted Earth on a paper orbit; the axis always points the same way (toward Polaris).
    g.position.set(1.4, -1.2, 0.2); g.rotation.x = 0.55;
    const sun = sphere(T, 0.4, "#f2c45a", "#c9862a", o.phone); g.add(sun);
    sun.material = new T.MeshBasicMaterial({ map: sun.material.map });
    g.add(ring(T, 2.4, "#3d3d3d"));
    const tilt = new T.Group(); tilt.rotation.z = 23.4 * Math.PI / 180; g.add(tilt);
    const earth = sphere(T, 0.22, "#5b88b8", "#3f6b3a", o.phone);
    const axis = new T.Line(new T.BufferGeometry().setFromPoints([new T.Vector3(0, -0.4, 0), new T.Vector3(0, 0.4, 0)]), new T.LineBasicMaterial({ color: 0xa34a3e }));
    tilt.add(earth); tilt.add(axis);
    const sunLight = new T.PointLight(0xffffff, 6, 0, 1.2); g.add(sunLight);
    let a = 0, va = 0.25;
    api.update = (t, dt) => { a += va * dt; const x = Math.cos(a) * 2.4, z = Math.sin(a) * 2.4; tilt.position.set(x, 0, z); earth.rotation.y += dt * 1.2; ctl.onAngle && ctl.onAngle(a); };
    let x0 = 0, a0 = 0;
    api.pointer = (e, r, ph) => { if (ph === "down") { x0 = e.clientX; a0 = a; va = 0; return true; } if (ph === "move") a = a0 + (e.clientX - x0) / r.width * 6; if (ph === "up") va = 0.25; };
  }
  if (kind === "starfield") {
    // Quiet star field only (D24.5 remembrance pages 17 to 20): slow twinkle, nothing else.
    const n = o.phone ? 220 : 500, pos = new Float32Array(n * 3);
    for (let i = 0; i < n; i++) { pos[i * 3] = (Math.random() - 0.5) * 18; pos[i * 3 + 1] = (Math.random() - 0.5) * 10; pos[i * 3 + 2] = -Math.random() * 3; }
    const geo = new T.BufferGeometry(); geo.setAttribute("position", new T.BufferAttribute(pos, 3));
    const mat = new T.PointsMaterial({ color: 0xf3ead7, size: 0.035, transparent: true, opacity: 0.8 });
    g.add(new T.Points(geo, mat));
    api.update = (t) => { mat.opacity = 0.65 + 0.15 * Math.sin(t * 0.6); };
  }
  // True 3D objects sketch in: wireframe edges draw on (0.6s), then the pencil hatch fills (0.4s).
  const solids = []; g.traverse((m) => { if (m.isMesh) { m.material.transparent = true; solids.push(m); } });
  const inner = api.update;
  api.update = (t, dt, cam) => {
    const k = o.still || api.skip ? 2 : t;
    for (const m of solids) { m.material.wireframe = k < 0.6; m.material.opacity = k < 0.6 ? Math.min(1, k / 0.6) : Math.min(1, 0.5 + (k - 0.6) / 0.8); }
    inner(t, dt, cam);
  };
  api.dispose = () => g.traverse((m) => { if (m.material && m.material.map) m.material.map.dispose(); });
  return api;
}
