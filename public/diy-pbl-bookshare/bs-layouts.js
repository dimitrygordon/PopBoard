// Card layout JSON for s09 genre quads and keyterms sticky cards.
// Leo replaces art/s09/cards.json and art/keyterms/cards.json; we read them at boot.
import { ART } from "./bs-engine.js";

let s09 = null;
let keyterms = null;
let ready = null;

const S09_FALLBACK = {
  "canvas": [
    1920,
    1080
  ],
  "cards": [
    {
      "label": "Lab report",
      "quad_xy": [
        [
          1095,
          165
        ],
        [
          1295,
          145
        ],
        [
          1325,
          395
        ],
        [
          1120,
          415
        ]
      ],
      "center_xy": [
        1209,
        280
      ],
      "size_wh": [
        220,
        250
      ],
      "rotation_deg": -8.0,
      "note": "white body under orange flask header"
    },
    {
      "label": "Business letter",
      "quad_xy": [
        [
          1005,
          470
        ],
        [
          1210,
          505
        ],
        [
          1165,
          790
        ],
        [
          960,
          755
        ]
      ],
      "center_xy": [
        1085,
        630
      ],
      "size_wh": [
        220,
        285
      ],
      "rotation_deg": -16.0,
      "note": "white body under blue envelope header"
    },
    {
      "label": "Executive summary",
      "quad_xy": [
        [
          1225,
          485
        ],
        [
          1460,
          475
        ],
        [
          1480,
          790
        ],
        [
          1245,
          800
        ]
      ],
      "center_xy": [
        1353,
        638
      ],
      "size_wh": [
        245,
        315
      ],
      "rotation_deg": -2.0,
      "note": "white body under orange wax-seal header"
    },
    {
      "label": "Problem statement",
      "quad_xy": [
        [
          1515,
          490
        ],
        [
          1755,
          535
        ],
        [
          1705,
          840
        ],
        [
          1465,
          795
        ]
      ],
      "center_xy": [
        1610,
        665
      ],
      "size_wh": [
        250,
        310
      ],
      "rotation_deg": 11.0,
      "note": "white body under orange clipboard header"
    }
  ],
  "source": "inline-fallback"
};

const KT_FALLBACK = {
  "canvas": [
    1920,
    1080
  ],
  "cork_board_xywh": [
    180,
    205,
    900,
    470
  ],
  "phone_note": "8 cards on cork interior. On 390px phone each card ~40.8px wide. Pin at top edge; text below pin. Prefer max_font_px_phone390.",
  "cards": [
    {
      "index": 0,
      "rect_xywh": [
        200,
        245,
        201,
        190
      ],
      "rotation_deg": -3.5,
      "pin_xy": [
        300,
        241
      ],
      "pin_size_px": 26,
      "text_rect_xywh": [
        212,
        279,
        177,
        142
      ],
      "max_font_px_desktop": 20,
      "max_font_px_phone390": 10
    },
    {
      "index": 1,
      "rect_xywh": [
        419,
        245,
        201,
        190
      ],
      "rotation_deg": 2.0,
      "pin_xy": [
        519,
        241
      ],
      "pin_size_px": 26,
      "text_rect_xywh": [
        431,
        279,
        177,
        142
      ],
      "max_font_px_desktop": 20,
      "max_font_px_phone390": 10
    },
    {
      "index": 2,
      "rect_xywh": [
        638,
        245,
        201,
        190
      ],
      "rotation_deg": -1.5,
      "pin_xy": [
        738,
        241
      ],
      "pin_size_px": 26,
      "text_rect_xywh": [
        650,
        279,
        177,
        142
      ],
      "max_font_px_desktop": 20,
      "max_font_px_phone390": 10
    },
    {
      "index": 3,
      "rect_xywh": [
        857,
        245,
        201,
        190
      ],
      "rotation_deg": 3.0,
      "pin_xy": [
        957,
        241
      ],
      "pin_size_px": 26,
      "text_rect_xywh": [
        869,
        279,
        177,
        142
      ],
      "max_font_px_desktop": 20,
      "max_font_px_phone390": 10
    },
    {
      "index": 4,
      "rect_xywh": [
        200,
        465,
        201,
        190
      ],
      "rotation_deg": 2.5,
      "pin_xy": [
        300,
        461
      ],
      "pin_size_px": 26,
      "text_rect_xywh": [
        212,
        499,
        177,
        142
      ],
      "max_font_px_desktop": 20,
      "max_font_px_phone390": 10
    },
    {
      "index": 5,
      "rect_xywh": [
        419,
        465,
        201,
        190
      ],
      "rotation_deg": -2.8,
      "pin_xy": [
        519,
        461
      ],
      "pin_size_px": 26,
      "text_rect_xywh": [
        431,
        499,
        177,
        142
      ],
      "max_font_px_desktop": 20,
      "max_font_px_phone390": 10
    },
    {
      "index": 6,
      "rect_xywh": [
        638,
        465,
        201,
        190
      ],
      "rotation_deg": 1.8,
      "pin_xy": [
        738,
        461
      ],
      "pin_size_px": 26,
      "text_rect_xywh": [
        650,
        499,
        177,
        142
      ],
      "max_font_px_desktop": 20,
      "max_font_px_phone390": 10
    },
    {
      "index": 7,
      "rect_xywh": [
        857,
        465,
        201,
        190
      ],
      "rotation_deg": -3.2,
      "pin_xy": [
        957,
        461
      ],
      "pin_size_px": 26,
      "text_rect_xywh": [
        869,
        499,
        177,
        142
      ],
      "max_font_px_desktop": 20,
      "max_font_px_phone390": 10
    }
  ],
  "source": "inline-fallback"
};

async function fetchJson(url) {
  try {
    const res = await fetch(url, { cache: "no-cache" });
    if (!res.ok) return null;
    return await res.json();
  } catch (e) {
    return null;
  }
}

export function loadLayouts() {
  if (ready) return ready;
  ready = (async () => {
    const [a, b] = await Promise.all([
      fetchJson(`${ART}s09/cards.json`),
      fetchJson(`${ART}keyterms/cards.json`),
    ]);
    s09 = a && Array.isArray(a.cards) && a.cards.length ? a : S09_FALLBACK;
    keyterms = b && Array.isArray(b.cards) && b.cards.length ? b : KT_FALLBACK;
    return { s09, keyterms };
  })();
  return ready;
}

/** Pixel-verified label slots (design px on 1920x1080 bg.webp).
 *  Derived from cream body ∩ Leo quad, minus front-card faces; 10% inset baked in.
 */
export const S09_LABEL_SLOTS = {
  /* Pixel-derived from bg.webp; inside white body, clear of dark outlines. */
  "Lab report":        { cx: 1210, cy: 278, w: 118, h: 34, rot: -8, z: 0, wrap: false },
  "Business letter":   { cx: 1160, cy: 605, w: 72, h: 120, rot: -16, z: 2, wrap: true },
  "Executive summary": { cx: 1310, cy: 585, w: 95, h: 135, rot: -2, z: 1, wrap: true },
  "Problem statement": { cx: 1602, cy: 680, w: 140, h: 150, rot: 11, z: 3, wrap: true },
};

export function s09Cards() {
  return (s09 || S09_FALLBACK).cards;
}

export function keytermsCards() {
  return (keyterms || KT_FALLBACK).cards;
}

export function layoutsSource() {
  return {
    s09: (s09 || S09_FALLBACK).source || "leo-json",
    keyterms: (keyterms || KT_FALLBACK).source || "leo-json",
  };
}
