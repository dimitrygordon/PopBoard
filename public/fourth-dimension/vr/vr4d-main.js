// Beyond 3D VR storybook. Seated. The flat 22 pages are a different page.
// Headset path reuses Night Sky's controller rig. Narration reuses the astronomy storybook player.
import * as THREE from "../../vendor/three/three.module.min.js";
import { XRInput } from "../../night-sky/ns-input.js";
import { createNarrator } from "../../astro-course/ac-narrate.js";
import { createWorld } from "./vr4d-world.js";
import { createAudio } from "./vr4d-audio.js";
import { CaptionPanel } from "./vr4d-captions.js";
import { freshRay, resolveSelect } from "./vr4d-input.js";
import { buildSteps, LOOK, FADE, LEAF_SEC, bookHref, defaultModel, SCENE_TITLE, DECK, HELP_LEVELS } from "./vr4d-book.js";
import { capDelta, notchEvents, segmentLength, sphereSliceRadius, BALL_R, BEAD_RANGE, HYPER_R, cyclePlane, EYE_Y, W_PLANES } from "./vr4d-math.js";

const $ = (id) => document.getElementById(id);
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const params = new URLSearchParams(location.search);

const canvas = $("scene");
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: false });
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.NoToneMapping;
renderer.setClearColor(0x121823, 1);
renderer.xr.enabled = true;
const scene = new THREE.Scene();
scene.background = new THREE.Color(0x121823);
const camera = new THREE.PerspectiveCamera(58, 1, 0.08, 50);
camera.rotation.order = "YXZ";

const world = createWorld();
scene.add(world.root);
const panel = new CaptionPanel(THREE);
world.root.add(panel.mesh);
panel.place(new THREE.Vector3(0, EYE_Y, 0), 0);
const audio = createAudio();

const model = defaultModel();
let help = params.get("help") != null ? clamp(+params.get("help") || 0, 0, 2) : 1;
let exitTicket = params.get("ticket") !== "0";
model.help = help;
let steps = buildSteps(help, { exitTicket });
let step = 0;
let started = false;
let busy = false;
let yaw = 0, pitch = LOOK.cover.pitch;
let holdTurn = 0;
let turnRequest = 0;
let word = -1;
let didMotif = false, didHush = false, didSlice = false;
let chordStage = 0;
let lastDial = 0;
let xrInput = null;
const hoverId = [null, null];
let vrGrab = null;
let vrLast = null;
let aligned = false;
let xrFrames = 0;
const raycaster = new THREE.Raycaster();
const _head = new THREE.Vector3();

try {
  const face = new FontFace("Inter", "url(night-sky/ui/fonts/inter-latin-var.woff2)", { weight: "100 900" });
  face.load().then((f) => document.fonts.add(f)).catch(() => {});
} catch { /* system font */ }

const narrator = createNarrator($("narr"), "fourth-dimension/", {
  autoplay: () => started,
  onPlay: () => { if (!model.muted) audio.duck(true); $("cap").classList.add("live"); },
  onPause: () => audio.duck(false),
  onEnded: () => audio.duck(false),
  onWord: () => paintWords(),
});
const rateControl = $("narr").querySelector(".narr-rate");
if (rateControl) {
  const speedName = rateControl.querySelector(".sr-only");
  if (speedName) speedName.classList.remove("sr-only");
  $("rateSlot").appendChild(rateControl);
}
$("settingsBtn").addEventListener("click", () => {
  const sheet = $("settings");
  sheet.hidden = !sheet.hidden;
  $("settingsBtn").setAttribute("aria-expanded", String(!sheet.hidden));
});

function resize() {
  const w = canvas.clientWidth || 1, h = canvas.clientHeight || 1;
  const low = (navigator.hardwareConcurrency || 8) <= 4;
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, low ? 1.5 : 2));
  renderer.setSize(w, h, false);
  camera.aspect = w / h;
  camera.fov = w / h < 0.85 ? 70 : 58;
  camera.updateProjectionMatrix();
}
new ResizeObserver(resize).observe(canvas);
resize();

function paintWords() {
  const spans = [...$("capText").querySelectorAll(".nw")];
  const hi = spans.findIndex((s) => s.classList.contains("hl"));
  if (hi >= 0) $("cap").classList.add("live");
  spans.forEach((s, k) => s.classList.toggle("said", hi >= 0 && k < hi));
  word = hi;
  drawPanel();
}
function captionNow() {
  return model.card ? model.card.text : ($("capText").textContent || "");
}
function drawPanel() {
  panel.draw({
    text: captionNow(), word, paper: model.paper, scale: model.captionScale, buttons: panelButtons(), hover: hoverId[0] || hoverId[1],
  });
}
function panelButtons() {
  const b = [{ id: "prev", label: "Back" }, { id: "next", label: "Next", gold: true }, { id: "recenter", label: "Recenter" }];
  if (model.card) b.splice(2, 0, { id: "book", label: "Open in the book" });
  if (model.scene === "tesseract") b.push({ id: "stop", label: model.stopped ? "Go" : "Stop" });
  return b;
}
function onPanel(id) {
  if (!started) return;
  if (id === "next") go(1);
  else if (id === "prev") go(-1);
  else if (id === "recenter") recenter();
  else if (id === "book" && model.card) openBook(model.card.pageId);
  else if (id === "stop") model.stopped = !model.stopped;
  audio.pinch();
  drawPanel();
}
function recenter() {
  const eye = new THREE.Vector3(0, EYE_Y, 0);
  let y = yaw;
  if (renderer.xr.isPresenting) {
    const cam = renderer.xr.getCamera();
    cam.getWorldPosition(eye);
    eye.sub(world.root.position);
    y = new THREE.Euler().setFromQuaternion(cam.quaternion, "YXZ").y;
  }
  panel.place(eye, y);
}

function showCaption(text, kicker) {
  $("capKicker").textContent = kicker || "";
  $("capText").textContent = text || "";
  $("cap").classList.remove("live");
  word = -1;
}
function hintFor(page) {
  const h = {
    bead: "Slide the gold bead. The ball moves only while the bead moves.",
    draw: "Draw on the paper, then seal the guess. It is never marked wrong.",
    lift: "Lift the gold block up out of the house, then set it back.",
    cube: "Drag the cube to twist it. The shadow is on the screen.",
    slice: "Slide the glass plane. Corner tips the cube onto a corner.",
    pull: "Pull to the right: point, line, square, then lift.",
    w: "Slide the bead. The new direction is not one of the three you can see.",
    dial: "Turn the dial, then seal. Corners first, then edges. Never marked wrong.",
    cell: "Tap a cell to follow it in gold.",
    turn: "Turn the dial. It will not spin faster than 20 degrees a second. One hand: the trigger changes XW, YW, ZW.",
    span: "Set how big you think the ball will get, then lock it.",
    bead6: "Slide the bead. The ball appears, grows, shrinks, and vanishes.",
    ticket: "Point at a slice or a shadow. Nothing here is marked wrong.",
    cover: "Open the book when you are ready. Seated mode stays on.",
    look: "Drag to look around. You stay in the chair.",
    finale: "The last page hands you back to Unfolding.",
  };
  return h[page.control] || "";
}

function prepare(page) {
  if (page.id === "s2" && !didHush) { didHush = true; audio.hush(); }
  if (page.id === "s15") { model.pull[0] = model.pull[1] = model.pull[2] = 1; }
  if (page.id === "s16" || page.id === "s17") model.pull = [1, 1, 1, 1];
  if (page.id === "s17") model.reveal = 0;
  if (page.id === "s16") { model.dialPhase = model.lockC == null ? "corners" : "edges"; }
}
function showStep(snap) {
  const s = steps[step];
  const prev = model.scene;
  if (s.kind === "handback") {
    model.scene = s.scene;
    model.pageId = "";
    model.card = s;
    showCaption(s.text, "Continue");
    $("capHint").textContent = "Next page turns the page. Open in the book leaves VR and opens that chapter.";
    narrator.stop();
    if (started) audio.reveal();
  } else {
    const p = s.page;
    model.scene = p.scene;
    model.pageId = p.id;
    model.card = null;
    if (started) prepare(p);
    showCaption(p.text, SCENE_TITLE[p.scene] || "");
    $("capHint").textContent = hintFor(p);
    if (started) narrator.load(DECK, p.n, $("capText"));
  }
  if (snap || model.scene !== prev) {
    const look = LOOK[model.scene] || LOOK.cover;
    yaw = look.yaw;
    // On a phone the dock covers the lower half, so look slightly down and the subject sits above it.
    pitch = look.pitch + (camera.aspect < 0.85 ? -0.04 : 0);
  }
  if (started) audio.setCue(model.scene);
  $("prevBtn").disabled = step === 0;
  $("nextBtn").disabled = step === steps.length - 1;
  renderTools();
  drawPanel();
  const q = new URLSearchParams(location.search);
  if (model.pageId) q.set("p", model.pageId); else q.delete("p");
  try { history.replaceState(null, "", location.pathname + (q.toString() ? "?" + q.toString() : "")); } catch { /* file URL */ }
}

function transition(kind, done) {
  busy = true;
  if (kind === "black") {
    audio.whoosh();
    const el = $("blackout");
    el.animate([{ opacity: 0 }, { opacity: 1 }], { duration: FADE.out * 1000, fill: "forwards" });
    setTimeout(done, FADE.out * 1000);
    setTimeout(() => {
      el.animate([{ opacity: 1 }, { opacity: 0 }], { duration: FADE.fadeIn * 1000, fill: "forwards" });
    }, (FADE.out + FADE.hold) * 1000);
    setTimeout(() => { busy = false; }, (FADE.out + FADE.hold + FADE.fadeIn) * 1000 + 40);
  } else if (kind === "leaf") {
    audio.page();
    const curl = $("curl");
    curl.hidden = false;
    curl.classList.remove("go");
    void curl.offsetWidth;
    curl.classList.add("go");
    setTimeout(done, LEAF_SEC * 450);
    setTimeout(() => { curl.hidden = true; curl.classList.remove("go"); busy = false; }, LEAF_SEC * 1000 + 40);
  } else {
    const el = $("blackout");
    el.animate([{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], { duration: 600, fill: "forwards" });
    setTimeout(done, 280);
    setTimeout(() => { busy = false; }, 640);
  }
}
function go(dir) {
  if (!started || busy) return;
  const next = step + dir;
  if (next < 0 || next >= steps.length) return;
  const a = steps[step];
  const b = steps[next];
  const sceneB = b.scene || b.page.scene;
  let kind = "none";
  if (dir > 0 && a.kind === "handback") kind = model.reduced ? "fade" : (a.transition || "leaf");
  else if (dir > 0 && a.scene !== sceneB) kind = model.reduced ? "fade" : "leaf";
  if (kind === "none") { step = next; showStep(false); return; }
  transition(kind, () => { step = next; showStep(true); });
}

function renderTools() {
  const actions = $("actions");
  const settings = $("settingsBody");
  const sheetOpen = !$("settings").hidden;
  actions.replaceChildren();
  settings.replaceChildren();
  const s = steps[step];
  const page = s.kind === "page" ? s.page : null;
  const put = (host) => (el) => host.appendChild(el);
  const makeBtn = (host, label, fn, pressed, aria) => {
    const b = document.createElement("button");
    b.type = "button"; b.textContent = label;
    if (aria) b.setAttribute("aria-label", aria);
    if (pressed != null) b.setAttribute("aria-pressed", String(pressed));
    b.addEventListener("click", fn);
    put(host)(b); return b;
  };
  const btn = (label, fn, pressed, aria) => makeBtn(actions, label, fn, pressed, aria);
  const setBtn = (label, fn, pressed) => makeBtn(settings, label, fn, pressed);
  const slider = (label, min, max, step, value, fn) => {
    const lab = document.createElement("label");
    lab.textContent = label;
    const inp = document.createElement("input");
    inp.type = "range"; inp.min = min; inp.max = max; inp.step = step; inp.value = value;
    inp.setAttribute("aria-label", label);
    inp.addEventListener("input", () => fn(Number(inp.value)));
    lab.appendChild(inp); actions.appendChild(lab);
  };
  if (s.kind === "handback") {
    btn("Open in the book", () => openBook(s.pageId));
  } else if (page) {
    const c = page.control;
    if (c === "bead" || c === "draw") slider("Bead", -1, 1, 0.01, model.bead, (v) => { model.bead = v; });
    if (c === "draw") btn(model.sealed ? "Sealed" : "Seal", () => { model.sealed = true; audio.lock(); renderTools(); }, null, "Seal the guess");
    if (c === "lift") slider("Lift", 0, 1, 0.01, model.lift, (v) => { model.lift = v; });
    if (c === "cube" || c === "slice") btn("Corner", () => setCorner(), null, "Tip the cube onto a corner");
    if (c === "slice") {
      slider("Cut", -1, 1, 0.01, model.planeT, (v) => { model.planeT = v; });
      for (const [name, short, aria] of [["tri", "3", "triangle"], ["quad", "4", "four sides"], ["pent", "5", "pentagon"], ["hex", "6", "hexagon"]]) {
        btn(short, () => { model.tile = name; audio.lock(); renderTools(); }, model.tile === name, aria);
      }
    }
    if (c === "pull") slider("Pull", 0, 3, 0.01, model.pull[0] + model.pull[1] + model.pull[2], (v) => {
      model.pull[0] = clamp(v, 0, 1); model.pull[1] = clamp(v - 1, 0, 1); model.pull[2] = clamp(v - 2, 0, 1);
    });
    if (c === "w") slider("New way", 0, 1, 0.01, model.pull[3], (v) => { model.pull[3] = v; });
    if (c === "dial") {
      slider(model.dialPhase === "edges" ? "Edges" : "Corners", 0, 64, 1, model.dial, (v) => {
        if (Math.round(v) !== Math.round(model.dial)) audio.detent();
        model.dial = v;
      });
      btn("Seal", () => sealDial(), null, "Seal the guess");
    }
    if (c === "cell" || c === "turn") {
      W_PLANES.forEach((p, i) => btn(model.help >= 2 ? p : String(i + 1), () => { model.plane = p; audio.plane(i); }, model.plane === p, model.help >= 2 ? p + " plane" : "Turn " + (i + 1)));
      const left = btn("Left", () => {}, null, "Turn left");
      const right = btn("Right", () => {}, null, "Turn right");
      const hold = (b, dir) => {
        const on = () => { holdTurn = dir; };
        const off = () => { if (holdTurn === dir) holdTurn = 0; };
        b.addEventListener("pointerdown", on);
        b.addEventListener("pointerup", off);
        b.addEventListener("pointerleave", off);
      };
      hold(left, -1); hold(right, 1);
      btn(model.stopped ? "Go" : "Stop", () => { model.stopped = !model.stopped; renderTools(); });
    }
    if (c === "span") {
      slider("Size", 0.1, 1.6, 0.01, model.guessD || 0.6, (v) => { model.guessD = v; });
      btn("Lock", () => { audio.lock(); }, null, "Lock the guessed size");
    }
    if (c === "bead6") slider("Bead", -1, 1, 0.01, model.bead6, (v) => { model.bead6 = v; });
    if (c === "ticket") {
      btn("Slice", () => { model.ticket.slice = !model.ticket.slice; renderTools(); }, model.ticket.slice);
      btn("Cube", () => { model.ticket.shadow = !model.ticket.shadow; renderTools(); }, model.ticket.shadow, "Cube shadow");
      btn("4D", () => { model.ticket.tess = !model.ticket.tess; renderTools(); }, model.ticket.tess, "Tesseract shadow");
    }
    if (c === "finale") btn("Open in the book", () => openBook("net-cube"));
    if (c === "cover") btn("Open", () => go(1), null, "Open the book");
  }
  const helpRow = document.createElement("div");
  helpRow.className = "help-levels";
  helpRow.setAttribute("role", "group");
  helpRow.setAttribute("aria-label", "Help level");
  HELP_LEVELS.forEach(({ value, label, disabled }) => {
    const b = document.createElement("button");
    b.type = "button";
    b.textContent = label;
    b.disabled = disabled;
    b.setAttribute("aria-pressed", String(help === value));
    b.addEventListener("click", () => setHelp(value));
    helpRow.appendChild(b);
  });
  settings.appendChild(helpRow);
  setBtn(model.reduced ? "Motion: low" : "Motion", () => { model.reduced = !model.reduced; renderTools(); }, model.reduced);
  setBtn(model.paper ? "Paper captions" : "Captions", () => {
    model.paper = !model.paper;
    document.body.classList.toggle("paper-mode", model.paper);
    drawPanel(); renderTools();
  }, model.paper);
  if (model.scene === "tesseract") setBtn(model.tabletop ? "Room size" : "Tabletop", () => { model.tabletop = !model.tabletop; renderTools(); }, model.tabletop);
  $("settings").hidden = !sheetOpen;
}

function setHelp(n) {
  n = clamp(n, 0, 2);
  if (n === help) return;
  if (n === 2) audio.sparkle();
  help = n; model.help = n;
  const id = model.pageId || steps[step]?.page?.id;
  steps = buildSteps(help, { exitTicket });
  const i = steps.findIndex((s) => s.page?.id === id);
  step = i >= 0 ? i : Math.min(step, steps.length - 1);
  showStep(false);
}
function sealDial() {
  if (model.dialPhase === "corners" && model.lockC == null) { model.lockC = Math.round(model.dial); model.dialPhase = "edges"; model.dial = 0; }
  else model.lockE = Math.round(model.dial);
  audio.lock();
  renderTools();
}
function setCorner() {
  const q = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(1, 1, 1).normalize(), new THREE.Vector3(0, 1, 0));
  model.cubeQ = { x: q.x, y: q.y, z: q.z, w: q.w };
  model.corner = true;
  audio.pinch();
}
function openBook(pageId) {
  const href = bookHref(pageId);
  const leave = () => { location.href = href; };
  if (renderer.xr.isPresenting && renderer.xr.getSession()) renderer.xr.getSession().end().then(leave, leave);
  else leave();
}

function nudge(name, dx, dy) {
  if (name === "bead") model.bead = clamp(model.bead + dx * 0.01, -1, 1);
  else if (name === "bead6") model.bead6 = clamp(model.bead6 + dx * 0.01, -1, 1);
  else if (name === "wbead") model.pull[3] = clamp(model.pull[3] + dx * 0.01, 0, 1);
  else if (name === "block") model.lift = clamp(model.lift - dy * 0.006, 0, 1);
  else if (name === "plane") model.planeT = clamp(model.planeT - dy * 0.006, -1, 1);
  else if (name === "cube") twistCube(dx, dy);
  else if (name === "dial") {
    const next = clamp(Math.round(model.dial + dx * 0.2), 0, 64);
    if (next !== Math.round(model.dial)) audio.detent();
    model.dial = next;
  } else if (name === "turndial") turnRequest += dx * 0.012;
  else if (name === "pull") {
    const v = clamp(model.pull[0] + model.pull[1] + model.pull[2] + dx * 0.01, 0, 3);
    model.pull[0] = clamp(v, 0, 1); model.pull[1] = clamp(v - 1, 0, 1); model.pull[2] = clamp(v - 2, 0, 1);
  }
}
function twistCube(dx, dy) {
  const q = new THREE.Quaternion(model.cubeQ.x, model.cubeQ.y, model.cubeQ.z, model.cubeQ.w);
  q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0, 1, 0), dx * 0.012));
  q.premultiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), dy * 0.012));
  model.cubeQ = { x: q.x, y: q.y, z: q.z, w: q.w };
}

function rayOf(origin, dir) {
  raycaster.ray.origin.copy(origin);
  raycaster.ray.direction.copy(dir).normalize();
  return raycaster.ray;
}
function pointerRay(e) {
  const r = canvas.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width) * 2 - 1;
  const y = -((e.clientY - r.top) / r.height) * 2 + 1;
  raycaster.setFromCamera(new THREE.Vector2(x, y), camera);
  return raycaster.ray;
}
function firstGrab(ray) {
  const hits = raycaster.intersectObjects(world.grabs, false);
  return hits.find((h) => h.object.userData.grab) || null;
}

let drag = null;
canvas.style.touchAction = "none";
canvas.addEventListener("pointerdown", (e) => {
  if (!started || e.button > 0) return;
  pointerRay(e);
  const panelId = panel.hit(raycaster.ray);
  if (panelId && panelId !== "panel") { onPanel(panelId); return; }
  const hit = firstGrab(raycaster.ray);
  canvas.setPointerCapture(e.pointerId);
  drag = {
    id: e.pointerId, grab: hit ? hit.object.userData.grab : null,
    x: e.clientX, y: e.clientY, x0: e.clientX, y0: e.clientY,
    yaw, pitch, moved: false,
  };
  if (drag.grab === "pad" && !model.sealed) model.strokes.push([]);
  if (drag.grab) audio.pinch();
});
canvas.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
  if (Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0) > 5) drag.moved = true;
  if (!drag.grab) {
    const k = (camera.fov * Math.PI / 180) / Math.max(canvas.clientHeight, 1);
    yaw = drag.yaw + (e.clientX - drag.x0) * k;
    pitch = clamp(drag.pitch + (e.clientY - drag.y0) * k, -1.05, 1.05);
  } else if (drag.grab === "pad" && !model.sealed) {
    pointerRay(e);
    const hits = raycaster.intersectObject(world.pad, false);
    if (hits[0]) {
      const p = world.pad.worldToLocal(hits[0].point.clone());
      const s = model.strokes[model.strokes.length - 1];
      if (s && s.length < 80) s.push([p.x, p.y]);
    }
  } else nudge(drag.grab, dx, dy);
  drag.x = e.clientX; drag.y = e.clientY;
});
function endDrag(e) {
  if (!drag || e.pointerId !== drag.id) return;
  if (!drag.moved && drag.grab) tap(drag.grab);
  if (drag.grab) audio.release();
  drag = null;
}
canvas.addEventListener("pointerup", endDrag);
canvas.addEventListener("pointercancel", endDrag);
function tap(name) {
  if (name === "book") go(1);
  else if (name.startsWith("cell-")) { model.cell = +name.slice(5); audio.pinch(); }
  else if (name.startsWith("tile-")) { model.tile = name.slice(5); audio.lock(); renderTools(); }
  else if (name.startsWith("ticket-")) {
    const k = name.slice(7);
    model.ticket[k] = !model.ticket[k];
    audio.pinch(); renderTools();
  }
}

// The controllers must exist before the session starts. three.js binds an input source to a
// controller only in the inputsourceschange event that fires as the session opens; a controller
// created after `await setSession` is never bound, so select events never reach it.
const aimDots = [0, 1].map(() => {
  const m = new THREE.Mesh(new THREE.SphereGeometry(0.012, 12, 8), new THREE.MeshBasicMaterial({ color: 0x3ddc84, depthTest: false, transparent: true }));
  m.renderOrder = 51; m.visible = false; scene.add(m);
  return m;
});
function aimFor(i) {
  const st = xrInput.ctrl[i];
  const ray = st && st.source ? freshRay(THREE, st.c) : null;
  const hit = ray ? panel.hitInfo(ray) : null;
  return { ray, hit };
}
function showAim(i, hit) {
  const dot = aimDots[i];
  dot.visible = !!(hit && renderer.xr.isPresenting);
  if (hit) dot.position.copy(hit.point);
  xrInput.setRayLength(i, hit ? Math.max(0.15, hit.t) : 5);
  const id = hit && hit.id !== "panel" ? hit.id : null;
  if (id !== hoverId[i]) { hoverId[i] = id; drawPanel(); }
}
xrInput = new XRInput(THREE, renderer, scene, {
  onHover(i) { const { hit } = aimFor(i); showAim(i, hit); },
  onSelectStart(i) {
    const st = xrInput.ctrl[i];
    const ray = st && st.c ? freshRay(THREE, st.c) : null;
    if (ray) vrDown(ray);
  },
  onSelectEnd() { vrGrab = null; vrLast = null; audio.release(); },
  onScrubHours() {},
  onTogglePanel() { panel.mesh.visible = !panel.mesh.visible; if (panel.mesh.visible) recenter(); },
});

async function enterVR() {
  const session = await navigator.xr.requestSession("immersive-vr", { optionalFeatures: ["local-floor", "hand-tracking"] });
  await renderer.xr.setSession(session);
  session.addEventListener("end", () => {
    aligned = false; xrFrames = 0; world.root.position.y = 0;
    hoverId[0] = hoverId[1] = null; aimDots.forEach((d) => { d.visible = false; });
  });
}
function vrDown(ray) {
  panel.mesh.updateWorldMatrix(true, false);
  rayOf(ray.origin, ray.dir);
  const sel = resolveSelect(panel.hitInfo(ray));
  if (sel.consumed) { if (sel.button) onPanel(sel.button); return; }
  const hit = firstGrab(raycaster.ray);
  const squeezing = xrInput ? xrInput.ctrl.filter((c) => c.squeeze).length : 0;
  if (hit && hit.object.userData.grab && hit.object.userData.grab.startsWith("cell-")) {
    model.cell = +hit.object.userData.grab.slice(5); audio.pinch(); return;
  }
  if (model.scene === "tesseract" && squeezing < 2) {
    model.plane = cyclePlane(model.plane);
    audio.plane(W_PLANES.indexOf(model.plane));
    if (!hit) return;
  }
  if (hit && hit.object.userData.grab) { vrGrab = hit.object.userData.grab; audio.pinch(); }
}
function vrDrag() {
  if (!xrInput || !vrGrab) return;
  const st = xrInput.ctrl.find((c) => c.selecting && c.c);
  if (!st) return;
  const p = new THREE.Vector3().setFromMatrixPosition(st.c.matrixWorld);
  if (vrLast) nudge(vrGrab, (p.x - vrLast.x) * 420, -(p.y - vrLast.y) * 420);
  vrLast = p;
}
function wristTurn() {
  if (!xrInput || model.scene !== "tesseract" || model.stopped) return 0;
  let delta = 0;
  const hands = [];
  xrInput.ctrl.forEach((st) => {
    if (!st.squeeze || !st.grip) return;
    const q = st.grip.quaternion;
    if (!st._q) { st._q = q.clone(); return; }
    const dq = q.clone().multiply(st._q.clone().invert());
    st._q.copy(q);
    hands.push(2 * Math.atan2(dq.z, dq.w));
  });
  if (hands.length >= 2) delta = hands[0] - hands[1];
  else if (hands.length === 1) delta = hands[0];
  return delta;
}

$("prevBtn").addEventListener("click", () => go(-1));
$("nextBtn").addEventListener("click", () => go(1));
$("muteBtn").addEventListener("click", () => {
  model.muted = !model.muted;
  narrator.setMuted(model.muted);
  $("muteBtn").setAttribute("aria-pressed", String(model.muted));
  $("muteBtn").textContent = model.muted ? "Muted" : "Sound";
  if (model.muted) audio.duck(false);
});
$("startScreen").addEventListener("click", () => begin(false));
$("startVR").addEventListener("click", () => begin(true));
if (navigator.xr && navigator.xr.isSessionSupported) {
  navigator.xr.isSessionSupported("immersive-vr").then((ok) => { $("startVR").hidden = !ok; }).catch(() => { $("startVR").hidden = true; });
}
window.addEventListener("keydown", (e) => {
  if (e.target && /^(INPUT|TEXTAREA|SELECT)$/.test(e.target.tagName)) return;
  if (e.key === "ArrowRight") go(1);
  else if (e.key === "ArrowLeft") go(-1);
  else if (e.key === "ArrowUp") pitch = clamp(pitch - 0.08, -1.05, 1.05);
  else if (e.key === "ArrowDown") pitch = clamp(pitch + 0.08, -1.05, 1.05);
});

async function begin(vr) {
  if (started) return;
  started = true;
  $("splash").hidden = true;
  audio.start();
  audio.loadScoreSlot("fourth-dimension/audio/manifest.json");
  const want = params.get("p");
  if (want) {
    const i = steps.findIndex((s) => s.page && s.page.id === want);
    if (i >= 0) step = i;
  }
  showStep(true);
  if (vr) {
    try { await enterVR(); }
    catch { $("capHint").textContent = "The headset did not open. This screen still has the whole story."; }
  }
}

let last = performance.now();
renderer.setAnimationLoop((now) => {
  const dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  const t = now / 1000;
  if (started) {
    audio.pump();
    const stage = model.pull.reduce((n, x) => n + (x >= 0.98 ? 1 : 0), 0);
    if (stage > chordStage && model.scene === "build") {
      const freqs = [146.83, 220, 369.99, 554.37, 659.25];
      audio.chordNote(freqs[Math.min(stage - 1, 4)]);
      if (stage >= 4) audio.swell();
      chordStage = stage;
    }
    if (!model.stopped && (model.scene === "tesseract")) {
      const prev = model.angle;
      const req = turnRequest + holdTurn * 2 + wristTurn();
      model.angle = prev + capDelta(req, dt);
      turnRequest = 0;
      for (const e of notchEvents(prev, model.angle)) {
        if (e.kind === "waypoint") audio.tick90();
        else { audio.swap(); audio.reveal(); }
      }
      const speed = dt > 0 ? Math.abs(model.angle - prev) / dt / (20 * Math.PI / 180) : 0;
      audio.shimmer(speed);
    } else if (model.stopped) turnRequest = 0;
    else audio.shimmer(0);
    if (model.pageId === "s17" && model.reveal < 1) {
      const before = Math.floor(model.reveal * 16);
      model.reveal = Math.min(1, model.reveal + dt / 8);
      if (Math.floor(model.reveal * 16) > before) audio.rise(Math.floor(model.reveal * 16));
    }
    if (model.scene === "flick") {
      const len = segmentLength(BALL_R, model.bead * BEAD_RANGE);
      audio.hum(len / (2 * BALL_R));
      if (!didMotif && model.bead > -0.97) { didMotif = true; audio.motif(); }
      if (!didSlice && len > 0.04) { didSlice = true; audio.slice(); }
    } else if (model.scene === "hyper") audio.hum(sphereSliceRadius(HYPER_R, model.bead6 * 0.9) / HYPER_R);
    else audio.hum(0);
    if (Math.round(model.dial) !== lastDial && model.pageId === "s16") { lastDial = Math.round(model.dial); }
    vrDrag();
  }
  if (renderer.xr.isPresenting) {
    renderer.xr.getCamera().getWorldPosition(_head);
    _head.sub(world.root.position);
    model.presenting = true;
    if (!aligned) {
      xrFrames++;
      if (xrFrames === 20) {
        if (_head.y < 0.45) world.root.position.y = -EYE_Y;
        aligned = true;
        recenter();
      }
    }
  } else {
    _head.set(0, EYE_Y, 0);
    model.presenting = false;
    if (model.scene === "tesseract" && !model.tabletop) {
      // Screen only: step the camera back so the whole seated shadow fits in frame.
      // The cube itself stays centred on the seat. The headset camera is not moved.
      const dist = 4.05;
      camera.position.set(Math.sin(yaw) * dist, EYE_Y + 0.45 - pitch, Math.cos(yaw) * dist);
      camera.lookAt(0, EYE_Y, 0);
    } else {
      camera.position.set(0, EYE_Y, 0);
      camera.rotation.set(pitch, yaw, 0);
    }
    if (aligned) { aligned = false; xrFrames = 0; world.root.position.y = 0; }
  }
  world.update(model, t, dt, _head);
  panel.mesh.visible = renderer.xr.isPresenting;
  if (xrInput && renderer.xr.isPresenting) {
    xrInput.update(dt);
    xrInput.ctrl.forEach((st, i) => { if (!st.source) { aimDots[i].visible = false; if (hoverId[i]) { hoverId[i] = null; drawPanel(); } } });
  }
  renderer.render(scene, camera);
});

showStep(true);
renderTools();

window.__vr4d = {
  goTo(id) {
    const i = steps.findIndex((s) => s.page && s.page.id === id);
    if (i >= 0) { step = i; showStep(true); }
  },
  corner() { setCorner(); },
  model, steps: () => steps.map((s) => s.page?.id || "card:" + s.scene),
};
