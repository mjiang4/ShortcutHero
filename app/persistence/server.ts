import type { RoundWritePayload } from "./round-payload";

export const RAW_ROUND_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;
export const AGGREGATE_RETENTION_MS = 365 * 24 * 60 * 60 * 1_000;
export const LEADERBOARD_RETENTION_MS = 365 * 24 * 60 * 60 * 1_000;

export async function hashDeletionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export async function verifyOrCreateVisitor(
  db: D1Database,
  payload: Pick<RoundWritePayload, "visitorId" | "deletionToken" | "displayName">,
  now: number,
): Promise<boolean> {
  const tokenHash = await hashDeletionToken(payload.deletionToken);
  const expiresAt = now + AGGREGATE_RETENTION_MS;
  const existing = await db
    .prepare("SELECT deletion_token_hash FROM visitors WHERE id = ?")
    .bind(payload.visitorId)
    .first<{ readonly deletion_token_hash: string }>();

  if (existing) {
    if (existing.deletion_token_hash !== tokenHash) return false;
    await db
      .prepare(
        `UPDATE visitors
         SET last_seen_at = ?, expires_at = ?, display_name = ?
         WHERE id = ?`,
      )
      .bind(now, expiresAt, payload.displayName, payload.visitorId)
      .run();
    return true;
  }

  await db
    .prepare(
      `INSERT INTO visitors (
        id, deletion_token_hash, display_name, created_at, last_seen_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      payload.visitorId,
      tokenHash,
      payload.displayName,
      now,
      now,
      expiresAt,
    )
    .run();
  return true;
}

export function prepareRoundBatch(
  db: D1Database,
  payload: RoundWritePayload,
  now: number,
): D1PreparedStatement[] {
  const roundExpiresAt = now + RAW_ROUND_RETENTION_MS;
  const masteryExpiresAt = now + AGGREGATE_RETENTION_MS;
  const leaderboardExpiresAt = now + LEADERBOARD_RETENTION_MS;
  const statements = [
    db
      .prepare(
        `INSERT INTO rounds (
          id, visitor_id, track_id, run_mode, difficulty, guidance, pace,
          session_seconds, sound_enabled, effects_mode, score, accuracy_pct,
          longest_combo, attempts, correct_answers, misses,
          unique_shortcuts_correct, duration_ms, completed_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        payload.roundId,
        payload.visitorId,
        payload.trackId,
        payload.runMode,
        payload.difficulty,
        payload.guidance,
        payload.pace,
        payload.sessionSeconds,
        payload.soundEnabled ? 1 : 0,
        payload.effectsMode,
        payload.score,
        payload.accuracyPct,
        payload.longestCombo,
        payload.attempts,
        payload.correctAnswers,
        payload.misses,
        payload.uniqueShortcutsCorrect,
        payload.durationMs,
        now,
        roundExpiresAt,
      ),
    db
      .prepare(
        `INSERT INTO leaderboard_entries (
          id, visitor_id, round_id, track_id, run_mode, display_name,
          score, accuracy_pct, longest_combo, difficulty, completed_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        `lb_${crypto.randomUUID().replaceAll("-", "")}`,
        payload.visitorId,
        payload.roundId,
        payload.trackId,
        payload.runMode,
        payload.displayName,
        payload.score,
        payload.accuracyPct,
        payload.longestCombo,
        payload.difficulty,
        now,
        leaderboardExpiresAt,
      ),
  ];

  for (const delta of payload.mastery) {
    statements.push(
      db
        .prepare(
          `INSERT INTO shortcut_mastery (
            visitor_id, track_id, shortcut_id, attempts, correct, clean_hits,
            perfect_hits, misses, updated_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(visitor_id, track_id, shortcut_id) DO UPDATE SET
            attempts = shortcut_mastery.attempts + excluded.attempts,
            correct = shortcut_mastery.correct + excluded.correct,
            clean_hits = shortcut_mastery.clean_hits + excluded.clean_hits,
            perfect_hits = shortcut_mastery.perfect_hits + excluded.perfect_hits,
            misses = shortcut_mastery.misses + excluded.misses,
            updated_at = excluded.updated_at,
            expires_at = excluded.expires_at`,
        )
        .bind(
          payload.visitorId,
          payload.trackId,
          delta.shortcutId,
          delta.attempts,
          delta.correct,
          delta.cleanHits,
          delta.perfectHits,
          delta.misses,
          now,
          masteryExpiresAt,
        ),
    );
  }

  return statements;
}

export async function pruneExpiredData(
  db: D1Database,
  now: number,
): Promise<void> {
  await db.batch([
    db.prepare("DELETE FROM leaderboard_entries WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM rounds WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM shortcut_mastery WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM visitors WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM rate_limits WHERE expires_at < ?").bind(now),
  ]);
}

export type LeaderboardRow = {
  readonly rank: number;
  readonly displayName: string;
  readonly score: number;
  readonly accuracyPct: number;
  readonly longestCombo: number;
  readonly trackId: string;
  readonly difficulty: string;
  readonly runMode: string;
  readonly completedAt: number;
  readonly visitorId: string;
};

export async function fetchLeaderboard(
  db: D1Database,
  options: {
    readonly trackId?: string;
    readonly runMode?: string;
    readonly limit?: number;
  } = {},
): Promise<readonly LeaderboardRow[]> {
  const limit = Math.min(Math.max(options.limit ?? 25, 1), 100);
  const clauses: string[] = ["expires_at > ?"];
  const binds: Array<string | number> = [Date.now()];

  if (options.trackId) {
    clauses.push("track_id = ?");
    binds.push(options.trackId);
  }
  if (options.runMode) {
    clauses.push("run_mode = ?");
    binds.push(options.runMode);
  }

  const rows = await db
    .prepare(
      `SELECT visitor_id, display_name, score, accuracy_pct, longest_combo,
              track_id, difficulty, run_mode, completed_at
       FROM leaderboard_entries
       WHERE ${clauses.join(" AND ")}
       ORDER BY score DESC, completed_at ASC
       LIMIT ?`,
    )
    .bind(...binds, limit)
    .all<{
      readonly visitor_id: string;
      readonly display_name: string;
      readonly score: number;
      readonly accuracy_pct: number;
      readonly longest_combo: number;
      readonly track_id: string;
      readonly difficulty: string;
      readonly run_mode: string;
      readonly completed_at: number;
    }>();

  return (rows.results ?? []).map((row, index) => ({
    rank: index + 1,
    visitorId: row.visitor_id,
    displayName: row.display_name,
    score: row.score,
    accuracyPct: row.accuracy_pct,
    longestCombo: row.longest_combo,
    trackId: row.track_id,
    difficulty: row.difficulty,
    runMode: row.run_mode,
    completedAt: row.completed_at,
  }));
}
