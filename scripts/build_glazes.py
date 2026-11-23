#!/usr/bin/env python3
"""Extract every public glaze recipe from the Glazy archive into a compact JSON.

Input:  /tmp/glazy.yaml  (download from github.com/derekphilipau/glazy-data)
Output: data/glazes-raw.json

Only Type=Recipe entries whose Subtype contains "Glaze" and which carry a
Percent Analysis with SiO2 are kept. Descriptions are truncated to 140 chars.
"""
import json, os, sys, yaml

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = sys.argv[1] if len(sys.argv) > 1 else "/tmp/glazy.yaml"

print("loading yaml...")
with open(SRC) as f:
    data = yaml.safe_load(f)
print(len(data), "entries")

out = []
for d in data:
    if d.get("Type") != "Recipe":
        continue
    if "Glaze" not in str(d.get("Subtype") or ""):
        continue
    pa = d.get("Percent Analysis") or {}
    if not pa.get("SiO2"):
        continue
    creator = (d.get("Created By") or {}).get("Name") or ""
    desc = d.get("Description") or ""
    out.append({
        "id": d.get("ID"),
        "name": d.get("Name") or "",
        "author": str(creator),
        "state": d.get("State") or "",
        "subtype": str(d.get("Subtype") or ""),
        "cone": str(d.get("Cone") or ""),
        "atmospheres": [str(a) for a in (d.get("Atmospheres") or [])],
        "surface": d.get("Surface") or "",
        "description": desc[:140] if isinstance(desc, str) else "",
        "analysis": {k: round(float(v), 4) for k, v in pa.items()
                     if isinstance(v, (int, float)) and k != "LOI"}
    })

path = os.path.join(ROOT, "data", "glazes-raw.json")
with open(path, "w") as f:
    json.dump(out, f)
print(len(out), "glazes ->", path, f"({os.path.getsize(path)//1024//1024} MB)")
