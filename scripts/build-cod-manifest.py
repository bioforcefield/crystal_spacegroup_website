#!/usr/bin/env python3
"""Rebuild public/samples/cod/manifest.json from cached CIF headers."""
from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DIR = ROOT / "public" / "samples" / "cod"


def grab(text: str, tag: str) -> str | None:
    m = re.search(rf"^{re.escape(tag)}\s+(.+)$", text, re.M)
    if not m:
        return None
    v = m.group(1).strip()
    if v.startswith(";"):
        return None
    if len(v) >= 2 and v[0] == v[-1] and v[0] in "'\"":
        v = v[1:-1]
    return v


def main() -> None:
    samples = []
    for path in sorted(DIR.glob("*.cif")):
        text = path.read_text(errors="replace")
        formula = grab(text, "_chemical_formula_sum")
        name = grab(text, "_chemical_name_common") or grab(
            text, "_chemical_name_mineral"
        )
        hm = grab(text, "_symmetry_space_group_name_H-M") or grab(
            text, "_space_group_name_H-M_alt"
        )
        ita = grab(text, "_space_group_IT_number")
        ita_n = int(ita) if ita and str(ita).isdigit() else None
        samples.append(
            {
                "id": path.stem,
                "label": name or formula or path.stem,
                "hm": hm,
                "ita": ita_n,
                "formula": formula,
            }
        )
    manifest = {
        "note": (
            "Same-origin COD CIF cache for GitHub Pages (no CORS). "
            "Refresh via scripts/fetch-cod-samples.sh + scripts/build-cod-manifest.py"
        ),
        "samples": samples,
    }
    (DIR / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n")
    print(f"Wrote {len(samples)} samples → {DIR / 'manifest.json'}")


if __name__ == "__main__":
    main()
