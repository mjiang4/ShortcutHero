import { getHighScoreKey, type GameResults, type GameSession, type KeyboardPlatform } from "../game";
import { EMPTY_CURRICULUM, type CurriculumProgress } from "../game/curriculum";
import { createRoundId } from "../identity/anonymous-identity";

export type StoredHighScore = {
  readonly score: number;
  readonly name: string;
  readonly recordId: string | null;
};

export type SavedHighScore = {
  readonly key: string;
  readonly recordId: string;
};

export function readStoredHighScore(raw: string | null): StoredHighScore | null {
  if (raw === null) return null;
  try {
    const saved: unknown = JSON.parse(raw);
    if (typeof saved === "number" && Number.isFinite(saved) && saved >= 0) {
      return { score: saved, name: "Guest", recordId: null };
    }
    if (!saved || typeof saved !== "object" || !("score" in saved) ||
      typeof saved.score !== "number" || !Number.isFinite(saved.score) || saved.score < 0 ||
      !("name" in saved) || typeof saved.name !== "string" ||
      !("recordId" in saved) || typeof saved.recordId !== "string") return null;
    return { score: saved.score, name: saved.name.trim().slice(0, 32) || "Guest", recordId: saved.recordId };
  } catch {
    return null;
  }
}

function curriculumKey(trackId: string, platform: KeyboardPlatform): string {
  return `shortcut-hero:curriculum:v1:${trackId}:${platform === "macos" ? "macOS" : "Windows"}`;
}

export function readCurriculumProgress(trackId: string, platform: KeyboardPlatform = "macos"): CurriculumProgress {
  try {
    const raw = window.localStorage.getItem(curriculumKey(trackId, platform));
    if (!raw) return EMPTY_CURRICULUM;
    const saved = JSON.parse(raw) as CurriculumProgress;
    if (!Number.isSafeInteger(saved.completedLessons) || saved.completedLessons < 0 ||
      !saved.shortcuts || typeof saved.shortcuts !== "object") return EMPTY_CURRICULUM;
    const valid = Object.values(saved.shortcuts).every((entry) =>
      entry && Number.isSafeInteger(entry.lastPractised) && entry.lastPractised >= 0 &&
      typeof entry.needsReview === "boolean",
    );
    return valid ? saved : EMPTY_CURRICULUM;
  } catch {
    return EMPTY_CURRICULUM;
  }
}

export function persistCurriculumProgress(trackId: string, progress: CurriculumProgress, platform: KeyboardPlatform = "macos"): void {
  try {
    window.localStorage.setItem(curriculumKey(trackId, platform), JSON.stringify(progress));
  } catch {
    // The controller retains progress for replays when storage is unavailable.
  }
}

export function persistHighScore(
  results: GameResults,
  session: GameSession,
  name = "Guest",
): SavedHighScore | null {
  const key = getHighScoreKey(session.settings);
  try {
    const previous = readStoredHighScore(window.localStorage.getItem(key));
    if (previous && results.score <= previous.score) return null;
    const recordId = createRoundId();
    window.localStorage.setItem(key, JSON.stringify({
      score: results.score,
      name: name.trim().slice(0, 32) || "Guest",
      recordId,
    }));
    return { key, recordId };
  } catch {
    // Local persistence is optional; a blocked storage API should not stop play.
    return null;
  }
}

export function nameSavedHighScore(saved: SavedHighScore, name: string): boolean {
  try {
    const current = readStoredHighScore(window.localStorage.getItem(saved.key));
    if (current?.recordId !== saved.recordId) return false;
    window.localStorage.setItem(saved.key, JSON.stringify({ ...current, name: name.trim().slice(0, 32) || "Guest" }));
    return true;
  } catch {
    return false;
  }
}
