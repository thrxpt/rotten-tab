# Frantic Scrubbing Mechanism

The canvas overlay must maintain `pointer-events: none` so users can click links, select text, and operate host web applications without extension interference. We decided to implement scrubbing by monitoring mouse velocity thresholds rather than mouse clicks or passive hovering. Rapid back-and-forth cursor movements erase canvas pixels using destination-out compositing without swallowing click events or accidentally clearing mold during normal reading.
