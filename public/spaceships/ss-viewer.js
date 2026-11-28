import { loadFleet, findCraft, assetUrl, galleryQuery, reducedMotion, assetExists } from "./ss-data.js";
import { immersiveVrSupported, vrControlState, MODE_LINE, VR_FAIL } from "./ss-vr-model.js";

const AR_AUTO_TAGS = ["planets-moons", "small-bodies"];
const $ = (id) => document.getElementById(id);

$("studyBackBtn").addEventListener("click", (e) => {
  e.preventDefault();
  location.href = "study-spaceships.html" + galleryQuery(location.search);
});
$("missingLink").href = "study-spaceships.html" + galleryQuery(location.search);

const params = new URLSearchParams(location.search);
const id = (params.get("id") || "").trim();
const fleet = await loadFleet();
const craft = findCraft(fleet, id);
const modes = $("modes");
if (modes) modes.textContent = MODE_LINE;

let current = null;
let wired = false;
let presented = 0;
// Load three.js only when this browser can open a headset, so the page viewer stays on one copy.
let vrReady = null;
let vrApi = null;
function loadVr() {
  if (!vrReady) vrReady = import("./ss-vr.js");
  return vrReady;
}

if (!craft) {
  $("missing").hidden = false;
  $("hudTitle").textContent = "Spaceships";
  document.title = "Spaceship not found // PopBoard";
} else {
  await showCraft(fleet, craft);
}

function paintCraft(craft) {
  document.title = craft.name + " // PopBoard";
  $("pageTitle").textContent = craft.name;
  $("hudTitle").textContent = craft.name;
  $("craftName").textContent = craft.name;
  $("subtitle").textContent = craft.subtitle || "";
  $("subtitle").hidden = !craft.subtitle;

  const facts = $("facts");
  facts.replaceChildren();
  for (const row of craft.facts || []) {
    const wrap = document.createElement("div");
    const dt = document.createElement("dt");
    dt.textContent = row.label || "";
    const dd = document.createElement("dd");
    dd.textContent = row.value || "";
    if (row.verified === false) {
      const mark = document.createElement("span");
      mark.className = "ph-label";
      mark.textContent = "PLACEHOLDER";
      dt.append(" ", mark);
      dd.dataset.placeholder = "true";
    }
    wrap.append(dt, dd);
    facts.append(wrap);
  }

  const sourceLabel = craft.sourceLabel || "NASA 3D Resources";
  const credit = $("credit");
  credit.replaceChildren(document.createTextNode((craft.credit || "3D model courtesy NASA") + " "));
  if (craft.sourceUrl) {
    const link = document.createElement("a");
    link.href = craft.sourceUrl;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = sourceLabel;
    credit.append(link);
  }

  const still = assetUrl(craft.still) || assetUrl(fleet.placeholderStill);
  const posterImg = $("posterImg");
  posterImg.alt = craft.name;
  if (posterImg.getAttribute("src") !== still) posterImg.src = still;
}

async function presentModel(craft) {
  const token = ++presented;
  const viewer = $("viewer");
  const arAuto = (craft.tags || []).some((t) => AR_AUTO_TAGS.includes(t));
  viewer.setAttribute("ar-scale", arAuto ? "auto" : "fixed");
  if (craft.cameraOrbit) viewer.setAttribute("camera-orbit", craft.cameraOrbit);
  else viewer.removeAttribute("camera-orbit");

  const wantedGlb = assetUrl(craft.glb);
  const placeholderGlb = assetUrl(fleet.placeholderGlb || "models/_placeholder.glb");
  const glbOk = await assetExists(wantedGlb);
  if (token !== presented) return "";
  const src = glbOk ? wantedGlb : placeholderGlb;
  const usePlaceholder = (url) => (url || "").includes("_placeholder.glb");
  const markFallback = (fallback) => {
    $("fallbackBanner").hidden = !fallback;
    $("status").textContent = fallback ? "Placeholder model" : "";
  };
  markFallback(!glbOk);
  $("posterLabel").textContent = glbOk ? "Loading 3D model" : "Loading placeholder model";
  if (!glbOk && !(await assetExists(src))) {
    if (token !== presented) return "";
    $("status").textContent = "The 3D model could not be loaded.";
    return "";
  }
  if (token !== presented) return "";
  viewer.src = src;

  const usdz = assetUrl(craft.usdz);
  if (usdz && await assetExists(usdz)) {
    if (token === presented) viewer.setAttribute("ios-src", usdz);
  } else if (token === presented) viewer.removeAttribute("ios-src");
  return src;
}

function rememberUrl(craft) {
  const url = new URL(location.href);
  url.searchParams.set("id", craft.id);
  const next = url.pathname + "?" + url.searchParams.toString();
  if (next !== location.pathname + location.search) history.replaceState(history.state, "", next);
}

async function showCraft(fleet, craft) {
  current = craft;
  $("dock").hidden = false;
  const viewer = $("viewer");
  viewer.hidden = false;
  viewer.alt = "3D model of " + craft.name;
  viewer.setAttribute("camera-controls", "");
  viewer.setAttribute("touch-action", "pan-y");
  viewer.setAttribute("ar", "");
  viewer.setAttribute("ar-modes", "webxr scene-viewer quick-look");
  viewer.setAttribute("shadow-intensity", "0");
  const still = assetUrl(craft.still) || assetUrl(fleet.placeholderStill);
  viewer.setAttribute("poster", still);
  if (!reducedMotion()) viewer.setAttribute("auto-rotate", "");
  else viewer.removeAttribute("auto-rotate");
  paintCraft(craft);
  const posterImg = $("posterImg");
  posterImg.addEventListener("error", () => {
    posterImg.src = assetUrl(fleet.placeholderStill || "stills/_placeholder.webp");
  }, { once: true });

  const usePlaceholder = (url) => (url || "").includes("_placeholder.glb");
  const markFallback = (fallback) => {
    $("fallbackBanner").hidden = !fallback;
    if (fallback) $("status").textContent = "Placeholder model";
  };
  viewer.addEventListener("error", () => {
    const placeholderGlb = assetUrl(fleet.placeholderGlb || "models/_placeholder.glb");
    if (!usePlaceholder(viewer.src) && placeholderGlb) {
      markFallback(true);
      viewer.src = placeholderGlb;
    }
  });
  viewer.addEventListener("load", () => {
    markFallback(usePlaceholder(viewer.src));
    if (!usePlaceholder(viewer.src)) $("status").textContent = "";
  });

  const glbUrl = await presentModel(craft);
  wireDock(fleet, glbUrl);
}

function wireDock(fleet, firstGlb) {
  if (wired) return;
  wired = true;
  let vrGlb = firstGlb || "";
  const dock = $("dock");
  const sizeDock = () => {
    document.body.style.setProperty("--ss-dock", dock.offsetHeight + "px");
  };
  sizeDock();
  new ResizeObserver(sizeDock).observe(dock);

  const viewer = $("viewer");
  const arBtn = $("arBtn");
  const syncAr = () => {
    const ok = typeof viewer.canActivateAR === "boolean" ? viewer.canActivateAR : false;
    arBtn.hidden = !ok;
  };
  arBtn.addEventListener("click", () => {
    if (typeof viewer.activateAR === "function") viewer.activateAR();
  });
  viewer.addEventListener("load", syncAr);
  viewer.addEventListener("ar-status", syncAr);
  customElements.whenDefined("model-viewer").then(syncAr);
  syncAr();

  const vrBtn = $("vrBtn");
  const vrNote = $("vrNote");
  const applyVr = (supported) => {
    const state = vrControlState(supported);
    if (vrBtn) {
      vrBtn.hidden = state.buttonHidden;
      vrBtn.disabled = state.disabled;
    }
    if (vrNote) {
      vrNote.hidden = state.noteHidden;
      vrNote.textContent = state.note;
    }
  };
  immersiveVrSupported().then((ok) => {
    applyVr(ok);
    if (ok) loadVr().then((mod) => { vrApi = mod; }).catch(() => {});
  });
  if (vrBtn) {
    vrBtn.addEventListener("click", async () => {
      if (vrBtn.disabled || vrBtn.hidden) return;
      if (!vrApi) {
        try { vrApi = await loadVr(); } catch { /* handled below */ }
      }
      if (!vrApi) {
        $("status").textContent = VR_FAIL;
        return;
      }
      vrBtn.disabled = true;
      try {
        await vrApi.startSpaceshipVR({
          fleet,
          craft: current,
          glbUrl: vrGlb,
          onCraft: async (next) => {
            current = next;
            rememberUrl(next);
            paintCraft(next);
            viewer.alt = "3D model of " + next.name;
            const still = assetUrl(next.still) || assetUrl(fleet.placeholderStill);
            viewer.setAttribute("poster", still);
            vrGlb = await presentModel(next);
          },
        });
      } catch {
        $("status").textContent = VR_FAIL;
      }
      const supported = await immersiveVrSupported();
      applyVr(supported);
    });
  }
}
