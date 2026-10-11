# Canvas Session State Persistence

Page reloads and navigations previously wiped the canvas and regenerated full procedural colonies, undoing user scrubbing efforts. We decided to implement Canvas Session State Persistence: serializing the canvas bitmap into a tab-scoped data URL in `sessionStorage` alongside colony layouts and progress metrics. Upon reload or within-origin navigation, the saved canvas and progress are restored, preserving scrubbed holes and remaining mold patches until explicitly sanitized.
