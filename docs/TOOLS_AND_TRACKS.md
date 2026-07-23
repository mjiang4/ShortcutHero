# Tools and tracks

Shortcut Hero teaches **tool shortcut packs** (tracks). Tracks are data modules consumed by the shared engine.

## Layout

| File | Role |
|---|---|
| `app/tools/types.ts` | `AvailableToolId`, `ShortcutTrack`, `deckForMode` |
| `app/tools/registry.ts` | Catalog + `getToolTrack` |
| `app/tools/linear.ts` | Linear decks + `LINEAR_TRACK` |
| `app/tools/slack.ts` | Slack decks + `SLACK_TRACK` |
| `app/tools/spotify.ts` | Spotify decks + `SPOTIFY_TRACK` |
| `app/tools/themes.ts` | `TOOL_THEMES` accent tokens |
| `app/tools/index.ts` | Re-exports |

## Track shape

```ts
interface ShortcutTrack {
  id: AvailableToolId;
  name: string;
  editionLabel: string;
  platform: "macOS";
  description: string;
  decks: Record<Difficulty, readonly ShortcutDefinition[]>;
  showcase: readonly ShortcutDefinition[];
}
```

Each `ShortcutDefinition` uses engine input kinds: `single`, `sequence`, `chord`.

## Authorship guide

Mirror `linear.ts`:

1. Private helpers `single` / `sequence` / `shiftChord`.
2. Export `*_EASY_SHORTCUTS`, `*_MEDIUM_SHORTCUTS`, `*_HARD_SHORTCUTS`.
3. Export combined list + `get*ShortcutById`.
4. Build a **showcase** that alternates easy / medium / hard for demos.
5. Export `*_TRACK`.
6. Register in `registry.ts` and extend `AvailableToolId` when shipping.
7. Add a `TOOL_THEMES` entry.

### Suggested deck sizes

| Difficulty | Count | Input |
|---|---:|---|
| Easy | 8–10 | Single letter |
| Medium | 6–8 | Two-key sequence |
| Hard | 5–6 | Shift chord |

Prefer real product actions. Where macOS uses Cmd+Shift+Letter, hard mode trains the **letter + Shift** chord that the engine supports; document the mapping in comments.

### Content rules

- Stable `id`s (kebab-case) — mastery rows key on them.
- Clear `action` strings optimized for ~1s reads.
- Optional `context` (“Message selected”, “Issue selected”).
- Platform is macOS-first; do not invent Windows variants in the same deck yet.

## Themes

`TOOL_THEMES` tokens:

| Token | Use |
|---|---|
| `accent` | Primary tool color |
| `accentSoft` | Highlights / soft fills |
| `highway` | Rail / cue energy |
| `bloom` | Post-process tint |
| `label` | Human tool name |

Current kits:

- **Linear** — violet `#7C6CFF` / soft `#A897FF` / gold highway `#F4A261`
- **Slack** — aubergine `#4A154B` / aqua `#36C5F0`
- **Spotify** — green `#1DB954` / bright `#1ED760`

Apply via CSS variables and/or scene color overrides (`data-tool="spotify"`). Always keep Golden Signal night/paper readability.

## Important product constraint

Tracks are **not** live integrations. No OAuth, no mutating Linear/Slack/Spotify. Extension phase **E5** covers assisted “practice what you use” later.

## Registry checklist for a new tool

- [ ] Deck module + showcase
- [ ] Theme tokens
- [ ] `AvailableToolId` + catalog entry `status: "available"`
- [ ] Settings tool picker wiring
- [ ] Docs update (this file + PRODUCT_OVERVIEW)
- [ ] Optional: fixture tests that deck sizes and ids are unique
