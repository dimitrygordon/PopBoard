/**
 * Mechanics Playground page. Wires the simulation to a swappable draw
 * layer and to window.mechanics. The draw layer only receives snapshots.
 * The camera (pan, zoom, follow) stays on the layer.
 */
import { forwardStudyQuery } from "./board-return.js?v=20261022a";
import { createSimulation } from "./mechanics-world.js";
import { createCraftDrawLayer, createPlaceholderDrawLayer, createSchematicDrawLayer } from "./mechanics-render.js";
import {
  modeFromSearch, buildPreset, defaultPart, hitBody
} from "./mechanics-physics.js";

const TILES = [
  { src: "mechanics/tiles/pulley.svg", kind: "t-pulley", label: "Pulley", mode: "pulley", drop: "pulley" },
  { src: "mechanics/tiles/spring.svg", kind: "t-spring", label: "Spring", mode: "springs", drop: "spring" },
  { src: "mechanics/tiles/ramp.svg", kind: "t-ramp", label: "Ramp", mode: "incline", drop: "wedge" },
  { src: "mechanics/tiles/pendulum.svg", kind: "t-pendulum", label: "Pendulum", mode: "pendulum", drop: "pendulum" },
  { src: "mechanics/tiles/rocket.svg", kind: "t-rocket", label: "Rocket", mode: "rocket", drop: "rocket" },
  { src: "mechanics/tiles/magnet.svg", kind: "t-magnet", label: "Magnet", mode: null, drop: "magnet" }
];

const MATERIAL_LABEL = { ice: "Wax paper", wood: "Cardboard", rubber: "Felt", custom: "Custom" };
const MATERIAL_CYCLE = ["ice", "wood", "rubber"];

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);

const mechanics = new EventTarget();
mechanics.state = { bodies: [], joints: [], time: 0, paused: true };
mechanics.createCraftDrawLayer = createCraftDrawLayer;
mechanics.createPlaceholderDrawLayer = createPlaceholderDrawLayer;
mechanics.createSchematicDrawLayer = createSchematicDrawLayer;
window.mechanics = mechanics;

const canvas = $("mechanicsCanvas");
const craftLayer = createCraftDrawLayer(canvas, { reducedMotion });
const schematicLayer = createSchematicDrawLayer(canvas);
let drawLayer = craftLayer;
mechanics.setDrawLayer = (layer) => {
  if (layer && typeof layer.draw === "function" && typeof layer.worldFromScreen === "function") {
    drawLayer = layer;
  }
};
Object.defineProperty(mechanics, "layer", { get() { return drawLayer; } });

const planckApi = window.planck;
const statusLine = $("statusLine");
if (!planckApi || typeof planckApi.World !== "function") {
  statusLine.textContent = "The physics engine did not load.";
} else {
  boot(planckApi);
}

function boot(planck) {
  const mode = modeFromSearch(location.search);
  const sim = createSimulation(planck, buildPreset(mode));
  sim.setPaused(reducedMotion);
  let snapOn = false;
  let radialId = null;
  let tileGesture = null;
  const pointers = new Map();
  let gesture = null;

  function focusDynamic() {
    const body = sim.snapshot().bodies.find((item) => !item.isStatic);
    if (body) sim.select(body.id);
    else sim.select(null);
  }

  const drawer = $("partDrawer");
  const tileButtons = TILES.map((tile) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "tile " + tile.kind;
    button.dataset.drop = tile.drop;
    if (tile.mode) button.dataset.mode = tile.mode;
    button.setAttribute("aria-label", tile.label);
    button.addEventListener("pointerdown", (event) => startTile(event, tile, button));
    drawer.appendChild(button);
    return { tile, button };
  });
  mountTiles(tileButtons);

  function pivotOrigin(node) {
    const raw = node.getAttribute("data-pivot");
    if (!raw) return "";
    const parts = raw.trim().split(/[\s,]+/).map(Number);
    if (parts.length < 2 || !Number.isFinite(parts[0]) || !Number.isFinite(parts[1])) return "";
    return (parts[0] / 200 * 100) + "% " + (parts[1] / 200 * 100) + "%";
  }

  function applyPivots(root) {
    root.querySelectorAll("[data-pivot]").forEach((node) => {
      const origin = pivotOrigin(node);
      if (!origin) return;
      node.dataset.mpOrigin = origin;
      node.style.transformBox = "view-box";
      node.style.transformOrigin = origin;
      node.querySelectorAll(".mp-shm").forEach((shim) => {
        shim.style.transformBox = "view-box";
        shim.style.transformOrigin = origin;
      });
    });
  }

  function mountTiles(entries) {
    for (const entry of entries) {
      fetch(entry.tile.src).then((response) => response.text()).then((markup) => {
        const parsed = new DOMParser().parseFromString(markup, "image/svg+xml");
        const svg = parsed.documentElement;
        if (!svg || String(svg.tagName).toLowerCase() !== "svg") return;
        svg.removeAttribute("width");
        svg.removeAttribute("height");
        svg.setAttribute("aria-hidden", "true");
        svg.setAttribute("focusable", "false");
        entry.button.replaceChildren(document.importNode(svg, true));
        applyPivots(entry.button);
      }).catch(() => {
        say("A tool tile did not load.");
      });
    }
  }

  function publish(name) {
    const snap = sim.snapshot();
    mechanics.state = {
      bodies: snap.bodies,
      joints: snap.joints,
      time: snap.time,
      paused: snap.paused,
      mode: snap.mode,
      gravity: snap.gravity,
      energy: snap.energy
    };
    if (name) mechanics.dispatchEvent(new CustomEvent(name, { detail: mechanics.state }));
    return snap;
  }

  let said = 0;
  function say(text) {
    said += 1;
    const token = said;
    statusLine.textContent = text;
    window.setTimeout(() => {
      if (said === token) statusLine.textContent = "";
    }, 2200);
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const width = Math.max(2, Math.round((rect.width || window.innerWidth) * dpr));
    const height = Math.max(2, Math.round((rect.height || window.innerHeight) * dpr));
    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }
    craftLayer.resize();
    schematicLayer.resize();
  }

  function canvasPos(event) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / (rect.width || 1);
    const scaleY = canvas.height / (rect.height || 1);
    return {
      sx: (event.clientX - rect.left) * scaleX,
      sy: (event.clientY - rect.top) * scaleY,
      scale: scaleX
    };
  }

  function viewCenter() {
    return drawLayer.worldFromScreen(canvas.width / 2, canvas.height / 2);
  }

  function frameBoth() {
    const snap = sim.snapshot();
    craftLayer.frame(snap);
    schematicLayer.frame(snap);
  }

  function loadMode(next) {
    const url = new URL(location.href);
    url.searchParams.set("mode", next);
    history.replaceState(null, "", url);
    sim.load(buildPreset(next));
    sim.setPaused(reducedMotion);
    sim.setOverlay({ snap: snapOn });
    hideRadial();
    focusDynamic();
    frameBoth();
    publish("change");
    say(next.charAt(0).toUpperCase() + next.slice(1) + ".");
  }

  function spawn(kind, x, y) {
    if (kind === "wedge") return sim.addPart(defaultPart("wedge", x, y));
    if (kind === "pulley") return sim.addPart(defaultPart("pulley-wheel", x, y));
    if (kind === "rocket") {
      const part = defaultPart("rocket", x, y);
      part.thrust = 22;
      part.thrustOn = true;
      return sim.addPart(part);
    }
    if (kind === "magnet") {
      const part = defaultPart("ball", x, y);
      part.magnet = 8;
      return sim.addPart(part);
    }
    if (kind === "pendulum") {
      const pivot = sim.addPart({
        ...defaultPart("ball", x, y + 1.6),
        radius: 0.08,
        static: true,
        material: "wood",
        mass: 0.2
      });
      if (!pivot.ok) return pivot;
      const theta = 5 * Math.PI / 180;
      const bob = sim.addPart({
        ...defaultPart("ball", x + Math.sin(theta) * 2, y + 1.6 - Math.cos(theta) * 2),
        radius: 0.07,
        mass: 1,
        material: "wood"
      });
      if (!bob.ok) return bob;
      const joint = sim.addJoint({
        type: "distance",
        bodyA: pivot.id,
        bodyB: bob.id,
        anchorA: { x: 0, y: 0 },
        anchorB: { x: 0, y: 0 },
        length: 2
      });
      if (joint.ok) sim.select(bob.id);
      return joint;
    }
    const anchor = sim.addPart({
      ...defaultPart("box", x, y + 1.5),
      width: 0.7,
      height: 0.28,
      static: true
    });
    if (!anchor.ok) return anchor;
    const mass = sim.addPart({ ...defaultPart("box", x, y), width: 0.5, height: 0.4, mass: 1 });
    if (!mass.ok) return mass;
    const joint = sim.addJoint({
      type: "spring",
      bodyA: anchor.id,
      bodyB: mass.id,
      anchorA: { x: 0, y: 0 },
      anchorB: { x: 0, y: 0 },
      stiffness: 40,
      damping: 0.6,
      restLength: 1.2
    });
    if (joint.ok) sim.select(mass.id);
    return joint;
  }

  function dropAt(kind, world) {
    const result = spawn(kind, world.x, world.y);
    if (!result.ok) {
      say(result.error || "Could not place that.");
      return;
    }
    hideRadial();
    const selected = sim.snapshot().bodies.find((body) => body.id === sim.selectedId());
    if (selected && !selected.isStatic) drawLayer.setFollow(selected.id);
    publish("change");
    say("Placed.");
  }

  function armTile(button) {
    drawer.querySelectorAll(".tile").forEach((el) => el.classList.toggle("is-active", el === button));
  }

  function liftTile(gesture, event) {
    const button = gesture.button;
    if (!gesture.lifted) {
      gesture.lifted = true;
      const slot = document.createElement("span");
      slot.className = "tile-slot";
      slot.style.width = button.offsetWidth + "px";
      slot.style.height = button.offsetHeight + "px";
      button.before(slot);
      gesture.slot = slot;
      button.classList.add("is-lifted");
      button.style.position = "fixed";
      button.style.zIndex = "8";
      button.style.margin = "0";
      button.style.pointerEvents = "none";
    }
    button.style.left = event.clientX + "px";
    button.style.top = event.clientY + "px";
    button.style.transform = "translate(-50%, -62%)";
  }

  function settleTile(gesture) {
    const button = gesture.button;
    if (!button) return;
    button.classList.remove("is-lifted");
    button.style.position = "";
    button.style.zIndex = "";
    button.style.left = "";
    button.style.top = "";
    button.style.transform = "";
    button.style.margin = "";
    button.style.pointerEvents = "";
    if (gesture.slot && gesture.slot.parentNode) gesture.slot.replaceWith(button);
  }

  function startTile(event, tile, button) {
    event.preventDefault();
    event.stopPropagation();
    armTile(button);
    tileGesture = {
      pointerId: event.pointerId,
      tile,
      button,
      x: event.clientX,
      y: event.clientY,
      moved: false
    };
    try { button.setPointerCapture(event.pointerId); } catch (e) { /* synthetic pointers have no capture */ }
    window.addEventListener("pointermove", moveTile);
    window.addEventListener("pointerup", endTile);
    window.addEventListener("pointercancel", endTile);
  }

  function moveTile(event) {
    if (!tileGesture || event.pointerId !== tileGesture.pointerId) return;
    if (Math.hypot(event.clientX - tileGesture.x, event.clientY - tileGesture.y) > 8) {
      tileGesture.moved = true;
      liftTile(tileGesture, event);
    }
  }

  function endTile(event) {
    if (!tileGesture || event.pointerId !== tileGesture.pointerId) return;
    const current = tileGesture;
    tileGesture = null;
    window.removeEventListener("pointermove", moveTile);
    window.removeEventListener("pointerup", endTile);
    window.removeEventListener("pointercancel", endTile);
    settleTile(current);
    if (!current.moved) {
      if (current.tile.mode) loadMode(current.tile.mode);
      else dropAt(current.tile.drop, viewCenter());
      return;
    }
    const rect = canvas.getBoundingClientRect();
    const inside = event.clientX >= rect.left && event.clientX <= rect.right
      && event.clientY >= rect.top && event.clientY <= rect.bottom;
    if (!inside) return;
    const pos = canvasPos(event);
    dropAt(current.tile.drop, drawLayer.worldFromScreen(pos.sx, pos.sy));
  }

  function describe(snap) {
    const energy = snap.energy;
    return [
      snap.mode,
      "t " + snap.time.toFixed(2) + " s",
      snap.bodies.length + " parts",
      "KE " + energy.kinetic.toFixed(2) + " J",
      "PE " + energy.gravitational.toFixed(2) + " J",
      "spring " + energy.spring.toFixed(2) + " J"
    ].join(" · ");
  }

  function placeRadial(snap) {
    const radial = $("radial");
    if (!radialId) {
      radial.hidden = true;
      return;
    }
    const body = snap.bodies.find((item) => item.id === radialId);
    if (!body) {
      hideRadial();
      return;
    }
    const screen = drawLayer.screenFromWorld(body.x, body.y);
    const rect = canvas.getBoundingClientRect();
    const x = rect.left + screen.x * (rect.width / canvas.width);
    const y = rect.top + screen.y * (rect.height / canvas.height);
    radial.hidden = false;
    radial.style.left = x + "px";
    radial.style.top = y + "px";
    $("radialMaterial").textContent = MATERIAL_LABEL[body.material] || "Material";
    $("radialPin").textContent = body.isStatic ? "Unpin" : "Pin";
  }

  function showRadial(id) {
    radialId = id;
    placeRadial(sim.snapshot());
  }

  function hideRadial() {
    radialId = null;
    $("radial").hidden = true;
  }

  function paint(snap) {
    drawLayer.draw(snap);
    $("pauseBtn").textContent = snap.paused ? "Play" : "Pause";
    $("pauseBtn").setAttribute("aria-pressed", snap.paused ? "false" : "true");
    $("readout").textContent = describe(snap);
    placeRadial(snap);
  }

  function showDiagram(on) {
    mechanics.setDrawLayer(on ? schematicLayer : craftLayer);
    $("diagramBtn").setAttribute("aria-pressed", on ? "true" : "false");
    paint(sim.snapshot());
  }

  $("diagramBtn").addEventListener("click", () => {
    showDiagram($("diagramBtn").getAttribute("aria-pressed") !== "true");
  });
  $("pauseBtn").addEventListener("click", () => {
    const paused = !sim.snapshot().paused;
    sim.setPaused(paused);
    publish(paused ? "pause" : "play");
  });
  $("resetBtn").addEventListener("click", () => {
    sim.reset();
    hideRadial();
    focusDynamic();
    frameBoth();
    publish("reset");
  });

  function removeSelected() {
    const id = sim.selectedId();
    if (!id) return;
    const snap = sim.snapshot();
    const result = snap.joints.some((joint) => joint.id === id) ? sim.removeJoint(id) : sim.removePart(id);
    if (!result.ok) say(result.error);
    else {
      if (radialId === id) hideRadial();
      publish("change");
    }
  }

  $("radialMaterial").addEventListener("click", (event) => {
    event.stopPropagation();
    const body = sim.snapshot().bodies.find((item) => item.id === radialId);
    if (!body) return;
    const index = MATERIAL_CYCLE.indexOf(body.material);
    const next = MATERIAL_CYCLE[(index + 1) % MATERIAL_CYCLE.length];
    const result = sim.updatePart(body.id, { material: next });
    if (!result.ok) say(result.error);
    else {
      say(MATERIAL_LABEL[next] + ".");
      publish("change");
    }
  });
  $("radialPin").addEventListener("click", (event) => {
    event.stopPropagation();
    const body = sim.snapshot().bodies.find((item) => item.id === radialId);
    if (!body) return;
    if (body.type === "ground") {
      say("The floor stays pinned.");
      return;
    }
    const result = sim.updatePart(body.id, { static: !body.isStatic });
    if (!result.ok) say(result.error);
    else {
      say(body.isStatic ? "Loose." : "Pinned.");
      publish("change");
    }
  });
  $("radialDelete").addEventListener("click", (event) => {
    event.stopPropagation();
    if (radialId) sim.select(radialId);
    removeSelected();
    hideRadial();
  });

  function hitEndpoint(snap, sx, sy, scale) {
    const tol = 26 * scale;
    let best = null;
    let bestD = tol;
    for (const joint of snap.joints) {
      if (joint.type !== "spring" && joint.type !== "rope" && joint.type !== "distance") continue;
      const ends = [
        [joint.ax, joint.ay, joint.bodyA],
        [joint.bx, joint.by, joint.bodyB]
      ];
      for (const end of ends) {
        const screen = drawLayer.screenFromWorld(end[0], end[1]);
        const distance = Math.hypot(screen.x - sx, screen.y - sy);
        if (distance <= bestD) {
          bestD = distance;
          best = { jointId: joint.id, bodyId: end[2], type: joint.type };
        }
      }
    }
    return best;
  }

  function hitHandle(snap, sx, sy, scale) {
    const body = snap.bodies.find((item) => item.selected);
    if (!body || typeof drawLayer.handleOf !== "function") return null;
    const handle = drawLayer.handleOf(body);
    if (!handle) return null;
    if (Math.hypot(handle.screen.x - sx, handle.screen.y - sy) <= 22 * scale) return body.id;
    return null;
  }

  function angleDelta(next, prev) {
    let delta = next - prev;
    while (delta > Math.PI) delta -= Math.PI * 2;
    while (delta < -Math.PI) delta += Math.PI * 2;
    return delta;
  }

  function pointerWorld(record) {
    return drawLayer.worldFromScreen(record.sx, record.sy);
  }

  function beginGesture(record) {
    const snap = sim.snapshot();
    const moved = Math.hypot(record.sx - record.ox, record.sy - record.oy);
    if (moved < 8 * record.scale) return;
    if (record.handleId) {
      const body = snap.bodies.find((item) => item.id === record.handleId);
      const world = pointerWorld(record);
      gesture = {
        kind: "rotate",
        bodyId: record.handleId,
        cx: body ? body.x : world.x,
        cy: body ? body.y : world.y,
        angle: Math.atan2(world.y - (body ? body.y : world.y), world.x - (body ? body.x : world.x))
      };
      sim.select(record.handleId);
      return;
    }
    if (record.bodyId) {
      const body = snap.bodies.find((item) => item.id === record.bodyId);
      const world = pointerWorld(record);
      const paused = snap.paused || !body || body.isStatic;
      if (paused && body) {
        const ox = body.x - record.downWorld.x;
        const oy = body.y - record.downWorld.y;
        gesture = { kind: "pose", bodyId: record.bodyId, endpoint: record.endpoint, ox, oy };
        sim.setPose(record.bodyId, world.x + ox, world.y + oy, body.angle);
      } else if (body) {
        gesture = { kind: "drag", bodyId: record.bodyId, endpoint: record.endpoint };
        sim.beginDrag(record.bodyId, record.downWorld.x, record.downWorld.y);
        sim.drag(world.x, world.y);
      }
      return;
    }
    gesture = { kind: "pan" };
  }

  function startTwoFinger() {
    const pts = [...pointers.values()];
    if (pts.length < 2) return;
    if (gesture && (gesture.kind === "drag" || gesture.kind === "pose" || gesture.kind === "rotate")) sim.endDrag();
    const shared = pts.find((item) => item.bodyId);
    if (shared && shared.bodyId) {
      const a = pointerWorld(pts[0]);
      const b = pointerWorld(pts[1]);
      gesture = {
        kind: "twist",
        bodyId: shared.bodyId,
        angle: Math.atan2(b.y - a.y, b.x - a.x)
      };
      sim.select(shared.bodyId);
      return;
    }
    gesture = {
      kind: "pinch",
      dist: Math.hypot(pts[1].sx - pts[0].sx, pts[1].sy - pts[0].sy) || 1,
      cx: (pts[0].sx + pts[1].sx) / 2,
      cy: (pts[0].sy + pts[1].sy) / 2
    };
  }

  canvas.addEventListener("pointerdown", (event) => {
    if (tileGesture) return;
    try { canvas.setPointerCapture(event.pointerId); } catch (e) { /* synthetic pointers have no capture */ }
    const pos = canvasPos(event);
    const world = drawLayer.worldFromScreen(pos.sx, pos.sy);
    const snap = sim.snapshot();
    const handleId = hitHandle(snap, pos.sx, pos.sy, pos.scale);
    const endpoint = handleId ? null : hitEndpoint(snap, pos.sx, pos.sy, pos.scale);
    const bodyId = handleId || (endpoint && endpoint.bodyId) || hitBody(snap.bodies, world.x, world.y);
    pointers.set(event.pointerId, {
      sx: pos.sx,
      sy: pos.sy,
      ox: pos.sx,
      oy: pos.sy,
      lx: pos.sx,
      ly: pos.sy,
      scale: pos.scale,
      bodyId,
      handleId,
      endpoint,
      downWorld: world
    });
    hideRadial();
    if (pointers.size >= 2) startTwoFinger();
    else {
      gesture = {
        kind: "pending",
        pointerId: event.pointerId,
        bodyId,
        handleId,
        endpoint
      };
    }
  });

  canvas.addEventListener("pointermove", (event) => {
    const record = pointers.get(event.pointerId);
    if (!record) return;
    const pos = canvasPos(event);
    record.sx = pos.sx;
    record.sy = pos.sy;
    if (!gesture) return;
    if (gesture.kind === "pending" && gesture.pointerId === event.pointerId) beginGesture(record);
    if (!gesture || gesture.kind === "pending") return;
    if (gesture.kind === "pan") {
      drawLayer.panBy(pos.sx - record.lx, pos.sy - record.ly);
    } else if (gesture.kind === "drag") {
      const world = pointerWorld(record);
      sim.drag(world.x, world.y);
    } else if (gesture.kind === "pose") {
      const body = sim.snapshot().bodies.find((item) => item.id === gesture.bodyId);
      const world = pointerWorld(record);
      if (body) sim.setPose(gesture.bodyId, world.x + gesture.ox, world.y + gesture.oy, body.angle);
    } else if (gesture.kind === "rotate") {
      const world = pointerWorld(record);
      const angle = Math.atan2(world.y - gesture.cy, world.x - gesture.cx);
      sim.rotateBy(gesture.bodyId, angleDelta(angle, gesture.angle));
      gesture.angle = angle;
    } else if (gesture.kind === "twist") {
      const pts = [...pointers.values()];
      if (pts.length >= 2) {
        const a = pointerWorld(pts[0]);
        const b = pointerWorld(pts[1]);
        const angle = Math.atan2(b.y - a.y, b.x - a.x);
        sim.rotateBy(gesture.bodyId, angleDelta(angle, gesture.angle));
        gesture.angle = angle;
      }
    } else if (gesture.kind === "pinch") {
      const pts = [...pointers.values()];
      if (pts.length >= 2) {
        const dist = Math.hypot(pts[1].sx - pts[0].sx, pts[1].sy - pts[0].sy) || 1;
        const cx = (pts[0].sx + pts[1].sx) / 2;
        const cy = (pts[0].sy + pts[1].sy) / 2;
        drawLayer.zoomAt(gesture.cx, gesture.cy, dist / gesture.dist);
        drawLayer.panBy(cx - gesture.cx, cy - gesture.cy);
        gesture.dist = dist;
        gesture.cx = cx;
        gesture.cy = cy;
      }
    }
    record.lx = pos.sx;
    record.ly = pos.sy;
  });

  function finishPointer(event) {
    if (!pointers.has(event.pointerId)) return;
    pointers.delete(event.pointerId);
    if (pointers.size >= 2) return;
    if (pointers.size === 1 && gesture && (gesture.kind === "pinch" || gesture.kind === "twist")) {
      sim.endDrag();
      gesture = { kind: "ignore" };
      return;
    }
    if (pointers.size > 0) return;
    const done = gesture;
    gesture = null;
    if (!done || done.kind === "ignore") return;
    if (done.kind === "pending") {
      if (done.bodyId) {
        sim.select(done.bodyId);
        showRadial(done.bodyId);
        publish("select");
      } else {
        sim.select(null);
        publish("select");
      }
      return;
    }
    if (done.kind === "pose" && done.endpoint) {
      const snap = sim.snapshot();
      if (snap.paused || done.endpoint.type !== "spring") sim.stretchJoint(done.endpoint.jointId, true);
    }
    if (done.kind === "drag" || done.kind === "pose" || done.kind === "rotate" || done.kind === "twist") {
      sim.endDrag();
      const body = sim.snapshot().bodies.find((item) => item.id === done.bodyId);
      if (body && !body.isStatic && !sim.snapshot().paused) drawLayer.setFollow(body.id);
      publish("change");
    }
  }

  canvas.addEventListener("pointerup", finishPointer);
  canvas.addEventListener("pointercancel", finishPointer);
  canvas.addEventListener("wheel", (event) => {
    event.preventDefault();
    const pos = canvasPos(event);
    const factor = Math.exp(-event.deltaY * 0.0011);
    drawLayer.zoomAt(pos.sx, pos.sy, factor);
  }, { passive: false });

  document.addEventListener("keydown", (event) => {
    const typing = event.target && event.target.closest && event.target.closest("input, textarea, select");
    if (typing) return;
    if (event.code === "Space") {
      event.preventDefault();
      $("pauseBtn").click();
    } else if (event.key === ".") {
      sim.stepOnce();
      publish("step");
    } else if (event.key === "Delete" || event.key === "Backspace") {
      event.preventDefault();
      removeSelected();
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z") {
      event.preventDefault();
      if (event.shiftKey) sim.redo();
      else sim.undo();
      hideRadial();
      publish("change");
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      sim.redo();
      hideRadial();
      publish("change");
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault();
      const result = sim.duplicatePart(sim.selectedId());
      if (!result.ok) say(result.error);
      else publish("change");
    } else if (event.key.toLowerCase() === "r") {
      const id = sim.selectedId();
      const body = sim.snapshot().bodies.find((item) => item.id === id);
      if (!body) return;
      sim.rotateBy(id, Math.PI / 12);
      sim.endDrag();
      publish("change");
    } else if (event.key.toLowerCase() === "g") {
      snapOn = !snapOn;
      sim.setOverlay({ snap: snapOn });
      say(snapOn ? "Snap on." : "Snap off.");
    } else if (event.key === "Escape") {
      hideRadial();
      sim.select(null);
      sim.endDrag();
      gesture = null;
    }
  });

  document.addEventListener("click", (event) => {
    const back = event.target.closest && event.target.closest("[data-study-back]");
    if (!back) return;
    event.preventDefault();
    // The gallery reads board / student / pbreturn from this query and ignores mode.
    forwardStudyQuery(location.search);
    location.href = "study.html" + location.search;
  });

  window.addEventListener("resize", resize);
  window.addEventListener("orientationchange", resize);
  if (window.visualViewport) window.visualViewport.addEventListener("resize", resize);
  resize();
  focusDynamic();
  frameBoth();
  publish("change");
  statusLine.textContent = "";

  let last = performance.now();
  function frame(now) {
    const dt = Math.min(0.05, (now - last) / 1000);
    last = now;
    const steps = sim.advance(dt);
    const snap = publish(steps > 0 ? "step" : "");
    paint(snap);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}
