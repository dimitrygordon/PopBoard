// Night Sky layer registry (design_v1 section 6.3). A layer is
//   { id, init(ctx), update(ctx, dt), setVisible(on), dispose() }
// ctx = { THREE, scene, skyRoot, skyGroup, dateGroup, localGroup, state, catalog, observer, clock, renderer, camera, skin, frame }
// Layers read ctx.state and ctx.frame; they never touch the DOM. Later modules (labs, deep-sky, multiplayer avatars)
// add themselves with registerLayer().
const layers = [];
export function registerLayer(layer) { if (!layers.find((l) => l.id === layer.id)) layers.push(layer); return layer; }
export function getLayer(id) { return layers.find((l) => l.id === id); }
export function allLayers() { return layers.slice(); }
export async function initLayers(ctx) { for (const l of layers) if (!l.ready) { await l.init(ctx); l.ready = true; } }
export function updateLayers(ctx, dt) { for (const l of layers) if (l.ready && l.update) l.update(ctx, dt); }
export function disposeLayers() { for (const l of layers.splice(0)) l.dispose && l.dispose(); }
