import { loadFleet, findCraft, assetUrl, galleryQuery, reducedMotion, assetExists } from "./ss-data.js";

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

if (!craft) {
  $("missing").hidden = false;
  $("hudTitle").textContent = "Spaceships";
  document.title = "Spaceship not found // PopBoard";
} else {
  await showCraft(fleet, craft);
}

async function showCraft(fleet, craft) {
  document.title = craft.name + " // PopBoard";
  $("pageTitle").textContent = craft.name;
  $("hudTitle").textContent = craft.name;
  $("craftName").textContent = craft.name;
  $("subtitle").textContent = craft.subtitle || "";
  $("subtitle").hidden = !craft.subtitle;
  $("dock").hidden = false;

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
  posterImg.src = still;
  posterImg.alt = craft.name;
  posterImg.addEventListener("error", () => {
    posterImg.src = assetUrl(fleet.placeholderStill || "stills/_placeholder.webp");
  }, { once: true });

  const viewer = $("viewer");
  viewer.hidden = false;
  viewer.alt = "3D model of " + craft.name;
  viewer.setAttribute("camera-controls", "");
  viewer.setAttribute("touch-action", "pan-y");
  viewer.setAttribute("ar", "");
  viewer.setAttribute("ar-modes", "webxr scene-viewer quick-look");
  // Planets, moons and asteroids are true size (Jupiter is 143,000 km), so let AR scale them down.
  const arAuto = (craft.tags || []).some((t) => AR_AUTO_TAGS.includes(t));
  viewer.setAttribute("ar-scale", arAuto ? "auto" : "fixed");
  viewer.setAttribute("shadow-intensity", "0");
  viewer.setAttribute("poster", still);
  if (craft.cameraOrbit) viewer.setAttribute("camera-orbit", craft.cameraOrbit);
  else viewer.removeAttribute("camera-orbit");

  if (!reducedMotion()) viewer.setAttribute("auto-rotate", "");
  else viewer.removeAttribute("auto-rotate");

  const wantedGlb = assetUrl(craft.glb);
  const placeholderGlb = assetUrl(fleet.placeholderGlb || "models/_placeholder.glb");
  const glbOk = await assetExists(wantedGlb);
  const src = glbOk ? wantedGlb : placeholderGlb;
  const usePlaceholder = (url) => (url || "").includes("_placeholder.glb");
  const markFallback = (fallback) => {
    $("fallbackBanner").hidden = !fallback;
    $("status").textContent = fallback ? "Placeholder model" : "";
  };
  markFallback(!glbOk);
  $("posterLabel").textContent = glbOk ? "Loading 3D model" : "Loading placeholder model";
  if (!glbOk && !(await assetExists(src))) {
    $("status").textContent = "The 3D model could not be loaded.";
    return;
  }
  viewer.addEventListener("error", () => {
    if (!usePlaceholder(viewer.src) && placeholderGlb) {
      markFallback(true);
      viewer.src = placeholderGlb;
    }
  }, { once: true });
  viewer.addEventListener("load", () => {
    markFallback(usePlaceholder(viewer.src));
  }, { once: true });
  viewer.src = src;

  const usdz = assetUrl(craft.usdz);
  if (usdz && await assetExists(usdz)) viewer.setAttribute("ios-src", usdz);
  else viewer.removeAttribute("ios-src");

  const dock = $("dock");
  const sizeDock = () => {
    document.body.style.setProperty("--ss-dock", dock.offsetHeight + "px");
  };
  sizeDock();
  new ResizeObserver(sizeDock).observe(dock);

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
}
