# Tab Rotting Simulator

Simulates procedural fungal rot and spore growth on neglected browser tabs to visually discourage tab hoarding.

## Language

**Rot Progress**:
The percentage (0% to 100%) dynamically reconciled with real-time on-canvas colony coverage, guaranteeing visual mold density and HUD percentage remain perfectly synchronized throughout growth and scrubbing.
_Avoid_: Guess counter, synthetic decrement, unsynchronized percentage

**Inactivity Timer**:
The countdown tracking idle time while a tab is focused but receives no user input (`mousemove`, `keydown`, `scroll`, `click`).
_Avoid_: Idle watcher, sleep timer

**Stagnation Period**:
The elapsed duration during which any tab remains backgrounded, unfocused, or hoarded, accumulating fungal rot continuously across all open tabs.
_Avoid_: Background idle, tab sleep, single-tab idle

**Mold Colony**:
An autonomous fungal culture originating from randomized germination coordinates across the viewport surface that expands radially and merges with adjacent colonies.
_Avoid_: Edge mold, border creeping, window frame fungus

**Mold Species Ecosystem**:
The diverse biological color spectrum representing five real-world mold taxa: Penicillium (turquoise seafoam), Aspergillus niger (charcoal soot black), Aspergillus flavus (mustard ochre), Neurospora (coral peach red), and Cladosporium (moss olive).
_Avoid_: Random RGB colors, neon fungus, party mold

**Hyphae Network**:
The branching, thread-like mycelial filaments spreading inward from screen perimeters to form an interconnected fungal felt.
_Avoid_: Mold lines, fungus rays, green branches

**Satellite Colony**:
Autonomous circular mold cultures that germinate directly across inner page content ahead of the perimeter boundary.
_Avoid_: Mold spots, floaters, random dots
**Cleaning Mode**:
An interactive operational state toggled via HUD button or keyboard shortcut 'C' that equips the sponge follower sprite and globally suppresses all native cursor states (`* { cursor: none !important; }`), ensuring the sponge sprite is never occluded by link pointers or text carets.
_Avoid_: Auto-scrub, passive clean, always-on eraser, inherited cursor

**Sponge Sprite**:
An animated floating sprite element rendered inside the Shadow DOM from `public/sponge.webp` that tracks cursor coordinates with dynamic squish and tilt physics during active scrubbing.
_Avoid_: Static cursor, OS pointer, native cursor

**Scrubbing**:
The cursor interaction in Cleaning Mode where high-velocity sponge movements across infested canvas coordinates progressively abrade mold and decrement rot progress.
_Avoid_: Wiping, scratching, mouse cleaning, clicking to clean

**Gradual Abrasion**:
The multi-pass erosion mechanic with dynamic finishing acceleration that thins thick mold gradually over 3–4 strokes and cleanly eliminates faint residual films down to true zero transparency (`alpha <= 1`).
_Avoid_: Asymptotic film, premature clean cutoff, cookie cutter

**Spore Debris**:
Ephemeral micro-particles generated at the cursor contact point during scrubbing that briefly disperse and dissolve into air, providing physical visual feedback of mold removal.
_Avoid_: Particle sparks, flying dirt, spray

**Bloom Animation**:
A rapid visual acceleration rendered upon refocusing a stagnant tab to transition rot progress smoothly into accumulated coverage.
_Avoid_: Catch-up jump, instant snap, rot blast

**Rot Notification**:
A transient in-page English toast indicator reporting active rot progression and spore accumulation without shifting host DOM layout.
_Avoid_: Warning banner, sticky hazard bar, top alert
**Kinetic Decrement**:
The calibrated reduction of Rot Progress with an anti-premature zero guard, preventing Rot Progress from dropping below 1% until all mold pixels on canvas are verified clean.
_Avoid_: Premature zero drop, unverified progress loss, ratio collapse

**Scrub Audio**:
Dual-engine audio playback combining an extension Offscreen Document (`AUDIO_PLAYBACK` reason, exempt from host page Autoplay Policy and CSP) with in-memory Web Audio fallback, guaranteeing tactile sound across all tabs.
_Avoid_: Single-page audio, unprivileged content audio, autoplay-blocked audio
**Exponential Bloom**:
The non-linear growth trajectory modeling real fungal propagation where initial spore germination creeps slowly and late-stage mycelium infests rapidly.
_Avoid_: Linear spread, uniform growth, steady crawl

**Sanitization**:
The restoration of a tab to 0% rot progress, triggered either by thorough scrubbing or via the extension control interface.
_Avoid_: Reset, purge, clear canvas

**Necrotic Purge**:
The automated browser tab closure executed when Rot Progress reaches 100% and the Critical Grace Countdown expires without decontamination.
_Avoid_: Auto-kill, force close, crash tab

**Critical Grace Countdown**:
The 10-second emergency rescue countdown initiated at 100% Rot Progress, accompanied by screen shakes and alarm HUD indicators, granting a final opportunity to scrub and save the tab.
_Avoid_: Death timer, kill clock, shutdown delay

**Termination Safeguards**:
Protective exemptions preventing Necrotic Purge on pinned tabs (`tab.pinned`), audible media tabs (`tab.audible`), and active form input fields to avoid catastrophic data loss.
_Avoid_: Ignore forms, blind close, universal kill
