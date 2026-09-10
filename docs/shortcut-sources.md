# Shortcut sources and catalog updates

Reference snapshot: the initial Linear catalog and research-only sections were reviewed **2026-08-30**; the other starter packs and the expanded Linear/Notion catalogs were reviewed **2026-08-31**. Per-entry dates record each review. These are documented defaults, not evidence that every shortcut has been exercised in the installed app. Context, product surface, keyboard layout, app version, and user remapping matter.

**Playable in the local game:** browser-safe packs for **Linear, Slack, Notion, and GitHub** on Mac and Windows (`releasedPlatforms: ["macos", "windows"]`; a released pack must cover both because the game launches on both). Jira, Superhuman Mail, and Excel remain stored but have empty `releasedPlatforms`; they are hidden from setup and the home animation. Old links fall back to Linear, without deleting or relabeling old scores. Cursor, Claude Code, ChatGPT, and Codex remain research-only below and appear in setup only as coming-soon entries with a link to request them; they rely on Cmd/Ctrl, which the browser engine cannot capture. Windows bindings are stored explicitly; Linear's letter shortcuts were copied to Windows on 2026-09-10 because Linear documents them as OS-independent, and its Cmd shortcuts map to Ctrl as reference-only.

## New app packs

| App | Catalog entries | Easy / Medium / Hard eligible | Primary source |
|---|---:|---:|---|
| Slack | 101 | 10 / 10 / 13 | [Slack shortcut reference](https://slack.com/help/articles/201374536-Slack-keyboard-shortcuts) |
| Notion | 61 | 10 / 10 / 14 | [Notion shortcut reference](https://www.notion.com/help/keyboard-shortcuts) |
| GitHub | 33 | 18 / 27 / 33 | [GitHub keyboard shortcuts](https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts) (reviewed 2026-09-10) |
| Jira (not released) | 9 | — | [Jira Cloud shortcuts](https://support.atlassian.com/jira-software-cloud/docs/use-keyboard-shortcuts/) |
| Superhuman Mail (not released) | 29 | — | [Mac v8 keymap](https://download.superhuman.com/Superhuman%20Keyboard%20Shortcuts.pdf), [Windows/Linux v8 keymap](https://download.superhuman.com/Superhuman_Keyboard_Shortcuts.pdf) |
| Excel (not released) | 18 | — | [Microsoft Excel shortcuts](https://support.microsoft.com/en-US/Accessibility/excel/keyboard-shortcuts-in-excel) |

Counts are a snapshot of the catalog validator output, not constants used by the UI. The JSON holds individual actions, contexts, physical key codes, display labels, platform bindings, and source dates. The existing importer updates these packs without changing gameplay code.

- Slack teaches focused-message actions plus composer line breaks and selection. Letter shortcuts do not work while typing a message. The Up-arrow edit-last-message action assumes Slack's default preference, as recorded in its context and notes.
- Notion teaches block navigation/editing, including horizontal selection and editing/opening selected blocks. The expanded reference includes formatting, block conversions, window/page navigation, database operations, and platform-specific bindings. Cmd/Ctrl actions, Esc, and the OS emoji picker are stored but excluded from play.
- Jira uses the current Cloud documentation, not older Server shortcut lists. Its starter pack has only singles, so Medium/Hard do not invent extra command types.
- Superhuman means **Mail**, not Docs or Go. The pack covers inbox actions, folder sequences, and Shift filters.
- Excel uses desktop defaults. Return direction can be customized; this pack assumes its default and Scroll Lock off. Mac Delete is the physical Backspace key. Function-key and reserved-modifier actions are reference-only.
- GitHub teaches the character-key shortcuts from the official reference: `S` search (`/` is an alias, kept in `sourceBindings`), `G` sequences for notifications, repository tabs, and the workflow file, file/PR browsing keys (`T L W Y I B E`), issue-list and issue actions (`C U O Q M L A X`), `R` quote reply, and Shift chords for line highlight, Actions logs, and notifications. The same letters apply on Mac and Windows/Linux. Duplicated letters (`E`, `L`) carry distinct contexts. Cmd/Ctrl Markdown, editor, project-board, and network-graph shortcuts are out of scope. GitHub's own dialog (`?`) is the in-app reference.

Input capture is limited to active play. Esc pauses; menus retain native Tab navigation. Cmd, Ctrl, and Option/Alt remain untouched. Source review and browser-game checks do not constitute testing in each installed third-party app.

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

Optional, validated source-preservation fields (used by every Slack row):

| Field | Meaning |
|---|---|
| `category` | Original documentation section name; free text, not a game-mode enum |
| `sourceAction` | Source action label, kept separately from the short in-game `action` |
| `sourceBindings.macos` / `.windows` | Arrays of documented shortcut alternatives, including pointer gestures and `[number]` choices; an empty array means the source does not supply that platform |
| `notes` | Desktop-only restrictions, keyboard-layout caveats, preference-dependent behavior, and audit discrepancies |

For example, `slack/new-message` stores category `Slack basics`, source action `Compose a new message`, Mac alternatives `["⌘ N", "⌘ Shift K"]`, and Windows alternatives `["Ctrl N", "Ctrl Shift K"]`. Its normalized `bindings` still contain one canonical keyboard input per platform. The original category can be queried from `SHORTCUT_CATALOG.apps.slack.shortcuts`; no new service or game-mode layer is needed.

These optional fields extend schema version 1 without invalidating older packs. The existing importer validates and retains them. `sourceBindings` are reference strings, **never parsed or executed as gameplay input**. A pointer gesture or numbered choice can therefore have full source data while its normalized `bindings` remain null. Aliases do not silently become extra game answers; gameplay still uses the displayed canonical binding.

The playable subset is one letter or supported editing/navigation key, two successive letters, or Shift + one supported key, with `source.verification: "current"`. Supported nonletters are Enter, Tab, Space, Backspace, and the four arrows. They enter the on-screen keyboard only when used by the lesson. Command/Control/Alt, Esc, function keys, longer sequences, and other unsupported inputs can be recorded but do not enter the game. Historical records are retained but excluded from every playable pool. Counts come from the resulting app/platform deck. `releasedPlatforms` is a review gate, not proof of installed-app compatibility; only the three released Mac packs are exposed in the launcher.

### Why there is no “download every shortcut” connector

- **Linear:** the public GraphQL API describes workspace entities and operations, not a documented complete UI keymap. Documentation and the in-app shortcut panel remain sources for a reviewed snapshot. See [Linear's API](https://linear.app/developers/graphql), [SDK schema](https://github.com/linear/linear/blob/master/packages/sdk/src/schema.graphql), and [export documentation](https://linear.app/docs/exporting-data).
- **Notion:** its API and MCP tools operate on workspace content; no complete default-keymap endpoint was found in the reviewed references. See [API introduction](https://developers.notion.com/reference/intro) and [MCP tools](https://developers.notion.com/guides/mcp/mcp-supported-tools).
- **Cursor:** user `keybindings.json` is an override file, not all defaults. A future importer must preserve conditions, removed bindings, arguments, and ordering, and merge against a versioned default snapshot. The underlying editor documents its default-keybinding JSON command; verify Cursor's installed output before treating it as an export. See [Cursor migration](https://cursor.com/help/getting-started/migrate-vscode) and [VS Code keybindings](https://code.visualstudio.com/docs/configure/keybindings).
- **Claude Code:** `~/.claude/keybindings.json` contains context-specific overrides, including null/unbound actions. It is useful input for a future importer, not a complete catalog by itself. See [keybinding configuration](https://code.claude.com/docs/en/keybindings).
- **ChatGPT / Codex:** the reviewed docs provide a desktop shortcut reference and configurable CLI bindings, but no documented complete keymap-feed API. MCP connectors expose callable tools, not automatically UI keyboard shortcuts. See [desktop settings](https://learn.chatgpt.com/docs/reference/settings#keyboard-shortcuts), [config reference](https://learn.chatgpt.com/docs/config-file/config-reference), [app-server API](https://learn.chatgpt.com/docs/app-server#api-overview), and [MCP connectors](https://developers.openai.com/api/docs/guides/tools-connectors-mcp).

No live connector, account authorization, override-file reader, or arbitrary command execution is implemented here. A future importer can output this same catalog format when a real source exists.

## Linear — current game catalog

Sources below are primary. The catalog contains **75 entries**, including **37 playable Mac bindings:** 14 singles, 14 sequences, 9 Shift chords. The other 38 are reference-only, including four historical bindings that are no longer offered in gameplay. Existing command IDs are retained. Windows bindings are stored only where explicitly paired in the source; Windows gameplay is not released.

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
| M → B; M → X; M → R | Mark blocked; mark blocking; relate an issue | [Issue relations](https://linear.app/docs/issue-relations) |
| Shift + Up / Down | Extend selection; issue list | [Selecting issues](https://linear.app/docs/select-issues) |
| Shift + Enter | Line break; description editor | [Editor](https://linear.app/docs/editor) |
| Mac Control + R; Windows Control + Alt + R | New customer request; **reference-only**, reserved modifiers | [Customer requests](https://linear.app/docs/customer-requests) |

Additional reference-only entries cover command-menu/search actions, template/sub-issue creation, selection and reordering, subscriber management, text formatting, lists, code blocks, attachments, comments, undo, and redo. Each JSON entry links to its specific primary source and records its required context.

### Differences from the pasted Linear list

- **My issues is G → M**, not G → A; G → A opens the current team's active issues. See [My issues](https://linear.app/docs/my-issues) and [team pages](https://linear.app/docs/default-team-pages).
- Linear's [June 11, 2026 release note](https://linear.app/changelog/2026-06-11-coding-sessions) explicitly changes strikethrough to **Cmd/Ctrl + Shift + X**. This supersedes the S binding still shown on the [editor help page](https://linear.app/docs/editor); the catalog records X and notes the discrepancy. Inline code remains **Cmd/Ctrl + E**. The editor page lists **Cmd + Shift + U** for editor uploads; the separate [comment reference](https://linear.app/docs/comment-on-issues) specifies **Cmd/Ctrl + Shift + A** for comment attachments. Contexts remain distinct.
- Old navigation/editing entries without a matching current primary reference were not added as verified defaults. Markdown text and mouse gestures are not gameplay chords. G → V, O → C, Shift + C, and Shift + F retain historical references but are now excluded from gameplay until re-verified against current documentation.

Audit limits: the selecting-issues page mentions J/K together; verify direction in the actual app before calling that a fresh runtime check. Historical entries are archival data, not current lessons. The coverage is partial. Do not assume every navigation command works from every context, or promote old E/H entries without checking their current meaning.

## Slack — categorized Mac and Windows/Linux reference

Source: [Slack keyboard shortcuts](https://slack.com/help/articles/201374536-Slack-keyboard-shortcuts), checked **2026-08-31** against the two user-provided extracts. The `windows` data corresponds to Slack's combined Windows/Linux column; it does not enable a new launch platform. The source tables and relevant tips are preserved as 101 rows across these original categories:

| Category | Stored rows |
|---|---:|
| Slack basics | 21 |
| Navigate conversations and messages | 18 |
| Mark messages read or unread | 3 |
| Navigate unread messages | 5 |
| Switch workspaces | 4 |
| Switch tabs | 3 |
| Take actions on messages | 10 |
| Format messages | 17 |
| Format text in a canvas | 8 |
| Navigate a canvas | 12 |

The game uses 13 canonical Mac bindings (10 singles, 3 Shift chords). The larger reference includes browser-reserved modifiers, pointer gestures, variable-number choices, and repeated actions in different source categories. Direction-pair rows such as sidebar resizing retain both arrows as source strings without choosing an arbitrary game direction. Common message formatting also applies to canvases, as Slack states; it is not duplicated into every category.

Corrections and limits:

- The supplied Windows navigation section contained Mac text. The official Windows column uses **Alt + Left/Right** for history, **Ctrl + Shift + 1/0** for Home/More, and **Ctrl + Shift + 2** for browsing DMs. These are stored explicitly, not derived by replacing Command with Control.
- The official Windows specific-tab entry includes **Ctrl + Shift + [number]**; the pasted version omitted Shift. Number assignments remain parameterized source strings.
- Canvas context menus differ: **Cmd + Shift + /** on Mac versus **Shift + F10** on Windows. Copying a canvas anchor uses **Control + Option + Q on Mac**, not Command.
- No Windows underline binding or Mac jump-to-conversation row was invented where the respective source column omitted one. Missing source arrays and normalized bindings remain empty/null.
- English keyboard-layout variants, desktop-only marks, focus requirements, and the configurable Up-arrow behavior are kept in per-row notes. Mouse gestures are not simulated by invented key codes.

This is a reviewed snapshot, not an automatically synchronized database or evidence of tests inside Slack. It is ready for future category/platform filtering without implementing those future challenges now.

## Notion — web and desktop reference

Primary source: [Notion keyboard shortcuts](https://www.notion.com/help/keyboard-shortcuts). In the table, **M** means the source's Command (Mac) / Control (Windows) pairing, and **O** means Option / Alt. Explicit exceptions are written out. Desktop-only actions do not imply equivalent browser behavior.

The supplied Notion Help text was cross-checked against this reference and expanded into **61 catalog entries**: 14 playable actions and 47 reference-only entries. Aliases such as Cmd/Ctrl + K versus Cmd/Ctrl + P for search remain documented below; the catalog uses one canonical binding per action/context instead of inflating the lesson pool with aliases. For US QWERTY, the physical `+` key is stored as Shift + Equal. Mouse gestures and variable-length typing syntax remain in these notes rather than being mislabeled as gameplay shortcuts.

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
