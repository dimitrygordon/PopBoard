// Packed deck art. Each storybook deck ships its .webp art as one binary (decks/<slug>/art-pack.bin) plus an index
// (art-pack.json), built by tools/pack-art/pack-art.mjs, so a deploy holds a few hundred files instead of 12,000.
//
//   const pack = await openArtPack(base);   // base = ".../decks/<slug>/"; registers the deck for artUrl()
//   await pack.warm(page);                   // one HTTP Range request pulls that page's art (and the deck-wide files)
//   img.src = artUrl(base + "v2/art/p01-bg.webp");   // sync; a blob: URL once warmed
//
// artUrl() hands back the URL it was given when the deck has no pack or the file is not in it, so loose files
// (a deck being edited before it is packed) keep working with no change anywhere else.
const decks = [];

export function artUrl(url) {
  for (const d of decks) if (url.startsWith(d.base)) { const u = d.urls.get(url.slice(d.base.length)); if (u) return u; }
  return url;
}

export async function openArtPack(base) {
  let idx = null;
  try { const r = await fetch(base + "art-pack.json"); if (r.ok) idx = await r.json(); } catch (e) { idx = null; }
  const deck = { base, urls: new Map() };
  const loaded = new Map(), done = new Set(); // page -> Promise, pages whose blobs exist
  const bin = base + "art-pack.bin";
  const byPage = new Map();
  if (idx) for (const [p, [o, l, g]] of Object.entries(idx.files)) { if (!byPage.has(g)) byPage.set(g, []); byPage.get(g).push([p, o, l]); }
  const pull = async (g) => {
    const gr = idx.groups[g]; if (!gr) return;
    const [off, len] = gr;
    try {
      const r = await fetch(bin, { headers: { Range: `bytes=${off}-${off + len - 1}` } });
      if (!r.ok) throw new Error(`art pack ${r.status}`);
      const all = await r.arrayBuffer();
      const buf = r.status === 206 ? all : all.slice(off, off + len); // a server that ignores Range sends the whole file
      for (const [p, o, l] of byPage.get(+g)) deck.urls.set(p, URL.createObjectURL(new Blob([buf.slice(o - off, o - off + l)], { type: "image/webp" })));
      done.add(g);
    } catch (e) { console.warn("art pack", g, e); loaded.delete(g); }
  };
  const warmOne = (g) => { if (!idx || !idx.groups[g]) return Promise.resolve(); if (!loaded.has(g)) loaded.set(g, pull(g)); return loaded.get(g); };
  const pack = {
    packed: !!idx,
    // true once every file this page needs can be handed out synchronously
    ready: (page) => !idx || ((done.has(0) || !idx.groups[0]) && (done.has(page) || !idx.groups[page])),
    warm: (page) => Promise.all([warmOne(0), warmOne(page)]).then(() => {})
  };
  decks.length = 0; decks.push(deck); // one storybook per page load
  return pack;
}
