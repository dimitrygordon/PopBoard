// Gravity Well Golf: Three.js view. A gridded rubber-sheet plane whose vertices are pushed down
// by the masses (visual analogy only, see CAVEAT), sprites for the ball, masses and cup,
// an additive teal glow ring at the cup, a fading collision puff and an aim guide.
import * as THREE from "../vendor/three/three.module.min.js";
import { W, H, BALL_R, KINDS, HOLE_SCALE, depth } from "./gwg-physics.js";

const SPRITES = ["ball", "ball-shadow", "hole", "puff", ...Object.values(KINDS).map((k) => k.sprite.replace(".webp", ""))];
export const PUFF_MS = 280; // the puff is gone within about 300 ms (Leo)

export function createScene(canvas) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 200);
  const world = new THREE.Group(); scene.add(world);           // world x,y on the sheet, z up
  const maxAniso = renderer.capabilities.getMaxAnisotropy();
  const loader = new THREE.TextureLoader();
  const tex = {};
  for (const n of SPRITES) {
    const t = loader.load(`gravity-well-golf/sprites/${n}.webp`, () => { dirty = true; if (n === KINDS.star.sprite.replace(".webp", "")) applyHalo(); });
    t.colorSpace = THREE.SRGBColorSpace;
    // Mipmapped with trilinear + anisotropic filtering so the heavy mass texture never shimmers.
    t.generateMipmaps = true; t.minFilter = THREE.LinearMipmapLinearFilter; t.magFilter = THREE.LinearFilter; t.anisotropy = maxAniso;
    tex[n] = t;
  }
  let dirty = true;

  // ---- sheet: fill mesh + grid lines, both displaced by depth() ----
  const SEG_X = 128, SEG_Y = 80;
  const planeGeo = new THREE.PlaneGeometry(W, H, SEG_X, SEG_Y);
  const planeMat = new THREE.MeshBasicMaterial({ color: 0x141b26 });
  const plane = new THREE.Mesh(planeGeo, planeMat); world.add(plane);
  const STEP = 0.5, SAMPLE = 0.125, lines = [];
  for (let x = -W / 2; x <= W / 2 + 1e-9; x += STEP) { const pts = []; for (let y = -H / 2; y <= H / 2 + 1e-9; y += SAMPLE) pts.push(x, y); lines.push(pts); }
  for (let y = -H / 2; y <= H / 2 + 1e-9; y += STEP) { const pts = []; for (let x = -W / 2; x <= W / 2 + 1e-9; x += SAMPLE) pts.push(x, y); lines.push(pts); }
  let segCount = 0; for (const l of lines) segCount += l.length / 2 - 1;
  const gridPos = new Float32Array(segCount * 6);
  const gridGeo = new THREE.BufferGeometry(); gridGeo.setAttribute("position", new THREE.BufferAttribute(gridPos, 3));
  const gridMat = new THREE.LineBasicMaterial({ color: 0x3fc6dc, transparent: true, opacity: 0.45 });
  const grid = new THREE.LineSegments(gridGeo, gridMat); world.add(grid);
  function updateSheet(masses) {
    const p = planeGeo.attributes.position;
    for (let i = 0; i < p.count; i++) p.setZ(i, depth(p.getX(i), p.getY(i), masses) - 0.01);
    p.needsUpdate = true;
    let k = 0;
    for (const l of lines) for (let i = 0; i < l.length - 2; i += 2) {
      gridPos[k++] = l[i]; gridPos[k++] = l[i + 1]; gridPos[k++] = depth(l[i], l[i + 1], masses);
      gridPos[k++] = l[i + 2]; gridPos[k++] = l[i + 3]; gridPos[k++] = depth(l[i + 2], l[i + 3], masses);
    }
    gridGeo.attributes.position.needsUpdate = true; gridGeo.computeBoundingSphere(); dirty = true;
  }

  const sprite = (name, size) => { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex[name], transparent: true, depthWrite: false })); s.scale.set(size, size, 1); return s; };
  const D = BALL_R * 2;
  // ---- cup: sprite + additive teal glow ring drawn in code ----
  const cup = sprite("hole", D * HOLE_SCALE); cup.center.set(0.5, 0.3); world.add(cup);
  const ring = new THREE.Mesh(new THREE.RingGeometry(0.3, 0.52, 48), new THREE.MeshBasicMaterial({ color: 0x45c9b5, transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false }));
  world.add(ring);
  const tee = new THREE.Mesh(new THREE.RingGeometry(0.16, 0.22, 32), new THREE.MeshBasicMaterial({ color: 0x8fa3b8, transparent: true, opacity: 0.8 })); world.add(tee);
  // ---- ball + shadow ----
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(D * 1.1, D * 1.1), new THREE.MeshBasicMaterial({ map: tex["ball-shadow"], transparent: true, depthWrite: false, opacity: 0.55 }));
  world.add(shadow);
  const ball = sprite("ball", D); ball.renderOrder = 5; world.add(ball);
  // ---- aim guide + trail ----
  const aimGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const aim = new THREE.Line(aimGeo, new THREE.LineDashedMaterial({ color: 0xffffff, dashSize: 0.18, gapSize: 0.12, transparent: true, opacity: 0.9 })); aim.visible = false; world.add(aim);
  const trailGeo = new THREE.BufferGeometry(); trailGeo.setAttribute("position", new THREE.BufferAttribute(new Float32Array(3 * 2000), 3)); trailGeo.setDrawRange(0, 0);
  const trail = new THREE.Line(trailGeo, new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.5 })); world.add(trail);
  let trailN = 0;
  // ---- masses ----
  let massSprites = [], lightTheme = false;
  // Paper theme: the star's white halo (its ring of rays) reads as a hard faceted edge on a light
  // sheet, so the Paper star uses a copy of the sprite with the halo faded out by a round mask.
  let paperStar = null;
  const starTex = () => {
    const img = tex[KINDS.star.sprite.replace(".webp", "")]?.image; if (!img?.width) return null;
    if (paperStar) return paperStar;
    const c = document.createElement("canvas"); c.width = img.width; c.height = img.height; const g = c.getContext("2d"), h = img.width / 2;
    g.drawImage(img, 0, 0); g.globalCompositeOperation = "destination-in";
    const r = g.createRadialGradient(h, h, 0, h, h, h);
    r.addColorStop(0, "#000"); r.addColorStop(0.7, "#000"); r.addColorStop(0.76, "rgba(0,0,0,0.15)"); r.addColorStop(0.86, "rgba(0,0,0,0)");
    g.fillStyle = r; g.fillRect(0, 0, c.width, c.height);
    paperStar = new THREE.CanvasTexture(c); paperStar.colorSpace = tex[KINDS.star.sprite.replace(".webp", "")].colorSpace; return paperStar;
  };
  function applyHalo() { masses_.forEach((m, i) => { const s = massSprites[i]; if (!s || m.kind !== "star") return; const t = lightTheme && starTex(); s.material.map = t || tex[KINDS.star.sprite.replace(".webp", "")]; s.material.needsUpdate = true; }); dirty = true; }
  let masses_ = [];
  function setMasses(masses) {
    for (const s of massSprites) world.remove(s);
    massSprites = masses.map((m) => { const s = sprite(KINDS[m.kind].sprite.replace(".webp", ""), D * KINDS[m.kind].scale); s.material.depthTest = false; s.renderOrder = 4; world.add(s); return s; }); // drawn over the sheet so the dent never clips the sphere into facets
    masses_ = masses; applyHalo();
    updateSheet(masses); placeMasses(masses);
  }
  function placeMasses(masses) { masses.forEach((m, i) => { const s = massSprites[i]; if (s) s.position.set(m.x, m.y, depth(m.x, m.y, masses) + D * KINDS[m.kind].scale * 0.35); }); dirty = true; }
  // ---- puffs (fade out within PUFF_MS) ----
  const puffs = [];
  function puff(x, y, masses, now) { const s = sprite("puff", D * 2); s.position.set(x, y, depth(x, y, masses) + 0.2); s.material.opacity = 1; world.add(s); puffs.push({ s, t0: now }); dirty = true; }

  let masses = [], portrait = false;
  function resize() {
    const r = canvas.getBoundingClientRect(), w = Math.max(1, r.width), h = Math.max(1, r.height);
    renderer.setSize(w, h, false); camera.aspect = w / h;
    portrait = h > w * 1.1;
    world.rotation.z = portrait ? Math.PI / 2 : 0;           // phones: the field turns to fit the screen
    const fw = portrait ? H : W, fh = portrait ? W : H;
    const vfov = THREE.MathUtils.degToRad(camera.fov), tilt = THREE.MathUtils.degToRad(38);
    const distH = (fh * 0.62) / Math.tan(vfov / 2), distW = (fw * 0.56) / (Math.tan(vfov / 2) * camera.aspect);
    const dist = Math.max(distH, distW) * fitPad;
    camera.position.set(0, -Math.sin(tilt) * dist + fitShift, Math.cos(tilt) * dist);
    camera.up.set(0, 1, 0); camera.lookAt(0, fitShift, 0);
    camera.updateProjectionMatrix(); dirty = true;
  }
  let fitPad = 1, fitShift = 0;
  function setFit(pad, shift) { fitPad = pad; fitShift = shift; resize(); }

  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2(), flat = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0), hit = new THREE.Vector3();
  // Screen point to world (x, y) on the flat sheet (z = 0), in field coordinates.
  function toWorld(clientX, clientY) {
    const r = canvas.getBoundingClientRect();
    ndc.set(((clientX - r.left) / r.width) * 2 - 1, -((clientY - r.top) / r.height) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    if (!ray.ray.intersectPlane(flat, hit)) return null;
    const p = world.worldToLocal(hit.clone()); return { x: p.x, y: p.y };
  }
  function toScreen(x, y, z = 0) {
    const v = world.localToWorld(new THREE.Vector3(x, y, z)).project(camera), r = canvas.getBoundingClientRect();
    return { x: (v.x + 1) / 2 * r.width, y: (1 - v.y) / 2 * r.height };
  }

  function setPalette(p) {
    planeMat.color.set(p.sheet); gridMat.color.set(p.grid); gridMat.opacity = p.gridOpacity;
    ring.material.color.set(p.ring); ring.material.blending = p.light ? THREE.NormalBlending : THREE.AdditiveBlending; ring.material.needsUpdate = true;
    aim.material.color.set(p.aim); trail.material.color.set(p.aim); tee.material.color.set(p.tee); lightTheme = !!p.light; applyHalo(); dirty = true;
  }

  return {
    resize, setFit, toWorld, toScreen, setPalette, puff,
    setLayout(hole, ms) { masses = ms; setMasses(ms); const cz = depth(hole.cup.x, hole.cup.y, ms); cup.position.set(hole.cup.x, hole.cup.y, cz + 0.02); ring.position.set(hole.cup.x, hole.cup.y, cz + 0.015);
      tee.position.set(hole.tee.x, hole.tee.y, depth(hole.tee.x, hole.tee.y, ms) + 0.01); },
    moveMasses(ms) { masses = ms; updateSheet(ms); placeMasses(ms); },
    setBall(b) { const z = depth(b.x, b.y, masses); ball.position.set(b.x, b.y, z + BALL_R); shadow.position.set(b.x + 0.06, b.y - 0.1, z + 0.005); ball.visible = shadow.visible = !b.hidden; dirty = true; },
    setAim(a) { if (!a) { aim.visible = false; dirty = true; return; } const z = 0.05;
      aimGeo.setFromPoints([new THREE.Vector3(a.x0, a.y0, depth(a.x0, a.y0, masses) + z), new THREE.Vector3(a.x1, a.y1, depth(a.x1, a.y1, masses) + z)]); aim.computeLineDistances(); aim.visible = true; dirty = true; },
    clearTrail() { trailN = 0; trailGeo.setDrawRange(0, 0); dirty = true; },
    addTrail(x, y) { if (trailN >= 2000) return; const a = trailGeo.attributes.position; a.setXYZ(trailN++, x, y, depth(x, y, masses) + 0.02); a.needsUpdate = true; trailGeo.setDrawRange(0, trailN); dirty = true; },
    showTrail(on) { trail.visible = on; dirty = true; },
    render(now, reduced) {
      ring.material.opacity = reduced ? 0.35 : 0.28 + 0.12 * Math.sin(now / 420); // gentle pulse
      for (let i = puffs.length - 1; i >= 0; i--) {
        const p = puffs[i], t = (now - p.t0) / PUFF_MS;
        if (t >= 1) { world.remove(p.s); p.s.material.dispose(); puffs.splice(i, 1); continue; }
        p.s.material.opacity = 1 - t; const sc = BALL_R * 2 * 2 * (reduced ? 1 : 0.8 + 0.4 * t); p.s.scale.set(sc, sc, 1);
      }
      renderer.render(scene, camera);
    },
    get portrait() { return portrait; }, renderer, textures: tex
  };
}
