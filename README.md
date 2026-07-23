# Shortcut Hero

Learn keyboard shortcuts through a Guitar Hero–style highway game — progressive tempo, speed-round interludes, Linear / Slack / Spotify tracks, and a Cloudflare D1 world leaderboard.

## Quick start (play locally)

```bash
nvm use 22          # Node >= 22.13 required
npm install
npm run db:local:setup
npm run dev
```

| URL | What it is |
|-----|------------|
| [http://localhost:3000](http://localhost:3000) | Title screen |
| [http://localhost:3000/play](http://localhost:3000/play) | Full game |
| [http://localhost:3000/embed](http://localhost:3000/embed) | Compact embed (iframes / side panels) |

Production: [https://shortcuthero.app](https://shortcuthero.app) · embed: [https://shortcuthero.app/embed](https://shortcuthero.app/embed)

## Codex plugin — how it works (read this)

**Important:** putting the plugin folder in this repo does **not** automatically put Shortcut Hero in the public Codex / ChatGPT Plugins Directory for everyone.

There are three different levels of “available”:

| Level | Who can use it | What you do |
|-------|----------------|-------------|
| **1. You (local)** | Only your machine | Install from this repo’s marketplace (below) |
| **2. Your ChatGPT workspace** | Teammates you share with | Install locally, then **Share** from Plugins in the ChatGPT desktop app |
| **3. Everyone (public directory)** | Anyone on Codex / ChatGPT Work | Submit through OpenAI’s **plugin submission portal**, pass review, then **Publish** |

### Level 1 — install for yourself (minutes)

1. Clone this repo and keep it on disk.
2. In a terminal at the repo root:
   ```bash
   codex plugin marketplace add ./
   ```
   Or open the ChatGPT desktop app → **Codex** (or Work) → **Plugins** and add this repo as a marketplace source (it reads `.agents/plugins/marketplace.json`).
3. Restart the ChatGPT desktop app.
4. Plugins Directory → source **Shortcut Hero (repo)** → install **Shortcut Hero**.
5. Start a **new** chat and say: `open Shortcut Hero` or `give me a speed round`.

The skill returns a URL (`/embed` or the full site). Open it in a browser tab or iframe.

Plugin files live in [`plugins/shortcut-hero/`](./plugins/shortcut-hero/). Full walkthrough: [`docs/EMBED_AND_CODEX_PLUGIN.md`](./docs/EMBED_AND_CODEX_PLUGIN.md).

### Level 2 — share with your workspace

After Level 1:

1. ChatGPT desktop → Plugins → **Created by you** → Shortcut Hero → **Share**.
2. Invite workspace members / groups.

This stays inside your org. It is **not** the public directory.

### Level 3 — publish for everyone

1. Complete OpenAI **identity verification** for the publisher name you will use.
2. Open the [plugin submission portal](https://platform.openai.com/plugins).
3. Submit this skills-only plugin (manifest + skill). Use listing copy from [`docs/EMBED_AND_CODEX_PLUGIN.md`](./docs/EMBED_AND_CODEX_PLUGIN.md).
4. Wait for review. When approved, click **Publish** in the portal.

Until step 4 succeeds, the plugin will **not** appear for the general public.

## Scripts

| Command | Purpose |
|---------|---------|
| `npm run dev` | Local vinext / Workers / D1 |
| `npm run db:local:setup` | Apply D1 migrations locally |
| `npm run check` | Lint + typecheck + tests |
| `npm run test:unit` | Unit tests |

## Documentation

Full docs: [`docs/`](./docs/README.md)

| Topic | Doc |
|-------|-----|
| Embed URL + Codex install / publish | [EMBED_AND_CODEX_PLUGIN.md](./docs/EMBED_AND_CODEX_PLUGIN.md) |
| Architecture | [ARCHITECTURE.md](./docs/ARCHITECTURE.md) |
| Local development | [LOCAL_DEVELOPMENT.md](./docs/LOCAL_DEVELOPMENT.md) |
| Database | [DATABASE.md](./docs/DATABASE.md) |
| Roadmap | [EXTENSION_PHASED_PLAN.md](./docs/EXTENSION_PHASED_PLAN.md) |
| Contributing (`michael` review) | [CONTRIBUTING.md](./docs/CONTRIBUTING.md) |

## Branch note

Active overhaul work is on **`michael`**. Merge to `main` only after teammate review.
