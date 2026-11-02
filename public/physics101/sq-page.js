// Practice Questions library (Physics 101): search, module cards, lessons, then one lesson's problems
// grouped Practice and Book with filter chips. Problems render through sq-core.js, the same renderer as
// the storybook's Study Questions tab.
import { bindThemeButton, BACK_ICON } from "../astro-course/ac-common.js";
import { DECKS } from "./p101-catalog.js";
import { renderLesson, bindSoundButton, SETS, MATH } from "./sq-core.js";

const $ = (id) => document.getElementById(id);
const P = new URLSearchParams(location.search);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const fold = (s) => String(s).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
bindThemeButton($("themeBtn")); bindSoundButton($("soundBtn"));
document.querySelector("#sqBack .back-icon").outerHTML = BACK_ICON;

const INDEX = await (await fetch("physics101/sq/index.json")).json();
const MODS = [...new Set(DECKS.map((d) => d.q))].sort((a, b) => a - b).map((q) => {
  const ls = DECKS.filter((d) => d.q === q);
  return { q, name: ls[0].module, lessons: ls, n: ls.reduce((t, d) => t + (INDEX[d.slug] ? INDEX[d.slug].mq + INDEX[d.slug].sol : 0), 0) };
});
const count = (n) => `${n} ${n === 1 ? "problem" : "problems"}`;
const crumbs = (parts) => { $("sqCrumbs").innerHTML = parts.map(([t, h]) => (h ? `<a href="${h}">${esc(t)}</a>` : `<span aria-current="page">${esc(t)}</span>`)).join(" <span aria-hidden=\"true\">/</span> "); };

const lessonSlug = P.get("lesson"), modQ = +P.get("module");
if (lessonSlug === MATH.slug) await lessonView({ slug: MATH.slug, q: 0, lesson: 0, title: MATH.title, math: true });
else if (lessonSlug && DECKS.some((d) => d.slug === lessonSlug)) await lessonView(DECKS.find((d) => d.slug === lessonSlug));
else if (MODS.some((m) => m.q === modQ)) moduleView(MODS.find((m) => m.q === modQ));
else homeView();

function homeView() {
  $("viewHome").hidden = false; crumbs([["Practice Questions"]]);
  const mx = INDEX[MATH.slug] || { mq: 0, sol: 0 };
  $("sqMods").innerHTML = `<li><a class="sq-mod sq-math sketch" href="?lesson=${MATH.slug}" style="--acc:var(--ac-dim)">
    <span class="sq-mod-num">Course set</span><span class="sq-mod-name">${esc(MATH.title)}</span>
    <span class="sq-mod-meta">${esc(MATH.blurb)} ${count(mx.mq + mx.sol)}</span></a></li>` + MODS.map((m) => `<li><a class="sq-mod sketch" href="?module=${m.q}" style="--acc:var(--p101-m${m.q})">
    <span class="sq-mod-num">Module ${m.q}</span><span class="sq-mod-name">${esc(m.name)}</span>
    <span class="sq-mod-meta">${m.lessons.length} lessons \u00b7 ${count(m.n)}</span></a></li>`).join("");
  const q = $("sqQ");
  q.addEventListener("input", () => {
    const w = fold(q.value.trim());
    $("sqMods").hidden = !!w; $("sqResults").hidden = !w;
    if (!w) return;
    const hits = [];
    for (const d of [{ slug: MATH.slug, q: 0, lesson: 0, title: MATH.title, math: true }, ...DECKS]) for (const [id, t] of (INDEX[d.slug]?.t || [])) if (fold(t).includes(w) || fold(d.title).includes(w)) hits.push([d, id, t]);
    $("sqResults").innerHTML = hits.length ? hits.slice(0, 80).map(([d, id, t]) => `<li><a class="sq-hit sketch" href="?lesson=${d.slug}#${id}" style="--acc:var(--p101-m${d.q})">
      <span class="sq-crumb">${d.math ? "Math Skills" : `M${d.q} L${d.lesson}`} \u00b7 ${id.startsWith("mq") ? "Practice" : "Book"}</span><span>${esc(t)}</span></a></li>`).join("")
      + (hits.length > 80 ? `<li class="sq-more">${hits.length - 80} more. Try a longer word.</li>` : "")
      : `<li class="sq-more">No question matches that. Try a shorter word.</li>`;
  });
}

function moduleView(m) {
  $("viewModule").hidden = false; document.documentElement.dataset.module = m.q;
  $("sqBack").href = "study-physics101-questions.html"; $("sqBack").querySelector(".back-label").textContent = "Modules";
  crumbs([["Practice Questions", "study-physics101-questions.html"], [`Module ${m.q}: ${m.name}`]]);
  $("sqLessons").innerHTML = m.lessons.map((d) => { const x = INDEX[d.slug] || { mq: 0, sol: 0 };
    return `<li><a class="sq-les sketch" href="?lesson=${d.slug}"><span class="sq-crumb">Lesson ${d.lesson}</span><b>${esc(d.title)}</b>
    <span class="sq-mod-meta">${x.mq} practice \u00b7 ${x.sol} book</span></a></li>`; }).join("");
}

async function lessonView(d) {
  $("viewLesson").hidden = false; if (!d.math) document.documentElement.dataset.module = d.q;
  document.title = `Practice Questions: ${d.title} // Physics 101`;
  if (d.math) {
    $("sqBack").href = "study-physics101-questions.html"; $("sqBack").querySelector(".back-label").textContent = "Modules";
    crumbs([["Practice Questions", "study-physics101-questions.html"], [MATH.title]]);
    $("sqLessonTag").textContent = "Course set"; $("sqLessonTitle").textContent = MATH.title;
    $("sqOpenBook").href = `study-physics101-story.html?tab=sq&sq=${MATH.slug}`;
  } else {
  $("sqBack").href = `?module=${d.q}`; $("sqBack").querySelector(".back-label").textContent = `Module ${d.q}`;
  crumbs([["Practice Questions", "study-physics101-questions.html"], [`Module ${d.q}`, `?module=${d.q}`], [`Lesson ${d.lesson}`]]);
  $("sqLessonTag").textContent = `Module ${d.q} \u00b7 Lesson ${d.lesson}`; $("sqLessonTitle").textContent = d.title;
  $("sqOpenBook").href = `study-physics101-story.html?lesson=${d.slug}&tab=sq`;
  }
  const x = INDEX[d.slug] || { mq: 0, sol: 0 };
  let filter = ["mq", "sol"].includes(P.get("set")) ? P.get("set") : "all";
  const chips = [["all", `All (${x.mq + x.sol})`], ...SETS.map(([k, short]) => [k, `${short} (${x[k]})`])];
  $("sqChips").innerHTML = chips.map(([k, t]) => `<button type="button" class="sq-chip" data-set="${k}" aria-pressed="${k === filter}">${t}</button>`).join("");
  for (const b of $("sqChips").querySelectorAll("button")) b.addEventListener("click", async () => {
    filter = b.dataset.set;
    for (const o of $("sqChips").querySelectorAll("button")) o.setAttribute("aria-pressed", String(o === b));
    const u = new URL(location.href); if (filter === "all") u.searchParams.delete("set"); else u.searchParams.set("set", filter); history.replaceState(null, "", u);
    await renderLesson($("sqList"), d.slug, { filter });
  });
  await renderLesson($("sqList"), d.slug, { filter });
  if (location.hash) document.getElementById(location.hash.slice(1))?.scrollIntoView();
}
