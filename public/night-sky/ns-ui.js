// Night Sky controls. One panel model (tabs, rows, buttons -> reducer actions) rendered two ways:
// as HTML on the page (desktop and phone). The headset panel (no DOM overlay in immersive-vr on Quest) is
// ns-vrpanel.js, Leo's look. Wording is placeholder for Socrates.
import { PLACES } from "./ns-state.js";

export const TABS = [{ id: "time", label: "Time" }, { id: "place", label: "Place" }, { id: "sky", label: "Sky" }, { id: "help", label: "Help" }];
const H = 3600e3, DAY = 24 * H;
const SPEEDS = [[-3600, "-3600x"], [-600, "-600x"], [-60, "-60x"], [1, "1x"], [60, "60x"], [600, "600x"], [3600, "3600x"]];

export function fmtLocal(ms, tz) {
  try {
    const d = new Date(ms);
    const date = new Intl.DateTimeFormat("en-US", { timeZone: tz, weekday: "short", month: "short", day: "numeric", year: "numeric" }).format(d);
    const time = new Intl.DateTimeFormat("en-US", { timeZone: tz, hour: "numeric", minute: "2-digit", timeZoneName: "short" }).format(d);
    return { date, time };
  } catch { return { date: new Date(ms).toISOString().slice(0, 10), time: new Date(ms).toISOString().slice(11, 16) + " UTC" }; }
}
export const fmtUtc = (ms) => new Date(ms).toISOString().slice(0, 16).replace("T", " ") + " UTC";
const fmtLat = (v) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? "N" : "S"}`;
const fmtLon = (v) => `${Math.abs(v).toFixed(2)}° ${v >= 0 ? "E" : "W"}`;

/** The panel model. info: { simMs, artStatus, vr } */
export function panelModel(st, info) {
  const locked = (g) => st.lock.includes(g);
  const b = (id, text, action, on, group) => ({ id, text, action, on: !!on, disabled: group ? locked(group) : false });
  const { date, time } = fmtLocal(info.simMs, st.tz);
  const playing = st.clock.speed !== 0;
  const tabs = {
    time: [
      { readout: [date, time, fmtUtc(info.simMs)], id: "clock" },
      { items: [b("play", playing ? "Pause" : "Play", { type: "togglePlay" }, playing, "time"), b("now", "Now", { type: "now" }, st.timeSpec.kind === "now", "time"), b("tonight", "Tonight 9 PM", { type: "tonight" }, false, "time")] },
      { label: "Speed", items: SPEEDS.map(([s, t]) => b("speed" + s, t, { type: "setSpeed", speed: s }, st.clock.speed === s, "time")) },
      { label: "Step", items: [b("h-", "-1 hour", { type: "jump", deltaMs: -H }, 0, "time"), b("h+", "+1 hour", { type: "jump", deltaMs: H }, 0, "time"), b("d-", "-1 day", { type: "jump", deltaMs: -DAY }, 0, "time"), b("d+", "+1 day", { type: "jump", deltaMs: DAY }, 0, "time"),
        b("m-", "-1 month", { type: "jump", months: -1 }, 0, "time"), b("m+", "+1 month", { type: "jump", months: 1 }, 0, "time"), b("m6", "+6 months", { type: "jump", months: 6 }, 0, "time")] },
      { label: "Season (about 10 PM)", items: [["mar", "Mar 20"], ["jun", "Jun 21"], ["sep", "Sep 22"], ["dec", "Dec 21"]].map(([k, t]) => b("season-" + k, t, { type: "season", season: k }, 0, "time")) },
      ...(st.clampNote ? [{ note: "Dates are limited to 1900 to 2050." }] : []),
      ...(locked("time") ? [{ note: "Time is locked for this lab." }] : []),
    ],
    place: [
      { readout: [st.loc && PLACES[st.loc] ? PLACES[st.loc].name : "Custom place", `${fmtLat(st.lat)}, ${fmtLon(st.lon)}`, `Clock: ${st.tz}`], id: "where" },
      { items: Object.entries(PLACES).map(([k, p]) => b("loc-" + k, p.name, { type: "setPlace", loc: k }, st.loc === k, "place")) },
      { label: "Latitude", items: [[-10, "-10°"], [-1, "-1°"], [1, "+1°"], [10, "+10°"]].map(([d, t]) => b("lat" + d, t, { type: "nudge", dLat: d }, 0, "place")) },
      { label: "Longitude", items: [[-10, "-10°"], [-1, "-1°"], [1, "+1°"], [10, "+10°"]].map(([d, t]) => b("lon" + d, t, { type: "nudge", dLon: d }, 0, "place")) },
      ...(st.latLonGiven && !st.tzGiven ? [{ note: "Custom place: the clock uses this device's time zone." }] : []),
      ...(locked("place") ? [{ note: "Place is locked for this lab." }] : []),
    ],
    sky: [
      { label: "Constellations", items: [b("lines", "Lines", { type: "toggle", key: "lines" }, st.lines, "sky"), b("art", info.artStatus === "loading" && st.art ? "Art (loading)" : "Art", { type: "toggle", key: "art" }, st.art, "sky"), b("names", "Names", { type: "toggle", key: "names" }, st.names, "sky"), b("helpoff", "Help off", { type: "helpOff" }, 0, "sky")] },
      { label: `Art brightness ${Math.round(st.artalpha * 100)}%`, items: [b("aa-", "Dimmer", { type: "set", key: "artalpha", value: Math.max(0, +(st.artalpha - 0.1).toFixed(2)) }, 0, "sky"), b("aa+", "Brighter", { type: "set", key: "artalpha", value: Math.min(1, +(st.artalpha + 0.1).toFixed(2)) }, 0, "sky")] },
      { label: "Labels and guides", items: [b("starnames", "Star names", { type: "toggle", key: "starnames" }, st.starnames, "sky"), b("polaris", "Find Polaris", { type: "set", key: "hl", value: st.hl === "polaris" ? "" : "polaris" }, st.hl === "polaris", "sky"), b("planets", "Planets and Moon", { type: "toggle", key: "planets" }, st.planets, "sky")] },
      { label: "Grid", items: [b("g-altaz", "Alt/Az", { type: "toggleGrid", grid: "altaz" }, st.grid.includes("altaz"), "sky"), b("g-eq", "RA/Dec", { type: "toggleGrid", grid: "eq" }, st.grid.includes("eq"), "sky"), b("g-ecl", "Ecliptic", { type: "toggleGrid", grid: "ecl" }, st.grid.includes("ecl"), "sky")] },
      { label: "Ground", items: [b("ground1", "Solid", { type: "set", key: "ground", value: true }, st.ground, "sky"), b("ground0", "See-through", { type: "set", key: "ground", value: false }, !st.ground, "sky")] },
      { label: "Star trails", items: [[0, "Off"], [2, "2 h"], [6, "6 h"], [12, "12 h"]].map(([h, t]) => b("tr" + h, t, { type: "set", key: "trails", value: h }, st.trails === h, "sky")) },
      { label: "Faintest stars", items: [4, 5, 5.5, 6, 6.5].map((m) => b("mag" + m, m.toFixed(1), { type: "set", key: "mag", value: m }, st.mag === m, "sky")) },
      { label: "Sky", items: [b("sky-night", "Night", { type: "set", key: "sky", value: "night" }, st.sky === "night", "sky"), b("sky-real", "Real daylight", { type: "set", key: "sky", value: "real" }, st.sky === "real", "sky"), b("vignette", "Comfort vignette", { type: "toggle", key: "vignette" }, st.vignette, null), b("reset", "Reset", { type: "reset" }, 0, "sky")] },
      ...(locked("sky") ? [{ note: "Sky settings are locked for this lab." }] : []),
    ],
    help: [
      { readout: info.vr
        ? ["Point and pull the trigger to pick a star or press a button.", "Hold grip and sweep to scrub time. Thumbstick left/right scrubs too.", "B or Y shows and hides this panel. Drag the top bar to move it."]
        : ["Drag to look around. Click or tap a star for its card.", "Keys: Space play/pause, arrows step 1 hour (Shift: 1 day),", "L lines, A art, N names."], id: "controls" },
      { label: "Credits", readout: ["Stars: HYG database v4.4, astronexus (David Nash), CC BY-SA 4.0.", "Lines and names: Stellarium sky culture (western), CC BY-SA.", "Art: Johan Meuris (Stellarium), restyled by Leo, Free Art License 1.3.", "Font: Inter, SIL Open Font License 1.1.", "Planets: JPL approximate elements. Sun and Moon: Meeus.", "Planets are enlarged so you can find them. Through your eyes they look like bright stars."], id: "credits" },
    ],
  };
  return { tabs: TABS, rows: tabs };
}

// ---------- HTML rendering (page) ----------
export function renderDom(root, model, tab, dispatch, onTab) {
  const focusId = document.activeElement && document.activeElement.dataset ? document.activeElement.dataset.bid : null;
  root.innerHTML = "";
  const tl = el("div", "ns-tabs"); tl.setAttribute("role", "tablist");
  for (const t of model.tabs) {
    const bt = el("button", "ns-tab" + (t.id === tab ? " is-on" : ""), t.label); bt.type = "button"; bt.setAttribute("role", "tab");
    bt.setAttribute("aria-selected", t.id === tab ? "true" : "false"); bt.dataset.bid = "tab-" + t.id; bt.onclick = () => onTab(t.id); tl.append(bt);
  }
  const panel = el("div", "ns-tabpanel"); panel.setAttribute("role", "tabpanel");
  for (const r of model.rows[tab]) {
    const row = el("div", "ns-row");
    if (r.label) row.append(el("p", "ns-row-label", r.label));
    if (r.readout) { const ro = el("div", "ns-readout" + (r.id ? " ns-readout-" + r.id : "")); r.readout.forEach((t, i) => ro.append(el("p", i === 0 && r.id === "clock" ? "ns-big" : "", t))); row.append(ro); }
    if (r.note) row.append(el("p", "ns-note", r.note));
    if (r.items) {
      const g = el("div", "ns-btns");
      for (const it of r.items) {
        const bt = el("button", "ns-btn" + (it.on ? " is-on" : ""), it.text); bt.type = "button"; bt.dataset.bid = it.id; bt.disabled = it.disabled;
        bt.setAttribute("aria-pressed", it.on ? "true" : "false"); bt.onclick = () => dispatch(it.action); g.append(bt);
      }
      row.append(g);
    }
    panel.append(row);
  }
  root.append(tl, panel);
  if (focusId) { const f = root.querySelector(`[data-bid="${CSS.escape(focusId)}"]`); if (f) f.focus(); }
}
function el(tag, cls, text) { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }
