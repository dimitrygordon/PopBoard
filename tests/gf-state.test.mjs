// Gravity Force URL scheme. Teaching spec v1.2, section 12.
//   node --test tests/gf-state.test.mjs
import test from "node:test";
import assert from "node:assert/strict";
import {
  parseState, serializeState, defaultState, canSetHelp, flags, isLocked, ALTS,
} from "../public/gravity-force/gf-state.js";

function roundTrip(q) {
  const once = parseState(q);
  const again = parseState(serializeState(once));
  assert.deepEqual(again, once);
  return once;
}

test("defaults: pull, help 0, earth and sun, panel on, version 1", () => {
  for (const q of ["", "?", "help=0&scene=pull&ui=1&twin=0&v=1&dist=1&a=earth&b=sun&world=earth&alt=0&obj=earth"]) {
    const s = parseState(q);
    assert.equal(s.scene, "pull");
    assert.equal(s.help, 0);
    assert.deepEqual(s.lock, []);
    assert.equal(s.dist, 1);
    assert.equal(s.a, "earth");
    assert.equal(s.b, "sun");
    assert.equal(s.world, "earth");
    assert.equal(s.alt, 0);
    assert.equal(s.obj, "earth");
    assert.equal(s.twin, false);
    assert.equal(s.ui, true);
    assert.equal(s.v, 1);
    assert.deepEqual(s.extra, []);
    assert.equal(serializeState(s), "");
  }
  assert.equal(serializeState(defaultState()), "");
  assert.equal(flags.HELP2_REQUIRES_URL, false);
});

test("a full link round-trips, and invalid fields fall back without throwing", () => {
  const q = "scene=well&help=2&lock=predict,help&dist=0.25&a=ball&b=wd&world=ns&alt=384400&obj=bh&twin=1&ui=0&v=3";
  const s = roundTrip(q);
  assert.equal(s.scene, "well");
  assert.equal(s.help, 2);
  assert.deepEqual(s.lock, ["help", "predict"]);
  assert.equal(s.dist, 0.25);
  assert.equal(s.a, "ball");
  assert.equal(s.b, "wd");
  assert.equal(s.world, "ns");
  assert.equal(s.alt, 384400);
  assert.equal(s.obj, "bh");
  assert.equal(s.twin, true);
  assert.equal(s.ui, false);
  assert.equal(s.v, 3);
  assert.equal(serializeState(s), "scene=well&help=2&lock=help,predict&dist=0.25&a=ball&b=wd&world=ns&alt=384400&obj=bh&twin=1&ui=0&v=3");

  const bad = ["scene=sideways", "help=3", "help=-1", "help=1.5", "help=two", "dist=0.249", "dist=4.001", "dist=abc",
    "a=jupiter", "b=moon", "world=pluto", "alt=420", "alt=400.5", "obj=moon", "twin=2", "twin=yes", "ui=maybe", "v=1.2", "v=-1", "lock=camera"];
  for (const q of bad) {
    assert.doesNotThrow(() => parseState(q), q);
    assert.equal(serializeState(parseState(q)), "", q);
  }
  assert.doesNotThrow(() => serializeState(parseState("%E0%A4%A&&=&scene")));
  assert.doesNotThrow(() => parseState(undefined));
  assert.doesNotThrow(() => parseState(null));
  assert.equal(parseState("scene=nope&help=1&world=moon&alt=420").help, 1);
  assert.equal(parseState("scene=nope&help=1&world=moon&alt=420").scene, "pull");
  assert.equal(parseState("scene=nope&help=1&world=moon&alt=420").world, "moon");
  assert.equal(parseState("scene=nope&help=1&world=moon&alt=420").alt, 0);
  for (const alt of ALTS) assert.equal(parseState(`alt=${alt}`).alt, alt);
  assert.equal(parseState("dist=4").dist, 4);
  assert.equal(parseState("dist=0.25").dist, 0.25);
});

test("unknown params survive a round trip and a full URL parses", () => {
  const s = parseState("lab=day1&scene=iss&foo=bar&zap=1%2C2&help=1");
  assert.equal(serializeState(s), "scene=iss&help=1&lab=day1&foo=bar&zap=1,2");
  assert.deepEqual(roundTrip("scene=mass&keep=yes&help=0").extra, [["keep", "yes"]]);
  const page = parseState("https://popboard.us/study-gravity-force.html?scene=weigh&world=mars&help=1#card");
  assert.equal(page.scene, "weigh");
  assert.equal(page.world, "mars");
  assert.equal(page.help, 1);
  const url = new URL("https://popboard.us/study-gravity-force.html?obj=sun&twin=1");
  assert.equal(parseState(url).obj, "sun");
  assert.equal(parseState(url).twin, true);
  const weird = parseState("Help=2&scene=pull");
  assert.equal(weird.help, 0);
  assert.deepEqual(weird.extra, [["Help", "2"]]);
  assert.equal(serializeState(weird), "Help=2");
});

test("lock=help blocks changes, and other locks do not block help", () => {
  const s = parseState("help=1&lock=help,scene");
  assert.equal(isLocked(s, "help"), true);
  assert.equal(isLocked(s, "scene"), true);
  assert.equal(isLocked(s, "predict"), false);
  assert.equal(canSetHelp(1, "tab", s), true);
  assert.equal(canSetHelp(0, "tab", s), false);
  assert.equal(canSetHelp(2, "url", s), false);
  assert.equal(canSetHelp(2, "tab", parseState("lock=scene")), true);
  assert.equal(canSetHelp(1, "tab", parseState("lock=predict")), true);
  assert.equal(serializeState(s), "help=1&lock=help,scene");
});

test("help flag: both settings, and the URL still parses help=2 when the flag is on", () => {
  const open = { help: 0, lock: [] };
  assert.equal(flags.HELP2_REQUIRES_URL, false);
  assert.equal(canSetHelp(0, "tab", open), true);
  assert.equal(canSetHelp(1, "tab", open), true);
  assert.equal(canSetHelp(2, "tab", open), true);
  assert.equal(canSetHelp(2, "url", open), true);
  assert.equal(canSetHelp(4, "tab", open), false);
  flags.HELP2_REQUIRES_URL = true;
  try {
    assert.equal(parseState("help=2&lock=help").help, 2);
    assert.equal(canSetHelp(2, "tab", open), false);
    assert.equal(canSetHelp(2, "button", open), false);
    assert.equal(canSetHelp(2, "url", open), true);
    assert.equal(canSetHelp(2, "qr", open), true);
    assert.equal(canSetHelp(1, "tab", open), true);
    assert.equal(canSetHelp(0, "tab", open), true);
    const locked = parseState("help=0&lock=help");
    assert.equal(canSetHelp(2, "url", locked), false);
    assert.equal(canSetHelp(0, "tab", locked), true);
  } finally {
    flags.HELP2_REQUIRES_URL = false;
  }
  assert.equal(canSetHelp(2, "tab", open), true);
});
