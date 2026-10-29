// Projectile Motion: reference wiring for the shared fun layer (public/shared/fun/).
// Every goal number below is a placeholder. TODO-TESLA: see docs/fun-challenges.md.
import {
  initFun, pressFeedback, bottomSheet, disclosure, TIERS, smoothTheme, frostedSheet, challengeCard, createChallenges, createStreak, createPrediction,
  encodeState, decodeState, sanitizeState, shareLink, sound, celebrate
} from "../shared/fun/fun-ui.js";

const MODULE_ID = "projectile";
// TODO-TESLA: every number in this block.
export const FUN = {
  bronzeHitsInARow: 3,          // Target mode: consecutive hits
  silverMaxRangeAngleTol: 1,    // Launch mode, ground, Earth: |angle - 45| <= this (deg)
  silverMinRange: 40,           // ...and range >= this (m); 20 m/s at 45 deg is about 40.79 m
  goldMinPoints: 8,             // Sandbox with air drag on and Target on: a hit worth >= this many points
  predictLine: 30               // Predict-then-run: "Will it land past 30 m?"
};
export const GOALS = [
  { tier: "bronze", title: `Hit ${FUN.bronzeHitsInARow} targets in a row`,
    check(e, c) { if (e.mode !== "target") return false; c.row = e.hit ? (c.row || 0) + 1 : 0; return c.row >= FUN.bronzeHitsInARow; } },
  { tier: "silver", title: `Max range: about 45\u00b0 from the ground, past ${FUN.silverMinRange} m`,
    check(e) { return e.mode === "launch" && e.h === 0 && Math.abs(e.angle - 45) <= FUN.silverMaxRangeAngleTol && e.range >= FUN.silverMinRange; } },
  { tier: "gold", title: `Sandbox with air drag: score ${FUN.goldMinPoints}+ on the bullseye`,
    check(e) { return e.mode === "sandbox" && e.drag && e.targetKind === "bullseye" && e.points >= FUN.goldMinPoints; } }
];
export const SHARE_SCHEMA = {
  angle: { type: "num", min: 0, max: 90 }, speed: { type: "num", min: 0, max: 200 }, h: { type: "num", min: 0, max: 500 },
  ground: { type: "bool" }, g: { type: "num", min: 0.1, max: 30 }, drag: { type: "bool" }, m: { type: "num", min: 0.001, max: 100 },
  d: { type: "num", min: 0.001, max: 2 }, cd: { type: "num", min: 0, max: 2 }, rho: { type: "num", min: 0, max: 100 },
  ideal: { type: "bool" }, target: { type: "bool" }, site: { type: "enum", values: ["cliff", "tower"] }
};

if (typeof document !== "undefined") {
  initFun(); pressFeedback();
  window.PopBoardFunTheme = smoothTheme;
  const startHash = location.hash;

  // Challenge chip over the sim; tapping opens the challenge list.
  const box = document.querySelector(".canvas-box");
  const chip = document.createElement("button"); chip.type = "button"; chip.className = "fun-chip"; chip.id = "funChip";
  const host = document.createElement("section"); host.id = "funCard"; host.className = "fun-pop";
  box.append(chip, host);
  const card = challengeCard(host, GOALS);
  disclosure(chip, host, false);
  const chipSync = (earned) => {
    const top = TIERS.filter((t) => earned.includes(t)).pop();
    const name = top ? top[0].toUpperCase() + top.slice(1) : "Challenges";
    chip.replaceChildren();
    if (top) { const m = document.createElement("span"); m.className = "fun-medal fun-badge " + top; chip.appendChild(m); }
    chip.append(`${name} ${earned.length}/${GOALS.length}`);
    chip.setAttribute("aria-label", `Challenges: ${earned.length} of ${GOALS.length} medals earned. Show list`);
  };
  const controlsEl = document.getElementById("controls");
  const extrasHost = document.createElement("section"); extrasHost.id = "funExtras"; extrasHost.className = "panel";
  controlsEl.appendChild(extrasHost);
  const streak = createStreak({ moduleId: MODULE_ID });
  const engine = createChallenges({ moduleId: MODULE_ID, goals: GOALS, onEarn: (g) => card.flash(g.tier) });
  card.update(engine.earned()); chipSync(engine.earned()); card.streak(0, streak.best);

  // Predict, then run (Launch mode).
  const pred = createPrediction({ judge: (g, r) => g === (r > FUN.predictLine), streak });
  const pbar = document.createElement("div"); pbar.className = "fun-predict";
  const plab = document.createElement("span"); plab.textContent = `Predict: lands past ${FUN.predictLine} m?`;
  const mk = (txt, v) => { const b = document.createElement("button"); b.type = "button"; b.textContent = txt; b.setAttribute("aria-pressed", "false");
    b.addEventListener("click", () => { pred.predict(v); for (const x of pbar.querySelectorAll("button")) x.setAttribute("aria-pressed", String(x === b)); }); return b; };
  pbar.append(plab, mk("Yes", true), mk("No", false));
  const extras = document.createElement("div"); extras.className = "row";
  const shareBtn = document.createElement("button"); shareBtn.type = "button"; shareBtn.textContent = "Share my setup";
  const soundBtn = document.createElement("button"); soundBtn.type = "button";
  const soundSync = () => { soundBtn.textContent = sound.on ? "Sound on" : "Sound off"; soundBtn.setAttribute("aria-pressed", String(sound.on)); };
  soundBtn.addEventListener("click", () => { sound.on = !sound.on; soundSync(); }); soundSync();
  extras.append(shareBtn, soundBtn);
  extrasHost.append(pbar, card.streakEl || host.querySelector(".fun-streak"), extras);

  const api = () => window.__projectileFun;
  const refresh = () => {
    const m = api()?.mode();
    pbar.hidden = m !== "launch";
    shareBtn.hidden = m !== "sandbox";
    frostedSheet(controlsEl, m === "sandbox");
    if (sheet) requestAnimationFrame(() => sheet.layout());
  };

  // Phones: controls become a bottom sheet with peek / half / full snaps.
  const phone = matchMedia("(max-width: 600px)");
  let sheet = null;
  const snaps = () => {
    const vh = innerHeight, tb = document.getElementById("toolbar").offsetHeight;
    document.documentElement.style.setProperty("--pj-toolbar-h", tb + "px");
    document.documentElement.style.setProperty("--pj-header-h", document.querySelector(".hud").offsetHeight + "px");
    const simBottom = box.getBoundingClientRect().bottom, hudBottom = document.querySelector(".hud").getBoundingClientRect().bottom;
    const half = Math.max(120, Math.floor(vh - tb - simBottom - 4));
    const full = Math.max(half + 40, Math.floor(vh - tb - hudBottom));
    const labs = controlsEl.querySelectorAll("[data-sliders] .slider");
    const anchor = labs[Math.min(1, labs.length - 1)] || controlsEl.querySelector('[data-group="actions"]');
    const top = controlsEl.getBoundingClientRect().top;
    const peek = anchor ? Math.ceil(anchor.getBoundingClientRect().bottom - top + 2) : 140;
    return [Math.min(half, Math.max(120, peek)), half, full];
  };
  const phoneSync = () => {
    if (phone.matches && !sheet) {
      controlsEl.classList.add("fun-sheet-on");
      sheet = bottomSheet(controlsEl, document.getElementById("sheetHandle"), { getSnaps: snaps, start: 0 });
      addEventListener("resize", onResize);
    } else if (!phone.matches && sheet) {
      sheet.destroy(); sheet = null; controlsEl.classList.remove("fun-sheet-on"); removeEventListener("resize", onResize);
    }
  };
  const onResize = () => sheet?.layout();
  phone.addEventListener?.("change", phoneSync);
  window.__funSheet = () => sheet;
  shareBtn.addEventListener("click", async () => {
    const B = api().sandbox;
    const r = await shareLink(encodeState(sanitizeState(B, SHARE_SCHEMA)));
    shareBtn.textContent = r.copied ? "Link copied" : "Link in address bar";
    setTimeout(() => { shareBtn.textContent = "Share my setup"; }, 1600);
  });
  document.getElementById("toolbar").addEventListener("click", () => setTimeout(refresh, 0));

  window.addEventListener("projectile:shot", (ev) => {
    const e = ev.detail;
    // Only shots the student fired count; live previews from sliders and page load don't.
    if (!e.user) return;
    if (e.mode === "launch" && pred.pending) {
      const r = pred.resolve(e.range);
      for (const x of pbar.querySelectorAll("button")) x.setAttribute("aria-pressed", "false");
      if (r.correct) celebrate();
      card.streak(r.streak.count, r.streak.best);
    }
    engine.report(e);
    card.update(engine.earned()); chipSync(engine.earned());
  });

  const boot = () => {
    const shared = sanitizeState(decodeState(startHash), SHARE_SCHEMA);
    if (Object.keys(shared).length) api().applySandbox(shared);
    phoneSync(); refresh();
  };
  if (api()) boot(); else window.addEventListener("projectile:ready", boot, { once: true });
}
