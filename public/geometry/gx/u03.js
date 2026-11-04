// Unit 3 interactives: translation and friezes (3.2), reflect with perpendiculars (3.3), rotation (3.4),
// two reflections (3.5), transformation golf (3.6), tessellation tile builder (3.11).
import { M, P, lab, txt, createSteps, deg, num, grid } from "./kit.js";

// a small flag, the course's standard "figure": asymmetric so every transformation shows
export const flag = (o, s = 1) => [P(0, 0), P(0, -120), P(80, -95), P(0, -70), P(0, 0)].map((p) => P(o.x + p.x * s, o.y + p.y * s));
const flagPoly = (g, pts, o = {}) => { g.path(`M${pts.map((p) => `${p.x} ${p.y}`).join("L")}`, o); g.dot(pts[0], 4); };
const mapPts = (pts, f) => pts.map(f);

export const GX = {
  translate: {
    title: "Translation by a vector, and friezes",
    how: "Drag the tip of the vector. Turn the frieze on to repeat the figure along it.",
    mount(B, U) {
      const T = B.point(420, 520, { label: "tail" }), H = B.point(640, 470, { label: "tip" });
      let frieze = true;
      U.row(); U.button("Frieze", (b) => { frieze = !frieze; b.setAttribute("aria-pressed", String(frieze)); B.update(); }, { pressed: true });
      B.draw((g) => {
        const v = M.sub(H, T), F = flag(P(T.x - 40, T.y + 230));
        g.seg(T, H, { w: "bold" }); g.arrow(T, H); lab(g, H, "v", T);
        flagPoly(g, F, { w: "bold" });
        const n = frieze ? 8 : 1;
        for (let i = -n; i <= n; i++) {
          if (!i) continue;
          const G = mapPts(F, (p) => M.add(p, M.mul(v, i)));
          if (G.some((p) => p.x < -200 || p.x > 1800 || p.y < -200 || p.y > 1100)) continue;
          flagPoly(g, G, { w: Math.abs(i) === 1 ? "main" : "thin" });
          if (i === 1) g.seg(F[2], G[2], { dash: true, w: "thin" });
        }
        U.read(`<p>v = (${num(v.x / 100, 1)}, ${num(-v.y / 100, 1)}). Every point moves the same distance, ${num(M.len(v) / 100, 2)}, in the same direction.</p>`);
      });
    }
  },
  reflect: {
    title: "Reflect a polygon using perpendiculars",
    how: "Drag the triangle or the mirror line, then step through.",
    kind: "construction",
    mount(B, U) {
      const m0 = B.point(820, 80, { label: "" }), m1 = B.point(940, 830, { label: "" });
      const V = [B.point(300, 300, { label: "A" }), B.point(560, 420, { label: "B" }), B.point(360, 640, { label: "C" })];
      const names = ["A", "B", "C"];
      const base = (g) => { g.line(m0, m1, { w: "bold" }); g.poly(V, { w: "bold" }); V.forEach((p, i) => lab(g, p, names[i], M.centroid(...V))); };
      const one = (i) => ({ say: `Drop a perpendicular from ${names[i]} to the mirror and continue it the same distance past the mirror. That point is ${names[i]}'.`, draw: (g, t) => {
        const p = V[i], f = M.foot(p, m0, m1), q = M.reflect(p, m0, m1);
        g.edge(p, q, t, { dash: true, w: "thin" });
        if (t >= 1) { g.right(m0, f, p); g.ticks(p, f, 1); g.ticks(f, q, 1); g.dot(q); lab(g, q, names[i] + "'", f); }
      } });
      const steps = [one(0), one(1), one(2), { say: "Connect A', B', C'. The image is congruent, with its orientation reversed.", draw: (g, t) => { const W = V.map((p) => M.reflect(p, m0, m1)); g.edge(W[0], W[1], t, { w: "bold" }); g.edge(W[1], W[2], t, { w: "bold" }); g.edge(W[2], W[0], t, { w: "bold" }); } }];
      steps.intro = "a triangle and a mirror line are given.";
      createSteps(B, U, steps, base, { done: "The mirror is the perpendicular bisector of every segment from a point to its image." });
    }
  },
  rotate: {
    title: "Rotation about any center",
    how: "Drag the center O, and set the angle (counterclockwise is positive).",
    mount(B, U) {
      const O = B.point(800, 470, { label: "O" });
      let a = 90;
      U.slider({ label: "Angle", min: -180, max: 180, step: 5, value: a, fmt: (v) => `${v}\u00b0` }, (v) => { a = v; B.update(); });
      B.draw((g) => {
        const F = flag(P(1050, 420)), G = F.map((p) => M.rotate(p, O, a));
        flagPoly(g, F, { w: "bold" }); flagPoly(g, G, { w: "main" });
        lab(g, O, "O", P(O.x - 100, O.y + 100));
        for (const i of [0, 2]) {
          g.seg(O, F[i], { dash: true, w: "thin" }); g.seg(O, G[i], { dash: true, w: "thin" });
          if (a) { const d = M.dirDeg(O, F[i]); g.arc(O, M.dist(O, F[i]), a > 0 ? d : d + a, a > 0 ? d + a : d, { w: "thin" }); }
        }
        U.read(`<p>Rotation by ${a}\u00b0 about O. Each point stays the same distance from O and turns through ${Math.abs(a)}\u00b0.</p>`);
      });
    }
  },
  tworeflect: {
    title: "Composition of two reflections",
    how: "Drag the two mirror lines. Reflect over m first, then n.",
    mount(B, U) {
      const a0 = B.point(700, 60, { label: "" }), a1 = B.point(760, 840, { label: "" }), b0 = B.point(980, 60, { label: "" }), b1 = B.point(1100, 840, { label: "" });
      B.draw((g) => {
        g.line(a0, a1, { w: "bold" }); g.line(b0, b1, { w: "bold" });
        lab(g, a0, "m", a1); lab(g, b0, "n", b1);
        const F = flag(P(380, 560)), F1 = F.map((p) => M.reflect(p, a0, a1)), F2 = F1.map((p) => M.reflect(p, b0, b1));
        flagPoly(g, F, { w: "bold" }); flagPoly(g, F1, { w: "thin", dash: true }); flagPoly(g, F2, { w: "main" });
        const X = M.lineX(a0, a1, b0, b1);
        let msg;
        const u = M.unit(M.sub(a1, a0)), w = M.unit(M.sub(b1, b0)), cr = Math.abs(M.cross(u, w));
        if (!X || cr < 0.01 || M.dist(X, P(800, 450)) > 5000) {
          const d = M.dist(M.foot(a0, b0, b1), a0);
          msg = `The mirrors are parallel. The result is a translation by twice the gap: 2 \u00d7 ${num(d / 100, 2)} = ${num(2 * d / 100, 2)}.`;
        } else {
          const t = Math.asin(Math.min(1, cr)) / M.DEG, ang = M.dot(u, w) < 0 ? 180 - t : t, s = Math.min(ang, 180 - ang);
          if (X.x > -100 && X.x < 1700 && X.y > -100 && X.y < 1000) { g.dot(X); lab(g, X, "X", P(X.x - 100, X.y)); }
          msg = `The mirrors meet at X at ${deg(s)}. The result is a rotation about X by twice that angle, ${deg(2 * s)}.`;
        }
        U.read(`<p>${msg}</p>`);
      });
    }
  },
  golf: {
    title: "Transformation golf",
    how: "Use the moves to land your flag exactly on the dashed target, in as few moves as you can.",
    mount(B, U) {
      const C = P(800, 450), u = 75;
      const holes = [
        { start: [P(-4, 0), 0, 1], goal: [P(3, 1), 0, 1], par: 2 },
        { start: [P(-3, -1), 0, 1], goal: [P(2, 2), 90, 1], par: 2 },
        { start: [P(-2, 1), 0, 1], goal: [P(3, -2), 180, -1], par: 3 }
      ];
      let h = 0, pos, rot, flip, moves, log;
      const reset = () => { [pos, rot, flip] = holes[h].start; pos = P(pos.x, pos.y); moves = 0; log = []; B.update(); };
      // figure in grid units: a flag whose foot is at pos
      const shapeAt = (p, r, f) => [P(0, 0), P(0, 1.6), P(f * 1.07, 1.27), P(0, 0.93), P(0, 0)].map((q) => { const a = r * M.DEG, x = q.x * Math.cos(a) - q.y * Math.sin(a), y = q.x * Math.sin(a) + q.y * Math.cos(a); return P(C.x + (p.x + x) * u, C.y - (p.y + y) * u); });
      const mv = (name, f) => () => { f(); moves++; log.push(name); B.update(); };
      U.choice("Hole", holes.map((_, i) => [i, `Hole ${i + 1}`]), 0, (v) => { h = v; reset(); });
      U.row();
      U.button("Right 1", mv("T(1,0)", () => (pos = P(pos.x + 1, pos.y)))); U.button("Left 1", mv("T(\u22121,0)", () => (pos = P(pos.x - 1, pos.y))));
      U.button("Up 1", mv("T(0,1)", () => (pos = P(pos.x, pos.y + 1)))); U.button("Down 1", mv("T(0,\u22121)", () => (pos = P(pos.x, pos.y - 1))));
      U.row();
      U.button("Rotate 90\u00b0 about origin", mv("R90", () => { pos = P(-pos.y, pos.x); rot = (rot + 90) % 360; }));
      U.button("Reflect over y-axis", mv("ry", () => { pos = P(-pos.x, pos.y); flip = -flip; rot = (360 - rot) % 360; }));
      U.button("Reflect over x-axis", mv("rx", () => { pos = P(pos.x, -pos.y); flip = -flip; rot = (540 - rot) % 360; }));
      U.row(); U.button("Reset hole", reset);
      reset();
      B.draw((g) => {
        grid(g, C, u, [-10, 10], [-5, 5], { axes: true });
        const H = holes[h], G = shapeAt(H.goal[0], H.goal[1], H.goal[2]), S = shapeAt(pos, rot, flip);
        g.path(`M${G.map((p) => `${p.x} ${p.y}`).join("L")}`, { dash: true, w: "main" });
        flagPoly(g, S, { w: "bold" });
        const hit = S.every((p, i) => M.dist(p, G[i]) < 1);
        txt(g, P(1300, 80), `moves: ${moves}  par ${H.par}`, { small: true });
        U.read(`<p>${hit ? `<b>In the hole in ${moves} move${moves === 1 ? "" : "s"}!</b> ` : ""}Moves: ${log.join(", ") || "none yet"}.</p>`);
      });
    }
  },
  tessellate: {
    title: "Tessellation tile builder",
    how: "Drag the hollow points to reshape the tile's edges. Changes on one edge are copied to the matching edge, so the tile always fits.",
    mount(B, U) {
      const s = 150, TL = P(500, 300);
      let mode = "translate";
      const bt = B.point(TL.x + 75, TL.y - 40, { label: "top" }), bl = B.point(TL.x - 30, TL.y + 90, { label: "left" });
      U.choice("Repeat by", [["translate", "Translation"], ["rotate", "Rotation"]], mode, (v) => { mode = v; bl.hidden = v === "rotate"; B.update(); });
      B.draw((g) => {
        const TR = P(TL.x + s, TL.y), BR = P(TL.x + s, TL.y + s), BL = P(TL.x, TL.y + s);
        let tile;
        if (mode === "translate") {
          const sv = P(0, s), sh = P(s, 0);
          tile = [TL, bt, TR, M.add(bl, sh), BR, M.add(bt, sv), BL, bl];
          for (let i = -4; i <= 7; i++) for (let j = -2; j <= 4; j++) g.poly(tile.map((p) => M.add(p, P(i * s, j * s))), { w: i === 0 && j === 0 ? "bold" : "thin" });
        } else {
          const rb = M.rotate(bt, TR, -90);
          tile = [TL, bt, TR, rb, BR, BL];
          for (let i = -2; i <= 3; i++) for (let j = -1; j <= 2; j++) for (let r = 0; r < 4; r++) {
            const off = P(i * 2 * s, j * 2 * s);
            g.poly(tile.map((p) => M.add(M.rotate(p, TR, -90 * r), off)), { w: i === 0 && j === 0 && r === 0 ? "bold" : "thin" });
          }
        }
        U.read(mode === "translate" ? "<p>The top edge's bump is translated to the bottom, and the left edge's to the right. Copies slide into place with no gaps.</p>" : "<p>The top edge is rotated 90\u00b0 about the corner to make the right edge. Four tiles turn around that corner to make a block, and blocks slide into place.</p>");
      });
    }
  }
};
