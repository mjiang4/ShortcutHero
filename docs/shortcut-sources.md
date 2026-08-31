# Shortcut sources and catalog updates

Reference snapshot: **2026-08-30**. These are documented defaults, not evidence that every shortcut has been exercised in the installed app. Context, product surface, keyboard layout, app version, and user remapping matter.

**Playable now:** the browser-safe macOS subset of Linear. The other products below are research references, not released game packs. Do not register a pack until its bindings, contexts, and browser safety are verified.

## Updating the catalog

The game's data lives in `app/tools/catalog-data.json`. It is a versioned JSON snapshot, not a remote database or an automatic scraper. The game and import command share `validateCatalog`; no new service is required.

```sh
# Validate a complete catalog or one-app snapshot; no files change.
npm run catalog:import -- path/to/catalog.json

# Replace the included app snapshots; other apps remain untouched.
npm run catalog:import -- path/to/catalog.json --write
```

Review the diff, run the existing tests, then publish explicitly. Keep command IDs stable so existing lesson history still refers to the same action. Importing a snapshot replaces that app's command list; it does not delete the player's progress.

Minimal shape:

```json
{
  "schemaVersion": 1,
  "apps": {
    "example": {
      "name": "Example",
      "description": "A reviewed shortcut pack.",
      "surface": "desktop / web",
      "coverage": "Partial, source-reviewed defaults.",
      "releasedPlatforms": [],
      "shortcuts": [
        {
          "id": "open-inbox",
          "action": "Open inbox",
          "source": {
            "url": "https://example.com/official-shortcuts",
            "checkedAt": "2026-08-30",
            "verification": "current"
          },
          "bindings": {
            "macos": { "steps": [["KeyG"], ["KeyI"]], "display": "G → I" },
            "windows": null
          }
        }
      ]
    }
  }
}
```

This is a format example, not a verified Example-app binding. A stroke such as `["Shift", "KeyE"]` means simultaneous keys; separate strokes mean a sequence. Explicit `null` means the platform binding is not supplied. The loader does **not** infer Windows bindings from Mac bindings.

The currently playable subset is one unmodified letter, two successive unmodified letters, or Shift + one letter. Command/Control/Alt, navigation/system keys, longer sequences, and other unsupported inputs can be recorded but do not enter the game. Counts come from the resulting app/platform deck. `releasedPlatforms` is a review gate, not proof of compatibility; only Mac packs are currently exposed in the launcher.

### Why there is no “download every shortcut” connector

- **Linear:** the public GraphQL API describes workspace entities and operations, not a documented complete UI keymap. Documentation and the in-app shortcut panel remain sources for a reviewed snapshot. See [Linear's API](https://linear.app/developers/graphql), [SDK schema](https://github.com/linear/linear/blob/master/packages/sdk/src/schema.graphql), and [export documentation](https://linear.app/docs/exporting-data).
- **Notion:** its API and MCP tools operate on workspace content; no complete default-keymap endpoint was found in the reviewed references. See [API introduction](https://developers.notion.com/reference/intro) and [MCP tools](https://developers.notion.com/guides/mcp/mcp-supported-tools).
- **Cursor:** user `keybindings.json` is an override file, not all defaults. A future importer must preserve conditions, removed bindings, arguments, and ordering, and merge against a versioned default snapshot. The underlying editor documents its default-keybinding JSON command; verify Cursor's installed output before treating it as an export. See [Cursor migration](https://cursor.com/help/getting-started/migrate-vscode) and [VS Code keybindings](https://code.visualstudio.com/docs/configure/keybindings).
- **Claude Code:** `~/.claude/keybindings.json` contains context-specific overrides, including null/unbound actions. It is useful input for a future importer, not a complete catalog by itself. See [keybinding configuration](https://code.claude.com/docs/en/keybindings).
- **ChatGPT / Codex:** the reviewed docs provide a desktop shortcut reference and configurable CLI bindings, but no documented complete keymap-feed API. MCP connectors expose callable tools, not automatically UI keyboard shortcuts. See [desktop settings](https://learn.chatgpt.com/docs/reference/settings#keyboard-shortcuts), [config reference](https://learn.chatgpt.com/docs/config-file/config-reference), [app-server API](https://learn.chatgpt.com/docs/app-server#api-overview), and [MCP connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp).

No live connector, account authorization, override-file reader, or arbitrary command execution is implemented here. A future importer can output this same catalog format when a real source exists.

## Linear — current game catalog

Sources below are primary. The checked catalog retains the original 24 actions and adds 11 documented browser-safe actions. **35 playable Mac bindings:** 14 singles, 13 sequences, 8 Shift chords. One additional reserved-modifier action is stored as reference-only. Windows letter bindings have not been individually verified and are deliberately absent.

| Input | Action / required context | Primary source |
|---|---|---|
| C; V | New issue; full-screen new issue; outside text editing | [Creating issues](https://linear.app/docs/creating-issues) |
| A; I | Assign a user; assign to yourself; issue selected | [Assigning issues](https://linear.app/docs/assigning-issues) |
| L | Add a label; issue selected | [Labels](https://linear.app/docs/labels) |
| P | Change priority; issue selected | [Priority](https://linear.app/docs/priority) |
| S | Change status; issue selected | [Board layout](https://linear.app/docs/board-layout) |
| F | Filter | [Filters](https://linear.app/docs/filters) |
| X; J; K | Select; next item; previous item | [Selecting issues](https://linear.app/docs/select-issues) |
| H; U | Snooze; toggle read state; inbox notification selected | [Inbox](https://linear.app/docs/inbox) |
| T | Toggle a board swimlane | [Board layout](https://linear.app/docs/board-layout) |
| G → I | Open Inbox | [Inbox](https://linear.app/docs/inbox) |
| G → M | Open My issues | [My issues](https://linear.app/docs/my-issues) |
| G → B; G → A | Backlog; active issues; current team | [Team pages](https://linear.app/docs/default-team-pages) |
| G → X | Team archive | [Delete and archive](https://linear.app/docs/delete-archive-issues) |
| G → T | Triage; enabled for the team | [Triage](https://linear.app/docs/triage) |
| G → V; O → C | Current cycle; open a cycle — historical reference | [2019 cycle/navigation changelog](https://linear.app/changelog/2019-09-30-figma-integration) |
| O → F | Open a favorite | [Favorites](https://linear.app/docs/favorites) |
| O → P | Open a project | [Project notifications](https://linear.app/docs/project-notifications) |
| O → T | Open a team | [Teams](https://linear.app/docs/teams) |
| O → L | Open a label view | [Label views](https://linear.app/docs/label-views) |
| O → I | Find an issue | [Search](https://linear.app/docs/search) |
| Shift + E | Set estimate; issue selected | [Estimates](https://linear.app/docs/estimates) |
| Shift + P | Add to project; issue selected | [Projects](https://linear.app/docs/projects) |
| Shift + C | Add to cycle — historical reference | [2019 cycles changelog](https://linear.app/changelog/2019-07-04-cycles) |
| Shift + S | Toggle subscription; issue selected | [My issues](https://linear.app/docs/my-issues) |
| Shift + V | Display options | [Display options](https://linear.app/docs/display-options) |
| Shift + F | Clear last filter — historical reference | [Historical changelog](https://linear.app/changelog/page/11) |
| Shift + D | Set due date; issue selected | [Due dates](https://linear.app/docs/due-dates) |
| Shift + M | Set project milestone; issue selected | [Milestones](https://linear.app/docs/project-milestones) |
| Mac Control + R; Windows Control + Alt + R | New customer request; **reference-only**, reserved modifiers | [Customer requests](https://linear.app/docs/customer-requests) |

Audit limits: the selecting-issues page mentions J/K together; verify direction in the actual app before calling that a fresh runtime check. The four historical bindings are marked `historical` in the data and retained from the existing game, not silently presented as newly verified. The coverage is partial. Do not assume every navigation command works from every context, or promote old E/H entries without checking their current meaning.

## Notion — web and desktop reference

Primary source: [Notion keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts). In the table, **M** means the source's Command (Mac) / Control (Windows) pairing, and **O** means Option / Alt. Explicit exceptions are written out. Desktop-only actions do not imply equivalent browser behavior.

| Binding | Action / context |
|---|---|
| M + F | Search within the page |
| M + P or M + K | Workspace search / jump |
| M + L | Copy page URL |
| M + [ / ] | Back / forward |
| Mac Control + Shift + K / J; Windows Control + K / J | Previous / next database page in peek |
| M + Shift + L | Toggle appearance |
| M + Shift + U | Parent page |
| M + + / − | Zoom |
| M + N; M + Shift + N | Desktop: new page; new window |
| Mac Option + Shift + click | Desktop: open in another window; Windows equivalent not documented |
| M + click; M + T | Desktop: open in a tab; new tab |
| Enter; Shift + Enter | New block / line within block |
| M + Shift + M | Comment |
| M + B / I / U | Bold / italic / underline |
| M + Shift + S | Strikethrough |
| M + K; M + V on selected text | Add a link; link selected text to a copied URL |
| M + E | Inline code |
| Tab / Shift + Tab | Nest / unnest a block |
| M + D | Duplicate selected block; fill down in database context |
| M + R | Fill database selection right |
| O + drag | Duplicate by dragging |
| Esc; M + A | Select a block; expand selection |
| Arrows; Shift + Up / Down | Navigate selected blocks; extend selection |
| Shift + click | Select a range |
| Mac Command + Shift + click; Windows Alt + Shift + click | Add/remove individual blocks from selection |
| Backspace / Delete; Enter | Delete selection; edit or open selected block |
| M + / | Block actions; bulk edit selected database pages |
| M + Shift + arrows | Move a block |
| M + O + T | Expand/collapse toggles |
| M + Shift + H | Reuse last text/highlight color |
| M + Enter | Activate the selected block/toggle/link |
| Space | Selected image: full screen |
| Mac Command + Option + 0…9; Windows Control + Shift + 0…9 | Convert block: 0 text; 1–3 headings; 4 checkbox; 5 bullet; 6 numbered; 7 toggle; 8 code; 9 page |

Related typing syntax is a **separate future exercise type**, not a physical shortcut chord: inline `**bold**`, `*italic*`, backtick code, `~strikethrough~`; at block start, bullet markers followed by Space, `[]`, numbered/list markers, headings `#`–`###`, `>` toggles, quote marker, or `---`. `@`, `[[`, and `+` open mention/link/page actions; `@remind` creates reminders.

Documented slash-command families: `/text`, `/plain`, `/page`, `/bullet`, `/num`, `/todo`, `/toggle`, `/div`, `/quote`, `/h1`–`/h3`, `/#`–`/###`, `/link`, `/mention`, `/date`, `/reminder`, `/equation`, `/emoji`, `/image`, `/pdf`, `/book`, `/video`, `/audio`, `/code`, `/file`, `/embed`, `/duplicate`, `/moveto`, `/delete`, `/toc`, `/button`, `/template`, `/bread`, `/math`, `/latex`, `/turn`, and color names/default. OS emoji pickers (Mac Control + Command + Space; Windows Win + . or ;) are system shortcuts, not game inputs.

## Cursor — desktop editor reference

Primary sources: [Cursor shortcut reference](https://cursor.com/docs/reference/keyboard-shortcuts), [customization](https://cursor.com/help/customization/keyboard-shortcuts). **M = Command / Control; O = Option / Alt**, only for the source's paired defaults below. Context resolves repeated bindings.

| Binding | Action / context |
|---|---|
| M + I or M + L | Agent side panel |
| M + E | Agent layout |
| M + . | Mode picker |
| M + / | Cycle models |
| M + Shift + J | Cursor settings |
| M + Shift + Space | Voice |
| M + , | Editor settings |
| M + Shift + P | Command palette |
| M + R then M + S | Keyboard shortcut preferences |
| Enter | Chat: nudge / submit |
| **Control + Enter on both platforms** | Queue a message |
| M + Enter | Force send; accept edits; codebase search — context-specific |
| M + Shift + Backspace | Cancel generation / inline editing |
| M + Shift + L | Add selected code to chat |
| M + V; M + Shift + V | Paste with context; paste plain text |
| M + Backspace | Reject edits |
| Tab; Shift + Tab | Next message; cycle Agent modes |
| M + O + / | Toggle model |
| M + N or M + R | New chat |
| M + T | New chat tab |
| M + [ / ] | Previous / next chat |
| M + W | Close chat tab |
| Esc | Leave chat focus |
| M + K | Inline edit prompt; terminal prompt when terminal focused |
| M + Shift + K | Focus inline edit / send selection to edit |
| Enter | Submit inline edit |
| O + Enter | Quick question |
| M + L | Selected code into a new chat |
| M + M | Toggle file strategy in context picker |
| Tab; M + Right | Accept completion; accept next word |
| M + C then M + V / Shift + V | Copy code and paste with / without context |
| M + Enter; Esc | Terminal: run generated command; accept text |

`@` mentions and `/` commands are composer syntax. Do not flatten terminal/chat/editor contexts into one global mapping. User remappings and inherited VS Code shortcuts can add many more actions than Cursor's product-specific reference; this table is not a full installed-editor export.

## Claude Code — terminal reference

Primary sources: [interactive mode](https://code.claude.com/docs/en/interactive-mode), [keybindings](https://code.claude.com/docs/en/keybindings), [fullscreen](https://code.claude.com/docs/en/fullscreen), [terminal setup](https://code.claude.com/docs/en/terminal-config). Control means **Control**, including on macOS; Option/Alt often acts as Meta and can require terminal configuration.

| Binding | Action / context |
|---|---|
| Control + C | Interrupt / clear input |
| Control + D | Exit |
| Control + G | External prompt editor |
| Control + L | Redraw (not clear the entire transcript) |
| Control + O | Transcript |
| Control + R | History search |
| Control + B | Background a running task |
| Control + T | Task checklist |
| Control + S | Stash/restore prompt |
| Control + Z | Suspend on Unix |
| Esc | Interrupt / dismiss |
| Esc, Esc | Clear nonempty draft; rewind from an empty prompt |
| Up/Down or Control + P/N | History |
| Shift + Tab | Permission mode; some Windows non-VT terminals use Alt + M |
| Option/Alt + P; + T; + O | Model; thinking; fast mode |
| Control + A/E | Start/end of line |
| Control + K/U/W | Delete after cursor / before cursor / previous word |
| Control + Y; Option/Alt + Y | Yank; cycle yank |
| Option/Alt + B/F/D | Previous word / next word / delete next word |
| Control + _ or Control + Shift + − | Undo input edit |
| Control + V | Paste image; Mac iTerm2 also Command + V; Windows Alt + V |
| Control + X then Control + K | Stop agents |
| Control + X then Control + E | Open editor |
| Control + X then Enter | Submit queued prompt |
| Command + K | Redraw in the documented keybinding map |
| Tab; Esc; arrows | Completion: accept / dismiss / select |
| Y or Enter; N or Esc | Confirmation: yes / no |
| Space; Control + E | Confirmation: toggle item / explanation |
| Control + E; Q / Esc / Control + C | Classic transcript: expand / exit |
| Control + R; Tab / Esc; Enter; Control + C | Classic history search: next / accept / execute / cancel |
| Tab or Right; Shift + Tab or Left | Next / previous tab |
| Left/Right; Backspace/Delete; Down/Esc | Attachment: select / remove / leave |
| Left/Right; S | Model picker: effort / session-only setting |
| /; R; Enter/Space; Esc | Settings: search / retry / change / close |
| Space; I; F | Plugin picker: toggle / install / favorite |
| Control + J or backslash then Enter | Newline; Shift + Enter is terminal-dependent |

Fullscreen transcript has its own bindings: `/` search; `N` / `Shift+N` next/previous match; `J/K` or arrows scroll; `G/Shift+G` or Home/End to boundaries; `{/}` prompt jumps; Control + U/D half-page; Control + B/F or B/Space page; `[` export scrollback; V external editor; Control + O, Esc, or Q exit.

Optional Vim mode is a separate editor keymap, not part of this default terminal inventory. A custom keybindings file must retain context and explicit unbindings; its schema is not a promise that every terminal supports every physical chord.

## ChatGPT and Codex — desktop app reference

Primary source: [desktop commands](https://learn.chatgpt.com/docs/reference/commands) ([machine-readable documentation](https://learn.chatgpt.com/docs/reference/commands.md)). This reference distinguishes ChatGPT, Codex, and Work availability; it is **not** a complete ChatGPT-web keymap. The Windows column follows the documented table, not a blanket Command-to-Control conversion.

In this table, **C** = Codex only, **G** = ChatGPT only, **CW** = Codex/Work; unmarked rows are shared subject to feature availability. Slash-separated keys are alternatives unless labeled “then.”

| Action | macOS | Windows |
|---|---|---|
| Command menu | Command + Shift + P / Command + K | Control + Shift + P / Control + K |
| Settings | Command + , | Control + , |
| Keyboard shortcuts | Command + / | Control + / |
| Open folder (CW) | Command + O | Control + O |
| Back / forward | Command + [ / ]; mouse back/forward | Control + [ / ]; mouse back/forward |
| Increase font | Command + + / numpad + | Control + + / = / numpad + |
| Decrease font | Command + − / numpad − | Control + − / numpad − |
| Reset font | Command + 0 / numpad 0 | Control + 0 / numpad 0 |
| Sidebar | Command + B | Control + B |
| Bottom panel (C) | Command + J | Control + J |
| Terminal (C) | Control + backtick | Control + backtick |
| Clear terminal, terminal focused | Control + L / Command + K | Control + L / Control + K |
| Clear unread (C) | Shift + Esc | Shift + Esc |
| Undo | Command + Z | Control + Z |
| Redo | Command + Shift + Z | Control + Y / Control + Shift + Z |
| Close tab/window | Command + W | Control + W / Control + F4 |
| Full screen | Command + Control + F | F11 |
| Quit | Command + Q | Control + Q |
| New chat | Command + N / Command + Shift + O | Control + N / Control + Shift + O |
| Standalone chat (C) | Command + Option + O | Control + Alt + O |
| Quick chat (G) | Command + Option + N | Control + Alt + N |
| Temporary chat (G) | Command + Shift + N | Control + Shift + N |
| Archive | Command + Shift + A | Control + Shift + A |
| Mark unread | Command + Shift + U | Control + Shift + U |
| Pin/unpin | Command + Option + P | Control + Alt + P |
| Rename | Command + Option + R | Control + Alt + R |
| Side chat (C) | Command + Option + S | Control + Alt + S |
| Search chats | Unassigned | Unassigned |
| Find in chat | Command + F | Control + F |
| Next match | Command + G | Control + G |
| Previous match | Command + Shift + G | Shift + F3 |
| Previous chat tab | Control + Shift + Tab / Command + Shift + [ / Command + Option + Left | Control + Shift + Tab / Control + Shift + [ / Control + PageUp |
| Next chat tab | Control + Tab / Command + Shift + ] / Command + Option + Right | Control + Tab / Control + Shift + ] / Control + PageDown |
| Next needing attention (C) | Command + Option + A | Control + Alt + A |
| Recent chat 1–6 | Command + Option + 1–6 | Control + Alt + 1–6 |
| Chat tab 1–9 | Command + 1–9 | Control + 1–9 |
| Model picker | Control + Shift + M | Control + Shift + M |
| Project picker | Command + Option + Shift + O | Control + Alt + Shift + O |
| Voice | Control + Shift + V | Control + Shift + V |
| Dictation | Control + Shift + D | Control + Shift + D |
| Restore prompt, empty composer | Up | Up |
| Approve / decline, approval dialog | Enter / Esc | Enter / Esc |
| Mode 1–3 | Control + 1–3 | **Alt + 1–3** |
| Activity | Command + Option + U | Control + Alt + U |
| Configured environment action 1 | Command + Shift + D | **Win + Shift + D** |
| File search (C) | Command + P | Control + P |
| File tree (C) | Command + Shift + E | Control + Shift + E |
| Review tab (C) | Control + Shift + G | Control + Shift + G |
| Review panel (C) | Command + Option + B | Control + Alt + B |
| Browser tab | Command + T | Control + T |
| Browser panel | Command + Shift + B | Control + Shift + B |
| Address / line | Command + L | Control + L |
| Browser back / forward | Command + Left / Right | **Alt + Left / Right** |
| Browser reload | Command + R | Control + R |
| Browser reload, uncached | Command + Shift + R | Control + Shift + R |
| Copy browser URL | Command + Shift + C | Control + Shift + C |
| Browse/comment | Command + . | Control + . |
| Copy conversation path (C) | Command + Option + Shift + C | Not documented |
| Copy chat link | Command + Option + L | Control + Alt + L |
| Copy session ID | Command + Option + C | Control + Alt + C |
| Copy working directory (C) | Command + Shift + C | Control + Shift + C |
| Appshot | Left Command + Right Command together | Not documented |

The source lists some numbered actions as groups; this table preserves that rather than inventing separate command IDs. Browser, terminal, composer, and review contexts must remain distinct. Most entries conflict with browser/system controls and are reference-only for this game's current input engine.

### Codex CLI — separate terminal surface

Sources: [interactive CLI shortcuts](https://learn.chatgpt.com/docs/developer-commands?surface=cli#interactive-shortcuts), [external prompt editor](https://learn.chatgpt.com/docs/cli-customization#prompt-editor), [configuration](https://learn.chatgpt.com/docs/config-file/config-reference).

| Binding | Context / action |
|---|---|
| Up / Down | Prompt history |
| Control + R | Search history |
| Enter / Esc | Accept / cancel history search |
| Control + O | Copy completed response |
| Tab | Queue while a turn is active |
| Enter | Steer an active turn |
| Esc, Esc | Empty composer: edit a previous prompt / fork |
| Control + C | Exit |
| Control + L | Clear view while idle |
| Alt + R | Raw scrollback |
| Space | Select in plugin picker |
| Control + G | External prompt editor |

`@`, `/`, and leading `!` are composer syntax, not keyboard chords. CLI `/keymap` can customize `tui.keymap.<context>.<action>`; overrides are not a complete desktop or web export. The reviewed CLI reference does not provide separate complete Mac/Windows tables, so no substituted OS bindings are asserted here.

### ChatGPT web gap

The reviewed primary reference covers desktop app shortcuts and CLI behavior, not a comprehensive, verified ChatGPT-web inventory. Do **not** use the desktop table as a web shortcut pack. Capture the web app's current in-product shortcut help and applicable official web documentation before adding that surface. This gap is intentional, not a claim that ChatGPT web has no shortcuts.

## Release checks for any new pack

1. Verify action, context, surface, and each OS binding against a primary source and the actual app.
2. Record unresolved and historical entries honestly; never label source review as runtime verification.
3. Import/validate the snapshot and inspect browser-safe eligible counts.
4. Exercise the pack in the existing game and test supported browsers/platforms before release.
5. Keep content data separate from learning priority: observed player misses/unseen history choose lessons; the catalog supplies bindings.
