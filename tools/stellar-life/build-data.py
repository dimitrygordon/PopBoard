#!/usr/bin/env python3
"""Stellar Life Cycle VR: derive the shipped track data from the source grids.

Inputs (not committed; see README in this folder):
  MIST v1.2 EEP tracks, [Fe/H] = 0, v/vcrit = 0.4 (Choi et al. 2016; Dotter 2016)
    --mist  /workspace/vr-stellar/mist/MIST_v1.2_feh_p0.00_afe_p0.0_vvcrit0.4_EEPS
  Bedard et al. 2020 (ApJ 901, 93) thick-H white dwarf cooling sequences
    --bedard /workspace/vr-stellar/bedard  (seq_020_thick.txt, seq_055_thick.txt, seq_065_thick.txt)
Output: public/stellar-life/data/tracks.json (derived, thinned values only; no raw files are shipped).
"""
import argparse, json, math, os
import numpy as np

MASSES = {"0.2": "00020M", "1": "00100M", "3": "00300M", "15": "01500M", "40": "04000M"}
# Bedard mapping (teaching spec 3.10): S7 seq_055_thick, T6 seq_065_thick, R3 seq_020_thick (stand-in, dashed, predicted)
WD = {"1": "seq_055_thick", "3": "seq_065_thick", "0.2": "seq_020_thick"}
# LOOK-SPEC v2 section 4 (Tesla ruling): the 1 Sun track is shifted so 4.6 Gyr lands on 5,772 K and 1.00 Lsun
SHIFT = {"1": {"dlogTeff": -0.00575, "dlogL": -0.04511, "dlogR": -0.01105}}
LSUN_CGS, RSUN_CM = 3.828e33, 6.957e10
COLS = ["star_age", "star_mass", "log_L", "log_Teff", "log_R", "phase", "center_h1", "center_he4", "log_center_T"]

def read_mist(path):
    hdr = [l for l in open(path) if l.startswith("#")]
    names = hdr[-1][1:].split()
    d = np.loadtxt(path, comments="#")
    eeps = [int(x) for x in [l for l in hdr if "EEPs:" in l][0].split(":")[1].split()]
    return {k: d[:, names.index(k)] for k in COLS}, eeps

def thin(c, primary):
    n = len(c["star_age"]); keep = [0]; last = 0
    for i in range(1, n):
        j = last
        d = abs(c["log_L"][i] - c["log_L"][j]) + abs(c["log_Teff"][i] - c["log_Teff"][j]) + abs(c["log_R"][i] - c["log_R"][j])
        da = abs(math.log10(c["star_age"][i]) - math.log10(c["star_age"][j]))
        dm = abs(c["star_mass"][i] - c["star_mass"][j])
        if (i + 1) in primary or i == n - 1 or d > 0.006 or da > 0.006 or dm > 0.004 or c["phase"][i] != c["phase"][j] or abs(c["center_h1"][i] - c["center_h1"][j]) > 0.02:
            keep.append(i); last = i
    return keep

def read_bedard(path):
    lines = [l for l in open(path).read().split("\n") if l.strip() and not l.startswith("=")]
    rows = []
    i = 0
    while i < len(lines):
        a = lines[i].split()
        if len(a) == 6 and a[0].isdigit():
            rows.append([float(x) for x in a]); i += 3
        else:
            i += 1
    return rows  # Mod, Teff, logg, R(cm), Age(yr), L(erg/s)

def r(v, nd):
    return float(round(float(v), nd))

def sig(v, n=6):
    return float(f"{float(v):.{n}g}")

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--mist", default="/workspace/vr-stellar/mist/MIST_v1.2_feh_p0.00_afe_p0.0_vvcrit0.4_EEPS")
    ap.add_argument("--bedard", default="/workspace/vr-stellar/bedard")
    ap.add_argument("--out", default=os.path.join(os.path.dirname(__file__), "../../public/stellar-life/data/tracks.json"))
    a = ap.parse_args()
    out = {"note": "Derived values for PopBoard Stellar Life Cycle VR. Built by tools/stellar-life/build-data.py. Do not hand-edit.",
           "sources": {
               "mist": "MIST v1.2, [Fe/H] = 0, v/vcrit = 0.4, EEP tracks (Choi et al. 2016, ApJ 823, 102; Dotter 2016, ApJS 222, 8)",
               "wd": "Bedard et al. 2020, ApJ 901, 93, thick-H cooling sequences (Montreal White Dwarf Database). Derived values only."},
           "masses": {}}
    for m, f in MASSES.items():
        c, eeps = read_mist(os.path.join(a.mist, f + ".track.eep"))
        keep = thin(c, set(eeps))
        tr = {"eep": [i + 1 for i in keep],
              "age": [sig(c["star_age"][i]) for i in keep],
              "mass": [r(c["star_mass"][i], 4) for i in keep],
              "logL": [r(c["log_L"][i], 4) for i in keep],
              "logT": [r(c["log_Teff"][i], 4) for i in keep],
              "logR": [r(c["log_R"][i], 4) for i in keep],
              "phase": [int(c["phase"][i]) for i in keep],
              "xh1": [r(c["center_h1"][i], 4) for i in keep],
              "xhe4": [r(c["center_he4"][i], 4) for i in keep],
              "logTc": [r(c["log_center_T"][i], 4) for i in keep]}
        ent = {"file": f + ".track.eep", "primaryEEPs": eeps, "nRaw": len(c["star_age"]), "track": tr}
        if m in SHIFT: ent["shift"] = SHIFT[m]
        if m in WD:
            rows = read_bedard(os.path.join(a.bedard, WD[m] + ".txt"))
            t_end = 10 ** (c["log_Teff"][-1] + (SHIFT.get(m, {}).get("dlogTeff", 0)))
            if m == "0.2":
                j0 = 0  # predicted stand-in: start at the top of the sequence
            else:
                j0 = next(j for j, row in enumerate(rows) if row[1] <= t_end)
            base = rows[j0][4]
            wd = {"seq": WD[m], "join": "first model with Teff <= MIST end Teff" if m != "0.2" else "start of sequence (predicted stand-in)",
                  "coolAge": [], "logL": [], "logT": [], "logR": []}
            lastT = None
            for row in rows[j0:]:
                ca = row[4] - base
                if ca > 3.0e10: break
                lt = math.log10(row[1])
                if lastT is not None and abs(lt - lastT) < 0.008 and row is not rows[-1]: continue
                lastT = lt
                wd["coolAge"].append(sig(ca)); wd["logT"].append(r(lt, 4))
                wd["logL"].append(r(math.log10(row[5] / LSUN_CGS), 4)); wd["logR"].append(r(math.log10(row[3] / RSUN_CM), 4))
            ent["wd"] = wd
        out["masses"][m] = ent
        print(m, "rows", len(keep), "of", len(c["star_age"]), ("wd %d" % len(ent["wd"]["logT"])) if "wd" in ent else "")
    with open(a.out, "w") as fh:
        json.dump(out, fh, separators=(",", ":"))
    print("wrote", a.out, os.path.getsize(a.out), "bytes")

if __name__ == "__main__":
    main()
