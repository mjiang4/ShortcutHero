# Shortcut Hero

Learn keyboard shortcuts through a Guitar Hero–style highway game — with progressive tempo, speed-round interludes, multi-tool tracks (Linear, Slack, Spotify), and a Cloudflare D1 world leaderboard.

## Quick start

```bash
nvm use 22          # Node >= 22.13 required
npm install
npm run db:local:setup
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local vinext / Workers / D1 |
| `npm run db:local:setup` | Apply D1 migrations locally |
| `npm run check` | Lint + typecheck + tests |
| `npm run test:unit` | Unit tests |

## Documentation

Full enterprise docs live in [`docs/`](./docs/README.md):

- [Architecture](./docs/ARCHITECTURE.md)
- [Database](./docs/DATABASE.md)
- [Local development](./docs/LOCAL_DEVELOPMENT.md)
- [Extension phased plan](./docs/EXTENSION_PHASED_PLAN.md)
- [Embed & Codex plugin](./docs/EMBED_AND_CODEX_PLUGIN.md)
- [Contributing](./docs/CONTRIBUTING.md) (`michael` branch review workflow)

## Branch note

Active development for this overhaul is on **`michael`**. Merge to `main` only after teammate review.
