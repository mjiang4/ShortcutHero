import type {
  ChordShortcutInput,
  LetterCode,
  SequenceShortcutInput,
  ShortcutDefinition,
  SingleShortcutInput,
} from "../game/types";
import type { ShortcutTrack } from "./types";

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

export const LINEAR_EASY_SHORTCUTS: readonly ShortcutDefinition[] = [
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

export const LINEAR_MEDIUM_SHORTCUTS: readonly ShortcutDefinition[] = [
  sequence("go-inbox", "Go to Inbox", "G", "I"),
  sequence("go-my-issues", "Go to My issues", "G", "M"),
  sequence("go-backlog", "Go to Backlog", "G", "B"),
  sequence("go-active-cycle", "Go to active cycle", "G", "V"),
  sequence("open-favorite", "Open favorite", "O", "F"),
  sequence("open-project", "Open project", "O", "P"),
  sequence("open-cycle", "Open cycle", "O", "C"),
  sequence("open-team", "Open team", "O", "T"),
];

export const LINEAR_HARD_SHORTCUTS: readonly ShortcutDefinition[] = [
  shiftChord("set-estimate", "Set estimate", "E", "Issue selected"),
  shiftChord("add-to-project", "Add to project", "P", "Issue selected"),
  shiftChord("add-to-cycle", "Add to cycle", "C", "Issue selected"),
  shiftChord("subscribe", "Subscribe", "S", "Issue selected"),
  shiftChord("display-options", "Display options", "V"),
  shiftChord("clear-last-filter", "Clear last filter", "F"),
];

export const LINEAR_SHORTCUTS: readonly ShortcutDefinition[] = [
  ...LINEAR_EASY_SHORTCUTS,
  ...LINEAR_MEDIUM_SHORTCUTS,
  ...LINEAR_HARD_SHORTCUTS,
];

const shortcutsById = new Map(
  LINEAR_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut] as const),
);

export function getLinearShortcutById(id: string): ShortcutDefinition {
  const shortcut = shortcutsById.get(id);
  if (!shortcut) throw new Error(`Unknown Linear shortcut: ${id}`);
  return shortcut;
}

// Alternates input types so a short demo communicates the full premise quickly.
export const LINEAR_SHOWCASE: readonly ShortcutDefinition[] = [
  getLinearShortcutById("new-issue"),
  getLinearShortcutById("go-inbox"),
  getLinearShortcutById("set-estimate"),
  getLinearShortcutById("change-priority"),
  getLinearShortcutById("go-my-issues"),
  getLinearShortcutById("add-to-project"),
  getLinearShortcutById("add-label"),
  getLinearShortcutById("go-backlog"),
  getLinearShortcutById("add-to-cycle"),
  getLinearShortcutById("filter"),
  getLinearShortcutById("go-active-cycle"),
  getLinearShortcutById("subscribe"),
];

export const LINEAR_TRACK: ShortcutTrack = {
  id: "linear",
  name: "Linear",
  editionLabel: "linear edition",
  platform: "macOS",
  description: "Learn the keyboard shortcuts that make Linear feel fast.",
  decks: {
    easy: LINEAR_EASY_SHORTCUTS,
    medium: LINEAR_MEDIUM_SHORTCUTS,
    hard: LINEAR_HARD_SHORTCUTS,
  },
  showcase: LINEAR_SHOWCASE,
};
