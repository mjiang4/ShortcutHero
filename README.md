# Shortcut Hero

Learn the shortcuts that make great software feel fast.

Shortcut Hero is a 3D browser game that helps new users build keyboard-shortcut muscle memory. Actions race down a Guitar Hero-inspired highway; press the right shortcut at the strike line, chain accurate hits, and turn repetitive memorization into a game.

Linear is supported today. Shortcut libraries for Excel, Notion, Jira, Superhuman, and more are coming soon.

## How it works

1. Read the approaching action.
2. Press its shortcut at the strike line.
3. Chain accurate hits to build your combo and score.
4. Review what you knew—and what to practise—after each round.
5. Challenge a friend from selected result screens.

## Game modes

- **Novice:** single-key shortcuts
- **Medium:** key sequences
- **Hard:** keyboard chords
- **Mix:** all three input styles in one run
- **Learn:** shows each shortcut as it approaches
- **Recall:** hides the answer for true memory practice

Adjust the pace, session length, music, and visual effects before each run. The game currently targets physical macOS keyboards and protects Command, Control, Option, and browser shortcuts from capture.

## Why Shortcut Hero?

Keyboard shortcuts are usually learned through documentation, tooltips, or accidental discovery. Shortcut Hero turns them into active recall: quick, repeated practice with immediate timing feedback, combos, particles, sound, and a clear round summary.

The goal is a reusable learning layer for the tools people use every day:

- Linear — available now
- Excel — coming soon
- Notion — coming soon
- Jira — coming soon
- Superhuman — coming soon
- More shortcut libraries and custom tracks — planned

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npx playwright install chromium
npm run db:local:setup
npm run dev
```

Then open `http://localhost:3000`.

Run the same complete quality gate used by CI with:

```bash
npm run check
```

This runs linting, TypeScript validation, engine tests, the production build,
rendered-route tests, and the headless browser suite.

The local database command applies only unapplied migrations to project-local
Wrangler state. Run it again whenever a new file appears in `drizzle/`.

## Built with

React, Three.js, React Three Fiber, Cloudflare D1, post-processing effects, and
procedural Web Audio. Optional typed PostHog analytics stays disabled unless
production credentials are configured.

## Project docs

- [Hackathon product spec](./PROJECT_SPEC.md)
- [Design and visual identity](./DESIGN_IDENTITY.md)
- [Production launch plan](./PRODUCTION_LAUNCH_PLAN.md)
- [Analytics contract and dashboard setup](./ANALYTICS.md)
