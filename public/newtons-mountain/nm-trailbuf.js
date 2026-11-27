// Trail point store: up to 4,096 sim-plane points per shot. A point is kept when the ball has moved 0.2 percent of its distance
// from Earth's centre since the last kept point (about 13 km on a low orbit, fine near the muzzle, coarse far away).
// When the buffer fills, every other point is dropped and the spacing doubles, so a long trail stays whole (about 1.4 laps at full
// detail, 20 laps at about 200 km per point). Pure and node-testable.
export class TrailBuffer {
  constructor(max = 4096, f0 = 0.002) { this.max = max; this.f0 = f0; this.reset(); }
  reset() { this.xy = new Float64Array(this.max * 2); this.n = 0; this.f = this.f0; this.lx = 0; this.ly = 0; this.version = 0; this.decimated = 0; }
  /** Returns "none", "append" (one new point at n-1) or "rebuild" (the buffer was thinned, redraw everything). */
  push(x, y, force = false) {
    if (this.n > 0 && !force && Math.hypot(x - this.lx, y - this.ly) < this.f * Math.hypot(x, y)) return "none";
    let out = "append";
    if (this.n === this.max) {
      let k = 0; for (let i = 0; i < this.n; i += 2) { this.xy[2 * k] = this.xy[2 * i]; this.xy[2 * k + 1] = this.xy[2 * i + 1]; k++; }
      this.n = k; this.f *= 2; this.decimated++; out = "rebuild";
    }
    this.xy[2 * this.n] = x; this.xy[2 * this.n + 1] = y; this.n++; this.lx = x; this.ly = y; this.version++;
    return out;
  }
  x(i) { return this.xy[2 * i]; }
  y(i) { return this.xy[2 * i + 1]; }
}
