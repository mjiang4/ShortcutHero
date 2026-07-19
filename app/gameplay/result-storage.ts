import { getHighScoreKey, type GameResults, type GameSession } from "../game";

export function persistHighScore(
  results: GameResults,
  session: GameSession,
): number {
  const key = getHighScoreKey(session.settings);
  try {
    const previous = Number(window.localStorage.getItem(key) ?? 0);
    if (results.score <= previous) return previous;
    window.localStorage.setItem(key, String(results.score));
    return results.score;
  } catch {
    // Local persistence is optional; a blocked storage API should not stop play.
    return results.score;
  }
}
