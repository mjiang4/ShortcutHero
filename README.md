# Shortcut Hero

A fast, 3D browser game for learning Linear keyboard shortcuts. Actions travel down a Guitar Hero-inspired highway; enter the matching shortcut before each prompt reaches the keyboard.

Product and visual direction:

- [Hackathon product spec](./PROJECT_SPEC.md)
- [Design and visual identity](./DESIGN_IDENTITY.md)

## Play modes

- Novice: single-key actions
- Medium: two-key sequences
- Hard: Shift chords
- Mix: a 45-second showcase across all three input styles
- Learn guidance shows the shortcut; Recall hides it
- Focus, Fast, and Turbo tempo presets

The game currently targets physical macOS keyboards. It only suppresses allowlisted game keys while a run is active and leaves Command, Control, and Option shortcuts to the browser.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Validation:

```bash
npm run lint
npm test
```

The game uses React, Three.js, React Three Fiber, and procedural Web Audio. No database or external asset service is required.
