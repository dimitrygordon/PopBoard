// Periodic Table app. mountPeriodicTable(root, {embedded}) renders the whole tool into root, so
// it works as its own page (study-periodic-table.html) or inside another module (Atom Builder).
import { CATS, catKey, PRESETS, T_MAX, TRENDS, DECAY, YEAR_MIN, YEAR_MAX, loadElements, stateAt, knownBy, trendRange, trendLevel, kToC, kToF, subshells, ORBITALS, orbitalCloud } from "./pt-core.js";

const h = (tag, { dataset, ...props } = {}, ...kids) => { const n = Object.assign(document.createElement(tag), props); if (dataset) Object.assign(n.dataset, dataset); n.append(...kids.flat(Infinity).filter((k) => k != null && k !== false)); return n; };
const fmt = (v, d = 2) => v == null ? "-" : (Math.abs(v) >= 100 ? Math.round(v * 10) / 10 : +v.toFixed(d)).toString();
const reduced = () => matchMedia("(prefers-reduced-motion: reduce)").matches;
const DM = { A: "\u03b1", "B-": "\u03b2\u207b", EC: "EC", "EC+B+": "EC/\u03b2\u207a", "B+": "\u03b2\u207a", SF: "SF", IT: "IT", P: "p", N: "n" };
const PHASE = { solid: "Sol", liquid: "Liq", gas: "Gas", unknown: "?" };
const sup = (cfg) => (cfg || "").replace(/([spdf])(\d+)/g, (_, l, n) => l + n.replace(/\d/g, (d) => "\u2070\u00b9\u00b2\u00b3\u2074\u2075\u2076\u2077\u2078\u2079"[d]));

export async function mountPeriodicTable(root, opts = {}) {
  const els = await loadElements();
  const S = { mode: "category", T: 293, trend: "en", year: 1763, sel: null, drawer: null, view: "bohr2d", orb: null, filter: { cat: "", block: "", phase: "" } };
  root.classList.add("pt-root");
  const modes = [["temperature", "Temperature"], ["trends", "Trends"], ["year", "Year"], ["isotopes", "Isotopes"], ["filters", "Filters"]];
  const tabs = h("div", { className: "pt-tabs", role: "tablist", ariaLabel: "Table mode" },
    modes.map(([k, t]) => h("button", { type: "button", role: "tab", className: "pt-tab", textContent: t, dataset: { mode: k }, ariaSelected: "false", onclick: () => setMode(S.mode === k ? "category" : k) })));
  const panel = h("div", { className: "pt-panel", id: "ptPanel" });
  const grid = h("div", { className: "pt-grid", id: "ptGrid", role: "grid", ariaLabel: "Periodic table" });
  const insp = h("section", { className: "pt-inspector", id: "ptInspector", ariaLive: "polite" });
  const legend = h("div", { className: "pt-legend", id: "ptLegend" });
  const flyout = h("div", { className: "pt-flyout", id: "ptFlyout", hidden: true });
  const drawer = h("aside", { className: "pt-drawer", id: "ptDrawer", hidden: true, role: "dialog", ariaModal: "true", ariaLabel: "Element details" });
  const scrim = h("div", { className: "pt-scrim", hidden: true, onclick: () => closeDrawer() });
  const tiles = els.map((e) => {
    const t = h("button", { type: "button", className: "pt-tile cat-" + catKey(e.cat), dataset: { z: e.z }, ariaLabel: `${e.name}, ${e.z}` },
      h("span", { className: "pt-z", textContent: e.z }), h("span", { className: "pt-badge" }), h("span", { className: "pt-sym", textContent: e.sym }),
      h("span", { className: "pt-name", textContent: e.name }), h("span", { className: "pt-mass", textContent: fmt(e.mass, 3) }));
    t.style.gridColumn = e.x; t.style.gridRow = e.y;
    t.addEventListener("pointerenter", () => hover(e, t)); t.addEventListener("focus", () => hover(e, t));
    t.addEventListener("pointerleave", () => { flyout.hidden = true; });
    t.addEventListener("click", () => openDrawer(e));
    grid.append(t); return t;
  });
  const scroller = h("div", { className: "pt-scroll" }, grid);
  root.append(tabs, panel, scroller, legend, flyout, scrim, drawer);
  // Phones: the table scrolls sideways, so the inspector sits above it instead of inside the gap.
  const phone = matchMedia("(max-width: 700px)");
  const place = () => (phone.matches ? root.insertBefore(insp, scroller) : grid.prepend(insp));
  place(); phone.addEventListener("change", place);

  // ---------- inspector + mini Bohr ----------
  let mini = null;
  function hover(e, tile) {
    S.sel = e; tiles.forEach((t) => t.classList.toggle("is-sel", t === tile));
    const lines = [`Mass: ${fmt(e.mass, 3)}`, e.cat, sup(e.config)];
    if (S.mode === "temperature") lines.push(`${cap(stateAt(e, S.T))} at ${S.T} K`);
    if (S.mode === "trends") { const tr = TRENDS.find((x) => x[0] === S.trend); lines.push(`${tr[1]}: ${fmt(e[tr[3]])} ${tr[2]}`); }
    if (S.mode === "year") lines.push(e.ancient ? "Known since ancient times" : `Discovered: ${e.year ?? "-"}`);
    lines.push(`MP: ${fmt(e.mp)} K`, `BP: ${fmt(e.bp)} K`, `Phase: ${e.phase || "-"}`);
    const cv = h("canvas", { className: "pt-mini", width: 160, height: 160, ariaHidden: "true" });
    insp.replaceChildren(h("div", { className: "pt-big cat-" + catKey(e.cat) }, h("p", { className: "pt-bigsym", textContent: e.sym }), h("p", { className: "pt-bigname", textContent: e.name }), h("p", { className: "pt-bignum", textContent: "#" + e.z })),
      h("ul", { className: "pt-facts" }, lines.map((l, i) => h("li", { textContent: l, className: i === 3 && S.mode !== "category" ? "hl" : "" }))), cv);
    mini && mini.stop(); mini = bohr2d(cv, e, { size: 160 });
    if (S.mode === "isotopes" && tile) showFlyout(e, tile);
  }
  function showFlyout(e, tile) {
    const r = tile.getBoundingClientRect(), rr = root.getBoundingClientRect();
    flyout.replaceChildren(h("p", { className: "pt-fly-h", textContent: `${e.name} isotopes` }),
      e.iso.length ? h("ul", {}, e.iso.slice(0, 8).map((i) => h("li", { className: i.hl === "Stable" ? "st" : "rad" }, h("b", { textContent: `${e.sym}-${i.A}` }), ` ${i.ab != null ? i.ab + "%" : ""} ${i.hl === "Stable" ? "stable" : (i.hl || "") + " " + (DM[i.dm] || i.dm || "")}`))) : h("p", { textContent: "No measured isotopes listed" }),
      h("p", { className: "pt-fly-f", textContent: "Click for full detail" }));
    flyout.hidden = false;
    flyout.style.left = Math.min(r.left - rr.left, rr.width - 220) + "px"; flyout.style.top = (r.bottom - rr.top + 6) + "px";
  }
  const cap = (s) => s[0].toUpperCase() + s.slice(1);

  // ---------- modes ----------
  function setMode(m) {
    S.mode = m; root.dataset.mode = m; flyout.hidden = true;
    tabs.querySelectorAll(".pt-tab").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.mode === m)));
    renderPanel(); paint(); if (S.sel) hover(S.sel, tiles[S.sel.z - 1]);
  }
  function renderPanel() {
    const m = S.mode; panel.replaceChildren(); panel.hidden = m === "category";
    if (m === "temperature") {
      const num = h("input", { type: "number", min: 0, max: T_MAX, value: S.T, className: "pt-num", ariaLabel: "Temperature in kelvin" });
      const sl = h("input", { type: "range", min: 0, max: T_MAX, value: S.T, className: "pt-range", id: "ptTemp", ariaLabel: "Temperature" });
      const conv = h("span", { className: "pt-dim" });
      const set = (v) => { S.T = Math.max(0, Math.min(T_MAX, Math.round(+v || 0))); sl.value = num.value = S.T; conv.textContent = `${Math.round(kToC(S.T))} \u00b0C / ${Math.round(kToF(S.T))} \u00b0F`; paint(); if (S.sel) hover(S.sel, tiles[S.sel.z - 1]); presets.querySelectorAll("button").forEach((b) => b.setAttribute("aria-pressed", String(+b.dataset.t === S.T))); };
      sl.oninput = () => set(sl.value); num.onchange = () => set(num.value);
      const presets = h("div", { className: "pt-row pt-presets" }, PRESETS.map(([n, t]) => h("button", { type: "button", textContent: n, dataset: { t }, onclick: () => set(t) })));
      panel.append(h("div", { className: "pt-row" }, h("span", { className: "pt-dim", textContent: "0 K" }), sl, h("span", { className: "pt-dim", textContent: T_MAX + " K" }), num, h("span", { textContent: "K" }), conv), h("div", { className: "pt-row", id: "ptCounts" }), presets);
      set(S.T);
    } else if (m === "trends") {
      const tr = TRENDS.find((x) => x[0] === S.trend);
      panel.append(h("div", { className: "pt-row pt-wrap" }, TRENDS.map(([k, n]) => h("button", { type: "button", textContent: n, ariaPressed: String(k === S.trend), onclick: () => { S.trend = k; renderPanel(); paint(); if (S.sel) hover(S.sel, tiles[S.sel.z - 1]); } }))),
        h("p", { className: "pt-dim pt-caption", id: "ptTrendCap", textContent: tr[4] }));
    } else if (m === "year") {
      const sl = h("input", { type: "range", min: YEAR_MIN, max: YEAR_MAX, value: S.year, className: "pt-range", id: "ptYear", ariaLabel: "Discovery year" });
      const lab = h("b", { className: "pt-yr" }), cnt = h("span", { className: "pt-dim", id: "ptKnown" });
      const set = (v) => { S.year = +v; lab.textContent = S.year + " CE"; cnt.textContent = `${els.filter((e) => knownBy(e, S.year)).length} / 118 elements known`; paint(); };
      sl.oninput = () => set(sl.value);
      const play = h("button", { type: "button", textContent: "Play", onclick: () => { let y = YEAR_MIN; clearInterval(play._i); play._i = setInterval(() => { y += 5; sl.value = Math.min(y, YEAR_MAX); set(sl.value); if (y >= YEAR_MAX) clearInterval(play._i); }, reduced() ? 200 : 60); } });
      panel.append(h("div", { className: "pt-row" }, h("span", { textContent: "Discovery Year" }), lab, cnt, play), h("div", { className: "pt-row" }, h("span", { className: "pt-dim", textContent: YEAR_MIN + " CE" }), sl, h("span", { className: "pt-dim", textContent: YEAR_MAX + " CE" })), h("p", { className: "pt-dim pt-caption", textContent: "Elements known since ancient times are always shown." }));
      set(S.year);
    } else if (m === "isotopes") {
      panel.append(h("p", { className: "pt-caption", textContent: "Isotopes: primary decay mode of each element's most stable isotope. Hover to preview isotopes; click for the full detail view." }));
    } else if (m === "filters") {
      const sel = (key, label, opts) => h("label", { className: "pt-sel" }, label + " ", h("select", { onchange: (ev) => { S.filter[key] = ev.target.value; paint(); } }, h("option", { value: "", textContent: "Any" }), opts.map((o) => h("option", { value: o, textContent: o, selected: S.filter[key] === o }))));
      panel.append(h("div", { className: "pt-row pt-wrap" }, sel("cat", "Category", CATS.map((c) => c[0])), sel("block", "Block", ["s", "p", "d", "f"]), sel("phase", "Phase at room temp", ["Solid", "Liquid", "Gas"])), h("p", { className: "pt-dim pt-caption", id: "ptMatch" }));
    }
  }
  function paint() {
    const m = S.mode, tr = TRENDS.find((x) => x[0] === S.trend), rng = m === "trends" ? trendRange(els, tr[3]) : null;
    const counts = { solid: 0, liquid: 0, gas: 0, unknown: 0 }; let match = 0;
    els.forEach((e, i) => {
      const t = tiles[i], b = t.querySelector(".pt-badge"); let k = "", badge = "", dim = false;
      if (m === "temperature") { const st = stateAt(e, S.T); counts[st]++; k = "st-" + st; badge = PHASE[st]; }
      else if (m === "trends") { const lv = trendLevel(e, tr[3], rng); k = lv == null ? "tr-none" : "tr-" + lv; badge = e[tr[3]] == null ? "" : fmt(e[tr[3]]); }
      else if (m === "year") { dim = !knownBy(e, S.year); badge = e.ancient ? "" : (e.year || ""); }
      else if (m === "isotopes") { k = "dc-" + e.decay; badge = e.decay === "stable" ? (e.nStable > 1 ? String(e.nStable) : "Stable") : { alpha: "\u03b1", "beta-": "\u03b2\u207b", ec: "EC", sf: "SF" }[e.decay] || "?"; }
      else if (m === "filters") { const f = S.filter, ok = (!f.cat || e.cat === f.cat) && (!f.block || e.block === f.block) && (!f.phase || stateAt(e, 293) === f.phase.toLowerCase()); dim = !ok; match += ok; }
      t.dataset.k = k; t.classList.toggle("is-dim", dim); b.textContent = badge;
    });
    const c = root.querySelector("#ptCounts"); if (c) c.replaceChildren(...["solid", "liquid", "gas", "unknown"].map((s) => h("span", { className: "pt-key st-" + s, textContent: `${cap(s)} (${counts[s]})` })));
    const mm = root.querySelector("#ptMatch"); if (mm) mm.textContent = `${match} elements match`;
    legend.replaceChildren(...(m === "isotopes" ? [...DECAY.map(([k, n]) => h("span", { className: "pt-key dc-" + k, textContent: n })), h("span", { className: "pt-dim", textContent: "Number = count of stable isotopes" })]
      : m === "trends" ? [h("span", { className: "pt-key tr-0", textContent: "Low" }), h("span", { className: "pt-key tr-2" , textContent: "Mid"}), h("span", { className: "pt-key tr-4", textContent: "High" }), h("span", { className: "pt-key tr-none", textContent: "No data" })]
      : m === "year" ? [h("span", { className: "pt-key", textContent: `Known by ${S.year} CE` }), h("span", { className: "pt-key is-dim", textContent: "Not yet discovered" })]
      : m === "temperature" ? [] : CATS.map(([n, k]) => h("span", { className: "pt-key cat-" + k, textContent: n }))));
  }

  // ---------- drawer ----------
  let anim = null;
  function openDrawer(e) {
    S.drawer = e; anim && anim.stop();
    const st = e.iso.filter((i) => i.hl === "Stable").length;
    const nN = Math.round(e.mass || 0) - e.z;
    const views = [["bohr2d", "Bohr 2D"], ["bohr3d", "Bohr 3D"], ["qm", "QM orbitals"]];
    const stage = h("div", { className: "pt-stage" });
    const viewBar = h("div", { className: "pt-seg", role: "tablist", ariaLabel: "Atom model" }, views.map(([k, n]) => h("button", { type: "button", role: "tab", textContent: n, dataset: { view: k }, ariaSelected: String(S.view === k), onclick: () => { S.view = k; viewBar.querySelectorAll("button").forEach((b) => b.setAttribute("aria-selected", String(b.dataset.view === k))); drawModel(); } })));
    function drawModel() {
      anim && anim.stop(); stage.replaceChildren();
      const cv = h("canvas", { className: "pt-model", width: 320, height: 300, tabIndex: 0, ariaLabel: `${e.name} ${S.view === "qm" ? "orbital" : "Bohr"} model` });
      stage.append(cv);
      if (S.view === "bohr2d") anim = bohr2d(cv, e, { size: 300 });
      else if (S.view === "bohr3d") anim = bohr3d(cv, e);
      else {
        const subs = subshells(e.configFull), last = subs[subs.length - 1] || { n: 1, l: "s", e: 0 };
        if (!S.orb || !subs.some((s) => s.n === S.orb.n && s.l === S.orb.l)) S.orb = { n: last.n, l: last.l, m: 0 };
        const pick = h("div", { className: "pt-row pt-wrap pt-orbs" }, subs.map((s) => h("button", { type: "button", textContent: `${s.n}${s.l}${s.e}`.replace(/(\d+)$/, (d) => sup("s" + d).slice(1)), ariaPressed: String(s.n === S.orb.n && s.l === S.orb.l), onclick: () => { S.orb = { n: s.n, l: s.l, m: 0 }; drawModel(); } })));
        const ms = h("div", { className: "pt-row pt-wrap pt-orbs" }, ORBITALS[S.orb.l].map(([n], i) => h("button", { type: "button", textContent: n, ariaPressed: String(i === S.orb.m), onclick: () => { S.orb.m = i; drawModel(); } })));
        stage.append(pick, ms, h("p", { className: "pt-dim pt-caption", textContent: `${S.orb.n}${S.orb.l} orbital shape: where an electron is likely to be found. Two colors show the two signs of the wave. Drag to rotate.` }));
        anim = qmView(cv, S.orb);
      }
    }
    const nav = (d) => { const n = els[e.z - 1 + d]; return n ? h("button", { type: "button", className: "pt-nav", textContent: d < 0 ? `\u2039 ${n.z} \u00b7 ${n.name}` : `${n.z} \u00b7 ${n.name} \u203a`, onclick: () => openDrawer(n) }) : h("span"); };
    drawer.replaceChildren(
      h("header", { className: "pt-dh" }, h("div", { className: "pt-dsym cat-" + catKey(e.cat) }, h("b", { textContent: e.sym }), h("small", { textContent: e.z })),
        h("div", {}, h("h2", { textContent: e.name }), h("p", { className: "pt-dim", textContent: `${fmt(e.mass, 4)} g/mol \u00b7 ${e.cat}` })),
        h("button", { type: "button", className: "pt-close", ariaLabel: "Close", textContent: "\u00d7", onclick: () => closeDrawer() })),
      h("nav", { className: "pt-navrow" }, nav(-1), nav(1)),
      h("p", { className: "pt-desc", textContent: e.summary }),
      h("dl", { className: "pt-props" }, [["Configuration", sup(e.config)], ["Shells", e.shells.join(", ")], ["Melting point", fmt(e.mp) + " K"], ["Boiling point", fmt(e.bp) + " K"], ["Density", fmt(e.density, 3) + " g/cm\u00b3"], ["Electronegativity", fmt(e.en)], ["Phase (room temp)", e.phase || "-"], ["Discovered", e.ancient ? "Ancient" : e.year ?? "-"]].map(([k, v]) => [h("dt", { textContent: k }), h("dd", { textContent: v })])),
      h("h3", { textContent: "Isotopes" }), h("p", { className: "pt-dim", textContent: `${st} stable \u00b7 ${e.iso.length - st} radioactive listed` }),
      h("table", { className: "pt-iso" }, h("thead", {}, h("tr", {}, ["Isotope", "Abundance", "Half-life", "Decay"].map((c) => h("th", { textContent: c })))),
        h("tbody", {}, e.iso.map((i) => h("tr", { className: i.hl === "Stable" ? "st" : "" }, h("td", { textContent: `${e.sym}-${i.A}` }), h("td", { textContent: i.ab != null ? i.ab + "%" : "-" }), h("td", { textContent: i.hl || "-" }), h("td", { textContent: DM[i.dm] || i.dm || "-" }))))),
      h("h3", { textContent: "Atom model" }), viewBar, stage,
      h("div", { className: "pt-counts" }, [["Electrons", e.z, "e"], ["Protons", e.z, "p"], ["Neutrons", nN, "n"]].map(([k, v, c]) => h("div", { className: "pt-count c-" + c }, h("span", { textContent: k }), h("b", { textContent: v })))),
      h("p", { className: "pt-dim pt-caption", textContent: "Neutrons shown for the most common isotope (mass rounded). Bohr rings are a simple picture; the QM view shows orbital shapes." }));
    drawer.hidden = scrim.hidden = false; drawModel(); drawer.querySelector(".pt-close").focus();
  }
  function closeDrawer() { anim && anim.stop(); drawer.hidden = scrim.hidden = true; if (S.drawer) tiles[S.drawer.z - 1].focus(); S.drawer = null; }
  root.addEventListener("keydown", (ev) => {
    if (ev.key === "Escape" && !drawer.hidden) closeDrawer();
    if (S.drawer && (ev.key === "ArrowRight" || ev.key === "ArrowLeft") && ev.target.tagName !== "INPUT") { const n = els[S.drawer.z - 1 + (ev.key === "ArrowRight" ? 1 : -1)]; if (n) openDrawer(n); }
  });
  setMode("category"); hover(els[0], tiles[0]);
  return { els, setMode, openDrawer, state: S };
}

// ---------- drawing ----------
const css = (n) => getComputedStyle(document.documentElement).getPropertyValue(n).trim();
function loop(draw) {
  let raf = 0, live = true; const t0 = performance.now();
  const f = (t) => { if (!live) return; draw((t - t0) / 1000); if (!reduced()) raf = requestAnimationFrame(f); };
  raf = requestAnimationFrame(f); return { stop() { live = false; cancelAnimationFrame(raf); }, redraw() { draw(0); } };
}
function hiDPI(cv) { const d = Math.min(2, devicePixelRatio || 1), w = cv.width, hh = cv.height; cv.width = w * d; cv.height = hh * d; cv.style.width = w + "px"; cv.style.aspectRatio = `${w}/${hh}`; const c = cv.getContext("2d"); c.scale(d, d); return [c, w, hh]; }
export function bohr2d(cv, e, { size }) {
  const [c, w, hh] = hiDPI(cv), n = e.shells.length, R = size * 0.46, r0 = size * 0.08;
  return loop((t) => {
    c.clearRect(0, 0, w, hh); const cx = w / 2, cy = hh / 2;
    c.strokeStyle = css("--pt-line"); c.setLineDash([2, 4]); c.lineWidth = 1;
    e.shells.forEach((k, i) => { const r = r0 + (R - r0) * (i + 1) / n; c.beginPath(); c.arc(cx, cy, r, 0, 7); c.stroke(); });
    c.setLineDash([]); c.fillStyle = css("--pt-nucleus"); c.beginPath(); c.arc(cx, cy, r0, 0, 7); c.fill();
    c.fillStyle = css("--pt-ink"); c.font = `700 ${Math.max(8, r0 * 0.7)}px system-ui`; c.textAlign = "center"; c.textBaseline = "middle"; c.fillText("+" + e.z, cx, cy);
    c.fillStyle = css("--pt-electron");
    e.shells.forEach((k, i) => { const r = r0 + (R - r0) * (i + 1) / n, sp = 0.9 / (i + 1);
      for (let j = 0; j < k; j++) { const a = j / k * Math.PI * 2 + t * sp; c.beginPath(); c.arc(cx + r * Math.cos(a), cy + r * Math.sin(a), Math.max(1.6, size / 80), 0, 7); c.fill(); } });
  });
}
function bohr3d(cv, e) {
  const [c, w, hh] = hiDPI(cv), n = e.shells.length, R = Math.min(w, hh) * 0.44;
  const nuc = []; const A = Math.round(e.mass || e.z * 2); for (let i = 0; i < Math.min(A, 120); i++) { const u = Math.random() * 2 - 1, a = Math.random() * 7, rr = Math.cbrt(Math.random()) * Math.min(26, 6 + Math.cbrt(A) * 3.2), s = Math.sqrt(1 - u * u); nuc.push([rr * s * Math.cos(a), rr * s * Math.sin(a), rr * u, i < e.z * Math.min(A, 120) / A]); }
  return loop((t) => {
    c.clearRect(0, 0, w, hh); const cx = w / 2, cy = hh / 2, tilt = 1.15, ry = t * 0.4;
    const P = (x, y, z) => { const X = x * Math.cos(ry) + z * Math.sin(ry), Z = -x * Math.sin(ry) + z * Math.cos(ry); const Y = y * Math.cos(tilt) - Z * Math.sin(tilt), Z2 = y * Math.sin(tilt) + Z * Math.cos(tilt); return [cx + X, cy + Y, Z2]; };
    c.strokeStyle = css("--pt-line"); c.lineWidth = 1;
    const dots = [];
    e.shells.forEach((k, i) => { const r = 32 + (R - 32) * (i + 1) / n; c.beginPath(); for (let a = 0; a <= 64; a++) { const [x, y] = P(r * Math.cos(a / 64 * 7), 0, r * Math.sin(a / 64 * 7)); a ? c.lineTo(x, y) : c.moveTo(x, y); } c.stroke();
      for (let j = 0; j < k; j++) { const a = j / k * Math.PI * 2 + t * 0.8 / (i + 1); dots.push([...P(r * Math.cos(a), 0, r * Math.sin(a)), "e"]); } });
    nuc.forEach(([x, y, z, p]) => dots.push([...P(x, y, z), p ? "p" : "n"]));
    dots.sort((a, b) => b[2] - a[2]).forEach(([x, y, z, k]) => { c.fillStyle = css(k === "e" ? "--pt-electron" : k === "p" ? "--pt-proton" : "--pt-neutron"); c.beginPath(); c.arc(x, y, k === "e" ? 2.6 : 4.2, 0, 7); c.fill(); });
  });
}
function qmView(cv, { n, l, m }) {
  const [c, w, hh] = hiDPI(cv), pts = orbitalCloud(l, m, l === "s" ? 1400 : 2200, 11 + n), rot = { a: 0.6, b: 0.4 };
  let drag = null;
  cv.onpointerdown = (ev) => { drag = [ev.clientX, ev.clientY, rot.a, rot.b]; cv.setPointerCapture(ev.pointerId); };
  cv.onpointermove = (ev) => { if (!drag) return; rot.a = drag[2] + (ev.clientX - drag[0]) * 0.01; rot.b = drag[3] + (ev.clientY - drag[1]) * 0.01; if (reduced()) draw(0); };
  cv.onpointerup = () => { drag = null; };
  cv.onkeydown = (ev) => { const d = { ArrowLeft: [-0.2, 0], ArrowRight: [0.2, 0], ArrowUp: [0, -0.2], ArrowDown: [0, 0.2] }[ev.key]; if (d) { ev.preventDefault(); ev.stopPropagation(); rot.a += d[0]; rot.b += d[1]; draw(0); } };
  const S = Math.min(w, hh) * 0.42 * (l === "s" ? 0.55 + 0.12 * n : 1);
  function draw(t) {
    if (!drag && !reduced()) rot.a += 0.006;
    c.clearRect(0, 0, w, hh); const cx = w / 2, cy = hh / 2, ca = Math.cos(rot.a), sa = Math.sin(rot.a), cb = Math.cos(rot.b), sb = Math.sin(rot.b);
    c.strokeStyle = css("--pt-line"); c.lineWidth = 1;
    [[1, 0, 0, "x"], [0, 1, 0, "y"], [0, 0, 1, "z"]].forEach(([x, y, z, k]) => { const X = x * ca + y * sa, Y0 = -x * sa + y * ca, Y = Y0 * cb - z * sb; c.beginPath(); c.moveTo(cx - X * S * 1.1, cy + Y * S * 1.1); c.lineTo(cx + X * S * 1.1, cy - Y * S * 1.1); c.stroke(); c.fillStyle = css("--pt-dim"); c.fillText(k, cx + X * S * 1.18, cy - Y * S * 1.18); });
    const pos = css("--pt-orb-pos"), neg = css("--pt-orb-neg");
    for (const [x, y, z, s] of pts) { const X = x * ca + y * sa, Y0 = -x * sa + y * ca, Y = Y0 * cb - z * sb, D = Y0 * sb + z * cb; c.globalAlpha = 0.35 + 0.35 * (D + 1) / 2; c.fillStyle = s > 0 ? pos : neg; c.fillRect(cx + X * S, cy - Y * S, 2, 2); }
    c.globalAlpha = 1; c.fillStyle = css("--pt-nucleus"); c.beginPath(); c.arc(cx, cy, 3, 0, 7); c.fill();
  }
  const lp = loop(draw); return { stop: lp.stop };
}
