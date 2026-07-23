# Embed route & Codex plugin

This doc is the source of truth for:

1. The `/embed` play URL
2. How to install the Shortcut Hero Codex plugin **for yourself**
3. How to share it with a **workspace**
4. How to submit it so it can appear for **everyone** in the public Plugins Directory

If you only read one section, read **[Will this show up for everyone?](#will-this-show-up-for-everyone)**.

---

## Will this show up for everyone?

**No — not automatically.**

Shipping `plugins/shortcut-hero/` in this GitHub repo does **not** list Shortcut Hero in the public Codex / ChatGPT Plugins Directory.

| Distribution | Scope | Mechanism |
|--------------|-------|-----------|
| Local marketplace | You | `.agents/plugins/marketplace.json` + install on your machine |
| Workspace share | People you invite | ChatGPT desktop → Plugins → Share |
| Public directory | Everyone | [platform.openai.com/plugins](https://platform.openai.com/plugins) submission → review → **Publish** |

Official build docs: [Build plugins](https://developers.openai.com/codex/plugins/build).

---

## `/embed`

Compact play surface for iframes and side panels.

### URLs

| Environment | Embed | Full site |
|-------------|-------|-----------|
| Local | `http://localhost:3000/embed` | `http://localhost:3000/` |
| Production | `https://shortcuthero.app/embed` | `https://shortcuthero.app/` |

### Query parameters

Same launch params as `/play`:

| Param | Values | Embed default if omitted |
|-------|--------|--------------------------|
| `tool` | `linear`, `slack`, `spotify` | `linear` |
| `difficulty` | `easy`, `medium`, `hard` | `easy` |
| `guidance` | `novice`, `pro` | `novice` |
| `pace` | `relaxed`, `standard`, `turbo` | `standard` |
| `session` | `30`, `45`, `60` | **`30`** |
| `sound` | `on`, `off` | `on` |
| `effects` | `full`, `system`, `reduced` | **`system`** |
| `mode` | `highway`, `speed_round` | `highway` |

Examples:

```text
https://shortcuthero.app/embed?tool=linear&session=30&mode=highway
https://shortcuthero.app/embed?tool=slack&mode=speed_round
http://localhost:3000/embed?tool=spotify&pace=relaxed
```

On `/embed`, **Restart** reloads the same URL (stays inside the iframe). It does not navigate to the title screen.

---

## Plugin package layout

```text
plugins/shortcut-hero/
  .codex-plugin/plugin.json    # required manifest
  skills/shortcut-hero/SKILL.md

.agents/plugins/marketplace.json   # repo marketplace pointing at the plugin
```

| File | Role |
|------|------|
| `.codex-plugin/plugin.json` | Plugin identity + skill path + directory listing metadata |
| `skills/shortcut-hero/SKILL.md` | Teaches Codex when/how to open Shortcut Hero URLs |
| `.agents/plugins/marketplace.json` | Lets Codex discover the plugin from this repo |

This is a **skills-only** plugin (no MCP server required for v0.1). Codex returns a URL; the game runs in the browser.

---

## Level 1 — install for yourself

### Option A — Codex CLI

From the **ShortcutHero repo root**:

```bash
codex plugin marketplace add ./
```

Then restart the ChatGPT desktop app (Codex / Work), open **Plugins**, pick marketplace **Shortcut Hero (repo)**, install **Shortcut Hero**.

### Option B — ChatGPT desktop UI

1. Open **ChatGPT desktop** → switch to **Codex** or **Work**.
2. Open **Plugins**.
3. Add / select a marketplace that points at this repository (the app reads `.agents/plugins/marketplace.json` when the repo is a marketplace root).
4. Install **Shortcut Hero**.
5. Start a **new** chat (required so the skill loads).
6. Try:
   - `Open Shortcut Hero`
   - `Give me a Linear speed round while I wait`
   - `Embed Spotify shortcuts for 30 seconds`

### Verify

You should get a concrete URL (production or localhost). Opening it should load the game.

---

## Level 2 — share with your ChatGPT workspace

This is **not** public.

1. Complete Level 1 on your machine.
2. ChatGPT desktop → **Plugins** → **Created by you** → **Shortcut Hero**.
3. Click **Share** and invite workspace members or groups.
4. They install from **Shared with you**.

Workspace admins can disable sharing via managed requirements (`features.plugin_sharing = false`).

---

## Level 3 — publish for everyone (public Plugins Directory)

Use this only when you want the plugin discoverable by strangers in Codex / ChatGPT Work.

### Prerequisites

1. **Identity verification** in the [OpenAI Platform Dashboard](https://platform.openai.com/) for the publisher name you will list under.
2. Production game live at `https://shortcuthero.app` (and `/embed` working).
3. Public **website**, **privacy policy**, and **terms** URLs ready (required for directory listings). Point them at your live site pages once they exist.
4. Plugin folder ready: `plugins/shortcut-hero/` (manifest + skill).

### Submit

1. Open the [plugin submission portal](https://platform.openai.com/plugins).
2. Create / submit a **skills-only** plugin using this package.
3. Fill listing fields (copy/paste helpers below).
4. Provide test prompts (positive + negative) as the portal requests.
5. Submit for review.

### After approval

OpenAI approval alone is not enough. In the portal, click **Publish**. Only then can the plugin appear in the universal directory. Enhanced homepage placement is separately curated by OpenAI.

### Suggested listing copy

**Display name:** Shortcut Hero

**Short description:** Launch a keyboard-shortcut rhythm game while you wait on long agent runs.

**Long description:** Shortcut Hero is a Guitar Hero–style trainer for Linear, Slack, and Spotify shortcuts. This plugin teaches Codex to open the live game (full site or compact `/embed` URL) with the right track, pace, and mode so you can practice while agents work.

**Starter prompts:**

- Open Shortcut Hero in embed mode for a 30 second Linear run
- Give me a Slack speed round
- Open Spotify Shortcut Hero on relaxed pace

**Positive tests (examples):**

1. User: “Open Shortcut Hero” → agent returns `https://shortcuthero.app/embed?...` or `/`
2. User: “Speed round for Slack” → URL includes `tool=slack` and `mode=speed_round`
3. User: “Local Shortcut Hero embed” (while developing) → `http://localhost:3000/embed...`
4. User: “Relaxed Spotify practice 30s” → `tool=spotify`, `pace=relaxed`, `session=30`
5. User: “What does this plugin do?” → explains it opens Shortcut Hero URLs; does not invent scores

**Negative tests (examples):**

1. User: “Delete my production database” → plugin is not used; no game URL as a substitute for the request
2. User: “Post my score to Slack for me via API” → explains the plugin only opens the web game; no Slack API
3. User: “Give me a Notion track” → notes Notion is not available yet; offers Linear/Slack/Spotify

---

## Maintaining the plugin

When you change skill behaviour:

1. Edit `plugins/shortcut-hero/skills/shortcut-hero/SKILL.md` and/or `.codex-plugin/plugin.json`.
2. Bump `version` in `plugin.json`.
3. Reinstall / refresh the local plugin (restart ChatGPT desktop if needed).
4. If already submitted publicly, update via the submission portal per OpenAI’s maintain-app / plugin docs.

---

## Related

- Root [README](../README.md) — short install summary
- Plugin skill: [`plugins/shortcut-hero/skills/shortcut-hero/SKILL.md`](../plugins/shortcut-hero/skills/shortcut-hero/SKILL.md)
- Manifest: [`plugins/shortcut-hero/.codex-plugin/plugin.json`](../plugins/shortcut-hero/.codex-plugin/plugin.json)
- OpenAI: [Build plugins](https://developers.openai.com/codex/plugins/build) · [Plugins overview](https://developers.openai.com/codex/plugins)
