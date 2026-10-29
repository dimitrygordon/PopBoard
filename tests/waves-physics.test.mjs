import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import * as P from "../public/waves/waves-physics.js";

const close = (a, b, rel = 1e-9) => Math.abs(a - b) <= rel * Math.max(1e-12, Math.abs(b));
const pub = new URL("../public/", import.meta.url);
const read = (n) => readFileSync(new URL(n, pub), "utf8");
const doc = () => readFileSync(new URL("../docs/waves-science.md", import.meta.url), "utf8");

test("v = f lambda, T = 1/f, string speed sqrt(T/mu)", () => {
  assert.equal(P.waveSpeed(2, 1.5), 3);
  assert.equal(P.wavelength(343, 440), 343 / 440);
  assert.equal(P.period(4), 0.25);
  assert.ok(close(P.stringSpeed(20, 0.005), 63.2455532, 1e-8));
  assert.equal(P.SOUND_SPEED, 343);
});

test("travelling wave repeats every wavelength and every period, and moves at v", () => {
  const w = { A: 2, lambda: 0.8, f: 1.5, dir: 1 };
  for (const x of [0.1, 0.37, 1.2]) {
    assert.ok(Math.abs(P.travelling(x, 0.2, w) - P.travelling(x + w.lambda, 0.2, w)) < 1e-12);
    assert.ok(Math.abs(P.travelling(x, 0.2, w) - P.travelling(x, 0.2 + 1 / w.f, w)) < 1e-12);
    const v = w.f * w.lambda, dt = 0.13;
    assert.ok(Math.abs(P.travelling(x, 0, w) - P.travelling(x + v * dt, dt, w)) < 1e-12, "shape moves right at v");
  }
});

test("reflection: fixed end stays still and inverts; free end doubles and does not invert", () => {
  const base = { A: 2, w: 0.06, v: 0.6, L: 1, x0: 0.2 };
  for (const t of [0.5, 1.0, 1.33, 1.6]) assert.ok(Math.abs(P.pulseOnString(1, t, { ...base, end: "fixed" })) < 1e-9);
  const tHit = 0.8 / 0.6;
  assert.ok(close(P.pulseOnString(1, tHit, { ...base, end: "free" }), 4, 1e-12), "free end swings to 2A as the pulse arrives");
  const tBack = 1.4 / 0.6; // reflected pulse center at 2L - x0 - v t = 0.4
  assert.ok(P.pulseOnString(0.4, tBack, { ...base, end: "fixed" }) < -1.99);
  assert.ok(P.pulseOnString(0.4, tBack, { ...base, end: "free" }) > 1.99);
  assert.equal(P.reflectionSign("fixed"), -1);
  assert.equal(P.reflectionSign("free"), 1);
  assert.ok(close(P.roundTripTime(1, 0.5), 4));
});

test("superposition: displacements add; pulses pass through unchanged", () => {
  const p = { A1: 2, A2: -1, w: 0.06, v: 0.6, L: 1 };
  const tm = P.overlapTime(1, 0.6);
  const mid = P.twoPulses(0.5, tm, p);
  assert.ok(close(mid.sum, 1, 1e-9));
  assert.equal(P.peakWhenOverlapping(2, -1), 1);
  assert.equal(P.peakWhenOverlapping(2, 1.5), 3.5);
  const after = P.twoPulses(0.8, 2 * tm, p); // pulse 1 now at 0.8 with its own height
  assert.ok(close(after.sum, 2, 1e-6));
});

test("standing waves: f_n = n v / 2L, nodes never move, equals two opposite travelling waves", () => {
  const L = 1.2, v = 30;
  assert.ok(close(P.harmonicFrequency(3, v, L), 37.5));
  assert.ok(close(P.harmonicWavelength(3, L), 0.8));
  assert.deepEqual(P.nodePositions(2, 1), [0, 0.5, 1]);
  assert.deepEqual(P.antinodePositions(2, 1), [0.25, 0.75]);
  for (const n of [1, 2, 4]) for (const x of P.nodePositions(n, L)) for (const t of [0, 0.01, 0.033])
    assert.ok(Math.abs(P.standing(x, t, { A: 1, n, L, v })) < 1e-9);
  const n = 3, lam = P.harmonicWavelength(n, L), f = P.harmonicFrequency(n, v, L);
  for (const [x, t] of [[0.1, 0.002], [0.55, 0.013]]) {
    const sum = P.travelling(x, t, { A: 1, lambda: lam, f, dir: 1, phase: -Math.PI / 2 + Math.PI / 2 }) + P.travelling(x, t, { A: 1, lambda: lam, f, dir: -1 });
    assert.ok(Math.abs(sum - P.standing(x, t, { A: 1, n, L, v })) < 1e-9);
  }
});

test("two sources: path difference, constructive at m lambda, destructive at (m + 1/2) lambda", () => {
  const d = 0.06, lam = 0.05;
  const pd = P.pathDifference(0.3, 0, d);
  assert.ok(pd.delta < 1e-12);
  assert.equal(P.interferenceKind(0, lam), "constructive");
  assert.equal(P.interferenceKind(lam, lam), "constructive");
  assert.equal(P.interferenceKind(1.5 * lam, lam), "destructive");
  assert.equal(P.interferenceKind(0.3 * lam, lam), "in between");
  // far away, the m = 1 line sits at d sin(theta) = lambda
  const th = P.orderAngle(1, d, lam), R = 50;
  const far = P.pathDifference(R * Math.cos(th), R * Math.sin(th), d);
  assert.ok(Math.abs(far.delta / lam - 1) < 1e-3);
  assert.equal(P.maxOrder(d, lam), 1);
  assert.ok(Number.isNaN(P.orderAngle(2, d, lam)));
  // ripple field: antinodal line oscillates, nodal line nearly still
  const f = 5, srcs = [{ x: 0, y: d / 2 }, { x: 0, y: -d / 2 }];
  const thN = Math.asin(0.5 * lam / d), Rn = 0.3;
  let amax = 0, nmax = 0;
  for (let k = 0; k < 40; k++) {
    const t = 5 + k / (40 * f);
    amax = Math.max(amax, Math.abs(P.rippleHeight(Rn, 0, t, srcs, lam, f)));
    nmax = Math.max(nmax, Math.abs(P.rippleHeight(Rn * Math.cos(thN), Rn * Math.sin(thN), t, srcs, lam, f)));
  }
  assert.ok(nmax < 0.25 * amax, `${nmax} vs ${amax}`);
});

test("double slit: bright at d sin(theta) = m lambda, spacing lambda L / d, envelope zeros", () => {
  const lam = 650e-9, d = 0.25e-3, L = 2, a = P.SINGLE_SLIT_WIDTH;
  const o = { lambda: lam, d, a, slits: 2 };
  assert.ok(close(P.slitIntensity(0, o), 1));
  const th1 = P.fringeAngle(1, d, lam);
  assert.ok(close(d * Math.sin(th1), lam, 1e-12));
  assert.ok(P.slitIntensity(th1, o) > 0.9);
  assert.ok(P.slitIntensity(Math.asin(0.5 * lam / d), o) < 1e-20);
  assert.ok(close(P.fringeSpacing(lam, L, d), 5.2e-3, 1e-9));
  assert.ok(Math.abs(P.brightPosition(1, lam, L, d) / P.fringeSpacing(lam, L, d) - 1) < 1e-4, "small-angle spacing is very close");
  assert.ok(P.slitIntensity(P.singleSlitDark(1, a, lam), o) < 1e-20, "single-slit envelope zero");
  assert.ok(P.slitIntensity(P.singleSlitDark(1, d, lam), { ...o, a: d, slits: 1 }) < 1e-20);
  assert.ok(close(P.centralWidth(lam, L, d), 2 * L * Math.tan(Math.asin(lam / d))));
  assert.deepEqual(P.wavelengthRGB(650).slice(1), [0, 0]);
  assert.ok(P.wavelengthRGB(532)[1] === 255);
});

test("beats and Doppler", () => {
  assert.equal(P.beatFrequency(440, 443), 3);
  const s = P.beatSignal(0, 440, 443);
  assert.equal(s.env, 2);
  assert.ok(Math.abs(P.beatSignal(1 / 6, 440, 443).env) < 1e-9, "silent halfway through a 3 Hz beat");
  assert.ok(close(P.dopplerAhead(440, 34.3), 440 / 0.9, 1e-12));
  assert.ok(close(P.dopplerBehind(440, 34.3), 400, 1e-12));
  assert.ok(close(P.wavelengthAhead(440, 100) * P.dopplerAhead(440, 100), 343, 1e-12), "wave still moves at 343 m/s");
});

test("sliders: log, round-trip, and no shown value jumps 2x or more between adjacent steps", () => {
  for (const [k, s] of Object.entries(P.SLIDERS)) {
    assert.ok(s.min > 0 && s.max > s.min, k);
    assert.ok((s.max / s.min) ** (1 / P.STEPS) < 2, k);
    for (const step of [0, 37, 100, 200]) assert.equal(P.toSlider(k, P.fromSlider(k, step)), step);
    assert.ok(s.def >= s.min && s.def <= s.max, `${k} default in range`);
  }
  const variants = { basics: [{ kind: "transverse" }], reflect: [{ end: "fixed" }, { end: "free" }], superpose: [{ side: "same" }, { side: "opposite" }],
    standing: [1, 2, 3, 4, 5, 6].map((n) => ({ n })), ripple: [{ probe: { x: 0.3, y: 0.08 } }, { probe: { x: 0.05, y: -0.12 } }, { probe: { x: 0.4, y: 0 } }],
    slit: [{ slits: 2 }, { slits: 1 }], beats: [{}], doppler: [{}], sandbox: [{}] };
  let checked = 0;
  for (const mode of P.MODES) for (const v of variants[mode]) for (const k of P.MODE_SLIDERS[mode]) {
    let prev = null;
    for (let step = 0; step <= P.STEPS; step++) {
      const s = { ...P.defaults(), ...v, [k]: P.fromSlider(k, step) };
      const r = P.readouts(mode, s);
      if (prev) for (const [name, val] of Object.entries(r)) {
        if (typeof val !== "number") continue;
        const a = Math.abs(val), b = Math.abs(prev[name]);
        if (a === b) continue;
        assert.ok(a > 0 && b > 0 && Math.max(a, b) / Math.min(a, b) < 2, `${mode} ${k} step ${step} ${name}: ${prev[name]} -> ${val}`);
        checked++;
      }
      prev = r;
    }
  }
  assert.ok(checked > 5000);
});

test("deep links parse modes with aliases and fall back to basics", () => {
  assert.equal(P.parseQuery("?mode=sandbox").mode, "sandbox");
  assert.equal(P.parseQuery("?mode=free").mode, "sandbox");
  assert.equal(P.parseQuery("?mode=Double-Slit").mode, "slit");
  assert.equal(P.parseQuery("?mode=harmonics").mode, "standing");
  assert.equal(P.parseQuery("?mode=nope").mode, "basics");
  assert.equal(P.parseQuery("").mode, "basics");
  for (const m of P.MODES) assert.equal(P.parseQuery(`?mode=${m}&board=b1`).mode, m);
});

test("page, gallery card, theme and module files follow the study pattern", () => {
  const html = read("study-waves.html");
  assert.match(html, /data-study-back/);
  assert.match(html, /waves\/waves-ui\.js/);
  assert.doesNotMatch(html, /firebase|getAuth|signIn/i);
  assert.match(html, /prefers-color-scheme: dark/);
  assert.match(html, /popboard\.waves\.theme/);
  assert.match(html, /id="themeBtn"/);
  for (const m of P.MODES) assert.match(html, new RegExp(`data-show="${m}"`), m);
  const ui = read("waves/waves-ui.js"), render = read("waves/waves-render.js");
  assert.doesNotMatch(ui + render, /firebase|getAuth|signIn/i);
  assert.match(ui, /forwardStudyQuery/);
  assert.match(ui, /location\.href = "study\.html" \+ location\.search/);
  assert.match(ui, /prefers-reduced-motion/);
  assert.match(ui, /prefers-color-scheme: dark/);
  assert.match(ui, /localStorage\.setItem\(THEME_KEY/);
  const phys = read("waves/waves-physics.js");
  assert.doesNotMatch(phys, /\bdocument\b|\bwindow\b|getContext|localStorage|\bImage\(/);
  const gallery = read("study.html");
  assert.match(gallery, /id: "waves"/);
  assert.match(gallery, /file: "study-waves\.html"/);
  const css = read("waves/waves-theme.css");
  assert.match(css, /--wv-hit: 44px/);
  assert.match(css, /min-height: var\(--wv-hit\)/);
  assert.match(css, /:root\[data-theme="dark"\]/);
  assert.match(css, /prefers-reduced-motion/);
});

test("WebP only, every asset the renderer asks for ships, stacked layers drop their halo", () => {
  const shipped = readdirSync(new URL("waves/assets/", pub));
  for (const n of shipped) assert.match(n, /\.webp$/);
  const render = read("waves/waves-render.js");
  const used = render.match(/ART_NAMES = \[([^\]]+)\]/)[1].match(/"([a-z-]+)"/g).map((n) => n.slice(1, -1));
  assert.ok(used.length >= 10);
  for (const n of used) assert.ok(shipped.includes(n + ".webp"), n);
  const stacked = render.match(/STACKED = \[([^\]]+)\]/)[1].match(/"([a-z-]+)"/g).map((n) => n.slice(1, -1));
  for (const n of ["wave-dipper", "barrier-double-slit", "barrier-single-slit", "ripple-barrier-double-slit", "c-clamp", "speaker"]) {
    assert.ok(stacked.includes(n), n);
    assert.match(render, new RegExp(`img\\["?${n.replace(/-/g, "\\-")}Bare|img\\[bar \\+ "Bare"\\]|img\\.${n}Bare`), `${n} drawn bare`);
  }
});

test("theme tokens keep text and lines readable (WCAG AA 4.5:1) in light and dark", () => {
  const css = read("waves/waves-theme.css");
  const block = (sel) => { const i = css.indexOf(sel); return css.slice(i, css.indexOf("}", i)); };
  const light = block(":root {"), dark = block(':root[data-theme="dark"]');
  const tok = (b, name) => (b.match(new RegExp(`--wv-${name}:\\s*(#[0-9a-f]{6})`)) || light.match(new RegExp(`--wv-${name}:\\s*(#[0-9a-f]{6})`)))[1];
  const lum = (hex) => {
    const c = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255).map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const ratio = (a, b) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };
  for (const [b, name] of [[light, "light"], [dark, "dark"]]) {
    for (const fg of ["ink", "ink-dim", "wave", "wave2", "sum", "node"]) assert.ok(ratio(tok(b, fg), tok(b, "paper")) >= 4.5, `${name} ${fg}`);
    assert.ok(ratio(tok(b, "ink"), tok(b, "chip")) >= 4.5, `${name} chip text`);
    assert.ok(ratio(tok(b, "paper"), tok(b, "ink")) >= 4.5, `${name} pressed chip`);
    assert.ok(ratio(tok(b, "text"), tok(b, "chrome")) >= 4.5, `${name} header text`);
    assert.ok(ratio(tok(b, "text"), tok(b, "btn")) >= 4.5, `${name} header button`);
    assert.ok(ratio("#1c1c1c", tok(b, "accent")) >= 4.5, `${name} active tab`);
  }
});

test("art anchors match MANIFEST", () => {
  assert.deepEqual(P.ART.posts.left, [80, 128]);
  assert.deepEqual(P.ART.posts.right, [944, 128]);
  assert.deepEqual(P.ART.barrier.plate, [312, 112, 712, 912]);
  assert.deepEqual(P.ART.barrier.double.xs, [452, 572]);
  assert.equal(P.ART.barrier.double.w, 28);
  assert.deepEqual(P.ART.rippleBarrier.doubleGaps, [412, 612]);
  assert.equal(P.ART.rippleBarrier.gapH, 60);
  assert.deepEqual(P.ART.screen.panel, [212, 92, 812, 772]);
});

test("no em-dashes in the new files", () => {
  const files = ["study-waves.html", ...readdirSync(new URL("waves/", pub)).filter((n) => /\.(js|css)$/.test(n)).map((n) => "waves/" + n)];
  for (const f of files) assert.doesNotMatch(read(f), /\u2014/, f);
  assert.doesNotMatch(doc(), /\u2014/);
  assert.doesNotMatch(readFileSync(new URL("./waves-physics.test.mjs", import.meta.url), "utf8"), /\u2014/);
  const card = read("study.html").match(/id: "waves"[\s\S]*?file:/)[0];
  assert.doesNotMatch(card, /\u2014/);
});

test("science doc covers every equation and constant shown", () => {
  const d = doc();
  for (const s of ["v = f", "T = 1/f", "sqrt(T/", "2L/n", "nv/(2L)", "d sin", "a sin", "lambda L / d", "|f1 - f2|", "v/(v - vs)", "v/(v + vs)", "343", "0.25 m/s", "5 g/m", "440", "0.02 mm", "Sources"])
    assert.ok(d.includes(s), s);
});
