#!/usr/bin/env python3
"""Regenerate src/data/pdb/analysis/rama8000.ts from the MolProbity Top8000 contour grids.
Data: https://github.com/rlabduke/reference_data (CC BY 4.0, Richardson Lab, Duke University).
Usage: python3 scripts/gen-rama8000.py   (downloads the six rama8000-*.data files)"""
import urllib.request
BASE = 'https://raw.githubusercontent.com/rlabduke/reference_data/master/Top8000/Top8000_ramachandran_pct_contour_grids/'
FILES = {'general': 'general-noGPIVpreP', 'gly': 'gly-sym', 'transpro': 'transpro', 'cispro': 'cispro', 'prepro': 'prepro-noGP', 'ileval': 'ileval-nopreP'}

def grid_for(key, text):
    lo = 0.0005 if key == 'general' else 0.001
    g = [0] * (180 * 180)
    for line in text.splitlines():
        if line.startswith('#') or not line.strip():
            continue
        a, b, v = (float(x) for x in line.split())
        g[int((a + 180) // 2) * 180 + int((b + 180) // 2)] = 2 if v >= 0.02 else (1 if v >= lo else 0)
    rle, prev, n = [], g[0], 0
    for x in g:
        if x == prev:
            n += 1
        else:
            rle.append(f'{prev}{n}'); prev, n = x, 1
    rle.append(f'{prev}{n}')
    return ','.join(rle)

if __name__ == '__main__':
    path = 'src/data/pdb/analysis/rama8000.ts'
    src = open(path).read()
    head = src[: src.index('export const RAMA8000_RLE')]
    body = ['export const RAMA8000_RLE: Record<Rama8000Table, string> = {']
    for k, f in FILES.items():
        text = urllib.request.urlopen(BASE + f'rama8000-{f}.data').read().decode()
        body.append(f"  {k}: '{grid_for(k, text)}',")
    body.append('}\n')
    open(path, 'w').write(head + '\n'.join(body))
