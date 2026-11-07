// Unit 10 interactives: a circle's center from two chords (10.2), inscribed angle (10.5), secant and tangent angles (10.9),
// circumcircle (10.11), incircle (10.12), triangle centers and the Euler line (10.13), Napoleon's theorem (10.14).
import { isDiameter, circleRegime } from "../geo-invariants.js";
import { M, P, lab, txt, createSteps, deg, num, shape, tick, onCircle } from "./kit.js";

// the arc from x to y (degrees) that does not contain any of the points in avoid
const arcAvoid = (O, x, y, avoid) => {
  const a = M.dirDeg(O, x), b = M.dirDeg(O, y), ccw = (((b - a) % 360) + 360) % 360;
  const inside = (p) => { const d = (((M.dirDeg(O, p) - a) % 360) + 360) % 360; return d > 0.5 && d < ccw - 0.5; };
  return avoid.some(inside) ? 360 - ccw : ccw;
};
const perpBisector = (a, b) => { const m = M.mid(a, b), v = M.perp(M.unit(M.sub(b, a))); return [M.add(m, M.mul(v, -2000)), M.add(m, M.mul(v, 2000))]; };
const triPts = (B, xy = [[300, 740], [1100, 760], [620, 220]]) => xy.map(([x, y], i) => B.point(x, y, { label: "ABC"[i] }));

export const GX = {
  center: {
    title: "Find a circle's center from two chords",
    how: "The circle's center is hidden. Drag the chord ends around the circle, then step through.",
    kind: "construction",
    mount(B, U) {
      const O = P(760, 460), r = 340, on = onCircle(O, r);
      const [A, Bb, C, D] = [200, 300, 20, 110].map((d, i) => B.point(...Object.values(M.polar(O, r, d)), { label: "ABCD"[i], constrain: on }));
      const base = (g) => { g.circle(O, r, { w: "bold" }); [A, Bb, C, D].forEach((p, i) => lab(g, p, "ABCD"[i], O)); };
      const bis = (p, q, t, g) => { const L = perpBisector(p, q), m = M.mid(p, q), rr = M.dist(p, q) * 0.7, cs = M.circleX(p, rr, q, rr); cs.forEach((c) => { tick(g, p, rr, c, t, 8); tick(g, q, rr, c, t, 8); }); if (t >= 1) { g.line(L[0], L[1], { w: "main" }); g.right(q, m, cs[0] || L[0]); } };
      const steps = [
        { say: "Draw chord AB.", draw: (g, t) => g.edge(A, Bb, t, { w: "bold" }) },
        { say: "Construct the perpendicular bisector of AB. The center lies on it.", draw: (g, t) => bis(A, Bb, t, g) },
        { say: "Draw chord CD and construct its perpendicular bisector too.", draw: (g, t) => { g.edge(C, D, t, { w: "bold" }); bis(C, D, t, g); } },
        { say: "The bisectors cross at the center.", draw: (g, t) => { const X = M.lineX(...perpBisector(A, Bb), ...perpBisector(C, D)); if (X && t >= 1) { g.dot(X, 6); lab(g, X, "O", P(X.x + 60, X.y + 100)); } } }
      ];
      steps.intro = "a circle with no marked center is given.";
      createSteps(B, U, steps, base, { done: "Every perpendicular bisector of a chord passes through the center, so two of them pin it down." });
    }
  },
  inscribed: {
    title: "Inscribed angle drag",
    how: "Drag P around the circle, and drag A or B to change the arc.",
    mount(B, U) {
      const O = P(700, 460), r = 340, on = onCircle(O, r);
      const A = B.point(...Object.values(M.polar(O, r, 210)), { label: "A", constrain: on }), Bb = B.point(...Object.values(M.polar(O, r, 330)), { label: "B", constrain: on }), Pp = B.point(...Object.values(M.polar(O, r, 100)), { label: "P", constrain: on });
      B.draw((g) => {
        g.circle(O, r); g.dot(O); lab(g, O, "O", P(O.x, O.y - 100));
        g.seg(Pp, A, { w: "bold" }); g.seg(Pp, Bb, { w: "bold" }); g.seg(O, A); g.seg(O, Bb);
        if (M.dist(A,Bb)<1e-9*r || M.dist(A,Pp)<1e-9*r || M.dist(Bb,Pp)<1e-9*r) { U.read("<p>Undefined: choose three distinct points.</p>"); return; }
        const arc = arcAvoid(O, A, Bb, [Pp]), ins = M.angle(A, Pp, Bb);
        const a0 = M.dirDeg(O, A), a1 = M.dirDeg(O, Bb), ccw = (((a1 - a0) % 360) + 360) % 360;
        if (Math.abs(ccw - arc) < 0.01) g.arc(O, r, a0, a1, { w: "bold" }); else g.arc(O, r, a1, a0, { w: "bold" });
        g.angle(A, Pp, Bb, 1, 60);
        if (arc <= 180) g.angle(A, O, Bb, 2, 60);
        lab(g, A, "A", O); lab(g, Bb, "B", O); lab(g, Pp, "P", O);
        txt(g, P(1300, 360), `arc AB = ${deg(arc)}`); txt(g, P(1300, 430), `\u2220APB = ${deg(ins)}`, { bold: true });
        U.read(`<p>The inscribed angle is half its intercepted arc. Measured angle ≈ ${deg(ins)}; half the intercepted arc ≈ ${deg(arc / 2)}. Slide P along the same arc and the angle stays put. Cross A or B onto the other arc and P intercepts the other arc, so the angle becomes the supplement.${isDiameter(arc) ? " AB is a diameter, so the angle is 90\u00b0." : ""}</p>`);
      });
    }
  },
  secant: {
    title: "Secant and tangent angles",
    how: "Use Free drag for inside/outside, On circle to constrain V exactly, or Tangents for a separate tangent construction. Drag A or C to swing the secants.",
    mount(B, U) {
      const O = P(700, 460), r = 300, on = onCircle(O, r);
      let mode = "free";
      const V = B.point(1250, 300, { label: "V", constrain: (q) => mode === "on" ? on(q) : q }), A = B.point(...Object.values(M.polar(O, r, 120)), { label: "A", constrain: on }), C = B.point(...Object.values(M.polar(O, r, 230)), { label: "C", constrain: on });
      U.choice("Vertex mode", [["free","Free drag"],["on","On circle"],["tangent","Tangents"]],mode,(v)=>{
        mode=v;
        if(mode==="on") Object.assign(V,on(V));
        if(mode==="tangent" && M.dist(V,O)<=r) Object.assign(V,P(O.x+1.8*r,O.y));
        B.update();
      });
      B.draw((g) => {
        g.circle(O, r); g.dot(O, 4);
        if(mode==="tangent") {
          const d=M.dist(V,O);
          if(d<=r) { U.read("<p>Undefined: move V strictly outside for two tangents.</p>"); return; }
          const a=M.dirDeg(O,V), offset=Math.acos(r/d)*180/Math.PI;
          const T=M.polar(O,r,a+offset), S=M.polar(O,r,a-offset);
          g.seg(V,T);g.seg(V,S);g.seg(O,T,{dash:true});g.seg(O,S,{dash:true});
          g.right(O,T,V);g.right(O,S,V);lab(g,V,"V",O);lab(g,T,"T",O);lab(g,S,"S",O);
          U.read(`<p>Separate tangent construction: OT and OS are perpendicular to VT and VS. Measured angle V ≈ ${deg(M.angle(T,V,S))}. Tangents are not inferred from a near-secant.</p>`);return;
        }
        const d = M.dist(V, O), where = circleRegime(d,r);
        const hits = (X) => M.lineCircleX(V, X, O, r);
        const h1 = hits(A), h2 = hits(C);
        if (M.dist(V,A)<1e-9*r || M.dist(V,C)<1e-9*r || M.dist(A,C)<1e-9*r || h1.length < 2 || h2.length < 2) { U.read("<p>Undefined: choose distinct rays with two intersections. For tangents use Tangents mode.</p>"); return; }
        const other = (h, X) => (M.dist(h[0], X) > M.dist(h[1], X) ? h[0] : h[1]);
        const A2 = other(h1, A), C2 = other(h2, C);
        g.line(V, A, { w: "bold" }); g.line(V, C, { w: "bold" });
        [A, C, A2, C2].forEach((p) => g.dot(p, 4));
        lab(g, V, "V", O); lab(g, A, "A", O); lab(g, C, "C", O);
        const ang = M.angle(A, V, C);
        g.angle(A, V, C, 1, 60);
        let msg;
        if (where === "inside") { const x = arcAvoid(O, A, C, [A2, C2]), y = arcAvoid(O, A2, C2, [A, C]); msg = `Inside: angle = \u00bd(arc + vertical arc) = \u00bd(${deg(x)} + ${deg(y)}) = ${deg((x + y) / 2)}.`; }
        else if (where === "on") { const x = arcAvoid(O, A, C, [V]); msg = `On the circle: an inscribed angle, \u00bd \u00d7 ${deg(x)} = ${deg(x / 2)}.`; }
        else {
          const nA = M.dist(V, A) < M.dist(V, A2) ? A : A2, fA = nA === A ? A2 : A, nC = M.dist(V, C) < M.dist(V, C2) ? C : C2, fC = nC === C ? C2 : C;
          const far = arcAvoid(O, fA, fC, [nA, nC]), near = arcAvoid(O, nA, nC, [fA, fC]);
          msg = `Outside: angle = \u00bd(far arc \u2212 near arc) = \u00bd(${deg(far)} \u2212 ${deg(near)}) = ${deg((far - near) / 2)}. Choose Tangents for the separate tangent construction.`;
        }
        txt(g, P(1320, 760), `\u2220V = ${deg(ang)}`, { bold: true });
        U.read(`<p>${msg} Measured: ${deg(ang)}.</p>`);
      });
    }
  },
  circum: {
    title: "Circumcenter and circumcircle",
    how: "Drag the triangle, then step through. Try an obtuse triangle.",
    kind: "construction",
    mount(B, U) {
      const [A, Bb, C] = triPts(B);
      const base = (g) => shape(g, [A, Bb, C], ["A", "B", "C"], { w: "bold" });
      const bis = (p, q) => (g, t) => { const rr = M.dist(p, q) * 0.7, cs = M.circleX(p, rr, q, rr); cs.forEach((c) => { tick(g, p, rr, c, t, 8); tick(g, q, rr, c, t, 8); }); if (t >= 1) { const L = perpBisector(p, q); g.line(L[0], L[1], { w: "thin" }); g.ticks(p, M.mid(p, q), 1); g.ticks(M.mid(p, q), q, 1); } };
      const steps = [
        { say: "Construct the perpendicular bisector of AB.", draw: bis(A, Bb) },
        { say: "Construct the perpendicular bisector of BC.", draw: bis(Bb, C) },
        { say: "They meet at the circumcenter O. The third bisector passes through it too.", draw: (g, t) => { const O = M.circumcenter(A, Bb, C); if (!O) return; if (t >= 1) { const L = perpBisector(C, A); g.line(L[0], L[1], { w: "thin", dash: true }); g.dot(O, 6); lab(g, O, "O", P(O.x + 60, O.y + 100)); } } },
        { say: "With center O and radius OA, draw the circle. It passes through all three vertices.", draw: (g, t) => { const O = M.circumcenter(A, Bb, C); if (O) g.sweep(O, M.dist(O, A), M.dirDeg(O, A), M.dirDeg(O, A) - 0.1, t, { w: "main" }); } }
      ];
      steps.intro = "triangle ABC is given.";
      createSteps(B, U, steps, base, { done: "O is equally far from A, B and C. It is inside an acute triangle, on the hypotenuse of a right one, and outside an obtuse one." });
    }
  },
  incenter: {
    title: "Incenter and incircle",
    how: "Drag the triangle, then step through.",
    kind: "construction",
    mount(B, U) {
      const [A, Bb, C] = triPts(B);
      const bis = (v, p, q) => (g, t) => { const ra = 110, e1 = M.add(v, M.mul(M.unit(M.sub(p, v)), ra)), e2 = M.add(v, M.mul(M.unit(M.sub(q, v)), ra)); tick(g, v, ra, e1, t, 8); tick(g, v, ra, e2, t, 8); if (t >= 1) { const I = M.incenter(A, Bb, C); g.seg(v, M.lerp(v, I, 1.35), { w: "thin" }); g.angle(p, v, I, 1, 70); g.angle(I, v, q, 1, 80); } };
      const base = (g) => shape(g, [A, Bb, C], ["A", "B", "C"], { w: "bold" });
      const steps = [
        { say: "Bisect angle A.", draw: bis(A, Bb, C) },
        { say: "Bisect angle B.", draw: bis(Bb, C, A) },
        { say: "They meet at the incenter I (the bisector of C passes through it too).", draw: (g, t) => { const I = M.incenter(A, Bb, C); if (t >= 1) { g.seg(C, M.lerp(C, I, 1.35), { w: "thin", dash: true }); g.dot(I, 6); lab(g, I, "I", P(I.x, I.y - 100)); } } },
        { say: "Drop a perpendicular from I to AB, then draw the circle through its foot.", draw: (g, t) => { const I = M.incenter(A, Bb, C), F = M.foot(I, A, Bb); g.edge(I, F, t, { dash: true, w: "thin" }); if (t >= 1) { g.right(Bb, F, I); g.circle(I, M.dist(I, F), { w: "main" }); } } }
      ];
      steps.intro = "triangle ABC is given.";
      createSteps(B, U, steps, base, { done: "I is equally far from all three sides, so the incircle touches each one." });
    }
  },
  euler: {
    title: "All triangle centers and the Euler line",
    how: "Drag the triangle, then step through each center.",
    kind: "construction",
    mount(B, U) {
      const [A, Bb, C] = triPts(B, [[260, 760], [1180, 760], [520, 220]]);
      const T = () => [A, Bb, C];
      const base = (g) => shape(g, T(), ["A", "B", "C"], { w: "bold" });
      const steps = [
        { say: "Medians: join each vertex to the midpoint of the opposite side. They meet at the centroid G.", draw: (g, t) => { const [a, b, c] = T(); [[a, b, c], [b, c, a], [c, a, b]].forEach(([v, p, q]) => g.edge(v, M.mid(p, q), t, { w: "thin" })); if (t >= 1) { const G = M.centroid(a, b, c); g.dot(G, 6); lab(g, G, "G", P(G.x + 80, G.y + 60)); } } },
        { say: "Perpendicular bisectors meet at the circumcenter O.", draw: (g, t) => { const O = M.circumcenter(...T()); if (t >= 1 && O) { const [a, b, c] = T(); [[a, b], [b, c], [c, a]].forEach(([p, q]) => g.seg(M.mid(p, q), O, { w: "thin", dash: true })); g.dot(O, 6); lab(g, O, "O", P(O.x - 80, O.y + 60)); } } },
        { say: "Altitudes: drop a perpendicular from each vertex to the opposite line. They meet at the orthocenter H.", draw: (g, t) => { const [a, b, c] = T(); [[a, b, c], [b, c, a], [c, a, b]].forEach(([v, p, q]) => g.edge(v, M.foot(v, p, q), t, { w: "thin" })); if (t >= 1) { const H = M.orthocenter(a, b, c); g.dot(H, 6); lab(g, H, "H", P(H.x - 80, H.y - 60)); } } },
        { say: "H, G and O always line up on the Euler line, with HG = 2 GO.", draw: (g, t) => { const [a, b, c] = T(), G = M.centroid(a, b, c), O = M.circumcenter(a, b, c), H = M.orthocenter(a, b, c); if (!O || M.dist(H, O) < 2) return; g.edge(M.lerp(H, O, -0.6), M.lerp(H, O, 1.6), t, { w: "main" }); if (t >= 1) { g.ticks(H, G, 2); g.ticks(G, O, 1); txt(g, P(1300, 120), `HG ${num(M.dist(H, G) / 100, 2)}, GO ${num(M.dist(G, O) / 100, 2)}`, { small: true }); } } }
      ];
      steps.intro = "triangle ABC is given.";
      createSteps(B, U, steps, base, { done: "In an equilateral triangle all the centers coincide, so there is no line." });
    }
  },
  napoleon: {
    title: "Napoleon's theorem",
    how: "Drag the triangle. Build equilateral triangles outward on its sides and join their centers.",
    mount(B, U) {
      const [A, Bb, C] = triPts(B, [[520, 640], [1040, 680], [700, 330]]);
      B.draw((g) => {
        const T = [A, Bb, C], G = M.centroid(...T), cs = [];
        shape(g, T, ["A", "B", "C"], { w: "bold" });
        for (let i = 0; i < 3; i++) {
          const a = T[i], b = T[(i + 1) % 3], p1 = M.rotate(b, a, 60), p2 = M.rotate(b, a, -60), apex = M.dist(p1, G) > M.dist(p2, G) ? p1 : p2;
          g.poly([a, apex, b], { w: "thin" });
          const c = M.centroid(a, b, apex); cs.push(c); g.dot(c, 5);
        }
        g.poly(cs, { w: "bold" });
        const s = [0, 1, 2].map((i) => M.dist(cs[i], cs[(i + 1) % 3]) / 100);
        for (let i = 0; i < 3; i++) g.ticks(cs[i], cs[(i + 1) % 3], 1);
        U.read(`<p>Sides of the center triangle: ${s.map((x) => num(x, 2)).join(", ")}. Whatever the starting triangle, they are equal: the Napoleon triangle is equilateral.</p>`);
      });
    }
  }
};
