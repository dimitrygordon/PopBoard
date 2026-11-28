// The six scenes, the cover, and the last card. Unlit, in the module's palette.
// Every number that is a science claim comes from vr4d-math.js.
import * as THREE from "../../vendor/three/three.module.min.js";
import * as M from "../fd-math.js";
import {
  EYE_Y, BALL_R, BALL_Z, BEAD_RANGE, HYPER_R, HYPER_Z, SHADOW_SCALE, SCENE3,
  segmentLength, sphereSliceRadius, W_PLANES,
  clipSegmentOutsideSphere, wireFade, HEAD_CLIP_M, HEAD_FADE_M,
} from "./vr4d-math.js";

const PAL = {
  bg: 0x121823, floor: 0x18202d, wall: 0x151c28, grid: 0x3fb8d8, edge: 0x9fe4ff,
  glass: 0x6fa8ff, gold: 0xffc43c, ink: 0x10151d, paper: 0xf4f1e8, screen: 0xd8d3c4,
};

const ROD = new THREE.CylinderGeometry(1, 1, 1, 5, 1, true);
const _up = new THREE.Vector3(0, 1, 0);
const _d = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _seat = new THREE.Vector3(0, EYE_Y, 0);
const _pushed = [0, 1, 2, 3].map(() => new THREE.Vector3());

function basic(color, opacity = 1, extra = {}) {
  return new THREE.MeshBasicMaterial({
    color, transparent: opacity < 1, opacity, depthWrite: opacity >= 0.9,
    side: THREE.DoubleSide, toneMapped: false, ...extra,
  });
}
function pose(mesh, a, b, radius) {
  _d.subVectors(b, a);
  const len = _d.length();
  if (!(len > 1e-4)) { mesh.visible = false; return; }
  mesh.visible = true;
  _d.multiplyScalar(1 / len);
  mesh.position.copy(a).lerp(b, 0.5);
  if (_d.y < -0.999) mesh.quaternion.set(1, 0, 0, 0);
  else mesh.quaternion.setFromUnitVectors(_up, _d);
  mesh.scale.set(radius, len, radius);
}
function rod(color, opacity = 1) {
  const m = new THREE.Mesh(ROD, basic(color, opacity, opacity < 1 ? { blending: THREE.AdditiveBlending, depthWrite: false } : {}));
  m.frustumCulled = false;
  return m;
}
function paperTex(w, h, draw) {
  const c = document.createElement("canvas");
  c.width = w; c.height = h;
  const g = c.getContext("2d");
  paintPaper(g, w, h);
  if (draw) draw(g, w, h);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 4;
  return { tex: t, ctx: g, canvas: c };
}
function paintPaper(g, w, h) {
  g.fillStyle = "#f4f1e8"; g.fillRect(0, 0, w, h);
  g.strokeStyle = "rgba(63,184,216,0.16)"; g.lineWidth = 2;
  for (let x = 16; x < w; x += 28) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, h); g.stroke(); }
  for (let y = 16; y < h; y += 28) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
  g.strokeStyle = "#10151d"; g.lineWidth = 8; g.strokeRect(8, 8, w - 16, h - 16);
}
function paper(w, h, draw) {
  const { tex, ctx, canvas } = paperTex(w, h, draw);
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(w > h ? 0.42 : 0.34, w > h ? 0.34 * h / w : 0.42 * h / w), basic(0xffffff));
  mesh.material.map = tex; mesh.material.toneMapped = false;
  return { mesh, tex, ctx, canvas, redraw(fn) { paintPaper(ctx, canvas.width, canvas.height); fn(ctx, canvas.width, canvas.height); tex.needsUpdate = true; } };
}
function makeFlick(h) {
  const g = new THREE.Group();
  const shape = new THREE.Shape();
  const hw = h * 0.22, top = h * 0.52;
  shape.moveTo(0, top);
  shape.quadraticCurveTo(hw * 1.2, top * 0.45, hw * 0.95, 0);
  shape.quadraticCurveTo(0, -h * 0.05, -hw * 0.95, 0);
  shape.quadraticCurveTo(-hw * 1.2, top * 0.45, 0, top);
  const body = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.006, bevelEnabled: false }), basic(PAL.paper));
  body.position.z = -0.003;
  const ink = new THREE.Mesh(new THREE.ExtrudeGeometry(shape, { depth: 0.002, bevelEnabled: false }), basic(PAL.ink));
  ink.scale.set(1.06, 1.04, 1); ink.position.set(0, -0.004, -0.004);
  const head = new THREE.Mesh(new THREE.SphereGeometry(h * 0.16, 16, 12), basic(PAL.paper));
  head.position.y = h * 0.7;
  const headInk = new THREE.Mesh(new THREE.SphereGeometry(h * 0.168, 12, 8), basic(PAL.ink));
  headInk.position.y = h * 0.7; headInk.position.z = -0.012;
  const eye = new THREE.Mesh(new THREE.SphereGeometry(h * 0.035, 8, 6), basic(PAL.ink));
  eye.position.set(0, h * 0.72, h * 0.14);
  const arm = new THREE.Mesh(new THREE.BoxGeometry(h * 0.28, 0.008, 0.006), basic(PAL.ink));
  arm.position.set(h * 0.2, h * 0.38, 0.01); arm.rotation.z = -0.5;
  g.add(ink, body, headInk, head, eye, arm);
  g.userData.eye = eye; g.userData.h = h;
  return g;
}
function lookYaw(group, x, z) {
  group.rotation.y = Math.atan2(x - group.position.x, z - group.position.z);
}

const H4 = M.hypercube(4);
const CELLS = M.tesseractCells();
const CELL_FACES = CELLS.map((c) => {
  const set = new Set(c.ids);
  return H4.F.filter((f) => f.every((i) => set.has(i)));
});
const PTS = Array.from({ length: 16 }, () => new THREE.Vector3());

function projectTess(plane, angle, scale, center) {
  const R = M.rot(plane, angle);
  for (let i = 0; i < 16; i++) {
    const s = M.projectPerspective(M.apply(R, H4.V[i]));
    PTS[i].set(center.x + s[0] * scale, center.y + s[1] * scale, center.z + s[2] * scale);
  }
  return PTS;
}

export function createWorld() {
  const root = new THREE.Group();
  const grabs = [];
  const grab = (mesh, name) => { mesh.userData.grab = name; grabs.push(mesh); return mesh; };

  // ----- room -----
  const room = new THREE.Group();
  const floorMat = basic(PAL.floor);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), floorMat);
  floor.rotation.x = -Math.PI / 2; floor.position.y = 0;
  const wallMat = basic(PAL.wall, 1);
  wallMat.transparent = true;
  const walls = [];
  const addWall = (x, y, z, ry, w, h) => {
    const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), wallMat);
    m.position.set(x, y, z); m.rotation.y = ry; walls.push(m); room.add(m);
  };
  addWall(0, 1.6, -5.2, 0, 12, 3.4);
  addWall(-5.2, 1.6, 0, Math.PI / 2, 12, 3.4);
  addWall(5.2, 1.6, 0, -Math.PI / 2, 12, 3.4);
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(12, 12), wallMat);
  ceil.rotation.x = Math.PI / 2; ceil.position.y = 3.3; room.add(ceil);
  const grids = [];
  const addGrid = (obj) => {
    const mats = Array.isArray(obj.material) ? obj.material : [obj.material];
    for (const m of mats) { m.transparent = true; m.opacity = 0.22; m.depthWrite = false; }
    grids.push(obj); room.add(obj);
  };
  const gf = new THREE.GridHelper(12, 24, PAL.grid, PAL.grid); gf.position.y = 0.004; addGrid(gf);
  const gb = new THREE.GridHelper(12, 24, PAL.grid, PAL.grid); gb.rotation.x = Math.PI / 2; gb.position.set(0, 1.6, -5.19); addGrid(gb);
  const gl = new THREE.GridHelper(12, 18, PAL.grid, PAL.grid); gl.rotation.z = Math.PI / 2; gl.position.set(-5.19, 1.6, 0); addGrid(gl);
  room.add(floor);
  root.add(room);
  function roomFade(gridOp, wallOp) {
    for (const g of grids) { const mats = Array.isArray(g.material) ? g.material : [g.material]; for (const m of mats) m.opacity = gridOp; }
    wallMat.opacity = wallOp;
  }

  // ----- cover -----
  const cover = new THREE.Group();
  const book = paper(640, 840, (g, w, h) => {
    g.strokeStyle = "#10151d"; g.lineWidth = 8;
    const cx = w / 2, cy = h / 2 + 20, s = 70;
    const p = [[cx - s, cy + s * 0.2], [cx + s * 0.15, cy + s], [cx + s, cy + s * 0.15], [cx - s * 0.15, cy - s * 0.7]];
    const q = p.map(([x, y]) => [x + s * 0.55, y - s * 0.7]);
    g.beginPath();
    [p, q].forEach((face) => { face.forEach((pt, i) => i ? g.lineTo(pt[0], pt[1]) : g.moveTo(pt[0], pt[1])); g.closePath(); });
    for (let i = 0; i < 4; i++) { g.moveTo(p[i][0], p[i][1]); g.lineTo(q[i][0], q[i][1]); }
    g.stroke();
  });
  book.mesh.scale.set(1.15, 1.15, 1);
  book.mesh.position.set(0, 1.05, -1.15);
  grab(book.mesh, "book");
  cover.add(book.mesh);
  root.add(cover);

  // ----- scene 1: Be Flick -----
  const flickG = new THREE.Group();
  const sheet = new THREE.Mesh(new THREE.BoxGeometry(9, 0.012, 7), basic(PAL.grid, 0.55, { depthWrite: false }));
  sheet.position.set(0, EYE_Y, -4);
  const sheetGrid = new THREE.GridHelper(8, 16, PAL.edge, PAL.grid);
  sheetGrid.position.set(0, EYE_Y + 0.008, -4);
  const sm = Array.isArray(sheetGrid.material) ? sheetGrid.material : [sheetGrid.material];
  for (const m of sm) { m.transparent = true; m.opacity = 0.45; m.depthWrite = false; }
  const ball = new THREE.Mesh(new THREE.SphereGeometry(BALL_R, 28, 20), basic(PAL.glass, 0.16, { depthWrite: false }));
  const ballRing = ring(BALL_R * 0.98, PAL.edge, 0.35);
  ball.add(ballRing);
  const flick1 = makeFlick(0.35);
  flick1.position.set(-0.18, EYE_Y, -1.25);
  const seg = rod(PAL.gold, 1);
  const ruler = paper(900, 220, (g, w, h) => {
    g.strokeStyle = "#10151d"; g.lineWidth = 4;
    for (let i = 0; i <= 16; i++) {
      const x = 40 + i * ((w - 80) / 16);
      g.beginPath(); g.moveTo(x, h * 0.35); g.lineTo(x, h * (i % 4 === 0 ? 0.72 : 0.55)); g.stroke();
    }
  });
  ruler.mesh.scale.set(1.15, 1.15, 1);
  ruler.mesh.position.set(0.42, 1.16, -0.95);
  ruler.mesh.rotation.x = -1.05; ruler.mesh.rotation.y = -0.4;
  const bead = new THREE.Mesh(new THREE.SphereGeometry(0.028, 16, 12), basic(PAL.gold));
  grab(bead, "bead");
  const pad = paper(700, 560, (g) => {
    g.fillStyle = "#10151d"; g.font = "600 42px Inter, sans-serif"; g.fillText("Draw", 36, 70);
  });
  pad.mesh.position.set(-0.12, 1.12, -0.82);
  pad.mesh.rotation.x = -1.05;
  grab(pad.mesh, "pad");
  const inkLine = new THREE.LineSegments(new THREE.BufferGeometry(), new THREE.LineBasicMaterial({ color: PAL.ink }));
  inkLine.frustumCulled = false; inkLine.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(1200), 3));
  pad.mesh.add(inkLine);
  const disk = paper(480, 480, (g, w, h) => {
    g.strokeStyle = "#10151d"; g.lineWidth = 8;
    g.beginPath(); g.arc(w / 2, h / 2 + 10, 120, 0, Math.PI * 2); g.stroke();
    g.font = "600 36px Inter, sans-serif"; g.fillStyle = "#10151d"; g.fillText("seen from above", 70, 64);
  });
  disk.mesh.position.set(0.95, EYE_Y, -1.35);
  const lenTag = textPlane("length");
  ruler.mesh.add(bead);
  flickG.add(sheet, sheetGrid, ball, flick1, seg, ruler.mesh, pad.mesh, disk.mesh, lenTag.mesh);
  root.add(flickG);
  let shownLen = 0;

  // ----- scene 2 -----
  const flatG = new THREE.Group();
  const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.02, 2.4), basic(PAL.grid, 0.28, { depthWrite: false }));
  table.position.set(0, EYE_Y - 0.65, -0.85);
  const house = new THREE.Group();
  const wallH = 0.09, wallT = 0.018, hs = 0.5;
  for (const [x, z, sx, sz] of [[0, hs / 2, hs, wallT], [0, -hs / 2, hs, wallT], [hs / 2, 0, wallT, hs], [-hs / 2, 0, wallT, hs]]) {
    const w = new THREE.Mesh(new THREE.BoxGeometry(sx, wallH, sz), basic(PAL.ink));
    w.position.set(x, wallH / 2, z); house.add(w);
  }
  const rug = new THREE.Mesh(new THREE.PlaneGeometry(hs - 0.04, hs - 0.04), basic(PAL.paper));
  rug.rotation.x = -Math.PI / 2; rug.position.y = 0.004; house.add(rug);
  house.position.set(0, EYE_Y - 0.65, -1.15);
  const block = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), basic(PAL.gold, 0.95));
  grab(block, "block");
  const column = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, 0.28, 8, 1, true), basic(PAL.gold, 0.22, { depthWrite: false }));
  house.add(block, column);
  const flick2 = makeFlick(0.25);
  flick2.position.set(-0.12, 0, -0.12); house.add(flick2);
  const viewCard = paper(520, 400, () => {});
  viewCard.mesh.position.set(-0.55, 1.15, -0.95);
  viewCard.mesh.rotation.y = 0.5;
  const box = new THREE.Group();
  box.add(wireBox(0.4, PAL.edge, 0.8));
  const innerBlock = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.08, 0.08), basic(PAL.gold));
  box.add(innerBlock);
  box.position.set(0.15, 1.12, -0.85);
  const wTag = textPlane("w");
  wTag.mesh.position.set(0.42, 1.35, -0.7);
  const sparks = sparkles(36);
  flatG.add(table, house, viewCard.mesh, box, wTag.mesh, sparks);
  root.add(flatG);
  let flickAlpha = 1;

  // ----- scene 3 -----
  const shG = new THREE.Group();
  const screen = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), basic(PAL.screen));
  screen.position.set(0, 1.45, SCENE3.screenZ);
  const lamp = new THREE.Group();
  const shade = new THREE.Mesh(new THREE.ConeGeometry(0.12, 0.16, 12, 1, true), basic(PAL.paper));
  shade.position.y = 0.05;
  const glow = new THREE.Mesh(new THREE.SphereGeometry(0.06, 12, 8), basic(PAL.gold, 0.85));
  lamp.add(shade, glow);
  lamp.position.set(SCENE3.lamp[0], SCENE3.lamp[1], SCENE3.lamp[2]);
  const cubeRods = Array.from({ length: 12 }, () => rod(PAL.edge));
  const goldFace = new THREE.Mesh(new THREE.BufferGeometry(), basic(PAL.gold, 0.28, { depthWrite: false }));
  goldFace.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(18), 3));
  goldFace.frustumCulled = false;
  const cubeHit = grab(new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.34, 0.34), basic(PAL.glass, 0.02, { depthWrite: false })), "cube");
  const shadowRods = Array.from({ length: 12 }, () => rod(PAL.ink));
  const plane = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.6), basic(PAL.glass, 0.18, { depthWrite: false }));
  const handle = grab(new THREE.Mesh(new THREE.SphereGeometry(0.03, 12, 8), basic(PAL.gold)), "plane");
  const cutRods = Array.from({ length: 8 }, () => rod(PAL.gold));
  const tiles = ["tri", "quad", "pent", "hex"].map((name, i) => {
    const card = paper(360, 280, (g, w, h) => drawTile(g, w, h, name));
    card.mesh.position.set(0.15 + (i - 1.5) * 0.28, 0.95, -0.95);
    card.mesh.rotation.x = -0.8;
    grab(card.mesh, "tile-" + name);
    return card;
  });
  const rings = tiles.map(() => new THREE.Mesh(new THREE.TorusGeometry(0.12, 0.006, 6, 24), basic(PAL.gold)));
  const cutCard = paper(520, 400, () => {});
  cutCard.mesh.position.set(1.15, 1.35, -2.05);
  cutCard.mesh.visible = false;
  const shadowNote = textPlane("approximately a hexagon", true);
  shadowNote.mesh.position.set(-0.15, 2.2, -2.32);
  shadowNote.mesh.visible = false;
  plane.visible = false;
  handle.visible = false;
  tiles.forEach((t) => { t.mesh.visible = false; });
  rings.forEach((r) => { r.visible = false; });
  shG.add(screen, lamp, goldFace, cubeHit, plane, handle, cutCard.mesh, shadowNote.mesh, ...cubeRods, ...shadowRods, ...cutRods, ...tiles.map((t) => t.mesh), ...rings);
  root.add(shG);

  // ----- scene 4 -----
  const bG = new THREE.Group();
  const point = new THREE.Mesh(new THREE.SphereGeometry(0.03, 16, 12), basic(PAL.gold));
  point.position.set(0, 1.32, -0.95);
  const pullHit = grab(point, "pull");
  const bLine = rod(PAL.gold);
  const bSquare = new THREE.Mesh(new THREE.PlaneGeometry(0.3, 0.3), basic(PAL.glass, 0.2, { depthWrite: false }));
  const bCubeRods = Array.from({ length: 12 }, () => rod(PAL.edge));
  const bCopyRods = Array.from({ length: 12 }, () => rod(PAL.edge));
  const bJoin = Array.from({ length: 8 }, () => rod(PAL.gold, 0.9));
  const bNest = Array.from({ length: 32 }, () => rod(PAL.edge));
  const bCorners = Array.from({ length: 16 }, () => new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), basic(PAL.gold)));
  const shelf = new THREE.Group();
  shelf.position.set(0, 1.42, -1.45);
  const minis = [0, 1, 2, 3].map((i) => {
    const m = new THREE.Group();
    m.position.x = (i - 1.5) * 0.28;
    shelf.add(m);
    return m;
  });
  const dialCard = paper(360, 220, () => {});
  dialCard.mesh.position.set(0.55, 1.25, -0.55);
  const knob = grab(new THREE.Mesh(new THREE.CylinderGeometry(0.06, 0.06, 0.03, 20), basic(PAL.paper)), "dial");
  knob.position.set(0.55, 1.05, -0.5);
  const formula = textPlane("2ⁿ     n × 2ⁿ⁻¹");
  formula.mesh.position.set(-0.55, 1.15, -0.7);
  const wRuler = paper(700, 180, (g, w, h) => {
    g.strokeStyle = "#d99a00"; g.lineWidth = 6;
    g.beginPath(); g.moveTo(40, h / 2); g.lineTo(w - 70, h / 2); g.lineTo(w - 100, h / 2 - 24); g.moveTo(w - 70, h / 2); g.lineTo(w - 100, h / 2 + 24); g.stroke();
  });
  wRuler.mesh.position.set(0.5, 0.95, -0.85);
  wRuler.mesh.rotation.x = -1.1;
  const wBead = grab(new THREE.Mesh(new THREE.SphereGeometry(0.026, 12, 8), basic(PAL.gold)), "wbead");
  bG.add(point, bLine, bSquare, dialCard.mesh, knob, formula.mesh, shelf, wRuler.mesh, wBead, ...bCubeRods, ...bCopyRods, ...bJoin, ...bNest, ...bCorners);
  root.add(bG);
  let nest = 0;

  // ----- scene 5 -----
  const tG = new THREE.Group();
  const tCore = Array.from({ length: 32 }, () => rod(PAL.edge));
  const tHalo = Array.from({ length: 32 }, () => rod(PAL.edge, 0.25));
  const tCells = CELL_FACES.map(() => {
    const mesh = new THREE.Mesh(new THREE.BufferGeometry(), basic(PAL.gold, 0.08, { depthWrite: false }));
    const n = 6 * 6;
    mesh.geometry.setAttribute("position", new THREE.BufferAttribute(new Float32Array(n * 3), 3));
    mesh.frustumCulled = false;
    return mesh;
  });
  tCells.forEach((m, i) => grab(m, "cell-" + i));
  const seat = new THREE.Mesh(new THREE.TorusGeometry(0.42, 0.008, 6, 32), basic(PAL.grid, 0.8));
  seat.rotation.x = Math.PI / 2; seat.position.y = 0.02;
  const dial = new THREE.Group();
  const dialRing = new THREE.Mesh(new THREE.TorusGeometry(0.16, 0.012, 8, 40), basic(PAL.paper));
  dialRing.rotation.x = Math.PI / 2;
  const needle = new THREE.Mesh(new THREE.BoxGeometry(0.012, 0.008, 0.14), basic(PAL.ink));
  needle.position.z = -0.06;
  const notch90 = new THREE.Mesh(new THREE.SphereGeometry(0.012, 8, 6), basic(PAL.ink));
  const notch180 = new THREE.Mesh(new THREE.SphereGeometry(0.018, 8, 6), basic(PAL.gold));
  const planeMarks = W_PLANES.map(() => new THREE.Mesh(new THREE.BoxGeometry(0.02, 0.008, 0.008), basic(PAL.ink)));
  const planeLabels = W_PLANES.map((name) => textPlane(name));
  dial.add(dialRing, needle, notch90, notch180, ...planeMarks, ...planeLabels.map((p) => p.mesh));
  dial.position.set(0, 0.95, -0.62);
  grab(dialRing, "turndial");
  const trueCell = new THREE.Mesh(new THREE.BoxGeometry(0.2, 0.2, 0.2), basic(PAL.paper));
  trueCell.add(new THREE.LineSegments(new THREE.EdgesGeometry(trueCell.geometry), new THREE.LineBasicMaterial({ color: PAL.ink })));
  trueCell.position.set(0.42, 0.9, -0.42);
  const floorG = new THREE.GridHelper(8, 16, PAL.grid, PAL.grid);
  floorG.position.y = 0.003;
  const fgm = Array.isArray(floorG.material) ? floorG.material : [floorG.material];
  for (const m of fgm) { m.transparent = true; m.opacity = 0.1; m.depthWrite = false; }
  const degCard = textPlane("0°");
  degCard.mesh.position.set(-0.28, 0.82, -0.42);
  tG.add(floorG, seat, dial, trueCell, degCard.mesh, ...tCore, ...tHalo, ...tCells);
  root.add(tG);

  // ----- scene 6 and finale -----
  const hG = new THREE.Group();
  const hyper = new THREE.Mesh(new THREE.SphereGeometry(1, 28, 20), basic(PAL.glass, 0.16, { depthWrite: false }));
  const hyperRing = new THREE.Mesh(new THREE.TorusGeometry(1, 0.012, 8, 40), basic(PAL.gold, 0.9));
  hyperRing.rotation.x = Math.PI / 2;
  hyper.add(hyperRing, ring(0.55, PAL.edge, 0.4), ring(0.25, PAL.edge, 0.3));
  const ghost = new THREE.Mesh(new THREE.SphereGeometry(1, 16, 12), basic(PAL.gold, 0.12, { depthWrite: false, wireframe: true }));
  const ruler6 = paper(900, 220, (g, w, h) => {
    g.strokeStyle = "#10151d"; g.lineWidth = 4;
    for (let i = 0; i <= 16; i++) { const x = 40 + i * ((w - 80) / 16); g.beginPath(); g.moveTo(x, h * 0.35); g.lineTo(x, h * (i % 4 === 0 ? 0.72 : 0.55)); g.stroke(); }
  });
  ruler6.mesh.position.set(0.5, 0.98, -0.8);
  ruler6.mesh.rotation.x = -1.05; ruler6.mesh.rotation.y = -0.35;
  const bead6 = grab(new THREE.Mesh(new THREE.SphereGeometry(0.028, 14, 10), basic(PAL.gold)), "bead6");
  const flickCards = [0.15, 0.4, 0.7].map((rad, i) => {
    const c = paper(300, 220, (g, w, h) => {
      g.strokeStyle = "#10151d"; g.lineWidth = 8;
      g.beginPath(); g.arc(w / 2, h / 2 + 16, 20 + rad * 70, 0, Math.PI * 2); g.stroke();
    });
    c.mesh.position.set(0.85, 1.55 - i * 0.22, -1.4);
    return c;
  });
  const tickets = [
    ["slice", "ball slice"],
    ["shadow", "cube shadow"],
    ["tess", "tesseract shadow"],
  ].map(([id, label], i) => {
    const c = paper(420, 260, (g, w, h) => {
      g.fillStyle = "#10151d"; g.font = "600 32px Inter, sans-serif"; g.fillText(label, 24, 56);
      drawTicket(g, w, h, id);
    });
    c.mesh.position.set((i - 1) * 0.48, 1.15, -1.15);
    grab(c.mesh, "ticket-" + id);
    return c;
  });
  const finaleCard = paper(900, 560, (g, w, h) => {
    g.strokeStyle = "#10151d"; g.lineWidth = 8;
    g.strokeRect(80, 120, 90, 90);
    for (let i = 0; i < 4; i++) g.strokeRect(200 + i * 100, 200, 80, 80);
    g.font = "600 34px Inter, sans-serif"; g.fillStyle = "#10151d";
    g.fillText("Unfold a tesseract from…?", 70, 70);
  });
  finaleCard.mesh.scale.set(1.4, 1.4, 1);
  finaleCard.mesh.position.set(0, 1.2, -1.3);
  ruler6.mesh.add(bead6);
  hG.add(hyper, ghost, ruler6.mesh, finaleCard.mesh, ...flickCards.map((c) => c.mesh), ...tickets.map((c) => c.mesh));
  root.add(hG);

  function update(model, t, dt, head) {
    const scene = model.scene;
    const page = model.pageId;
    cover.visible = scene === "cover";
    flickG.visible = scene === "flick";
    flatG.visible = scene === "flatland";
    shG.visible = scene === "shadow";
    bG.visible = scene === "build";
    tG.visible = scene === "tesseract";
    hG.visible = scene === "hyper" || scene === "finale";
    const calm = scene === "flick" || scene === "flatland" || scene === "tesseract";
    room.visible = !calm || scene === "flick";
    if (scene === "flick") roomFade(0.08, 0.35);
    else if (scene === "build") roomFade(0.12, 1);
    else roomFade(0.22, 1);
    book.mesh.scale.setScalar(1.15 + (scene === "cover" ? 0.03 * Math.sin(t * 1.6) : 0));

    if (flickG.visible) updateFlick(model, t, dt);
    if (flatG.visible) updateFlat(model, t, page);
    if (shG.visible) updateShadow(model, t, page);
    if (bG.visible) updateBuild(model, t, dt, page);
    if (tG.visible) updateTess(model, head);
    if (hG.visible) updateHyper(model, t, page, scene);
    root.updateMatrixWorld(true);
  }

  function updateFlick(model, t, dt) {
    const h = model.bead * BEAD_RANGE;
    ball.position.set(0, EYE_Y + h, BALL_Z);
    const len = segmentLength(BALL_R, h);
    shownLen += (len - shownLen) * (1 - Math.exp(-dt / 0.1));
    const half = Math.max(shownLen / 2, 0.0001);
    pose(seg, _a.set(-half, EYE_Y, BALL_Z), _b.set(half, EYE_Y, BALL_Z), 0.008);
    seg.visible = shownLen > 0.01;
    seg.material.opacity = Math.min(1, shownLen / 0.08);
    bead.position.copy(beadLocal(model.bead));
    bead.position.z = 0.02;
    bead.scale.setScalar(1 + 0.08 * Math.sin(t * 3));
    lookYaw(flick1, -0.15, 0.2);
    const eye = flick1.userData.eye;
    eye.scale.setScalar(model.pageId === "s4" ? 1.3 : 1);
    disk.mesh.visible = model.help >= 1 && model.pageId === "s4";
    lenTag.mesh.visible = model.help >= 2 && shownLen > 0.05;
    if (lenTag.mesh.visible) {
      lenTag.set(`${shownLen.toFixed(2)} m`);
      lenTag.mesh.position.set(0.35, EYE_Y + 0.12, BALL_Z);
    }
    pad.mesh.visible = model.pageId === "s3" || model.sealed || model.pageId === "s4";
    writeStrokes(inkLine, model.strokes);
    if (!model.sealed) pad.mesh.scale.setScalar(1);
  }

  function updateFlat(model, t, page) {
    const above = model.lift * 0.22;
    block.position.set(0, 0.04 + above, 0);
    column.position.set(0, 0.3 + above * 0.5, 0);
    column.visible = above < 0.12;
    const fade = above <= 0.02 ? 1 : Math.max(0, 1 - (above - 0.02) / 0.04);
    viewCard.mesh.visible = page === "s6" || page === "s7" || page === "s8" || model.card?.scene === "flatland";
    if (Math.abs(fade - flickAlpha) > 0.02) {
      flickAlpha = fade;
      block.material.opacity = 0.25 + 0.7 * fade;
      viewCard.redraw((g, w, h) => {
        g.strokeStyle = "#10151d"; g.lineWidth = 10; g.strokeRect(70, 70, w - 140, h - 120);
        g.font = "600 32px Inter, sans-serif"; g.fillStyle = "#10151d"; g.fillText("Flick's view", 36, 52);
        if (fade > 0.4) { g.fillStyle = "#d99a00"; g.fillRect(w / 2 - 18, h / 2 - 10, 36, 36); }
      });
    }
    block.scale.setScalar(1 + 0.05 * Math.sin(t * 2.4));
    lookYaw(flick2, 0, 0);
    flick2.rotation.x = -0.25 - above * 0.5;
    const eye = flick2.userData.eye;
    eye.scale.setScalar(above > 0.03 ? 1.6 : 1);
    box.visible = page === "s7" || page === "s8" || model.card?.scene === "flatland";
    wTag.mesh.visible = model.help >= 2 && box.visible;
    sparks.visible = true;
  }

  function updateShadow(model, t, page) {
    const q = new THREE.Quaternion(model.cubeQ.x, model.cubeQ.y, model.cubeQ.z, model.cubeQ.w);
    const center = new THREE.Vector3(...SCENE3.cubeCenter);
    cubeHit.position.copy(center);
    cubeHit.quaternion.copy(q);
    const C = M.hypercube(3);
    const worldV = C.V.map((p) => new THREE.Vector3(p[0], p[1], p[2]).multiplyScalar(SCENE3.edge / 2).applyQuaternion(q).add(center));
    C.E.forEach(([i, j], e) => {
      const gold = C.V[i][0] > 0 && C.V[j][0] > 0;
      cubeRods[e].material.color.setHex(gold ? PAL.gold : PAL.edge);
      pose(cubeRods[e], worldV[i], worldV[j], gold ? 0.007 : 0.005);
      const s1 = shadowPoint(worldV[i]), s2 = shadowPoint(worldV[j]);
      if (s1 && s2) {
        shadowRods[e].material.color.setHex(gold ? PAL.gold : PAL.ink);
        pose(shadowRods[e], s1, s2, 0.008);
      } else shadowRods[e].visible = false;
    });
    const face = C.F.find((f) => f.every((i) => C.V[i][0] > 0));
    writeTri(goldFace, worldV[face[0]], worldV[face[1]], worldV[face[2]], worldV[face[0]], worldV[face[2]], worldV[face[3]]);
    const showPlane = page === "s10" || page === "s11" || page === "s12" || model.card;
    plane.visible = handle.visible = showPlane;
    const py = center.y + model.planeT * 0.2;
    plane.position.set(center.x, py, center.z);
    plane.rotation.copy(cubeHit.rotation);
    handle.position.set(center.x + 0.34, py, center.z);
    handle.scale.setScalar(1 + 0.1 * Math.sin(t * 3));
    // slice in world y after the cube's turn
    const V = worldV.map((v) => [v.x, v.y, v.z]);
    const cut = M.slice(V, C.F, 1, py);
    cutRods.forEach((r) => { r.visible = false; });
    cut.segments.slice(0, cutRods.length).forEach((seg, i) => {
      pose(cutRods[i], _a.set(seg[0][0], seg[0][1], seg[0][2]), _b.set(seg[1][0], seg[1][1], seg[1][2]), 0.006);
    });
    const ordered = cut.points.length >= 3 ? M.orderPolygon(cut.points, 1) : [];
    const n = ordered.length;
    tiles.forEach((card, i) => {
      const on = showPlane;
      card.mesh.visible = on;
      rings[i].visible = on && model.tile === ["tri", "quad", "pent", "hex"][i];
      rings[i].position.copy(card.mesh.position);
      rings[i].position.z += 0.02;
    });
    const shadowPts = [];
    worldV.forEach((v) => { const s = shadowArray([v.x, v.y, v.z]); if (s) shadowPts.push([s[0], s[1]]); });
    shadowNote.mesh.visible = M.hull2(shadowPts).length === 6;
    cutCard.mesh.visible = showPlane && n >= 3;
    if (cutCard.mesh.visible) {
      const name = n === 3 ? "triangle" : n === 4 ? "four sides" : n === 5 ? "pentagon" : n === 6 ? "hexagon" : n + " sides";
      cutCard.redraw((g, w, h) => {
        g.font = "600 36px Inter, sans-serif"; g.fillStyle = "#10151d"; g.fillText("the cut", 36, 56);
        g.fillText(name, 36, 100);
        g.strokeStyle = "#d99a00"; g.lineWidth = 8; g.beginPath();
        ordered.forEach((p, i) => {
          const x = w / 2 + p[0] * 280, y = h / 2 + 20 + (p[2] - center.z) * 280;
          if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
        });
        g.closePath(); g.stroke();
      });
    }
  }

  function updateBuild(model, t, dt, page) {
    const p = model.pull;
    const o = new THREE.Vector3(0, 1.12, -1.15);
    point.position.copy(o);
    point.visible = p[0] < 0.98 || page === "s13";
    point.scale.setScalar(1 + (page === "s13" || page === "s14" ? 0.1 * Math.sin(t * 3) : 0));
    const L = 0.3;
    if (p[0] > 0.02) pose(bLine, o, _b.copy(o).add(new THREE.Vector3(L * p[0], 0, 0)), 0.008);
    else bLine.visible = false;
    bSquare.visible = p[1] > 0.02;
    bSquare.scale.set(Math.max(p[1], 0.001), 1, 1);
    bSquare.position.copy(o).add(new THREE.Vector3(L / 2 * Math.min(p[0], 1), 0, 0));
    bSquare.rotation.x = -Math.PI / 2;
    const cubeOn = p[2] > 0.02;
    const lift = L * Math.min(p[2], 1);
    drawBox(bCubeRods, o.clone().add(new THREE.Vector3(L / 2, lift / 2, 0)), L * Math.min(p[0], 1) || 0.02, Math.max(lift, 0.01), L * Math.min(p[1], 1) || 0.02, PAL.edge);
    bCubeRods.forEach((r) => { if (!cubeOn) r.visible = false; });
    const w = Math.min(p[3], 1);
    nest = w >= 0.999 ? Math.min(1, nest + dt / 0.8) : 0;
    const off = new THREE.Vector3(0.22, 0.22, 0.22).multiplyScalar(w * (1 - nest) + nest * 0.05);
    const showCopy = w > 0.02 && nest < 0.95;
    drawBox(bCopyRods, o.clone().add(new THREE.Vector3(L / 2, L / 2, 0)).add(off), L, L, L, PAL.edge);
    bCopyRods.forEach((r) => { r.visible = showCopy && cubeOn; });
    const a0 = o.clone().add(new THREE.Vector3(L / 2, L / 2, 0));
    for (let i = 0; i < 8; i++) {
      const s = new THREE.Vector3((i & 1) ? L / 2 : -L / 2, (i & 2) ? L / 2 : -L / 2, (i & 4) ? L / 2 : -L / 2);
      pose(bJoin[i], _a.copy(a0).add(s), _b.copy(a0).add(s).add(off), 0.004);
      bJoin[i].visible = showCopy && cubeOn && w > 0.05;
    }
    const showNest = nest > 0.02;
    if (showNest) {
      const center = o.clone().add(new THREE.Vector3(L / 2, L / 2, 0));
      projectTess("XW", 0, 0.16, center);
      H4.E.forEach(([i, j], e) => pose(bNest[e], PTS[i], PTS[j], 0.004));
    }
    bNest.forEach((r) => { r.visible = showNest; r.material.opacity = nest; });
    const showReveal = page === "s17" || model.card?.scene === "build";
    bCorners.forEach((c, i) => {
      c.visible = showReveal && showNest && model.reveal > i / 16;
      if (c.visible) c.position.copy(PTS[i]);
    });
    wBead.visible = wRuler.mesh.visible = page === "s15" || w > 0;
    if (wBead.visible) {
      const local = beadLocal(w * 2 - 1);
      wBead.position.copy(wRuler.mesh.localToWorld(local));
      wBead.scale.setScalar(1 + 0.1 * Math.sin(t * 3));
    }
    dialCard.mesh.visible = knob.visible = page === "s16" || page === "s17" || !!model.card;
    if (dialCard.mesh.visible) {
      const label = model.dialPhase === "edges" ? `edges  ${model.dial}` : `corners  ${model.dial}`;
      dialCard.redraw((g, w, h) => {
        g.fillStyle = "#10151d"; g.font = "700 64px Inter, sans-serif"; g.fillText(String(model.dial), 40, 120);
        g.font = "600 28px Inter, sans-serif"; g.fillText(label, 40, 170);
        if (model.lockC != null) g.fillText("guess " + model.lockC, 180, 80);
        if (model.lockE != null) g.fillText("edges " + model.lockE, 180, 120);
      });
    }
    formula.mesh.visible = model.help >= 2 && (page === "s17" || model.card?.scene === "build");
    minis.forEach((m, i) => { m.visible = p[i] >= 0.98; });
    if (minis[0].visible && !minis[0].children.length) {
      minis[0].add(new THREE.Mesh(new THREE.SphereGeometry(0.02, 8, 6), basic(PAL.gold)));
      minis[1].add(rod(PAL.gold)); pose(minis[1].children[0], new THREE.Vector3(-0.05, 0, 0), new THREE.Vector3(0.05, 0, 0), 0.004);
      const sq = new THREE.Mesh(new THREE.PlaneGeometry(0.08, 0.08), basic(PAL.gold, 0.8)); sq.rotation.x = -Math.PI / 2; minis[2].add(sq);
      drawBox([rod(PAL.edge), rod(PAL.edge), rod(PAL.edge), rod(PAL.edge)], new THREE.Vector3(), 0.06, 0.06, 0.06, PAL.edge);
      // four rods is not a cube; a tiny box edges via EdgesGeometry instead
      minis[3].add(new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(0.07, 0.07, 0.07)), new THREE.LineBasicMaterial({ color: PAL.edge })));
    }
    shelf.visible = true;
  }

  function updateTess(model, head) {
    const tabletop = model.tabletop;
    // The shadow stays put: the seat is the centre of the 3 m outer cube, and the
    // 1.5 m inner cube is the near cell in front of that seat. Tabletop is the
    // only mode that moves the shape. The inline overview is a camera move.
    const scale = tabletop ? SHADOW_SCALE * (1.2 / 3) : SHADOW_SCALE;
    const center = tabletop ? new THREE.Vector3(0, 1.15, -1.25) : new THREE.Vector3(0, EYE_Y, 0);
    projectTess(model.plane || "XW", model.angle || 0, scale, center);
    const origin = head || _seat;
    const headArr = [origin.x, origin.y, origin.z];
    const gold = model.cell == null ? CELLS.findIndex((c) => c.axis === 3 && c.sign === -1) : model.cell;
    H4.E.forEach(([i, j], e) => {
      const piece = clipSegmentOutsideSphere(
        [PTS[i].x, PTS[i].y, PTS[i].z],
        [PTS[j].x, PTS[j].y, PTS[j].z],
        headArr, HEAD_CLIP_M,
      );
      if (!piece) { tCore[e].visible = false; tHalo[e].visible = false; return; }
      _a.set(piece[0], piece[1], piece[2]);
      _b.set(piece[3], piece[4], piece[5]);
      const dist = segmentDistance(origin, _a, _b);
      const fade = wireFade(dist, HEAD_FADE_M);
      if (fade <= 0.01) { tCore[e].visible = false; tHalo[e].visible = false; return; }
      pose(tCore[e], _a, _b, 0.006);
      pose(tHalo[e], _a, _b, 0.016);
      tCore[e].material.opacity = fade;
      tHalo[e].material.opacity = 0.22 * fade;
      tCore[e].renderOrder = 3;
      tHalo[e].renderOrder = 2;
      const onGold = CELLS[gold].ids.includes(i) && CELLS[gold].ids.includes(j);
      tCore[e].material.color.setHex(onGold ? PAL.gold : PAL.edge);
    });
    tCells.forEach((mesh, ci) => {
      const attr = mesh.geometry.attributes.position;
      const arr = attr.array;
      let o = 0, tris = 0;
      let near = Infinity;
      for (const f of CELL_FACES[ci]) {
        const q = f.map((id) => pushOutOfHead(PTS[id], origin, HEAD_CLIP_M));
        for (const p of q) near = Math.min(near, p.distanceTo(origin));
        for (const id of [0, 1, 2, 0, 2, 3]) { arr[o++] = q[id].x; arr[o++] = q[id].y; arr[o++] = q[id].z; }
        tris += 2;
      }
      mesh.geometry.setDrawRange(0, tris * 3);
      attr.needsUpdate = true;
      mesh.geometry.computeBoundingSphere();
      const fade = wireFade(near, HEAD_FADE_M);
      mesh.material.opacity = (ci === gold ? 0.28 : 0.04) * fade;
      mesh.material.color.setHex(ci === gold ? PAL.gold : PAL.glass);
      mesh.renderOrder = 1;
    });
    const ang = model.angle || 0;
    needle.rotation.y = -ang;
    notch90.position.set(Math.sin(Math.PI / 2) * 0.16, 0.02, -Math.cos(Math.PI / 2) * 0.16);
    notch180.position.set(Math.sin(Math.PI) * 0.16, 0.02, -Math.cos(Math.PI) * 0.16);
    planeMarks.forEach((m, i) => {
      const a = -0.6 + i * 0.6;
      m.position.set(Math.sin(a) * 0.16, 0.03, -Math.cos(a) * 0.16);
      m.material.color.setHex(W_PLANES[i] === model.plane ? PAL.gold : PAL.ink);
      planeLabels[i].mesh.visible = model.help >= 2;
      planeLabels[i].mesh.position.set(Math.sin(a) * 0.24, 0.08, -Math.cos(a) * 0.24);
    });
    const deg = Math.round((ang * 180 / Math.PI) % 360);
    degCard.set(deg + "°");
    trueCell.visible = true;
  }

  function updateHyper(model, t, page, scene) {
    const c = model.bead6 * 0.9;
    const r = sphereSliceRadius(HYPER_R, c);
    hyper.visible = r > 0.01 && scene !== "finale";
    hyper.scale.setScalar(Math.max(r, 0.001));
    hyper.position.set(0, 1.15, HYPER_Z);
    bead6.position.copy(beadLocal(model.bead6));
    bead6.position.z = 0.02;
    bead6.scale.setScalar(1 + 0.08 * Math.sin(t * 3));
    bead6.visible = ruler6.mesh.visible = scene !== "finale" && page !== "s23";
    ghost.visible = model.guessD != null && scene !== "finale";
    if (ghost.visible) {
      ghost.scale.setScalar(model.guessD / 2);
      ghost.position.copy(hyper.position);
    }
    flickCards.forEach((card) => { card.mesh.visible = model.help >= 1 && (page === "s25" || page === "s24"); });
    tickets.forEach((card, i) => {
      card.mesh.visible = page === "s26";
      const id = ["slice", "shadow", "tess"][i];
      card.mesh.position.y = 1.15 + (model.ticket[id] ? 0.06 : 0);
    });
    finaleCard.mesh.visible = scene === "finale" || page === "s27";
    hyperRing.visible = r > 0.05;
  }

  return { root, grabs, update, EYE_Y, pad: pad.mesh, ruler: ruler.mesh, ruler6: ruler6.mesh };
}

function segmentDistance(head, a, b) {
  const abx = b.x - a.x, aby = b.y - a.y, abz = b.z - a.z;
  const len2 = abx * abx + aby * aby + abz * abz || 1;
  let t = ((head.x - a.x) * abx + (head.y - a.y) * aby + (head.z - a.z) * abz) / len2;
  t = Math.max(0, Math.min(1, t));
  const x = a.x + abx * t - head.x, y = a.y + aby * t - head.y, z = a.z + abz * t - head.z;
  return Math.hypot(x, y, z);
}
function pushOutOfHead(p, head, radius) {
  const slot = _pushed[_pushN = (_pushN + 1) % 4];
  slot.copy(p).sub(head);
  const d = slot.length();
  if (d < radius) slot.multiplyScalar(d > 1e-6 ? radius / d : 1).add(head);
  else slot.copy(p);
  return slot;
}
let _pushN = 0;
function beadLocal(t) {
  // t in -1..1 across the ruler's width. Ruler plane is 0.42 wide before scale.
  return new THREE.Vector3(t * 0.16, 0, 0.01);
}
function ring(r, color, opacity) {
  const n = 48;
  const g = new THREE.BufferGeometry();
  const p = new Float32Array((n + 1) * 3);
  for (let i = 0; i <= n; i++) {
    const a = (i / n) * Math.PI * 2;
    p[i * 3] = Math.cos(a) * r; p[i * 3 + 2] = Math.sin(a) * r;
  }
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  const line = new THREE.Line(g, new THREE.LineBasicMaterial({ color, transparent: opacity < 1, opacity }));
  line.frustumCulled = false;
  return line;
}
function wireBox(size, color, opacity) {
  return new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.BoxGeometry(size, size, size)), new THREE.LineBasicMaterial({ color, transparent: true, opacity }));
}
function sparkles(n) {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    p[i * 3] = (Math.random() - 0.5) * 6;
    p[i * 3 + 1] = 0.4 + Math.random() * 2.2;
    p[i * 3 + 2] = -0.4 - Math.random() * 4;
  }
  g.setAttribute("position", new THREE.BufferAttribute(p, 3));
  return new THREE.Points(g, new THREE.PointsMaterial({ color: PAL.grid, size: 0.015, transparent: true, opacity: 0.7, depthWrite: false }));
}
function textPlane(label, wide = false) {
  const W = wide ? 1280 : 512, H = 160;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const ctx = c.getContext("2d");
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(wide ? 0.96 : 0.36, 0.12), basic(0xffffff, 0.001));
  mesh.material.map = tex; mesh.material.transparent = true; mesh.material.opacity = 1; mesh.material.depthWrite = false;
  function set(text) {
    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = "#f4f1e8"; roundRect(ctx, 8, 20, W - 16, H - 40, 28); ctx.fill();
    ctx.fillStyle = "#10151d"; ctx.font = "700 56px Inter, sans-serif"; ctx.textBaseline = "middle";
    ctx.fillText(text, 28, H / 2);
    tex.needsUpdate = true;
  }
  set(label);
  return { mesh, set };
}
function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath();
}
function writeTri(mesh, a, b, c, d, e, f) {
  const arr = mesh.geometry.attributes.position.array;
  const pts = [a, b, c, d, e, f];
  for (let i = 0; i < 6; i++) { arr[i * 3] = pts[i].x; arr[i * 3 + 1] = pts[i].y; arr[i * 3 + 2] = pts[i].z; }
  mesh.geometry.attributes.position.needsUpdate = true;
  mesh.geometry.computeBoundingSphere();
}
function shadowPoint(v) {
  const s = shadowArray([v.x, v.y, v.z]);
  return s ? new THREE.Vector3(s[0], s[1], s[2]) : null;
}
function shadowArray(p) {
  const L = SCENE3.lamp, zs = SCENE3.screenZ;
  const denom = L[2] - p[2];
  if (Math.abs(denom) < 1e-6) return null;
  const t = (L[2] - zs) / denom;
  if (t < 0) return null;
  return [L[0] + (p[0] - L[0]) * t, L[1] + (p[1] - L[1]) * t, zs + 0.01];
}
function drawBox(rods, center, sx, sy, sz) {
  const x = sx / 2, y = sy / 2, z = sz / 2;
  const p = [
    [-x, -y, -z], [x, -y, -z], [x, y, -z], [-x, y, -z],
    [-x, -y, z], [x, -y, z], [x, y, z], [-x, y, z],
  ].map((q) => new THREE.Vector3(q[0], q[1], q[2]).add(center));
  const e = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
  e.forEach(([i, j], k) => { if (rods[k]) pose(rods[k], p[i], p[j], 0.005); });
}
function writeStrokes(line, strokes) {
  const arr = line.geometry.attributes.position.array;
  let o = 0;
  for (const s of strokes) {
    for (let i = 0; i + 1 < s.length; i++) {
      if (o + 6 > arr.length) break;
      arr[o++] = s[i][0]; arr[o++] = s[i][1]; arr[o++] = 0.01;
      arr[o++] = s[i + 1][0]; arr[o++] = s[i + 1][1]; arr[o++] = 0.01;
    }
  }
  line.geometry.setDrawRange(0, o / 3);
  line.geometry.attributes.position.needsUpdate = true;
}
function drawTile(g, w, h, name) {
  g.strokeStyle = "#10151d"; g.lineWidth = 10; g.beginPath();
  const cx = w / 2, cy = h / 2 + 20;
  if (name === "tri") poly(g, [[cx, cy - 70], [cx - 70, cy + 50], [cx + 70, cy + 50]]);
  else if (name === "quad") poly(g, [[cx - 70, cy - 20], [cx + 40, cy - 60], [cx + 75, cy + 40], [cx - 40, cy + 55]]);
  else if (name === "pent") poly(g, [[cx, cy - 70], [cx + 66, cy - 20], [cx + 40, cy + 60], [cx - 40, cy + 60], [cx - 66, cy - 20]]);
  else poly(g, [[cx - 30, cy - 70], [cx + 30, cy - 70], [cx + 70, cy], [cx + 30, cy + 70], [cx - 30, cy + 70], [cx - 70, cy]]);
  g.stroke();
}
function poly(g, pts) { pts.forEach((p, i) => i ? g.lineTo(p[0], p[1]) : g.moveTo(p[0], p[1])); g.closePath(); }
function drawTicket(g, w, h, id) {
  g.strokeStyle = "#1f4f8a"; g.lineWidth = 6;
  if (id === "slice") { g.beginPath(); g.arc(w / 2, h / 2 + 30, 40, 0, Math.PI * 2); g.stroke(); }
  else if (id === "shadow") { g.strokeRect(w / 2 - 40, h / 2, 80, 60); }
  else { g.strokeRect(w / 2 - 36, h / 2 - 6, 72, 72); g.strokeRect(w / 2 - 16, h / 2 + 16, 32, 32); }
}
