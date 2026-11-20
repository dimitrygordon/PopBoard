// Shared name map for Orbit Lab and Kepler and Circles.
// File names are the source of truth; do not bake materials or textures.

export const ASSET_MAP_URL = new URL("./asset-map.json", import.meta.url);
export const ASSET_ROOT = new URL("./", import.meta.url);

export const DEFAULT_MAP = {
  models: {
    earth: "models/earth_2k.glb",
    moon: "models/moon_2k.glb",
    mars: "models/mars_2k.glb",
    jupiter: "models/jupiter_2k.glb",
    io: "models/io.glb",
    europa: "models/europa.glb",
    ganymede: "models/ganymede.glb",
    callisto: "models/callisto.glb",
    sun: "models/sun.glb",
    comet: "models/comet.glb",
    stopper: "models/stopper.glb",
    iss: "models/iss.glb",
    hubble: "models/hubble.glb",
    gps: "models/gps.glb",
    geo: "models/geo_comsat.glb",
    cannon: "models/newton_cannon.glb",
    skybox: "models/starmap_2020_4k.jpg",
    skyboxMobile: "models/starmap_2020_2k.jpg"
  }
};

let _map = null;

export async function loadAssetMap() {
  if (_map) return _map;
  try {
    const res = await fetch(ASSET_MAP_URL);
    if (res.ok) {
      _map = await res.json();
      return _map;
    }
  } catch (e) { /* fall through to the baked default */ }
  _map = DEFAULT_MAP;
  return _map;
}

export function preferMobileSkybox() {
  if (typeof matchMedia === "function" && matchMedia("(max-width: 600px)").matches) return true;
  if (typeof innerWidth === "number" && innerWidth <= 600) return true;
  return false;
}

export function assetCandidates(kind, opts = {}) {
  const models = (_map || DEFAULT_MAP).models || DEFAULT_MAP.models;
  const list = [];
  const push = (rel) => { if (rel) list.push(new URL(rel, ASSET_ROOT).href); };
  if (kind === "skybox") {
    const mobile = opts.mobile ?? preferMobileSkybox();
    if (mobile) {
      push(models.skyboxMobile);
      push(models.skybox);
    } else {
      push(models.skybox);
      push(models.skyboxMobile);
    }
  } else if (models[kind]) {
    push(models[kind]);
  }
  return list;
}

export async function firstExisting(urls) {
  for (const url of urls) {
    try {
      const res = await fetch(url, { method: "HEAD" });
      if (res.ok) return url;
    } catch (e) { /* try the next name */ }
  }
  for (const url of urls) {
    try {
      const res = await fetch(url, { headers: { Range: "bytes=0-1" } });
      if (res.ok || res.status === 206) return url;
    } catch (e) { /* skip */ }
  }
  return null;
}
