// Dark paper: deck ink colors map to the dark palette (cream ink, gold and blue accents); art is never recolored.
export function darkInk(color) {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(color || "").trim());
  if (!m) return null;
  const n = parseInt(m[1], 16), r = n >> 16, g = (n >> 8) & 255, b = n & 255;
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
  if (mx - mn < 40) return mx < 170 ? "var(--pop-ink)" : "var(--pop-mute)";
  if (b > r && b >= g) return "var(--pop-blue)";
  return "var(--pop-gold)";
}
