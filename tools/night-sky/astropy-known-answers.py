#!/usr/bin/env python3
"""Regenerates the astropy known answers for the Night Sky tests (design_v1 section 11):
T1/T2 star alt/az (ICRS -> AltAz, pressure 0 = no refraction) and T8 Sun/Moon/planets (get_body,
topocentric alt/az). Writes tests/fixtures/night-sky-astropy.json. Run in a venv with astropy:
  python3 -m venv venv && venv/bin/pip install astropy && venv/bin/python tools/night-sky/astropy-known-answers.py"""
import json, random, sys
from pathlib import Path
import astropy, numpy as np
import astropy.units as u
from astropy.time import Time
from astropy.coordinates import SkyCoord, EarthLocation, AltAz, get_body, solar_system_ephemeris
from astropy.utils import iers
iers.conf.auto_download = False  # offline: built-in IERS-B table, no internet needed
iers.conf.iers_degraded_accuracy = "warn"

OUT = Path(__file__).resolve().parents[2] / "tests" / "fixtures" / "night-sky-astropy.json"
LAT, LON = 38.39, -86.93
loc = EarthLocation(lat=LAT * u.deg, lon=LON * u.deg, height=0 * u.m)
STARS = {"Polaris": (2.52975, 89.264109), "Sirius": (6.752481, -16.716116), "Vega": (18.61564, 38.783692), "Betelgeuse": (5.919529, 7.407063)}
out = {"astropy": astropy.__version__, "observer": {"lat": LAT, "lon": LON, "height": 0}, "stars": {}, "bodies": []}
for tag, iso in (("T1", "2026-12-21T03:00:00"), ("T2", "2026-06-21T03:00:00")):
    t = Time(iso, scale="utc")
    frame = AltAz(obstime=t, location=loc, pressure=0 * u.hPa)
    gmst = t.sidereal_time("mean", "greenwich").hour
    rows = {}
    for n, (ra, dec) in STARS.items():
        aa = SkyCoord(ra=ra * 15 * u.deg, dec=dec * u.deg, frame="icrs").transform_to(frame)
        rows[n] = {"ra_h": ra, "dec": dec, "alt": round(aa.alt.deg, 4), "az": round(aa.az.deg, 4)}
    out["stars"][tag] = {"utc": iso + "Z", "gmst_h": gmst, "rows": rows}
random.seed(20261126)
solar_system_ephemeris.set("builtin")
for _ in range(20):
    jd = Time("1950-01-01").jd + random.random() * (Time("2040-12-31").jd - Time("1950-01-01").jd)
    t = Time(jd, format="jd", scale="utc")
    frame = AltAz(obstime=t, location=loc, pressure=0 * u.hPa)
    rec = {"utc": t.isot + "Z", "unixMs": round((t.unix) * 1000)}
    for b in ("sun", "moon", "mercury", "venus", "mars", "jupiter", "saturn"):
        aa = get_body(b, t, loc).transform_to(frame)
        rec[b] = {"alt": round(aa.alt.deg, 4), "az": round(aa.az.deg, 4)}
    out["bodies"].append(rec)
OUT.parent.mkdir(parents=True, exist_ok=True)
OUT.write_text(json.dumps(out, indent=1) + "\n")
print("wrote", OUT)
print(json.dumps(out["stars"], indent=1))
