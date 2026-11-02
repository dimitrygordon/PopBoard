// Storybook tab row (Physics 101): Read this page | Study Questions | Test it.
// Read this page keeps only the lesson reading; problem cards live only in the Study Questions tab.
// The header pencil button is a quiet doorway into the tab. Deep link: ?lesson=m01-l04&tab=sq (&sq=<slug> for another lesson).
import { DECKS } from "./p101-catalog.js";
import { renderLesson, bindSoundButton, SETS } from "./sq-core.js";
import { renderTryIt } from "./tryit.js";

const $ = (id) => document.getElementById(id);
const P = new URLSearchParams(location.search);
const home = P.get("lesson") || DECKS[0].slug;
let sqSlug = DECKS.some((d) => d.slug === P.get("sq")) ? P.get("sq") : home, filter = "all", loaded = null;
const panel = $("panel"), story = $("story"), tools = $("tools");
const tabs = { read: $("tabRead"), sq: $("tabSq"), test: $("tabTest") };
bindSoundButton($("soundBtn"));

// lesson picker, grouped by module
$("sqPick").innerHTML = [...new Set(DECKS.map((d) => d.q))].map((q) => {
  const ls = DECKS.filter((d) => d.q === q);
  return `<optgroup label="Module ${q}: ${ls[0].module}">${ls.map((d) => `<option value="${d.slug}">L${d.lesson}. ${d.title}</option>`).join("")}</optgroup>`;
}).join("");
$("sqPick").value = sqSlug;
$("sqPick").addEventListener("change", () => { sqSlug = $("sqPick").value; filter = "all"; loaded = null; load(); syncUrl(); });

async function load() {
  if (loaded === sqSlug + filter) return;
  loaded = sqSlug + filter;
  const counts = await renderLesson($("sqList"), sqSlug, { filter });
  renderTryIt($("sqTry"), sqSlug);
  const all = counts.mq + counts.sol, chips = [["all", `All (${all})`], ...SETS.map(([k, s]) => [k, `${s} (${counts[k]})`])];
  $("sqChips").innerHTML = chips.map(([k, t]) => `<button type="button" class="sq-chip" data-set="${k}" aria-pressed="${k === filter}">${t}</button>`).join("");
  for (const b of $("sqChips").querySelectorAll("button")) b.onclick = () => { filter = b.dataset.set; load(); };
  $("panelBody").scrollTop = 0;
}
function syncUrl() {
  const u = new URL(location.href);
  if (tab === "sq") u.searchParams.set("tab", "sq"); else u.searchParams.delete("tab");
  if (tab === "sq" && sqSlug !== home) u.searchParams.set("sq", sqSlug); else u.searchParams.delete("sq");
  history.replaceState(history.state, "", u);
}

// Test it shows only on pages that have one (ac-story.js fills #tools per page)
const hasTest = () => !!tools.querySelector(".test-it");
let tab = "read";
function show(t) {
  if (t === "test" && !hasTest()) t = "read";
  tab = t;
  for (const [k, b] of Object.entries(tabs)) b.setAttribute("aria-selected", String(k === t));
  // panes are shown by CSS from data-tab, so ac-story.js keeps its own hidden flags (sandbox mode, coming soon)
  panel.dataset.tab = t; panel.classList.toggle("has-test", hasTest());
  $("sqPane").hidden = t !== "sq";
  if (story.classList.contains("sq-on") !== (t === "sq")) { story.classList.toggle("sq-on", t === "sq"); requestAnimationFrame(() => dispatchEvent(new Event("resize"))); }
  if (t === "sq") load();
  syncUrl();
}
// Try it cards close out a Test it sandbox (same map as the Study Questions tab)
const testTry = () => { const t = tools.querySelector(".test-it"); if (t && !t.querySelector(".tryit-row")) { const r = document.createElement("div"); r.className = "tryit-row"; r.hidden = true; t.appendChild(r); renderTryIt(r, home); } };
new MutationObserver(() => { testTry(); tabs.test.hidden = !hasTest(); if (tab === "test" && !hasTest()) show("read"); else show(tab); }).observe(tools, { childList: true });
tabs.test.hidden = !hasTest();
tabs.read.onclick = () => show("read"); tabs.sq.onclick = () => show("sq"); tabs.test.onclick = () => show("test");
// arrow keys move between tabs
$("tabRead").parentElement.addEventListener("keydown", (e) => {
  if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
  const list = Object.values(tabs).filter((b) => !b.hidden), i = list.indexOf(document.activeElement);
  if (i < 0) return; const n = list[(i + (e.key === "ArrowRight" ? 1 : list.length - 1)) % list.length]; n.focus(); n.click(); e.preventDefault();
});
// the slide's own "Test it" chip opens the Test it tab
$("stage").addEventListener("click", (e) => { if (e.target.closest(".tryit-tab")?.textContent === "Test it") show("test"); }, true);
// header pencil: open Study Questions (on phones, raise the sheet so the problems have room)
$("sqDoor").addEventListener("click", () => {
  show("sq"); tabs.sq.focus();
  if (matchMedia("(max-width: 699px)").matches) panel.style.setProperty("--sheet-h", Math.round(innerHeight * 0.82) + "px");
});
show(P.get("tab") === "sq" ? "sq" : "read");
