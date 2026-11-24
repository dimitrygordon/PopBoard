#!/usr/bin/env python3
"""Writes the plain placeholder SVGs for the Relative Velocity module (swap for Leo's PNGs by name)."""
from pathlib import Path

ART = Path(__file__).resolve().parents[1] / "public/relative-velocity/art"
THUMBS = Path(__file__).resolve().parents[1] / "public/physics101/tryit/thumbs"
ART.mkdir(parents=True, exist_ok=True)
INK = "#3A352E"


def svg(w, h, body):
    return f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">{body}</svg>\n'


def backdrop(kind, dark):
    paper = "#24211D" if dark else "#F4ECDA"
    line = "#3A352E" if dark else "#E2D6BE"
    deep = "#2C2823" if dark else "#EADFC7"
    b = f'<rect width="2400" height="900" fill="{paper}"/>'
    if kind == "river":  # tabletop wood grain
        for y in range(60, 900, 110):
            b += f'<path d="M0 {y} C600 {y-18} 1800 {y+18} 2400 {y}" stroke="{line}" stroke-width="6" fill="none"/>'
    else:
        b += f'<rect y="780" width="2400" height="120" fill="{deep}"/>'
        for x in range(0, 2400, 300):
            if kind == "truck":
                b += f'<rect x="{x+60}" y="836" width="160" height="10" fill="{line}"/>'
                b += f'<rect x="{x+120}" y="560" width="22" height="220" fill="{line}"/><circle cx="{x+131}" cy="520" r="70" fill="{line}"/>'
            elif kind == "walkway":
                b += f'<rect x="{x+40}" y="200" width="220" height="380" rx="10" fill="none" stroke="{line}" stroke-width="8"/>'
                b += f'<rect x="{x}" y="780" width="6" height="120" fill="{line}"/>'
            else:
                b += f'<rect x="{x}" y="640" width="150" height="40" fill="{line}"/><rect x="{x+150}" y="640" width="150" height="40" fill="{deep}"/>'
                b += f'<rect x="{x+20}" y="300" width="260" height="160" fill="none" stroke="{line}" stroke-width="8"/>'
    return svg(2400, 900, b)


def channel():
    b = '<rect x="0" y="20" width="2000" height="200" rx="14" fill="#BFE0F0" fill-opacity="0.55" stroke="#7FA9BF" stroke-width="6"/>'
    b += '<rect x="0" y="40" width="2000" height="160" fill="#9FCDE6" fill-opacity="0.45"/>'
    for i in range(0, 51):
        x = i * 40
        h = 26 if i % 10 == 0 else (16 if i % 5 == 0 else 9)
        b += f'<rect x="{x-1.5 if x else 0}" y="{220-h}" width="3" height="{h}" fill="{INK}"/>'
    return svg(2000, 240, b)


SHAPES = {
    "boat": (240, 120, '<path d="M14 24 H170 L228 60 L170 96 H14 Z" fill="#E9EEF4" stroke="#3A5F8A" stroke-width="6"/><rect x="60" y="44" width="70" height="32" rx="6" fill="#6FA3E0"/>'),
    "bead": (48, 48, '<circle cx="24" cy="24" r="18" fill="#7DBF7A" stroke="#2F6B3A" stroke-width="4"/>'),
    "stopwatch": (240, 280, '<rect x="104" y="6" width="32" height="28" rx="6" fill="#8C8170"/><circle cx="120" cy="160" r="104" fill="#FFFDF5" stroke="#3A352E" stroke-width="10"/><circle cx="120" cy="160" r="80" fill="none" stroke="#B9B0A0" stroke-width="4"/>'),
    "valve-knob": (200, 200, '<circle cx="100" cy="100" r="88" fill="#D8CBB0" stroke="#3A352E" stroke-width="8"/><rect x="92" y="18" width="16" height="70" rx="8" fill="#B3261E"/>'),
    "clipboard": (640, 820, '<rect x="20" y="40" width="600" height="760" rx="28" fill="#C8A878" stroke="#7A5A3A" stroke-width="8"/><rect x="50" y="90" width="540" height="690" fill="#FFFDF5"/><rect x="230" y="14" width="180" height="70" rx="16" fill="#8C8170"/>'
                  + ''.join(f'<path d="M60 {y} H580" stroke="#C9D6E8" stroke-width="3"/>' for y in range(170, 761, 59))),
    "truck": (600, 300, '<rect x="20" y="120" width="380" height="120" rx="10" fill="#C96B4B" stroke="#3A352E" stroke-width="6"/><path d="M400 240 V80 H500 L580 160 V240 Z" fill="#D98A6B" stroke="#3A352E" stroke-width="6"/><circle cx="120" cy="250" r="46" fill="#3A352E"/><circle cx="480" cy="250" r="46" fill="#3A352E"/>'),
    "basketball": (96, 96, '<circle cx="48" cy="48" r="42" fill="#E07A2E" stroke="#3A352E" stroke-width="5"/><path d="M6 48 H90 M48 6 V90" stroke="#3A352E" stroke-width="4"/>'),
    "walkway": (1200, 160, '<rect x="0" y="60" width="1200" height="70" fill="#9AA3AD" stroke="#4A525C" stroke-width="5"/><rect x="0" y="40" width="1200" height="22" fill="#5A626C"/>'
                + ''.join(f'<rect x="{x}" y="66" width="8" height="58" fill="#C3CAD2"/>' for x in range(20, 1200, 60))),
    "walker": (160, 320, '<circle cx="80" cy="44" r="30" fill="#E8C7A0" stroke="#3A352E" stroke-width="5"/><rect x="52" y="78" width="56" height="130" rx="20" fill="#6FA3E0" stroke="#3A352E" stroke-width="5"/><path d="M66 208 L52 316 M94 208 L112 316" stroke="#3A352E" stroke-width="14"/>'),
    "kart": (320, 180, '<path d="M30 130 L60 70 H210 L290 120 V140 H30 Z" fill="#6FA3E0" stroke="#3A352E" stroke-width="6"/><circle cx="150" cy="56" r="26" fill="#FFFDF5" stroke="#3A352E" stroke-width="5"/><circle cx="80" cy="150" r="28" fill="#3A352E"/><circle cx="250" cy="150" r="28" fill="#3A352E"/>'),
    "kart-rival": (320, 180, '<path d="M30 130 L60 70 H210 L290 120 V140 H30 Z" fill="#B85C8A" stroke="#3A352E" stroke-width="6"/><circle cx="150" cy="56" r="26" fill="#FFFDF5" stroke="#3A352E" stroke-width="5"/><circle cx="80" cy="150" r="28" fill="#3A352E"/><circle cx="250" cy="150" r="28" fill="#3A352E"/>'),
    "boost-pad": (400, 80, '<rect width="400" height="80" fill="#E8C21A" fill-opacity="0.35"/>' + ''.join(f'<path d="M{x} 12 L{x+40} 40 L{x} 68" stroke="#C98A00" stroke-width="10" fill="none"/>' for x in (40, 140, 240, 340))),
}


def thumb(dark):
    paper = "#1F1D1A" if dark else "#FBF6EA"
    line = "#F2EAD8" if dark else "#3A352E"
    b = f'<rect width="640" height="416" rx="16" fill="{paper}"/>'
    b += '<rect x="40" y="150" width="560" height="116" rx="12" fill="#9FCDE6" fill-opacity="0.5" stroke="#7FA9BF" stroke-width="5"/>'
    b += '<path d="M230 186 H360 L400 208 L360 230 H230 Z" fill="#E9EEF4" stroke="#3A5F8A" stroke-width="5"/>'
    b += '<path d="M230 300 H420" stroke="#6FA3E0" stroke-width="10"/><path d="M420 300 H500" stroke="#E0A030" stroke-width="10"/>'
    b += f'<path d="M230 330 H500" stroke="{line}" stroke-width="14"/><path d="M500 316 L524 330 L500 344 Z" fill="{line}"/>'
    return svg(640, 416, b)


def main():
    for kind in ("river", "truck", "walkway", "kart"):
        for dark in (False, True):
            (ART / f"bg-{kind}-{'dark' if dark else 'light'}.svg").write_text(backdrop(kind, dark))
    (ART / "channel.svg").write_text(channel())
    for name, (w, h, body) in SHAPES.items():
        (ART / f"{name}.svg").write_text(svg(w, h, body))
    (THUMBS / "study-relative-velocity.svg").write_text(thumb(False))
    (THUMBS / "study-relative-velocity-dark.svg").write_text(thumb(True))


if __name__ == "__main__":
    main()
