// Unit 12 interactives: cross sections of a cube (12.2), Cavalieri shear (12.3).
import { M, P, txt, num } from "./kit.js";
import { view, solid, boxSolid } from "../geo-fig-kit.js";

export const GX = {
  cross: {
    title: "Cross sections",
    how: "Pick a slicing direction and slide the plane through the cube.",
    mount(B, U) {
      let dir = "diag", c = 0;
      const dirs = { flat: [0, 0, 1], tilt: [1, 0, 1], corner: [1, 1, 1] , diag: [1, 1, 1] };
      U.choice("Plane", [["flat", "Parallel to a face"], ["tilt", "Through two edges"], ["corner", "Corner cut"], ["diag", "Across the middle"]], dir, (v) => { dir = v; c = v === "corner" ? 2 : 0; sl.set(c); B.update(); });
      const sl = U.slider({ label: "Plane position", min: -3, max: 3, step: 0.05, value: c }, (v) => { c = v; B.update(); });
      B.draw((g) => {
        const s = 260, pr = view(P(800, 470), 1.0, -35, 24), { v, f } = boxSolid(2 * s, 2 * s, 2 * s);
        solid(g, v, f, pr, { w: "main" });
        // plane n.x = c in cube coordinates [-1, 1]^3 (z shifted to center)
        const n = dirs[dir], E = [];
        const corners = [-1, 1];
        for (const a of corners) for (const b of corners) { E.push([[-1, a, b], [1, a, b]]); E.push([[a, -1, b], [a, 1, b]]); E.push([[a, b, -1], [a, b, 1]]); }
        const pts = [];
        for (const [p, q] of E) {
          const dp = n[0] * p[0] + n[1] * p[1] + n[2] * p[2] - c, dq = n[0] * q[0] + n[1] * q[1] + n[2] * q[2] - c;
          if ((dp < 0 && dq >= 0) || (dp >= 0 && dq < 0) || (dp === 0 && dq === 0)) { const t = dp / (dp - dq || 1); pts.push(p.map((x, i) => x + (q[i] - x) * t)); }
        }
        const uniq = pts.filter((p, i) => pts.findIndex((q) => Math.hypot(...p.map((x, j) => x - q[j])) < 1e-6) === i);
        let shapeName = "no slice";
        if (uniq.length >= 3) {
          const ctr = [0, 1, 2].map((i) => uniq.reduce((s2, p) => s2 + p[i], 0) / uniq.length);
          // order around the centroid within the plane
          const nn = Math.hypot(...n), N = n.map((x) => x / nn), ref = Math.abs(N[2]) < 0.9 ? [0, 0, 1] : [1, 0, 0];
          const cr = (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
          const u = cr(N, ref), w = cr(N, u), dt = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
          uniq.sort((p, q) => { const d1 = p.map((x, i) => x - ctr[i]), d2 = q.map((x, i) => x - ctr[i]); return Math.atan2(dt(d1, w), dt(d1, u)) - Math.atan2(dt(d2, w), dt(d2, u)); });
          const scr = uniq.map(([x, y, z]) => pr([x * s, y * s, (z + 1) * s]).p);
          g.poly(scr, { w: "bold", fill: "hatch" });
          const L = uniq.map((p, i) => Math.hypot(...p.map((x, j) => x - uniq[(i + 1) % uniq.length][j])));
          const eq = L.every((x) => Math.abs(x - L[0]) < 1e-3);
          shapeName = { 3: eq ? "equilateral triangle" : "triangle", 4: eq ? "square" : "rectangle", 5: "pentagon", 6: eq ? "regular hexagon" : "hexagon" }[uniq.length] || `${uniq.length}-gon`;
        }
        txt(g, P(800, 860), shapeName, { bold: true });
        U.read(`<p>The slice is a <b>${shapeName}</b>. A plane cuts each face in at most one segment, so a cube's cross section has at most 6 sides.</p>`);
      });
    }
  },
  cavalieri: {
    title: "Cavalieri shear",
    how: "Shear the stack of cards. Every layer keeps its area, so the volume stays the same.",
    mount(B, U) {
      let sh = 0, n = 16;
      U.slider({ label: "Shear", min: -1, max: 1, step: 0.05, value: sh }, (v) => { sh = v; B.update(); });
      U.slider({ label: "Cards", min: 4, max: 40, step: 2, value: n }, (v) => { n = v; B.update(); });
      B.draw((g) => {
        const H = 600, W = 260, base = 800, x0 = 380, h = H / n;
        for (const [cx, k] of [[x0, 0], [x0 + 620, sh]]) {
          for (let i = 0; i < n; i++) {
            const y = base - (i + 1) * h, off = k * (i + 0.5) * h * 0.9;
            g.poly([P(cx + off - W / 2, y), P(cx + off + W / 2, y), P(cx + off + W / 2, y + h), P(cx + off - W / 2, y + h)], { w: n > 24 ? "thin" : "main" });
          }
        }
        txt(g, P(x0, 860), "upright", { small: true }); txt(g, P(x0 + 620, 860), "sheared", { small: true });
        U.read(`<p>Same height, and the same cross section area at every level, so the same volume (Cavalieri's principle). Volume = base \u00d7 height either way.</p>`);
        void M; void num;
      });
    }
  }
};
