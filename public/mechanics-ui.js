/**
 * Mechanics Playground page. Wires the simulation to a swappable draw
 * layer and to window.mechanics. The draw layer only receives snapshots.
 */
import { forwardStudyQuery } from "./board-return.js?v=20261022a";
import { createSimulation } from "./mechanics-world.js";
import { createPlaceholderDrawLayer, createSchematicDrawLayer } from "./mechanics-render.js";
import {
  MODES, MODE_ALIASES, GRAVITY_PRESETS, PART_TYPES, JOINT_TYPES, MATERIALS,
  modeFromSearch, buildPreset, defaultPart, parseBuild, hitBody, localPoint,
  readSaves, writeSave, wedgeAngle
} from "./mechanics-physics.js";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (id) => document.getElementById(id);

const mechanics = new EventTarget();
mechanics.state = { bodies: [], joints: [], time: 0, paused: true };
mechanics.createPlaceholderDrawLayer = createPlaceholderDrawLayer;
mechanics.createSchematicDrawLayer = createSchematicDrawLayer;
window.mechanics = mechanics;

const canvas = $("mechanicsCanvas");
let drawLayer = createPlaceholderDrawLayer(canvas, { reducedMotion });
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
    button.textContent = type;
    button.setAttribute("aria-label", "Place " + type);
    button.addEventListener("click", () => {
      tool = { kind: "place", type };
      pendingJoint = null;
      say("Drag on the view to place a " + type + ".");
    });
    partTools.appendChild(button);
  }
  const jointTools = $("jointTools");
  for (const type of JOINT_TYPES) {
    const button = document.createElement("button");
    button.type = "button";
    button.textContent = type;
    button.setAttribute("aria-label", "Connect with " + type);
    button.addEventListener("click", () => {
      tool = { kind: "joint", type };
      pendingJoint = null;
      say("Click the first part, then the second, to add a " + type + ".");
    });
    jointTools.appendChild(button);
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
    $("readout").textContent = describe(snap);
  }

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
