#!/usr/bin/env python3
"""Extract primary ITA Vol. A diagram plates for space groups 1–230.

Requires the Hahn 2005 Vol. A PDF and poppler-utils (pdfimages, pdftotext).
Short extracts / single-group diagrams may be reproduced with source
acknowledgment (IUCr copyright notice in the volume).
"""
from __future__ import annotations

import argparse
import json
import subprocess
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DEFAULT_MAP = ROOT / "scripts" / "ita_diagram_pages.tsv"
DEFAULT_OUT = ROOT / "public" / "ita-diagrams"
DEFAULT_MANIFEST = ROOT / "src" / "data" / "itaDiagrams.json"


def load_map(path: Path) -> list[tuple[int, int]]:
    rows: list[tuple[int, int]] = []
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        n_s, p_s = line.split("\t")
        rows.append((int(n_s), int(p_s)))
    return rows


def extract_one(pdf: Path, n: int, page: int, raw: Path, out: Path) -> dict:
    prefix = raw / f"sg{n:03d}"
    for old in raw.glob(f"sg{n:03d}-*"):
        old.unlink()
    subprocess.run(
        ["pdfimages", "-f", str(page), "-l", str(page), "-png", str(pdf), str(prefix)],
        check=True,
        capture_output=True,
        text=True,
    )
    candidates = sorted(raw.glob(f"sg{n:03d}-*.png"))
    best = None
    best_area = 0
    for c in candidates:
        with Image.open(c) as im:
            area = im.size[0] * im.size[1]
        if area > best_area:
            best_area = area
            best = c
    if not best or best_area < 10_000:
        raise RuntimeError(f"No usable diagram on PDF page {page} for No. {n}")
    dest = out / f"{n:03d}.png"
    with Image.open(best) as im:
        if im.mode not in ("1", "L"):
            im = im.convert("L")
        im.thumbnail((1400, 1600), Image.Resampling.LANCZOS)
        if im.mode == "L":
            hist = im.histogram()
            nonzero = sum(1 for h in hist if h > 0)
            if nonzero <= 4:
                im = im.point(lambda x: 0 if x < 128 else 255, mode="1")
        im.save(dest, "PNG", optimize=True)
    return {
        "file": f"ita-diagrams/{n:03d}.png",
        "pdfPage": page,
        "bytes": dest.stat().st_size,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("pdf", type=Path)
    ap.add_argument("--map", type=Path, default=DEFAULT_MAP)
    ap.add_argument("--out", type=Path, default=DEFAULT_OUT)
    ap.add_argument("--manifest", type=Path, default=DEFAULT_MANIFEST)
    ap.add_argument("--raw", type=Path, default=Path("/tmp/ita-extract/raw"))
    args = ap.parse_args()
    args.out.mkdir(parents=True, exist_ok=True)
    args.raw.mkdir(parents=True, exist_ok=True)
    manifest: dict[str, dict] = {}
    for n, page in load_map(args.map):
        manifest[str(n)] = extract_one(args.pdf, n, page, args.raw, args.out)
        print(f"No.{n} → {manifest[str(n)]['file']}")
    args.manifest.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n")
    print(f"Wrote {len(manifest)} entries → {args.manifest}")


if __name__ == "__main__":
    main()
