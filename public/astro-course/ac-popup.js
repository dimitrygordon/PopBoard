// Astronomy Course pop-up engine (storybook v2). One shared Three.js renderer for every deck.
// Each page turn (Leo's final sequence): edge lines draw on over 0.6s while the camera eases in,
// the pencil hatch sweeps across over 0.4s and the full texture settles, then play. 0.2s stagger.
// Pencil cutouts stand up as layered planes; parallax follows pointer, drag and device tilt.
// Reduce-motion (or no WebGL): cutouts stay flat in the DOM and the touch interactions still work.
import { reduceMotion } from "./ac-common.js";

export const TIMING = { sketch: 0.6, color: 0.4, pop: 0, stagger: 0.2 };
const W = 16, H = 9, FOV = 30, DIST = (H / 2) / Math.tan((FOV / 2) * Math.PI / 180);
const isPhone = () => matchMedia("(max-width: 699px)").matches;
let THREE = null, renderer = null;
const stats = { scenesBuilt: 0, scenesDisposed: 0, frames: 0, fps: 0, dpr: 1, planes: 0, textures: 0, geometries: 0, live: 0 };
if (typeof window !== "undefined") window.__popupStats = stats;

// Probe once and release the probe context, so page turns never stack up WebGL contexts.
let glProbe = null;
export function webglOk() {
  if (glProbe !== null) return glProbe;
  try { const c = document.createElement("canvas"), gl = c.getContext("webgl2") || c.getContext("webgl"); glProbe = !!gl; if (gl) gl.getExtension("WEBGL_lose_context")?.loseContext(); } catch (e) { glProbe = false; }
  return glProbe;
}
async function three() {
  if (!THREE) THREE = await import("../vendor/three/three.module.min.js");
  if (!renderer) {
    renderer = new THREE.WebGLRenderer({ antialias: !isPhone(), alpha: true, powerPreference: "low-power" });
    renderer.setClearColor(0x000000, 0);
    renderer.domElement.className = "pop-gl";
    renderer.domElement.setAttribute("aria-hidden", "true");
  }
  return THREE;
}

// The cutout shader: graphite outline wipes on, then the colored-pencil fill shimmers in behind it.
const VERT = `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`;
const FRAG = `uniform sampler2D map; uniform float uSketch, uColor, uTime, uShadow, uHalo, uFade; varying vec2 vUv;
float h(vec2 p){ return fract(sin(dot(p, vec2(12.9898,78.233))) * 43758.5453); }
void main(){
  vec4 t = texture2D(map, vUv);
  if (uShadow > 0.5) { if (t.a < 0.05) discard; gl_FragColor = vec4(0.12,0.1,0.08, t.a * 0.22); return; }
  float lum = dot(t.rgb, vec3(0.299,0.587,0.114));
  float line = smoothstep(0.55, 0.25, lum);
  float edge = vUv.x * 0.7 + (1.0 - vUv.y) * 0.3 + (h(floor(vUv * 60.0)) - 0.5) * 0.06;
  float drawn = step(edge, uSketch * 1.08);
  float sweep = step(vUv.x + vUv.y * 0.35, uColor * 1.4);
  float hatch = step(0.5, fract((vUv.x + vUv.y) * 90.0));
  float settle = smoothstep(0.7, 1.0, uColor);
  float fill = sweep * mix(hatch * 0.85, 1.0, settle);
  vec3 graphite = vec3(0.24);
  vec3 col = mix(graphite, t.rgb, fill);
  float a = t.a * max(line * drawn, fill);
  if (a < 0.01) discard;
  gl_FragColor = vec4(col, a * uFade);
}`;

function haloTexture(T) {
  // Soft pencil halo for touchable objects (glow built only with createRadialGradient).
  const c = document.createElement("canvas"); c.width = c.height = 128;
  const g = c.getContext("2d"), r = g.createRadialGradient(64, 64, 20, 64, 64, 64);
  r.addColorStop(0, "rgba(226,182,84,0.35)"); r.addColorStop(1, "rgba(226,182,84,0)");
  g.fillStyle = r; g.fillRect(0, 0, 128, 128);
  const t = new T.CanvasTexture(c); return t;
}

const ease = (x) => x < 0 ? 0 : x > 1 ? 1 : 1 - Math.pow(1 - x, 3);
const spring = (x) => x <= 0 ? 0 : x >= 1 ? 1 : 1 - Math.exp(-6 * x) * Math.cos(9 * x);

export function createPopup({ stage, base, onFrame }) {
  let scene = null, cam = null, items = [], t0 = 0, raf = 0, alive = true, skip = false, slide = null;
  let stageScene = null;
  let special = null, imm = false, look = null, pointers = new Map(), idleAt = 0; let par = { x: 0, y: 0, tx: 0, ty: 0 }, drag = null, last = performance.now(), fpsAcc = [0, 0];
  const flat = () => reduceMotion() || !webglOk();

  function dispose() {
    cancelAnimationFrame(raf); raf = 0; if (stageScene && stageScene.dispose) stageScene.dispose(); stageScene = null;
    if (scene) {
      scene.traverse((o) => { if (o.geometry) o.geometry.dispose(); if (o.material) { for (const k of ["map"]) if (o.material.uniforms && o.material.uniforms[k]) o.material.uniforms[k].value.dispose(); if (o.material.map) o.material.map.dispose(); o.material.dispose(); } });
      stats.scenesDisposed++;
    }
    if (special && special.dispose) special.dispose(); special = null;
    scene = null; items = [];
    if (renderer) renderer.renderLists.dispose();
    stats.live = renderer ? renderer.info.memory.textures : 0;
  }

  // World placement: a plane at height z is shrunk toward the camera axis so at rest it lines up
  // exactly with its spot on the printed page; parallax then shows the depth.
  function place(box, z) {
    const [x, y, w, h] = box, k = (DIST - z) / DIST;
    return { cx: ((x + w / 2) / 100 * W - W / 2) * k, cy: (H / 2 - (y + h / 2) / 100 * H) * k, w: w / 100 * W * k, h: h / 100 * H * k };
  }

  async function show(s, opts = {}) {
    dispose(); slide = s; skip = false;
    const host = stage;
    const layers = s.layers || [];
    // DOM layers: flat ones always; popped ones only when 3D is off.
    // Every page gets a live scene: pages with only cards and text get gentle 3D (cards sketch in and tilt).
    const gentle = !layers.some((l) => !l.flat) && opts.special !== "starfield";
    const useGL = webglOk() && ((!reduceMotion() && layers.length > 0) || !!opts.special || !!opts.hero || !!opts.immersive);
    imm = !!opts.immersive && useGL;
    look = { yaw: 0, pitch: 0, dolly: 0, tyaw: 0, tpitch: 0, tdolly: 0, max: opts.maxDolly ?? DIST * 0.55 };
    const phone = isPhone(), maxPop = imm ? (phone ? 8 : 16) : phone ? 5 : 12;
    const popped = imm ? layers.filter((l) => !(opts.drop || []).includes(l.src)).sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]).slice(0, maxPop)
      : useGL && !reduceMotion() && opts.special !== "starfield" ? layers.filter((l) => gentle ? l.box[3] >= 6 : !l.flat).sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]).slice(0, maxPop) : [];
    const order = entryOrder(layers, popped);
    const dom = document.createElement("div"); dom.className = "pop-flat"; dom.setAttribute("aria-hidden", "true");
    for (const l of layers) {
      if (popped.includes(l) || (imm && (opts.drop || []).includes(l.src))) continue;
      const im = document.createElement("img");
      im.src = base + l.src; im.alt = ""; im.draggable = false; im.decoding = "async";
      im.className = "pop-layer" + (l.interact ? " touch" : "") + (l.motion && l.motion !== "none" && !reduceMotion() ? " m-" + l.motion : "");
      const [x, y, w, h] = l.box; im.style.cssText = `left:${x}%;top:${y}%;width:${w}%;height:${h}%;--d:${order.get(l) * TIMING.stagger}s`;
      if (l.interact) bindFlatTouch(im, l);
      dom.appendChild(im);
    }
    host.prepend(dom);
    host.classList.toggle("pop-entering", !reduceMotion());
    stats.planes = popped.length;
    if (!useGL) { stats.dpr = 0; return; }
    const T = await three();
    if (slide !== s || !alive) return;
    scene = new T.Scene(); stats.scenesBuilt++;
    cam = new T.PerspectiveCamera(FOV, W / H, 0.1, 100); cam.position.set(0, 0, DIST);
    const dpr = Math.min(devicePixelRatio || 1, phone ? 1 : 1.5); stats.dpr = dpr;
    renderer.setPixelRatio(dpr);
    host.appendChild(renderer.domElement);
    resize();
    // ImageBitmaps arrive pre-flipped, so the upload never needs a GPU readback (no "GPU stall due to ReadPixels").
    const bitmaps = typeof createImageBitmap === "function";
    const loader = bitmaps ? new T.ImageBitmapLoader().setOptions({ imageOrientation: "flipY", premultiplyAlpha: "none" }) : new T.TextureLoader();
    const loadTex = (url) => {
      if (!bitmaps) return loader.load(url);
      const t = new T.Texture(); t.flipY = false;
      loader.load(url, (bmp) => { if (!alive) { bmp.close && bmp.close(); return; } t.image = bmp; t.needsUpdate = true; });
      const d = t.dispose.bind(t); t.dispose = () => { d(); t.image && t.image.close && t.image.close(); };
      return t;
    };
    const geo = new T.PlaneGeometry(1, 1); geo.translate(0, 0.5, 0); // hinge on the bottom edge
    const halo = haloTexture(T);
    const mids = popped.filter((l) => !l.flat && l.box[2] * l.box[3] < 4000);
    popped.forEach((l, i) => {
      const rank = popped.length - i; // smaller pieces stand in front
      // Inside the slide: background art far back, main drawings through the middle, thin labels and marks up front.
      const z = imm ? (l.box[2] * l.box[3] >= 4000 ? -6 - (i % 2) * 1.5 : l.flat ? 2.6 : -2.6 + 3.6 * (mids.indexOf(l) + 1) / (mids.length + 1))
        : gentle ? 0.12 : 0.25 + 0.9 * (rank / popped.length);
      const p = place(l.box, z);
      const tex = loadTex(base + l.src); tex.colorSpace = T.SRGBColorSpace; tex.anisotropy = 2;
      const mat = new T.ShaderMaterial({ uniforms: { map: { value: tex }, uSketch: { value: 0 }, uColor: { value: 0 }, uTime: { value: 0 }, uShadow: { value: 0 }, uHalo: { value: 0 }, uFade: { value: 1 } }, vertexShader: VERT, fragmentShader: FRAG, transparent: true, depthWrite: false });
      if (imm && z < -4) mat.uniforms.uFade.value = 0.8;
      const hinge = new T.Group(); hinge.position.set(p.cx, p.cy - p.h / 2, z);
      const mesh = new T.Mesh(geo, mat); mesh.scale.set(p.w, p.h, 1); hinge.add(mesh);
      let shadow = null;
      if (!phone && !imm) {
        const sm = mat.clone(); sm.uniforms.map.value = tex; sm.uniforms.uShadow.value = 1;
        shadow = new T.Mesh(geo, sm); const ps = place(l.box, 0);
        shadow.position.set(ps.cx + 0.08 * z, ps.cy - ps.h / 2 - 0.06 * z, 0); shadow.scale.set(ps.w, ps.h, 1); shadow.renderOrder = -1;
        scene.add(shadow);
      }
      let haloM = null;
      if (l.interact) { haloM = new T.Mesh(new T.PlaneGeometry(1, 1), new T.MeshBasicMaterial({ map: halo, transparent: true, depthWrite: false })); haloM.scale.set(Math.max(p.w, p.h) * 1.3, Math.max(p.w, p.h) * 1.3, 1); haloM.position.set(0, p.h / 2, -0.01); hinge.add(haloM); }
      scene.add(hinge);
      items.push({ gentle, l, hinge, mesh, mat, shadow, haloM, z, p, delay: order.get(l) * TIMING.stagger, ph: Math.random() * 6.28, user: { a: 0, va: 0, dx: 0, dy: 0, vx: 0, vy: 0, launch: -1 } });
    });
    special = null;
    if (imm) {
      // no generic star field or labels: each scene draws its own pieces, cut from the slide art
      const dark = document.documentElement.dataset.theme === "dark";
      scene.fog = new T.Fog(dark ? 0x1e2433 : 0xf6efdf, 40, 120);
      const lab = await import("./ac-scenes.js");
      if (slide !== s) return;
      if (opts.sceneModule) { try { const mod = await import(opts.sceneModule); if (slide !== s) return; stageScene = lab.runModule(mod, T, scene, { phone, dark, camera: cam, controls: opts.controls, still: reduceMotion(), DIST, W, H, place, base, art: opts.art || "" }); } catch (err) { console.info("scene module failed, using the generic scene", err); stageScene = null; } }
      if (!stageScene && opts.scene) { const sc = lab.build(opts.scene, T, scene, { phone, dark, camera: cam, controls: opts.controls, still: reduceMotion(), DIST, W, H, place, art: opts.art || "", kit: base + "v2/art/" }); if (sc) { stageScene = sc; } }
    }
    const kinds = [opts.special, opts.hero].filter(Boolean);
    if (kinds.length) {
      const mod = await import("./ac-pop3d.js");
      if (slide !== s) return;
      special = mod.buildAll(kinds, T, scene, { phone, controls: opts.controls, still: reduceMotion(), free: freeSpot(layers) });
    }
    stats.textures = renderer.info.memory.textures; stats.geometries = renderer.info.memory.geometries;
    t0 = performance.now(); loop();
  }

  // The hero object sits in the page corner least covered by words and popped art.
  function freeSpot(layers) {
    const sr = stage.getBoundingClientRect(), boxes = [];
    for (const tb of stage.querySelectorAll(".ac-tb")) { const r = tb.getBoundingClientRect(); if (r.width && tb.textContent.trim()) boxes.push([(r.left - sr.left) / sr.width * 100, (r.top - sr.top) / sr.height * 100, r.width / sr.width * 100, r.height / sr.height * 100, 3]); }
    for (const l of layers) if (!l.flat) boxes.push([...l.box, 1]);
    const rw = 9, rh = 16, spots = [[90, 17], [90, 82], [10, 82], [10, 17], [76, 17], [76, 82], [24, 82], [50, 84]];
    let best = spots[0], bestC = Infinity;
    for (const [cx, cy] of spots) {
      let c = 0; for (const [x, y, w, h, k] of boxes) { const ox = Math.max(0, Math.min(cx + rw, x + w) - Math.max(cx - rw, x)), oy = Math.max(0, Math.min(cy + rh, y + h) - Math.max(cy - rh, y)); c += ox * oy * k; }
      if (c < bestC - 1) { bestC = c; best = [cx, cy]; }
    }
    return { x: (best[0] / 100 - 0.5) * W, y: (0.5 - best[1] / 100) * H, r: isPhone() ? 0.75 : 0.62 };
  }
  // Background (big, flat) first, then the main object, then the rest; labels write on after the art.
  function entryOrder(layers, popped) {
    const m = new Map(), flats = layers.filter((l) => l.flat), main = popped.length ? popped : layers.filter((l) => !l.flat);
    let i = 0;
    flats.sort((a, b) => b.box[2] * b.box[3] - a.box[2] * a.box[3]).forEach((l) => m.set(l, Math.min(i++, 2) * 0.5));
    let j = flats.length ? 1 : 0;
    main.forEach((l) => m.set(l, j++));
    layers.forEach((l) => { if (!m.has(l)) m.set(l, j++); });
    m.labelsAt = j;
    return m;
  }
  function entryEnd() { return Math.max(special ? 1 : 0, items.reduce((a, it) => Math.max(a, it.delay), 0)) + TIMING.sketch + TIMING.color + TIMING.pop; }

  function resize() {
    if (!renderer || !scene) return;
    const r = stage.getBoundingClientRect();
    renderer.setSize(Math.max(1, Math.round(r.width)), Math.max(1, Math.round(r.height)), false);
  }

  function loop() {
    if (!alive || !scene) return;
    raf = requestAnimationFrame(loop);
    const now = performance.now(), dt = Math.min(0.05, (now - last) / 1000); last = now;
    // phones: 30 fps cap
    if (isPhone() && (fpsAcc[1] += dt) < 1 / 31) return; fpsAcc[1] = 0;
    if (document.hidden) return;
    const t = (now - t0) / 1000;
    fpsAcc[0]++; stats.frames++;
    par.x += (par.tx - par.x) * 0.06; par.y += (par.ty - par.y) * 0.06;
    const ce = skip ? 1 : ease(t / TIMING.sketch);
    if (imm) immersiveCamera(t, dt, ce);
    else { cam.position.set(par.x * 1.2, par.y * 0.8, DIST * (1 + 0.12 * (1 - ce))); cam.lookAt(0, 0, 0); }
    if (stageScene) stageScene.update(skip ? 99 : t, reduceMotion() ? 0 : dt, cam);
    for (const it of items) {
      const lt = skip ? 99 : t - it.delay, u = it.mat.uniforms;
      u.uSketch.value = ease(lt / TIMING.sketch);
      u.uColor.value = ease((lt - TIMING.sketch) / TIMING.color);
      u.uTime.value = t;
      const pk = spring(lt / TIMING.sketch);
      // folded flat into the page (edge on, at paper height) -> standing in its layer
      it.hinge.rotation.x = imm ? 0 : (1 - pk) * 1.25;
      const play = lt >= TIMING.sketch + TIMING.color ? lt - TIMING.sketch - TIMING.color : -1;
      motion(it, play, dt);
      if (it.gentle && play > 0) it.hinge.rotation.y = Math.sin(play * 0.4 + it.ph) * 0.06;
      if (it.shadow) it.shadow.material.uniforms.uSketch.value = it.shadow.material.uniforms.uColor.value = pk;
      if (it.haloM) it.haloM.material.opacity = play > 0 ? 0.6 + 0.4 * Math.sin(t * 1.5) : 0;
    }
    if (special) special.update(t, reduceMotion() ? 0 : dt, cam);
    renderer.render(scene, cam);
    onFrame && onFrame(t);
  }
  // Camera inside the slide: the scene may fly it; the viewer looks around (drag), flies closer
  // (pinch or scroll, clamped) and gets a small head-tracking parallax from pointer or tilt.
  const V = { a: null };
  function immersiveCamera(t, dt, ce) {
    const T = THREE; if (!V.a) V.a = { p: new T.Vector3(), l: new T.Vector3(), d: new T.Vector3(), up: new T.Vector3(0, 1, 0) };
    const v = V.a;
    if (stageScene && stageScene.cam) { const c = stageScene.cam(skip ? 99 : t, dt); v.p.copy(c.pos); v.l.copy(c.look); } else { v.p.set(0, 0, DIST); v.l.set(0, 0, 0); }
    if (performance.now() - idleAt > 5000 && !pointers.size) { look.tyaw *= 0.985; look.tpitch *= 0.985; }
    const k = Math.min(1, dt * 6);
    look.yaw += (look.tyaw - look.yaw) * k; look.pitch += (look.tpitch - look.pitch) * k; look.dolly += (look.tdolly - look.dolly) * k;
    v.d.subVectors(v.l, v.p); const dist = v.d.length(); v.d.normalize();
    v.d.applyAxisAngle(v.up, look.yaw); const side = new T.Vector3().crossVectors(v.d, v.up).normalize(); v.d.applyAxisAngle(side, look.pitch);
    const fly = look.dolly - (1 - ce) * 2.2; // entry: the camera eases in from behind
    cam.position.copy(v.p).addScaledVector(v.d, Math.min(fly, dist * 0.85)).addScaledVector(side, par.x * 0.35).addScaledVector(v.up, par.y * 0.2);
    cam.lookAt(cam.position.clone().addScaledVector(v.d, dist));
  }
  setInterval(() => { stats.fps = fpsAcc[0]; fpsAcc[0] = 0; if (renderer) { stats.textures = renderer.info.memory.textures; stats.geometries = renderer.info.memory.geometries; } }, 1000);

  // Calm idle loops by type, plus the hand-driven state from touches.
  function motion(it, play, dt) {
    const m = it.mesh, l = it.l, us = it.user, s = play < 0 ? 0 : Math.min(1, play / 1.5), tt = play + it.ph;
    let x = 0, y = 0, rz = 0, sc = 1;
    switch (l.motion) {
      case "float": y = Math.sin(tt * 0.8) * 0.05 * s; break;
      case "spin": rz = 0; us.a += dt * 0.15 * s; break;
      case "orbit": us.a += dt * 0.12 * s; x = Math.cos(us.a) * 0.12 * s; y = Math.sin(us.a) * 0.05 * s; break;
      case "pulse": sc = 1 + Math.sin(tt * 1.2) * 0.02 * s; break;
      case "drift": x = Math.sin(tt * 0.25) * 0.1 * s; break;
      case "twinkle": sc = 1 + Math.sin(tt * 2.2) * 0.015 * s; break;
      case "launch": if (us.launch >= 0) { us.launch += dt; y = us.launch * us.launch * 1.4; if (us.launch > 3) us.launch = -1; } break;
    }
    if (l.interact === "spin" || l.motion === "spin") { us.a += us.va * dt; us.va *= 0.97; rz = Math.sin(us.a) * 0.06; it.hinge.rotation.y = Math.sin(us.a) * 0.35; }
    if (l.interact === "orbit") { us.a += us.va * dt; us.va *= 0.96; }
    // tossed objects spring home
    us.vx += -us.dx * 18 * dt; us.vy += -us.dy * 18 * dt; us.vx *= 0.9; us.vy *= 0.9;
    if (!drag || drag.it !== it) { us.dx += us.vx * dt; us.dy += us.vy * dt; }
    m.position.set(x + us.dx, y + us.dy, 0); m.rotation.z = rz; m.scale.set(it.p.w * sc, it.p.h * sc, 1);
  }

  // Pointer: tap skips the entry; drag moves, spins, orbits or launches the touched cutout; otherwise parallax.
  function pick(e) {
    if (!scene) return null;
    const r = stage.getBoundingClientRect();
    const ray = new THREE.Raycaster(); ray.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), cam);
    const hits = ray.intersectObjects(items.map((i) => i.mesh));
    return hits.length ? items.find((i) => i.mesh === hits[0].object) : null;
  }
  function onDown(e) {
    if (e.target.closest("button, a, input, .ac-opt")) return;
    const t = (performance.now() - t0) / 1000;
    if (scene && !skip && t < entryEnd()) { skip = true; if (special) special.skip = true; stage.classList.remove("pop-entering"); stage.classList.add("pop-skip"); return; }
    // any touch on a 3D page counts as the first interaction: the grab hints fade out
    if (scene) { special && special.interact && special.interact(); stageScene && stageScene.interact && stageScene.interact(); }
    if (special && special.pointer && special.pointer(e, stage.getBoundingClientRect(), "down")) { drag = { special: true }; stage.dataset.dragging = "1"; e.stopPropagation(); stage.setPointerCapture && stage.setPointerCapture(e.pointerId); return; }
    if (stageScene && stageScene.pointer && stageScene.pointer(e, stage.getBoundingClientRect(), "down", cam)) { drag = { scene: true }; stage.dataset.dragging = "1"; e.stopPropagation(); stage.setPointerCapture && stage.setPointerCapture(e.pointerId); return; }
    const it = pick(e);
    if (imm && !(it && it.l.interact)) {
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); idleAt = performance.now();
      if (pointers.size === 2) { const [a, b] = [...pointers.values()]; drag = { pinch: Math.hypot(a.x - b.x, a.y - b.y), d0: look.tdolly }; }
      else drag = { look: true, x: e.clientX, y: e.clientY, yaw0: look.tyaw, pitch0: look.tpitch };
      return;
    }
    if (it && it.l.interact) {
      e.stopPropagation();
      if (it.l.interact === "launch" || it.l.motion === "launch") { it.user.launch = 0; return; }
      if (it.l.interact === "pulse") { stage.dispatchEvent(new CustomEvent("pop-pulse")); return; }
      drag = { it, x: e.clientX, y: e.clientY, lx: e.clientX, ly: e.clientY, t: performance.now() };
      stage.setPointerCapture && stage.setPointerCapture(e.pointerId);
      stage.dataset.dragging = "1";
    }
  }
  function onMove(e) {
    const r = stage.getBoundingClientRect();
    if (!drag) { if (e.pointerType === "mouse") { par.tx = ((e.clientX - r.left) / r.width - 0.5) * 2; par.ty = -((e.clientY - r.top) / r.height - 0.5) * 2; } return; }
    if (drag.special) { special && special.pointer && special.pointer(e, r, "move"); return; }
    if (drag.scene) { stageScene && stageScene.pointer(e, r, "move", cam); return; }
    if (drag.look || drag.pinch) {
      if (pointers.has(e.pointerId)) pointers.set(e.pointerId, { x: e.clientX, y: e.clientY }); idleAt = performance.now();
      if (drag.pinch && pointers.size === 2) { const [a, b] = [...pointers.values()]; look.tdolly = Math.max(0, Math.min(look.max, drag.d0 + (Math.hypot(a.x - b.x, a.y - b.y) - drag.pinch) / r.width * 8)); }
      else if (drag.look) { stageScene && stageScene.drag && stageScene.drag({ dx: (e.clientX - drag.x) / r.width, dy: (e.clientY - drag.y) / r.height, x: (e.clientX - r.left) / r.width, y: (e.clientY - r.top) / r.height }); look.tyaw = Math.max(-0.5, Math.min(0.5, drag.yaw0 + (e.clientX - drag.x) / r.width * 1.1)); look.tpitch = Math.max(-0.3, Math.min(0.3, drag.pitch0 + (e.clientY - drag.y) / r.height * 0.7)); }
      return;
    }
    const it = drag.it, dx = (e.clientX - drag.lx) / r.width * W, dy = -(e.clientY - drag.ly) / r.height * H;
    drag.lx = e.clientX; drag.ly = e.clientY;
    if (it.l.interact === "spin") it.user.va = dx * 40;
    else if (it.l.interact === "orbit") it.user.va = dx * 30;
    else { it.user.dx += dx; it.user.dy += dy; it.user.vx = dx * 30; it.user.vy = dy * 30; }
  }
  function onUp(e) { pointers.delete(e.pointerId); if (drag && drag.scene && stageScene) stageScene.pointer(e, stage.getBoundingClientRect(), "up", cam); if (drag && drag.special && special && special.pointer) special.pointer(e, stage.getBoundingClientRect(), "up"); drag = null; delete stage.dataset.dragging; }
  stage.addEventListener("pointerdown", onDown, true);
  stage.addEventListener("pointermove", onMove);
  addEventListener("pointerup", onUp);
  stage.addEventListener("pointerleave", () => { par.tx = par.ty = 0; });
  addEventListener("pointercancel", (e) => { pointers.delete(e.pointerId); drag = null; });
  // scroll flies the camera closer or back out (clamped); only while a 3D slide is open
  stage.addEventListener("wheel", (e) => { if (!imm || !scene) return; e.preventDefault(); idleAt = performance.now(); look.tdolly = Math.max(0, Math.min(look.max, look.tdolly - e.deltaY * 0.01)); }, { passive: false });

  // Tilt: deviceorientation; iOS asks permission on a tap.
  let tiltOn = false;
  function onTilt(e) { if (e.gamma == null) return; par.tx = Math.max(-1, Math.min(1, e.gamma / 25)); par.ty = Math.max(-1, Math.min(1, (e.beta - 45) / 25)); }
  async function enableTilt() {
    if (tiltOn) return true;
    try {
      if (typeof DeviceOrientationEvent !== "undefined" && typeof DeviceOrientationEvent.requestPermission === "function") {
        if ((await DeviceOrientationEvent.requestPermission()) !== "granted") return false;
      }
      addEventListener("deviceorientation", onTilt); tiltOn = true; return true;
    } catch (e) { return false; }
  }

  // Flat fallback touch: drag springs back, spin turns, launch lifts.
  function bindFlatTouch(im, l) {
    im.addEventListener("pointerdown", (e) => {
      e.stopPropagation();
      if (l.interact === "launch") { im.classList.remove("launched"); void im.offsetWidth; im.classList.add("launched"); return; }
      if (l.interact === "pulse") { stage.dispatchEvent(new CustomEvent("pop-pulse")); return; }
      const x0 = e.clientX; let rot = 0; im.setPointerCapture(e.pointerId);
      const mv = (ev) => { rot = (ev.clientX - x0) * 0.6; im.style.transform = l.interact === "spin" ? `rotate(${rot}deg)` : `translateX(${(ev.clientX - x0) * 0.3}px)`; };
      const up = () => { im.removeEventListener("pointermove", mv); im.style.transition = "transform .6s cubic-bezier(.3,1.6,.5,1)"; im.style.transform = ""; setTimeout(() => (im.style.transition = ""), 650); };
      im.addEventListener("pointermove", mv); im.addEventListener("pointerup", up, { once: true });
    });
  }

  // Snapshot of the live scene for the page-curl sheet.
  function snapshot(ctx, w, h) {
    if (!scene || !renderer || !renderer.domElement.isConnected) return;
    renderer.render(scene, cam); ctx.drawImage(renderer.domElement, 0, 0, w, h);
  }

  addEventListener("resize", resize);
  return { show, dispose, resize, enableTilt, snapshot, get skipped() { return skip; }, skipEntry() { skip = true; stage.classList.add("pop-skip"); }, destroy() { alive = false; dispose(); } };
}

export { darkInk } from "./ac-ink.js";
