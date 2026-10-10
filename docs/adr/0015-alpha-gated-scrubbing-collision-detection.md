# Alpha-Gated Scrubbing Collision Detection

Blindly decrementing rot progress based on cursor velocity caused phantom sanitization when users shook the cursor over clean areas or repeatedly in an already-cleaned hole. We decided to implement targeted micro-pixel alpha collision sampling at the cursor contact point (optimized via `willReadFrequently: true`). Canvas abrasion, kinetic decrements, spore particle emissions, and audio playback are executed strictly when the cursor intersects active mold pixels (alpha > 15), eliminating false decrements over empty canvas space.
