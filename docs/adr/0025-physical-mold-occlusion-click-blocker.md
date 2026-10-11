# Physical Mold Occlusion Click Blocker

Allowing mouse clicks to pass through dense mold colonies eliminated practical consequences for neglecting page content. We decided to implement Physical Mold Occlusion via capture-phase `pointerdown`, `mousedown`, and `click` interception: sampling canvas alpha at click coordinates (alpha > 15) to cancel events and halt propagation. This physically paralyzes buttons, links, and inputs beneath mold until the user scrubs the mold away, while permitting unobstructed interaction on clean page areas and extension HUD controls.
