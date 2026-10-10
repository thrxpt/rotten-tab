# Tab Rotting Simulator

Simulates procedural fungal rot and spore growth on neglected browser tabs to visually discourage tab hoarding.

## Language

**Rot Progress**:
The percentage (0% to 100%) quantifying viewport coverage and mycelial density on an inactive tab.
_Avoid_: Mold level, corruption percentage, decay score

**Inactivity Timer**:
The countdown tracking idle time while a tab is focused but receives no user input (`mousemove`, `keydown`, `scroll`, `click`).
_Avoid_: Idle watcher, sleep timer

**Stagnation Period**:
The duration a tab remains hidden or backgrounded, converted directly into rot progress when the tab is refocused.
_Avoid_: Background idle, tab sleep

**Mold Colony**:
An autonomous fungal cluster originating along the viewport periphery that expands inward via mycelial bodies and spore granules.
_Avoid_: Mold blob, fungus spot, patch

**Hyphae Network**:
The branching, thread-like mycelial filaments spreading inward from screen perimeters to form an interconnected fungal felt.
_Avoid_: Mold lines, fungus rays, green branches

**Satellite Colony**:
Autonomous circular mold cultures that germinate directly across inner page content ahead of the perimeter boundary.
_Avoid_: Mold spots, floaters, random dots
**Scrubbing**:
The cursor interaction where high-velocity mouse movements across infested canvas coordinates erase mold and decrement rot progress.
_Avoid_: Wiping, scratching, mouse cleaning, clicking to clean

**Bloom Animation**:
A rapid visual acceleration rendered upon refocusing a stagnant tab to transition rot progress smoothly into accumulated coverage.
_Avoid_: Catch-up jump, instant snap, rot blast

**Rot Notification**:
A transient in-page English toast indicator reporting active rot progression and spore accumulation without shifting host DOM layout.
_Avoid_: Warning banner, sticky hazard bar, top alert
**Kinetic Decrement**:
The calibrated reduction of Rot Progress calculated directly from scrubbing stroke velocity and swept distance without querying GPU pixel buffers.
_Avoid_: Alpha sampling, pixel readback, buffer scanning

**Scrub Audio**:
Packaged .mp3 audio playback triggered exclusively while performing high-velocity mouse scrubbing to provide tactile friction feedback.
_Avoid_: Audio synthesis, ambient hum, continuous sound
**Exponential Bloom**:
The non-linear growth trajectory modeling real fungal propagation where initial spore germination creeps slowly and late-stage mycelium infests rapidly.
_Avoid_: Linear spread, uniform growth, steady crawl

**Sanitization**:
The restoration of a tab to 0% rot progress, triggered either by thorough scrubbing or via the extension control interface.
_Avoid_: Reset, purge, clear canvas
