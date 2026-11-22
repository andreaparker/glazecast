#!/usr/bin/env python3
"""Fetch real crystal structures from the Crystallography Open Database.

Uses ASE to read CIFs, so symmetry expansion follows the published space group
rather than a hand-rolled parser. Every structure keeps its COD id, and every
one is distance-checked before it is allowed into the data file.

    tools/venv/bin/python scripts/fetch_structures.py
"""
import io
import json
import os
import sys
import time
import urllib.parse
import urllib.request

from ase.io import read
from ase.neighborlist import natural_cutoffs, NeighborList
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

WANTED = [
    ("hematite",     {"Fe": 2, "O": 3}),
    ("willemite",    {"Zn": 2, "Si": 1, "O": 4}),
    ("cassiterite",  {"Sn": 1, "O": 2}),
    ("zircon",       {"Zr": 1, "Si": 1, "O": 4}),
    ("corundum",     {"Al": 2, "O": 3}),
    ("magnetite",    {"Fe": 3, "O": 4}),
    ("spinel",       {"Mg": 1, "Al": 2, "O": 4}),
    ("cuprite",      {"Cu": 2, "O": 1}),
    ("rutile",       {"Ti": 1, "O": 2}),
    ("quartz",       {"Si": 1, "O": 2}),
    ("bismuth",      {"Bi": 1}),
    ("anorthite",    {"Ca": 1, "Al": 2, "Si": 2, "O": 8}),
    ("diopside",     {"Ca": 1, "Mg": 1, "Si": 2, "O": 6}),
    ("zincite",      {"Zn": 1, "O": 1}),
    ("leucite",      {"K": 1, "Al": 1, "Si": 2, "O": 6}),
    ("wollastonite", {"Ca": 1, "Si": 1, "O": 3}),
    ("baddeleyite",  {"Zr": 1, "O": 2}),
    ("chromite",     {"Fe": 1, "Cr": 2, "O": 4}),
]

UA = {"User-Agent": "glazecast/0.2 (crystal structure fetch; contact: local)"}


def get(url, tries=3):
    for i in range(tries):
        try:
            req = urllib.request.Request(url, headers=UA)
            with urllib.request.urlopen(req, timeout=25) as r:
                return r.read().decode("utf-8", "replace")
        except Exception:
            time.sleep(0.8 * (i + 1))
    return None


def parse_formula(f):
    import re
    out = {}
    for el, n in re.findall(r"([A-Z][a-z]?)\s*(\d+(?:\.\d+)?)?", str(f).replace("-", " ")):
        out[el] = out.get(el, 0) + (float(n) if n else 1.0)
    return out


def ratio_match(have, want):
    if set(have) != set(want):
        return False
    ref = next(iter(want))
    hb, wb = have[ref], want[ref]
    if not hb:
        return False
    return all(abs(have[k] / hb - want[k] / wb) < 0.02 for k in want)


def read_structure(text):
    """ase handles the space group; returns (atoms, sginfo, cellparam)."""
    atoms = read(io.StringIO(text), format="cif")
    return atoms


def check(atoms):
    """Distance sanity: every atom needs a neighbour, none closer than 1.2 A,
    and no pairwise distance should sit far outside covalent-radius sum."""
    d = atoms.get_all_distances(mic=True)
    np.fill_diagonal(d, 99.0)
    r = np.array(natural_cutoffs(atoms), dtype=float)
    # how many bonds per atom at 1.15x covalent radii
    nl = NeighborList(1.15 * r, self_interaction=False, bothways=True)
    nl.update(atoms)
    counts = [len(nl.get_neighbors(i)[0]) for i in range(len(atoms))]
    close = float(d.min())
    n_isolated = sum(1 for c in counts if c == 0)
    # bond length ratios for actual bonded pairs
    ratios = []
    for i in range(len(atoms)):
        idx, offs = nl.get_neighbors(i)
        for j, off in zip(idx, offs):
            if j <= i:
                continue
            vec = atoms.positions[j] + off @ atoms.cell[:] - atoms.positions[i]
            dist = float(np.linalg.norm(vec))
            ratios.append(dist / (r[i] + r[j]))
    ratios = np.array(ratios) if ratios else np.array([1.0])
    return {
        "minDistance": round(close, 3),
        "isolatedAtoms": n_isolated,
        "bondRatioMin": round(float(ratios.min()), 3),
        "bondRatioMax": round(float(ratios.max()), 3),
        "bonds": int(len(ratios)),
        "ok": bool(close > 1.1 and n_isolated == 0 and ratios.min() > 0.72 and ratios.max() < 1.35),
    }


def main():
    out = []
    for name, want in WANTED:
        sys.stdout.write(name.ljust(14))
        sys.stdout.flush()
        raw = get("https://www.crystallography.net/cod/result.php?text="
                  + urllib.parse.quote(name) + "&format=json")
        if not raw:
            print("search failed")
            continue
        hits = json.loads(raw)
        cands = [h for h in hits if ratio_match(parse_formula(h.get("formula", "")), want)][:10]
        if not cands:
            print("no formula match")
            continue

        picked = None
        for h in cands:
            cif = get(f"https://www.crystallography.net/cod/{h['file']}.cif")
            if not cif:
                continue
            try:
                atoms = read_structure(cif)
            except Exception:
                continue
            if not (3 <= len(atoms) <= 320):
                continue
            v = check(atoms)
            if not v["ok"]:
                continue
            picked = (h, atoms, v)
            break
        if not picked:
            print("no entry passed distance check")
            continue

        h, atoms, v = picked
        cell = atoms.cell.cellpar()
        syms = atoms.get_chemical_symbols()
        out.append({
            "id": name,
            "name": name.capitalize(),
            "formula": atoms.get_chemical_formula(),
            "spaceGroup": (getattr(atoms.info.get("spacegroup"), "symbol", None)
                           or str(atoms.info.get("spacegroup", "")) or ""),
            "cell": {"a": round(float(cell[0]), 4), "b": round(float(cell[1]), 4),
                     "c": round(float(cell[2]), 4), "alpha": round(float(cell[3]), 3),
                     "beta": round(float(cell[4]), 3), "gamma": round(float(cell[5]), 3)},
            "atoms": [{"el": s, "p": [round(float(x), 4) for x in p]}
                      for s, p in zip(syms, atoms.positions)],
            "check": v,
            "source": {"database": "COD", "id": h["file"],
                       "url": f"https://www.crystallography.net/cod/{h['file']}.html"},
        })
        print(f"ok  COD {h['file']}  {len(atoms)} atoms  min {v['minDistance']} A  "
              f"bond ratio {v['bondRatioMin']}-{v['bondRatioMax']}")
        time.sleep(0.3)

    path = os.path.join(ROOT, "data", "structures.json")
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, "w") as f:
        json.dump(out, f)
    print(f"\nwrote data/structures.json ({len(out)} structures, {os.path.getsize(path)//1024} kB)")


if __name__ == "__main__":
    main()
