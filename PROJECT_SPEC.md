# Shortcut Hero — Hackathon Product Spec

**Platform:** Browser, targeting Chrome on macOS with a US-QWERTY keyboard  
**Build:** Client-side static site; no backend or account required

## 1. Product

Shortcut Hero is a 3D browser game that makes learning real Linear keyboard shortcuts faster and more fun. It is inspired by the urgency and visual satisfaction of Guitar Hero, but it is a memorization game rather than a strict rhythm game.

An action such as **Go to Inbox** travels down a perspective highway. The player completes its shortcut—`G → I`—at the strike line. Correct answers build score and streaks, intensifying the visuals with particles, light, and impact effects.

The first version teaches Linear shortcuts. Each product owns a self-contained shortcut track in the tool registry, so Excel, Notion, Jira, Superhuman, and other packs can be added without changing timing, scoring, input, or rendering code.

### Target player

A Linear user who understands common actions but has not yet built automatic shortcut recall.

### MVP goal

A polished 30-second default run that is immediately understandable, visually impressive, and complete enough for a one-minute hackathon demonstration.

### Not in scope

- Linear login, API access, or workspace changes
- Accounts, backend storage, multiplayer, or mobile
- Music import, automatic beat detection, chart authoring, or a level editor in the hackathon MVP
- Windows, Linux, non-US layouts, or broad browser support
- Exact Guitar Hero mechanics or a lane for every keyboard key

## 2. Core experience

### Home and menu flow

The opening is a dedicated, full-screen game home state. Show **Current app: Linear** on home and options, not in the gameplay HUD. A quiet atmospheric background carries one vertical text menu:

- **Start** — immediately launches with the last-used settings
- **High Scores**
- **How to Play**
- **Options**
- **Credits**

Options open as a compact sub-screen with one setting per line: Difficulty, Hints, Pace, Session, Music, Effects. Hints sits directly below Difficulty. Home, options, gameplay, pause, and results are separate states and never overlap. Navigation back to the opening screen is always labeled **Home**.

Every title, options, pause, and results action is operable with the keyboard. Arrow keys move selection or change values, Enter confirms, and Escape returns or resumes.

### First-time onboarding

1. Run a short interactive demo with hints always visible. Teach one single key, one sequence, and one Shift chord using slow, repeatable prompts.
2. After the demo, show the same **Hints: Always · Near the line · Off** selector used in Options. Explain each choice in one short sentence; preselect Always.
3. **Start playing** uses the selected hints and current settings. Choosing a different hint level is optional.

Skipping the demo also reaches the hint selector. Completing or skipping onboarding saves the preference and completion flag on this browser; it does not appear on every visit or replay. First-time direct game links also use this flow. A manual replay is available from How to Play.

Choose hints during onboarding or in Options, before Start. Hints stay fixed for the whole round, including while paused. The selector explains: **“Hints stay fixed during a round.”** Do not add a hint control to the highway or Pause.

See [DESIGN_IDENTITY.md](./DESIGN_IDENTITY.md) for the screen architecture and art direction.

### Action Highway

A single 3D runway recedes into the distance. Minimal action ribbons move toward a strike line above a readable, screen-space Mac keyboard instrument.

- The action name is the focal point: `Go to Inbox`.
- With Always hints, the ribbon also shows `G → I` and the relevant keyboard keys glow.
- With Near the line hints, show only the command initially, then fade in its shortcut as it approaches the strike line.
- With Off hints, show only the command until the attempt resolves.
- The keyboard reacts to physical input, reveals only the next key in a sequence, and is not divided into note lanes.
- Hidden hints must not leak through the keyboard highlights, keyboard status, or screen-reader announcement. A miss can reveal the answer for review.
- Correct input depresses the relevant keys and resolves the ribbon with a satisfying impact.
- One prompt is playable at a time; up to two future prompts may be visible for depth and anticipation.

### Game loop

1. Choose settings and start the game.
2. Complete a short countdown.
3. Read each approaching action and enter its shortcut before the deadline.
4. Build score, combo, and visual intensity through correct answers.
5. Missed shortcuts return later in the run for another attempt.
6. Finish on a results screen after the selected duration (30 seconds by default).

The run never ends early. Mistakes reset the combo but become practice opportunities.

## 3. Modes and settings

Difficulty controls command complexity. Hints control memory assistance independently at every difficulty. Pace controls speed independently; do not add automatic acceleration in this iteration.

### Difficulty

| Mode | Shortcut type | Example |
|---|---|---|
| **Easy** | Single keys for core actions | `P` — Change priority |
| **Medium** | Single keys + ordered sequences | `P`; `G → I` — Go to Inbox |
| **Hard** | Singles, sequences, and Shift chords mixed | `P`; `G → I`; `⇧ E` — Set estimate |

Command familiarity and required app context guide lesson order: introduce core actions before specialised ones. Do not invent usage-frequency rankings. A rare single-key action is less familiar, not mechanically a chord-level task.

### Hints

| Mode | Behaviour |
|---|---|
| **Always** | Shows the shortcut and highlights the required keys throughout its approach; default |
| **Near the line** | Command first; shortcut starts fading in about 700 ms before the strike and is fully visible about 500 ms before it |
| **Off** | No answer or expected-key highlight before input; reveals the answer after a miss |

All nine Difficulty × Hints combinations are supported. This is a three-way selector, not a binary toggle. Practice, Recall, and Challenge are not replacements for Easy, Medium, and Hard.

### Speed

| Mode | Audio tempo | Prompt travel time |
|---|---:|---:|
| Focus | 112 BPM | 2.0 seconds |
| Fast | 144 BPM | 1.25 seconds |
| Turbo | 176 BPM | 1.0 second |

Pace changes travel speed and audio tempo, not the eligible shortcut types or hint selection. Prompt spacing must leave enough time to enter sequences, including after a missed preceding prompt.

## 4. Gameplay and feedback

### Input rules

- A single shortcut completes on one key press.
- A sequence must be entered in order, with up to 1.2 seconds between keys. Its first key may be staged before the strike; the final key must still land in the hit window.
- A chord completes when the letter is pressed while Shift is held.
- A wrong key breaks the combo, but the player may recover before the ribbon reaches the line.
- A timeout is a miss.

Teach these rules in the interactive demo and How to Play, not only in this spec: **“Press C when the card reaches the line.”**, **“Press G first. Press I at the line.”**, and **“Hold Shift. Press E at the line.”** After a sequence starts, the keyboard status says **“Finish the shortcut at the line.”** The 1.2-second gap is a game timing rule, not a claim about Linear's own timeout.

### Scoring

- Correct answers closer to the strike time earn more points; pressing as early as possible is not the goal.
- Consecutive first-attempt answers build the combo and score multiplier.
- A recovered answer earns reduced points, does not continue the combo, and is
  recorded as missed in the round summary.
- A miss earns no points and returns that shortcut later in the run.
- High scores distinguish app, platform, difficulty, hints, pace, and duration. Hints cannot change during a round, so a record always belongs to the setting used from start to finish. Keep older scores without merging them into the new categories.

The results screen shows:

- Score
- Accuracy
- Longest combo
- Unique shortcuts answered correctly on the first attempt
- **Needs review** first, expanded by default: any shortcut with a missed or wrong-key attempt
- **Mastered** second, expanded by default: shortcuts completed cleanly every time in this run

Both sections start expanded and have independent caret controls. A shortcut cannot appear in both. Keep timing grades out of these learning summaries; a separate rhythm metric is deferred.

### Visual escalation

The game is minimal while idle and becomes more expressive as the player succeeds:

- **Normal hit:** key depression, impact ring, short particle burst, and confirmation sound
- **Combo 3:** brighter ribbon trail
- **Combo 6:** denser particles and a subtle camera push
- **Combo 9 — Flow State:** brighter runway, stronger bloom, and a larger impact effect
- **Miss:** the ribbon fragments and the scene briefly loses intensity

Flow State is a visual reward only. It does not change timing or input rules.

## 5. Visual and audio direction

The game should feel like a cinematic command journey rather than a software training dashboard. Linear remains an influence in precision, typography, and violet accent—not a template for the screen layout.

The working direction is **Golden Signal**: an action highway suspended in a warm dusk environment that develops into an electric violet night. The title uses a sparse, typography-led game menu. During play, successful shortcuts change the environment, music layers, lighting, and camera energy.

### Principles

- One clear focal point at all times
- Warm dusk-to-night environment, off-white text, Linear violet signals, and restrained semantic hit colors
- Large, highly legible action text
- Sparse HUD showing score, a fixed streak counter, and **Time remaining**; no live accuracy, app label, or traveling combo popups
- Small streak pulses on ordinary hits; stronger reactions at existing streak milestones
- A visible dramatic arc from ignition through acceleration and Flow State to a final release
- Restrained effects during normal play; world-scale reactions at combo and session milestones
- No rainbow lanes, simulated concert stage, crowd, avatar, or copied Linear UI
- Theme values kept configurable so the palette and effects can change later

### Audio and music

The hackathon MVP uses one bundled background track plus hit, miss, combo, and results sounds. The track should support the run's dramatic arc, while gameplay timing remains deterministic and does not require beat synchronization.

The post-MVP music design supports three sources behind a shared playback interface:

1. A bundled licensed, original, or public-domain recording with authored timing markers
2. A local MP3, WAV, or M4A selected by the player and played entirely in-browser
3. An experimental user-provided YouTube URL played through the official embedded player

Classical compositions such as Liszt's *Sonata in B minor* are suitable creative references. Public-domain composition status does not make every recording public domain; bundled recordings must be appropriately licensed, commissioned, or generated from a public-domain score using licensed instruments.

Arbitrary and YouTube tracks initially use **Free play**: the music accompanies the run, but prompts are not scored against its beat. **Charted** tracks may later include beat and act markers that control cue spawns and visual progression. YouTube audio must not be downloaded or extracted, and its player timing should not be treated as frame-accurate.

See [DESIGN_IDENTITY.md](./DESIGN_IDENTITY.md#7-music-identity-and-future-track-support) for the proposed track model and constraints.

## 6. Shortcut content

The [KeyCombiner Linear collection](https://keycombiner.com/collections/linear/) is a useful starting list, but it contains stale and context-dependent entries. Every shortcut included in the game should be checked against current Linear documentation or Linear's in-app `?` shortcut panel.

### Updateable shortcut catalog

`app/tools/catalog-data.json` is the source of truth, not hand-written gameplay arrays. It stores app identity and surface, stable command IDs, action/context, source URL and check date, and explicit macOS/Windows bindings. Each binding is a sequence of strokes; keys inside one stroke are pressed together. A missing platform binding is `null`, never an automatic Command-to-Control substitution.

The shared catalog loader derives single-key, sequence, and chord groups from those bindings. The same game engine reads any app pack in this format. Only released Mac packs are currently launchable; adding data does not claim Windows runtime support. Unsupported/browser-reserved bindings remain reference-only and are excluded from playable counts.

Update a whole app snapshot with `npm run catalog:import -- path/to/catalog.json`: it validates and reports eligible counts without writing. Add `--write` to replace the included app snapshots while preserving other apps; review the diff before publishing. Stable command IDs preserve local lesson history. No dependency or external database service is needed.

This is a reviewed, versioned snapshot—not a complete live feed. The official sources checked do not expose a documented full Linear shortcut API. Workspace APIs and MCP connectors expose app operations, not necessarily UI keybindings. Future imports must normalize an actual keymap source into this format; do not invent a connector or treat user overrides as a full default keymap.

See [Shortcut sources and catalog updates](./docs/shortcut-sources.md) for the Linear audit, future-app reference inventories, platform differences, and known gaps. The current Mac snapshot has 35 playable commands: 14 singles, 13 sequences, and 8 Shift chords. These are snapshot counts, not limits baked into the game.

Some shortcuts depend on context, such as having an issue selected. When context matters, show a small label such as **Issue selected** below the action.

### Lesson selection

Choose up to ten distinct commands from the selected difficulty's eligible pool. With the current snapshot, the pools are Easy 14, Medium 27, and Hard 35. The UI derives counts from the loaded app/platform catalog, never from these numbers.

Prioritize missed or recovered commands, then unseen commands, then least-recently-practised commands. Review priority survives a later clean attempt in the same run. Store progress locally by app/platform; retain the existing within-round retry rule. Do not promise new commands on every replay: review can fill a lesson, and every catalog can eventually be exhausted.

### Browser safety

For the MVP:

- Use only unmodified letter keys, letter sequences, and Shift-plus-letter chords.
- Exclude Command, Control, Option, Tab, Space, Enter, and browser/system shortcuts.
- Capture keys only during active play and only when the game has focus.
- Pause and clear input state if the window loses focus.

## 7. MVP build

### Must have

- Dedicated home screen with Start, High Scores, How to Play, Options, and Credits
- First-visit interactive demo followed by the hint selector
- Compact options sub-screen with difficulty, hints, pace, session, music, and effects
- A 30-second default run; 45- and 60-second options remain available
- Action Highway and reactive screen-space keyboard instrument
- Single, sequence, and Shift-chord input handling
- Score, accuracy, combo, multiplier, and results
- Hit, recovered, and miss states
- Particle bursts, keyboard reactions, combo escalation, and Flow State
- Simple background audio and sound effects
- Verified starter shortcut deck
- Tool-track registry with Linear isolated from the game engine
- Static deployment that works after a hard refresh

### Technical direction

- Vite, React, and TypeScript
- Three.js through React Three Fiber, with Drei for text/helpers
- Lightweight bloom through `@react-three/postprocessing`
- `performance.now()` for prompt timing
- `localStorage` for high scores and missed-shortcut history
- Static deployment; no server required
- Audio playback begins from the Start gesture; future sources share a `GameTrack`/playback abstraction

### Implementation slices — 2026-08-30

This replaces the earlier plan that coupled Easy/Medium/Hard to Practice/Recall/Challenge. The following records the agreed scope and acceptance criteria. Changes are local until explicitly approved for publishing; Safari-specific startup behavior must be verified in Safari itself.

1. **Finish Slice 1 — stable, readable baseline.** Verify startup and investigate the reported Safari module-import error at its source. Finish the 30-second default, Home labels, home/options app identity, fixed streak HUD, Escape pause/resume, and exclusive Needs review/Mastered results. Preserve completed work rather than rebuilding it. Proof: startup, pause, full round, and results checks.
2. **Slice 2A — independent difficulty and hints.** Replace the in-progress coupling with the difficulty pools and three hint choices above. Reuse one selector in Options and onboarding. Save the preference and lock it once the round starts; Pause has no hint control. Give sequences earlier hints when selected and enough input time without removing the strike-line challenge. Preserve old saved preferences and round-data compatibility; do not silently merge unlike high scores. Proof: all nine combinations, sequence timing, hint concealment, and reserved browser keys.
3. **Slice 2B — first-time teaching and choice.** Extend the existing demo to teach a single key, sequence, and chord with Always hints. Then show the hint selector with Always preselected and Start playing. Save the choice and completion/skip state; do not repeat on reload or replay. Add manual replay through How to Play. Proof: new visitor, skip, returning visitor, direct game link, and saved hint selection.
4. **Slice 3 — catalog-backed lessons and rotation.** Replace fixed content arrays with the validated source-linked JSON catalog and explicit Mac/Windows bindings; provide a local import command. Finish ten-command lessons within the eligible difficulty pool, carrying review commands forward before unseen and least-recently-practised commands. Show accurate available/lesson counts. Keep progress local and separate by app/platform; no server schema expansion. Proof: data-only app/OS fixture, invalid import rejection, unsafe-key exclusion, miss → replay, clean lesson → unseen commands, pool exhaustion, and reload persistence.
5. **Slice 4 — source reference and future-app readiness.** Save the primary-source research in `docs/shortcut-sources.md` for Notion, ChatGPT, Cursor, Claude Code, and Codex, plus the Linear audit. Record app surface, context, macOS binding, explicitly verified Windows equivalent, source/date, and gaps. Keep OS-specific bindings in content, not scattered gameplay conditions. Mark unsafe browser shortcuts as reference-only. No new playable packs, live connector, or Windows runtime in this slice. Proof: source links and coverage/gaps are explicit; no guessed platform substitutions.
6. **Acceptance pass and release handoff.** Run relevant existing tests after each slice, then the production build and a full new-player/replay flow in Chromium and WebKit. Verify actual Safari separately where available; WebKit results alone are not a claim that the reported Safari issue is fixed. Present a local playtest before committing/publishing the approved project changes. Preserve unrelated work. Publishing requires explicit approval.

**Deferred:** additional playable apps until the Linear loop is approved; Windows runtime after binding/safety verification; a separate rhythm metric; automatic speed ramps; custom music and YouTube playback. No new framework, dependency, physics engine, or redesign is part of these slices.

## 8. One-minute demo

1. Show the dedicated title screen and briefly open the compact Options menu.
2. Start a mixed run with Always hints.
3. Demonstrate a single key, sequence, and Shift chord.
4. Build a combo until the visual intensity changes.
5. Miss one shortcut, then clear it when it returns.
6. Finish on Results and point out Near the line/Off hints and future shortcut packs.
