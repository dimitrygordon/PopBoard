// Pure VR layout for the Spaceships lab. No three.js here so node tests can import it.
// The headset session in ss-vr.js uses these numbers and the same GLB the on-screen viewer loads.

export const MODE_LINE = "3D on this screen, AR in your space, or VR on a Meta Quest.";
export const VR_BUTTON_LABEL = "View in VR";
export const VR_NOTE = "VR needs a Meta Quest.";
export const VR_FAIL = "The headset did not open. 3D on this page still works.";
export const VR_HINT = "Grip turns the model. Thumbstick turns and scales. Trigger resets.";

// Longest side in the classroom view, and the longest side real size is allowed to reach.
// A Saturn V or the ISS stays in the room. A wrench can still be shown at true size.
export const COMFORT_SPAN_M = 0.85;
export const REAL_CAP_M = 2.5;
export const VIEW_DISTANCE_M = 1.45;
export const SCALE_MIN = 0.35;
export const SCALE_MAX = 3;
export const STICK_DEAD = 0.18;

export function immersiveVrSupported(xr) {
  const api = xr === undefined && typeof navigator !== "undefined" ? navigator.xr : xr;
  if (!api || typeof api.isSessionSupported !== "function") return Promise.resolve(false);
  return Promise.resolve()
    .then(() => api.isSessionSupported("immersive-vr"))
    .then((ok) => ok === true)
    .catch(() => false);
}

// Hidden when this browser cannot open immersive-vr. The note stays so the mode is explained.
export function vrControlState(supported) {
  if (supported) return { buttonHidden: false, disabled: false, noteHidden: true, note: "" };
  return { buttonHidden: true, disabled: true, noteHidden: false, note: VR_NOTE };
}

export function viewScale(spanMeters, real) {
  const span = Number(spanMeters);
  const safe = Number.isFinite(span) && span > 1e-6 ? span : 1;
  if (!real) {
    return { scale: COMFORT_SPAN_M / safe, capped: false, mode: "classroom", label: "Classroom scale" };
  }
  if (safe <= REAL_CAP_M) {
    return { scale: 1, capped: false, mode: "real", label: "Real size" };
  }
  return {
    scale: REAL_CAP_M / safe,
    capped: true,
    mode: "capped",
    label: "Real size, capped at " + REAL_CAP_M + " m",
  };
}

// userScale multiplies viewScale. The product never grows the craft past REAL_CAP_M.
export function userScaleLimit(displayedSpan) {
  const shown = Number(displayedSpan);
  const safe = Number.isFinite(shown) && shown > 1e-6 ? shown : COMFORT_SPAN_M;
  return Math.min(SCALE_MAX, REAL_CAP_M / safe);
}

export function clampScale(userScale, limit) {
  const cap = Number.isFinite(limit) && limit > 0 ? Math.min(SCALE_MAX, limit) : SCALE_MAX;
  const s = Number(userScale);
  if (!Number.isFinite(s)) return 1;
  return Math.min(cap, Math.max(SCALE_MIN, s));
}

// Quest thumbstick: x right is positive, y down is positive. Up grows the model. Deadzone holds still.
export function stickDelta(stickX, stickY, dt, opt = {}) {
  const dead = opt.dead ?? STICK_DEAD;
  const yawRate = opt.yawRate ?? 1.5;
  const scaleRate = opt.scaleRate ?? 0.65;
  const step = Number.isFinite(dt) && dt > 0 ? Math.min(dt, 0.05) : 0;
  const x = Number(stickX) || 0;
  const y = Number(stickY) || 0;
  if (step === 0) return { yaw: 0, scale: 1 };
  let yaw = 0;
  let scale = 1;
  if (Math.abs(x) > dead) yaw = -x * yawRate * step;
  if (Math.abs(y) > dead) scale = Math.exp(-y * scaleRate * step);
  return { yaw, scale };
}

export function shortFact(craft, max = 180) {
  const facts = (craft && craft.facts) || [];
  const row = facts.find((f) => f.label === "Fun fact")
    || facts.find((f) => f.label === "About")
    || facts[0];
  if (!row || !row.value) return "";
  const text = String(row.value).replace(/\s+/g, " ").trim();
  if (text.length <= max) return text;
  const cut = text.slice(0, max - 3);
  const sp = cut.lastIndexOf(" ");
  return (sp > 40 ? cut.slice(0, sp) : cut).trim() + "...";
}

export function realSizeFact(craft) {
  const row = ((craft && craft.facts) || []).find((f) => f.label === "Real size");
  return row && row.value ? String(row.value).replace(/\s+/g, " ").trim() : "";
}
