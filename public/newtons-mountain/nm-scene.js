// Newton's Mountain: the world. Sky (Night Sky star layer, fixed J2000), the Sun, Earth, the platform, cannon and mountain,
// plus the Model view props (cannon marker, reference rings, Moon). Everything is drawn by code except the Earth and Moon
// maps (public/gravity-orbits/models/*.glb) and the optional ISS marker.
//
// DEPTH PLAN A (analytic occlusion, spec 7.4). Only the near rig (platform, cannon, controllers, panel) writes depth.
// The sky, Earth, haze, trails, balls and flags use depthWrite = false and renderOrder:
//   stars 2, Sun 3, Earth 4, mountain haze 5, rings 9, trails 10, balls 11, labels 12, arrows 13, near rig opaque (pass 1), panel 60.
// The Earth is not a mesh at its true size: it is a ray-sphere shader on a large dome that follows the head, so the horizon is
// exact at any height and no 6.4e6 m vertex ever reaches the GPU. The far side of a trail is hidden by the same ray-sphere
// test in the trail shader (NM_OCCLUDE below).
import { starsLayer } from "../night-sky/layers/stars.js";
import { textSprite } from "./nm-sprite.js";
import { NM_CONFIG as C } from "./nm-config.js";
import { sunWorld, texRotation, EQ_TO_TEX, mat3mul, transpose3, planeAxes, latLonToVec } from "./nm-frames.js";

/** Shared uniforms for every far-field object (trails, balls, arrows, rings). Set once per frame by updateEarthUniforms(). */
export function makeFarUniforms(THREE) {
  return { uHead: { value: new THREE.Vector3() }, uOC: { value: new THREE.Vector3() }, uOC2mR2: { value: 1 }, uTol: { value: 30 },
    uHandA: { value: new THREE.Vector3(0, -99, 0) }, uHandB: { value: new THREE.Vector3(0, -99, 0) }, uFadeHead: { value: C.rig.fadeHeadM }, uFadeHand: { value: C.rig.fadeHandM },
    uViewportH: { value: 800 }, uEarthOn: { value: 1 }, uSunDir: { value: new THREE.Vector3(0, 1, 0) } };
}
/** GLSL shared by every far-field material: is the point at world position pw hidden behind the Earth (seen from the head)? */
export const NM_OCCLUDE = /* glsl */`
uniform vec3 uHead, uOC, uHandA, uHandB, uSunDir;
uniform float uOC2mR2, uTol, uFadeHead, uFadeHand, uViewportH, uEarthOn;
// Ray from the head to pw against the Earth sphere. uOC is head minus Earth centre, uOC2mR2 is |OC|^2 - R^2 (double on the CPU).
float nmHidden(vec3 pw) {
  vec3 d = pw - uHead; float dist = length(d); if (dist < 1e-4 || uEarthOn < 0.5) return 0.0;
  vec3 rd = d / dist; float b = dot(uOC, rd), disc = b * b - uOC2mR2;
  if (disc <= 0.0) return 0.0;
  float t = -b - sqrt(disc);
  return (t > 0.0 && t < dist - (0.002 * dist + uTol)) ? 1.0 : 0.0;
}
float nmNearFade(vec3 pw) {
  float a = smoothstep(uFadeHead * 0.5, uFadeHead, length(pw - uHead));
  float b = smoothstep(uFadeHand * 0.5, uFadeHand, length(pw - uHandA)), c = smoothstep(uFadeHand * 0.5, uFadeHand, length(pw - uHandB));
  return a * b * c;
}`;

const EARTH_FRAG = /* glsl */`
uniform vec3 uOC, uSun; uniform float uC, uCa, uR, uRa, uHasTex, uOn, uHaze;
uniform mat3 uTex; uniform sampler2D uDay, uCloud;
varying vec3 vW; vec3 rdG;
vec3 fallbackAlbedo(vec3 n) { float l = sin(n.x * 5.0) * sin(n.y * 4.0 + 1.0) * sin(n.z * 6.0); return mix(vec3(0.03, 0.15, 0.38), vec3(0.18, 0.34, 0.14), smoothstep(0.1, 0.35, l)); }
// Atmosphere along a ray: chord through the shell (uCa) up to tSurf, returns thickness 0..1 and the in-scatter colour.
float nmAtmo(float b, float tSurf, out vec3 haze) {
  float discA = b * b - uCa, chord = 0.0; vec3 mid = vec3(0.0, 1.0, 0.0);
  if (discA > 0.0) { float s = sqrt(discA); float t0 = max(-b - s, 0.0), t1 = min(-b + s, tSurf); chord = max(t1 - t0, 0.0); mid = uOC + vec3(0.0) + rdG * (0.5 * (t0 + t1)); }
  float air = 1.0 - exp(-chord / (6.0 * (uRa - uR)));
  float lit = smoothstep(-0.25, 0.35, dot(normalize(mid), uSun));
  haze = mix(vec3(0.16, 0.38, 0.95), vec3(0.78, 0.9, 1.0), smoothstep(0.80, 1.0, air)) * lit;
  return air;
}
void main() {
  if (uOn < 0.5) discard;
  vec3 rd = normalize(vW - cameraPosition); rdG = rd;
  float b = dot(uOC, rd), disc = b * b - uC;
  // coverage of the planet disc, anti-aliased from the discriminant (it changes by about 2e10 per pixel at the limb)
  float cov = b < 0.0 ? clamp(0.5 + disc / max(fwidth(disc), 1e-6 * uR * uR), 0.0, 1.0) : 0.0;
  vec3 hazeS; float airS = nmAtmo(b, 1e30, hazeS);
  float skyA = pow(airS, 1.25) * uHaze;
  vec3 col = hazeS; float a = skyA;
  if (cov > 0.0) {
    float tSurf = disc > 0.0 ? -b - sqrt(disc) : -b;
    vec3 haze; float air = nmAtmo(b, tSurf, haze);
    vec3 p = uOC + rd * tSurf, n = normalize(p), nt = uTex * n;
    float u0 = atan(nt.x, nt.z) / 6.2831853 + 0.5, u1 = fract(u0 + 0.5) - 0.5, v = 0.5 - asin(clamp(nt.y, -1.0, 1.0)) / 3.14159265;
    bool pickA = fwidth(u0) < fwidth(u1) + 1e-6;
    vec2 uv = pickA ? vec2(u0, v) : vec2(u1 + 0.5, v);
    vec2 g = pickA ? vec2(dFdx(u0), dFdx(v)) : vec2(dFdx(u1), dFdx(v)), g2 = pickA ? vec2(dFdy(u0), dFdy(v)) : vec2(dFdy(u1), dFdy(v));
    vec3 alb = textureGrad(uDay, uv, g, g2).rgb; float cl = textureGrad(uCloud, uv, g, g2).r;
    if (uHasTex < 0.5) { alb = fallbackAlbedo(nt); cl = 0.0; }
    float dn = dot(n, uSun), day = smoothstep(-0.06, 0.18, dn);
    vec3 sc = mix(alb, vec3(1.0), cl * 0.75) * (0.025 + 0.975 * day * (0.35 + 0.65 * clamp(dn, 0.0, 1.0)));
    sc += vec3(0.01, 0.015, 0.03) * (1.0 - day);
    sc += haze * air * 0.9;
    a = cov + (1.0 - cov) * skyA;
    col = (sc * cov + hazeS * skyA * (1.0 - cov)) / max(a, 1e-4);
  } else if (airS < 0.002) discard;
  gl_FragColor = vec4(col, a);
  #include <colorspace_fragment>
}`;
const EARTH_VERT = "varying vec3 vW; void main(){ vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }";

const SUN_VERT = "uniform float uPx; void main(){ gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); gl_PointSize = uPx; }";
const SUN_FRAG = "void main(){ float r = length(gl_PointCoord - 0.5) * 2.0; float a = smoothstep(1.0, 0.0, r); gl_FragColor = vec4(vec3(1.0, 0.96, 0.85), a * a * 0.9 + smoothstep(0.12, 0.0, r)); }";

function hash(i) { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }

export function createWorld(THREE, { catalog, renderer, assetBase }) {
  const scene = new THREE.Scene(); scene.background = new THREE.Color(0x000000);
  const far = makeFarUniforms(THREE);
  const state = { mag: 6.5, ground: false }, frame = { uRefract: { value: 0 }, viewportH: 800, viewportW: 1280, starScale: 1, starMinPx: 1.6, daylight: 0, passthrough: false };
  const skyGroup = new THREE.Group(); skyGroup.matrixAutoUpdate = false; scene.add(skyGroup);
  const stars = starsLayer(); stars.init({ THREE, catalog, skyGroup, frame, state });
  const starsPoints = skyGroup.children[0]; starsPoints.renderOrder = 2;

  // ---- Earth dome ----
  const ca = C.CONSTS[C.consts];
  const earthMat = new THREE.ShaderMaterial({ vertexShader: EARTH_VERT, fragmentShader: EARTH_FRAG, side: THREE.BackSide, transparent: true, depthWrite: false, depthTest: true,
    uniforms: { uOC: far.uOC, uSun: { value: new THREE.Vector3(0, 1, 0) }, uC: far.uOC2mR2, uCa: { value: 1 }, uR: { value: ca.R }, uRa: { value: ca.R * 1.016 }, uHasTex: { value: 0 }, uOn: { value: 1 }, uHaze: { value: 1 },
      uTex: { value: new THREE.Matrix3() }, uDay: { value: null }, uCloud: { value: null } } });
  const earth = new THREE.Mesh(new THREE.SphereGeometry(3000, 24, 16), earthMat); earth.renderOrder = 4; earth.frustumCulled = false; scene.add(earth);

  // ---- Sun ----
  const sunMat = new THREE.ShaderMaterial({ vertexShader: SUN_VERT, fragmentShader: SUN_FRAG, uniforms: { uPx: { value: 24 } }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending });
  const sunGeo = new THREE.BufferGeometry(); sunGeo.setAttribute("position", new THREE.Float32BufferAttribute([0, 0, 0], 3));
  const sun = new THREE.Points(sunGeo, sunMat); sun.renderOrder = 3; sun.frustumCulled = false; scene.add(sun);

  // ---- near rig: platform, cannon, button (depth-writing, human scale) ----
  const rig = new THREE.Group(); scene.add(rig);
  const R_ = C.rig, light = new THREE.DirectionalLight(0xfff2dd, 2.2); scene.add(light, light.target);
  const hemi = new THREE.HemisphereLight(0x8aa4d8, 0x1a1c26, 0.9); scene.add(hemi);
  const stoneTex = (() => { const c = document.createElement("canvas"); c.width = c.height = 512; const g = c.getContext("2d");
    g.fillStyle = "#6a6d78"; g.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 2600; i++) { const x = hash(i) * 512, y = hash(i + 9e3) * 512, r = 1 + hash(i + 5e3) * 5; g.fillStyle = `rgba(${hash(i + 1) < 0.5 ? "20,22,30" : "200,204,214"},${0.05 + hash(i + 2) * 0.1})`; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
    g.strokeStyle = "rgba(15,17,24,0.65)"; g.lineWidth = 3;
    for (let i = 0; i <= 4; i++) { g.beginPath(); for (let j = 0; j <= 8; j++) { const x = i * 128 + (hash((i % 4) * 9 + j) - 0.5) * 22, y = j * 64; j ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); g.beginPath(); for (let j = 0; j <= 8; j++) { const y = i * 128 + (hash((i % 4) * 7 + j + 50) - 0.5) * 22, x = j * 64; j ? g.lineTo(x, y) : g.moveTo(x, y); } g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(2, 2); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t; })();
  const stone = new THREE.MeshStandardMaterial({ color: 0xffffff, map: stoneTex, roughness: 0.95, metalness: 0.0 });
  const iron = new THREE.MeshStandardMaterial({ color: 0x4b515d, roughness: 0.42, metalness: 0.35 });
  const wood = new THREE.MeshStandardMaterial({ color: 0x5b4333, roughness: 0.85 });
  const platform = new THREE.Mesh(new THREE.CylinderGeometry(R_.platformRadius, R_.platformRadius, 0.3, 48), stone); platform.position.set(R_.platformCentre[0], -0.15, R_.platformCentre[1]); rig.add(platform);
  const cannon = new THREE.Group(); cannon.position.set(R_.cannonX, 0, R_.baseZ); rig.add(cannon);
  const barrel = new THREE.Mesh(new THREE.CylinderGeometry(0.21, 0.13, 2.0, 32), iron); barrel.rotation.x = Math.PI / 2; barrel.position.set(0, R_.muzzleY, 0); cannon.add(barrel); // along z, muzzle at z = -1.0 from the base
  const ring = new THREE.Mesh(new THREE.TorusGeometry(0.15, 0.03, 8, 24), iron); ring.position.set(0, R_.muzzleY, -1.0); cannon.add(ring);
  for (const sx of [-0.45, 0.45]) {
    const wheel = new THREE.Group(); wheel.position.set(sx, 0.5, 0); cannon.add(wheel);
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.5, 0.045, 10, 40), iron); rim.rotation.y = Math.PI / 2; wheel.add(rim);
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 0.16, 16), iron); hub.rotation.z = Math.PI / 2; wheel.add(hub);
    for (let k = 0; k < 4; k++) { const sp = new THREE.Mesh(new THREE.BoxGeometry(0.07, 0.07, 1.0), wood); sp.rotation.x = k * Math.PI / 4; wheel.add(sp); }
    const cheek = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.5, 1.2), wood); cheek.position.set(sx * 0.62, 0.78, 0); cannon.add(cheek);
  }
  const hoop = (z) => { const h = new THREE.Mesh(new THREE.TorusGeometry(0.19 - (z + 1) * 0.04 + 0.01, 0.022, 8, 32), iron); h.position.set(0, R_.muzzleY, z); cannon.add(h); };
  hoop(0.55); hoop(0.0); hoop(-0.55);
  const knob = new THREE.Mesh(new THREE.SphereGeometry(0.1, 16, 12), iron); knob.position.set(0, R_.muzzleY, 1.08); cannon.add(knob); // the cascabel at the breech
  const fireBtn = new THREE.Mesh(new THREE.CylinderGeometry(0.07, 0.07, 0.05, 20), new THREE.MeshStandardMaterial({ color: 0xc23b2e, emissive: 0x4a0c08, roughness: 0.5 })); fireBtn.rotation.z = Math.PI / 2; fireBtn.position.set(0.58, 0.82, 0.25); cannon.add(fireBtn);
  const fireBtnWorld = new THREE.Vector3(R_.cannonX + 0.58, 0.82, R_.baseZ + 0.25);
  // launch-speed card anchor ("breech_card"), a sprite above the breech
  const cardCanvas = document.createElement("canvas"); cardCanvas.width = 1024; cardCanvas.height = 256;
  const cardTex = new THREE.CanvasTexture(cardCanvas); cardTex.colorSpace = THREE.SRGBColorSpace;
  const breechCard = new THREE.Sprite(new THREE.SpriteMaterial({ map: cardTex, transparent: true, depthWrite: false })); breechCard.scale.set(0.9, 0.225, 1); breechCard.position.set(R_.cannonX, 1.95, R_.baseZ + 0.2); breechCard.renderOrder = 12; rig.add(breechCard);
  function setLaunchCard(text) {
    const g = cardCanvas.getContext("2d"); g.clearRect(0, 0, 1024, 256);
    g.fillStyle = "rgba(14,16,40,0.82)"; g.beginPath(); g.roundRect(8, 8, 1008, 240, 60); g.fill(); g.strokeStyle = "rgba(170,205,255,0.5)"; g.lineWidth = 3; g.stroke();
    g.fillStyle = "#fff"; g.font = "600 76px Inter, system-ui, sans-serif"; g.textAlign = "center"; g.textBaseline = "middle"; g.fillText(text, 512, 132, 960); cardTex.needsUpdate = true;
  }
  // mountain: a rocky pinnacle that fades into haze within about 3 km
  const mProf = []; for (let d = 0; d <= 1500; d += d < 60 ? 5 : d < 300 ? 20 : 60) mProf.push(new THREE.Vector2(2.0 + 0.9 * d + 0.0004 * d * d, -d));
  const mg = new THREE.LatheGeometry(mProf, 96); mg.translate(0, 1500, 0);
  const mtn = new THREE.Mesh(mg, new THREE.ShaderMaterial({ transparent: true, depthWrite: false, side: THREE.DoubleSide,
    uniforms: { uSun: { value: new THREE.Vector3(0, 1, 0) } },
    vertexShader: "varying vec3 vN; varying float vD; varying float vS; void main(){ vS = sin(position.y * 0.35 + 2.5 * sin(atan(position.z, position.x) * 5.0)); vN = normalize(mat3(modelMatrix) * normal); vD = 1500.0 - position.y; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }",
    fragmentShader: "uniform vec3 uSun; varying vec3 vN; varying float vD; varying float vS; void main(){ float l = 0.25 + 0.75 * max(dot(normalize(vN), uSun), 0.0); vec3 c = mix(vec3(0.46,0.37,0.30) * (0.72 + 0.4 * vS), vec3(0.55,0.66,0.84), smoothstep(150.0, 1400.0, vD)) * l; gl_FragColor = vec4(c, 1.0 - smoothstep(300.0, 1450.0, vD));\n#include <colorspace_fragment>\n }" }));
  mtn.position.set(R_.platformCentre[0], -0.3 - 1500, R_.platformCentre[1]); mtn.renderOrder = 5; mtn.frustumCulled = false; scene.add(mtn);

  // ---- Model view props: cannon marker, rings, Moon, ISS marker ----
  const model = new THREE.Group(); model.visible = false; scene.add(model);
  // The cannon marker is unlit (MeshBasicMaterial) so it shows on the night side, plus an additive ring sprite of fixed angular size (about 13 px at 800 px tall).
  const marker = new THREE.Group(); { const m = new THREE.Mesh(new THREE.ConeGeometry(0.5, 1.6, 14), new THREE.MeshBasicMaterial({ color: 0xffb347 })); m.rotation.z = -Math.PI / 2; m.position.x = 0.8; marker.add(m); }
  const markerGlow = (() => { const c = document.createElement("canvas"); c.width = c.height = 64; const g = c.getContext("2d");
    const gr = g.createRadialGradient(32, 32, 6, 32, 32, 31); gr.addColorStop(0, "rgba(255,179,71,0.55)"); gr.addColorStop(0.55, "rgba(255,179,71,0.35)"); gr.addColorStop(0.72, "rgba(255,225,160,1)"); gr.addColorStop(0.86, "rgba(255,179,71,0.35)"); gr.addColorStop(1, "rgba(255,179,71,0)");
    g.fillStyle = gr; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: t, transparent: true, depthWrite: false, depthTest: false, blending: THREE.AdditiveBlending, sizeAttenuation: false })); sp.scale.set(0.016, 0.016, 1); sp.renderOrder = 12; return sp; })();
  model.add(marker, markerGlow); // marker is scaled in setFrame so it reads as a marker, not as a to-scale cannon
  const ringsGroup = new THREE.Group(); model.add(ringsGroup); const ringLabels = [];
  const moonMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshStandardMaterial({ color: 0x9a9a9a, roughness: 1 })); moonMesh.visible = false; model.add(moonMesh);
  const issHolder = new THREE.Group(); issHolder.visible = false; model.add(issHolder);

  // assets: the Earth and Moon maps come from the existing Gravity and Orbits GLBs (credit in THIRD-PARTY-NOTICES.md)
  const assets = { earth: "none", moon: "none", iss: "none" };
  async function loadAssets() {
    let loadGlb; try { ({ loadGlb } = await import("../gravity-orbits/go-load.js")); } catch { return; }
    const load = async (f) => { const g = await loadGlb(new URL(f, assetBase).href); if (!g) throw new Error("glb"); return g; };
    try {
      const g = await load("gravity-orbits/models/earth_2k.glb"); let day = null, cloud = null;
      g.scene.traverse((o) => { if (o.name === "earth_surface" && o.material) day = o.material.map; if (o.name === "earth_clouds" && o.material) cloud = o.material.map; });
      if (day) { day.colorSpace = THREE.SRGBColorSpace; day.anisotropy = 4; earthMat.uniforms.uDay.value = day; if (cloud) { earthMat.uniforms.uCloud.value = cloud; } else earthMat.uniforms.uCloud.value = day; earthMat.uniforms.uHasTex.value = 1; assets.earth = "earth_2k.glb"; if (!cloud) assets.clouds = "none"; }
    } catch (e) { assets.earth = "procedural"; }
    try {
      const g = await load("gravity-orbits/models/moon_2k.glb"); let map = null; g.scene.traverse((o) => { if (o.material && o.material.map) map = o.material.map; });
      if (map) { map.colorSpace = THREE.SRGBColorSpace; moonMesh.material.map = map; moonMesh.material.color.set(0xffffff); moonMesh.material.needsUpdate = true; assets.moon = "moon_2k.glb"; }
    } catch { assets.moon = "procedural"; }
  }
  async function loadIss() {
    if (assets.iss !== "none") return; assets.iss = "loading";
    try { const { loadGlb } = await import("../gravity-orbits/go-load.js"); const g = await loadGlb(new URL("gravity-orbits/models/iss.glb", assetBase).href); if (!g) throw new Error("glb");
      const box = new THREE.Box3().setFromObject(g.scene), sz = box.getSize(new THREE.Vector3()), s = 1 / Math.max(sz.x, sz.y, sz.z, 1e-6); g.scene.scale.setScalar(s); g.scene.position.sub(box.getCenter(new THREE.Vector3()).multiplyScalar(s)); issHolder.add(g.scene); assets.iss = "iss.glb"; } catch { assets.iss = "procedural"; }
  }
  const assetsReady = loadAssets();

  const tmpM = new THREE.Matrix3();
  let cur = { kind: "mountain", R: ca.R, h: 150e3 };
  /** Called when the view, height or constants change. frame from nm-frames. */
  function setFrame(fr, R, h, opts = {}) {
    cur = { kind: fr.kind, R, h, frame: fr };
    const k = fr.scale || 1;
    earthMat.uniforms.uR.value = R * (fr.kind === "model" ? k : 1); // metres in the view's world
    const Rw = fr.kind === "model" ? R * k : R;
    earthMat.uniforms.uRa.value = Rw * 1.016; cur.Rw = Rw; cur.centre = fr.earthCentre;
    const tr = texRotation(fr, C.cannonLatLon[0], C.cannonLatLon[1]); tmpM.set(tr[0][0], tr[0][1], tr[0][2], tr[1][0], tr[1][1], tr[1][2], tr[2][0], tr[2][1], tr[2][2]); earthMat.uniforms.uTex.value.copy(tmpM);
    const sd = sunWorld(fr, C.sunPlane); earthMat.uniforms.uSun.value.set(...sd); light.position.set(sd[0] * 20, sd[1] * 20 + 1.5, sd[2] * 20); light.target.position.set(0, 1, 0); mtn.material.uniforms.uSun.value.set(...sd);
    cur.sun = sd; far.uSunDir.value.set(sd[0], sd[1], sd[2]);
    // stars: equatorial J2000 -> texture frame -> world, a fixed inertial sky
    const M = mat3mul(transpose3(tr), EQ_TO_TEX); cur.starM = M;
    const isM = fr.kind === "mountain"; rig.visible = isM; mtn.visible = isM; model.visible = !isM;
    if (!isM) {
      const { u } = planeAxes(fr); marker.position.set(...[0, 1, 2].map((i) => fr.earthCentre[i] + u[i] * (R + h) * k)); marker.scale.setScalar(Math.max(0.012, 0.03 * (fr.scale * 2 * R))); markerGlow.position.copy(marker.position);
      marker.rotation.set(0, 0, 0); marker.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(new THREE.Vector3(...u), new THREE.Vector3(...planeAxes(fr).o), new THREE.Vector3(...planeAxes(fr).f).negate()));
      buildRings(opts.rings || [], fr, R);
    }
  }
  function buildRings(list, fr, R) {
    ringsGroup.clear(); moonMesh.visible = false; issHolder.visible = false;
    const k = fr.scale; ringLabels.length = 0;
    const make = (alt, dashes, color, label, labelAngle) => {
      const pts = [], S = [], rr = (R + alt) * k; let acc = 0;
      for (let i = 0; i <= 256; i++) { const a = (i / 256) * Math.PI * 2; pts.push(new THREE.Vector3(Math.cos(a) * rr, 0, -Math.sin(a) * rr)); S.push(acc); acc += (Math.PI * 2 * rr) / 256; }
      const g = new THREE.BufferGeometry().setFromPoints(pts); g.setAttribute("aS", new THREE.Float32BufferAttribute(S, 1));
      const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, depthTest: false,
        uniforms: { ...far, uColor: { value: new THREE.Color(color) }, uDash: { value: dashes[0] * k * R * 0.01 }, uGap: { value: dashes[1] * k * R * 0.01 } },
        vertexShader: "attribute float aS; varying float vS; varying vec3 vW; void main(){ vS = aS; vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz; gl_Position = projectionMatrix * viewMatrix * w; }",
        fragmentShader: NM_OCCLUDE + "uniform vec3 uColor; uniform float uDash, uGap; varying float vS; varying vec3 vW; void main(){ if (nmHidden(vW) > 0.5) discard; if (mod(vS, uDash + uGap) > uDash) discard; gl_FragColor = vec4(uColor, 0.85);\n#include <colorspace_fragment>\n }" });
      const l = new THREE.Line(g, m); l.renderOrder = 9; l.frustumCulled = false; l.position.set(...fr.earthCentre);
      if (label) { const sp = textSprite(THREE, label, { w: 420, h: 84, font: 44 }); sp.scale.set(0.085, 0.017, 1); sp.position.set(fr.earthCentre[0] + Math.cos(labelAngle) * rr, fr.earthCentre[1], fr.earthCentre[2] - Math.sin(labelAngle) * rr); ringsGroup.add(sp); ringLabels.push(sp); }
      return l; };
    if (list.includes("iss")) { ringsGroup.add(make(C.rings.iss, [0.6, 1.2], 0x9fd0ff, "ISS 400 km", 0.5)); loadIss(); issHolder.visible = true; issHolder.position.set(fr.earthCentre[0] + Math.cos(2.1) * (R + C.rings.iss) * k, fr.earthCentre[1], fr.earthCentre[2] - Math.sin(2.1) * (R + C.rings.iss) * k); issHolder.scale.setScalar(Math.max(0.02, k * R * 0.05)); }
    if (list.includes("geo")) ringsGroup.add(make(C.rings.geo, [3, 2], 0xffd27f, "GEO 35,786 km", 0.5));
    if (list.includes("moon")) { const d = C.rings.moon * k; ringsGroup.add(make(C.rings.moon - R, [6, 3], 0xcfcfcf, "Moon 384,400 km", 0.6)); moonMesh.visible = true; moonMesh.scale.setScalar(C.moonRadiusM * k); moonMesh.position.set(fr.earthCentre[0] + d * Math.cos(0.6), fr.earthCentre[1], fr.earthCentre[2] - d * Math.sin(0.6)); }
  }

  /** Per frame: head position, eye of the camera (world), passthrough flag. */
  function update(head, { passthrough = false, viewportH = 800, viewportW = 1280, flat = true, p11 = 1 } = {}) {
    const fr = cur.frame, c = cur.centre, hx = head.x, hy = head.y, hz = head.z;
    const ox = hx - c[0], oy = hy - c[1], oz = hz - c[2], oc2 = ox * ox + oy * oy + oz * oz, Rw = cur.Rw;
    far.uHead.value.set(hx, hy, hz); far.uOC.value.set(ox, oy, oz);
    // |OC|^2 - R^2 from the distance above the surface: (d - R)(d + R), exact in doubles
    const d = Math.sqrt(oc2); far.uOC2mR2.value = (d - Rw) * (d + Rw);
    earthMat.uniforms.uCa.value = (d - Rw * 1.016) * (d + Rw * 1.016);
    far.uTol.value = 30 * (fr.kind === "model" ? fr.scale : 1);
    earth.position.set(hx, hy, hz); earthMat.uniforms.uOn.value = 1; earthMat.uniforms.uHaze.value = passthrough ? 0.85 : 1;
    const M = cur.starM; skyGroup.matrix.set(M[0][0], M[0][1], M[0][2], hx, M[1][0], M[1][1], M[1][2], hy, M[2][0], M[2][1], M[2][2], hz, 0, 0, 0, 1); skyGroup.matrixWorldNeedsUpdate = true;
    starsPoints.visible = !passthrough; sun.visible = !passthrough;
    sun.position.set(hx + cur.sun[0] * 850, hy + cur.sun[1] * 850, hz + cur.sun[2] * 850); sunMat.uniforms.uPx.value = Math.max(14, Math.min(120, (Math.PI / 180) * 1.1 * 0.5 * viewportH * p11));
    frame.viewportH = viewportH; frame.viewportW = viewportW; frame.passthrough = passthrough;
    frame.starScale = flat ? Math.min(2.2, Math.max(1, 22 / (0.5 * viewportH * p11 * Math.PI / 180))) : 1; frame.starMinPx = passthrough ? 2.8 : flat ? 1.6 : 2.4;
    far.uViewportH.value = viewportH; stars.update({ frame, state });
  }
  return { scene, far, rig, mtn, fireBtnWorld, setLaunchCard, setFrame, update, earth, model, marker, markerGlow, ringsGroup, ringLabels, moonMesh, assets, assetsReady, starsPoints, get cur() { return cur; }, light, hemi };
}
