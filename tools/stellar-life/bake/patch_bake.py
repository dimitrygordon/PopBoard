"""Make bake copies of Leo's style B pages. Usage: python3 patch_bake.py SRC_DIR (default /workspace/vr-stellar/frames/src)
Writes SRC_DIR/ui/styleb_bake.html (scene f3a) and SRC_DIR/ui/styleb2_bake.html (scene rg). Leo's files are only read."""
import re, sys, os
SRC = sys.argv[1] if len(sys.argv) > 1 else '/workspace/vr-stellar/frames/src'
pre = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bake-prelude.js')).read()
def patch(name, out):
    s = open(f'{SRC}/ui/{name}').read()
    def sub(old, new, count=1, regex=False):
        global_s = s
        n = len(re.findall(old, global_s)) if regex else global_s.count(old)
        if n < 1: raise SystemExit(f'patch anchor missing in {name}: {old[:70]}')
        return re.sub(old, new, global_s) if regex else global_s.replace(old, new)
    imp = "import { rng, hex2rgb, stroke as _stroke, flowPts, jitter } from './strokes.js';"
    s = sub(imp, imp + '\n' + pre)
    s = sub("else _stroke(ctx_, pts, w, rgb, alpha, R, opts); }", "else BAKE.stroke(_stroke, ctx_, pts, w, rgb, alpha, R, opts); }")
    s = sub("_glowDab(x, y, r, rgb, a); }\n", "BAKE.glow(_glowDab, x, y, r, rgb, a); }\n")
    s = sub("const ctx = c.getContext('2d'); const W = 1920, H = 1080;", "const ctx = c.getContext('2d'); const W = 1920, H = 1080; BAKE.setup(c, ctx);")
    # background: keep its RNG draws, draw nothing, then black
    s = sub("function paintBackground(R, P) {\n", "function paintBackground(R, P) { BAKE.place(ctx, P); BAKE.startBg(); paintBackground_(R, P); BAKE.endBg(ctx); }\nfunction paintBackground_(R, P) {\n")
    # Leo's scene-local addBleed -> texture-px version
    pat = r"const addBleed = \(x, y, rOuter, rgb, alpha, \{ rInner = 0, rPeak = 0 \} = \{\}\) => \{.*?ctx\.putImageData\(img, x0, y0\);\n  \};"
    s = re.sub(pat, "const addBleed = (x, y, rOuter, rgb, alpha, o_ = {}) => BAKE.addBleed(x, y, rOuter, rgb, alpha, o_);", s, flags=re.S)
    # halo finished -> back orbit half is hidden (RNG still consumed); front orbit half hidden too
    s = sub("  orb(false);", "  BAKE.afterHalo(); BAKE.hide++; orb(false); BAKE.hide--;")
    s = sub("  orb(true);", "  BAKE.hide++; orb(true); BAKE.hide--;")
    s = s.replace("window.PARAMS = PARAMS; document.title = 'done';", "window.PARAMS = PARAMS; document.title = 'done';")
    open(f'{SRC}/ui/{out}', 'w').write(s); print('wrote', out)
patch('styleb.html', 'styleb_bake.html'); patch('styleb2.html', 'styleb2_bake.html')
