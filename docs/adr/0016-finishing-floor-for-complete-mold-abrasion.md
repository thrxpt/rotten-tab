# Finishing Floor for Complete Mold Abrasion

An alpha collision cutoff threshold of `<= 15` combined with asymptotic `destination-out` decay left a visible faint film of mold on screen that could not be scrubbed away. We decided to lower the clean cutoff threshold to `<= 1` (true canvas transparency) and implement a dynamic finishing boost when remaining alpha is below 75. This preserves gradual 3–4 stroke abrasion on dense mold while cleanly eliminating the final thin smudge down to 100% transparency.
