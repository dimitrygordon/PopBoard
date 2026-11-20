export function keplerAnomaly(M, e) {
  let E = M;
  for (let i = 0; i < 14; i++) {
    const dE = (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-12) break;
  }
  return E;
}

export function keplerPosition(a, e, t, period, scale = 1) {
  const P = Math.max(1e-6, period);
  const M = (((t / P) % 1) + 1) % 1 * Math.PI * 2;
  const E = keplerAnomaly(M, Math.max(0, Math.min(0.999999, e || 0)));
  const x = a * (Math.cos(E) - e);
  const y = a * Math.sqrt(Math.max(0, 1 - e * e)) * Math.sin(E);
  return { x: x * scale, y: y * scale, z: 0 };
}

export function visualKeplerPeriod(realSeconds, { earthVis = 18, cap = 64 } = {}) {
  const earthP = 365.25 * 86400;
  const real = Number(realSeconds);
  const vis = Number.isFinite(real) && real > 0 ? earthVis * (real / earthP) : earthVis;
  return Math.min(cap, Math.max(8, vis));
}

export function visualSatPeriod(rOverR, { issVis = 16, cap = 90 } = {}) {
  const r = Math.max(1.001, rOverR);
  const vis = issVis * Math.pow(r / 1.06, 1.5);
  return Math.min(cap, Math.max(10, vis));
}
