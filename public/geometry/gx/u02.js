// Unit 2 interactives: bisect a segment and an angle (2.5), vertical angles (2.7), drop a perpendicular (2.9),
// copy an angle and build a parallel (2.10), construction rosette (2.12).
import { M, P, lab, txt, createSteps, deg, tick, onLine } from "./kit.js";

const upper = (cs) => (cs.length ? (cs[0].y < cs[1].y ? cs[0] : cs[1]) : null);
const lower = (cs) => (cs.length ? (cs[0].y < cs[1].y ? cs[1] : cs[0]) : null);

export const GX = {
  bisect: {
    title: "Bisect a segment and an angle",
    how: "Step through both constructions, then drag A, B, or the angle's points: it always works.",
    kind: "construction",
    mount(B, U) {
      const A = B.point(140, 560, { label: "A" }), Bb = B.point(620, 520, { label: "B" });
      const V = B.point(900, 700, { label: "V" }), X = B.point(1500, 700, { label: "X" }), Y = B.point(1300, 220, { label: "Y" });
      const L = () => {
        const r = M.dist(A, Bb) * 0.72, cs = M.circleX(A, r, Bb, r), p = upper(cs), q = lower(cs);
        const ra = Math.min(M.dist(V, X), M.dist(V, Y)) * 0.45, ex = M.add(V, M.mul(M.unit(M.sub(X, V)), ra)), ey = M.add(V, M.mul(M.unit(M.sub(Y, V)), ra));
        const r2 = M.dist(ex, ey) * 0.8, k = M.circleX(ex, r2, ey, r2), far = k.length ? (M.dist(k[0], V) > M.dist(k[1], V) ? k[0] : k[1]) : null;
        return { r, p, q, ra, ex, ey, r2, far };
      };
      const base = (g) => { g.seg(A, Bb, { w: "bold" }); lab(g, A, "A", Bb); lab(g, Bb, "B", A); g.seg(V, X, { w: "bold" }); g.seg(V, Y, { w: "bold" }); lab(g, V, "V", M.mid(X, Y)); lab(g, X, "X", V); lab(g, Y, "Y", V); };
      const steps = [
        { say: "Open the compass more than half of AB. From A, draw arcs above and below.", draw: (g, t) => { const s = L(); if (s.p) { tick(g, A, s.r, s.p, t); tick(g, A, s.r, s.q, t); } } },
        { say: "Same opening, from B. The arcs cross at P and Q.", draw: (g, t) => { const s = L(); if (s.p) { tick(g, Bb, s.r, s.p, t); tick(g, Bb, s.r, s.q, t); if (t >= 1) { g.dot(s.p); g.dot(s.q); lab(g, s.p, "P", s.q); lab(g, s.q, "Q", s.p); } } } },
        { say: "Draw line PQ. It meets AB at its midpoint M at a right angle.", draw: (g, t) => { const s = L(); if (!s.p) return; g.edge(M.lerp(s.p, s.q, -0.1), M.lerp(s.p, s.q, 1.1), t); if (t >= 1) { const m = M.lineX(A, Bb, s.p, s.q); g.dot(m); g.right(Bb, m, s.p); g.ticks(A, m, 1); g.ticks(m, Bb, 1); } } },
        { say: "Now the angle. From V, draw an arc crossing both sides.", draw: (g, t) => { const s = L(); const d0 = M.dirDeg(V, X), d1 = M.dirDeg(V, Y); g.sweep(V, s.ra, d0 - 8, d1 + 8, t); } },
        { say: "From each crossing, draw arcs with the same opening that meet inside the angle.", draw: (g, t) => { const s = L(); if (s.far) { tick(g, s.ex, s.r2, s.far, t); tick(g, s.ey, s.r2, s.far, t); } } },
        { say: "Draw the ray from V through that meeting point. It bisects the angle.", draw: (g, t) => { const s = L(); if (!s.far) return; g.edge(V, M.lerp(V, s.far, 1.6), t); if (t >= 1) { g.angle(X, V, s.far, 1, 110); g.angle(s.far, V, Y, 1, 125); txt(g, P(1230, 820), `${deg(M.angle(X, V, s.far))} and ${deg(M.angle(s.far, V, Y))}`, { small: true }); } } }
      ];
      steps.intro = "segment AB and angle XVY are given.";
      createSteps(B, U, steps, base, { done: "Drag any point: the construction still works." });
    }
  },
  vertical: {
    title: "Vertical angles",
    how: "Drag the ends of either line. The four angles update.",
    mount(B, U) {
      const O = P(800, 450), a = B.point(1300, 250, { label: "A" }), c = B.point(1250, 720, { label: "C" });
      B.draw((g) => {
        const b = M.sub(M.mul(O, 2), a), d = M.sub(M.mul(O, 2), c);
        g.seg(M.lerp(O, a, 1.6), M.lerp(O, b, 1.6)); g.seg(M.lerp(O, c, 1.6), M.lerp(O, d, 1.6)); g.dot(O);
        const quads = [[a, c], [c, b], [b, d], [d, a]], vals = quads.map(([p, q]) => M.angle(p, O, q));
        quads.forEach(([p, q], i) => { g.angle(p, O, q, i % 2 ? 2 : 1, 70 + i * 6); const m = M.unit(M.add(M.unit(M.sub(p, O)), M.unit(M.sub(q, O)))); txt(g, M.add(O, M.mul(m, 150)), deg(vals[i])); });
        U.read(`<p>Angles: ${vals.map(deg).join(", ")}. Opposite (vertical) angles match; neighbors add to 180.</p>`);
      });
    }
  },
  perpdrop: {
    title: "Drop a perpendicular",
    how: "Drag P or the line, then step through.",
    kind: "construction",
    mount(B, U) {
      const l0 = B.point(200, 560, { label: "" }), l1 = B.point(1400, 600, { label: "" }), Pp = B.point(760, 180, { label: "P" });
      const L = () => {
        const f = M.foot(Pp, l0, l1), d = M.dist(Pp, f), r = d * 1.35, xs = M.lineCircleX(l0, l1, Pp, r);
        if (xs.length < 2) return null;
        const [A, Bb] = xs, r2 = M.dist(A, Bb) * 0.75, cs = M.circleX(A, r2, Bb, r2), Q = cs.length ? (M.dist(cs[0], Pp) > M.dist(cs[1], Pp) ? cs[0] : cs[1]) : null;
        return { f, r, A, Bb, r2, Q };
      };
      const base = (g) => { g.line(l0, l1); lab(g, Pp, "P", M.foot(Pp, l0, l1)); };
      const steps = [
        { say: "From P, draw an arc that crosses the line at A and B.", draw: (g, t) => { const s = L(); if (!s) return; const [a0, a1] = [M.dirDeg(Pp, s.A), M.dirDeg(Pp, s.Bb)]; g.sweep(Pp, s.r, Math.min(a0, a1) - 10, Math.max(a0, a1) + 10, t); if (t >= 1) { g.dot(s.A); g.dot(s.Bb); lab(g, s.A, "A", Pp); lab(g, s.Bb, "B", Pp); } } },
        { say: "From A and from B, draw arcs with the same opening that cross on the far side at Q.", draw: (g, t) => { const s = L(); if (!s || !s.Q) return; tick(g, s.A, s.r2, s.Q, t); tick(g, s.Bb, s.r2, s.Q, t); if (t >= 1) { g.dot(s.Q); lab(g, s.Q, "Q", Pp); } } },
        { say: "Draw PQ. It is perpendicular to the line.", draw: (g, t) => { const s = L(); if (!s || !s.Q) return; g.edge(Pp, s.Q, t, { w: "bold" }); if (t >= 1) g.right(s.Bb, s.f, Pp); } }
      ];
      steps.intro = "a line and a point P off the line are given.";
      createSteps(B, U, steps, base, { done: "P and Q are each the same distance from A and B, so PQ is the perpendicular bisector of AB." });
    }
  },
  parallel: {
    title: "Copy an angle, build a parallel",
    how: "Drag P or the line, then step through.",
    kind: "construction",
    mount(B, U) {
      const l0 = B.point(160, 700, { label: "" }), l1 = B.point(1450, 700, { label: "" }), X = B.point(520, 700, { label: "X", constrain: (q) => M.foot(q, l0, l1) }), Pp = B.point(820, 280, { label: "P" });
      const L = () => {
        const u = M.unit(M.sub(Pp, X)), v = M.unit(M.sub(l1, l0)), r = Math.min(170, M.dist(X, Pp) * 0.4);
        const e1 = M.add(X, M.mul(v, r)), e2 = M.add(X, M.mul(u, r)), f1 = M.add(Pp, M.mul(u, r)), chord = M.dist(e1, e2);
        const cs = M.circleX(Pp, r, f1, chord), side = (q) => M.cross(M.sub(Pp, X), M.sub(q, X));
        const f2 = cs.length ? (Math.sign(side(cs[0])) === Math.sign(side(e1)) ? cs[0] : cs[1]) : null;
        return { u, v, r, e1, e2, f1, f2, chord };
      };
      const base = (g) => { g.line(l0, l1); const u = M.unit(M.sub(Pp, X)); g.seg(M.add(X, M.mul(u, -200)), M.add(Pp, M.mul(u, 300))); lab(g, X, "X", P(X.x - 80, X.y + 100)); lab(g, Pp, "P", P(Pp.x - 100, Pp.y - 40)); };
      const steps = [
        { say: "From X, draw an arc across both the line and the transversal.", draw: (g, t) => { const s = L(); g.sweep(X, s.r, M.dirDeg(X, s.e1) - 8, M.dirDeg(X, s.e2) + 8, t); } },
        { say: "Same opening, from P: an arc across the transversal above P.", draw: (g, t) => { const s = L(); g.sweep(P_(Pp), s.r, M.dirDeg(Pp, s.f1) - 70, M.dirDeg(Pp, s.f1) + 10, t); } },
        { say: "Measure the opening between the first arc's crossings, then mark it from the new crossing.", draw: (g, t) => { const s = L(); if (!s.f2) return; tick(g, s.e2, s.chord, s.e1, t, 10); tick(g, s.f1, s.chord, s.f2, t, 10); } },
        { say: "Draw the line through P and the new mark. Corresponding angles are equal, so it is parallel.", draw: (g, t) => { const s = L(); if (!s.f2) return; const d = M.unit(M.sub(s.f2, Pp)); g.edge(M.add(Pp, M.mul(d, -700)), M.add(Pp, M.mul(d, 800)), t, { w: "bold" }); if (t >= 1) { g.angle(s.e1, X, s.e2, 1, 70); g.angle(s.f2, Pp, s.f1, 1, 70); } } }
      ];
      steps.intro = "a line, a point P and a transversal through P and X are given.";
      createSteps(B, U, steps, base, { done: "Equal corresponding angles make the lines parallel." });
    }
  },
  rosette: {
    title: "Construction rosette",
    how: "Build the six-petal rosette with one compass opening, then add rings or download the line art.",
    kind: "construction",
    mount(B, U) {
      const O = B.point(800, 450, { label: "O" }), R = B.point(960, 450, { label: "" });
      const L = () => { const r = M.dist(O, R), d = M.dirDeg(O, R); return { r, d, c: Array.from({ length: 6 }, (_, i) => M.polar(O, r, d + 60 * i)) }; };
      let ring2 = false;
      const base = (g) => { lab(g, O, "O", P(O.x, O.y + 100)); };
      const steps = [
        { say: "Draw a circle with center O.", draw: (g, t) => { const s = L(); g.sweep(O, s.r, s.d, s.d - 0.1, t); } },
        ...[0, 1, 2, 3, 4, 5].map((i) => ({ say: i === 0 ? "Same opening: needle on the circle, draw another circle." : `Move the needle to the next crossing and draw circle ${i + 1}.`, draw: (g, t) => { const s = L(); g.sweep(s.c[i], s.r, s.d + 60 * i + 180, s.d + 60 * i + 179.9, t); g.dot(s.c[i], 4); } })),
        { say: "The six circles all pass through O: a rosette. Add the outer ring with a doubled opening.", draw: (g, t) => { const s = L(); g.sweep(O, 2 * s.r, s.d, s.d - 0.1, t, { w: "bold" }); if (ring2) for (let i = 0; i < 6; i++) g.circle(M.polar(O, s.r * Math.sqrt(3), s.d + 30 + 60 * i), s.r, { w: "thin" }); } }
      ];
      steps.intro = "pick a center O and an opening (drag the hollow point).";
      createSteps(B, U, steps, base, { done: "Six circles of one radius close up exactly, because 6 equilateral triangles fit around a point." });
      U.row(); U.button("Second ring", (b) => { ring2 = !ring2; b.setAttribute("aria-pressed", String(ring2)); B.update(); }, { pressed: false });
      U.button("Download line art", () => {
        const s = new XMLSerializer().serializeToString(B.svg).replace(/var\(--gx-paper, #fff\)/g, "#fff").replace(/currentColor/g, "#111");
        const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([s], { type: "image/svg+xml" })); a.download = "rosette.svg"; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
      });
    }
  }
};
const P_ = (p) => P(p.x, p.y);
