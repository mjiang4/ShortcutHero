# Embed & Codex plugin

## `/embed`

Compact play surface for iframes and side panels.

- URL: `/embed?tool=linear&session=30&mode=highway`
- Same launch params as `/play` (`tool`, `difficulty`, `guidance`, `pace`, `session`, `sound`, `effects`, `mode`)
- Defaults to a **30s** session and `effects=system` when those params are omitted
- `mode=speed_round` launches the mini-game only
- **Restart** reloads the embed URL (does not leave the frame for the title screen)

Full site chrome remains at `/` and `/play`.

## Codex plugin

Plugin package: [`plugins/shortcut-hero/`](../plugins/shortcut-hero/)

| File | Role |
|------|------|
| `.codex-plugin/plugin.json` | Manifest |
| `skills/shortcut-hero/SKILL.md` | Opens embed / site URLs with the right query params |

Repo marketplace entry: [`.agents/plugins/marketplace.json`](../.agents/plugins/marketplace.json)

### Install locally (Codex / ChatGPT desktop)

1. Open this repo (or add the marketplace via `codex plugin marketplace add ./` from the repo root).
2. Restart the ChatGPT desktop app / Codex.
3. Open **Plugins**, choose the **Shortcut Hero (repo)** marketplace source, install **Shortcut Hero**.
4. In a new chat, ask to “open Shortcut Hero” or “give me a speed round while I wait”.

The skill returns a URL — open it in a browser tab or iframe. No MCP server is required for v0.1.
