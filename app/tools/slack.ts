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

/** Message-focused single-key Slack shortcuts (macOS desktop / web). */
export const SLACK_EASY_SHORTCUTS: readonly ShortcutDefinition[] = [
  single("add-reaction", "Add reaction", "A", "Message selected"),
  single("edit-message", "Edit message", "E", "Your message selected"),
  single("forward-message", "Forward message", "F", "Message selected"),
  single("remind-me", "Remind me", "M", "Message selected"),
  single("pin-message", "Pin to channel", "P", "Message selected"),
  single("reply-in-thread", "Reply in thread", "R", "Message selected"),
  single("save-for-later", "Save for later", "S", "Message selected"),
  single("mark-unread", "Mark unread", "U", "Message selected"),
  single("start-thread", "Start a thread", "T", "Message selected"),
];

/** Two-key navigation mnemonics for Slack’s primary destinations. */
export const SLACK_MEDIUM_SHORTCUTS: readonly ShortcutDefinition[] = [
  sequence("go-activity", "Go to Activity", "G", "A"),
  sequence("go-dms", "Go to DMs", "G", "D"),
  sequence("go-home", "Go to Home", "G", "H"),
  sequence("go-later", "Go to Later", "G", "L"),
  sequence("go-threads", "Go to Threads", "G", "T"),
  sequence("go-unreads", "Go to Unreads", "G", "U"),
  sequence("open-search", "Open search", "O", "K"),
  sequence("open-shortcuts", "Open keyboard shortcuts", "O", "S"),
];

/**
 * Shift-chord stand-ins for Slack’s Cmd+Shift destinations
 * (All Unreads, Mentions, Threads, DMs, Channels, Status).
 */
export const SLACK_HARD_SHORTCUTS: readonly ShortcutDefinition[] = [
  shiftChord("all-unreads", "All unreads", "A"),
  shiftChord("browse-dms", "Browse direct messages", "K"),
  shiftChord("browse-channels", "Browse channels", "L"),
  shiftChord("mentions", "Mentions & reactions", "M"),
  shiftChord("threads-view", "Threads", "T"),
  shiftChord("set-status", "Set a status", "Y"),
];

export const SLACK_SHORTCUTS: readonly ShortcutDefinition[] = [
  ...SLACK_EASY_SHORTCUTS,
  ...SLACK_MEDIUM_SHORTCUTS,
  ...SLACK_HARD_SHORTCUTS,
];

const shortcutsById = new Map(
  SLACK_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut] as const),
);

export function getSlackShortcutById(id: string): ShortcutDefinition {
  const shortcut = shortcutsById.get(id);
  if (!shortcut) throw new Error(`Unknown Slack shortcut: ${id}`);
  return shortcut;
}

// Alternates input types so a short demo communicates the full premise quickly.
export const SLACK_SHOWCASE: readonly ShortcutDefinition[] = [
  getSlackShortcutById("reply-in-thread"),
  getSlackShortcutById("go-unreads"),
  getSlackShortcutById("all-unreads"),
  getSlackShortcutById("add-reaction"),
  getSlackShortcutById("go-dms"),
  getSlackShortcutById("browse-dms"),
  getSlackShortcutById("save-for-later"),
  getSlackShortcutById("go-threads"),
  getSlackShortcutById("mentions"),
  getSlackShortcutById("mark-unread"),
  getSlackShortcutById("go-home"),
  getSlackShortcutById("set-status"),
];

export const SLACK_TRACK: ShortcutTrack = {
  id: "slack",
  name: "Slack",
  editionLabel: "slack edition",
  platform: "macOS",
  description: "Learn the keyboard shortcuts that make Slack feel fast.",
  decks: {
    easy: SLACK_EASY_SHORTCUTS,
    medium: SLACK_MEDIUM_SHORTCUTS,
    hard: SLACK_HARD_SHORTCUTS,
  },
  showcase: SLACK_SHOWCASE,
};
