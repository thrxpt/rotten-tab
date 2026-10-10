# Procedural Web Audio API Sound Synthesis

Packaging static audio assets introduces cross-origin asset loading hurdles, increases extension bundle weight, and produces repetitive playback. We decided to generate dynamic acoustic feedback directly through the browser's native `AudioContext` using low-pass noise buffers, frequency sweeps, and envelope filters for mycelial ambient hums and scrubbing friction squelches.
