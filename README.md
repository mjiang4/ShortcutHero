# Shortcut Hero

Learn the shortcuts that make great software feel fast.

Shortcut Hero is a 3D browser game that helps new users build keyboard-shortcut muscle memory. Actions race down a Guitar Hero-inspired highway; press the right shortcut at the strike line, chain accurate hits, and turn repetitive memorization into a game.

Play browser-safe macOS shortcut packs for **Linear, Notion, and Slack**. These are reviewed packs, not each app's complete playable keymap.

## How it works

1. Read the approaching action.
2. Press its shortcut at the strike line.
3. Chain accurate hits to build your combo and score.
4. Review what you knew—and what to practise—after each round.
5. Challenge a friend from selected result screens.

## Game modes

- **Easy:** single-key shortcuts
- **Medium:** single keys and two-key sequences, where the app has them
- **Hard:** singles, sequences, and Shift chords, where available

Hints are independent: **Always**, **Reveal** near the strike line, or **Off**. Rounds last **30 seconds**. The defaults are Linear, Medium difficulty, Medium speed, and Reveal hints. Adjust speed, hints, music, and visual effects before playing; hints stay fixed during the round.

Choose **Play → Game setup → App**, then use left/right to cycle apps. Up/down selects a setting; Enter starts the selected app. Switching apps loads that app's own shortcut pool, not relabeled Linear commands. The tutorial also uses the selected app's shortcuts and the same game engine.

The game targets physical macOS keyboards. Command, Control, Option, and system/browser combinations are not intercepted. Only the selected lesson's supported keys are captured during active play; Escape pauses.

## Shortcut data and progress

| App | Easy pool | Medium pool | Hard pool |
|---|---:|---:|---:|
| Linear | 14 | 28 | 37 |
| Notion | 10 | 10 | 14 |
| Slack | 10 | 10 | 13 |

Counts describe the current browser-safe Mac catalog. Each lesson selects up to ten commands, prioritizing review, unseen commands, then least recently practised commands. A small pool cannot introduce new commands on every replay.

The stored reference is larger than the playable pools: **75 Linear entries**, **61 Notion entries**, and **101 Slack entries**. Reserved-modifier shortcuts, pointer gestures, variable-number choices, and historical references do not enter gameplay. Notion's slash commands and Markdown syntax are documented separately; they are not treated as two-key shortcuts.

Jira, Superhuman, and Excel remain stored for reference but are not offered in setup or the home animation. Old links to them fall back to Linear; their saved scores and lesson history are not deleted or relabeled.

- [Catalog JSON](./app/tools/catalog-data.json) groups commands under stable app IDs. Each command stores its action, context, source URL/date, and explicit `macos`/`windows` bindings. Missing bindings are never inferred.
- Slack also preserves all ten original categories, source action labels, alternate shortcut strings for each platform, and context/desktop/layout notes. These fields survive catalog imports and can be filtered for future lessons without re-collecting the source. They do not change scoring or create new game modes.
- [Registry and loader](./app/tools/registry.ts) derive available apps and difficulty pools from that catalog.
- The home screen cycles through those released app names with a blur transition. Adding a released pack updates the names automatically; reduced-motion mode shows a static list.
- Browser-local lesson history is keyed by **app + platform**. High scores additionally distinguish **difficulty + hints + speed + duration**. Switching apps does not overwrite another app's progress.
- Windows bindings are recorded where documented, but Windows launch support is not enabled yet.

To update a pack, validate a JSON snapshot with `npm run catalog:import -- path/to/catalog.json`; add `--write` to replace the included app snapshots. See [primary sources and catalog format](./docs/shortcut-sources.md). No live scraper, third-party account connection, or remote catalog service is required.

## Run locally

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

Install the test browsers once, then run the same quality gate used by CI:

```bash
npx playwright install chromium webkit
npm run check
```

This runs linting, TypeScript validation, engine tests, the production build,
rendered-route tests, and the headless browser suite.

Browser tests exercise the production build. For a browser-only test run, use
`npm run build` followed by `npm run test:browser`.

Leave `SHORTCUT_HERO_BACKEND_ORIGIN` empty during local play and testing. The
game and local scores work without it; server progress and referral-code writes
return an unavailable response rather than silently pretending to save.

## Deploy to Vercel

**The frontend is Vercel-ready; the cloud database migration is not complete.**
This version uses standard Next.js, `next build`, and `next start` with the
Next.js Vercel preset in `vercel.json`. No Cloudflare Worker runtime is needed
to serve the game.

| Capability | With no backend configured | With the existing Sites backend |
|---|---|---|
| All app packs, tutorial, gameplay | Works on Vercel | Works on Vercel |
| Local scores, names, lesson history | Saved in this browser | Saved in this browser |
| Sharing | Plain game link | Referral link when available |
| Server round saves, referral attribution, server-data deletion | Unavailable (API returns 503) | Forwarded to Sites; requires a compatible, reachable deployment |

The current privacy-page deletion action also needs a successful server response
before clearing local records. A fully local-only release must adjust this flow
and its privacy copy. A fully independent release **with cloud saves** needs a
replacement database and migration of the existing server handlers/data. Neither
option is silently substituted for the existing behavior.

1. Push the intended version to GitHub and import the repository into Vercel.
2. Use the **Next.js** framework preset, repository root, and Node.js **22.x**.
   Leave the build command (`npm run build`) and output directory at their defaults.
3. Set the canonical URL in the production environment before building:

   ```text
   NEXT_PUBLIC_SITE_URL=https://your-domain.example
   ```

   For the temporary hybrid setup, also set `SHORTCUT_HERO_BACKEND_ORIGIN` to the
   verified HTTPS origin of the existing Sites API. This variable is server-only;
   never prefix it with `NEXT_PUBLIC_` or point it at the Vercel/custom domain.
   Keep the old Sites deployment running and do not deploy this frontend over it.
   Leave the backend unset in previews unless using a separate test backend.
   Optional analytics variables are listed in [.env.example](./.env.example).
4. Deploy, then add your domain under **Settings → Domains** and copy Vercel's
   exact DNS records to your DNS provider. Redeploy if environment values change.
5. Check home, tutorial, app switching, a complete round, results, sharing, and
   privacy on the deployed URL before switching traffic. Test server saves and
   deletion only against an intentionally selected backend. A passing frontend
   build does not prove that the old Sites API accepts the new app packs.

See [Vercel's build settings](https://vercel.com/docs/builds/configure-a-build) and
[custom-domain guide](https://vercel.com/docs/domains/set-up-custom-domain).

Changing domains starts new browser-local preferences, scores, curriculum, and
anonymous identity. Existing database records are retained, but are not linked
automatically to the new origin. Use the old site's privacy page to delete data
associated with that browser's old identity.

The pre-migration code is preserved at commit `5bfad6b`. `db/schema.ts`,
`drizzle/`, and `.openai/hosting.json` describe the retained Sites backend; Vercel
does not apply those migrations. Moving that database off Sites is a separate task.

GPT Sites also supports custom domains; moving to Vercel is not required solely
to use a domain you bought. In either case, connect the domain with the hosting
provider's exact DNS records. This repository does not register a domain or
change its DNS, and `.openai/hosting.json` does not prove domain ownership.

## Built with

Next.js, React, a perspective DOM/CSS action highway, and procedural Web Audio.
Three.js/React Three Fiber scene code is retained; active gameplay does not
require WebGL. The legacy cloud backend uses Cloudflare D1. Optional typed
PostHog analytics stays disabled unless production credentials are configured.

## Project docs

- [Hackathon product spec](./PROJECT_SPEC.md)
- [Design and visual identity](./DESIGN_IDENTITY.md)
- [Production launch plan](./PRODUCTION_LAUNCH_PLAN.md)
- [Twitter launch copy and demo](./LAUNCH.md)
- [Analytics contract and dashboard setup](./ANALYTICS.md)
- [Security and privacy controls](./SECURITY.md)
