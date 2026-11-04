// Geometry course: the drawing context every figure and interactive draws with. Pure strings, no DOM,
// so the build and the tests can render figures in node too. k scales SVG units per screen pixel and
// fs is the label size in SVG units.
import * as M from "./geo-math.js";
import * as S from "./geo-svg.js";
export function makeCtx(k, fs, BW, BH) {
    let out = "";
    const g = {
      k, fs,
      seg: (a, b, o = {}) => { out += S.seg(a, b, o, k); },
      line: (a, b, o = {}) => { out += S.fullLine(a, b, 4000, o, k); },
      ray: (a, b, o = {}) => { const u = M.unit(M.sub(b, a)); out += S.seg(a, M.add(a, M.mul(u, 4000)), o, k); },
      circle: (c, r, o = {}) => { out += S.circle(c, r, o, k); },
      arc: (c, r, a0, a1, o = {}) => { out += S.arc(c, r, a0, a1, o, k); },
      poly: (p, o = {}) => { out += S.poly(p, o, k); },
      path: (d, o = {}) => { out += S.path(d, o, k); },
      dot: (p, r = 5) => { out += S.dot(p, k, r); },
      arrow: (a, b) => { out += S.arrow(a, b, 16, k); },
      // angle mark radius r is in SVG units (it scales with the figure); extra arcs sit 9 screen px apart
      angle: (a, b, c, n = 1, r = 34) => { out += S.angleMark(a, b, c, r / k, n, k); },
      right: (a, b, c) => { out += S.rightMark(a, b, c, 18, k); },
      ticks: (a, b, n = 1) => { out += S.ticks(a, b, n, 9, k); },
      // label near p, pushed `off` screen pixels along direction (dx, dy)
      label: (p, s, o = {}) => {
        const off = (o.off == null ? 22 : o.off) * k, d = o.dir ? M.unit(o.dir) : M.P(0, -1);
        const size = o.small ? Math.max(13 * k, fs * 0.75) : fs;
        out += S.text(M.add(p, M.mul(d, off + (o.anchor ? 0 : size * 0.3))), s, size, { anchor: o.anchor, italic: o.italic, bold: o.bold });
      },
      // pencil compass mid-swing: needle at c, pencil tip at angle deg
      compass: (c, r, deg) => {
        const tip = M.polar(c, r, deg), m = M.mid(c, tip), hinge = M.add(m, M.mul(M.perp(M.unit(M.sub(tip, c))), -Math.min(r * 0.5, 160)));
        out += S.seg(c, hinge, { w: "main" }, k) + S.seg(hinge, tip, { w: "main" }, k) + S.circle(hinge, 7 * k, { w: "main", fill: "paper" }, k);
      },
      // compass arc that sweeps in with t (0..1), with the compass drawn while it is moving
      sweep: (c, r, a0, a1, t = 1, o = { w: "thin" }) => {
        let s = a1 - a0; while (s < 0) s += 360;
        const e = a0 + s * M.clamp(t, 0, 1);
        if (t > 0.001) out += S.arc(c, r, a0, e, o, k);
        if (t < 1 && t > 0) g.compass(c, r, e);
      },
      // straightedge stroke from a toward b, drawn in with t
      edge: (a, b, t = 1, o = {}) => { if (t > 0.001) out += S.seg(a, M.lerp(a, b, M.clamp(t, 0, 1)), o, k); },
      raw: (s) => { out += s; },
      W: BW, H: BH,
    get out() { return out; }
    };
    return g;
  }
