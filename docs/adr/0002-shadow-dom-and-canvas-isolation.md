# Shadow DOM and Canvas-Only SVG Distortion Filter

Arbitrary host page stylesheets and deep DOM trees degrade performance or corrupt injected UI when SVG displacement filters or global CSS resets collide with the extension. We decided to encapsulate the canvas, hazard banner, and SVG filter inside an open Shadow DOM root, applying the SVG turbulence filter strictly to the canvas element rather than the host page DOM.
