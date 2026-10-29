import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
const pub = new URL("../public/", import.meta.url);
const mods = ["sandbox","eclipses","hrdiagram","orbits","moon","luminosity","vectors","spectra","tides","relativity","springs","harmonics","pendulum","rbm","checkride","machines"];
const files = [...mods.map((m) => "study-" + m + ".html"), "study.html"];
const hex = (h) => { h = h.replace("#", ""); return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16) / 255); };
const lum = (c) => { const [r, g, b] = c.map((v) => (v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4)); return 0.2126 * r + 0.7152 * g + 0.0722 * b; };
const ratio = (a, b) => { const x = lum(hex(a)), y = lum(hex(b)); return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05); };
for (const f of files) test("Paper wired before the page draws: " + f, () => {
  const s = readFileSync(new URL(f, pub), "utf8");
  const css = s.indexOf("shared/paper/paper.css"), js = s.indexOf("shared/paper/paper.js");
  assert.ok(css > 0 && js > 0, "paper.css and paper.js linked");
  assert.ok(js < s.indexOf("<body"), "paper.js runs in head");
  const acc = /<style data-paper-module>:root\[data-theme="light"\]\{[^}]*--amber:(#[0-9a-f]{6})/i.exec(s);
  assert.ok(acc, "module accent set");
  assert.ok(ratio(acc[1], "#fbf8f1") >= 4.5, "accent reads on panels");
});
test("Paper tokens meet 4.5:1 and the layer has no em-dashes", () => {
  const css = readFileSync(new URL("shared/paper/paper.css", pub), "utf8");
  for (const n of ["--pp-ink", "--pp-ink-dim", "--pp-ink-dimmer", "--pp-link", "--amber", "--cyan", "--red", "--green"]) {
    const v = new RegExp(n + ":\\s*(#[0-9a-f]{6})", "i").exec(css)[1];
    assert.ok(ratio(v, "#f4efe4") >= 4.5, n);
  }
  for (const f of ["shared/paper/paper.css", "shared/paper/paper.js"]) assert.ok(!readFileSync(new URL(f, pub), "utf8").includes("\u2014"));
});
