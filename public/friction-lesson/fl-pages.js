// Dimitry's Friction Lesson: 33 pages in deck order. Wording follows the deck "Friction Lesson: Projected Slides";
// layers, timings, and layout follow /workspace/friction-storyboard/spec.md. Times are seconds from page enter.
import { h, at, img, fx, STATIC_BOX as SB, KINETIC_BOX as KB, risePoint, riseWipeRight, EASE } from "./fl-engine.js";

export const LAB_URL = "https://popboard.us/study-friction";
const SWATCHES = ["felt", "cork", "plastic", "paper", "cloth", "cardboard", "aluminum"];

/* ---------- shared pieces ---------- */
function card(scene, x, y, w, { keep = false, tilt = "" } = {}) {
  return at(scene, h("div", "card" + (keep ? " keep" : "") + (tilt ? " " + tilt : "")), x, y, w);
}
function say(scene, html, x, y, w, cls = "") { return at(scene, h("div", "say " + cls, fx(html)), x, y, w); }
function tag(parent, text, x, y, cls = "") { return at(parent, h("div", "tag " + cls, fx(text)), x, y); }

// Stack graph layers in one box so they register. names: draw order bottom to top.
function layers(parent, names) {
  const box = h("div", "layers");
  const L = {};
  names.forEach((n) => { L[n] = img(n); box.appendChild(L[n]); });
  parent.appendChild(box);
  return L;
}
const STATIC_ORDER = ["static_band_static", "static_band_threshold", "static_band_kinetic", "static_axes", "static_seg1_rise", "static_seg2_drop", "static_seg3_kinetic", "static_peak_dot", "static_label_max", "static_label_kinetic_eq", "region_label_static", "region_label_threshold", "region_label_kinetic", "region_tag_1", "region_tag_2", "region_tag_3"];
function staticGraph(parent, want) { return layers(parent, STATIC_ORDER.filter((n) => want.includes(n))); }

// Sled + string + spring scale + hand. weights: subset of ["1000","500","200"].
function rig(scene, x, y, w, { weights = ["1000"], hand = true, reading = false } = {}) {
  const r = at(scene, h("div", "rig"), x, y, w);
  const sledG = h("div", "r", null, { inset: "0" });
  const sled = img("sled", "cut r sled"); sledG.appendChild(sled);
  const W = {};
  weights.forEach((g) => { W[g] = img("weight_" + g + "g", "cut r w" + g); sledG.appendChild(W[g]); });
  const pull = h("div", "r", null, { inset: "0" });
  const string = h("div", "r string");
  const scale = h("div", "r scale");
  scale.appendChild(img("scale_body"));
  const needle = h("div", "needle"); needle.appendChild(img("scale_needle")); scale.appendChild(needle);
  pull.append(string, scale);
  let handEl = null;
  if (hand) { handEl = img("hand_pull", "cut r hand"); pull.appendChild(handEl); }
  r.append(sledG, pull);
  let readEl = null;
  if (reading) { readEl = h("div", "r reading", "0.0 N"); pull.appendChild(readEl); }
  return { r, sledG, sled, W, pull, needle, hand: handEl, scale, readEl };
}
function carpet(scene, x, y, w) { const c = at(scene, img("carpet_strip", "cut carpet"), x, y, w); return c; }

// Force arrow growing from a point (x,y in % of parent), length in cqw, angle in deg.
function farrow(parent, x, y, len, deg, color, label, lpos = {}) {
  const a = at(parent, h("div", "farrow"), x, y);
  a.style.width = len + "cqw"; a.style.color = color; a.style.rotate = deg + "deg"; a.style.translate = "0 -50%";
  if (label) { const l = h("span", "fl", fx(label)); Object.assign(l.style, { color, ...lpos }); if (Math.abs(deg) === 180) l.style.rotate = "180deg"; if (deg === 90 || deg === -90) l.style.rotate = (-deg) + "deg"; a.appendChild(l); }
  return a;
}

// Magnifier lens: the micro_contact drawing with overlay rings on its three red contact circles.
const CONTACTS = [[190 / 863, 350 / 720], [410 / 863, 350 / 720], [718 / 863, 350 / 720]];
function lens(parent, x, y, w, { filter = "" } = {}) {
  const l = at(parent, h("div", "lens"), x, y, w);
  const pic = img("micro_contact"); if (filter) pic.style.filter = filter;
  l.appendChild(pic);
  const rings = CONTACTS.map(([cx, cy]) => { const r = h("i", "ring"); r.style.left = cx * 100 + "%"; r.style.top = cy * 100 + "%"; l.appendChild(r); return r; });
  return { l, pic, rings };
}

function swatchRow(scene, x, y, w, { labels = true, size = 0.11 } = {}) {
  const row = at(scene, h("div", "", null, { display: "flex", justifyContent: "space-between", alignItems: "flex-end" }), x, y, w);
  const items = SWATCHES.map((s) => {
    const it = h("div", "", null, { width: size * 100 + "%" });
    it.appendChild(img("swatch_" + s));
    if (labels) it.appendChild(h("div", "lbl", s.toUpperCase()));
    row.appendChild(it);
    return it;
  });
  return { row, items };
}

function hookPage(n, title, hook, tryIt, wonder, art, extra = {}) {
  return {
    title, kicker: `ENRICHMENT (OPTIONAL) · FRICTION MYSTERY ${n} OF 7`,
    side: `<p class="wonder-row"><b>! HOOK</b> ${hook}</p><p class="wonder-row side-only"><b>+ TRY IT</b> ${tryIt}</p><p class="wonder-row"><b class="q">? WONDER</b> <span class="q">${wonder}</span></p>${extra.side || ""}`,
    cap: wonder,
    build(scene, T) {
      const rows = [...document.querySelectorAll("#flSide .wonder-row")];
      [0, 1.2, 2.4].forEach((t, i) => rows[i] && T.fadeUp(rows[i], t, 0.5));
      art(scene, T);
    },
  };
}

/* ---------- the pages ---------- */
export const PAGES = [
  { // 1
    title: "Friction Lab:", kicker: "PHYSICS I",
    side: `<p class="kicker" id="p1k">PHYSICS I</p><h2 id="p1t">Friction Lab:</h2><p class="t-head" id="p1s" style="font-size:2.2cqw">WHICH SURFACE GRABS HARDEST?</p>`,
    cap: "WHICH SURFACE GRABS HARDEST?", noKicker: true,
    build(scene, T) {
      const c = card(scene, 6, 4, 88); c.appendChild(img("title_cover_scene"));
      T.fade(c, 0, 0.8); T.A(c, [{ transform: "rotate(2deg)" }, { transform: "rotate(0deg)" }], 0, 0.8);
      const pa = at(scene, img("pull_arrow"), 74, 74, 14); T.wipe(pa, 1.0, 0.6, 0, 1);
      const ft = at(scene, h("div", "fs-only say big", "Friction Lab:<br><span class='t-head' style='font-size:.55em'>WHICH SURFACE GRABS HARDEST?</span>"), 10, 7, 60);
      T.wipe(ft, 0.6, 1.0, 0, 1, EASE.out);
      const t = document.getElementById("p1t"), s = document.getElementById("p1s"), k = document.getElementById("p1k");
      T.wipe(t, 0.6, 1.0, 0, 1, EASE.out); T.fade(s, 1.4, 0.5); T.fade(k, 2.0, 0.4);
    },
  },
  { // 2
    title: "LEARNING TARGETS", kicker: "TODAY · WHAT YOU WILL BE ABLE TO DO",
    side: `<p>Three targets for today.</p>`,
    cap: "TODAY · WHAT YOU WILL BE ABLE TO DO",
    build(scene, T) {
      const hd = say(scene, "LEARNING TARGETS", 6, 4, 60, "big"); T.fade(hd, 0, 0.4);
      const rows = [
        ["1", "I can measure friction force and normal force.", () => { const d = h("div", "", null, { display: "flex", gap: "1cqw" }); const a = img("term_Ffk", "cut"); a.style.width = "9cqw"; const b = img("term_FN", "cut"); b.style.width = "7cqw"; d.append(a, b); return d; }],
        ["2", "I can find the coefficient of kinetic friction (μk) from a graph.", () => { const a = img("term_muk", "cut"); a.style.width = "7cqw"; return a; }],
        ["3", "I can measure the coefficient of static friction (μs) and compare it with μk.", () => h("span", "mu-chip", fx("μs"))],
      ];
      rows.forEach(([n, text, icon], i) => {
        const y = 20 + i * 26;
        const row = at(scene, h("div", "", `<span class="t-title" style="font-size:4cqw;color:var(--orange);margin-right:1.5cqw">${n}</span><span style="font-size:2.5cqw">${fx(text)}</span>`, { display: "flex", alignItems: "center" }), 6, y, 62);
        const ic = at(scene, icon(), 72, y - 1);
        T.fadeUp(row, 0.5 + i, 0.5); T.pop(ic, 0.5 + i);
      });
      const sc = at(scene, img("scale_body"), 70, 86, 22); T.fade(sc, 0.2, 0.6);
    },
  },
  { // 3
    title: "PREDICT", kicker: "ENGAGE · BEFORE ANY DATA",
    side: `<p>Seven cart bottoms, one felt carpet.</p><p class="q" id="p3q">Which will need the MOST force to drag?<br>The LEAST?</p><p id="p3c">Write it in the CLAIM box, with one reason.</p>`,
    cap: "Which will need the MOST force to drag? The LEAST?",
    build(scene, T) {
      const cp = carpet(scene, 2, 74, 96); T.wipe(cp, 0, 0.8, 0, 1, EASE.out);
      const { items } = swatchRow(scene, 4, 30, 92, { size: 0.12 });
      items.forEach((it, i) => T.drop(it, 0.6 + i * 0.25, 3));
      T.fade(document.getElementById("p3q"), 3.0); T.fade(document.getElementById("p3c"), 3.2);
      const q = say(scene, "?", 47, 4, 6, "big"); q.style.fontSize = "7cqw"; q.style.color = "var(--red)";
      T.fade(q, 3.6, 0.2); T.wiggle(q, 3.8, 6, 0.6); T.wiggle(q, 4.4, 6, 0.6);
    },
  },
  { // 4
    title: "WHY SURFACES GRIP", kicker: "EXPLORE · ASPERITIES",
    side: `<p>Even smooth-looking surfaces are mountain ranges at the microscopic scale.</p><p id="p4a">These tiny peaks are called asperities. Only their tips touch.</p><p id="p4b">Press harder (bigger FN) and the tips squash together, making more real contact and more friction.</p><p class="q">Question: If I press harder, what happens to the tips?</p>`,
    cap: "If I press harder, what happens to the tips?",
    build(scene, T) {
      const cp = carpet(scene, 2, 22, 22); const s = at(scene, img("sled"), 4, 12, 16);
      T.fade(cp, 0, 0.4); T.fade(s, 0, 0.4);
      const L = lens(scene, 30, 2, 52);
      L.l.style.transformOrigin = "-30% 20%";
      T.fade(L.l, 0.6, 0.3); T.A(L.l, [{ transform: "scale(.1)" }, { transform: "scale(1)" }], 0.6, 1.0, EASE.inout);
      L.rings.forEach((r, i) => T.pulse(r, 1.8 + i * 0.2));
      const lab = tag(scene, "light press", 6, 40); T.fade(lab, 2.8, 0.4);
      const lab2 = tag(scene, "press harder / bigger FN", 6, 40, "red"); T.fade(lab2, 3.6, 0.3); T.fadeOut(lab, 3.6);
      T.A(L.pic, [{ transform: "scaleY(1)" }, { transform: "scaleY(.985)" }], 3.6, 0.6, EASE.inout);
      L.rings.forEach((r) => T.A(r, [{ transform: "scale(1)" }, { transform: "scale(1.3)" }], 3.6, 0.6, EASE.inout));
      const cap = say(scene, "These tiny peaks are called asperities. Only their tips touch.", 6, 90, 80); T.fade(cap, 4.6);
      T.fade(document.getElementById("p4a"), 4.6); T.fade(document.getElementById("p4b"), 3.8);
    },
  },
  { // 5
    title: "FORCES ON THE CART", kicker: "EXPLAIN · FREE-BODY DIAGRAM",
    side: `<p>Four forces: pull (scale) forward, Ff,kinetic backward, gravity (mg) down, FN up.</p><p>Level surface: FN = mg.</p><p id="p5c">Constant velocity means the forces balance, so the scale reading = Ff,kinetic.</p>`,
    cap: "Level surface: FN = mg.",
    build(scene, T) {
      carpet(scene, 0, 80, 100);
      const R = rig(scene, 6, 34, 70, { weights: ["1000"] });
      T.fade(R.sledG, 0, 0.5); T.slideIn(R.pull, 0.6, 0.6, 8);
      T.needle(R.needle, 0.6, 0.6, 0, 4.3, EASE.out);
      T.move(R.r, 1.4, 2.0, 6, 0, EASE.linear);
      const fb = h("div", "p", null, { left: "17%", top: "84%" }); R.r.appendChild(fb);
      const ax = farrow(fb, 0, 0, 12, 0, "#6FA3E0", "pull (scale)", { top: "-3cqw", left: "2cqw" });
      const fk = farrow(fb, 0, 0, 12, 180, "#B8322A", "Ff,kinetic", { top: "1.4cqw", left: "2cqw" });
      const mg = farrow(fb, 0, 0, 10, 90, "#6B6B6B", "gravity (mg)", { top: "1.5cqw", left: "4cqw" });
      const fn = farrow(fb, 0, 0, 10, -90, "#2F7A40", "FN", { top: "1.5cqw", left: "4cqw" });
      [ax, fk, mg, fn].forEach((a, i) => T.grow(a, 1.6 + i * 0.4, 0.4));
      const eq = tag(scene, "equal length: forces balance", 50, 12); T.pop(eq, 3.6);
      T.fade(document.getElementById("p5c"), 4.2);
    },
  },
  { // 6
    title: "CLAIM YOUR STATION", kicker: "EXPLORE · PICK A MATERIAL",
    side: `<p>7 stations: felt, cork, plastic, paper, cloth, cardboard, aluminum.</p><p>▲▼ Pick the material you predict is highest OR lowest.</p><p>1st First come, first served.</p><p id="p6r">↺ If yours is taken, pick from what is left.</p>`,
    cap: "Pick the material you predict is highest OR lowest.",
    build(scene, T) {
      const { row, items } = swatchRow(scene, 4, 36, 92, { size: 0.12 });
      items.forEach((it, i) => { const n = h("div", "lbl t-title", String(i + 1)); n.style.fontSize = "2.4cqw"; it.prepend(n); });
      T.fade(row, 0, 0.6);
      const ud = at(scene, h("div", "chip", "▲▼"), 46, 12); ud.style.fontSize = "3cqw"; T.pop(ud, 0.8);
      T.A(items[0], [{ transform: "translateY(0)" }, { transform: "translateY(-10px)" }], 1.4, 0.4);
      const first = at(items[0], h("div", "sticky", "1st"), null, null); first.style.cssText += "top:-5cqw;left:1cqw;padding:.4cqw .9cqw;"; T.pop(first, 1.4, 0.4);
      const re = at(scene, h("div", "chip", "↺ If yours is taken, pick from what is left."), 22, 80); re.style.fontSize = "2.2cqw"; T.pop(re, 2.4);
      T.fade(document.getElementById("p6r"), 2.4);
    },
  },
  { // 7
    title: "LAB SKILLS AND STEPS", kicker: "EXPLORE · DO IT RIGHT",
    side: `<ol id="p7l"><li>Pull level and slow at a steady speed.</li><li>Read the scale while the cart is moving.</li><li>Keep the carpet still.</li><li>Zero the scale before each pull.</li><li>Whole group: one pulls, all watch, all record.</li></ol>`,
    cap: "PULL · WATCH · HOLD THE CARPET · RECORD",
    build(scene, T) {
      carpet(scene, 0, 74, 100);
      const R = rig(scene, 4, 30, 72, { weights: ["1000"] });
      T.fade(R.r, 0, 0.5);
      const pull = tag(scene, "PULL", 74, 22); T.pop(pull, 0.8);
      const pa = at(scene, img("pull_arrow"), 76, 46, 12); T.wipe(pa, 0.8, 0.4);
      T.move(R.r, 1.4, 1.6, 8, 0, EASE.linear); T.move(pa, 1.4, 1.6, 8, 0, EASE.linear);
      T.needle(R.needle, 1.4, 0.5, 0, 4.3);
      const watch = tag(scene, "WATCH", 42, 22); T.pop(watch, 2.0);
      const hold = tag(scene, "HOLD THE CARPET", 1, 88); T.pop(hold, 2.6);
      const rec = tag(scene, "RECORD", 4, 12); T.pop(rec, 3.2);
      T.needle(R.needle, 3.8, 0.4, 4.3, 0, EASE.out);
      const ck = tag(scene, "✓ zero the scale", 60, 88, "green"); ck.style.background = "var(--green)"; T.pop(ck, 3.9);
      const li = document.querySelectorAll("#p7l li");
      [[0.8, 0], [2.0, 1], [2.6, 2], [3.8, 3], [3.2, 4]].forEach(([t, i]) => T.A(li[i], [{ backgroundColor: "rgba(240,178,58,0)" }, { backgroundColor: "rgba(240,178,58,.35)" }], t, 0.3));
    },
  },
  { // 8
    title: "PART 1: KINETIC FRICTION", kicker: "EXPLORE · COLLECT",
    side: `<p>Collect: Test your material at</p><div class="chip-stack" id="p8c"></div><p>Test it! Pull at a steady speed. Trial as many times as needed.</p><p class="aside" id="p8h">Hard to read? Do another trial.</p><p><a class="lab-link" href="${LAB_URL}" target="_blank" rel="noopener">Online Friction Lab ↗</a></p>`,
    cap: "",
    build(scene, T) {
      carpet(scene, 0, 76, 100);
      const R = rig(scene, 4, 22, 72, { weights: ["1000", "500", "200"] });
      const tests = [["1000", "Test A (1090 g total, FN = 10.7 N)", 4.3], ["500", "Test B (1590 g total, FN = 15.6 N)", 6.2], ["200", "Test C (1790 g total, FN = 17.5 N)", 7.0]];
      const stack = document.getElementById("p8c");
      const capEl = document.getElementById("flCapQ");
      let prev = 0;
      tests.forEach(([g, label, N], i) => {
        const t0 = i * 3;
        T.drop(R.W[g], t0, 12, 0.4);
        const c = h("span", "chip", fx(label) + ' <span class="t-aside" style="opacity:.7">sample</span>'); stack.appendChild(c); T.pop(c, t0 + 0.3);
        const sc = at(scene, h("div", "chip", fx(label) + " · sample"), 50, 4 + i * 0); sc.classList.add("fs-only"); T.pop(sc, t0 + 0.3); if (i < 2) T.fadeOut(sc, t0 + 2.9, 0.1);
        T.needle(R.needle, t0 + 0.5, 0.4, prev, N); prev = N;
        const grp = h("div", "r", null, { inset: 0 }); // the whole rig slides: animate the rig box
        T.move(R.r, t0 + 0.9, 1.6, 6, 0, EASE.linear);
        if (i < 2) T.move(R.r, t0 + 2.6, 0.3, -6, 0);
      });
      if (capEl) capEl.textContent = "";
      T.fade(document.getElementById("p8h"), 9.2);
      const hr = say(scene, "Hard to read? Do another trial.", 54, 90, 44, "t-aside"); hr.classList.add("fs-only"); T.fade(hr, 9.2);
    },
  },
  { // 9
    title: "GRAPH IT", kicker: "EXPLAIN · FRICTION FORCE VS FN",
    side: `<p>x-axis FN (N), y-axis friction force (N).</p><p>Plot your 3 points.</p><p class="q" id="p9q">If nothing presses the surfaces together (FN = 0), how much friction is there?</p><p id="p9a">The line still aims back at (0, 0).</p>`,
    cap: "If nothing presses the surfaces together (FN = 0), how much friction is there?",
    build(scene, T) {
      const c = card(scene, 28, 2, 44, { keep: true });
      const L = layers(c, ["kinetic_axes", "kinetic_dot_A", "kinetic_dot_B", "kinetic_dot_C"]);
      T.fade(c, 0, 0.6);
      const xu = at(c, h("div", "", null, { height: ".5cqw", background: "#D9822B" }), 40, 95, 22);
      const yu = at(c, h("div", "", null, { width: ".5cqw", background: "#2F6DB5", height: "30%" }), 4, 30);
      T.A(xu, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], 0.8, 0.3); T.A(yu, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], 1.2, 0.3);
      ["A", "B", "C"].forEach((d, i) => { const n = L["kinetic_dot_" + d]; n.style.transformOrigin = ["37.5% 68%", "67%", "78.5% 57.5%"][i]; T.pop(n, 1.8 + i * 0.7); });
      T.fade(document.getElementById("p9q"), 4.0); T.fade(document.getElementById("p9a"), 5.0);
    },
  },
  { // 10
    title: "FIND THE PATTERN", kicker: "EXPLAIN · THE SLOPE",
    side: `<p>Best-fit line aims at (0, 0).</p><p id="p10f"><span class="boxed">Slope = <span style="color:var(--blue)">rise</span> / <span style="color:var(--orange)">run</span> = friction force / FN</span></p><p class="q">What does the slope tell you about your material?</p>`,
    cap: "Slope = rise / run = friction force / FN",
    build(scene, T) {
      const c = card(scene, 26, 2, 46, { keep: true });
      const L = layers(c, ["kinetic_axes", "kinetic_rise_run", "kinetic_bestfit_line", "kinetic_aim_origin_hint", "kinetic_dot_A", "kinetic_dot_B", "kinetic_dot_C"]);
      T.fade(c, 0, 0.4);
      T.wipe(L.kinetic_bestfit_line, 0.6, 1.4, KB.bestfit[0], KB.bestfit[1]);
      T.pop(L.kinetic_aim_origin_hint, 2.2);
      T.wipe(L.kinetic_rise_run, 3.0, 0.6, KB.rise_run[0], KB.rise_run[1]);
      const f = document.getElementById("p10f"); T.fade(f, 4.4);
    },
  },
  { // 11
    title: "THE EQUATION", kicker: "EXPLAIN · THE EQUATION",
    side: `<p id="p11a" class="q">Why is b = 0?</p><p id="p11b">The line passes through zero, so b = 0. With no normal force, there is no friction.</p>`,
    cap: "b = 0: no normal force, no friction.",
    build(scene, T) {
      const head = say(scene, "Look at this! We found the equation ourselves.", 4, 3, 70, "big"); head.style.fontSize = "3cqw";
      T.wipe(head, 0, 0.8, 0, 1, EASE.out);
      const wrap = at(scene, h("div", "eqwrap"), 2, 22, 72);
      wrap.style.transformOrigin = "0 0"; wrap.style.height = "40cqw";
      if (document.body.classList.contains("fl-full")) wrap.style.scale = "1.25";
      const top = ["term_y", "term_equals", "term_m", "term_x", "term_plus_b"], wid = [12, 6, 12, 12, 15], xs = [0, 13.5, 20.5, 34, 47.5];
      const bot = { term_y: "term_Ffk", term_m: "term_muk", term_x: "term_FN" }, bw = { term_Ffk: 15, term_muk: 12, term_FN: 12 };
      const tops = {};
      top.forEach((n, i) => { tops[n] = at(wrap, img(n), xs[i] * 1.4, 0, wid[i] * 1.4); T.pop(tops[n], 1.0 + i * 0.25); });
      let k = 0;
      Object.entries(bot).forEach(([over, n]) => {
        const i = top.indexOf(over), x = xs[i] * 1.4 - (n === "term_Ffk" ? 2 : 0);
        const card = at(wrap, img(n), x, 52, bw[n] * 1.4); const t = 3.2 + k * 0.35;
        T.slideIn(card, t, 0.5, 0, 20, EASE.inout);
        const line = at(wrap, h("div", "", null, { width: ".35cqw", height: "6cqw", background: ["#2F6DB5", "#2F7A40", "#D9822B"][k] }), xs[i] * 1.4 + wid[i] * 0.7, 41);
        T.growY(line, t + 0.5, 0.3); k++;
      });
      const eq2 = at(wrap, img("term_equals"), xs[1] * 1.4, 52, wid[1] * 1.4); T.pop(eq2, 4.3);
      const inset = card(scene, 76, 3, 22, { keep: true }); layers(inset, ["kinetic_axes", "kinetic_bestfit_line"]); T.fade(inset, 2.6);
      const why = say(scene, "Why is b = 0?", 4, 90, 40); why.style.color = "var(--red)"; T.fade(why, 5.0);
      T.fade(document.getElementById("p11a"), 5.0);
      const b0 = at(wrap, img("term_b0"), xs[4] * 1.4 - 2, 52, 21); T.pop(b0, 5.8); T.dim(tops.term_plus_b, 5.8);
      T.fade(document.getElementById("p11b"), 6.4);
    },
  },
  { // 12
    title: "NAME IT", kicker: "EXPLAIN · THE EQUATION",
    side: `<p id="p12a">That slope is the coefficient of kinetic friction, μk.</p><p>It has no units, and it belongs to a PAIR of surfaces.</p><p id="p12b">You just discovered the equation.</p>`,
    cap: "Ff,kinetic = μk FN",
    build(scene, T) {
      T.fade(document.getElementById("p12a"), 0, 0.5);
      const mu = at(scene, img("term_muk"), 4, 6, 24); T.pop(mu, 0.8);
      const pair = at(scene, h("div"), 4, 56, 30);
      const cp = img("carpet_strip"); const sw = img("swatch_felt"); sw.style.cssText = "position:absolute;width:28%;left:36%;bottom:55%";
      pair.style.position = "absolute"; pair.append(sw, cp);
      const br = at(pair, h("div", "", null, { border: ".3cqw solid var(--navy)", borderTop: 0, height: "2cqw", top: "105%", borderRadius: "0 0 1cqw 1cqw" }), 0, null, 100);
      const pl = at(pair, h("div", "lbl", "pair"), 40, null); pl.style.top = "125%"; pl.style.fontSize = "2.2cqw";
      T.fade(pair, 1.6, 0.6);
      const sb = at(scene, h("div", "starburst"), 40, 14, 54); sb.style.aspectRatio = "1.35";
      sb.innerHTML = `<svg viewBox="-110 -80 220 160" aria-hidden="true"><path d="${star(110, 80, 70, 52, 18)}" fill="#F0B23A" fill-opacity=".55" stroke="#C98A1E" stroke-width="2.5" stroke-linejoin="round"/></svg><span>So<br><b>${fx("Ff,kinetic = μk FN")}</b></span>`;
      T.pop(sb, 2.6, 0.5);
      const st = say(scene, "★ You just discovered the equation.", 44, 86, 50); st.style.color = "var(--orange)";
      T.fade(st, 3.4, 0.3); T.wiggle(st, 3.4, 3, 0.8); T.fade(document.getElementById("p12b"), 3.4);
    },
  },
  { // 13
    title: "DID YOU NOTICE?", kicker: "PART 2 · FROM KINETIC TO STATIC",
    side: `<p>You might have noticed that it took a bit more force to get your cart to START moving than to KEEP it moving!</p><p id="p13c">That extra grip before sliding is static friction.</p>`,
    cap: "That extra grip before sliding is static friction.",
    build(scene, T) {
      carpet(scene, 0, 78, 100);
      const R = rig(scene, 2, 30, 66, { weights: ["1000", "500", "200"] }); T.fade(R.r, 0, 0.5);
      const pcard = card(scene, 72, 4, 26, { keep: true }); const pc = h("div", "layers"); pcard.appendChild(pc); pc.appendChild(img("predict_axes"));
      at(pc, h("div", "", null, { background: "#FFFDF6", width: "7%", height: "19%", left: "50.5%", top: "40%" })); T.fade(pcard, 0.3);
      // the reading vs time trace drawn on top of the axes (rise, drop, flat)
      pc.insertAdjacentHTML("beforeend", `<svg class="p" style="inset:0" viewBox="0 0 1500 1080" preserveAspectRatio="none"><polyline id="p13line" points="240,960 760,330 800,470 1420,470" fill="none" stroke="#B8322A" stroke-width="10" stroke-linejoin="round"/></svg>`);
      const tr = pc.querySelector("svg"); T.wipe(tr, 0.8, 1.8, 0.16, 0.51, EASE.inQuad); T.wipe(tr, 2.6, 1.5, 0.16, 0.95, EASE.linear, 0.51);
      T.needle(R.needle, 0.8, 1.8, 0, 7.8, EASE.inQuad);
      const st = tag(scene, "START", 30, 14); T.pop(st, 0.8);
      T.needle(R.needle, 2.6, 0.25, 7.8, 7.0, EASE.inQuad);
      T.move(R.r, 2.6, 1.5, 8, 0, EASE.linear);
      const km = tag(scene, "KEEP MOVING", 50, 14, "red"); km.style.background = "var(--purple)"; T.pop(km, 2.6);
      T.fade(document.getElementById("p13c"), 4.4);
      const cap = say(scene, "That extra grip before sliding is <b>static friction</b>.", 4, 90, 70); cap.classList.add("side-only"); T.fade(cap, 4.4);
    },
  },
  { // 14
    title: "PART 2: STATIC FRICTION", kicker: "EXPLORE · THE PEAK",
    side: `<p>Challenge: find μs for your material.</p><ol><li>Use Test C (1790 g, 17.5 N): the difference is easiest to see.</li><li>One person pulls slowly, steadily, from rest.</li><li>Everyone watches for the PEAK, the highest reading just before the cart starts moving and the reading drops.</li><li id="p14t">3 trials (peaks vary), average.</li></ol>`,
    cap: "Watch for the PEAK",
    build(scene, T) {
      const tc = at(scene, h("div", "chip", "TEST C"), 4, 4); tc.style.fontSize = "2.4cqw"; T.pop(tc, 0);
      carpet(scene, 0, 78, 100);
      const R = rig(scene, 4, 30, 70, { weights: ["1000", "500", "200"], reading: true }); T.fade(R.r, 0.6, 0.4);
      const ring = h("div", "", null, { position: "absolute", width: "14%", aspectRatio: "1", border: ".5cqw solid #B8322A", borderRadius: "50%", top: "50%", translate: "-50% -50%" });
      R.needle.appendChild(ring); ring.style.left = "50%"; ring.style.width = "260%";
      const peak = tag(R.pull, "PEAK", 50, 2, "red");
      const beats = [[1.0, 2.4, 7.8], [4.6, 1.5, 7.6], [7.1, 1.5, 8.0]];
      beats.forEach(([t, d, pk], i) => {
        T.needle(R.needle, t, d, 0, pk); T.text(R.readEl, t, d, 0, pk);
        const tp = t + d;
        if (i === 0) { T.pop(peak, tp); T.pulse(ring, tp, 1.3, 0.4); T.A(ring, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], tp, 0.6); }
        else { T.A(ring, [{ opacity: 0 }, { opacity: 1 }, { opacity: 0 }], tp, 0.6); }
        T.needle(R.needle, tp + 0.2, 0.25, pk, 7.0); T.text(R.readEl, tp + 0.2, 0.25, pk, 7.0);
        T.move(R.r, tp + 0.2, 0.7, 5, 0, EASE.linear);
        if (i < 2) T.A(R.r, [{ transform: "translate(0,0)" }, { transform: "translate(-5cqw,0)" }], tp + 0.9, 0.01); // reset for the next trial
      });
      const avg = at(scene, h("div", "chip", "3 trials (peaks vary), average: 7.8, 7.6, 8.0"), 30, 4); T.pop(avg, 4.6);
    },
  },
  { // 15
    title: "Calculate μs", kicker: "EXPLAIN · STATIC FRICTION",
    side: `<p>Static friction grows to match your pull, up to a maximum:</p><p id="p15a"><span class="t-head">Ff,static ≤ μs FN</span></p><p>At the peak, Ff,static (max) = μs FN, so</p><p id="p15b"><span class="boxed">μs = peak reading / FN</span></p><p class="q" id="p15c">Compare: is your μs bigger or smaller than your μk?</p>`,
    cap: "μs = peak reading / FN",
    build(scene, T) {
      const c = card(scene, 8, 3, 62, { keep: true });
      const L = staticGraph(c, ["static_axes", "static_seg1_rise", "static_seg2_drop", "static_seg3_kinetic", "static_peak_dot", "static_label_max", "static_label_kinetic_eq"]);
      T.fade(c, 0, 0.4);
      T.wipe(L.static_seg1_rise, 0.5, 1.6, ...SB.seg1_rise);
      T.pop(L.static_peak_dot, 2.1); L.static_peak_dot.style.transformOrigin = `${SB.peak[0] * 100}% ${SB.peak[1] * 100}%`;
      T.wipe(L.static_label_max, 2.1, 0.5, ...SB.label_max);
      T.wipe(L.static_seg2_drop, 2.7, 0.3, ...SB.seg2_drop, EASE.inQuad);
      T.wipe(L.static_seg3_kinetic, 3.0, 1.2, ...SB.seg3_kinetic);
      T.fade(L.static_label_kinetic_eq, 3.6, 0.5);
      T.fade(document.getElementById("p15a"), 4.4); T.pop(document.getElementById("p15b"), 5.0); T.fade(document.getElementById("p15c"), 5.8);
      const fs = at(scene, h("div", "fs-only chip", fx("Ff,static ≤ μs FN")), 74, 30); fs.style.fontSize = "2.4cqw"; T.fade(fs, 4.4);
    },
  },
  { // 16
    title: "What happens before it moves?", kicker: "PART 2 · STATIC GRAPH · PREDICT",
    side: `<p id="p16a">Don't flip yet! Sketch what you think the force does when you pull until it moves.</p><p class="aside">Sketch it in your NOTES box.</p>`,
    cap: "Sketch it in your NOTES box.",
    build(scene, T) {
      const set = at(scene, h("div"), 1, 30, 30);
      const R = rig(set, 0, 0, 100, { weights: ["1000", "500", "200"], hand: false });
      const lb = at(set, h("div", "lbl", "Test C cart, 1790 g"), 0, 50, 70); lb.style.top = "auto"; lb.style.position = "relative"; lb.style.marginTop = "14cqw";
      T.fade(set, 0, 0.5);
      const c = card(scene, 34, 3, 62, { keep: true });
      const box = h("div", "layers"); c.appendChild(box); box.appendChild(img("predict_axes"));
      T.slideIn(c, 0.8, 0.6, 10, 0);
      // the red "?" is drawn into predict_axes: cover it, then pulse a clipped copy of just the "?"
      at(box, h("div", "", null, { background: "#FFFDF6", width: "6.5%", height: "17%", left: "50.8%", top: "41%" }));
      const q = img("predict_axes"); box.appendChild(q);
      q.style.clipPath = "inset(40% 42.5% 41.8% 50.3%)"; q.style.transformOrigin = "53.9% 49.5%";
      T.fade(q, 1.6, 0.2); T.A(q, [{ transform: "scale(1)" }, { transform: "scale(1.08)" }, { transform: "scale(1)" }], 1.6, 1.2, EASE.inout, { iterations: 3 });
      T.fade(document.getElementById("p16a"), 2.0);
      const st = at(scene, h("div", "sticky", "Now flip to page 2. Were you right?"), 6, 70, 26); T.pop(st, 5.0);
    },
  },
  { // 17
    title: "Watch the scale.", kicker: "PART 2 · STATIC GRAPH · WATCH",
    side: `<h2 id="p17h" style="font-size:2.6cqw;display:none">What did the scale do?</h2><p class="q" id="p17p">Describe what the reading did in one sentence.</p>`,
    cap: "Describe what the reading did in one sentence.",
    build(scene, T) {
      const c = card(scene, 6, 2, 88, { tilt: "tilt-l" });
      const v = h("video", "vid");
      Object.assign(v, { muted: true, loop: true, autoplay: true, playsInline: true, preload: "auto", poster: "friction-lesson/media/friction-drop-poster.webp" });
      v.setAttribute("muted", ""); v.setAttribute("playsinline", ""); v.setAttribute("aria-label", "Video: felt on carpet, full weights on sled");
      v.src = "friction-lesson/media/friction-drop.mp4";
      c.appendChild(v);
      T.fade(c, 0, 0.6);
      const p = v.play(); if (p && p.catch) p.catch(() => {});
      const lbl = at(c, h("div", "photo-credit", "Video: felt on carpet, full weights on sled"), 0, null, 100); lbl.style.position = "relative";
      const hd = document.getElementById("p17h");
      T.A(hd, [{ opacity: 0 }, { opacity: 1 }], 5.5, 0.4); setTimeout(() => { hd.style.display = ""; }, T.reduced ? 0 : 5500);
      T.fade(document.getElementById("p17p"), 6.0);
      return { video: v };
    },
  },
  ...[18, 19, 20].map((n) => staticDeepDive(n)),
  { // 21
    title: "Read the graph.", kicker: "EVALUATE · CHECK",
    side: `<p class="q" id="p21q">Ff,s(max) = 7.8 N. You push horizontally with 5 N. What is friction?</p><p id="p21l">Label the three regions on the static graph on page 2.</p><p class="aside">The graph on your sheet shows the shape, not exact values. Your drop may be smaller.</p><p class="aside side-only" id="p21n">Press Next to reveal the answer.</p>`,
    cap: "Ff,s(max) = 7.8 N. You push horizontally with 5 N. What is friction?",
    build(scene, T) {
      const c = card(scene, 4, 3, 64, { keep: true });
      const L = staticGraph(c, ["static_band_static", "static_band_threshold", "static_band_kinetic", "static_axes", "static_seg1_rise", "static_seg2_drop", "static_seg3_kinetic", "static_peak_dot", "static_label_max", "static_label_kinetic_eq", "region_tag_1", "region_tag_2", "region_tag_3", "region_label_static", "region_label_threshold", "region_label_kinetic"]);
      ["region_label_static", "region_label_threshold", "region_label_kinetic"].forEach((n) => { L[n].style.opacity = 0; });
      T.fade(c, 0, 0.5);
      [1, 2, 3].forEach((i) => T.pop(L["region_tag_" + i], 0.6 + (i - 1) * 0.3));
      T.fade(document.getElementById("p21q"), 1.8); T.fade(document.getElementById("p21l"), 2.6);
      const [px, py] = risePoint(5 / 7.8);
      const dot = at(c.querySelector(".layers"), h("div", "", null, { width: "3%", aspectRatio: "1", borderRadius: "50%", background: "#F0B23A", border: ".2cqw solid #B8322A", translate: "-50% -50%", opacity: 0 }), px * 100, py * 100);
      const chip = at(scene, h("div", "chip red", "5 N, not 7.8 N"), 30, 46); chip.style.opacity = 0; chip.style.fontSize = "2.4cqw";
      return {
        steps: [(T2) => {
          T2.pop(dot, 0); T2.pop(chip, 0.1);
          const order = [["region_tag_1", "region_label_static"], ["region_tag_2", "region_label_threshold"], ["region_tag_3", "region_label_kinetic"]];
          order.forEach(([a, b], i) => {
            const t = 0.4 + i * 0.4;
            T2.A(L[a], [{ transform: "scaleX(1)", opacity: 1 }, { transform: "scaleX(0)", opacity: 0 }], t, 0.2);
            T2.A(L[b], [{ transform: "scaleX(0)", opacity: 0 }, { transform: "scaleX(1)", opacity: 1 }], t + 0.2, 0.2);
          });
          const n = document.getElementById("p21n"); if (n) n.textContent = "Friction matches the push: 5 N, not 7.8 N.";
          dot.style.opacity = 1; chip.style.opacity = 1;
        }],
      };
    },
  },
  { // 22
    title: "LEADERBOARD", kicker: "EVALUATE · ALL 7 MATERIALS",
    side: `<p>Each group posts μk and μs.</p><p class="q" id="p22a">Was your prediction right?</p><p class="q" id="p22b">Is μs &gt; μk for every material?</p><p class="aside">Rank all 7, then fill in EVIDENCE.</p>`,
    cap: "Rank all 7, then fill in EVIDENCE.",
    build(scene, T) {
      const c = card(scene, 6, 1, 76, { keep: true });
      const tb = h("table", "lb-table", `<thead><tr><th>RANK</th><th>MATERIAL</th><th>${fx("μk")}</th><th>${fx("μs")}</th></tr></thead><tbody>${[1, 2, 3, 4, 5, 6, 7].map((n) => `<tr><td>${n}</td><td></td><td></td><td></td></tr>`).join("")}</tbody>`);
      c.appendChild(tb); T.wipe(tb, 0, 0.6, 0, 1, EASE.out); T.fade(c, 0, 0.3);
      [...tb.querySelectorAll("tbody td:nth-child(2)")].forEach((td, i) => {
        const s = h("span", "", null, { display: "inline-flex", alignItems: "center" }); s.append(img("swatch_" + SWATCHES[i], ""), document.createTextNode(SWATCHES[i]));
        td.appendChild(s); T.slideIn(s, 0.8 + i * 0.15, 0.4, -4, 0);
      });
      T.fade(document.getElementById("p22a"), 2.4); T.fade(document.getElementById("p22b"), 2.6);
    },
  },
  { // 23
    title: "EXIT TICKET", kicker: "EVALUATE · ON YOUR OWN",
    side: `<p>Exit Ticket.</p><p>Tear off the Exit Ticket strip. Individual, formula card allowed.</p>`,
    cap: "Tear off the Exit Ticket strip. Individual, formula card allowed.",
    build(scene, T) {
      const t = say(scene, "EXIT TICKET", 8, 6, 50, "big"); t.style.fontSize = "6cqw"; T.wipe(t, 0, 0.8, 0, 1, EASE.out);
      const st = at(scene, h("div", "stamp", "INDIVIDUAL"), 60, 8); T.pop(st, 0.8);
      const note = at(scene, h("div", "sticky", `<div class="p23-formula">${fx("Ff,kinetic = μk FN")}<br>${fx("Ff,static ≤ μs FN")}</div>`), 20, 32, 46);
      T.slideIn(note, 1.4, 0.6, 0, 12);
      const fc = at(note, h("div", "stamp p23-fc", "FORMULA CARD ALLOWED"), 30, 78); T.pop(fc, 1.9);
      const door = tag(scene, "COLLECT AT THE DOOR", 66, 74, "red"); T.pop(door, 2.4);
    },
  },
  { // 24
    title: "WORKED EXAMPLE", kicker: "IF TIME · EXAMPLE PROBLEM · WORK IT IN YOUR NOTES BOX",
    side: `<p id="w0">A 3.0 kg box, μs = 0.35, μk = 0.25, pushed horizontally on a level surface.</p><p id="w1">FN = 3.0 × 9.8 = 29.4 N.</p><p id="w2">Max static = 0.35 × 29.4 = 10.3 N.</p><p id="w3">Push 6 N: does not move; Ff,static = 6 N, not 10.3 N.</p><p id="w4">Push 12 N: it slides; Ff,kinetic = 0.25 × 29.4 = 7.35 N; net force = 12 - 7.35 = 4.65 N; a = 4.65 / 3.0 = 1.55, about 1.6 m/s².</p><p class="aside"><b>YOU TRY:</b> a 5.0 kg box, μs = 0.45, pushed horizontally on level ground. What push just starts it moving?</p>`,
    cap: "", capSteps: true,
    build(scene, T) {
      carpet(scene, 0, 82, 56);
      const box = at(scene, h("div"), 8, 56, 30); box.appendChild(img("sled"));
      const kg = at(box, h("div", "chip", "3.0 kg"), 30, -30);
      const c = card(scene, 60, 4, 38, { keep: true });
      const L = staticGraph(c, ["static_axes", "static_seg1_rise", "static_seg2_drop", "static_seg3_kinetic", "static_peak_dot"]);
      L.static_peak_dot.style.transformOrigin = `${SB.peak[0] * 100}% ${SB.peak[1] * 100}%`;
      T.fade(box, 0, 0.5); T.fade(c, 0, 0.5);
      const cap = document.getElementById("flCapQ");
      const lines = ["w0", "w1", "w2", "w3", "w4"].map((id) => document.getElementById(id));
      const times = [0, 1.0, 2.2, 3.4, 5.0];
      lines.forEach((l, i) => i === 0 ? T.fade(l, 0) : T.wipe(l, times[i], 0.8, 0, 1, EASE.out));
      if (cap) times.forEach((t, i) => setTimeout(() => { if (cap.isConnected && document.body.dataset.page === "24") cap.innerHTML = lines[i].innerHTML; }, T.reduced ? 0 : t * 1000));
      T.pulse(L.static_peak_dot, 2.2, 1.6, 0.6, 2);
      const a6 = at(scene, img("pull_arrow"), 38, 60, 6); const l6 = at(scene, h("div", "chip", "6 N"), 38, 50);
      T.wipe(a6, 3.4, 0.3); T.pop(l6, 3.4); T.fadeOut(a6, 4.8); T.fadeOut(l6, 4.8);
      const a12 = at(scene, img("pull_arrow"), 38, 58, 13); const l12 = at(scene, h("div", "chip red", "12 N"), 42, 48);
      T.wipe(a12, 5.0, 0.3); T.pop(l12, 5.0);
      T.A(box, [{ transform: "translateX(0)" }, { transform: "translateX(14cqw)" }], 5.2, 1.6, EASE.inQuad);
      T.A(a12, [{ transform: "translateX(0)" }, { transform: "translateX(14cqw)" }], 5.2, 1.6, EASE.inQuad);
      T.A(l12, [{ transform: "translateX(0)" }, { transform: "translateX(14cqw)" }], 5.2, 1.6, EASE.inQuad);
      T.wipe(L.static_seg1_rise, 0.4, 1.4, ...SB.seg1_rise); T.fade(L.static_peak_dot, 1.8, 0.2);
      T.wipe(L.static_seg2_drop, 5.0, 0.3, ...SB.seg2_drop); T.wipe(L.static_seg3_kinetic, 5.3, 1.2, ...SB.seg3_kinetic);
    },
  },
  { // 25
    title: "Collect tickets first!", kicker: "EVALUATE · BEFORE THE ANSWERS", centered: true,
    side: `<p>Pass every Exit Ticket to the front before we look at the answers.</p>`,
    cap: "Pass every Exit Ticket to the front before we look at the answers.",
    build(scene, T) {
      const t = say(scene, "Collect tickets first!", 10, 24, 80, "big"); t.style.fontSize = "7cqw"; t.style.textAlign = "center"; T.wipe(t, 0, 0.8, 0, 1, EASE.out);
      const s = say(scene, "Pass every Exit Ticket to the front before we look at the answers.", 14, 50, 72); s.style.textAlign = "center"; s.style.fontSize = "2.8cqw"; T.fade(s, 1.0);
      const a = at(scene, img("pull_arrow"), 44, 70, 12); a.style.rotate = "180deg"; T.fade(a, 1.4, 0.3);
      T.A(a, [{ transform: "translateX(0)" }, { transform: "translateX(-2cqw)" }, { transform: "translateX(0)" }], 1.6, 0.5, EASE.inout, { iterations: 2 });
    },
  },
  { // 26
    title: "Exit Ticket: Answers", kicker: "EVALUATE · CHECK YOUR WORK",
    side: `<p>Front of the ticket (Name, favorite part, still confusing): those are your own answers. Any honest answer counts.</p>`,
    cap: "",
    build(scene, T) {
      const c = card(scene, 3, 3, 94, { keep: true }); c.style.rotate = "0.6deg"; c.classList.add("p26-card");
      c.innerHTML = `<div class="ans">
        <p>1. A 2 kg box is pulled horizontally on a level floor. A group's graph of friction force against ${fx("FN")} has a slope of 0.3. What is the sliding friction force on the box?<br><b style="color:#2F6DB5">${fx("Ff,k")} = 5.9 N</b> &nbsp; <span class="t-aside" style="color:#2F6DB5">${fx("FN")} = 2 × 9.8 = 19.6 N, so ${fx("Ff,k")} = 0.3 × 19.6 = 5.88, about 5.9 N</span></p>
        <p>2. For the same box, ${fx("μs")} = 0.4. What is the most static friction can be?<br><b style="color:#2F6DB5">${fx("Ff,s")} max = 7.8 N</b> &nbsp; <span class="t-aside" style="color:#2F6DB5">${fx("Ff,s")} max = 0.4 × 19.6 = 7.84, about 7.8 N</span></p>
        <div style="display:flex;gap:2cqw;align-items:center"><p style="flex:1">3. Is it harder to start the box moving or to keep it sliding? Why?<br><span class="t-aside" style="color:#2F6DB5">It's harder to start it moving. The maximum static friction (7.8 N) is bigger than kinetic friction (5.9 N) because ${fx("μs")} is bigger than ${fx("μk")}. At rest, the tiny touching points between the surfaces have time to stick together. Once the block slides, they keep breaking apart before they can stick as strongly.</span></p><img src="friction-lesson/art/static_e.webp" alt="Static graph: the peak sits higher than the kinetic plateau" style="width:30%"></div></div>`;
      T.fade(c, 0, 0.5);
      [...c.querySelectorAll(".ans > p, .ans > div")].forEach((p, i) => T.fadeUp(p, 0.6 + i, 0.5));
    },
  },
  hookPage(1, "GRAPHITE AS A LUBRICANT",
    "Pencil “lead” is graphite: stacked sheets of carbon that slide over each other easily, so graphite works as a dry lubricant. Note: true superlubricity, with almost no friction, needs atomically flat graphite sheets rotated out of line with each other.",
    "Shade a patch of paper with a soft pencil. Slide a coin across bare paper, then across the graphite patch. Which is easier? That is dry lubrication.",
    "Why might atoms that line up like egg-carton bumps grip more than atoms that do not line up?",
    (scene, T) => {
      const c = card(scene, 14, 12, 60, { keep: true }); T.fade(c, 0, 0.5);
      const box = h("div", "", null, { position: "relative", height: "22cqw" }); c.appendChild(box);
      [0, 1, 2].forEach((i) => {
        const bar = at(box, h("div", "", null, { height: "4.5cqw", background: "#EDE6D6", border: ".25cqw solid #3D3D3D", borderRadius: ".6cqw" }), 8, 10 + i * 28, 80);
        T.loop(bar, [{ transform: "translateX(0)" }, { transform: `translateX(${i % 2 ? -2 : 2}cqw)` }, { transform: "translateX(0)" }], 0.5 + i * 0.2, 1.5);
      });
      const lb = at(c, h("div", "lbl", "graphite sheets"), 0, null, 100); lb.style.position = "relative"; lb.style.fontSize = "2.2cqw";
    }),
  hookPage(2, "GECKO FEET",
    "A gecko can run up glass. Each foot carries over a million tiny hairs (setae), and each seta splits into hundreds to about a thousand even tinier tips. Weak van der Waals attraction at all those contact points adds up.",
    "Stick a sticky note to a window. Pull it straight off, then peel it from one corner. Geckos peel their toes to let go.",
    "Why does more real contact area mean more adhesion?",
    (scene, T) => {
      const wrap = at(scene, h("figure", "", null, { margin: 0 }), 18, 2, 58);
      wrap.appendChild(img("gecko_photo", "cut", "Close-up photo of a gecko foot with rows of tiny ridges on each toe"));
      const cr = h("figcaption", "photo-credit", "Photo: B. C. Tørrissen, CC BY-SA 3.0"); cr.style.cssText = "position:absolute;left:12%;right:6%;bottom:6.5%;font-size:1.5cqw;color:#24339E";
      wrap.appendChild(cr); wrap.style.rotate = "-1.5deg";
      T.fade(wrap, 0, 0.6); T.A(wrap, [{ transform: "scale(1.04)" }, { transform: "scale(1)" }], 0, 1.4);
    }),
  hookPage(3, "STICK-SLIP",
    "A violin bow, squeaky sneakers on a gym floor, and a creaking door all sing for the same reason: the surfaces stick, then slip, then stick again, many times a second.",
    "Pull a rubber eraser slowly across a desk with a rubber band. Watch it jerk forward in steps instead of gliding.",
    "Stick-slip happens when friction drops as sliding starts. Why does that make the motion jerky?",
    (scene, T) => {
      const c = card(scene, 4, 10, 88, { keep: true }); T.fade(c, 0, 0.4);
      const row = h("div", "", null, { display: "flex" }); c.appendChild(row);
      const L0 = SB.seg1_rise[0], R0 = SB.seg2_drop[1];
      for (let i = 0; i < 4; i++) {
        // crop the canvas to the rise+drop pair and tile it
        const cell = h("div", "", null, { flex: "1", overflow: "hidden", position: "relative", aspectRatio: `${(R0 - L0) * 1680} / ${(1000 - 300) * 1}` });
        ["static_seg1_rise", "static_seg2_drop"].forEach((n, k) => {
          const im = img(n); im.style.cssText = `position:absolute;width:${100 / (R0 - L0)}%;max-width:none;left:${-L0 / (R0 - L0) * 100}%;top:${-300 / 700 * 100}%`;
          cell.appendChild(im);
          T.wipe(im, 0.4 + i * 0.5 + k * 0.38, k ? 0.12 : 0.38, k ? SB.seg2_drop[0] : SB.seg1_rise[0], k ? SB.seg2_drop[1] : SB.seg1_rise[1]);
        });
        row.appendChild(cell);
      }
      const lb = h("div", "lbl", "stick, slip, stick…"); lb.style.fontSize = "2.6cqw"; c.appendChild(lb); T.fade(lb, 2.4);
    }),
  hookPage(4, "INTERLEAVED PHONE BOOKS",
    "Shuffle the pages of two phone books together. On MythBusters, people and even two cars could not pull them apart; it took two military vehicles and about 8,000 pounds of force.",
    "Interleave the pages of two old paperbacks or notebooks, 50 pages or more. Two students try to pull them apart. Then try with only 10 pages.",
    "Pulling on the spines squeezes the pages together. Why does that make friction grow?",
    (scene, T) => {
      const c = card(scene, 10, 8, 70, { keep: true }); T.fade(c, 0, 0.5);
      const lines = Array.from({ length: 14 }, (_, i) => { const y = 12 + i * 5.5; return i % 2 ? `<line x1="30" y1="${y}" x2="88" y2="${y}" stroke="#2F6DB5" stroke-width="1.2"/>` : `<line x1="12" y1="${y}" x2="70" y2="${y}" stroke="#B8322A" stroke-width="1.2"/>`; }).join("");
      c.insertAdjacentHTML("beforeend", `<svg viewBox="0 0 100 92" style="width:100%;display:block" aria-label="Two book spines with interleaved pages"><rect x="4" y="6" width="9" height="80" rx="2" fill="#B8322A" opacity=".85"/><rect x="87" y="6" width="9" height="80" rx="2" fill="#2F6DB5" opacity=".85"/>${lines}</svg>`);
      const a1 = at(c, img("pull_arrow"), -14, 40, 14); a1.style.rotate = "180deg";
      const a2 = at(c, img("pull_arrow"), 100, 40, 14);
      T.wipe(a1, 0.8, 0.4); T.wipe(a2, 0.8, 0.4);
      T.loop(a1, [{ transform: "translateX(0)" }, { transform: "translateX(1cqw)" }, { transform: "translateX(0)" }], 1.3, 0.9);
      T.loop(a2, [{ transform: "translateX(0)" }, { transform: "translateX(1cqw)" }, { transform: "translateX(0)" }], 1.3, 0.9);
    }),
  hookPage(5, "WHY IS ICE SLIPPERY?",
    "You may have heard that skate blades melt ice by pressure. That effect is far too small to explain it. What matters is a thin layer of loosely bound, mobile water molecules at the surface; scientists still debate the cause.",
    "Slide an ice cube straight from the freezer across a dry tray, then one that has sat out for a minute. Compare how far each goes from the same push.",
    "Very cold ice feels less slippery than ice near 0 °C. Why might that be?",
    (scene, T) => {
      // drawn in code: an icy lens, the ice below, a skate blade above, and a mobile molecule layer between
      const box = at(scene, h("div"), 22, 2, 52);
      const mol = Array.from({ length: 14 }, (_, i) => `<circle class="mol" cx="${22 + i * 11.5}" cy="${101 + (i % 2) * 6}" r="4.2" fill="#9FD3F2" stroke="#2F6DB5" stroke-width="1.4"/>`).join("");
      box.innerHTML = `<svg viewBox="0 0 200 200" style="width:100%;display:block" role="img" aria-label="Magnified ice surface with a thin layer of loose water molecules">
        <defs><clipPath id="iceLens"><circle cx="100" cy="100" r="92"/></clipPath>
        <pattern id="iceHatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(-30)"><line x1="0" y1="0" x2="0" y2="6" stroke="#7FB0EA" stroke-width="1.6" opacity=".7"/></pattern></defs>
        <g clip-path="url(#iceLens)"><rect width="200" height="200" fill="#FFFDF6"/>
        <rect x="0" y="40" width="200" height="50" fill="#C8CDD6"/><rect x="0" y="40" width="200" height="50" fill="url(#iceHatch)" opacity=".4"/>
        <path d="M0 112 L200 112 L200 200 L0 200Z" fill="#DDF0FB"/><path d="M0 112 L200 112 L200 200 L0 200Z" fill="url(#iceHatch)"/>
        ${Array.from({ length: 6 }, (_, i) => `<path d="M${10 + i * 34} 150 l10 -8 l10 8 l-10 8z" fill="none" stroke="#2F6DB5" stroke-width="1.2" opacity=".6"/>`).join("")}
        <g id="iceMols">${mol}</g></g>
        <circle cx="100" cy="100" r="92" fill="none" stroke="#24339E" stroke-width="4"/>
        <text x="100" y="32" text-anchor="middle" font-family="Architects Daughter" font-size="11" fill="#3D3D3D">skate blade</text>
        <text x="100" y="178" text-anchor="middle" font-family="Architects Daughter" font-size="11" fill="#2F6DB5">ice</text></svg>`;
      box.style.filter = "drop-shadow(0 .6cqw 1cqw rgba(0,0,0,.2))";
      T.fade(box, 0, 0.4); T.A(box, [{ transform: "scale(.2)" }, { transform: "scale(1)" }], 0, 1.0, EASE.inout);
      box.querySelectorAll(".mol").forEach((m, i) => {
        m.style.transformBox = "fill-box"; m.style.transformOrigin = "center";
        T.loop(m, [{ transform: "translate(0,0)" }, { transform: `translate(${i % 2 ? 2 : -2}px,${i % 3 ? -1.5 : 1.5}px)` }, { transform: "translate(0,0)" }], 1.0 + (i % 4) * 0.1, 0.9 + (i % 3) * 0.25);
      });
      const lb = at(scene, h("div", "tag", "loosely bound, mobile molecules"), 26, 88); lb.style.background = "#2F6DB5"; T.pop(lb, 1.4);
    }),
  hookPage(6, "TRIBOELECTRIC EFFECT",
    "When two different materials touch and separate, charge moves between them; for metals it’s electrons, and for insulators scientists still debate whether it’s electrons, ions, or tiny bits of material. Charge is moved, not created.",
    "Rub a balloon on your hair or a wool sweater, then hold it near tiny bits of paper or a thin stream of tap water.",
    "How could you test that charge was moved and not created?",
    (scene, T) => {
      const sw = at(scene, img("swatch_cloth"), 10, 40, 18); T.fade(sw, 0, 0.4);
      const bl = at(scene, h("div"), 56, 6, 26);
      bl.innerHTML = `<svg viewBox="0 0 100 150" style="width:100%;display:block" role="img" aria-label="Balloon"><path d="M50 6 C78 6 92 30 92 56 C92 88 70 110 50 112 C30 110 8 88 8 56 C8 30 22 6 50 6Z" fill="#E5776C" fill-opacity=".75" stroke="#B8322A" stroke-width="3"/><path d="M46 112 l4 8 l4 -8z" fill="#B8322A"/><path d="M50 120 C44 132 58 138 50 148" fill="none" stroke="#3D3D3D" stroke-width="2"/><path d="M28 30 C34 22 42 20 48 20" fill="none" stroke="#fff" stroke-width="4" stroke-linecap="round" opacity=".7"/></svg>`;
      T.fade(bl, 0.2, 0.4);
      const start = [[16, 48], [20, 56], [14, 62]], end = [[62, 26], [70, 34], [64, 42]];
      start.forEach(([x, y], i) => {
        const c = at(scene, h("div", "chip", "−"), x, y); c.style.fontSize = "3cqw"; c.style.color = "#2F6DB5"; c.style.borderColor = "#2F6DB5";
        T.fade(c, 0.6, 0.2);
        const dx = (end[i][0] - x), dy = (end[i][1] - y);
        // three 0.3 s hops along an arc
        const kf = [0, 1, 2, 3].map((k) => ({ transform: `translate(${dx * k / 3 * 1}cqw,${(dy * k / 3) * 0.5625 - (k % 3 ? 4 : 0)}cqw)` }));
        T.A(c, kf, 1.2 + i * 0.5, 0.9, EASE.inout);
      });
    }),
  hookPage(7, "FRICTION TESTS",
    "Around 1493, Leonardo da Vinci wrote that friction grows with the load and does not depend on the area touching. He later used friction = one quarter of the weight. Guillaume Amontons published the same laws in 1699.",
    "Hang a rubber band on a book. Drag it on its wide side, then on its spine. Measure how far the band stretches each time.",
    "If friction is one quarter of the weight, what is μ? Does your book agree?",
    (scene, T) => {
      const c = card(scene, 4, 6, 70, { keep: true }); T.fade(c, 0, 0.5);
      const box = h("div", "", null, { position: "relative", height: "28cqw" }); c.appendChild(box);
      const wide = at(box, img("sled"), 2, 14, 46);
      const end = at(box, img("sled"), 64, 2, 30); end.style.rotate = "-90deg"; end.style.width = "26%";
      const band1 = at(box, h("div", "", null, { height: ".4cqw", background: "#B8322A" }), 48, 36, 10);
      const band2 = at(box, h("div", "", null, { height: ".4cqw", background: "#B8322A" }), 82, 36, 10);
      T.fade(wide, 0.4); T.fade(end, 0.8);
      T.grow(band1, 1.2, 0.6); T.grow(band2, 1.6, 0.6);
      const lb = h("div", "lbl t-aside", "his sketch idea"); lb.style.fontSize = "2.2cqw"; c.appendChild(lb); T.fade(lb, 2.0);
      const btn = at(scene, h("a", "pencil-btn big-btn", "Try the Online Friction Lab ↗"), 22, 84);
      btn.href = LAB_URL; btn.target = "_blank"; btn.rel = "noopener"; btn.id = "labBtn";
      T.pop(btn, 2.8);
    },
    { side: `<p><a class="pencil-btn" href="${LAB_URL}" target="_blank" rel="noopener">Try the Online Friction Lab ↗</a></p>` }),
];

function staticDeepDive(n) {
  // Pages 18 to 21 share one graph card and one mini rig, so each page starts from the previous final frame.
  const conf = {
    18: { title: "Static friction matches you", kicker: "EXPLAIN · STATIC GRAPH 1 OF 3: HOLDING STILL",
      side: `<p>Pulled horizontally on a level surface.</p><p>The cart is not moving, so the forces balance.</p><p>Pull 2 N, friction is 2 N.</p><p>Pull 5 N, friction is 5 N.</p><p id="sA"><span class="t-head">Ff,s ≤ μs FN</span></p><p class="q" id="sB">If you pull 4 N and it doesn’t move, what is friction?</p><p class="aside" id="sC" style="font-size:1.12cqw">The graph on your sheet shows the shape, not exact values. Your drop may be smaller.</p>`,
      cap: "If you pull 4 N and it doesn’t move, what is friction?" },
    19: { title: "The breaking point", kicker: "EXPLAIN · STATIC GRAPH 2 OF 3: THE THRESHOLD",
      side: `<p>Static friction has a limit.</p><p id="sA">At the peak, Ff,s(max) = μs FN.</p><p class="q" id="sB">What happens if you pull even a tiny bit more?</p><p class="aside" style="font-size:1.12cqw">The graph on your sheet shows the shape, not exact values. Your drop may be smaller.</p>`,
      cap: "What happens if you pull even a tiny bit more?" },
    20: { title: "Slip!", kicker: "EXPLAIN · STATIC GRAPH 3 OF 3: THE DROP",
      side: `<p>Once it slides, friction drops to Ff,k = μk FN and stays about the same.</p><p id="sA"><b class="t-head">Why it drops</b><br>When the surfaces sit still, the tiny touching points slowly squish together and stick harder. Once it slides, those points keep breaking and re-forming before they can stick as strongly, so kinetic friction is smaller.</p><p class="q" id="sB">Why is starting harder than sliding?</p><p class="aside" style="font-size:1.12cqw">The graph on your sheet shows the shape, not exact values. Your drop may be smaller.</p>`,
      cap: "Why is starting harder than sliding?" },
  }[n];
  return {
    ...conf, slow: true,
    build(scene, T) {
      const want = ["static_band_static", "static_axes", "static_seg1_rise", "region_label_static"];
      if (n >= 19) want.push("static_band_threshold", "static_peak_dot", "static_label_max", "region_label_threshold");
      if (n >= 20) want.push("static_seg2_drop", "static_band_kinetic", "static_seg3_kinetic", "static_label_kinetic_eq", "region_label_kinetic");
      carpet(scene, 59, 34, 41);
      const R = rig(scene, 61, 10, 38, { weights: ["1000", "500", "200"] });
      const c = card(scene, 2, 10, 56, { keep: true });
      const L = staticGraph(c, want);
      L.static_peak_dot && (L.static_peak_dot.style.transformOrigin = `${SB.peak[0] * 100}% ${SB.peak[1] * 100}%`);
      const fb = h("div", "p", null, { left: "17%", top: "84%" }); R.sledG.appendChild(fb);
      const pullA = farrow(fb, 0, 0, 7, 0, "#6FA3E0"), fricA = farrow(fb, 0, 0, 7, 180, "#B8322A");
      const r90 = riseWipeRight(0.9);
      if (n === 18) {
        T.fade(c, 0, 0.4);
        T.fade(L.static_band_static, 0.6, 0.5); T.fade(L.region_label_static, 0.6, 0.5);
        T.wipe(L.static_seg1_rise, 1.2, 2.4, SB.seg1_rise[0], r90);
        T.needle(R.needle, 1.2, 2.4, 0, 7.8 * 0.9);
        T.A(pullA, [{ transform: "scaleX(0)" }, { transform: "scaleX(.9)" }], 1.2, 2.4, EASE.linear);
        T.A(fricA, [{ transform: "scaleX(0)" }, { transform: "scaleX(.9)" }], 1.2, 2.4, EASE.linear);
        T.fade(document.getElementById("sA"), 3.8); T.fade(document.getElementById("sB"), 4.6); T.fade(document.getElementById("sC"), 5.4);
        return;
      }
      // pages 19 and 20 open on the previous page's final frame
      R.needle.style.left = "0"; // overwritten by animations below
      if (n === 19) {
        T.wipe(L.static_seg1_rise, 0, 0.001, SB.seg1_rise[0], r90);
        T.wipe(L.static_seg1_rise, 0.4, 0.8, SB.seg1_rise[0], SB.seg1_rise[1], EASE.linear, r90);
        T.needle(R.needle, 0, 0.001, 7.02, 7.02); T.needle(R.needle, 0.4, 0.8, 7.02, 7.8);
        T.A(pullA, [{ transform: "scaleX(.9)" }, { transform: "scaleX(1)" }], 0.4, 0.8, EASE.linear);
        T.A(fricA, [{ transform: "scaleX(.9)" }, { transform: "scaleX(1)" }], 0.4, 0.8, EASE.linear);
        T.pop(L.static_peak_dot, 1.2); T.pulse(L.static_peak_dot, 1.3, 1.5, 0.4);
        T.fade(L.static_band_threshold, 1.6, 0.4); T.fade(L.region_label_threshold, 1.6, 0.4);
        T.wipe(L.static_label_max, 2.0, 0.5, ...SB.label_max, EASE.out);
        T.fade(document.getElementById("sA"), 2.0);
        T.needleSeq(R.needle, 2.8, 0.6, [7.8, 7.85, 7.75, 7.85, 7.75, 7.8]);
        T.fade(document.getElementById("sB"), 3.6);
        return;
      }
      // page 20: the drop
      T.needle(R.needle, 0, 0.001, 7.8, 7.8);
      const slip = say(scene, "Slip!", 40, 2, 20, "big"); slip.classList.add("p20-slip"); slip.style.color = "var(--red)"; slip.style.fontSize = "5cqw"; T.pop(slip, 0.4);
      T.wipe(L.static_seg2_drop, 0.5, 0.3, ...SB.seg2_drop, EASE.inQuad);
      T.needle(R.needle, 0.5, 0.3, 7.8, 7.0, EASE.inQuad);
      T.A(R.r, [{ transform: "translateX(0)" }, { transform: "translateX(2.2cqw)" }], 0.5, 0.3, EASE.inQuad);
      T.A(fricA, [{ transform: "scaleX(1)" }, { transform: "scaleX(.9)" }], 0.5, 0.3);
      T.fade(L.static_band_kinetic, 0.9, 0.4);
      T.wipe(L.static_seg3_kinetic, 0.9, 1.8, ...SB.seg3_kinetic);
      T.A(R.r, [{ transform: "translateX(0)" }, { transform: "translateX(5cqw)" }], 0.9, 1.8, EASE.linear);
      T.fade(L.static_label_kinetic_eq, 2.8); T.fade(L.region_label_kinetic, 2.8);
      const inset = card(scene, 68, 52, 24, { keep: true }); inset.style.padding = ".6cqw";
      const lz = lens(inset, 0, 0, 100); lz.l.style.position = "relative";
      T.fade(inset, 3.4, 0.4);
      lz.rings.forEach((r, i) => { T.A(r, [{ transform: "scale(1)" }, { transform: "scale(.8)" }], 3.4, 0.3); T.A(r, [{ opacity: 1 }, { opacity: 0.2 }, { opacity: 1 }, { opacity: 0.3 }, { opacity: 1 }], 3.5 + i * 0.1, 1.2); });
      T.fade(document.getElementById("sA"), 4.8); T.fade(document.getElementById("sB"), 5.6);
    },
  };
}

function star(rx, ry, ix, iy, pts) {
  let d = "";
  for (let i = 0; i < pts * 2; i++) {
    const a = (Math.PI * i) / pts - Math.PI / 2, o = i % 2 === 0;
    const x = Math.cos(a) * (o ? rx : ix) * 0.95, y = Math.sin(a) * (o ? ry : iy) * 0.95;
    d += (i ? "L" : "M") + x.toFixed(1) + " " + y.toFixed(1);
  }
  return d + "Z";
}
