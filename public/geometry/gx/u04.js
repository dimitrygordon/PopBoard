// Unit 4 interactives: which three parts fix a triangle (4.2), SSA ambiguous case (4.11), copy a triangle by SSS (4.12).
import { rayTrianglePoints, isNondegenerateTriangle } from "../geo-invariants.js";
import { M, P, lab, txt, createSteps, deg, num, shape } from "./kit.js";

// triangle from SSS: base from A along direction 0, apex above
const sss = (A, a, b, c) => { const cs = M.circleX(A, b, P(A.x + c, A.y), a); return cs.length===2 ? [A, P(A.x + c, A.y), cs[0].y < cs[1].y ? cs[0] : cs[1]] : null; };

export function copyTriangleState(A,B,C,D) {
 const c=M.dist(A,B),b=M.dist(A,C),a=M.dist(B,C),E=P(D.x+c,D.y),scale=Math.max(a,b,c);
 if(!isNondegenerateTriangle(A,B,C))return {a,b,c,E,F:null};
 const cs=M.circleX(D,b,E,a);
 const distinct=cs.length===2&&M.dist(cs[0],cs[1])>1e-9*scale;
 const F=distinct?(cs[0].y<cs[1].y?cs[0]:cs[1]):null;
 return {a,b,c,E,F:F&&isNondegenerateTriangle(D,E,F)?F:null};
}

export const GX = {
  parts: {
    title: "Which three parts fix a triangle?",
    how: "Pick three parts. Drag the left triangle. On the right, look for a second triangle with the same three parts that is not congruent.",
    mount(B, U) {
      const A = B.point(140, 700, { label: "A" }), Bb = B.point(620, 700, { label: "B" }), C = B.point(320, 300, { label: "C" });
      let mode = "SSS";
      U.choice("Parts", [["SSS", "SSS"], ["SAS", "SAS"], ["ASA", "ASA"], ["SSA", "SSA"], ["AAA", "AAA"]], mode, (v) => { mode = v; B.update(); });
      B.draw((g) => {
        shape(g, [A, Bb, C], ["A", "B", "C"], { w: "bold" });
        const c = M.dist(A, Bb), b = M.dist(A, C), a = M.dist(Bb, C), angA = M.angle(Bb, A, C);
        if(c<1e-6 || b<1e-6 || a<1e-6 || Math.abs(M.cross(M.sub(Bb,A),M.sub(C,A)))<1e-9*c*b) { U.read("<p>Undefined: choose three distinct, noncollinear vertices.</p>");return; }
        const O = P(900, 700), out = [];
        if (mode === "SSS" || mode === "SAS" || mode === "ASA") { const t = sss(O, a, b, c); if (t) out.push(t); }
        if (mode === "SSA") {
          // angle A, side AB = c, side BC = a: C lies on the ray from A at distance a from B
          const dir = M.polar(O, 1, angA), Bp = P(O.x + c, O.y), xs = rayTrianglePoints(O, Bp, a, dir);
          for (const q of xs) out.push([O, Bp, q]);
        }
        if (mode === "AAA") { const k = 0.6, Bc = P(O.x + c * k, O.y), cs = M.circleX(O, b * k, Bc, a * k); if (cs.length) out.push([O, Bc, cs[0].y < cs[1].y ? cs[0] : cs[1]]); }
        out.forEach((t, i) => shape(g, t, ["A'", "B'", i ? "C''" : "C'"], { w: i ? "main" : "bold", dash: i > 0 }));
        const marks = { SSS: [[A, Bb, 1], [A, C, 2], [Bb, C, 3]], SAS: [[A, Bb, 1], [A, C, 2]], ASA: [[A, Bb, 1]], SSA: [[A, Bb, 1], [Bb, C, 2]], AAA: [] };
        for (const [p, q, n] of marks[mode]) g.ticks(p, q, n);
        if (mode !== "SSS") g.angle(Bb, A, C, 1, 60);
        if (mode === "ASA") g.angle(C, Bb, A, 2, 60);
        if (mode === "AAA") { g.angle(C, Bb, A, 2, 60); g.angle(A, C, Bb, 3, 60); }
        const verdict = {
          SSS: "Conjecture: SSS fixes a triangle up to congruence. Proof waits until 4.10.",
          SAS: "Conjecture: SAS fixes a triangle. Proof follows in 4.3.",
          ASA: "Conjecture: ASA fixes a triangle. Proof follows in 4.4.",
          SSA: out.length === 2 ? "SSA gives <b>two different triangles</b> here, so it does not fix the triangle." : `SSA gives ${out.length} triangle${out.length === 1 ? "" : "s"} for these lengths. Drag C to make BC shorter than AB and see a second one.`,
          AAA: "AAA gives the same shape at any size, so it does not fix the triangle (only its shape)."
        }[mode];
        // measurements go in the panel, not on the board, so they never cover point A on a phone
        U.read(`<p>AB ${num(c / 100, 2)}, AC ${num(b / 100, 2)}, BC ${num(a / 100, 2)}, \u2220A ${deg(angA)}</p><p>${verdict}</p>`);
      });
    }
  },
  ssa: {
    title: "SSA: the ambiguous case",
    how: "Drag B to set AB, and drag the hollow point on the bar to set the swinging side BC. Then step through.",
    kind: "construction",
    mount(B, U) {
      const A = B.point(200, 740, { label: "A" }), Bp = B.point(600, 440, { label: "B" }), R = B.point(1250.818510677892, 120, { label: "BC", constrain: (q) => P(M.clamp(q.x, 1060, 1540), 120) });
      const L = () => { const a = (R.x - 1040)*1.5, dir = P(1500, A.y), xs = rayTrianglePoints(A, Bp, a, dir).sort((p, q) => p.x - q.x); return { a, dir, xs }; };
      const base = (g) => {
        g.seg(P(1040, 120), R, { w: "bold" }); txt(g, P(1040, 70), "length of BC", { small: true, anchor: "start" });
        g.seg(A, P(1560, A.y)); g.arrow(A, P(1560, A.y)); g.seg(A, Bp, { w: "bold" });
        lab(g, A, "A", P(A.x + 50, A.y - 100)); lab(g, Bp, "B", A); g.angle(P(1500, A.y), A, Bp, 1, 70);
      };
      const steps = [
        { say: "Open the compass to the length BC. Put the needle on B.", draw: (g, t) => { const s = L(); g.sweep(Bp, s.a, 240, 300, t); } },
        { say: "Swing the arc across the ray from A. Count the crossings.", draw: (g, t) => { const s = L(); g.sweep(Bp, s.a, 180, 360, t); if (t >= 1) s.xs.forEach((q, i) => { g.dot(q); lab(g, q, i ? "C\u2082" : "C\u2081", P(q.x, q.y - 100)); }); } },
        { say: "Join B to each crossing. Each triangle has the same angle A, side AB and side BC.", draw: (g, t) => { const s = L(); s.xs.forEach((q, i) => g.edge(Bp, q, t, { w: i ? "main" : "bold", dash: i > 0 })); } }
      ];
      steps.intro = "angle A, side AB and a length for BC are given.";
      createSteps(B, U, steps, base, { done: "Count the crossings on the ray past A. Each one that makes a real triangle (not flat, not at A) counts once. A circle that just touches the ray counts once. One triangle does not always mean the circle just touches." });
      const slider=U.slider({label:"BC length",min:.3,max:7.5,step:.01,value:L().a/100,fmt:v=>num(v,2)},v=>{R.x=1040+v*100/1.5;B.update();});
      const sh = () => { const s = L();slider.set(s.a/100); const h = Math.abs(M.cross(M.unit(M.sub(s.dir, A)), M.sub(Bp, A))); U.read(`<p>BC = ${num(s.a / 100, 2)}, AB = ${num(M.dist(A, Bp) / 100, 2)}, height from B = ${num(h / 100, 2)}. Real triangles: <b>${s.xs.length}</b> (0, 1 or 2). One valid forward hit does not by itself imply tangency.</p>`); };
      const old = B.update; B.update = () => { old(); sh(); }; sh();
    }
  },
  copytri: {
    title: "Copy a triangle by SSS",
    how: "Drag the triangle or D, then step through.",
    kind: "construction",
    mount(B, U) {
      const A = B.point(160, 640, { label: "A" }), Bb = B.point(560, 680, { label: "B" }), C = B.point(300, 300, { label: "C" }), D = B.point(860, 700, { label: "D" });
      const L = () => copyTriangleState(A,Bb,C,D);
      const base = (g) => { shape(g, [A, Bb, C], ["A", "B", "C"], { w: "bold" }); g.seg(D, P(1580, D.y)); lab(g, D, "D", P(D.x + 50, D.y - 100)); };
      const steps = [
        { say: "Set the compass to AB. From D, mark E on the ray.", draw: (g, t) => { const s = L(); if(!s.F)return; g.sweep(D, s.c, -12, 12, t); if (t >= 1) { g.dot(s.E); lab(g, s.E, "E", P(s.E.x, s.E.y - 100)); g.seg(D, s.E, { w: "bold" }); } } },
        { say: "Set the compass to AC. From D, draw an arc above the ray.", draw: (g, t) => { const s = L(); if (s.F) { const d = M.dirDeg(D, s.F); g.sweep(D, s.b, d - 18, d + 18, t); } } },
        { say: "Set the compass to BC. From E, draw an arc crossing the first one at F.", draw: (g, t) => { const s = L(); if (s.F) { const d = M.dirDeg(s.E, s.F); g.sweep(s.E, s.a, d - 18, d + 18, t); if (t >= 1) { g.dot(s.F); lab(g, s.F, "F", P(s.F.x, s.F.y + 100)); } } } },
        { say: "Draw DF and EF. Triangle DEF has the same three sides, so it is congruent to ABC.", draw: (g, t) => { const s = L(); if (!s.F) return; g.edge(D, s.F, t, { w: "bold" }); g.edge(s.E, s.F, t, { w: "bold" }); if (t >= 1) { g.ticks(A, Bb, 1); g.ticks(D, s.E, 1); g.ticks(A, C, 2); g.ticks(D, s.F, 2); g.ticks(Bb, C, 3); g.ticks(s.E, s.F, 3); } } }
      ];
      steps.intro = "Triangle ABC and a ray from D are given.";
      createSteps(B, U, steps, base, { done: "SSS: three equal sides make the triangles congruent.", notice: () => L().F ? "" : "Undefined / flat input: choose three distinct, noncollinear vertices. Two distinct circle intersections are required before using SSS." });
    }
  }
};
