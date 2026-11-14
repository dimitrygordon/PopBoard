// Unit 1 interactives: illusion, chords, streets, earth, Sierpinski, Euclid I.1, truth table,
// kite definition tester (1.9), proof shuffle (1.10), and axiom wall (1.12).
import { M, P, lab, txt, createSteps, onCircle, num, tick, deg } from "./kit.js";

export const GX = {
  chords: {
    title: "Circle chord regions",
    how: "Choose how many points, drag them around the circle, and count the regions the chords make.",
    mount(B, U) {
      const c = P(560, 450), r = 360, start = [100, 157, 205, 262, 318, 20, 62, 240];
      const pts = start.map((d, i) => B.point(...Object.values(M.polar(c, r, d)), { label: String.fromCharCode(65 + i), constrain: onCircle(c, r) }));
      let n = 5, revealed = false, guess = 16;
      const show = () => pts.forEach((p, i) => (p.hidden = i >= n));
      U.slider({ label: "Points", min: 1, max: 8, value: n }, (v) => { n = v; revealed = false; show(); B.update(); });
      U.slider({ label: "Your guess", min: 1, max: 128, value: guess }, (v) => { guess = v; B.update(); });
      U.row();
      U.button("Count", () => { revealed = true; B.update(); });
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
        txt(g, P(1270, 400), revealed ? `${regions} regions` : "regions hidden", { bold: true });
        txt(g, P(1270, 470), `your guess: ${guess}`, { small: true });
        U.read(revealed
          ? `<p>You guessed <b>${guess}</b>. Count: <b>${regions}</b> regions. The doubling pattern predicts ${2 ** (n - 1)}.${n >= 6 ? " The pattern breaks." : ""}${cl.some((q) => q.n > 1) ? " Three chords meet at one point here, which loses a region. Drag a point a little." : ""}</p>`
          : `<p>${n} point${n > 1 ? "s" : ""}: predict the region count, then tap Count. The doubling pattern would guess ${2 ** (n - 1)}.</p>`);
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
        U.read(`<table class="gx-table"><tr><th>Stage</th><td>${n}</td></tr><tr><th>Triangles</th><td>3<sup>${n}</sup> = ${count}</td></tr><tr><th>Total perimeter of all shaded triangles</th><td>(3/2)<sup>${n}</sup> = ${num(per, 3)} times the start</td></tr><tr><th>Area</th><td>(3/4)<sup>${n}</sup> = ${num(area, 3)} of the start</td></tr></table><p>Each stage keeps 3 of the 4 smaller triangles. The shaded area shrinks to 3/4 of what it was, while the total perimeter of the shaded triangles grows to 3/2 of what it was. The outside edge of the big triangle never changes.</p>`);
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
        { say: "We assume the two circles cross. That is a stated assumption, not something we proved. Call a crossing point C. Draw AC and BC.", draw: (g, t) => { const { Bp, C } = L(); if (!C) return; g.dot(C); lab(g, C, "C", P(C.x, C.y + 100)); g.edge(A, C, t, { w: "bold" }); g.edge(Bp, C, t, { w: "bold" }); g.seg(A, Bp, { w: "bold" }); } }
      ];
      steps.intro = "segment PQ and a ray from A are given.";
      createSteps(B, U, steps, base, { done: "AC = AB and BC = BA (radii of equal circles), so all three sides are equal." });
    }
  }
  ,
  illusion: {
    title: "Fins illusion",
    how: "Change the fin angle on two equal segments. The length readout never moves. Guess which looks longer, then show the ruler.",
    mount(B, U) {
      let angle = 40, guess = null, ruler = false;
      const mid = 800, y1 = 280, y2 = 580, half = 260;
      U.slider({ label: "Fin angle", min: -50, max: 50, value: angle, fmt: (v) => `${v}\u00b0` }, (v) => { angle = v; B.update(); });
      U.row();
      for (const n of [1, 2, 3, 4, 5]) U.button(`Sure ${n}`, (b) => { guess = n; B.update(); });
      U.row();
      U.button("Show ruler", () => { ruler = true; B.update(); });
      const drawFins = (g, a, b, dir) => {
        const L = Math.hypot(b.x - a.x, b.y - a.y) || 1;
        const ux = (b.x - a.x) / L, uy = (b.y - a.y) / L;
        const len = 80;
        for (const end of [a, b]) {
          const out = end === a ? -1 : 1; // fins grow away from the segment
          for (const side of [-1, 1]) {
            const rot = side * dir * angle * Math.PI / 180;
            const vx = Math.cos(rot) * ux * out - Math.sin(rot) * uy;
            const vy = Math.sin(rot) * ux * out + Math.cos(rot) * uy;
            g.seg(end, P(end.x + vx * len, end.y + vy * len));
          }
        }
      };
      B.draw((g) => {
        const A = P(mid - half, y1), B1 = P(mid + half, y1), C = P(mid - half, y2), D = P(mid + half, y2);
        g.seg(A, B1, { w: "bold" }); g.seg(C, D, { w: "bold" });
        drawFins(g, A, B1, 1);
        drawFins(g, C, D, -1);
        lab(g, A, "A", P(A.x, A.y + 50)); lab(g, B1, "B", P(B1.x, B1.y + 50));
        lab(g, C, "C", P(C.x, C.y + 50)); lab(g, D, "D", P(D.x, D.y + 50));
        txt(g, P(mid, 120), "AB = CD = 8 units. The readout never changes.", {});
        if (ruler) {
          g.seg(P(mid - half, y1 + 90), P(mid + half, y1 + 90), { dash: true });
          g.seg(P(mid - half, y2 + 90), P(mid + half, y2 + 90), { dash: true });
          txt(g, P(mid, y1 + 130), "ruler: AB = 8", { small: true });
          txt(g, P(mid, y2 + 130), "ruler: CD = 8", { small: true });
        }
        U.read(`<p>Length readout: AB = 8 units, CD = 8 units.</p><p>${guess ? `You rated your guess at ${guess} out of 5.` : "Tap a Sure rating, then Show ruler."}${ruler ? " The ruler agrees with the readout: the segments were equal the whole time." : ""}</p>`);
      });
    }
  },
  streets: {
    title: "Street grid",
    how: "Drag two corners: one straight street always runs through them. Drag a third corner to test collinear. A fourth corner starts a second street. Turn on the overpass to lift that street out of the plane.",
    mount(B, U) {
      const A = B.point(360, 520, { label: "A" }), Bp = B.point(1100, 520, { label: "B" });
      const C = B.point(720, 240, { label: "C" }), D = B.point(1000, 760, { label: "D" });
      let over = false;
      U.choice("Overpass", [[false, "Same plane"], [true, "Overpass on CD"]], false, (v) => { over = v; B.update(); });
      const col = (p, q, r) => Math.abs((q.x - p.x) * (r.y - p.y) - (q.y - p.y) * (r.x - p.x)) < 400;
      const dir = (p, q) => { const L = Math.hypot(q.x - p.x, q.y - p.y) || 1; return P((q.x - p.x) / L, (q.y - p.y) / L); };
      const parallel = (a, b, c, d) => Math.abs(dir(a, b).x * dir(c, d).y - dir(a, b).y * dir(c, d).x) < 0.02;
      const meet = (a, b, c, d) => {
        const den = (a.x - b.x) * (c.y - d.y) - (a.y - b.y) * (c.x - d.x);
        if (Math.abs(den) < 1e-6) return null;
        const t = ((a.x - c.x) * (c.y - d.y) - (a.y - c.y) * (c.x - d.x)) / den;
        return P(a.x + t * (b.x - a.x), a.y + t * (b.y - a.y));
      };
      const extend = (g, a, b, opt) => {
        const u = dir(a, b);
        g.seg(P(a.x - u.x * 2000, a.y - u.y * 2000), P(a.x + u.x * 2000, a.y + u.y * 2000), opt);
      };
      B.draw((g) => {
        extend(g, A, Bp, { w: "bold" });
        extend(g, C, D, { w: "bold", dash: over });
        const onAB = col(A, Bp, C);
        const par = parallel(A, Bp, C, D);
        const x = !par && !over ? meet(A, Bp, C, D) : null;
        if (x && x.x > 40 && x.x < 1560 && x.y > 40 && x.y < 860) g.dot(x);
        let status = over ? (par ? "The streets never meet, but they are not parallel: they lie in different planes. That is a pair of skew lines." : "The streets never meet and are not parallel, because they do not lie in one plane. They are skew.")
          : par ? "The streets are parallel: same plane, never meet."
          : "The streets meet.";
        lab(g, A, "A", P(A.x, A.y + 48)); lab(g, Bp, "B", P(Bp.x, Bp.y + 48));
        lab(g, C, "C", P(C.x, C.y - 48)); lab(g, D, "D", P(D.x, D.y + 48));
        U.read(`<p>C is ${onAB ? "" : "not "}collinear with A and B.</p><p>${status}</p><p>Never meeting is not enough to be parallel; the lines must also be in one plane.</p>`);
      });
    }
  },
  earth: {
    title: "Round or flat?",
    how: "Toggle Round Earth or Flat Earth, move the Sun closer or farther, and drag the city sticks. Both models can make the same angle difference. Add a third city to tell them apart. On the Rays tab, changing a ray's length never changes the angle.",
    mount(B, U) {
      let model = "round", tab = "models", sunKm = 200000, third = false, rayLen = 280;
      const earth = P(620, 620), Rpx = 260, Rkm = 6371;
      // city positions as points; constrain depends on model
      const toRound = (q) => {
        const v = M.sub(q, earth); const L = Math.hypot(v.x, v.y) || 1;
        return P(earth.x + v.x / L * Rpx, earth.y + v.y / L * Rpx);
      };
      const groundY = 700;
      const toFlat = (q) => P(Math.max(120, Math.min(1480, q.x)), groundY);
      const A = B.point(...Object.values(toRound(P(earth.x - 80, earth.y - Rpx + 20))), { label: "A", constrain: (q) => model === "round" ? toRound(q) : toFlat(q) });
      const Bp = B.point(...Object.values(toRound(P(earth.x + 160, earth.y - Rpx + 60))), { label: "B", constrain: (q) => model === "round" ? toRound(q) : toFlat(q) });
      const C = B.point(...Object.values(toRound(P(earth.x + 320, earth.y - 80))), { label: "C", constrain: (q) => model === "round" ? toRound(q) : toFlat(q), hidden: true });
      const placeModel = () => {
        const fit = (p, target) => { p.x = target.x; p.y = target.y; };
        if (model === "round") { fit(A, toRound(A)); fit(Bp, toRound(Bp)); fit(C, toRound(C)); }
        else { if (A.y !== groundY) fit(A, P(400, groundY)); if (Bp.y !== groundY) fit(Bp, P(720, groundY)); if (C.y !== groundY) fit(C, P(1100, groundY)); }
        C.hidden = !third;
      };
      U.choice("Page", [["models", "Models"], ["rays", "Rays"]], "models", (v) => { tab = v; B.update(); });
      U.choice("Earth", [["round", "Round Earth"], ["flat", "Flat Earth"]], "round", (v) => { model = v; placeModel(); B.update(); });
      const far = 300000;
      U.slider({ label: "Sun distance", min: 1000, max: far, step: 500, value: sunKm, fmt: (v) => v >= far ? "very far" : `${v} km` }, (v) => { sunKm = v; B.update(); });
      U.row();
      U.button("Third city", (b) => { third = !third; placeModel(); b.setAttribute("aria-pressed", String(third)); B.update(); });
      U.slider({ label: "Ray length", min: 80, max: 500, value: rayLen, fmt: (v) => `${v}` }, (v) => { rayLen = v; B.update(); });
      const angleAt = (city, sun) => {
        // angle between local vertical and the sun direction, in degrees
        let up;
        if (model === "round") up = M.unit(M.sub(city, earth));
        else up = P(0, -1);
        const toSun = M.unit(M.sub(sun, city));
        const dot = Math.max(-1, Math.min(1, up.x * toSun.x + up.y * toSun.y));
        return Math.acos(dot) * 180 / Math.PI;
      };
      B.draw((g) => {
        if (tab === "rays") {
          const O = P(700, 500), u1 = P(1, 0), u2 = P(Math.cos(Math.PI / 6), -Math.sin(Math.PI / 6));
          g.seg(O, P(O.x + u1.x * rayLen, O.y + u1.y * rayLen), { w: "bold" });
          g.seg(O, P(O.x + u2.x * rayLen, O.y + u2.y * rayLen), { w: "bold" });
          g.dot(O);
          txt(g, P(700, 200), `Angle: ${deg(30)}`, { bold: true });
          U.read("<p>The angle readout stays 30 degrees when you change a ray's length. Only a change of direction would change the angle.</p>");
          return;
        }
        const farSun = sunKm >= far;
        const sun = model === "round"
          ? (farSun ? P(earth.x, earth.y - 2000) : P(earth.x, earth.y - Rpx - sunKm / Rkm * Rpx))
          : (farSun ? P(700, -2000) : P(700, groundY - sunKm / 20));
        if (model === "round") g.circle(earth, Rpx, { w: "bold" });
        else g.seg(P(80, groundY), P(1520, groundY), { w: "bold" });
        if (!farSun) { g.dot(sun); txt(g, P(sun.x, sun.y - 36), "Sun", { small: true }); }
        const cities = third ? [A, Bp, C] : [A, Bp];
        const angs = cities.map((p) => angleAt(p, sun));
        for (let i = 0; i < cities.length; i++) {
          const p = cities[i];
          const up = model === "round" ? M.unit(M.sub(p, earth)) : P(0, -1);
          g.seg(p, P(p.x + up.x * 70, p.y + up.y * 70), { w: "bold" });
          const toSun = M.unit(M.sub(sun, p));
          g.seg(p, P(p.x + toSun.x * 220, p.y + toSun.y * 220), { dash: true });
          txt(g, P(p.x + 70, p.y - 30), deg(angs[i]), { small: true });
        }
        const diffAB = Math.abs(angs[0] - angs[1]);
        let note = `A and B differ by ${deg(diffAB)}.`;
        if (angs.length === 3) {
          const dBC = Math.abs(angs[1] - angs[2]);
          note += ` B and C differ by ${deg(dBC)}. On a round Earth with a far Sun, equal steps in distance give equal steps in angle. On a flat Earth they do not.`;
        } else {
          note += " A flat Earth with a close Sun can copy one difference, about 7.2 degrees over 800 km if the Sun is about 6,300 km up. A third city tells the models apart.";
        }
        U.read(`<p>${model === "round" ? "Round Earth" : "Flat Earth"}. Sun: ${farSun ? "very far (rays nearly parallel)" : sunKm + " km"}.</p><p>${note}</p>`);
      });
    }
  },
  truth: {
    title: "Truth table",
    how: "Set P and Q to true or false. Watch 'if P then Q', its converse, its inverse and its contrapositive update.",
    mount(B, U) {
      let p = true, q = true;
      U.choice("P", [[true, "P true"], [false, "P false"]], true, (v) => { p = v; B.update(); });
      U.choice("Q", [[true, "Q true"], [false, "Q false"]], true, (v) => { q = v; B.update(); });
      const impl = (a, b) => !a || b;
      const tf = (v) => v ? "T" : "F";
      B.draw((g) => {
        const rows = [[true, true], [true, false], [false, true], [false, false]];
        const heads = ["P", "Q", "if P then Q", "converse", "inverse", "contrapositive"];
        const x0 = 80, y0 = 140, cw = [100, 100, 260, 230, 230, 300], rh = 90;
        let x = x0;
        heads.forEach((h, i) => { txt(g, P(x + cw[i] / 2, y0), h, { small: true }); x += cw[i]; });
        rows.forEach((row, r) => {
          const y = y0 + (r + 1) * rh;
          const vals = [row[0], row[1], impl(row[0], row[1]), impl(row[1], row[0]), impl(!row[0], !row[1]), impl(!row[1], !row[0])];
          const on = row[0] === p && row[1] === q;
          if (on) g.seg(P(x0, y + 28), P(x0 + cw.reduce((s, n) => s + n, 0) - 20, y + 28), { w: "thin" });
          x = x0;
          vals.forEach((v, i) => { txt(g, P(x + cw[i] / 2, y), tf(v), { bold: on }); x += cw[i]; });
        });
        const cur = impl(p, q), conv = impl(q, p), inv = impl(!p, !q), contra = impl(!q, !p);
        U.read(`<p>Current row: P = ${tf(p)}, Q = ${tf(q)}.</p><p>If P then Q: <b>${tf(cur)}</b>. Converse: ${tf(conv)}. Inverse: ${tf(inv)}. Contrapositive: <b>${tf(contra)}</b>.</p><p>The original and the contrapositive are always true or false together. The converse and the inverse stay together too, but they can differ from the original.</p>`);
      });
    }
  },

  kite: {
    title: "Definition tester",
    how: "Drag the four corners of a quadrilateral. Check the boxes that make up your test for kite. The panel says whether the shape passes your test, and whether it is a kite in this course. A rhombus counts as a kite.",
    mount(B, U) {
      const A = B.point(700, 180, { label: "A" });
      const Bb = B.point(1000, 430, { label: "B" });
      const C = B.point(700, 780, { label: "C" });
      const D = B.point(400, 430, { label: "D" });
      const presets = {
        kite: [[700, 180], [1000, 430], [700, 780], [400, 430]],
        rhombus: [[700, 200], [980, 450], [700, 700], [420, 450]],
        para: [[320, 260], [1100, 260], [980, 700], [200, 700]]
      };
      const place = (pts) => { [A, Bb, C, D].forEach((p, i) => { p.x = pts[i][0]; p.y = pts[i][1]; }); B.update(); };
      let usePairs = true, useAdj = false;
      U.button("Two pairs of equal sides", (b) => { usePairs = !usePairs; b.setAttribute("aria-pressed", String(usePairs)); B.update(); }, { pressed: true });
      U.button("Each equal pair is adjacent", (b) => { useAdj = !useAdj; b.setAttribute("aria-pressed", String(useAdj)); B.update(); }, { pressed: false });
      U.row();
      U.button("Make a kite", () => place(presets.kite));
      U.button("Make a rhombus", () => place(presets.rhombus));
      U.button("Make a parallelogram", () => place(presets.para));
      const eq = (x, y) => Math.abs(x - y) <= 16;
      B.draw((g) => {
        const pts = [A, Bb, C, D];
        g.poly(pts, { w: "bold" });
        const sides = [[A, Bb, "AB"], [Bb, C, "BC"], [C, D, "CD"], [D, A, "DA"]];
        const lens = sides.map(([p, q]) => M.dist(p, q));
        sides.forEach(([p, q, name], i) => {
          const mid = P((p.x + q.x) / 2, (p.y + q.y) / 2);
          const away = P(mid.x + (mid.x - 700) * 0.12, mid.y + (mid.y - 480) * 0.12);
          txt(g, away, `${name} = ${num(lens[i])}`, { small: true });
        });
        const [ab, bc, cd, da] = lens;
        const adjKite = (eq(ab, da) && eq(bc, cd)) || (eq(ab, bc) && eq(da, cd));
        const twoPairs = adjKite || (eq(ab, cd) && eq(da, bc));
        let studentPass = false;
        if (usePairs && useAdj) studentPass = adjKite;
        else if (usePairs) studentPass = twoPairs;
        else if (useAdj) studentPass = adjKite;
        const course = adjKite;
        const looseHitsPara = usePairs && !useAdj && twoPairs && !course;
        U.read(`<p>Your test: <b>${studentPass ? "PASS" : "FAIL"}</b>.</p><p>In this course: <b>${course ? "KITE" : "NOT A KITE"}</b>. A rhombus counts as a kite.</p>${looseHitsPara ? "<p>This parallelogram has two pairs of equal sides, so it passes a test that does not require the equal sides to be adjacent. Every adjacent pair has unequal lengths, so it is not a kite.</p>" : ""}`);
      });
    }
  },

  shuffle: {
    title: "Proof shuffle",
    how: "Drag the five lines of the first worked example into order. A line locks when every reason it needs sits above it. The Second check stays off the board.",
    mount(B, U) {
      const lines = [
        { id: 1, needs: [], step: "m = 2r and n = 2s, for some integers r and s.", reason: "Definition of a multiple of 2." },
        { id: 2, needs: [1], step: "m + n = 2r + 2s.", reason: "Substitution." },
        { id: 3, needs: [2], step: "2r + 2s = 2(r + s).", reason: "Distributive property." },
        { id: 4, needs: [1], step: "r + s is an integer.", reason: "Adding two integers gives an integer." },
        { id: 5, needs: [3, 4], step: "So m + n is a multiple of 2.", reason: "Definition of a multiple of 2." }
      ];
      const slotsY = [130, 290, 450, 610, 770];
      const colX = 800;
      const perm = () => {
        const a = lines.map((_, i) => i);
        for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
        return a;
      };
      const isValid = (order) => order.every((id, i) => lines[id - 1].needs.every((n) => order.indexOf(n) < i));
      let start = perm();
      while (isValid(start.map((i) => lines[i].id))) start = perm();
      const cards = lines.map((ln, i) => {
        const pt = B.point(colX, slotsY[start[i]], { label: String(ln.id) });
        pt.constrain = (q) => P(colX, q.y);
        return { ...ln, pt };
      });
      const pack = () => {
        const ordered = [...cards].sort((a, b) => a.pt.y - b.pt.y);
        ordered.forEach((c, i) => { if (!c.pt.grab) { c.pt.y = slotsY[i]; } });
        return ordered;
      };
      B.onChange((kind) => { if (kind === "end") { pack(); B.update(); } });
      U.button("Shuffle again", () => {
        let o = perm();
        while (isValid(o.map((i) => lines[i].id))) o = perm();
        cards.forEach((c, i) => { c.pt.y = slotsY[o[i]]; });
        B.update();
      });
      const wrap = (s, n = 52) => {
        const out = []; let line = "";
        for (const w of s.split(" ")) {
          const next = line ? line + " " + w : w;
          if (next.length > n && line) { out.push(line); line = w; } else line = next;
        }
        if (line) out.push(line);
        return out;
      };
      B.draw((g) => {
        const ordered = pack();
        const orderIds = ordered.map((c) => c.id);
        let lockedN = 0;
        ordered.forEach((c, i) => {
          const locked = c.needs.every((n) => orderIds.indexOf(n) < i);
          if (locked) lockedN++;
          const w = 1180, h = 136, x0 = colX - w / 2, y0 = c.pt.y - h / 2;
          g.poly([P(x0, y0), P(x0 + w, y0), P(x0 + w, y0 + h), P(x0, y0 + h)], { w: locked ? "bold" : "main" });
          const lines1 = wrap(`${c.id}. ${c.step}`);
          const lines2 = wrap(c.reason, 52);
          let y = y0 + 32;
          lines1.forEach((ln) => { txt(g, P(colX, y), ln, { small: true }); y += 28; });
          lines2.forEach((ln) => { txt(g, P(colX, y), ln, { small: true }); y += 28; });
          txt(g, P(x0 + w - 90, y0 + 28), locked ? "LOCKED" : "", { small: true, bold: true });
        });
        const all = isValid(orderIds);
        U.read(all
          ? "<p>All five lines lock in order. Each reason it needs sits above it.</p>"
          : `<p>${lockedN} of 5 lines locked. A line locks when every reason it needs sits above it. If a cycle appears, it would read LOOP and would not lock.</p>`);
      });
    }
  },

  wall: {
    title: "Axiom wall",
    how: "Drag statement cards onto the wall. Postulates go on the bottom row. A theorem locks only after you draw arrows to the cards it uses. Famous results that are not yet proved stay on the not-proved-yet strip. A cycle is marked LOOP and will not stick.",
    mount(B, U) {
      const cards = [
        { id: "line", kind: "postulate", text: "Every two different points lie on exactly one line.", needs: [], x: 280, y: 780 },
        { id: "UV", kind: "postulate", text: "Everything in U is in V.", needs: [], x: 820, y: 780 },
        { id: "W", kind: "definition", text: "W means in both U and V.", needs: [], x: 280, y: 560 },
        { id: "UW", kind: "theorem", text: "U=W", needs: ["UV", "W"], x: 820, y: 360 },
        { id: "tri", kind: "famous", text: "A triangle's angles add up to a straight angle.", needs: [], x: 1380, y: 260 },
        { id: "vert", kind: "famous", text: "Vertical angles are equal.", needs: [], x: 1380, y: 460 },
        { id: "T", kind: "loop", text: "Theorem T is proved using lemma L.", needs: ["L"], x: 1380, y: 660 },
        { id: "L", kind: "loop", text: "The only proof of L uses T.", needs: ["T"], x: 1380, y: 820 }
      ];
      const pts = cards.map((c) => {
        const pt = B.point(c.x, c.y, { label: "" });
        c.pt = pt;
        return pt;
      });
      let arrows = []; // {from, to} from child to parent
      let arrowMode = false, pending = null;
      const zone = (p) => {
        if (p.x >= 1180) return "strip";
        if (p.y >= 680) return "bottom";
        return "wall";
      };
      const edgesOf = () => {
        const e = arrows.map((a) => [a.from, a.to]);
        // implicit intended needs are not auto-drawn; only student arrows
        return e;
      };
      const hasCycle = (edges) => {
        const seen = {}, stack = {};
        const adj = {};
        cards.forEach((c) => { adj[c.id] = []; });
        edges.forEach(([f, t]) => { if (adj[f]) adj[f].push(t); });
        const visit = (id) => {
          if (stack[id]) return true;
          if (seen[id]) return false;
          seen[id] = stack[id] = true;
          for (const n of adj[id]) if (visit(n)) return true;
          stack[id] = false;
          return false;
        };
        return cards.some((c) => visit(c.id));
      };
      const cycNodes = (edges) => {
        // nodes that lie on any cycle
        const adj = {};
        cards.forEach((c) => { adj[c.id] = []; });
        edges.forEach(([f, t]) => { if (adj[f]) adj[f].push(t); });
        const on = new Set();
        const ids = cards.map((c) => c.id);
        const reach = (start) => {
          const seen = new Set();
          const st = [start];
          while (st.length) {
            const u = st.pop();
            if (seen.has(u)) continue;
            seen.add(u);
            for (const v of (adj[u] || [])) st.push(v);
          }
          return seen;
        };
        ids.forEach((a) => {
          ids.forEach((b) => {
            if (a === b) return;
            if (reach(a).has(b) && reach(b).has(a)) { on.add(a); on.add(b); }
          });
        });
        // self-loop
        edges.forEach(([f, t]) => { if (f === t) on.add(f); });
        return on;
      };
      const used = (child) => new Set(arrows.filter((a) => a.from === child).map((a) => a.to));
      const wrap = (s, n = 28) => {
        const out = []; let line = "";
        for (const w of s.split(" ")) {
          const next = line ? line + " " + w : w;
          if (next.length > n && line) { out.push(line); line = w; } else line = next;
        }
        if (line) out.push(line);
        return out;
      };
      const drawBtn = U.button("Draw arrow", (b) => {
        arrowMode = !arrowMode; pending = null;
        b.setAttribute("aria-pressed", String(arrowMode));
        B.update();
      }, { pressed: false });
      U.button("Clear arrows", () => { arrows = []; pending = null; B.update(); });
      U.button("Reset", () => { B.reset(); arrows = []; pending = null; arrowMode = false; drawBtn.setAttribute("aria-pressed", "false"); B.update(); });
      // click-without-drag selects a card in arrow mode
      cards.forEach((c) => {
        let down = null;
        c.pt.el.addEventListener("pointerdown", () => { down = { x: c.pt.x, y: c.pt.y }; });
        c.pt.el.addEventListener("pointerup", () => {
          if (!arrowMode || !down) return;
          if (Math.hypot(c.pt.x - down.x, c.pt.y - down.y) > 14) { down = null; return; }
          if (!pending) pending = c.id;
          else if (pending === c.id) pending = null;
          else {
            const from = pending, to = c.id;
            if (!arrows.some((a) => a.from === from && a.to === to) && from !== to) arrows.push({ from, to });
            pending = null;
          }
          down = null;
          B.update();
        });
      });
      B.draw((g) => {
        // zone guides
        g.seg(P(40, 680), P(1160, 680), { w: "thin", dash: true });
        g.seg(P(1180, 40), P(1180, 860), { w: "thin", dash: true });
        txt(g, P(600, 860), "Postulates (bottom row)", { small: true });
        txt(g, P(600, 80), "Theorems and definitions", { small: true });
        txt(g, P(1390, 80), "Not proved yet", { small: true });
        const edges = edgesOf();
        const loopSet = cycNodes(edges);
        const locked = {};
        cards.forEach((c) => {
          const z = zone(c.pt);
          const uses = used(c.id);
          const parentsOk = (c.needs || []).every((n) => uses.has(n));
          let stick = false, tag = "";
          if (loopSet.has(c.id)) { tag = "LOOP"; stick = false; }
          else if (c.kind === "postulate") { stick = z === "bottom"; tag = stick ? "ASSUMED" : "will not stick"; }
          else if (c.kind === "definition") { stick = z === "wall"; tag = stick ? "DEFINED" : (z === "bottom" ? "will not stick" : "DEFINED"); if (z === "strip") tag = "will not stick"; }
          else if (c.kind === "theorem") {
            if (z === "wall" && parentsOk) { stick = true; tag = "PROVED"; }
            else if (z === "wall" && !parentsOk) { tag = "needs arrows"; }
            else tag = "will not stick";
          } else if (c.kind === "famous") {
            stick = z === "strip";
            tag = stick ? "not proved yet" : "will not stick";
          } else if (c.kind === "loop") {
            tag = z === "wall" || z === "bottom" ? "will not stick" : "";
          }
          locked[c.id] = { stick, tag, z };
          const w = c.kind === "famous" || c.kind === "loop" ? 360 : 480;
          const h = 120, x0 = c.pt.x - w / 2, y0 = c.pt.y - h / 2;
          g.poly([P(x0, y0), P(x0 + w, y0), P(x0 + w, y0 + h), P(x0, y0 + h)], { w: stick ? "bold" : "thin" });
          const lines1 = wrap(c.text, c.kind === "famous" || c.kind === "loop" ? 22 : 28);
          let y = y0 + 34;
          lines1.forEach((ln) => { txt(g, P(c.pt.x, y), ln, { small: true }); y += 26; });
          txt(g, P(c.pt.x, y0 + h - 18), tag, { small: true, bold: true });
        });
        arrows.forEach((a) => {
          const from = cards.find((c) => c.id === a.from), to = cards.find((c) => c.id === a.to);
          if (!from || !to) return;
          g.seg(from.pt, to.pt, { w: "thin" });
          g.arrow(from.pt, to.pt);
        });
        if (pending) {
          const from = cards.find((c) => c.id === pending);
          if (from) txt(g, P(from.pt.x, from.pt.y - 78), "from here", { small: true, bold: true });
        }
        const uw = locked.UW;
        const cycle = loopSet.size > 0;
        U.read(`<p>${arrowMode ? (pending ? "Tap the card this statement uses." : "Tap a card, then tap the card it uses, to draw an arrow.") : "Drag cards onto the wall, or tap Draw arrow."}</p><p>U=W is ${uw && uw.stick ? "proved" : "a theorem only after arrows to \"Everything in U is in V\" and \"W means in both U and V\""}.${cycle ? " A cycle is marked LOOP and will not stick." : ""}</p>`);
      });
    }
  }
};

