// Illustrative RBMK lattice. Reads a plain snapshot. Does not import the ODE model
// and does not write reactivity, rod position, or xenon state back to anything.

export const COLS = 40;
export const ROWS = 25;
export const TILES = COLS * ROWS;
export const U235_COUNT = 150;
export const NEUTRON_CAP = 40;
export const COOLDOWN = 0.3;
export const STARTUP_LAMBDA = 0.35;
export const HALF_I_H = 6.6;
export const HALF_XE_H = 9.2;
export const DIRECT_XE = 0.15;
export const REFUEL_SECONDS = 3;

export const COLORS = {
  u235: "#2f6fe0",
  u238: "#d5d3cc",
  fp: "#c46a32",
  xe: "#9b3dff",
  iodine: "#e6d7b8",
  rod: "#141414",
  graphite: "#c8bfae",
  water: "#7eb0d4",
  source: "#ffb43a"
};

export const ILLUSTRATIVE_NOTE =
  "Illustrative neutron population, not to scale. Shown enriched for visibility: 15% U-235. Real RBMK fuel is about 2% U-235. Each icon stands for many atoms. Xe-135 cross section about 2.6 million barns, the largest known. This view does not feed the reactor model.";

const STAGES = ["fast", "intermediate", "thermal"];

export function stageName(stage) {
  return STAGES[Math.max(0, Math.min(2, stage | 0))] || "fast";
}

export function neutronDot(stage) {
  if (stage <= 0) return { radius: 3.2, core: true };
  if (stage === 1) return { radius: 2.4, core: false };
  return { radius: 1.6, core: false };
}

function mulberry32(seed) {
  let a = seed >>> 0;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fissionResult(base, rand) {
  return {
    ...base,
    outcome: "fission",
    neutronDies: true,
    heat: 1,
    emit: rand() < 0.6 ? 2 : 3,
    becomeFp: true,
    poison: rand() < DIRECT_XE ? "Xe" : "I"
  };
}

// Per-encounter table. rand() is uniform in [0, 1).
// Intermediate U-238 is not in the classroom table: 4% capture, no fission.
// Thermal graphite or water no longer slows; the small capture chance remains.
export function resolveEncounter({ stage = 0, kind, poison = null, rand }) {
  const s = stage | 0;
  const r = rand();
  const base = {
    outcome: "scatter",
    neutronDies: false,
    stage: s,
    heat: 0,
    emit: 0,
    clearXe: false,
    becomeFp: false,
    poison: null
  };
  if (kind === "rod") {
    if (r < 0.9) return { ...base, outcome: "absorb", neutronDies: true };
    return base;
  }
  if (poison === "Xe" && s === 2) {
    if (r < 0.7) return { ...base, outcome: "clearXe", neutronDies: true, clearXe: true };
    return base;
  }
  if (kind === "u235" && s === 0) {
    if (r < 0.08) return fissionResult(base, rand);
    if (r < 0.1) return { ...base, outcome: "capture", neutronDies: true };
    return base;
  }
  if (kind === "u238" && s === 0) {
    if (r < 0.02) return fissionResult(base, rand);
    if (r < 0.05) return { ...base, outcome: "capture", neutronDies: true };
    return base;
  }
  if (kind === "u235" && (s === 1 || s === 2)) {
    const absorb = s === 1 ? 0.15 : 0.35;
    if (r < absorb) {
      if (rand() < 0.85) return fissionResult(base, rand);
      return { ...base, outcome: "capture", neutronDies: true };
    }
    return base;
  }
  if (kind === "u238" && s === 2) {
    if (r < 0.05) return { ...base, outcome: "capture", neutronDies: true };
    return base;
  }
  if (kind === "u238" && s === 1) {
    if (r < 0.04) return { ...base, outcome: "capture", neutronDies: true };
    return base;
  }
  if (kind === "graphite" || kind === "water") {
    const pCap = kind === "graphite" ? 0.005 : 0.03;
    if (r < pCap) return { ...base, outcome: "capture", neutronDies: true };
    if (s < 2) return { ...base, outcome: "slow", stage: s + 1 };
    return base;
  }
  return base;
}

function columnKind(c) {
  if (c % 8 === 7) return "rod";
  const mod = c % 5;
  if (mod === 2) return "water";
  if (mod === 1 || mod === 3) return "fuel";
  return "graphite";
}

export function createLattice(seed = 1) {
  const rand = mulberry32(seed || 1);
  const tiles = [];
  const fuelIdx = [];
  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      const slot = columnKind(c);
      let kind = slot === "fuel" ? "u238" : slot;
      const tile = { kind, poison: null, heat: 0, flash: 0, voided: false };
      tiles.push(tile);
      if (slot === "fuel") fuelIdx.push(tiles.length - 1);
    }
  }
  for (let i = fuelIdx.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    const tmp = fuelIdx[i];
    fuelIdx[i] = fuelIdx[j];
    fuelIdx[j] = tmp;
  }
  for (let i = 0; i < U235_COUNT && i < fuelIdx.length; i++) tiles[fuelIdx[i]].kind = "u235";
  const source = { c: 0, r: 12 };
  tiles[source.r * COLS + source.c].kind = "source";
  return {
    cols: COLS,
    rows: ROWS,
    tiles,
    neutrons: [],
    source,
    replaced: 0,
    spent: 0,
    refuelAcc: 0,
    startupAcc: 0,
    macroXe: [],
    rand
  };
}

export function macroXeCount(xenon) {
  const x = Math.max(0, Math.min(3, Number(xenon) || 0));
  return Math.round((x / 3) * 40);
}

function macroXeIndices(lattice, xenon) {
  const n = macroXeCount(xenon);
  if (!n) return [];
  const idx = [];
  for (let i = 0; i < lattice.tiles.length && idx.length < n; i++) {
    const k = lattice.tiles[i].kind;
    if (k === "fp" || k === "u235" || k === "u238") idx.push(i);
  }
  return idx;
}

export function assignVoid(lattice, alpha) {
  const cols = lattice.cols;
  const colHeat = new Array(cols).fill(0);
  const waters = [];
  lattice.tiles.forEach((tile, i) => {
    tile.voided = false;
    if (tile.kind === "u235" || tile.kind === "u238" || tile.kind === "fp") {
      colHeat[i % cols] += tile.heat;
    } else if (tile.kind === "water") waters.push(i);
  });
  const scored = waters.map((i) => {
    const c = i % cols;
    const heat = (colHeat[c] || 0) + (colHeat[c - 1] || 0) + (colHeat[c + 1] || 0);
    return { i, heat };
  });
  scored.sort((a, b) => (b.heat - a.heat) || (a.i - b.i));
  const nVoid = Math.round(Math.max(0, Math.min(1, alpha || 0)) * scored.length);
  for (let k = 0; k < nVoid; k++) lattice.tiles[scored[k].i].voided = true;
  return nVoid;
}

function spawnNeutron(lattice, x, y, stage, speed) {
  if (lattice.neutrons.length >= NEUTRON_CAP) return false;
  const a = lattice.rand() * Math.PI * 2;
  lattice.neutrons.push({
    x, y, stage, cool: COOLDOWN,
    vx: Math.cos(a) * speed,
    vy: Math.sin(a) * speed
  });
  return true;
}

function startupPoisson(lattice, dt) {
  if (lattice.neutrons.length > 2) {
    lattice.startupAcc = 0;
    return;
  }
  lattice.startupAcc += dt;
  const s = lattice.source;
  while (lattice.startupAcc > 0 && lattice.neutrons.length < NEUTRON_CAP) {
    const u = Math.max(1e-9, lattice.rand());
    const wait = -Math.log(u) / STARTUP_LAMBDA;
    if (wait > lattice.startupAcc) break;
    lattice.startupAcc -= wait;
    if (lattice.neutrons.length >= NEUTRON_CAP) break;
    const a = lattice.rand() * Math.PI * 2;
    lattice.neutrons.push({
      x: s.c + 0.5,
      y: s.r + 0.5,
      stage: 0,
      cool: COOLDOWN,
      vx: Math.cos(a) * 5,
      vy: Math.sin(a) * 5,
      fromSource: true
    });
  }
}

function refuelOne(lattice) {
  const fp = [];
  lattice.tiles.forEach((tile, i) => {
    if (tile.kind === "fp") fp.push(i);
  });
  if (!fp.length) return;
  const i = fp[Math.floor(lattice.rand() * fp.length)];
  const tile = lattice.tiles[i];
  tile.kind = lattice.rand() < 0.15 ? "u235" : "u238";
  tile.poison = null;
  tile.heat *= 0.3;
  tile.flash = 0;
  lattice.replaced += 1;
  lattice.spent += 1;
}

export function stepParticles(lattice, snapshot, dt) {
  const snap = snapshot || {};
  const dtRaw = Math.max(0, dt || 0);
  const dtUse = Math.min(0.1, dtRaw);
  const cols = lattice.cols;
  const rows = lattice.rows;
  const tiles = lattice.tiles;
  for (const tile of tiles) {
    if (tile.flash > 0) tile.flash = Math.max(0, tile.flash - dtUse * 3);
  }
  const born = [];
  for (const n of lattice.neutrons) {
    n.x += n.vx * dtUse;
    n.y += n.vy * dtUse;
    if (n.x < 0 || n.x >= cols) {
      n.vx *= -1;
      n.x = Math.max(0, Math.min(cols - 0.001, n.x));
    }
    if (n.y < 0 || n.y >= rows) {
      n.vy *= -1;
      n.y = Math.max(0, Math.min(rows - 0.001, n.y));
    }
    n.cool -= dtUse;
    if (n.cool > 0) continue;
    const c = Math.max(0, Math.min(cols - 1, Math.floor(n.x)));
    const r = Math.max(0, Math.min(rows - 1, Math.floor(n.y)));
    const tile = tiles[r * cols + c];
    let kind = tile.kind;
    if (tile.kind === "rod") {
      const inserted = snap.rod == null ? 0 : snap.rod;
      kind = (r / rows) < inserted ? "rod" : "graphite";
    }
    const res = resolveEncounter({ stage: n.stage, kind, poison: tile.poison, rand: lattice.rand });
    n.cool = COOLDOWN;
    n.stage = res.stage;
    const fuelish = tile.kind === "u235" || tile.kind === "u238" || tile.kind === "fp";
    if (res.heat > 0 && fuelish) {
      tile.heat = Math.min(1, tile.heat + 0.55);
      tile.flash = 1;
    }
    if (res.becomeFp && (tile.kind === "u235" || tile.kind === "u238")) {
      tile.kind = "fp";
      if (!tile.poison) tile.poison = res.poison;
    }
    if (res.clearXe && tile.poison === "Xe") tile.poison = null;
    if (res.neutronDies) n.dead = true;
    else {
      const a = lattice.rand() * Math.PI * 2;
      n.vx = Math.cos(a) * 6;
      n.vy = Math.sin(a) * 6;
    }
    if (res.emit > 0) {
      for (let k = 0; k < res.emit; k++) born.push({ x: c + 0.5, y: r + 0.5 });
    }
  }
  lattice.neutrons = lattice.neutrons.filter((n) => !n.dead);
  for (const b of born) spawnNeutron(lattice, b.x, b.y, 0, 8);
  startupPoisson(lattice, dtUse);
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const tile = tiles[r * cols + c];
      if (tile.heat <= 0 || tile.kind === "water") continue;
      const bleed = tile.heat * 0.15 * dtUse;
      tile.heat = Math.max(0, tile.heat - bleed);
      const waters = [];
      for (const [dc, dr] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nc = c + dc;
        const nr = r + dr;
        if (nc < 0 || nr < 0 || nc >= cols || nr >= rows) continue;
        const w = tiles[nr * cols + nc];
        if (w.kind === "water") waters.push(w);
      }
      if (!waters.length || bleed <= 0) continue;
      const share = bleed / waters.length;
      for (const w of waters) w.heat = Math.min(1, w.heat + share);
    }
  }
  assignVoid(lattice, snap.alpha || 0);
  if (snap.refuel) {
    lattice.refuelAcc += dtRaw;
    while (lattice.refuelAcc >= REFUEL_SECONDS) {
      lattice.refuelAcc -= REFUEL_SECONDS;
      refuelOne(lattice);
    }
  }
  lattice.macroXe = macroXeIndices(lattice, snap.xenon);
  return lattice;
}

export function stepPoisonClock(lattice, dtHours, rand) {
  const roll = rand || lattice.rand;
  const pI = 1 - Math.exp(-Math.LN2 * dtHours / HALF_I_H);
  const pXe = 1 - Math.exp(-Math.LN2 * dtHours / HALF_XE_H);
  for (const tile of lattice.tiles) {
    if (tile.poison === "I") {
      if (roll() < pI) tile.poison = "Xe";
    } else if (tile.poison === "Xe") {
      if (roll() < pXe) tile.poison = null;
    }
  }
  return lattice;
}

export function waterPaint(voided, heat) {
  const pale = Math.max(0, Math.min(1, heat || 0));
  return {
    r: Math.round(120 + pale * 80),
    g: Math.round(168 + pale * 40),
    b: Math.round(214 + pale * 20),
    a: voided ? 0.22 : 0.92
  };
}

export function fuelPaint(kind, heat, poison, showIodine = true) {
  if (poison === "Xe") return { r: 155, g: 48, b: 214 };
  if (poison === "I" && showIodine) return { r: 230, g: 216, b: 184 };
  const h = Math.max(0, Math.min(1, heat || 0));
  if (kind === "fp") return { r: Math.round(176 + h * 50), g: Math.round(92 - h * 30), b: Math.round(42 - h * 10) };
  if (kind === "u235") return { r: Math.round(47 + h * 180), g: Math.round(111 - h * 40), b: Math.round(224 - h * 160) };
  if (kind === "u238") return { r: Math.round(213 - h * 20), g: Math.round(211 - h * 80), b: Math.round(204 - h * 140) };
  if (kind === "source") return { r: 255, g: 180, b: 58 };
  if (kind === "rod") return { r: 20, g: 20, b: 22 };
  return { r: 200, g: 191, b: 174 };
}

export function poissonMeanTrial(lambda, samples, rand) {
  let sum = 0;
  for (let i = 0; i < samples; i++) {
    const L = Math.exp(-lambda);
    let k = 0;
    let p = 1;
    do {
      k += 1;
      p *= rand();
    } while (p > L);
    sum += k - 1;
  }
  return sum / samples;
}
