---
name: shortcut-hero
description: >-
  Open Shortcut Hero (keyboard-shortcut rhythm game) in the browser or via the
  /embed URL. Use when the user wants a break, is waiting on a long agent run,
  asks to practice Linear/Slack/Spotify shortcuts, or says "shortcut hero".
---

# Shortcut Hero

Help the user open **Shortcut Hero** — a Guitar Hero–style game for learning app keyboard shortcuts.

## Default action

When the user wants to play, give them a ready-to-open URL. Prefer the **embed** surface for side panels / iframes; use the full site for a normal browser tab.

### Production base

- Full site: `https://shortcuthero.app/`
- Embed: `https://shortcuthero.app/embed`
- Play (full chrome): `https://shortcuthero.app/play`

### Local development

- Full site: `http://localhost:3000/`
- Embed: `http://localhost:3000/embed`
- Play: `http://localhost:3000/play`

If the user is working in this repo and `npm run dev` is likely running, prefer localhost. Otherwise use production.

## Query parameters

All optional. Omit anything you do not need.

| Param | Values | Default |
|-------|--------|---------|
| `tool` | `linear`, `slack`, `spotify` | `linear` |
| `difficulty` | `easy`, `medium`, `hard` | `easy` |
| `guidance` | `novice`, `pro` | `novice` |
| `pace` | `relaxed`, `standard`, `turbo` | `standard` |
| `session` | `30`, `45`, `60` | embed: `30`; play: `45` |
| `sound` | `on`, `off` | `on` |
| `effects` | `full`, `system`, `reduced` | embed: `system` |
| `mode` | `highway`, `speed_round` | `highway` |

## Recommended links

**Quick break (30s highway, Linear):**

```text
https://shortcuthero.app/embed?tool=linear&session=30&mode=highway
```

**Speed round only:**

```text
https://shortcuthero.app/embed?tool=linear&mode=speed_round
```

**Slack track, relaxed pace:**

```text
https://shortcuthero.app/embed?tool=slack&pace=relaxed&session=30
```

**Full site title screen:**

```text
https://shortcuthero.app/
```

## Response style

1. Open with one short sentence (what you are launching).
2. Give the exact URL on its own line (or as a markdown link).
3. Optionally mention 1–2 params you chose and how to change them.
4. Do not invent other domains or API keys.
5. Do not claim scores were submitted unless the user played and told you.

## Embedding tip

`/embed` is designed for iframes and side panels. On that route, **Home/Restart** reloads the embed URL instead of navigating to the title screen.
