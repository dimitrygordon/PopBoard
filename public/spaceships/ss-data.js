const BASE = new URL("./", import.meta.url);

export async function loadFleet() {
  const res = await fetch(new URL("fleet.json", BASE), { cache: "no-cache" });
  if (!res.ok) throw new Error("Could not load fleet.json");
  const data = await res.json();
  if (!data || !Array.isArray(data.craft)) throw new Error("fleet.json is missing a craft list");
  return data;
}

export function findCraft(fleet, id) {
  if (!id) return null;
  return fleet.craft.find((c) => c.id === id) || null;
}

export function listedCraft(fleet) {
  return fleet.craft.filter((c) => c.listed !== false);
}

export function assetUrl(rel) {
  if (!rel) return "";
  return new URL(rel, BASE).href;
}

export function reducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export async function assetExists(url) {
  if (!url) return false;
  try {
    let res = await fetch(url, { method: "HEAD" });
    if (res.status === 405 || res.status === 501) {
      res = await fetch(url, { method: "GET", headers: { Range: "bytes=0-0" } });
    }
    return res.ok;
  } catch {
    return false;
  }
}

export function galleryQuery(search) {
  const params = new URLSearchParams(search);
  params.delete("id");
  const q = params.toString();
  return q ? "?" + q : "";
}

export function matchesQuery(craft, query) {
  const q = (query || "").trim().toLowerCase();
  if (!q) return true;
  const hay = [craft.id, craft.name, craft.subtitle, ...(craft.tags || [])].join(" ").toLowerCase();
  return q.split(/\s+/).every((part) => hay.includes(part));
}
