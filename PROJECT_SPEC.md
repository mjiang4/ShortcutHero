# Shortcut Hero — Hackathon Product Spec

**Platform:** Browser, targeting Chrome on macOS with a US-QWERTY keyboard  
**Build:** Client-side static site; no backend or account required

## 1. Product

Shortcut Hero is a 3D browser game that makes learning real Linear keyboard shortcuts faster and more fun. It is inspired by the urgency and visual satisfaction of Guitar Hero, but it is a memorization game rather than a strict rhythm game.

An action such as **Go to Inbox** travels down a perspective highway. The player enters its shortcut—`G → I`—before it reaches the strike line. Correct answers build score and combos, intensifying the visuals with particles, light, and impact effects.

The first version teaches Linear shortcuts. Shortcut packs for products such as Excel, Notion, and Superhuman can be added later through data, without changing the game itself.

### Target player

A Linear user who understands common actions but has not yet built automatic shortcut recall.

### MVP goal

A polished 45-second run that is immediately understandable, visually impressive, and complete enough for a one-minute hackathon demonstration.

### Not in scope

- Linear login, API access, or workspace changes
- Accounts, backend storage, multiplayer, or mobile
- Multiple music tracks or a level editor
- Windows, Linux, non-US layouts, or broad browser support
- Exact Guitar Hero mechanics or a lane for every keyboard key

## 2. Core experience

### Main menu

The opening screen contains:

- **New Game**
- Difficulty, assistance, and speed settings
- Previous high score, stored in `localStorage`
- A short instruction: **Enter the shortcut before the action reaches the line.**

### Action Highway

A single 3D runway recedes into the distance. Minimal action ribbons move toward a strike line positioned above a simplified Mac keyboard.

- The action name is the focal point: `Go to Inbox`.
- In Novice mode, the ribbon also shows `G → I` and the relevant keyboard keys glow.
- In Pro mode, only the action name is shown.
- The keyboard reacts to physical input but is not divided into note lanes.
- Correct input depresses the relevant keys and resolves the ribbon with a satisfying impact.
- One prompt is playable at a time; up to two future prompts may be visible for depth and anticipation.

### Game loop

1. Choose settings and start the game.
2. Complete a short countdown.
3. Read each approaching action and enter its shortcut before the deadline.
4. Build score, combo, and visual intensity through correct answers.
5. Missed shortcuts return later in the run for another attempt.
6. Finish on a results screen after approximately 45 seconds.

The run never ends early. Mistakes reset the combo but become practice opportunities.

## 3. Modes and settings

Difficulty controls the kind of input. Assistance controls whether the answer is visible. Speed controls how long the player has to respond.

### Difficulty

| Mode | Shortcut type | Example |
|---|---|---|
| **Easy** | Single key | `P` — Change priority |
| **Medium** | Ordered sequence | `G → I` — Go to Inbox |
| **Hard** | Shift chord | `⇧ E` — Set estimate |

For the judged demo, a mixed run may use all three types. Normal games use the selected difficulty.

### Assistance

| Mode | Behaviour |
|---|---|
| **Novice** | Shows the shortcut and highlights the required keys |
| **Pro** | Shows only the action; reveals the answer after a miss |

### Speed

| Mode | Time before the action reaches the strike line |
|---|---:|
| Relaxed | 4.5 seconds |
| Standard | 3.2 seconds |
| Turbo | 2.2 seconds |

Speed does not change the music or the type of shortcut being tested.

## 4. Gameplay and feedback

### Input rules

- A single shortcut completes on one key press.
- A sequence must be entered in order, with no more than roughly one second between keys.
- A chord completes when the letter is pressed while Shift is held.
- A wrong key breaks the combo, but the player may recover before the ribbon reaches the line.
- A timeout is a miss.

### Scoring

- Faster correct answers earn more points.
- Consecutive first-attempt answers build the combo and score multiplier.
- A recovered answer earns reduced points and does not continue the combo.
- A miss earns no points and returns that shortcut later in the run.
- Pro mode maintains a separate high score from Novice mode.

The results screen shows:

- Score
- Accuracy
- Longest combo
- Shortcuts answered correctly
- Up to three shortcuts to practise again

### Visual escalation

The game is minimal while idle and becomes more expressive as the player succeeds:

- **Normal hit:** key depression, impact ring, short particle burst, and confirmation sound
- **Combo 3:** brighter ribbon trail
- **Combo 6:** denser particles and a subtle camera push
- **Combo 9 — Flow State:** brighter runway, stronger bloom, and a larger impact effect
- **Miss:** the ribbon fragments and the scene briefly loses intensity

Flow State is a visual reward only. It does not change timing or input rules.

## 5. Visual and audio direction

The game should feel Linear-inspired: minimal, refined, dark, precise, and easy to scan. The playful layer should come from motion and earned effects rather than permanent visual noise.

### Principles

- One clear focal point at all times
- Near-black background, graphite surfaces, off-white text, and one violet/indigo accent
- Large, highly legible action text
- Sparse HUD showing score, combo, and remaining time
- Restrained effects during normal play; larger effects at combo milestones
- No rainbow lanes, simulated concert stage, crowd, avatar, or copied Linear UI
- Theme values kept configurable so the palette and effects can change later

### Audio

Use one simple looping background track plus hit, miss, combo, and results sounds. The MVP does not require beat synchronization or music-driven scoring; audio exists to improve pace and game feel.

## 6. Shortcut content

The [KeyCombiner Linear collection](https://keycombiner.com/collections/linear/) is a useful starting list, but it contains stale and context-dependent entries. Every shortcut included in the game should be checked against current Linear documentation or Linear's in-app `?` shortcut panel.

### Starter deck

| Difficulty | Actions |
|---|---|
| Easy | `C` New issue; `A` Assign user; `I` Assign to me; `L` Add label; `P` Change priority; `S` Change status; `F` Filter; `X` Select; `J` Next item; `K` Previous item |
| Medium | `G→I` Inbox; `G→M` My issues; `G→B` Backlog; `G→V` Active cycle; `O→F` Favorite; `O→P` Project; `O→C` Cycle; `O→T` Team |
| Hard | `⇧E` Set estimate; `⇧P` Add to project; `⇧C` Add to cycle; `⇧S` Subscribe; `⇧V` Display options; `⇧F` Clear last filter |

Some shortcuts depend on context, such as having an issue selected. When context matters, show a small label such as **Issue selected** below the action.

### Browser safety

For the MVP:

- Use only unmodified letter keys, letter sequences, and Shift-plus-letter chords.
- Exclude Command, Control, Option, Tab, Space, Enter, and browser/system shortcuts.
- Capture keys only during active play and only when the game has focus.
- Pause and clear input state if the window loses focus.

## 7. MVP build

### Must have

- Main menu with difficulty, Novice/Pro, speed, and local high score
- One 45-second mixed showcase run
- Action Highway and reactive 3D keyboard
- Single, sequence, and Shift-chord input handling
- Score, accuracy, combo, multiplier, and results
- Hit, recovered, and miss states
- Particle bursts, keyboard reactions, combo escalation, and Flow State
- Simple background audio and sound effects
- Verified starter shortcut deck
- Static deployment that works after a hard refresh

### Technical direction

- Vite, React, and TypeScript
- Three.js through React Three Fiber, with Drei for text/helpers
- Lightweight bloom through `@react-three/postprocessing`
- `performance.now()` for prompt timing
- `localStorage` for high scores and missed-shortcut history
- Static deployment; no server required

### Build order

1. Make one ribbon move and accept one correct shortcut.
2. Add the complete session loop, three input types, scoring, and results.
3. Add the keyboard, particles, camera feedback, and combo escalation.
4. Add the verified content, audio, menu, persistence, and deployment polish.

If time runs short, cut missed-shortcut persistence, multiple speed presets, and background workspace reactions first. Do not cut the core input loop, Novice/Pro distinction, clear visual feedback, or complete results screen.

## 8. One-minute demo

1. Show the menu, modes, and high score.
2. Start a Novice mixed run.
3. Demonstrate a single key, sequence, and Shift chord.
4. Build a combo until the visual intensity changes.
5. Miss one shortcut, then clear it when it returns.
6. Finish on Results and point out Pro mode and future shortcut packs.
