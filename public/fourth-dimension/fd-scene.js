// Beyond 3D: Three.js stage and one builder per page scene. All 4D math comes from fd-math.js;
// this file only turns points into lines, fills and lights. Geometry is preallocated per page
// and rewritten in place each frame (no per-frame allocation of GPU buffers), then disposed on
// page change.
import * as THREE from "../vendor/three/three.module.min.js";
import * as M from "./fd-math.js";

const V3 = THREE.Vector3;
export const FLOOR_Y = -1.6;
export const LIGHT = [1.4, 3.6, 1.2];

// ---------- small GPU helpers ----------
class Lines {
  constructor(max, color, opacity = 1) {
    this.pos = new Float32Array(max * 6); this.max = max;
    this.geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.pos, 3); this.attr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute("position", this.attr);
    this.mat = new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity, depthWrite: opacity >= 1 });
    this.obj = new THREE.LineSegments(this.geo, this.mat); this.obj.frustumCulled = false; this.n = 0;
  }
  begin() { this.n = 0; }
  seg(a, b) { if (this.n >= this.max) return; const o = this.n * 6; const p = this.pos;
    p[o] = a[0]; p[o + 1] = a[1]; p[o + 2] = a[2]; p[o + 3] = b[0]; p[o + 4] = b[1]; p[o + 5] = b[2]; this.n++; }
  end() { this.geo.setDrawRange(0, this.n * 2); this.attr.needsUpdate = true; }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}
class Fan {
  // Convex polygons drawn as triangle fans; several polygons per object.
  constructor(maxTris, color, opacity = 0.35, { additive = false, lit = false } = {}) {
    this.pos = new Float32Array(maxTris * 9); this.max = maxTris;
    this.geo = new THREE.BufferGeometry();
    this.attr = new THREE.BufferAttribute(this.pos, 3); this.attr.setUsage(THREE.DynamicDrawUsage);
    this.geo.setAttribute("position", this.attr);
    const base = { color, transparent: true, opacity, side: THREE.DoubleSide, depthWrite: false, blending: additive ? THREE.AdditiveBlending : THREE.NormalBlending };
    this.mat = lit ? new THREE.MeshStandardMaterial({ ...base, roughness: 0.15, metalness: 0.1 }) : new THREE.MeshBasicMaterial(base);
    this.lit = lit;
    this.obj = new THREE.Mesh(this.geo, this.mat); this.obj.frustumCulled = false; this.n = 0;
  }
  begin() { this.n = 0; }
  poly(pts) {
    for (let i = 1; i + 1 < pts.length; i++) {
      if (this.n >= this.max) return;
      const o = this.n * 9, p = this.pos, a = pts[0], b = pts[i], c = pts[i + 1];
      p[o] = a[0]; p[o + 1] = a[1]; p[o + 2] = a[2]; p[o + 3] = b[0]; p[o + 4] = b[1]; p[o + 5] = b[2]; p[o + 6] = c[0]; p[o + 7] = c[1]; p[o + 8] = c[2];
      this.n++;
    }
  }
  end() { this.geo.setDrawRange(0, this.n * 3); this.attr.needsUpdate = true; if (this.lit) this.geo.computeVertexNormals(); }
  dispose() { this.geo.dispose(); this.mat.dispose(); }
}
function glowTexture() {
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  r.addColorStop(0, "rgba(255,255,255,0.9)"); r.addColorStop(0.45, "rgba(255,255,255,0.35)"); r.addColorStop(1, "rgba(255,255,255,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}

// ---------- stage ----------
export function createStage(canvas, { lowEnd = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: "high-performance" });
  renderer.toneMapping = THREE.ACESFilmicToneMapping; // the only "post" step (spec)
  const maxDpr = lowEnd ? 1.5 : 2;
  let dpr = Math.min(window.devicePixelRatio || 1, maxDpr);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(42, 1, 0.1, 100);
  const room = new THREE.Group(); scene.add(room);
  const amb = new THREE.HemisphereLight(0x9fc4ff, 0x10141c, 0.9); scene.add(amb);
  const spot = new THREE.SpotLight(0xffffff, 40, 20, Math.PI / 5, 0.6, 1.4);
  spot.position.set(...LIGHT); spot.target.position.set(0, FLOOR_Y, 0); scene.add(spot, spot.target);
  const glowTex = glowTexture();
  let pal = null, grids = [], floor = null, current = null, roomVisible = true;

  function buildRoom() {
    for (const o of [...room.children]) { room.remove(o); o.geometry?.dispose(); (Array.isArray(o.material) ? o.material : [o.material]).forEach((m) => m?.dispose()); }
    grids = [];
    const mk = () => { const g = new THREE.GridHelper(14, 28, pal.grid, pal.grid); g.material.transparent = true; g.material.opacity = pal.gridOpacity; g.material.depthWrite = false; return g; };
    const gf = mk(); gf.position.y = FLOOR_Y;
    const gb = mk(); gb.rotation.x = Math.PI / 2; gb.position.set(0, FLOOR_Y + 7, -5); gb.scale.x = 1.7;
    const gl = mk(); gl.rotation.z = Math.PI / 2; gl.position.set(-6, FLOOR_Y + 7, 2);
    floor = new THREE.Mesh(new THREE.PlaneGeometry(14, 14), new THREE.MeshStandardMaterial({ color: pal.floor, roughness: 0.95, emissive: pal.floor, emissiveIntensity: pal.light ? 0.75 : 0.55 }));
    floor.rotation.x = -Math.PI / 2; floor.position.y = FLOOR_Y - 0.005;
    const back = new THREE.Mesh(new THREE.PlaneGeometry(24, 14), new THREE.MeshStandardMaterial({ color: pal.wall, roughness: 0.95, emissive: pal.wall, emissiveIntensity: pal.light ? 0.85 : 0.6 }));
    back.position.set(0, FLOOR_Y + 7, -5.005);
    const left = back.clone(); left.material = back.material.clone(); left.rotation.y = Math.PI / 2; left.position.set(-6.005, FLOOR_Y + 7, 2);
    room.add(floor, back, left, gf, gb, gl); grids = [gf, gb, gl];
    scene.background = new THREE.Color(pal.bg);
    spot.intensity = pal.light ? 14 : 40;
  }
  function setPalette(p) { pal = p; buildRoom(); if (current) current.recolor?.(pal); }
  function resize() {
    const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
    renderer.setPixelRatio(dpr); renderer.setSize(w, h, false);
    camera.aspect = w / h;
    // Keep the subject the same visual size on narrow phones.
    camera.fov = w / h < 0.8 ? 72 : 42; camera.updateProjectionMatrix();
  }
  function setCamera(pos, look = [0, 0, 0]) { camera.position.set(...pos); camera.lookAt(...look); }
  function setScene(builder) {
    if (current) { current.dispose(); for (const o of current.objects) scene.remove(o); }
    current = builder;
    for (const o of builder.objects) scene.add(o);
    setCamera(builder.camera || [0, 0.9, 7.2], builder.look || [0, 0, 0]);
    room.visible = roomVisible = builder.room !== false;
  }
  return {
    renderer, scene, camera, THREE, glowTex,
    get pal() { return pal; }, get dpr() { return dpr; },
    lowerDpr() { if (dpr > 1) { dpr = Math.max(1, dpr - 0.5); resize(); return true; } return false; },
    setPalette, resize, setScene, setCamera,
    render() { renderer.render(scene, camera); },
    dispose() { if (current) current.dispose(); glowTex.dispose(); renderer.dispose(); }
  };
}

// ---------- shared 3D/4D view state ----------
// view = { q: THREE.Quaternion (3D turn), R: 4x4 (4D turn), proj: "perspective"|"ortho" }
export function newView(saved) {
  const q = new THREE.Quaternion();
  if (saved?.q) q.fromArray(saved.q); else q.setFromEuler(new THREE.Euler(-0.35, 0.55, 0));
  return { q, R: saved?.R ? saved.R.map((r) => r.slice()) : M.identity(4), proj: saved?.proj || "perspective", steps: 0 };
}
const _x = new V3(1, 0, 0), _y = new V3(0, 1, 0), _tq = new THREE.Quaternion();
export function turn3(view, dx, dy) {
  _tq.setFromAxisAngle(_y, dx); view.q.premultiply(_tq);
  _tq.setFromAxisAngle(_x, dy); view.q.premultiply(_tq);
}
export function turn4(view, plane, a) {
  view.R = M.mul(M.rot(plane, a), view.R);
  if (++view.steps % 60 === 0) view.R = M.orthonormalize(view.R);
}
const _v = new V3();
function to3(view, p4, scale = 1, offset = [0, 0, 0]) {
  const p = view.proj === "ortho" ? M.projectOrtho(p4) : M.projectPerspective(p4);
  _v.set(p[0] * scale, p[1] * scale, p[2] * scale).applyQuaternion(view.q);
  return [_v.x + offset[0], _v.y + offset[1], _v.z + offset[2]];
}
function q3(view, p, scale = 1, offset = [0, 0, 0]) {
  _v.set(p[0] * scale, p[1] * scale, p[2] * scale).applyQuaternion(view.q);
  return [_v.x + offset[0], _v.y + offset[1], _v.z + offset[2]];
}

// Glass wireframe of any polytope (4D points, rotated by view.R, projected, turned by view.q).
function polyRenderer(stage, poly, { scale = 1, offset = [0, 0, 0], goldIds = null, faces = true, maxFaceTris } = {}) {
  const pal = stage.pal;
  const edges = new Lines(poly.E.length, pal.edge, 0.95);
  const gold = new Lines(poly.E.length, pal.gold, 1);
  const glass = new Fan(maxFaceTris || poly.F.length * 2, pal.glass, pal.glassOpacity, { lit: true });
  const goldFill = new Fan(poly.F.length * 2, pal.gold, 0.32);
  const dots = new THREE.Points(new THREE.BufferGeometry(), new THREE.PointsMaterial({ color: pal.edge, size: 0.07 }));
  const dpos = new Float32Array(poly.V.length * 3); dots.geometry.setAttribute("position", new THREE.BufferAttribute(dpos, 3)); dots.frustumCulled = false;
  let gset = goldIds ? new Set(goldIds) : null;
  const out = {
    objects: [glass.obj, goldFill.obj, edges.obj, gold.obj, dots],
    pts: [], world: [],
    setGold(ids) { gset = ids ? new Set(ids) : null; },
    draw(view, V = poly.V) {
      const R = view.R;
      const rotated = V.map((p) => M.apply(R, p));
      const P = rotated.map((p) => to3(view, p, scale, offset));
      out.pts = P; out.rotated = rotated;
      edges.begin(); gold.begin();
      for (const [i, j] of poly.E) (gset && gset.has(i) && gset.has(j) ? gold : edges).seg(P[i], P[j]);
      edges.end(); gold.end();
      glass.begin(); goldFill.begin();
      if (faces) for (const f of poly.F) {
        const g = gset && f.every((i) => gset.has(i));
        (g ? goldFill : glass).poly(f.map((i) => P[i]));
      }
      glass.end(); goldFill.end();
      for (let i = 0; i < P.length; i++) { dpos[i * 3] = P[i][0]; dpos[i * 3 + 1] = P[i][1]; dpos[i * 3 + 2] = P[i][2]; }
      dots.geometry.attributes.position.needsUpdate = true;
      return P;
    },
    recolor(p) { edges.mat.color.set(p.edge); gold.mat.color.set(p.gold); glass.mat.color.set(p.glass); glass.mat.opacity = p.glassOpacity; goldFill.mat.color.set(p.gold); dots.material.color.set(p.edge); },
    dispose() { edges.dispose(); gold.dispose(); glass.dispose(); goldFill.dispose(); dots.geometry.dispose(); dots.material.dispose(); }
  };
  return out;
}
function glowDisc(stage, color, size, opacity = 0.6) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(size, size), new THREE.MeshBasicMaterial({ map: stage.glowTex, color, transparent: true, opacity, depthWrite: false, blending: THREE.AdditiveBlending }));
  m.rotation.x = -Math.PI / 2; m.position.y = FLOOR_Y + 0.01; return m;
}
function disposeObj(o) { o.traverse?.((c) => { c.geometry?.dispose(); if (c.material) (Array.isArray(c.material) ? c.material : [c.material]).forEach((m) => m.dispose()); }); }

// ---------- the paper guide (basic shapes, ink outline) ----------
// Flat: lies in the z = 0 plane. Standee: same figure on a thin card with a base.
function paperFigure(pal, { standee = false } = {}) {
  const g = new THREE.Group();
  const paper = new THREE.MeshBasicMaterial({ color: pal.paper, side: THREE.DoubleSide });
  const ink = new THREE.LineBasicMaterial({ color: pal.ink, linewidth: 2 });
  const add = (shape) => {
    const fill = new THREE.Mesh(new THREE.ShapeGeometry(shape, 12), paper); g.add(fill);
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(shape.getPoints(24).map((p) => new V3(p.x, p.y, 0.02))), ink); line.renderOrder = 2; g.add(line);
  };
  const body = new THREE.Shape(); // rounded triangle-ish body
  body.moveTo(-0.32, 0); body.quadraticCurveTo(-0.34, 0.55, 0, 0.62); body.quadraticCurveTo(0.34, 0.55, 0.32, 0); body.lineTo(-0.32, 0);
  add(body);
  const head = new THREE.Shape(); head.absarc(0, 0.86, 0.2, 0, Math.PI * 2, false); add(head);
  const eye = new THREE.Mesh(new THREE.CircleGeometry(0.045, 16), new THREE.MeshBasicMaterial({ color: pal.ink }));
  eye.position.set(0.07, 0.88, 0.02); g.add(eye); g.userData.eye = eye;
  const arm = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new V3(0.26, 0.38, 0.004), new V3(0.55, 0.62, 0.004)]), ink); g.add(arm);
  if (standee) {
    const base = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.32, 0.05, 20), new THREE.MeshStandardMaterial({ color: pal.edge, roughness: 0.6 }));
    base.position.y = 0.025; g.add(base);
    for (const c of g.children) if (c !== base) c.position.y += 0.05;
  }
  g.userData.dispose = () => disposeObj(g);
  return g;
}

// ---------- scene builders ----------
// Each returns { objects, camera?, look?, room?, drag: "3d"|"4d"|"extrude"|"none", controls,
// update(dt, ctx), dispose(), save(), event? }. ctx = { view, values, reduced, time }.
export const SCENES = {};

SCENES.extrude = (stage, page, saved) => {
  const n = page.opts.n, view = newView(saved);
  const poly = n === 0 ? { V: [[0, 0, 0, 0]], E: [], F: [] } : M.hypercube(n);
  // For n = 4 show w with perspective; others draw plainly.
  const r = polyRenderer(stage, poly, { scale: n === 4 ? 1.35 : 1.1, faces: n >= 2 });
  const pointGlow = new THREE.Mesh(new THREE.SphereGeometry(0.09, 16, 12), new THREE.MeshBasicMaterial({ color: stage.pal.gold }));
  const disc = glowDisc(stage, stage.pal.edge, 4, 0.35);
  let t = saved?.t ?? (page.opts.start ?? 0), snap = null;
  if (n < 3 && !saved?.q) view.q.identity();
  const axis = Math.max(0, n - 1);
  const objs = [...r.objects, pointGlow, disc];
  return {
    objects: objs, drag: n === 0 ? "none" : "extrude",
    controls: { sliders: n ? [{ key: "t", label: n === 4 ? "Push into w" : "Stretch", min: 0, max: 1, step: 0.01, value: t }] : [] },
    extrude(dt) { t = Math.min(1, Math.max(0, t + dt)); snap = null; return t; },
    release() { snap = t > 0.5 ? 1 : (t < 0.08 ? 0 : 1); },
    set(key, v) { if (key === "t") { t = v; snap = null; } },
    update(dt, ctx) {
      if (snap !== null) { t += (snap - t) * Math.min(1, dt * 10); if (Math.abs(t - snap) < 0.002) { t = snap; snap = null; } ctx.sync?.("t", t); }
      if (n >= 3 && !ctx.reduced && !ctx.dragging) turn3(view, dt * 0.25, 0);
      if (n === 2 && !saved?.q) view.q.setFromEuler(new THREE.Euler(-0.5, 0, 0));
      const V = poly.V.map((p) => { const q = p.slice(); if (n) q[axis] = p[axis] < 0 ? -1 : -1 + 2 * t; return q; });
      if (n && n < 4) for (const q of V) q[axis] += 1 - t; // keep the shape centered while it grows
      r.draw(view, V);
      pointGlow.position.set(...r.pts[0]); pointGlow.visible = n <= 1;
      ctx.report?.({ type: "extrude", n, t });
    },
    view,
    save: () => ({ q: view.q.toArray(), R: view.R, t }),
    recolor: (p) => r.recolor(p),
    dispose() { r.dispose(); disposeObj(pointGlow); disposeObj(disc); }
  };
};

SCENES.flatland = (stage, page, saved) => {
  const mode = page.opts.mode, pal = stage.pal;
  const wall = new THREE.Group();
  const pane = new THREE.Mesh(new THREE.PlaneGeometry(7, 4.2), new THREE.MeshBasicMaterial({ color: pal.edge, transparent: true, opacity: 0.07, side: THREE.DoubleSide, depthWrite: false }));
  const grid = new THREE.GridHelper(7, 14, pal.grid, pal.grid); grid.rotation.x = Math.PI / 2; grid.material.transparent = true; grid.material.opacity = 0.35; grid.scale.set(1, 1, 0.6);
  const frame = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(7, 4.2)), new THREE.LineBasicMaterial({ color: pal.edge }));
  wall.add(pane, grid, frame); wall.position.y = 0.4;
  const fig = paperFigure(pal); fig.position.set(-2.2, -1.2, 0.01); fig.scale.setScalar(1.3); wall.add(fig);
  const cut = new Lines(64, pal.gold, 1), cutFill = new Fan(64, pal.gold, 0.35);
  const R = 1.2;
  const ball = new THREE.Mesh(new THREE.IcosahedronGeometry(R, 2), new THREE.MeshStandardMaterial({ color: pal.glass, transparent: true, opacity: 0.22, roughness: 0.1, depthWrite: false }));
  const ballWire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(R, 1)), new THREE.LineBasicMaterial({ color: pal.edge, transparent: true, opacity: 0.45 }));
  ball.add(ballWire);
  const cube = M.hypercube(3), view = newView();
  view.q.setFromEuler(new THREE.Euler(Math.atan(Math.SQRT1_2), Math.PI / 4, 0, "YXZ"));
  const cr = polyRenderer(stage, cube, { scale: 0.9, faces: true });
  let z = saved?.z ?? (mode === "meet" ? 3 : 2.2);
  const objs = [wall, cut.obj, cutFill.obj];
  if (mode === "sphere") objs.push(ball); if (mode === "cube") objs.push(...cr.objects);
  return {
    objects: objs, camera: [4.6, 1.6, 6.4], look: [0, 0.1, 0], drag: "none",
    controls: { sliders: mode === "meet" ? [] : [{ key: "z", label: "Push through the wall", min: -2.2, max: 2.2, step: 0.01, value: z, reverse: true }] },
    set(k, v) { if (k === "z") z = v; },
    update(dt, ctx) {
      cut.begin(); cutFill.begin();
      let size = 0;
      if (mode === "sphere") {
        ball.position.set(0.8, 0.4, z);
        const r = M.sliceRadius(R, z); size = r;
        const pts = []; for (let i = 0; i <= 48; i++) { const a = (i / 48) * Math.PI * 2; pts.push([0.8 + r * Math.cos(a), 0.4 + r * Math.sin(a), 0.01]); }
        if (r > 0) { for (let i = 0; i < 48; i++) cut.seg(pts[i], pts[i + 1]); cutFill.poly(pts); }
      } else if (mode === "cube") {
        const off = [0.8, 0.4, z];
        const P = cr.draw(view).map((p) => [p[0] + off[0], p[1] + off[1], p[2] + off[2]]);
        // move the drawn cube too
        for (const o of cr.objects) o.position.set(...off);
        const s = M.slice(P, cube.F, 2, 0);
        for (const [a, b] of s.segments) cut.seg([a[0], a[1], 0.01], [b[0], b[1], 0.01]);
        if (s.points.length >= 3) cutFill.poly(M.orderPolygon(s.points, 2).map((p) => [p[0], p[1], 0.01]));
        size = s.points.length;
        ctx.readout?.(s.points.length >= 3 ? `Flick sees a shape with ${s.points.length} sides` : "Flick sees nothing (or a single point)");
      } else {
        const tt = ctx.time;
        if (!ctx.reduced) fig.position.x = -2.2 + Math.sin(tt * 0.6) * 0.6;
      }
      if (mode === "sphere") ctx.readout?.(size > 0 ? `Circle radius ${size.toFixed(2)} (ball radius ${R})` : "Nothing in Flatland right now");
      cut.end(); cutFill.end();
      // the guide startles when something appears
      const eye = fig.userData.eye, s = size > 0 ? 1.5 : 1; eye.scale.setScalar(eye.scale.x + (s - eye.scale.x) * Math.min(1, dt * 8));
    },
    save: () => ({ z }),
    dispose() { disposeObj(wall); fig.userData.dispose(); cut.dispose(); cutFill.dispose(); disposeObj(ball); cr.dispose(); }
  };
};

SCENES.shadow = (stage, page, saved) => {
  const pal = stage.pal, view = newView(saved), cube = M.hypercube(3);
  const center = [0, 0.5, 0];
  const r = polyRenderer(stage, cube, { scale: 0.8, offset: center, goldIds: [1, 3, 5, 7] }); // x = +1 face
  const shade = new Fan(16, pal.shadow, 0.55), goldShade = new Fan(4, pal.gold, 0.55);
  const disc = glowDisc(stage, pal.edge, 7, 0.4);
  const bulb = new THREE.Mesh(new THREE.SphereGeometry(0.12, 16, 12), new THREE.MeshBasicMaterial({ color: 0xfff3c4 }));
  bulb.position.set(...LIGHT);
  const beam = new Lines(8, pal.gold, 0.25);
  const fig = paperFigure(pal, { standee: true }); fig.position.set(-2.6, FLOOR_Y, 0.6); fig.rotation.y = 0.5;
  const goldNormal = new V3();
  return {
    objects: [disc, shade.obj, goldShade.obj, ...r.objects, bulb, beam.obj, fig], drag: "3d", view,
    controls: {}, camera: [0.5, 1.6, 7.6], look: [0, -0.2, 0],
    update(dt, ctx) {
      const P = r.draw(view);
      shade.begin(); goldShade.begin(); beam.begin();
      const S = P.map((p) => M.shadowOnFloor(p, LIGHT, FLOOR_Y + 0.012));
      const h = M.hull2(S.map((p) => [p[0], p[2]]));
      shade.poly(h.map(([x, z]) => [x, FLOOR_Y + 0.012, z]));
      if (page.opts.goldShadow !== false) goldShade.poly([1, 3, 7, 5].map((i) => [S[i][0], FLOOR_Y + 0.016, S[i][2]]));
      for (const i of [0, 3, 5, 6]) beam.seg(LIGHT, S[i]);
      shade.end(); goldShade.end(); beam.end();
      // Gold face visible to the camera?
      goldNormal.set(1, 0, 0).applyQuaternion(view.q);
      const toCam = new V3(...stage.camera.position.toArray()).sub(new V3(...center)).normalize();
      const facing = goldNormal.dot(toCam);
      ctx.report?.({ type: "goldface", facing, user: ctx.userMoved });
      ctx.readout?.(`Shadow area ${M.polyArea(h).toFixed(2)} square units`);
    },
    save: () => ({ q: view.q.toArray() }),
    recolor: (p) => r.recolor(p),
    dispose() { r.dispose(); shade.dispose(); goldShade.dispose(); beam.dispose(); disposeObj(disc); disposeObj(bulb); fig.userData.dispose(); }
  };
};

SCENES.slicecube = (stage, page, saved) => {
  const pal = stage.pal, view = newView(saved), cube = M.hypercube(3);
  const r = polyRenderer(stage, cube, { scale: 1 });
  const cut = new Lines(12, pal.gold), fill = new Fan(12, pal.gold, 0.45);
  const knife = new THREE.Mesh(new THREE.PlaneGeometry(4.4, 4.4), new THREE.MeshBasicMaterial({ color: pal.edge, transparent: true, opacity: 0.08, side: THREE.DoubleSide, depthWrite: false }));
  knife.rotation.x = -Math.PI / 2;
  const kedge = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.PlaneGeometry(4.4, 4.4)), new THREE.LineBasicMaterial({ color: pal.edge, transparent: true, opacity: 0.5 })); knife.add(kedge);
  let c = saved?.c ?? 0;
  return {
    objects: [...r.objects, knife, fill.obj, cut.obj], drag: "3d", view,
    controls: { sliders: [{ key: "c", label: "Knife height", min: -1.8, max: 1.8, step: 0.01, value: c }], buttons: [{ key: "corner", label: "Corner up" }] },
    set(k, v) { if (k === "c") c = v; if (k === "corner") view.q.setFromEuler(new THREE.Euler(Math.atan(Math.SQRT1_2), Math.PI / 4, 0, "XYZ")).premultiply(new THREE.Quaternion().setFromAxisAngle(_x, 0)); },
    update(dt, ctx) {
      const P = r.draw(view);
      knife.position.y = c;
      const s = M.slice(P, cube.F, 1, c);
      cut.begin(); fill.begin();
      for (const [a, b] of s.segments) cut.seg(a, b);
      if (s.points.length >= 3) fill.poly(M.orderPolygon(s.points, 1));
      cut.end(); fill.end();
      const names = { 3: "triangle", 4: "four-sided shape", 5: "pentagon", 6: "hexagon" };
      ctx.readout?.(s.points.length >= 3 ? `The cut is a ${names[s.points.length] || s.points.length + "-gon"}` : "The knife misses the cube");
      ctx.report?.({ type: "slice3", sides: s.points.length });
    },
    save: () => ({ q: view.q.toArray(), c }),
    recolor: (p) => r.recolor(p),
    dispose() { r.dispose(); cut.dispose(); fill.dispose(); disposeObj(knife); }
  };
};

SCENES.counting = (stage, page, saved) => {
  const view = newView(saved), parts = [];
  const xs = [-3.6, -2.2, -0.6, 1.2, 3.3];
  for (let n = 0; n <= 4; n++) {
    const poly = n === 0 ? { V: [[0, 0, 0, 0]], E: [], F: [] } : M.hypercube(n);
    parts.push({ n, poly, r: polyRenderer(stage, poly, { scale: n === 4 ? 0.75 : 0.5, offset: [xs[n], 0, 0], faces: n === 2 || n === 3 }) });
  }
  const dot = new THREE.Mesh(new THREE.SphereGeometry(0.08, 12, 8), new THREE.MeshBasicMaterial({ color: stage.pal.gold })); dot.position.set(xs[0], 0, 0);
  return {
    objects: [...parts.flatMap((p) => p.r.objects), dot], drag: "3d", view, table: true, camera: [0, 0.6, 8.4],
    update(dt, ctx) {
      if (!ctx.reduced && !ctx.dragging) { turn3(view, dt * 0.3, 0); turn4(view, "XW", dt * 0.25); }
      const R4 = view.R;
      for (const p of parts) { if (p.n < 4) view.R = M.identity(4); p.r.draw(view); view.R = R4; }
    },
    save: () => ({ q: view.q.toArray(), R: view.R }),
    recolor: (pal) => parts.forEach((p) => p.r.recolor(pal)),
    dispose() { parts.forEach((p) => p.r.dispose()); disposeObj(dot); }
  };
};

function tesseractScene(stage, page, saved, { cellCycle = false } = {}) {
  const view = newView(saved); view.proj = saved?.proj || page.opts.proj || "perspective";
  const poly = M.hypercube(4), cells = M.tesseractCells();
  if (page.opts.tilt && !saved?.R) view.R = M.mul(M.rot("YW", 0.45), M.rot("XW", 0.6)); // start off-axis so the challenge needs work
  let cell = saved?.cell ?? 6; // axis w, sign -1: the small inner cube in perspective
  const r = polyRenderer(stage, poly, { scale: 1.35, goldIds: cells[cell].ids });
  const disc = glowDisc(stage, stage.pal.edge, 6, 0.45);
  const shade = new Fan(16, stage.pal.shadow, 0.4), goldShade = new Fan(8, stage.pal.gold, 0.4);
  return {
    objects: [disc, shade.obj, goldShade.obj, ...r.objects], drag: page.opts.mode === "4d" ? "4d" : "3d", view, has4d: true, hasProj: !cellCycle,
    controls: {},
    tap() { if (!cellCycle) return; cell = (cell + 1) % 8; r.setGold(cells[cell].ids); },
    update(dt, ctx) {
      const P = r.draw(view);
      shade.begin(); goldShade.begin();
      const S = P.map((p) => M.shadowOnFloor(p, LIGHT, FLOOR_Y + 0.012));
      shade.poly(M.hull2(S.map((p) => [p[0], p[2]])).map(([x, z]) => [x, FLOOR_Y + 0.012, z]));
      const gS = cells[cell].ids.map((i) => [S[i][0], S[i][2]]);
      goldShade.poly(M.hull2(gS).map(([x, z]) => [x, FLOOR_Y + 0.016, z]));
      shade.end(); goldShade.end();
      // Which way is the gold cell facing in w? Its center's w after the 4D turn.
      const c = cells[cell], center = [0, 0, 0, 0]; center[c.axis] = c.sign;
      const cw = M.apply(view.R, center)[3];
      const distinct = M.distinctCount(P);
      if (cellCycle) {
        const name = ["x", "y", "z", "w"][c.axis] + (c.sign > 0 ? " = +1" : " = \u22121");
        ctx.readout?.(`Cell ${cell + 1} of 8: the cube where ${name}`);
      } else ctx.readout?.(view.proj === "ortho" ? `Flat light. ${distinct} corners visible out of 16` : (cw > 0.7 ? "The gold cell is now the outer cube" : cw < -0.7 ? "The gold cell is the inner cube" : "The gold cell is turning through w"));
      ctx.report?.({ type: "tesseract", proj: view.proj, distinct, goldW: cw, page: page.id, user: ctx.userMoved });
    },
    save: () => ({ q: view.q.toArray(), R: view.R, proj: view.proj, cell }),
    recolor: (p) => r.recolor(p),
    dispose() { r.dispose(); disposeObj(disc); shade.dispose(); goldShade.dispose(); }
  };
}
SCENES.tesseract = (s, p, saved) => tesseractScene(s, p, saved);
SCENES.cells = (s, p, saved) => { const o = tesseractScene(s, p, saved, { cellCycle: true }); o.drag = "3d"; return o; };

SCENES.slice4 = (stage, page, saved) => {
  const pal = stage.pal, view = newView(saved), poly = M.hypercube(4);
  if (page.opts.tilt && !saved?.R) view.R = M.mul(M.rot("ZW", 0.6), M.mul(M.rot("YW", 0.5), M.rot("XW", 0.7)));
  const cut = new Lines(64, pal.gold), fill = new Fan(128, pal.gold, 0.18, { lit: false });
  const ghost = polyRenderer(stage, poly, { scale: 0.55, offset: [3.1, 1.6, -1], faces: false });
  let c = saved?.c ?? 0;
  return {
    objects: [cut.obj, fill.obj, ...ghost.objects], drag: page.opts.tilt ? "4d" : "3d", view, has4d: true,
    controls: { sliders: [{ key: "c", label: "Knife position in w", min: -2, max: 2, step: 0.01, value: c }] },
    set(k, v) { if (k === "c") c = v; },
    update(dt, ctx) {
      const rot = poly.V.map((p) => M.apply(view.R, p));
      const s = M.slice(rot, poly.F, 3, c);
      cut.begin(); fill.begin();
      const sc = 1.25;
      for (const [a, b] of s.segments) cut.seg(q3(view, a, sc), q3(view, b, sc));
      cut.end(); fill.end();
      ghost.draw(view);
      const n = s.points.length;
      const looksCube = n === 8 && s.segments.length === 12;
      ctx.readout?.(n ? `The slice has ${n} corners${looksCube ? ": a cube" : ""}` : "The knife misses the tesseract");
      ctx.report?.({ type: "slice4", corners: n, cube: looksCube });
    },
    save: () => ({ q: view.q.toArray(), R: view.R, c }),
    dispose() { cut.dispose(); fill.dispose(); ghost.dispose(); }
  };
};

SCENES.hypersphere = (stage, page, saved) => {
  const pal = stage.pal, R = 1.5;
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(1, 3), new THREE.MeshStandardMaterial({ color: pal.glass, transparent: true, opacity: 0.3, roughness: 0.1, depthWrite: false }));
  const wire = new THREE.LineSegments(new THREE.WireframeGeometry(new THREE.IcosahedronGeometry(1, 1)), new THREE.LineBasicMaterial({ color: pal.edge, transparent: true, opacity: 0.6 }));
  const g = new THREE.Group(); g.add(mesh, wire); g.position.y = 0.2;
  const disc = glowDisc(stage, pal.gold, 5, 0.5);
  let c = saved?.c ?? -0.7;
  return {
    objects: [g, disc], drag: "none", controls: { sliders: [{ key: "c", label: "Knife position in w", min: -1.8, max: 1.8, step: 0.01, value: c }] },
    set(k, v) { if (k === "c") c = v; },
    update(dt, ctx) {
      const r = M.sliceRadius(R, c); g.visible = r > 0.001; g.scale.setScalar(Math.max(0.001, r));
      if (!ctx.reduced) g.rotation.y += dt * 0.3;
      disc.scale.setScalar(0.2 + r); disc.material.opacity = r > 0 ? 0.5 : 0;
      ctx.readout?.(r > 0 ? `Slice is a ball of radius ${r.toFixed(2)} (hypersphere radius ${R})` : "Nothing here: the knife misses");
    },
    save: () => ({ c }),
    dispose() { disposeObj(g); disposeObj(disc); }
  };
};

function unfoldScene(stage, page, saved, n) {
  const pal = stage.pal, view = newView(saved);
  if (n === 3 && !saved?.q) view.q.setFromEuler(new THREE.Euler(-0.9, 0.3, 0));
  let t = saved?.t ?? (page.opts.start ?? 0);
  const lines = new Lines(12 * 8, pal.edge, 0.95), gold = new Lines(12, pal.gold), glass = new Fan(8 * 12, pal.glass, pal.glassOpacity, { lit: true }), goldFill = new Fan(12, pal.gold, 0.35);
  const C = M.hypercube(n);
  const disc = glowDisc(stage, pal.edge, 7, 0.35);
  return {
    objects: [disc, glass.obj, goldFill.obj, lines.obj, gold.obj], drag: "3d", view, has4d: false,
    controls: { sliders: [{ key: "t", label: "Unfold", min: 0, max: 1, step: 0.005, value: t }] },
    set(k, v) { if (k === "t") t = v; },
    update(dt, ctx) {
      const cells = M.unfoldCells(n, t);
      lines.begin(); gold.begin(); glass.begin(); goldFill.begin();
      const sc = n === 4 ? 1.1 : 0.75;
      for (const cell of cells) {
        let P;
        if (n === 4) P = cell.points.map((p) => to3(view, p, sc, [0, 1.3, 0]));
        else P = cell.points.map((p) => q3(view, p, sc, [0, 0.6, 0]));
        const isGold = cell.key === "base";
        for (const [i, j] of cell.edges) (isGold ? gold : lines).seg(P[i], P[j]);
        // faces: for the cube each cell is one square; for the tesseract, the 6 squares of each cube
        const local = cell.ids;
        for (const f of C.F) { if (!f.every((i) => local.includes(i))) continue; (isGold ? goldFill : glass).poly(f.map((i) => P[local.indexOf(i)])); }
      }
      lines.end(); gold.end(); glass.end(); goldFill.end();
      ctx.readout?.(t >= 0.995 ? (n === 4 ? "Fully unfolded: 8 cubes in a 3D cross" : "Fully unfolded: 6 squares in a flat cross") : `Unfolded ${Math.round(t * 100)}%`);
      ctx.report?.({ type: "unfold", n, t });
    },
    save: () => ({ q: view.q.toArray(), R: view.R, t }),
    dispose() { lines.dispose(); gold.dispose(); glass.dispose(); goldFill.dispose(); disposeObj(disc); }
  };
}
SCENES.unfold3 = (s, p, saved) => unfoldScene(s, p, saved, 3);
SCENES.unfold4 = (s, p, saved) => unfoldScene(s, p, saved, 4);

SCENES.sandbox = (stage, page, saved) => {
  const pal = stage.pal, view = newView(saved); view.proj = saved?.proj || "perspective";
  let name = saved?.shape || "tesseract", knife = saved?.knife ?? false, c = saved?.c ?? 0;
  let poly = M.shape(name), r = null;
  const cut = new Lines(200, pal.gold), disc = glowDisc(stage, pal.edge, 6, 0.4);
  const group = new THREE.Group();
  const build = () => { if (r) { for (const o of r.objects) group.remove(o); r.dispose(); } poly = M.shape(name); r = polyRenderer(stage, poly, { scale: name === "tesseract" ? 1.25 : 1.6, faces: name !== "24-cell", goldIds: name === "tesseract" ? M.tesseractCells()[6].ids : null }); group.add(...r.objects); };
  build();
  return {
    objects: [disc, group, cut.obj], drag: "3d", view, has4d: true, hasProj: true,
    controls: {
      choices: [{ key: "shape", options: ["cube", "tesseract", "16-cell", "24-cell"], value: name }],
      toggles: [{ key: "knife", label: "Knife", value: knife }],
      sliders: [{ key: "c", label: "Knife position", min: -1.8, max: 1.8, step: 0.01, value: c }]
    },
    set(k, v) { if (k === "shape") { name = v; build(); } if (k === "knife") knife = v; if (k === "c") c = v; },
    update(dt, ctx) {
      r.draw(view);
      r.objects.forEach((o, i) => { o.material.transparent = true; o.material.opacity = knife ? 0.18 : [pal.glassOpacity, 0.32, 0.95, 1, 1][i]; });
      cut.begin();
      if (knife) {
        const rot = r.rotated; const axis = name === "cube" ? 1 : 3;
        const s = M.slice(rot, poly.F, axis, c);
        const sc = name === "tesseract" ? 1.25 : 1.6;
        // Slice points keep their w (= c for 4D shapes, 0 for the cube) so they project exactly like the shape.
        for (const [a, b] of s.segments) cut.seg(to3(view, a, sc), to3(view, b, sc));
        ctx.readout?.(`${name}: slice with ${s.points.length} corners`);
      } else ctx.readout?.(`${name}: ${poly.V.length} corners, ${poly.E.length} edges, ${poly.F.length} faces`);
      cut.end();
      ctx.report?.({ type: "sandbox", shape: name, proj: view.proj, knife });
    },
    share: () => ({ shape: name, knife, c, proj: view.proj }),
    save: () => ({ q: view.q.toArray(), R: view.R, proj: view.proj, shape: name, knife, c }),
    dispose() { r.dispose(); cut.dispose(); disposeObj(disc); }
  };
};
