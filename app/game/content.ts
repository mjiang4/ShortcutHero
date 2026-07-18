import type {
  ChordShortcutInput,
  GameMode,
  LetterCode,
  SequenceShortcutInput,
  ShortcutDefinition,
  SingleShortcutInput,
} from "./types";

const SEQUENCE_GAP_MS = 1_000;

function letterCode(letter: string): LetterCode {
  return `Key${letter}`;
}

function single(
  id: string,
  action: string,
  letter: string,
  context?: string,
): ShortcutDefinition {
  const input: SingleShortcutInput = {
    kind: "single",
    code: letterCode(letter),
    display: letter,
  };

  return { id, action, difficulty: "easy", input, context };
}

function sequence(
  id: string,
  action: string,
  first: string,
  second: string,
): ShortcutDefinition {
  const input: SequenceShortcutInput = {
    kind: "sequence",
    codes: [letterCode(first), letterCode(second)],
    display: `${first} → ${second}`,
    maxGapMs: SEQUENCE_GAP_MS,
  };

  return { id, action, difficulty: "medium", input };
}

function shiftChord(
  id: string,
  action: string,
  letter: string,
  context?: string,
): ShortcutDefinition {
  const input: ChordShortcutInput = {
    kind: "chord",
    code: letterCode(letter),
    shift: true,
    display: `⇧ ${letter}`,
  };

  return { id, action, difficulty: "hard", input, context };
}

export const EASY_SHORTCUTS: readonly ShortcutDefinition[] = [
  single("new-issue", "New issue", "C"),
  single("assign-user", "Assign user", "A", "Issue selected"),
  single("assign-to-me", "Assign to me", "I", "Issue selected"),
  single("add-label", "Add label", "L", "Issue selected"),
  single("change-priority", "Change priority", "P", "Issue selected"),
  single("change-status", "Change status", "S", "Issue selected"),
  single("filter", "Filter", "F"),
  single("select", "Select item", "X"),
  single("next-item", "Next item", "J"),
  single("previous-item", "Previous item", "K"),
];

export const MEDIUM_SHORTCUTS: readonly ShortcutDefinition[] = [
  sequence("go-inbox", "Go to Inbox", "G", "I"),
  sequence("go-my-issues", "Go to My issues", "G", "M"),
  sequence("go-backlog", "Go to Backlog", "G", "B"),
  sequence("go-active-cycle", "Go to active cycle", "G", "V"),
  sequence("open-favorite", "Open favorite", "O", "F"),
  sequence("open-project", "Open project", "O", "P"),
  sequence("open-cycle", "Open cycle", "O", "C"),
  sequence("open-team", "Open team", "O", "T"),
];

export const HARD_SHORTCUTS: readonly ShortcutDefinition[] = [
  shiftChord("set-estimate", "Set estimate", "E", "Issue selected"),
  shiftChord("add-to-project", "Add to project", "P", "Issue selected"),
  shiftChord("add-to-cycle", "Add to cycle", "C", "Issue selected"),
  shiftChord("subscribe", "Subscribe", "S", "Issue selected"),
  shiftChord("display-options", "Display options", "V"),
  shiftChord("clear-last-filter", "Clear last filter", "F"),
];

export const ALL_SHORTCUTS: readonly ShortcutDefinition[] = [
  ...EASY_SHORTCUTS,
  ...MEDIUM_SHORTCUTS,
  ...HARD_SHORTCUTS,
];

const shortcutsById = new Map(
  ALL_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut] as const),
);

export function getShortcutById(id: string): ShortcutDefinition {
  const shortcut = shortcutsById.get(id);
  if (!shortcut) {
    throw new Error(`Unknown shortcut: ${id}`);
  }
  return shortcut;
}

// Deliberately alternates input types so the one-minute demo teaches the premise fast.
export const SHOWCASE_ORDER: readonly ShortcutDefinition[] = [
  getShortcutById("new-issue"),
  getShortcutById("go-inbox"),
  getShortcutById("set-estimate"),
  getShortcutById("change-priority"),
  getShortcutById("go-my-issues"),
  getShortcutById("add-to-project"),
  getShortcutById("add-label"),
  getShortcutById("go-backlog"),
  getShortcutById("add-to-cycle"),
  getShortcutById("filter"),
  getShortcutById("go-active-cycle"),
  getShortcutById("subscribe"),
];

export function getShortcutDeck(mode: GameMode): readonly ShortcutDefinition[] {
  switch (mode) {
    case "easy":
      return EASY_SHORTCUTS;
    case "medium":
      return MEDIUM_SHORTCUTS;
    case "hard":
      return HARD_SHORTCUTS;
    case "showcase":
      return SHOWCASE_ORDER;
  }
}
