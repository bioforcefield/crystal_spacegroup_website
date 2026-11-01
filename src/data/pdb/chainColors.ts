/** Distinct chain colors (Tableau-like palette). */
const CHAIN_PALETTE = ['#4e79a7', '#f28e2b', '#59a14f', '#e15759', '#b07aa1', '#76b7b2', '#edc948', '#ff9da7', '#9c755f', '#bab0ac']
export const chainColor = (k: number) => CHAIN_PALETTE[((k % CHAIN_PALETTE.length) + CHAIN_PALETTE.length) % CHAIN_PALETTE.length]!
