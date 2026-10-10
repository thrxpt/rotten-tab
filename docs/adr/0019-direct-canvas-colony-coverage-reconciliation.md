# Direct Canvas Colony Coverage Reconciliation

Synthetic stroke decrements drifted far behind visual erasure, causing the HUD to report high rot percentages (40–60%) when the screen was 90% clean. We decided to implement direct canvas colony coverage reconciliation: sampling multi-point coordinates of all germinated colonies on canvas during scrubbing. This directly ties rotProgress to the actual proportion of remaining mold colonies, guaranteeing that near-empty screens report low single-digit percentages and reach exactly 0% when the last colony is scrubbed.
