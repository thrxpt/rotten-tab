# Coverage-Reconciled Rot Progress

Fixed kinetic decrements suffered from cumulative integration drift: visual mold could be 100% erased before the decremented counter reached 0%, leaving a non-zero rot percentage on a completely clean screen. We decided to implement coverage-reconciled rot progress: active colony coordinates are sampled during scrubbing to reconcile rotProgress with the actual remaining colony ratio, guaranteeing rotProgress reaches exactly 0% the moment all mold colonies are eliminated from the canvas.
