// Step cards: wire-step-cards.py puts Socrates' steps on the listed cards only; Leo's CSS follows PopBoard's toggle.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, mkdtempSync, mkdirSync, copyFileSync, writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { tmpdir } from "node:os";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const SQ = join(ROOT, "public", "physics101", "sq");
const WIRE = join(ROOT, "tools", "physics101", "wire-step-cards.py");
const FIX = join(ROOT, "tests", "fixtures", "step-cards-sample.json");
function sandbox() {
  const pub = mkdtempSync(join(tmpdir(), "stepcards-")); mkdirSync(join(pub, "physics101", "sq"), { recursive: true });
  copyFileSync(join(SQ, "m06-l03.json"), join(pub, "physics101", "sq", "m06-l03.json")); return pub;
}
const lesson = (pub) => JSON.parse(readFileSync(join(pub, "physics101", "sq", "m06-l03.json"), "utf8")).items;

test("listed cards get numbered step data; the rest keep the old solution display", () => {
  const pub = sandbox(); execFileSync("python3", [WIRE, FIX, pub]);
  const items = lesson(pub), a = items.find((x) => x.id === "mq06-57");
  assert.deepEqual(a.stepCards.map((s) => s.kind), ["givens", "equation", "substitute", "answer"]);
  assert.match(a.stepCards[2].html, /<sup>2<\/sup>.*<br>𝜃/);
  assert.ok(a.steps.length && a.answer.length, "fallback solution data stays");
  assert.ok(items.filter((x) => !["mq06-57", "sol06-57"].includes(x.id)).every((x) => !("stepCards" in x)));
});

test("wiring is idempotent and drops cards removed from the steps file", () => {
  const pub = sandbox(); execFileSync("python3", [WIRE, FIX, pub]);
  const once = readFileSync(join(pub, "physics101", "sq", "m06-l03.json"), "utf8");
  execFileSync("python3", [WIRE, FIX, pub]);
  assert.equal(readFileSync(join(pub, "physics101", "sq", "m06-l03.json"), "utf8"), once);
  const one = join(pub, "one.json"); writeFileSync(one, JSON.stringify({ "mq06-57": JSON.parse(readFileSync(FIX, "utf8"))["mq06-57"] }));
  execFileSync("python3", [WIRE, one, pub]);
  assert.ok(!("stepCards" in lesson(pub).find((x) => x.id === "sol06-57")));
});

test("step text escapes HTML, and em-dashes or unknown cards fail the build", () => {
  const pub = sandbox(), f = join(pub, "s.json");
  writeFileSync(f, JSON.stringify({ "mq06-57": [{ label: "Givens", text: "<script>x</script> 2<sup>3</sup>" }] }));
  execFileSync("python3", [WIRE, f, pub]);
  assert.equal(lesson(pub).find((x) => x.id === "mq06-57").stepCards[0].html, "&lt;script&gt;x&lt;/script&gt; 2<sup>3</sup>");
  writeFileSync(f, JSON.stringify({ "mq06-57": [{ label: "Answer", text: "a \u2014 b" }] }));
  assert.throws(() => execFileSync("python3", [WIRE, f, pub], { stdio: "pipe" }));
  writeFileSync(f, JSON.stringify({ "zz99-1": [{ label: "Answer", text: "x" }] }));
  assert.throws(() => execFileSync("python3", [WIRE, f, pub], { stdio: "pipe" }));
});

test("step-card dark styles hang off PopBoard's toggle, not the browser setting; light is the default", () => {
  const css = readFileSync(join(ROOT, "public", "physics101", "sq-page.css"), "utf8"), i = css.indexOf("Step cards:");
  const sc = css.slice(i);
  assert.ok(i > 0 && !/prefers-color-scheme/.test(sc.replace(/\/\*[\s\S]*?\*\//g, "")));
  assert.match(sc, /^\.pb-step\{[^}]*background:#FBF6EA/m);
  assert.match(sc, /:root\[data-theme="dark"\] \.pb-answer\{/);
  assert.match(sc, /\.pb-answer\{border:2\.5px solid #C0392B/);
});

test("the renderer uses step cards when present and keeps the answer behind Show answer", () => {
  const js = readFileSync(join(ROOT, "public", "physics101", "sq-core.js"), "utf8");
  assert.match(js, /if \(item\.stepCards && item\.stepCards\.length\) return stepCardsInto\(el, item, base\);/);
  assert.match(js, /pb-answer-wrap[\s\S]*?Show answer/);
});

const shipped = () => Object.fromEntries(readdirSync(SQ).filter((f) => /^m\d\d-l\d\d\.json$/.test(f)).flatMap((f) => JSON.parse(readFileSync(join(SQ, f), "utf8")).items).map((x) => [x.id, x]));
const plain = (bs) => bs.map((b) => (b.html || "").replace(/<[^>]+>/g, "")).join(" ");

test("open-ended, CER, career and project cards keep their old display", () => {
  const c = shipped();
  for (const id of ["mq01-44", "mq01-45", "mq02-14", "mq02-81", "sol03-74", "mq03-95"]) assert.ok(c[id] && !("stepCards" in c[id]), id);
  for (const id of ["mq01-33", "mq05-27", "mq02-30"]) assert.ok(c[id].stepCards?.length, id);
});

test("garbled answers use the source wording, in the card and in its Answer step", () => {
  const c = shipped();
  assert.match(plain(c["mq01-33"].answer), /^One variable depends on the square of the other \(𝑦 = 𝑎𝑥2 \+ 𝑏𝑥 \+ 𝑐\)\. For the cart, KE depends on the square of the speed 𝑣: if the speed triples, KE increases by a factor of 32 = 9/);
  assert.doesNotMatch(plain(c["mq01-33"].answer), /\$/);
  assert.equal(c["mq01-33"].stepCards.at(-1).html, c["mq01-33"].answer[0].html);
  assert.doesNotMatch(plain(c["mq02-14"].answer), /car/);
  assert.equal(plain(c["mq02-14"].question), "Search for a news story about how sports teams use motion capture and write a short summary.");
  assert.match(plain(c["mq02-14"].answer), /^Sample summary: sports teams use motion capture\./);
  assert.equal(plain(c["mq05-27"].answer), "About 86 N (slightly more than this starts the crate moving).");
  assert.match(plain(c["mq05-27"].check), /^A bit under half the weight/);
  assert.deepEqual(c["mq05-27"].steps.map((s) => s.label), ["What we know", "Physics idea", "Work"]);
});

test("sample and solution prose sits behind Show answer", () => {
  const c = shipped();
  assert.equal(plain(c["mq02-30"].question), "Graph each person's position vs. time.");
  assert.equal(plain(c["sol02-28"].question), "Graph each person's position vs. time.");
  assert.equal(c["mq19-96"].title, "Challenge 1. A classmate says the bridge balances only when all four resistors are equal.");
  assert.match(plain(c["mq19-96"].steps[0].body), /^Setting all equal gives both divider ratios/);
  for (const id of ["sol19-96", "mq19-97", "sol19-97", "sol19-102", "mq16-8"]) assert.deepEqual(c[id].question, [], id);
  assert.equal(c["sol11-19"].question.length, 1);
  assert.doesNotMatch(plain(c["sol11-19"].question), /278/);
});

test("Tesla's corrections ride on top of Socrates' steps", () => {
  const c = shipped(), st = (id, l) => c[id].stepCards.find((s) => s.label === l).html;
  assert.match(st("mq06-65", "Substitute"), /= 4\.83 m$/);
  assert.match(st("mq06-65", "Givens"), /0\.44523x - 0\.0050790x<sup>2<\/sup>/);
  assert.match(st("mq02-32", "Givens"), /28\.875/);
  assert.match(st("sol02-66", "Givens"), /^Reading each grid square as 1 m and 1 s/);
  assert.match(st("sol02-67", "Givens"), /grid squares\.$/);
  assert.match(c["mq02-78"].stepCards.at(-1).html, /2<sup>15<\/sup> = 32 768/);
  for (const id of ["mq06-5", "sol06-5", "mq03-74", "sol03-58", "mq01-47", "sol01-47", "mq06-33", "sol06-33", "sol01-33"]) {
    const a = c[id].stepCards.at(-1).html; assert.match(a, /<sup>2<\/sup>/, id); assert.doesNotMatch(a, /(m\/s|𝑣|𝑡|𝑇|𝑥)2\b/, id);
  }
  for (const id of ["mq05-64", "sol05-62"]) assert.match(plain(c[id].answer), /𝑡 = √\(2𝑑\/𝑎\)/);
  for (const id of ["mq01-49", "sol01-49"]) assert.doesNotMatch(plain(c[id].answer), /∝/);
  for (const id of Object.keys(c)) for (const s of c[id].stepCards || []) assert.doesNotMatch(s.html, /\^|sqrt\(/, id);
});
