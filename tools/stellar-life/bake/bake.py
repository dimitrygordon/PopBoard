"""Render the baked style B discs with Leo's generator (patched copies from patch_bake.py).
python3 bake.py SRC_DIR OUT_DIR scene(f3a|rg) layer(A|B) variant N k [amp]
Scene f3a runs ui/styleb_bake.html (disc R = 380 px), rg runs ui/styleb2_bake.html (disc R = 300 px). Output: PNG, star centred."""
import sys, base64, subprocess, time, os
from playwright.sync_api import sync_playwright
def render(src, out, scene, layer, v, N, k, amp=2.0, port=int(os.environ.get('BAKE_PORT', '18990'))):
    page = {'f3a': 'styleb_bake.html', 'rg': 'styleb2_bake.html'}[scene]
    srv = subprocess.Popen(['python3', '-m', 'http.server', str(port), '--bind', '127.0.0.1'], cwd=src, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL); time.sleep(0.6)
    try:
        with sync_playwright() as p:
            b = p.chromium.launch(executable_path='/usr/bin/google-chrome', args=['--headless=new'])
            pg = b.new_page(viewport={'width': 800, 'height': 600}); errs = []
            pg.on('pageerror', lambda e: errs.append(str(e))); pg.on('console', lambda m: errs.append(m.text) if m.type == 'error' else None)
            pg.goto(f'http://127.0.0.1:{port}/ui/{page}?scene={scene}&bake=1&layer={layer}&v={v}&N={N}&k={k}&amp={amp}')
            pg.wait_for_function("document.title==='done'", timeout=600000)
            data = pg.evaluate("document.getElementById('c').toDataURL('image/png')")
            os.makedirs(out, exist_ok=True); f = f'{out}/{scene}_{layer}_v{v}.png'; open(f, 'wb').write(base64.b64decode(data.split(',')[1])); b.close()
            if errs: print('ERRORS', errs)
            return f
    finally: srv.kill()
if __name__ == '__main__':
    a = sys.argv; print(render(a[1], a[2], a[3], a[4], int(a[5]), int(a[6]), float(a[7]), float(a[8]) if len(a) > 8 else 2.0))
