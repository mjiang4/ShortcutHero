import type { RoundWritePayload } from "./round-payload";

export const RAW_ROUND_RETENTION_MS = 90 * 24 * 60 * 60 * 1_000;
export const AGGREGATE_RETENTION_MS = 365 * 24 * 60 * 60 * 1_000;

export async function hashDeletionToken(token: string): Promise<string> {
  const digest = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(token),
  );
  return [...new Uint8Array(digest)]
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}

export function prepareRoundBatch(
  db: D1Database,
  payload: RoundWritePayload,
  now: number,
  attributedReferralCode: string | null = null,
): D1PreparedStatement[] {
  const roundExpiresAt = now + RAW_ROUND_RETENTION_MS;
  const masteryExpiresAt = now + AGGREGATE_RETENTION_MS;
  const statements = [
    db
      .prepare(
        `INSERT INTO rounds (
          id, visitor_id, track_id, difficulty, guidance, pace,
          session_seconds, sound_enabled, effects_mode, score, accuracy_pct,
          longest_combo, attempts, correct_answers, misses,
          unique_shortcuts_correct, duration_ms, completed_at, expires_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        payload.roundId,
        payload.visitorId,
        payload.trackId,
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
  if (attributedReferralCode) {
    statements.push(
      db
        .prepare(
          `INSERT INTO referral_conversions (
            id, referral_code, referred_visitor_id, completed_round_id,
            converted_at, expires_at
          ) VALUES (?, ?, ?, ?, ?, ?)
          ON CONFLICT(referral_code, referred_visitor_id) DO NOTHING`,
        )
        .bind(
          `rc_${crypto.randomUUID()}`,
          attributedReferralCode,
          payload.visitorId,
          payload.roundId,
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
    db.prepare("DELETE FROM referral_conversions WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM referral_codes WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM rounds WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM shortcut_mastery WHERE expires_at < ?").bind(now),
    db.prepare("DELETE FROM visitors WHERE expires_at < ?").bind(now),
  ]);
}
