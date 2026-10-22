/**
 * Mechanics Playground page. Wires the simulation to a swappable draw
 * layer and to window.mechanics. The draw layer only receives snapshots.
 */
import { forwardStudyQuery } from "./board-return.js?v=20261022a";
import { createSimulation } from "./mechanics-world.js";
import { createCraftDrawLayer, createPlaceholderDrawLayer, createSchematicDrawLayer } from "./mechanics-render.js";
import {
  MODES, MODE_ALIASES, GRAVITY_PRESETS, PART_TYPES, JOINT_TYPES, MATERIALS,
  modeFromSearch, buildPreset, defaultPart, parseBuild, hitBody, localPoint,
  readSaves, writeSave, wedgeAngle
} from "./mechanics-physics.js";

const PART_LABELS = {
  box: "cardboard box",
  ball: "ball",
  plank: "paper plane",
  wedge: "cardboard ramp",
  ground: "cardboard floor",
  wall: "cardboard wall",
  "pulley-wheel": "button",
  rocket: "rocket"
};

const JOINT_LABELS = {
  revolute: "brad hinge",
  prismatic: "sliding slot",
  distance: "yarn",
  rope: "twine",
  spring: "cardboard coil",
  weld: "tape join",
  wheel: "wheel",
  pulley: "pulley string"
};

const svg = (body) => '<svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">' + body + "</svg>";

const PART_ICONS = {
  box: svg('<path d="M4 8h12v10H4z"/><path d="M4 8l3-3h12v10l-3 3"/><path d="M16 5v10M7 8v10"/><path d="M4 15h3l2 2"/>'),
  ball: svg('<circle cx="12" cy="12" r="6.5"/><path d="M8 10c1.2 1 2 .4 3.2 1.2M13 14c1 .8 2 .2 3 1"/>'),
  plank: svg('<path d="M3 13.5 12 6l9 7.5-9 3.2z"/><path d="M12 6v10.7M3 13.5l9 3.2 9-3.2"/>'),
  wedge: svg('<path d="M4 18h16L4 8z"/><path d="M4 14h6"/>'),
  ground: svg('<path d="M3 10h18v5H3z"/><path d="M3 12.5h18"/>'),
  wall: svg('<path d="M8 3h8v18H8z"/><path d="M8 8h8M8 13h8"/>'),
  "pulley-wheel": svg('<circle cx="12" cy="12" r="7"/><circle cx="12" cy="8.2" r="1.1" fill="currentColor" stroke="none"/><circle cx="15.8" cy="12" r="1.1" fill="currentColor" stroke="none"/><circle cx="12" cy="15.8" r="1.1" fill="currentColor" stroke="none"/><circle cx="8.2" cy="12" r="1.1" fill="currentColor" stroke="none"/>'),
  rocket: svg('<path d="M12 3c2.2 2.4 3 5.2 3 8.2V16H9v-4.8C9 8.2 9.8 5.4 12 3z"/><path d="M9 14c-2 .4-3 2-3 3.5h3M15 14c2 .4 3 2 3 3.5h-3"/><path d="M10.2 19.5c.4 1.2.8 1.6 1.8 1.6s1.4-.4 1.8-1.6"/>')
};

const JOINT_ICONS = {
  revolute: svg('<circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="1.6" fill="currentColor" stroke="none"/>'),
  prismatic: svg('<path d="M4 8h16v8H4z"/><path d="M8 12h8M14 10l2 2-2 2M10 10l-2 2 2 2"/>'),
  distance: svg('<path d="M4 15c2-4 4-4 6 0s4 4 6 0 2-2 4 0"/><circle cx="5" cy="14" r="1.4"/>'),
  rope: svg('<path d="M5 6c4 2 3 4 7 4s3-2 7-4"/><path d="M5 12c4 2 3 4 7 4s3-2 7-4"/><path d="M5 18c4-2 3-4 7-4s3 2 7 4"/>'),
  spring: svg('<path d="M5 5h4l2 4 2-4h2l2 4 2-4h2"/><path d="M7 9v10M17 9v10"/><path d="M7 19h10"/>'),
  weld: svg('<path d="M3 9h7v6H3zM14 9h7v6h-7z"/><path d="M8 10.5h8v3H8z"/>'),
  wheel: svg('<path d="M12 3v6"/><circle cx="12" cy="15" r="5"/><circle cx="12" cy="15" r="1.3" fill="currentColor" stroke="none"/>'),
  pulley: svg('<circle cx="7" cy="8" r="3"/><circle cx="17" cy="8" r="3"/><path d="M7 11v7M17 11v7M7 18h10"/>')
};

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

const planckApi = window.planck;
const statusLine = $("statusLine");
if (!planckApi || typeof planckApi.World !== "function") {
  statusLine.textContent = "The physics engine did not load.";
} else {
  boot(planckApi);
}

function boot(planckApi) {
  const mode = modeFromSearch(location.search);
  const sim = createSimulation(planckApi, buildPreset(mode));
  sim.setPaused(reducedMotion);
  let tool = { kind: "select", type: "box" };
  let pendingJoint = null;
  let rulerPoint = null;
  let filledFor = null;
  let writingForm = false;

  function focusDynamic() {
    const body = sim.snapshot().bodies.find((item) => !item.isStatic);
    if (body) sim.select(body.id);
    filledFor = null;
  }

  const modeSelect = $("modeSelect");
  for (const entry of MODES) {
    const option = document.createElement("option");
    option.value = entry.id;
    option.textContent = entry.label;
    modeSelect.appendChild(option);
  }
  modeSelect.value = MODE_ALIASES[mode] || "sandbox";

  const partTools = $("partTools");
  for (const type of PART_TYPES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-tool";
    button.dataset.type = type;
    button.innerHTML = PART_ICONS[type];
    button.title = PART_LABELS[type];
    button.setAttribute("aria-label", "Place a " + PART_LABELS[type]);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      tool = { kind: "place", type };
      pendingJoint = null;
      markTools();
      say("Drag on the view to place a " + PART_LABELS[type] + ".");
    });
    partTools.appendChild(button);
  }
  const jointTools = $("jointTools");
  for (const type of JOINT_TYPES) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "icon-tool";
    button.dataset.type = type;
    button.innerHTML = JOINT_ICONS[type];
    button.title = JOINT_LABELS[type];
    button.setAttribute("aria-label", "Connect with " + JOINT_LABELS[type]);
    button.setAttribute("aria-pressed", "false");
    button.addEventListener("click", () => {
      tool = { kind: "joint", type };
      pendingJoint = null;
      markTools();
      say("Click the first part, then the second, to add " + JOINT_LABELS[type] + ".");
    });
    jointTools.appendChild(button);
  }

  function markTools() {
    document.querySelectorAll("#partTools button").forEach((button) => {
      const on = tool.kind === "place" && button.dataset.type === tool.type;
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
    document.querySelectorAll("#jointTools button").forEach((button) => {
      const on = tool.kind === "joint" && button.dataset.type === tool.type;
      button.setAttribute("aria-pressed", on ? "true" : "false");
    });
    $("rulerBtn").setAttribute("aria-pressed", tool.kind === "ruler" ? "true" : "false");
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

  function say(text) {
    statusLine.textContent = text;
  }

  function resize() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    canvas.width = Math.max(2, Math.round(rect.width * dpr));
    canvas.height = Math.max(2, Math.round(rect.height * dpr));
  }

  function worldPoint(event) {
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    return drawLayer.worldFromScreen(x, y);
  }

  function refreshSaves() {
    const list = $("saveList");
    const saves = readSaves(safeStorage());
    list.replaceChildren();
    const names = Object.keys(saves);
    if (!names.length) {
      const option = document.createElement("option");
      option.textContent = "No saves yet";
      option.value = "";
      list.appendChild(option);
      return;
    }
    for (const name of names) {
      const option = document.createElement("option");
      option.value = name;
      option.textContent = name;
      list.appendChild(option);
    }
  }

  function safeStorage() {
    try {
      const key = "__mp";
      localStorage.setItem(key, "1");
      localStorage.removeItem(key);
      return localStorage;
    } catch (e) {
      return { getItem() { return null; }, setItem() {} };
    }
  }

  function fillForm(snap) {
    if (writingForm) return;
    if (snap.selectedId === filledFor) return;
    filledFor = snap.selectedId;
    const body = snap.bodies.find((item) => item.id === snap.selectedId);
    const joint = snap.joints.find((item) => item.id === snap.selectedId);
    writingForm = true;
    if (body) {
      $("selectionLabel").textContent = body.type + " " + body.id;
      $("massInput").value = round(body.mass);
      $("materialInput").value = MATERIALS[body.material] ? body.material : "custom";
      $("frictionInput").value = round(body.friction);
      $("restitutionInput").value = round(body.restitution);
      $("thrustInput").value = round(body.thrust);
      $("thrustOn").checked = !!body.thrustOn;
      $("rampInput").value = body.shape === "polygon" ? String(Math.round(wedgeAngle(body) * 180 / Math.PI)) : "";
    } else if (joint) {
      $("selectionLabel").textContent = joint.type + " " + joint.id + "  tension " + joint.tension.toFixed(2) + " N";
      $("stiffnessInput").value = round(joint.stiffness);
      $("dampingInput").value = round(joint.damping);
      $("motorSpeedInput").value = round(joint.motorSpeed);
      $("motorOn").checked = !!joint.motor;
    } else {
      $("selectionLabel").textContent = "Nothing selected.";
    }
    writingForm = false;
  }

  function round(value) {
    return Number.isFinite(value) ? String(Math.round(value * 1000) / 1000) : "";
  }

  function describe(snap) {
    const energy = snap.energy;
    const selected = snap.joints.find((joint) => joint.selected);
    const tension = selected ? " · " + selected.type + " " + selected.tension.toFixed(2) + " N" : "";
    const watch = snap.stopwatch.running || snap.stopwatch.elapsed
      ? " · watch " + snap.stopwatch.elapsed.toFixed(2) + " s"
      : "";
    const ruler = snap.ruler ? " · ruler " + snap.ruler.distance.toFixed(3) + " m" : "";
    return [
      snap.mode,
      "t " + snap.time.toFixed(2) + " s",
      snap.bodies.length + " parts",
      "KE " + energy.kinetic.toFixed(2) + " J",
      "PE " + energy.gravitational.toFixed(2) + " J",
      "spring " + energy.spring.toFixed(2) + " J",
      "thermal " + energy.thermal.toFixed(2) + " J"
    ].join(" · ") + tension + watch + ruler;
  }

  function paint(snap) {
    drawLayer.draw(snap);
    $("pauseBtn").textContent = snap.paused ? "Play" : "Pause";
    $("pauseBtn").setAttribute("aria-pressed", snap.paused ? "false" : "true");
    if (document.activeElement !== $("gravityRange")) $("gravityRange").value = String(snap.gravity);
    fillForm(snap);
    const text = describe(snap);
    $("readout").textContent = text;
    const energy = snap.energy;
    $("meterTime").textContent = snap.time.toFixed(2) + " s";
    $("meterKe").textContent = energy.kinetic.toFixed(2) + " J";
    $("meterPe").textContent = energy.gravitational.toFixed(2) + " J";
    $("meterSpring").textContent = energy.spring.toFixed(2) + " J";
    $("meterHeat").textContent = energy.thermal.toFixed(2) + " J";
    $("meterWatch").textContent = snap.stopwatch.elapsed.toFixed(2) + " s";
  }

  function showLayer(layer, button) {
    mechanics.setDrawLayer(layer);
    $("craftViewBtn").setAttribute("aria-pressed", button === "craft" ? "true" : "false");
    $("schematicViewBtn").setAttribute("aria-pressed", button === "schematic" ? "true" : "false");
    paint(sim.snapshot());
  }

  $("craftViewBtn").addEventListener("click", () => showLayer(craftLayer, "craft"));
  $("schematicViewBtn").addEventListener("click", () => showLayer(schematicLayer, "schematic"));
  $("pauseBtn").addEventListener("click", () => {
    const paused = !sim.snapshot().paused;
    sim.setPaused(paused);
    publish(paused ? "pause" : "play");
  });
  $("stepBtn").addEventListener("click", () => {
    sim.stepOnce();
    publish("step");
  });
  $("resetBtn").addEventListener("click", () => {
    sim.reset();
    filledFor = null;
    publish("reset");
  });
  $("controlsJumpBtn").addEventListener("click", () => {
    $("controls").scrollIntoView({ block: "start" });
    modeSelect.focus();
  });
  modeSelect.addEventListener("change", () => {
    const next = MODE_ALIASES[modeSelect.value] || "sandbox";
    const url = new URL(location.href);
    url.searchParams.set("mode", next);
    history.replaceState(null, "", url);
    sim.load(buildPreset(next));
    sim.setPaused(reducedMotion);
    focusDynamic();
    publish("change");
  });
  document.querySelectorAll("[data-speed]").forEach((button) => {
    button.addEventListener("click", () => {
      sim.setTimeScale(Number(button.getAttribute("data-speed")));
      document.querySelectorAll("[data-speed]").forEach((other) => {
        other.setAttribute("aria-pressed", other === button ? "true" : "false");
      });
    });
  });
  $("gravityPreset").addEventListener("change", () => {
    const preset = GRAVITY_PRESETS.find((item) => item.id === $("gravityPreset").value);
    if (!preset) return;
    sim.setGravity(preset.g);
    publish("change");
  });
  $("gravityRange").addEventListener("input", () => {
    sim.setGravity(Number($("gravityRange").value));
  });
  $("airDrag").addEventListener("change", () => sim.setAirDrag($("airDrag").checked));
  $("defriction").addEventListener("change", () => sim.setDefriction($("defriction").checked));
  $("showVectors").addEventListener("change", () => sim.setOverlay({ showVectors: $("showVectors").checked }));
  $("showFbd").addEventListener("change", () => sim.setOverlay({ showFbd: $("showFbd").checked }));
  $("showTrails").addEventListener("change", () => sim.setOverlay({ showTrails: $("showTrails").checked }));
  $("snap").addEventListener("change", () => sim.setOverlay({ snap: $("snap").checked }));

  function editSelected(patch, jointPatch) {
    const id = sim.selectedId();
    if (!id) return;
    const snap = sim.snapshot();
    if (snap.bodies.some((body) => body.id === id) && patch) {
      const result = sim.updatePart(id, patch);
      if (!result.ok) say(result.error);
    } else if (jointPatch) {
      const result = sim.updateJoint(id, jointPatch);
      if (!result.ok) say(result.error);
    }
    filledFor = null;
    publish("change");
  }

  $("massInput").addEventListener("change", () => editSelected({ mass: Number($("massInput").value) }));
  $("materialInput").addEventListener("change", () => editSelected({ material: $("materialInput").value }));
  $("frictionInput").addEventListener("change", () => editSelected({ friction: Number($("frictionInput").value), material: "custom" }));
  $("restitutionInput").addEventListener("change", () => editSelected({ restitution: Number($("restitutionInput").value), material: "custom" }));
  $("thrustInput").addEventListener("change", () => editSelected({ thrust: Number($("thrustInput").value) }));
  $("thrustOn").addEventListener("change", () => editSelected({ thrustOn: $("thrustOn").checked }));
  $("rampInput").addEventListener("change", () => {
    const snap = sim.snapshot();
    const body = snap.bodies.find((item) => item.id === sim.selectedId());
    if (!body || body.shape !== "polygon") return;
    const degrees = Number($("rampInput").value) * Math.PI / 180;
    editSelected({ rise: body.run * Math.tan(degrees) });
  });
  $("stiffnessInput").addEventListener("change", () => editSelected(null, { stiffness: Number($("stiffnessInput").value) }));
  $("dampingInput").addEventListener("change", () => editSelected(null, { damping: Number($("dampingInput").value) }));
  $("motorSpeedInput").addEventListener("change", () => editSelected(null, { motorSpeed: Number($("motorSpeedInput").value) }));
  $("motorOn").addEventListener("change", () => editSelected(null, { motor: $("motorOn").checked }));

  $("deleteBtn").addEventListener("click", () => removeSelected());
  $("duplicateBtn").addEventListener("click", () => {
    const result = sim.duplicatePart(sim.selectedId());
    if (!result.ok) say(result.error);
    else publish("change");
  });
  $("rotateBtn").addEventListener("click", () => {
    const snap = sim.snapshot();
    const body = snap.bodies.find((item) => item.id === sim.selectedId());
    if (!body) return;
    editSelected({ angle: body.angle + Math.PI / 12 });
  });
  $("growBtn").addEventListener("click", () => scaleSelected(1.1));
  $("shrinkBtn").addEventListener("click", () => scaleSelected(1 / 1.1));
  $("undoBtn").addEventListener("click", () => { if (sim.undo()) { filledFor = null; publish("change"); } });
  $("redoBtn").addEventListener("click", () => { if (sim.redo()) { filledFor = null; publish("change"); } });

  function scaleSelected(factor) {
    const snap = sim.snapshot();
    const body = snap.bodies.find((item) => item.id === sim.selectedId());
    if (!body) return;
    const patch = {};
    if (body.width) patch.width = body.width * factor;
    if (body.height) patch.height = body.height * factor;
    if (body.radius) patch.radius = body.radius * factor;
    if (body.run) patch.run = body.run * factor;
    if (body.rise) patch.rise = body.rise * factor;
    editSelected(patch);
  }

  function removeSelected() {
    const id = sim.selectedId();
    if (!id) return;
    const snap = sim.snapshot();
    const result = snap.joints.some((joint) => joint.id === id) ? sim.removeJoint(id) : sim.removePart(id);
    if (!result.ok) say(result.error);
    else { filledFor = null; publish("change"); }
  }

  $("watchBtn").addEventListener("click", () => {
    const running = !sim.snapshot().stopwatch.running;
    sim.setStopwatch(running);
    $("watchBtn").textContent = running ? "Stop stopwatch" : "Start stopwatch";
  });
  $("watchResetBtn").addEventListener("click", () => {
    sim.resetStopwatch();
    $("watchBtn").textContent = "Start stopwatch";
  });
  $("rulerBtn").addEventListener("click", () => {
    tool = { kind: "ruler" };
    rulerPoint = null;
    markTools();
    say("Click the first ruler mark, then the second.");
  });

  $("saveBtn").addEventListener("click", () => {
    const result = writeSave(safeStorage(), $("saveName").value, sim.document());
    say(result.ok ? "Saved “" + result.name + "” on this device." : result.error);
    refreshSaves();
  });
  $("loadBtn").addEventListener("click", () => {
    const name = $("saveList").value;
    const doc = readSaves(safeStorage())[name];
    if (!doc) { say("Pick a saved build."); return; }
    sim.load(doc);
    modeSelect.value = doc.mode;
    filledFor = null;
    publish("change");
  });
  $("exportBtn").addEventListener("click", () => {
    const blob = new Blob([JSON.stringify(sim.document(), null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = "mechanics-build.json";
    link.click();
    URL.revokeObjectURL(link.href);
  });
  $("importFile").addEventListener("change", async () => {
    const file = $("importFile").files && $("importFile").files[0];
    if (!file) return;
    const parsed = parseBuild(await file.text());
    if (!parsed) { say("That file is not a playground build."); return; }
    sim.load(parsed);
    modeSelect.value = parsed.mode;
    filledFor = null;
    publish("change");
  });

  canvas.addEventListener("pointerdown", (event) => {
    canvas.setPointerCapture(event.pointerId);
    const point = worldPoint(event);
    const snap = sim.snapshot();
    const id = hitBody(snap.bodies, point.x, point.y);
    if (tool.kind === "place") {
      const added = sim.addPart(defaultPart(tool.type, point.x, point.y));
      if (!added.ok) { say(added.error); return; }
      sim.beginDrag(added.id, point.x, point.y);
      publish("change");
      return;
    }
    if (tool.kind === "ruler") {
      if (!rulerPoint) {
        rulerPoint = point;
        say("Click the second ruler mark.");
      } else {
        sim.setRuler(rulerPoint.x, rulerPoint.y, point.x, point.y);
        rulerPoint = null;
        tool = { kind: "select" };
        markTools();
      }
      return;
    }
    if (tool.kind === "joint") {
      if (!id) return;
      const body = snap.bodies.find((item) => item.id === id);
      const anchor = localPoint(body, point.x, point.y);
      if (!pendingJoint) {
        pendingJoint = { bodyId: id, anchor };
        say("Now click the second part.");
        return;
      }
      const result = sim.addJoint({
        type: tool.type,
        bodyA: pendingJoint.bodyId,
        bodyB: id,
        anchorA: pendingJoint.anchor,
        anchorB: anchor
      });
      pendingJoint = null;
      say(result.ok ? "Joint added." : result.error);
      if (result.ok) publish("change");
      return;
    }
    if (!id) {
      sim.select(null);
      sim.endDrag();
      publish("select");
      return;
    }
    const body = snap.bodies.find((item) => item.id === id);
    if (body.isStatic) {
      sim.select(id);
      publish("select");
      return;
    }
    sim.beginDrag(id, point.x, point.y);
    publish("select");
  });
  canvas.addEventListener("pointermove", (event) => {
    if (!event.buttons && event.pointerType !== "touch") return;
    const point = worldPoint(event);
    sim.drag(point.x, point.y);
  });
  canvas.addEventListener("pointerup", () => {
    sim.endDrag();
    publish("change");
  });
  canvas.addEventListener("pointercancel", () => sim.endDrag());

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
      filledFor = null;
      publish("change");
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "y") {
      event.preventDefault();
      sim.redo();
      filledFor = null;
      publish("change");
    } else if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "d") {
      event.preventDefault();
      $("duplicateBtn").click();
    } else if (event.key.toLowerCase() === "r") {
      $("rotateBtn").click();
    } else if (event.key.toLowerCase() === "g") {
      $("snap").checked = !$("snap").checked;
      sim.setOverlay({ snap: $("snap").checked });
    } else if (event.key === "Escape") {
      tool = { kind: "select" };
      pendingJoint = null;
      rulerPoint = null;
      markTools();
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
  resize();
  refreshSaves();
  focusDynamic();
  publish("change");

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
