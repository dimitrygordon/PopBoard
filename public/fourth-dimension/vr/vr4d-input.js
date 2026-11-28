// Headset ray helpers for the Beyond 3D storybook. No DOM, so node can test them.

// three.js only rebuilds a controller's matrixWorld during render. A select event can land
// before that, so the pose is stale (still at the origin on the first press). Rebuild it,
// then read the ray. Clones, so the second controller cannot overwrite the first's ray.
export function freshRay(THREE, controller) {
  if (!controller) return null;
  controller.updateMatrixWorld(true);
  const origin = new THREE.Vector3().setFromMatrixPosition(controller.matrixWorld);
  const dir = new THREE.Vector3(0, 0, -1).transformDirection(controller.matrixWorld);
  if (dir.lengthSq() < 1e-8) return null;
  return { origin, dir };
}

// Decide what a trigger press does. A hit anywhere on the panel is consumed, so pressing the
// caption text never falls through to the scene behind it.
export function resolveSelect(hit) {
  if (!hit) return { consumed: false, button: null };
  if (hit.id === "panel") return { consumed: true, button: null };
  return { consumed: true, button: hit.id };
}
