# Anti-Premature Zero Guard for Rot Progress

Filtering active colonies by an artificially decremented `lastRenderedProgress` caused all colonies to be ignored once progress dropped below 4%, prematurely forcing rotProgress to 0% while unscrubbed mold was still visible on screen. We decided to implement an anti-premature zero guard: rotProgress decrements steadily during scrubbing and is clamped to a minimum of 1% as long as canvas sampling detects any remaining mold, reaching 0% strictly when the entire canvas is verified clean.
