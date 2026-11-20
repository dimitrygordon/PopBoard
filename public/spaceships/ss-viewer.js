import { loadFleet, findCraft, assetUrl, galleryQuery, reducedMotion, assetExists } from "./ss-data.js";

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
    if (row.verified === false) dd.dataset.placeholder = "true";
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
  viewer.setAttribute("ar-scale", "fixed");
  viewer.setAttribute("poster", still);

  if (!reducedMotion()) viewer.setAttribute("auto-rotate", "");
  else viewer.removeAttribute("auto-rotate");

  const wantedGlb = assetUrl(craft.glb);
  const placeholderGlb = assetUrl(fleet.placeholderGlb || "models/_placeholder.glb");
  const glbOk = await assetExists(wantedGlb);
  const src = glbOk ? wantedGlb : placeholderGlb;
  $("fallbackBanner").hidden = glbOk;
  $("status").textContent = glbOk ? "" : "Placeholder model";
  $("posterLabel").textContent = glbOk ? "Loading 3D model" : "Loading placeholder model";
  if (!glbOk && !(await assetExists(src))) {
    $("status").textContent = "The 3D model could not be loaded.";
    return;
  }
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
