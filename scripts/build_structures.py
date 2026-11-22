#!/usr/bin/env python3
"""Fetch crystal structures from COD, validate them hard, emit data files.

A structure is only kept if:
  * its element ratio matches the mineral formula,
  * every bonded pair sits in a literature bond-length window,
  * no atom is isolated and none are closer than 1.1 A.

This is deliberately fussy. A wrong unit cell on a page that claims to show real
crystallography is worse than no page at all.

    tools/venv/bin/python scripts/build_structures.py
"""
import io, json, os, re, time, urllib.parse, urllib.request
import numpy as np
from ase.io import read

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

# name -> (element ratios, bond windows in Angstrom)
PHASES = [
    ("hematite",    {"Fe": 2, "O": 3},             ("Fe-O", 1.85, 2.20)),
    ("willemite",   {"Zn": 2, "Si": 1, "O": 4},    ("Zn-O", 1.90, 2.15)),
    ("cassiterite", {"Sn": 1, "O": 2},             ("Sn-O", 1.95, 2.20)),
    ("zircon",      {"Zr": 1, "Si": 1, "O": 4},    ("Zr-O", 2.00, 2.40)),
    ("corundum",    {"Al": 2, "O": 3},             ("Al-O", 1.75, 2.00)),
    ("magnetite",   {"Fe": 3, "O": 4},             ("Fe-O", 1.85, 2.20)),
    ("spinel",      {"Mg": 1, "Al": 2, "O": 4},    ("Mg-O", 1.90, 2.20)),
    ("cuprite",     {"Cu": 2, "O": 1},             ("Cu-O", 1.78, 2.05)),
    ("rutile",      {"Ti": 1, "O": 2},             ("Ti-O", 1.80, 2.12)),
    ("quartz",      {"Si": 1, "O": 2},             ("Si-O", 1.55, 1.72)),
    ("bismuth",     {"Bi": 1},                     None),
    ("anorthite",   {"Ca": 1, "Al": 2, "Si": 2, "O": 8}, ("Ca-O", 2.25, 2.65)),
    ("diopside",    {"Ca": 1, "Mg": 1, "Si": 2, "O": 6}, ("Si-O", 1.55, 1.72)),
    ("zincite",     {"Zn": 1, "O": 1},             ("Zn-O", 1.90, 2.15)),
    ("leucite",     {"K": 1, "Al": 1, "Si": 2, "O": 6}, ("Si-O", 1.55, 1.72)),
    ("wollastonite",{"Ca": 1, "Si": 1, "O": 3},    ("Si-O", 1.55, 1.72)),
    ("baddeleyite", {"Zr": 1, "O": 2},             ("Zr-O", 2.00, 2.40)),
    ("chromite",    {"Fe": 1, "Cr": 2, "O": 4},    ("Cr-O", 1.85, 2.12)),
]
UA = {"User-Agent": "glazecast/0.2 (+structure build)"}


def get(url, tries=3):
    for i in range(tries):
        try:
            with urllib.request.urlopen(urllib.request.Request(url, headers=UA), timeout=25) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            time.sleep(0.7 * (i + 1))
    return None


def formula_counts(f):
    out = {}
    for el, n in re.findall(r"([A-Z][a-z]?)\s*(\d+(?:\.\d+)?)?", str(f).replace("-", " ")):
        out[el] = out.get(el, 0.0) + (float(n) if n else 1.0)
    return out


def ratio_match(have, want):
    if set(have) != set(want):
        return False
    ref = next(iter(want))
    hb, wb = have[ref], want[ref]
    return bool(hb) and all(abs(have[k] / hb - want[k] / wb) < 0.03 for k in want)


def pair_min(atoms, pair):
    """shortest distance between the two elements, periodic images included"""
    a, b = pair
    d = atoms.get_all_distances(mic=True)
    np.fill_diagonal(d, 99.0)
    idx_a = [i for i, s in enumerate(atoms.get_chemical_symbols()) if s == a]
    idx_b = [i for i, s in enumerate(atoms.get_chemical_symbols()) if s == b]
    if a == b:
        best = 99.0
        for i in idx_a:
            for j in idx_a:
                if i != j:
                    best = min(best, float(d[i, j]))
        return best
    if not idx_a or not idx_b:
        return None
    return min(float(d[i, j]) for i in idx_a for j in idx_b)


def validate(atoms, ratios, window):
    syms = atoms.get_chemical_symbols()
    counts = {s: syms.count(s) for s in set(syms)}
    # 1. composition: normalise both sides by the same reference element
    ref = next(iter(ratios))
    if not counts.get(ref):
        return False, "reference element missing"
    if not all(abs(counts.get(k, 0) / counts[ref] - ratios[k] / ratios[ref]) < 0.08 for k in ratios):
        return False, f"composition {counts} vs {ratios}"
    # 2. no absurdly short contacts
    d = atoms.get_all_distances(mic=True)
    np.fill_diagonal(d, 99.0)
    if float(d.min()) < 1.1:
        return False, f"contact {d.min():.2f}"
    # 3. bond window
    if window:
        pair = window[0].split("-") if "-" in window[0] else [window[0][:2], window[0][2:]]
        v = pair_min(atoms, (pair[0], pair[1])) if len(pair) == 2 else None
        if v is None:
            return False, f"no {window[0]} bonds"
        if not (window[1] * 0.97 <= v <= window[2] * 1.03):
            return False, f"{window[0]} {v:.2f} outside {window[1]}-{window[2]}"
    return True, "ok"


def main():
    out = []
    for name, ratios, window in PHASES:
        print(name.ljust(14), end="", flush=True)
        raw = get("https://www.crystallography.net/cod/result.php?text=" + urllib.parse.quote(name) + "&format=json")
        if not raw:
            print("search failed"); continue
        hits = [h for h in json.loads(raw) if ratio_match(formula_counts(h.get("formula", "")), ratios)]
        if not hits:
            print("no formula match"); continue

        chosen = None
        reasons = []
        for h in hits[:14]:
            cif = get(f"https://www.crystallography.net/cod/{h['file']}.cif")
            if not cif:
                continue
            try:
                atoms = read(io.StringIO(cif), format="cif")
            except Exception as e:
                reasons.append("read"); continue
            if not (3 <= len(atoms) <= 320):
                continue
            ok, why = validate(atoms, ratios, window)
            if ok:
                chosen = (h, atoms); break
            reasons.append(why)

        if not chosen:
            print("rejected: " + "; ".join(sorted(set(reasons))[:3])); continue

        h, atoms = chosen
        cp = atoms.cell.cellpar()
        sym = atoms.info.get("spacegroup")
        out.append({
            "id": name, "name": name.capitalize(),
            "formula": atoms.get_chemical_formula(),
            "spaceGroup": getattr(sym, "symbol", "") or str(sym or ""),
            "spaceGroupNumber": int(getattr(sym, "no", 0) or 0),
            "cell": {"a": round(float(cp[0]), 4), "b": round(float(cp[1]), 4), "c": round(float(cp[2]), 4),
                     "alpha": round(float(cp[3]), 3), "beta": round(float(cp[4]), 3), "gamma": round(float(cp[5]), 3)},
            "atoms": [{"el": s, "p": [round(float(x), 4) for x in p]}
                      for s, p in zip(atoms.get_chemical_symbols(), atoms.positions)],
            "bondCheck": {"pair": window[0] if window else "-",
                          "min": round(pair_min(atoms, tuple(window[0].split("-")) if window else ("Bi", "Bi")) or 0, 3),
                          "window": [window[1], window[2]] if window else [0, 0]},
            "source": {"database": "COD", "id": h["file"],
                       "url": f"https://www.crystallography.net/cod/{h['file']}.html"},
        })
        print(f"ok  COD {h['file']}  {len(atoms):>3} atoms  {window[0] if window else ''} "
              f"{out[-1]['bondCheck']['min']}")
        time.sleep(0.25)

    path = os.path.join(ROOT, "data", "structures.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    json.dump(out, open(path, "w"))
    open(os.path.join(ROOT, "data", "structures.js"), "w").write(
        "window.CRYSTAL_DATA = " + json.dumps(out) + ";\n")
    print(f"\nwrote {len(out)} structures ({os.path.getsize(path)//1024} kB)")


if __name__ == "__main__":
    main()
