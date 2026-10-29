// Full responsive audit: every study page and ?mode= variant, every size, dark and Paper,
// start state and busiest state. Writes report.md plus screenshots of failing views.
//   node tests/responsive-audit.mjs [outDir] [--only=study-orbits] [--sizes=360x740,390x844]
import { mkdir, writeFile } from "node:fs/promises";
import puppeteer from "puppeteer-core";
import { SIZES, MIN_TEXT_PX, MIN_TAP_PX, listPages, serve, chromePath, themeInit, staticChecks, pageChecks, makeBusy } from "./responsive-lib.mjs";

const args = process.argv.slice(2);
const OUT = args.find((a) => !a.startsWith("--")) || "/workspace/responsive-audit";
const SHOTDIR = process.env.SHOTS_DIR || "/workspace/phone-audit";
const only = (args.find((a) => a.startsWith("--only=")) || "").slice(7);
const sizeArg = (args.find((a) => a.startsWith("--sizes=")) || "").slice(8);
const sizes = sizeArg ? sizeArg.split(",") : Object.keys(SIZES);
const pages = listPages().filter((p) => !only || only.split(",").some((o) => p.name === o || p.name.startsWith(o + "--")));

const { server, base } = await serve();
const browser = await puppeteer.launch({ executablePath: chromePath(), headless: true, args: ["--no-sandbox", "--disable-gpu", "--use-gl=swiftshader", "--enable-unsafe-swiftshader"] });
const results = [];
const CONC = +(process.env.CONC || 4);
const jobs = [];
for (const pg of pages) for (const theme of ["dark", "paper"]) jobs.push({ pg, theme });

async function runJob({ pg, theme }) {
  const ctx = await browser.createBrowserContext();
  const page = await ctx.newPage();
  const errors = [];
  page.on("console", (m) => { if (m.type() === "error") errors.push(m.text().slice(0, 200)); });
  page.on("pageerror", (e) => errors.push(String(e.message || e).slice(0, 200)));
  await page.evaluateOnNewDocument(themeInit(theme));
  const stat = staticChecks(pg.path);
  for (const sz of sizes) {
    const S = SIZES[sz];
    await page.setViewport({ width: S.width, height: S.height, isMobile: S.touch && S.width < 1000, hasTouch: S.touch, deviceScaleFactor: 1 });
    errors.length = 0;
    try { await page.goto(base + pg.path, { waitUntil: "networkidle2", timeout: 30000 }); } catch (e) { errors.push("load: " + e.message.slice(0, 120)); }
    await new Promise((r) => setTimeout(r, 1200));
    for (const state of ["start", "busy"]) {
      if (state === "busy") await makeBusy(page);
      let issues = [];
      try { issues = await page.evaluate(pageChecks, { minText: MIN_TEXT_PX, minTap: MIN_TAP_PX, touch: S.touch }); } catch (e) { issues = [{ kind: "check-error", detail: e.message.slice(0, 160) }]; }
      if (state === "start") { for (const s of stat) issues.push(s); for (const e of [...new Set(errors)]) issues.push({ kind: "console-error", detail: e }); }
      const dir = `${SHOTDIR}/${pg.name}`; await mkdir(dir, { recursive: true });
      const shot = `${dir}/${sz}-${theme}-${state}.png`;
      await page.screenshot({ path: shot }).catch(() => {});
      results.push({ page: pg.name, path: pg.path, size: sz, theme, state, issues, shot });
    }
  }
  await ctx.close();
  process.stdout.write(".");
}
let i = 0;
await Promise.all(Array.from({ length: CONC }, async () => { while (i < jobs.length) await runJob(jobs[i++]); }));
await browser.close(); server.close();

await mkdir(OUT, { recursive: true });
await writeFile(`${OUT}/results.json`, JSON.stringify(results, null, 1));
// Report
const kinds = [...new Set(results.flatMap((r) => r.issues.map((i) => i.kind)))].sort();
let md = `# PopBoard responsive audit\n\nGenerated ${new Date().toISOString()}. Pages: ${pages.length}. Sizes: ${sizes.join(", ")}. Themes: dark, Paper. States: start, busy (sheet full, toast shown, details open).\n\nThresholds: text >= ${MIN_TEXT_PX}px, tap targets >= ${MIN_TAP_PX}px, inputs >= 16px on touch sizes.\nScreenshots: ${SHOTDIR}/<module>/<size>-<theme>-<state>.png\n\n`;
md += `## Totals by check\n\n| check | issues |\n|---|---|\n` + kinds.map((k) => `| ${k} | ${results.reduce((n, r) => n + r.issues.filter((i) => i.kind === k).length, 0)} |`).join("\n") + "\n\n";
md += `## Counts per page and size (dark+Paper, start+busy combined)\n\n| page | ${sizes.join(" | ")} | total |\n|---|${sizes.map(() => "---").join("|")}|---|\n`;
for (const pg of pages) { const row = sizes.map((s) => results.filter((r) => r.page === pg.name && r.size === s).reduce((n, r) => n + r.issues.length, 0)); md += `| ${pg.name} | ${row.join(" | ")} | ${row.reduce((a, b) => a + b, 0)} |\n`; }
md += `\n## Details per page\n\nEach line: check, element, detail, then where it happens. Identical findings are merged.\n`;
for (const pg of pages) {
  const rs = results.filter((r) => r.page === pg.name); const m = new Map();
  for (const r of rs) for (const is of r.issues) { const k = `${is.kind}|${(is.sel || "").replace(/\\d+(\\.\\d+)?/g, "#")}|${is.kind === "tap-target" || is.kind === "small-text" ? is.detail : is.detail.replace(/\d+/g, "#")}`; if (!m.has(k)) m.set(k, { ...is, where: [] }); m.get(k).where.push(`${r.size}/${r.theme}/${r.state}`); }
  if (!m.size) { md += `\n### ${pg.name}\n\nNo problems.\n`; continue; }
  md += `\n### ${pg.name} (\`${pg.path}\`)\n\n`;
  const byKind = {}; for (const v of m.values()) (byKind[v.kind] ||= []).push(v);
  for (const k of Object.keys(byKind).sort()) {
    md += `- **${k}** (${byKind[k].length})\n`;
    for (const v of byKind[k].slice(0, 12)) md += `  - ${v.sel ? "`" + v.sel.replace(/`/g, "'") + "` " : ""}${v.detail} [${v.where.length === sizes.length * 4 ? "all views" : v.where.slice(0, 6).join(", ") + (v.where.length > 6 ? `, +${v.where.length - 6}` : "")}]\n`;
    if (byKind[k].length > 12) md += `  - ...and ${byKind[k].length - 12} more\n`;
  }
  const worst = rs.filter((r) => r.issues.some((i) => ["overflow-x", "overlap", "offscreen-x"].includes(i.kind))).slice(0, 3);
  if (worst.length) md += `\nShots: ${worst.map((w) => w.shot).join(", ")}\n`;
}
await writeFile(`${OUT}/report.md`, md);
console.log(`\nwrote ${OUT}/report.md, ${results.reduce((n, r) => n + r.issues.length, 0)} issues`);
