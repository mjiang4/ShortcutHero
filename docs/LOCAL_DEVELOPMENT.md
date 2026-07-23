# Local development

## Prerequisites

- **Node.js ≥ 22.13** (see `package.json` `engines`)
- npm
- macOS recommended for keyboard parity with the product target
- Chrome recommended for WebGL + Web Audio

## Install

```bash
npm install
```

## Local D1 setup

D1 is required for round persistence and the international leaderboard. Apply migrations into the **local** Wrangler/Miniflare state:

```bash
npm run db:local:setup
```

This runs:

```bash
wrangler d1 migrations apply DB --local --persist-to=.wrangler/state --config=wrangler.local.jsonc
```

Config sources:

- `.openai/hosting.json` — binding name `DB`
- `wrangler.local.jsonc` — local database id + `migrations_dir: drizzle`
- `vite.config.ts` — Cloudflare Vite plugin injects the same binding for `vinext dev`

Generate new SQL after schema edits:

```bash
npm run db:generate
```

Then re-run `npm run db:local:setup`.

## Dev server

```bash
npm run dev
```

Opens the vinext/Vite dev server (typically `http://localhost:3000`). Wrangler logs write under `.wrangler/` (`WRANGLER_LOG_PATH`).

## Common scripts

| Command | Purpose |
|---|---|
| `npm run build` | Production vinext build |
| `npm run start` | Serve the built app |
| `npm run lint` | ESLint |
| `npm run typecheck` | TypeScript |
| `npm test` | Unit + render smoke |
| `npm run check` | lint + typecheck + test |

## Environment

- Prefer ignored `.env*` for secrets; do not commit credentials.
- Local D1 uses a placeholder database id in `wrangler.local.jsonc` / Vite config (`00000000-0000-4000-8000-000000000000`).
- Application code reads D1 via `cloudflare:workers` (`db/index.ts` → `getD1Database()`).

## Common failures

| Symptom | Likely cause | Fix |
|---|---|---|
| `DatabaseUnavailableError` / 503 on APIs | Binding missing or migrations not applied | Restart `npm run dev` after `db:local:setup` |
| Migration apply fails | Stale journal / wrong config | Confirm `--config=wrangler.local.jsonc` and `drizzle/` files |
| WebGL black screen | GPU / browser block | Try Chrome; check console for context loss |
| No audio | Autoplay policy | Unlock audio from a click/key handler (engine already requires gesture) |
| HMR flaky in sandboxes | FSEvents blocked | Vite polling is enabled when `CODEX_SANDBOX=seatbelt` |

## Branch note

Develop and push review work on **`michael`**. See [CONTRIBUTING.md](./CONTRIBUTING.md).
