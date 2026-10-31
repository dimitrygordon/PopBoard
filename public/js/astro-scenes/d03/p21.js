// D03 p21 "Newton's cannonball": a cannon on a (not to scale) mountain fires sideways. Pull the ball
// back from the cannon (or set Launch speed) and release: gravity, the F_g arrow, always points at the
// center of Earth while the velocity arrow stays tangent. Slow lands nearby, faster lands farther, and
// at 7.9 km/s (circular speed near the surface, no air) the ground curves away as fast as the ball
// falls, so it circles forever. Speeds are scaled so 7.9 km/s gives the circle through the cannon.
// Art: Leo's d03-p21 layers.
const ART = "v2/art/";
const C = [433, 773], R = 363, START = [452, 345], V_ORBIT = 7.9, ORBIT_S = 6;
const R0 = Math.hypot(START[0] - C[0], START[1] - C[1]);
const VPX = 2 * Math.PI * R0 / ORBIT_S / V_ORBIT; // page px per second for each km/s
const GM = (V_ORBIT * VPX) ** 2 * R0;
const BLUE = "#24339E", RED = "#B85B5B";
const box = (b) => [b[0] / 16, b[1] / 9, (b[2] - b[0]) / 16, (b[3] - b[1]) / 9];

// integrate a launch at v km/s; returns the path (page px) and whether it orbits
export function flight(v, maxT = ORBIT_S * 1.02, h = 1 / 480) {
  const rx = START[0] - C[0], ry = START[1] - C[1], ux = -ry / R0, uy = rx / R0; // tangent, pointing right at the mountain top
  let x = START[0], y = START[1], vx = ux * v * VPX, vy = uy * v * VPX;
  const acc = (x, y) => { const dx = C[0] - x, dy = C[1] - y, r = Math.hypot(dx, dy); return [GM * dx / r ** 3, GM * dy / r ** 3]; };
  const path = [[x, y, 0]]; let a = acc(x, y), t = 0, landed = false;
  while (t < maxT) {
    vx += a[0] * h / 2; vy += a[1] * h / 2; x += vx * h; y += vy * h; a = acc(x, y); vx += a[0] * h / 2; vy += a[1] * h / 2; t += h;
    path.push([x, y, t]);
    if (Math.hypot(x - C[0], y - C[1]) <= R) { landed = true; break; }
  }
  return { path, landed };
}

export default function build(ctx) {
  const { reducedMotion } = ctx;
  const art = (n, b, o = {}) => ctx.art(ART + n, { box: box(b), ...o });
  const dark = !!(ctx.palette && ctx.palette.dark);
  art("p21-labels.webp", [84, 35, 1494, 859], { layer: "fg" });
  // "≈ 8 km/s: orbit!" is dark blue on paper; in dark mode it switches to the label gold (#E2B654)
  art(dark ? "p21-label-orbit-gold.webp" : "p21-label-orbit.webp", [53, 169, 306, 201], { layer: "fg", ink: false });
  art("p21-fg-art.webp", [78, 113, 1199, 221], { layer: "fg" });
  art("p21-earth.webp", [70, 410, 796, 900], { ink: false });
  art("p21-trajectories.webp", [441, 144, 1222, 840], { z: 0.01 }).material.opacity = 0.3;
  art("p21-mountain.webp", [341, 337, 520, 450], { z: 0.02, ink: false });
  const astro = art("p21-astronaut.webp", [1232, 542, 1445, 790], { ink: false });
  // dark mode only: a thin cream pencil rim (#F7F6F2 at 60 percent, 2 px, no glow) on the astronaut and Earth
  const rim = dark ? art("p21-astronaut-rim.webp", [1230, 541, 1446, 792], { ink: false }) : null;
  const ay = astro.position.y, bob = ctx.at(0, 4)[1] - ctx.at(0, 0)[1];
  const rimY = rim ? rim.position.y : 0;
  const plane = ctx.paint([0, 0, 1600, 900], { z: 0.03 });
  const grab = new ctx.THREE.Object3D(); ctx.layers.mid.add(grab); ctx.touchable(grab, { r: 0.35 });
  { const p = ctx.at(START[0], START[1]); grab.position.set(p[0], p[1], 0.05); }

  let v = 5, shot = null, t0 = 0, now = 0, pulling = null;
  const slider = ctx.ui && ctx.ui.slider({ label: "Launch speed", min: 1, max: V_ORBIT, step: 0.1, value: v, fmt: (x) => `${x.toFixed(1)} km/s` }, (x) => { v = x; draw(); });
  ctx.ui && ctx.ui.button("Launch", () => fire());
  function fire() { shot = flight(v); t0 = now; draw(); }

  function arrow(g, x, y, dx, dy, c) {
    const L = Math.hypot(dx, dy); if (L < 2) return; const ux = dx / L, uy = dy / L;
    g.strokeStyle = c; g.fillStyle = c; g.lineWidth = 4; g.globalAlpha = 1;
    g.beginPath(); g.moveTo(x, y); g.lineTo(x + dx - ux * 10, y + dy - uy * 10); g.stroke();
    g.beginPath(); g.moveTo(x + dx, y + dy); g.lineTo(x + dx - ux * 16 - uy * 8, y + dy - uy * 16 + ux * 8); g.lineTo(x + dx - ux * 16 + uy * 8, y + dy - uy * 16 - ux * 8); g.closePath(); g.fill();
  }
  function draw() {
    plane.redraw((g) => {
      if (dark) { g.strokeStyle = "#F7F6F2"; g.globalAlpha = 0.6; g.lineWidth = 2; g.beginPath(); g.arc(C[0], C[1], R + 1, 0, 7); g.stroke(); g.globalAlpha = 1; }
      let bx = START[0], by = START[1], vx = 1, vy = 0, n = 0;
      if (pulling) { bx = pulling[0]; by = pulling[1]; }
      if (shot) {
        const tt = reducedMotion ? Infinity : now - t0, P = shot.path, orbit = !shot.landed;
        // the trail so far (an orbit loops forever, so its whole circle stays drawn after one lap)
        g.strokeStyle = orbit ? BLUE : "#8A5A3B"; g.lineWidth = 3; g.setLineDash(orbit ? [10, 8] : []); g.beginPath();
        const lapT = orbit ? tt % P[P.length - 1][2] : tt, full = orbit && tt >= P[P.length - 1][2];
        for (const q of P) { if (!full && q[2] > lapT) break; n ? g.lineTo(q[0], q[1]) : g.moveTo(q[0], q[1]); n++; }
        g.stroke(); g.setLineDash([]);
        let k = P.findIndex((q) => q[2] > lapT); if (k < 0) k = P.length - 1;
        bx = P[k][0]; by = P[k][1];
        if (k > 0) { vx = P[k][0] - P[k - 1][0]; vy = P[k][1] - P[k - 1][1]; } else { vx = 1; vy = 0; }
        if (shot.landed && k === P.length - 1) { vx = 0; vy = 0; }
      }
      // F_g toward the center of Earth; velocity tangent, longer when faster
      const dx = C[0] - bx, dy = C[1] - by, r = Math.hypot(dx, dy);
      arrow(g, bx, by, 55 * dx / r, 55 * dy / r, RED);
      const vl = Math.hypot(vx, vy); if (vl > 0) arrow(g, bx, by, (12 * v) * vx / vl, (12 * v) * vy / vl, "#3D3D3D");
      g.fillStyle = "#3D3D3D"; g.beginPath(); g.arc(bx, by, 7, 0, 7); g.fill();
    });
    slider && slider.set(v);
  }
  ctx.onPointer(({ phase, x, y }) => {
    if (phase === "down") { if (Math.hypot(x - START[0], y - START[1]) > 60) return false; pulling = [x, y]; shot = null; }
    if (!pulling) return false;
    if (phase === "up") { pulling = null; fire(); return true; }
    // pull back to the left: 150 px of pull gives 7.9 km/s
    const pull = Math.max(0, Math.min(150, START[0] - x));
    v = Math.max(1, Math.round(V_ORBIT * pull / 150 * 10) / 10);
    pulling = [START[0] - pull, START[1]]; draw(); return true;
  });
  draw();
  return {
    update(t) {
      now = t;
      if (!reducedMotion) astro.position.y = ay + bob * Math.sin(2 * Math.PI * t / 7), astro.rotation.z = 0.035 * Math.sin(2 * Math.PI * t / 7), rim && (rim.position.y = astro.position.y - ay + rimY, rim.rotation.z = astro.rotation.z);
      if (shot && !reducedMotion) draw();
    },
    dispose() {},
  };
}
