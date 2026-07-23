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

/** Letter-key Spotify desktop shortcuts (macOS). */
export const SPOTIFY_EASY_SHORTCUTS: readonly ShortcutDefinition[] = [
  single("toggle-shuffle", "Toggle shuffle", "S"),
  single("toggle-repeat", "Toggle repeat", "R"),
  single("like-track", "Like song", "L", "Playing track"),
  single("focus-search", "Focus search", "F"),
  single("open-queue", "Open queue", "Q"),
  single("go-home-tab", "Home", "H"),
  single("your-library", "Your Library", "Y"),
  single("now-playing", "Now playing view", "N"),
  single("create-playlist", "Create playlist", "C"),
];

/** Two-key navigation mnemonics for Spotify’s primary destinations. */
export const SPOTIFY_MEDIUM_SHORTCUTS: readonly ShortcutDefinition[] = [
  sequence("go-home", "Go to Home", "G", "H"),
  sequence("go-search", "Go to Search", "G", "S"),
  sequence("go-library", "Go to Your Library", "G", "L"),
  sequence("go-queue", "Go to Queue", "G", "Q"),
  sequence("go-liked", "Go to Liked Songs", "G", "K"),
  sequence("open-playlist", "Open playlist", "O", "P"),
  sequence("open-album", "Open album", "O", "A"),
  sequence("open-artist", "Open artist", "O", "R"),
];

/**
 * Shift-chord stand-ins for Spotify’s modifier-heavy desktop actions
 * (new playlist folder, share, radio, follow, queue controls).
 */
export const SPOTIFY_HARD_SHORTCUTS: readonly ShortcutDefinition[] = [
  shiftChord("new-playlist-folder", "New playlist folder", "N"),
  shiftChord("share-track", "Share", "S", "Playing track"),
  shiftChord("start-radio", "Start radio", "R", "Playing track"),
  shiftChord("follow", "Follow", "F", "Artist or playlist"),
  shiftChord("add-to-queue", "Add to queue", "Q", "Track selected"),
  shiftChord("liked-songs", "Open Liked Songs", "L"),
];

export const SPOTIFY_SHORTCUTS: readonly ShortcutDefinition[] = [
  ...SPOTIFY_EASY_SHORTCUTS,
  ...SPOTIFY_MEDIUM_SHORTCUTS,
  ...SPOTIFY_HARD_SHORTCUTS,
];

const shortcutsById = new Map(
  SPOTIFY_SHORTCUTS.map((shortcut) => [shortcut.id, shortcut] as const),
);

export function getSpotifyShortcutById(id: string): ShortcutDefinition {
  const shortcut = shortcutsById.get(id);
  if (!shortcut) throw new Error(`Unknown Spotify shortcut: ${id}`);
  return shortcut;
}

// Alternates input types so a short demo communicates the full premise quickly.
export const SPOTIFY_SHOWCASE: readonly ShortcutDefinition[] = [
  getSpotifyShortcutById("toggle-shuffle"),
  getSpotifyShortcutById("go-search"),
  getSpotifyShortcutById("new-playlist-folder"),
  getSpotifyShortcutById("like-track"),
  getSpotifyShortcutById("go-library"),
  getSpotifyShortcutById("share-track"),
  getSpotifyShortcutById("focus-search"),
  getSpotifyShortcutById("go-home"),
  getSpotifyShortcutById("start-radio"),
  getSpotifyShortcutById("open-queue"),
  getSpotifyShortcutById("go-liked"),
  getSpotifyShortcutById("follow"),
];

export const SPOTIFY_TRACK: ShortcutTrack = {
  id: "spotify",
  name: "Spotify",
  editionLabel: "spotify edition",
  platform: "macOS",
  description: "Learn the keyboard shortcuts that make Spotify feel fast.",
  decks: {
    easy: SPOTIFY_EASY_SHORTCUTS,
    medium: SPOTIFY_MEDIUM_SHORTCUTS,
    hard: SPOTIFY_HARD_SHORTCUTS,
  },
  showcase: SPOTIFY_SHOWCASE,
};
