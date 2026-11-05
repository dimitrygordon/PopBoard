// Unit 1 interactives: circle chord regions (1.2), Sierpinski stages (1.5), Euclid I.1 (1.6).
import { M, P, lab, txt, createSteps, onCircle, num, tick } from "./kit.js";

export const GX = {
  chords: {
    title: "Circle chord regions",
    how: "Choose how many points, drag them around the circle, and count the regions the chords make.",
    mount(B, U) {
      const c = P(560, 450), r = 360, start = [100, 157, 205, 262, 318, 20, 62, 240];
      const pts = start.map((d, i) => B.point(...Object.values(M.polar(c, r, d)), { label: String.fromCharCode(65 + i), constrain: onCircle(c, r) }));
      let n = 5;
      const show = () => pts.forEach((p, i) => (p.hidden = i >= n));
      U.slider({ label: "Points", min: 1, max: 8, value: n }, (v) => { n = v; show(); B.update(); });
      show();
      B.draw((g) => {
        const P_ = pts.slice(0, n), ch = [];
        g.circle(c, r);
        for (let i = 0; i < n; i++) for (let j = i + 1; j < n; j++) { ch.push([P_[i], P_[j]]); g.seg(P_[i], P_[j]); }
        // count interior crossings; three or more chords through one point merge into one crossing
        const xs = [];
        for (let i = 0; i < ch.length; i++) for (let j = i + 1; j < ch.length; j++) {
          const [a, b] = ch[i], [d, e] = ch[j];
          if ([a, b].includes(d) || [a, b].includes(e)) continue;
          const x = M.lineX(a, b, d, e);
          if (!x || M.dist(x, c) > r - 1) continue;
          const on = (p, q) => Math.abs(M.dist(p, x) + M.dist(x, q) - M.dist(p, q)) < 0.5;
          if (on(a, b) && on(d, e)) xs.push(x);
        }
        const cl = [];
        for (const x of xs) { const k = cl.find((q) => M.dist(q.p, x) < 4); if (k) k.n++; else cl.push({ p: x, n: 1 }); }
        // a point where k chords meet holds k(k-1)/2 pairs and adds k - 1 regions
        let regions = 1 + ch.length;
        for (const q of cl) { const k = (1 + Math.sqrt(1 + 8 * q.n)) / 2; regions += Math.round(k) - 1; }
        txt(g, P(1270, 330), `${n} points`, {});
        txt(g, P(1270, 400), `${regions} regions`, { bold: true });
        txt(g, P(1270, 470), `doubling guess: ${2 ** (n - 1)}`, { small: true });
        U.read(`<p>${n} point${n > 1 ? "s" : ""}: <b>${regions}</b> regions. The doubling pattern predicts ${2 ** (n - 1)}.${n >= 6 ? " The pattern breaks." : ""}${cl.some((q) => q.n > 1) ? " Three chords meet at one point here, which loses a region. Drag a point a little." : ""}</p>`);
      });
    }
  },
  sierpinski: {
    title: "Sierpinski triangle",
    how: "Step through the stages. Drag the corners if you like. Watch the count, the perimeter and the area.",
    mount(B, U) {
      const a = B.point(800, 70, { label: "A" }), b = B.point(1300, 830, { label: "B" }), cc = B.point(300, 830, { label: "C" });
      let n = 2;
      U.slider({ label: "Stage", min: 0, max: 6, value: n }, (v) => { n = v; B.update(); });
      const rec = (g, p, q, s, d) => {
        if (d === 0) { g.poly([p, q, s], { w: n > 4 ? "thin" : "main" }); return; }
        const pq = M.mid(p, q), qs = M.mid(q, s), sp = M.mid(s, p);
        rec(g, p, pq, sp, d - 1); rec(g, pq, q, qs, d - 1); rec(g, sp, qs, s, d - 1);
      };
      B.draw((g) => {
        rec(g, a, b, cc, n);
        const count = 3 ** n, per = (3 / 2) ** n, area = (3 / 4) ** n;
        U.read(`<table class="gx-table"><tr><th>Stage</th><td>${n}</td></tr><tr><th>Triangles</th><td>3<sup>${n}</sup> = ${count}</td></tr><tr><th>Perimeter</th><td>(3/2)<sup>${n}</sup> = ${num(per, 3)} times the start</td></tr><tr><th>Area</th><td>(3/4)<sup>${n}</sup> = ${num(area, 3)} of the start</td></tr></table><p>Each stage keeps 3 of the 4 smaller triangles, so the area shrinks by 3/4 while the perimeter grows by 3/2.</p>`);
      });
    }
  },
  euclid: {
    title: "Copy a segment, then build an equilateral triangle",
    how: "Drag P, Q or A, then step through. Compass and straightedge only.",
    kind: "construction",
    mount(B, U) {
      const Pp = B.point(240, 180, { label: "P" }), Q = B.point(560, 210, { label: "Q" }), A = B.point(560, 640, { label: "A" });
      const L = () => { const r = M.dist(Pp, Q), Bp = P(A.x + r, A.y), cs = M.circleX(A, r, Bp, r), C = cs.length ? (cs[0].y < cs[1].y ? cs[0] : cs[1]) : null; return { r, Bp, C }; };
      const base = (g) => {
        g.seg(Pp, Q, { w: "bold" }); g.seg(A, P(1560, A.y)); g.arrow(A, P(1560, A.y));
        lab(g, Pp, "P", Q); lab(g, Q, "Q", Pp); lab(g, A, "A", P(A.x, A.y - 100));
      };
      const steps = [
        { say: "Set the compass to PQ: needle on P, pencil on Q.", draw: (g, t) => tick(g, Pp, M.dist(Pp, Q), Q, t) },
        { say: "Keep that opening. Put the needle on A and swing an arc across the ray. Where it lands is B, so AB = PQ.", draw: (g, t) => { const { r, Bp } = L(); tick(g, A, r, Bp, t, 18); if (t >= 1) { g.dot(Bp); lab(g, Bp, "B", P(Bp.x, Bp.y - 100)); } } },
        { say: "Draw the circle with center A through B.", draw: (g, t) => { const { r } = L(); g.sweep(A, r, 0, 359.9, t); } },
        { say: "Draw the circle with center B through A.", draw: (g, t) => { const { r, Bp } = L(); g.sweep(Bp, r, 180, 179.9, t); } },
        { say: "The circles cross at C. Draw AC and BC.", draw: (g, t) => { const { Bp, C } = L(); if (!C) return; g.dot(C); lab(g, C, "C", P(C.x, C.y + 100)); g.edge(A, C, t, { w: "bold" }); g.edge(Bp, C, t, { w: "bold" }); g.seg(A, Bp, { w: "bold" }); } }
      ];
      steps.intro = "segment PQ and a ray from A are given.";
      createSteps(B, U, steps, base, { done: "AC = AB and BC = BA (radii of equal circles), so all three sides are equal." });
    }
  }
};
