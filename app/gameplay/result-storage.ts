import { getHighScoreKey, type GameResults, type GameSession, type KeyboardPlatform } from "../game";
import { EMPTY_CURRICULUM, type CurriculumProgress } from "../game/curriculum";

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
): boolean {
  const key = getHighScoreKey(session.settings);
  try {
    const previous = Number(window.localStorage.getItem(key) ?? 0);
    if (results.score <= previous) return false;
    window.localStorage.setItem(key, String(results.score));
    return true;
  } catch {
    // Local persistence is optional; a blocked storage API should not stop play.
    return false;
  }
}
