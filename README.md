# Tab Rot

Digital mold simulator that visually punishes tab hoarding. Neglected browser tabs decay in the background. When infestation reaches 100%, an emergency countdown begins—scrub the mold away with your sponge or watch the tab get closed.

## Mechanics

- **Procedural Mold**: 5 biological species (*Penicillium*, *Aspergillus*, *Neurospora*, *Cladosporium*) germinate across the viewport with velvety spore stippling and guttation droplets.
- **Background Stagnation**: All inactive, unfocused, and hoarded tabs rot continuously in the background.
- **Cleaning Mode (`C`)**: Equips an animated washing sponge cursor (`sponge.webp`). Fast movement abrades mold layers down to bare glass with tactile friction audio.
- **Coverage Sync**: The HUD percentage strictly reflects remaining on-screen mold, reaching 0% only when the canvas is clean.
- **Necrotic Purge**: 100% rot initiates a 10-second emergency countdown with screen shake and distress vignette before closing the tab.
- **Safeguards**: Pinned tabs, audible media tabs, and active form inputs are protected from closure.
- **Physical Occlusion**: Mold physically intercepts clicks and pointer events, paralyzing buttons and links beneath fungal colonies until scrubbed clean.
## Controls

| Key / Action | Function |
| :--- | :--- |
| `C` | Toggle Cleaning Mode (equip sponge) |
| Rapid mouse sweep | Scrub and abrade mold |
| Popup $\rightarrow$ Rot Now | Trigger 95% rot bloom immediately |
| Popup $\rightarrow$ Clean Mold | Sanitize canvas to 0% |

## Install

```bash
bun install
bun run build
```

1. Open `chrome://extensions` and enable **Developer mode**.
2. Click **Load unpacked** and select `.output/chrome-mv3`.

## Architecture

Built with [WXT](https://wxt.dev/), React 19, and TypeScript.
Domain model and decisions documented in [`GLOSSARY.md`](GLOSSARY.md) and [`docs/adr/`](docs/adr/).

## License

MIT
