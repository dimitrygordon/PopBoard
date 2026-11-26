// Packed deck art. Each storybook deck ships its .webp art as one small pack file per page
// (decks/<slug>/art-pack/<NN>.bin, built by tools/pack-art/pack-art.mjs), so a deploy holds a couple of thousand files
// instead of 12,000. Plain GETs only: no Range requests, so any static host serves it and the browser caches each page.
//
//   const pack = await openArtPack(base);   // base = ".../decks/<slug>/"; registers the deck for artUrl()
//   await pack.warm(page);                   // fetches that page's pack (and the deck-wide page 0)
//   img.src = artUrl(base + "v2/art/p01-bg.webp");   // sync; a blob: URL once warmed
//
// artUrl() hands back the URL it was given when the deck has no pack or the file is not in it, so loose files
// (a deck being edited before it is packed) keep working with no change anywhere else.
const decks = [];

export function artUrl(url) {
  for (const d of decks) if (url.startsWith(d.base)) { const u = d.urls.get(url.slice(d.base.length)); if (u) return u; }
  return url;
}

// "PBAP" | u32 LE header length | {"files": [[path, byteLength], ...]} | file bytes back to back
function unpack(buf) {
  const dv = new DataView(buf);
  if (buf.byteLength < 8 || dv.getUint32(0) !== 0x50424150) throw new Error("not a page pack");
  const hl = dv.getUint32(4, true), head = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 8, hl)));
  let off = 8 + hl; const out = [];
  for (const [p, l] of head.files) { out.push([p, buf.slice(off, off + l)]); off += l; }
  return out;
}

export async function openArtPack(base) {
  let pages = null;
  try { const r = await fetch(base + "art-pack.json"); if (r.ok) { const j = await r.json(); if (j && Array.isArray(j.pages)) pages = new Set(j.pages); } } catch (e) { pages = null; }
  const deck = { base, urls: new Map() };
  const loaded = new Map(), done = new Set(); // page -> Promise, pages whose blobs exist
  const pull = async (g) => {
    try {
      const r = await fetch(`${base}art-pack/${String(g).padStart(2, "0")}.bin`);
      if (!r.ok) throw new Error(`art pack ${g}: ${r.status}`);
      for (const [p, bytes] of unpack(await r.arrayBuffer())) deck.urls.set(p, URL.createObjectURL(new Blob([bytes], { type: "image/webp" })));
      done.add(g);
    } catch (e) { console.warn("art pack", g, e); loaded.delete(g); }
  };
  const warmOne = (g) => { if (!pages || !pages.has(g)) return Promise.resolve(); if (!loaded.has(g)) loaded.set(g, pull(g)); return loaded.get(g); };
  const pack = {
    packed: !!pages,
    // true once every file this page needs can be handed out synchronously
    ready: (page) => !pages || ((done.has(0) || !pages.has(0)) && (done.has(page) || !pages.has(page))),
    warm: (page) => Promise.all([warmOne(0), warmOne(page)]).then(() => {})
  };
  decks.length = 0; decks.push(deck); // one storybook per page load
  return pack;
}
