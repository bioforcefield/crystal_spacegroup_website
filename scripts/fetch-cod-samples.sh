#!/usr/bin/env bash
# Download curated COD CIFs into public/samples/cod/ for same-origin GH Pages loads.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="$ROOT/public/samples/cod"
mkdir -p "$DIR"
IDS=(
  1100303 1507774 9008565 9008462 9000001 1010962 1507756 1000061
  2101983 2002258 1512506 1010954 1532834 2101852 2104741 9007681
)
for id in "${IDS[@]}"; do
  echo "COD $id…"
  curl -fsSL "https://www.crystallography.net/cod/${id}.cif" -o "$DIR/${id}.cif"
done
echo "Done. Re-run the Python manifest builder or npm test; see CONTINUITY.md."
