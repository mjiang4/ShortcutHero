---
name: shortcut-hero
description: >-
  Open Shortcut Hero (keyboard-shortcut rhythm game) in the browser or via the
  /embed URL. Use when the user wants a break, is waiting on a long agent run,
  asks to practice Linear/Slack/Spotify shortcuts, or says "shortcut hero".
---

# Shortcut Hero

Help the user open **Shortcut Hero** — a Guitar Hero–style game for learning app keyboard shortcuts.

This skill does **not** run the game inside Codex. It returns a URL to open in a browser, iframe, or side panel.

## When to use

- User is waiting on a long agent / build / review
- User asks for Shortcut Hero, a shortcut trainer, or a quick typing/shortcut break
- User names Linear, Slack, or Spotify shortcuts practice

## Default action

Give a ready-to-open URL. Prefer **`/embed`** for compact panels; use the full site for a normal tab.

### Production

- Full site: `https://shortcuthero.app/`
- Embed: `https://shortcuthero.app/embed`
- Play: `https://shortcuthero.app/play`

### Local development

- Full site: `http://localhost:3000/`
- Embed: `http://localhost:3000/embed`
- Play: `http://localhost:3000/play`

If the user is in the ShortcutHero repo and `npm run dev` is likely running, prefer localhost. Otherwise use production.

## Query parameters

All optional.

| Param | Values | Default |
|-------|--------|---------|
| `tool` | `linear`, `slack`, `spotify` | `linear` |
| `difficulty` | `easy`, `medium`, `hard` | `easy` |
| `guidance` | `novice`, `pro` | `novice` |
| `pace` | `relaxed`, `standard`, `turbo` | `standard` |
| `session` | `30`, `45`, `60` | embed: `30` |
| `sound` | `on`, `off` | `on` |
| `effects` | `full`, `system`, `reduced` | embed: `system` |
| `mode` | `highway`, `speed_round` | `highway` |

## Recommended links

Quick 30s Linear highway:

```text
https://shortcuthero.app/embed?tool=linear&session=30&mode=highway
```

Speed round only:

```text
https://shortcuthero.app/embed?tool=linear&mode=speed_round
```

Slack, relaxed:

```text
https://shortcuthero.app/embed?tool=slack&pace=relaxed&session=30
```

Full title screen:

```text
https://shortcuthero.app/
```

## Response style

1. One short sentence describing what you are opening.
2. Put the exact URL on its own line (or as a markdown link).
3. Optionally note 1–2 params and how to change them.
4. Do not invent other domains, APIs, or fake scores.
5. Do not claim the plugin is installed for all Codex users worldwide — local/workspace install and public directory publish are separate (see repo `docs/EMBED_AND_CODEX_PLUGIN.md`).

## Limits

- Available tracks today: Linear, Slack, Spotify only.
- No server-side Slack/Spotify API actions from this skill.
