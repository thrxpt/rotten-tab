# Universal Inactive Tab Background Rotting

Previously, background tabs only accrued rot during visibility transitions and relied on requestAnimationFrame, which Chromium freezes in hidden tabs. We decided to implement universal inactive tab rotting: any hidden or unfocused tab continuously accumulates rot via a 1-second interval, pre-rendering mold onto the canvas in the background and immediately synchronizing accumulated rot upon tab focus, ensuring every neglected tab across the browser rots.
