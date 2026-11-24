// Relative Velocity Exploration: pure 1D Galilean kinematics. No DOM here, so the tests can import it.
// Sign rule: +x is right (downstream, forward). Every velocity is "of A relative to B".
import { CONFIG, FRAMES, MPH_TO_MS, G } from "./rv-config.js";

export { CONFIG, FRAMES, MPH_TO_MS, G };

export const toMs = (mph) => mph * MPH_TO_MS;
export const toMph = (ms) => ms / MPH_TO_MS;

// v(A/ground) = v(A/medium) + v(medium/ground)
export const add = (vObjMedium, vMediumGround) => vObjMedium + vMediumGround;
// v(A/B) = v(A/ground) - v(B/ground)
export const relative = (vA, vB) => vA - vB;

// ---------- river lab ----------
// heading +1 = boat points downstream, -1 = upstream. flow u is the water velocity (downstream +).
export function boatGround(heading, boatSpeed, flow) {
  return add(heading * boatSpeed, flow);
}
// Time to cover the channel length; Infinity when the boat cannot make headway.
export function travelTime(length, vGround, heading) {
  if (heading === 0 || vGround * heading <= 0) return Infinity;
  return length / Math.abs(vGround);
}
export function average(list) {
  const xs = list.filter((t) => Number.isFinite(t) && t > 0);
  if (!xs.length) return NaN;
  return xs.reduce((s, t) => s + t, 0) / xs.length;
}
export function measuredSpeed(length, avgTime) {
  return Number.isFinite(avgTime) && avgTime > 0 ? length / avgTime : NaN;
}
export function percentDiff(predicted, measured) {
  if (!Number.isFinite(predicted) || !Number.isFinite(measured) || measured === 0) return NaN;
  return ((predicted - measured) / measured) * 100;
}

// ---------- truck ----------
export function fallTime(height, g = G) {
  return height > 0 ? Math.sqrt((2 * height) / g) : 0;
}
// Ball after release, ground frame: x grows at the ball's ground velocity, y falls from the release height.
export function ballAfterRelease(t, x0, vx, height, g = G) {
  const tf = fallTime(height, g);
  const tt = Math.min(Math.max(t, 0), tf);
  return { x: x0 + vx * tt, y: Math.max(0, height - 0.5 * g * tt * tt), landed: t >= tf };
}

// ---------- scene velocity tables ----------
// Returns ground velocities (m/s) of every viewer plus the object/medium split used by the readout.
export function sceneVelocities(scene, p) {
  switch (scene) {
    case "river": {
      const objMedium = p.heading * p.boatSpeed;
      const medium = p.flow;
      return {
        objMedium, medium, unit: "ms",
        names: { obj: "boat", medium: "water", ground: "shore" },
        viewers: { shore: 0, leaf: medium, boat: add(objMedium, medium) },
      };
    }
    case "truck": {
      const truck = toMs(p.truckSpeedMph);
      const objMedium = p.released ? p.throwDir * toMs(p.throwSpeedMph) : 0;
      return {
        objMedium, medium: truck, unit: "mph",
        names: { obj: "ball", medium: "truck", ground: "ground" },
        viewers: { ground: 0, truck, ball: add(objMedium, truck) },
      };
    }
    case "walkway": {
      const objMedium = p.walkDir * p.walkSpeed;
      const medium = p.beltSpeed;
      return {
        objMedium, medium, unit: "ms",
        names: { obj: "walker", medium: "belt", ground: "floor" },
        viewers: { floor: 0, belt: medium, walker: add(objMedium, medium) },
      };
    }
    case "kart": {
      const objMedium = toMs(p.kartSpeedMph);
      const medium = p.boostOn ? toMs(p.boostSpeedMph) : 0;
      return {
        objMedium, medium, unit: "mph",
        names: { obj: "kart", medium: "boost lane", ground: "track" },
        viewers: { track: 0, rival: toMs(p.rivalSpeedMph), kart: add(objMedium, medium) },
      };
    }
    default:
      throw new Error("unknown scene " + scene);
  }
}

// Velocities seen by one viewer: subtract the viewer's ground velocity from everything.
export function inFrame(groundVelocities, viewerGround) {
  const out = {};
  for (const [k, v] of Object.entries(groundVelocities)) out[k] = relative(v, viewerGround);
  return out;
}

// The vector-addition readout in the chosen frame:
//   v(obj/viewer) = v(obj/medium) + v(medium/viewer); with viewer = ground this is the textbook line.
export function readout(scene, p, frame) {
  const s = sceneVelocities(scene, p);
  if (!(frame in s.viewers)) throw new Error("unknown frame " + frame);
  const viewer = s.viewers[frame];
  const objGround = add(s.objMedium, s.medium);
  return {
    unit: s.unit,
    names: s.names,
    objMedium: s.objMedium,
    mediumGround: s.medium,
    objGround,
    mediumViewer: relative(s.medium, viewer),
    objViewer: relative(objGround, viewer),
    viewerGround: viewer,
    viewers: inFrame(s.viewers, viewer),
  };
}

// Screen shift so the chosen viewer stays put: draw every world x at x - (xViewer - anchor).
export function frameShift(xViewer, anchor) {
  return xViewer - anchor;
}

export function fmt(v, digits = 2) {
  const r = Math.abs(v) < 0.5 * Math.pow(10, -digits) ? 0 : v;
  return (r < 0 ? "\u2212" : r > 0 ? "+" : "") + Math.abs(r).toFixed(digits);
}
