# Global Stylesheet Cursor Suppression

Setting `cursor: none` inline on `document.documentElement` and `document.body` relied on CSS inheritance, which was overridden by explicit link and button rules (e.g. `a { cursor: pointer; }`), causing native pointer and text cursors to render on top of the sponge sprite. We decided to dynamically inject a global stylesheet with `* { cursor: none !important; }` while Cleaning Mode is active, ensuring universal suppression of native cursors across all interactive elements, and cleanly removing it upon mode exit to restore standard cursors.
