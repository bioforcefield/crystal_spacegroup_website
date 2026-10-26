#!/usr/bin/env python3
"""Export all 230 ITA space groups (general positions) via gemmi → JSON.

Usage (from repo root):

  .venv/bin/python scripts/export_ita_groups.py
  npm run gen:ita   # copies into src/data/itaSpaceGroups.json
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

try:
    import gemmi
except ImportError:
    print("gemmi is required. Try: .venv/bin/pip install gemmi", file=sys.stderr)
    sys.exit(1)

OUT = Path(__file__).resolve().parent / "ita_space_groups.json"


def main() -> None:
    groups = []
    for n in range(1, 231):
        sg = gemmi.find_spacegroup_by_number(n)
        if sg is None:
            raise SystemExit(f"missing space group {n}")
        triplets = [op.triplet() for op in sg.operations()]
        # Compact HM without spaces (gemmi .hm is spaced / full).
        hm_compact = sg.hm.replace(" ", "")
        groups.append(
            {
                "number": n,
                "hm": hm_compact,
                "hmSpaced": sg.xhm(),
                "xhm": sg.xhm(),
                "hall": sg.hall,
                "system": sg.crystal_system_str().lower(),
                "lattice": sg.centring_type(),
                "multiplicity": len(triplets),
                "triplets": triplets,
            }
        )

    payload = {
        "source": "gemmi",
        "version": getattr(gemmi, "__version__", "unknown"),
        "groups": groups,
    }
    OUT.write_text(json.dumps(payload, indent=2) + "\n")
    print(f"wrote {OUT} ({len(groups)} groups, gemmi {payload['version']})")


if __name__ == "__main__":
    main()
