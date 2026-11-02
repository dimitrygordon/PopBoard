// Try it cards: a link from a Physics 101 lesson to an ORIGINAL PopBoard Study Library sim, sandbox or game.
// Targets come from the library inventory; which lesson gets which target comes only from
// physics101/tryit/map.json ({ "<lesson slug>": [{ "id": "<target id>", "caption": "...", "thumb": "<optional img>" }] }),
// filled from Leo's approved match list. Empty map = no cards anywhere.
// Placement: the Study Questions tab and the end of a Test it sandbox. Never on Read this page slides.
const ROOT = new URL("../", import.meta.url).href;

// id -> [name, link to the original page]
export const TARGETS = {
  // filled from library-port-map.json when wiring; kept empty so no link exists before approval
};
const MAP = fetch(ROOT + "physics101/tryit/map.json").then((r) => (r.ok ? r.json() : {})).catch(() => ({}));
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

export function tryItCard({ name, caption, href, thumb }) {
  const a = document.createElement("a");
  a.className = "tryit-card"; a.href = new URL(href, ROOT).href;
  a.innerHTML = `<span class="tryit-thumb" aria-hidden="true">${thumb ? `<img src="${esc(new URL(thumb, ROOT).href)}" alt="" loading="lazy">` : ""}</span>`
    + `<span class="tryit-text"><span class="tryit-name">Try it: ${esc(name)}</span><span class="tryit-cap">${esc(caption || "")}</span></span>`;
  return a;
}

// Fill host with this lesson's cards. Returns how many were drawn; host stays hidden when zero.
export async function renderTryIt(host, slug) {
  if (!host || host.closest("#readBox")) return 0;
  const rows = ((await MAP)[slug] || []).filter((r) => TARGETS[r.id]);
  host.replaceChildren(...rows.map((r) => tryItCard({ name: TARGETS[r.id][0], href: TARGETS[r.id][1], caption: r.caption, thumb: r.thumb })));
  host.hidden = !rows.length;
  return rows.length;
}
