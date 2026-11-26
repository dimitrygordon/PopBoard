#!/usr/bin/env bash
# Downloads the pinned Night Sky sources into tools/night-sky/.cache (gitignored) and checks sha256.
set -euo pipefail
cd "$(dirname "$0")"
S=sources.json
j() { python3 -c "import json,sys;d=json.load(open('$S'));print(eval(sys.argv[1]))" "$1"; }
mkdir -p .cache/stellarium-western/illustrations
curl -sSfL -o .cache/hyg_v44.csv.gz "$(j "d['hyg']['url']")"
echo "$(j "d['hyg']['sha256']")  .cache/hyg_v44.csv.gz" | sha256sum -c -
BASE="$(j "d['stellarium']['rawBase']")"
for f in index.json description.md; do curl -sSfL -o ".cache/stellarium-western/$f" "$BASE$f"; done
echo "$(j "d['stellarium']['indexSha256']")  .cache/stellarium-western/index.json" | sha256sum -c -
# Illustrations are only needed to rebuild the art atlas (build-art-atlas.py):
python3 -c "import json;d=json.load(open('.cache/stellarium-western/index.json'));print('\n'.join(c['image']['file'] for c in d['constellations'] if 'image' in c))" \
  | xargs -P 8 -I{} curl -sSfL -o ".cache/stellarium-western/{}" "$BASE{}"
