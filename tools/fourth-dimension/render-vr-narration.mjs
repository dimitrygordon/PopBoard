// Placeholder narration for the Beyond 3D VR storybook.
// Speaks each caption with espeak-ng (libespeak-ng) and writes
// public/fourth-dimension/audio/vr4d/s<N>.mp3 plus s<N>.json word times.
// Dimitry's own recordings replace those files by the same filename. See README.md there.
import { spawn } from "node:child_process";
import { writeFileSync, mkdirSync, unlinkSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { PAGES } from "../../public/fourth-dimension/vr/vr4d-book.js";

const root = join(dirname(fileURLToPath(import.meta.url)), "../..");
const outDir = join(root, "public/fourth-dimension/audio/vr4d");
mkdirSync(outDir, { recursive: true });

const py = String.raw`
import ctypes, json, sys, wave
lib = ctypes.CDLL("libespeak-ng.so.1")
lib.espeak_Initialize.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_char_p, ctypes.c_int]
lib.espeak_Initialize.restype = ctypes.c_int
sr = lib.espeak_Initialize(1, 0, None, 0)
class ID(ctypes.Union):
    _fields_ = [("number", ctypes.c_int), ("name", ctypes.c_char_p), ("string", ctypes.c_char * 8)]
class EV(ctypes.Structure):
    _fields_ = [
        ("type", ctypes.c_int), ("unique_identifier", ctypes.c_uint),
        ("text_position", ctypes.c_int), ("length", ctypes.c_int),
        ("audio_position", ctypes.c_int), ("user_data", ctypes.c_void_p), ("id", ID),
    ]
CB = ctypes.CFUNCTYPE(ctypes.c_int, ctypes.POINTER(ctypes.c_short), ctypes.c_int, ctypes.POINTER(EV))
samples = []
events = []
@CB
def cb(wav, n, ev):
    if wav and n > 0:
        samples.extend(int(wav[i]) for i in range(n))
    i = 0
    while i < 200:
        e = ev[i]
        if e.type == 0:
            break
        if e.type == 1:
            events.append((e.text_position, e.length, e.audio_position))
        i += 1
    return 0
lib.espeak_SetSynthCallback.argtypes = [CB]
lib.espeak_SetSynthCallback(cb)
lib.espeak_SetParameter.argtypes = [ctypes.c_int, ctypes.c_int, ctypes.c_int]
lib.espeak_SetParameter(1, 132, 0)
lib.espeak_SetParameter(3, 38, 0)
lib.espeak_SetVoiceByName.argtypes = [ctypes.c_char_p]
lib.espeak_SetVoiceByName.restype = ctypes.c_int
lib.espeak_SetVoiceByName(b"en-us")
lib.espeak_Synth.argtypes = [ctypes.c_char_p, ctypes.c_size_t, ctypes.c_uint, ctypes.c_int, ctypes.c_uint, ctypes.c_uint, ctypes.POINTER(ctypes.c_uint), ctypes.c_void_p]
lib.espeak_Synth.restype = ctypes.c_int
text = sys.stdin.read()
buf = text.encode() + b"\0"
uid = ctypes.c_uint(0)
err = lib.espeak_Synth(buf, len(buf), 0, 1, 0, 1, ctypes.byref(uid), None)
lib.espeak_Synchronize()
if err:
    sys.exit("synth failed " + str(err))
pad = int(sr * 0.18)
samples.extend([0] * pad)
peak = max(1, max(abs(s) for s in samples))
scale = 22000 / peak
out = wave.open(sys.argv[1], "w")
out.setnchannels(1); out.setsampwidth(2); out.setframerate(sr)
import array
pcm = array.array("h", (max(-32767, min(32767, int(s * scale))) for s in samples))
out.writeframes(pcm.tobytes()); out.close()
# Align espeak's word events back onto the caption's own words.
def fold(s):
    return "".join(ch for ch in s.lower() if ch.isalnum())
spoken = []
raw = text
for pos, length, ms in events:
    spoken.append((raw[pos - 1:pos - 1 + length], ms / 1000))
dur = len(samples) / sr
words = text.split()
out_words = []
i = 0
for w in words:
    target = fold(w)
    if not target:
        continue
    if i >= len(spoken):
        out_words.append({"w": w, "start": round(dur - 0.2, 3), "end": round(dur, 3)})
        continue
    start = spoken[i][1]
    acc = ""
    while i < len(spoken) and fold(acc) != target and len(fold(acc)) <= len(target):
        acc += spoken[i][0]
        i += 1
        if fold(acc) == target:
            break
    end = spoken[i][1] if i < len(spoken) else dur
    if end <= start:
        end = start + 0.12
    out_words.append({"w": w, "start": round(start, 3), "end": round(min(end, dur), 3)})
print(json.dumps({"words": out_words, "duration": round(dur, 3)}))
`;

function run(text, wav) {
  return new Promise((resolve, reject) => {
    const child = spawn("python3", ["-c", py, wav], { stdio: ["pipe", "pipe", "pipe"] });
    let out = "", err = "";
    child.stdout.on("data", (d) => { out += d; });
    child.stderr.on("data", (d) => { err += d; });
    child.on("close", (code) => code === 0 ? resolve(out) : reject(new Error(err || "espeak failed")));
    child.stdin.end(text);
  });
}

const manifest = { vr4d: PAGES.map((p) => p.n), score: null };
for (const page of PAGES) {
  const wav = join(outDir, `s${page.n}.wav`);
  const mp3 = join(outDir, `s${page.n}.mp3`);
  const json = JSON.parse(await run(page.text, wav));
  await new Promise((resolve, reject) => {
    const ff = spawn("ffmpeg", ["-y", "-loglevel", "error", "-i", wav, "-codec:a", "libmp3lame", "-qscale:a", "6", mp3]);
    let err = "";
    ff.stderr.on("data", (d) => { err += d; });
    ff.on("close", (code) => code === 0 ? resolve() : reject(new Error(err)));
  });
  writeFileSync(join(outDir, `s${page.n}.json`), JSON.stringify(json));
  try { unlinkSync(wav); } catch { /* wav already gone */ }
  const folds = json.words.map((w) => w.w).join(" ");
  if (folds !== page.text.split(/\s+/).join(" ")) throw new Error("word mismatch on " + page.id + " " + folds);
  console.log("s" + page.n, json.duration + "s", json.words.length, "words");
}
// The storybook player reads audio/manifest.json (one level above the deck), same as the astronomy course.
writeFileSync(join(root, "public/fourth-dimension/audio/manifest.json"), JSON.stringify(manifest));
console.log("wrote", PAGES.length, "clips");
