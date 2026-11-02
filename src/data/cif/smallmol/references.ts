/** Literature behind the small-molecule structure analysis (DOIs checked against Crossref). */
export const SM_REFERENCES: { text: string; doi: string }[] = [
  { text: 'Cordero B. et al. (2008) Covalent radii revisited. Dalton Trans. 2832–2838 (covalent radii; bond rule r1 + r2 + 0.4 Å).', doi: '10.1039/b801115j' },
  { text: 'Bondi A. (1964) van der Waals volumes and radii. J. Phys. Chem. 68, 441–451 (contacts, H-bond cut-off, packing).', doi: '10.1021/j100785a001' },
  { text: 'Brown I. D. & Altermatt D. (1985) Acta Cryst. B41, 244–247 (bond-valence parameters, source "a").', doi: '10.1107/S0108768185002063' },
  { text: 'Brese N. E. & O\'Keeffe M. (1991) Acta Cryst. B47, 192–197 (bond-valence parameters, source "b").', doi: '10.1107/S0108768190011041' },
  { text: 'O\'Keeffe M. & Brese N. E. (1991) J. Am. Chem. Soc. 113, 3226–3229 (atom electronegativity parameter c, used to choose ligands).', doi: '10.1021/ja00009a002' },
  { text: 'Addison A. W. et al. (1984) J. Chem. Soc., Dalton Trans. 1349–1356 (τ5).', doi: '10.1039/DT9840001349' },
  { text: 'Yang L., Powell D. R. & Houser R. P. (2007) Dalton Trans. 955–964 (τ4).', doi: '10.1039/B617136B' },
  { text: 'Baur W. H. (1974) Acta Cryst. B30, 1195–1215 (distortion index Δ).', doi: '10.1107/S0567740874004560' },
]
export const BV_TABLE_NOTE = 'R0/b values transcribed from I. D. Brown\'s bvparm compilation (sources a and b only); that table is distributed for non-profit use.'
