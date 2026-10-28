// Black Hole Explorer: number formatting for readouts. Pure, no DOM.
// Formatting never rounds a value across a unit boundary in a way that
// changes it by more than the last printed digit.

export function fmtNum(x, sig = 3) {
  if (x == null || !isFinite(x)) return "none";
  const ax = Math.abs(x);
  if (ax !== 0 && (ax >= 1e6 || ax < 1e-3)) return sci(x, sig);
  return Number(x.toPrecision(sig)).toLocaleString("en-US", { maximumFractionDigits: 6 });
}
export function sci(x, sig = 3) {
  const e = Math.floor(Math.log10(Math.abs(x)));
  const m = x / Math.pow(10, e);
  const sup = String(e).split("").map((c) => "\u207b\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079"["-0123456789".indexOf(c)]).join("");
  return Number(m.toPrecision(sig)) + " \u00d7 10" + sup;
}
export function fmtLen(m) {
  const AU = 1.495978707e11;
  if (m < 1000) return fmtNum(m) + " m";
  if (m < 1e8) return fmtNum(m / 1000) + " km";
  return fmtNum(m / AU) + " AU";
}
export function fmtTime(s) {
  if (s == null) return "none";
  if (s < 1) return fmtNum(s * 1000) + " ms";
  if (s < 120) return fmtNum(s) + " s";
  if (s < 7200) return fmtNum(s / 60) + " min";
  if (s < 172800) return fmtNum(s / 3600) + " h";
  return fmtNum(s / 86400) + " days";
}
export function fmtMass(msun) {
  if (msun >= 1e9) return fmtNum(msun / 1e9) + " billion Msun";
  if (msun >= 1e6) return fmtNum(msun / 1e6) + " million Msun";
  return fmtNum(msun) + " Msun";
}
export function fmtPct(f) { return fmtNum(f * 100) + "%"; }
export function fmtG(g) { return fmtNum(g) + " g"; }
export function fmtAngle(rad) {
  const deg = (rad * 180) / Math.PI;
  if (deg >= 1) return fmtNum(deg) + "\u00b0";
  return fmtNum(deg * 3600) + " arcsec";
}
