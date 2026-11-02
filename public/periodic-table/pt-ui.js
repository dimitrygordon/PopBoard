// Periodic Table Studio page: theme, back, mount (pt-app.js does the table).
import { forwardStudyQuery } from "../board-return.js?v=20261022a";
import { mountPeriodicTable } from "./pt-app.js";
const root = document.documentElement, KEY = "popboard.periodic-table.theme", $ = (id) => document.getElementById(id);
function sync() { const light = root.getAttribute("data-theme") === "light"; $("themeLabel").textContent = light ? "Dark" : "Paper"; $("themeBtn").setAttribute("aria-label", light ? "Switch to the dark theme" : "Switch to the Paper theme"); }
$("themeBtn").addEventListener("click", () => { const t = root.getAttribute("data-theme") === "light" ? "dark" : "light"; root.setAttribute("data-theme", t); try { localStorage.setItem(KEY, t); } catch (e) {} sync(); });
sync();
$("atomLink").href = "study-atom-builder.html" + location.search;
$("studyBackBtn").addEventListener("click", (e) => { e.preventDefault(); const qs = forwardStudyQuery(location.search).toString(); history.replaceState(null, "", qs ? "?" + qs : location.pathname); location.href = "study.html" + location.search; });
window.ptApp = await mountPeriodicTable($("ptApp"));
