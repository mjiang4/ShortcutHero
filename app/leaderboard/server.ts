import { neon, type NeonQueryFunction } from "@neondatabase/serverless";

import {
  LEADERBOARD_SIZE,
  boardKey,
  type LeaderboardBoard,
  type LeaderboardEntry,
  type LeaderboardPostPayload,
} from "./contract";

const RETENTION = "90 days";
const POSTS_PER_HOUR = 10;

let sql: NeonQueryFunction<false, false> | null = null;
let schemaReady: Promise<void> | null = null;
const recentPosts = new Map<string, number[]>();

export function isLeaderboardConfigured(): boolean {
  return Boolean(process.env.POSTGRES_URL);
}

/** Vercel's Neon integration injects POSTGRES_URL; the table creates itself on first use. */
async function db(): Promise<NeonQueryFunction<false, false>> {
  if (!sql) sql = neon(process.env.POSTGRES_URL ?? "");
  schemaReady ??= (async () => {
    await sql!`
      CREATE TABLE IF NOT EXISTS leaderboard (
        id bigserial PRIMARY KEY,
        visitor_id text NOT NULL,
        deletion_token_hash text NOT NULL,
        board_key text NOT NULL,
        name text NOT NULL,
        score integer NOT NULL,
        completed_at timestamptz NOT NULL DEFAULT now(),
        UNIQUE (visitor_id, board_key)
      )`;
    await sql!`CREATE INDEX IF NOT EXISTS leaderboard_board_score ON leaderboard (board_key, score DESC)`;
  })().catch((error: unknown) => {
    schemaReady = null;
    throw error;
  });
  await schemaReady;
  return sql;
}

export async function readLeaderboard(board: LeaderboardBoard): Promise<readonly LeaderboardEntry[]> {
  const rows = await (await db())`
    SELECT name, score, completed_at
    FROM leaderboard
    WHERE board_key = ${boardKey(board)} AND completed_at > now() - ${RETENTION}::interval
    ORDER BY score DESC, completed_at ASC
    LIMIT ${LEADERBOARD_SIZE}`;
  return rows.map((row) => ({
    name: String(row.name),
    score: Number(row.score),
    completedAt: new Date(row.completed_at as string).toISOString(),
  }));
}

export type LeaderboardPostResult =
  | { readonly ok: true; readonly rank: number | null; readonly entries: readonly LeaderboardEntry[] }
  | { readonly ok: false; readonly status: 429 };

/** One row per visitor and board; a lower score never overwrites a higher one. */
export async function postLeaderboardScore(payload: LeaderboardPostPayload): Promise<LeaderboardPostResult> {
  if (!allowPost(payload.visitorId)) return { ok: false, status: 429 };
  const key = boardKey(payload);
  const tokenHash = await sha256(payload.deletionToken);
  const query = await db();
  await query`
    INSERT INTO leaderboard (visitor_id, deletion_token_hash, board_key, name, score)
    VALUES (${payload.visitorId}, ${tokenHash}, ${key}, ${payload.name}, ${payload.score})
    ON CONFLICT (visitor_id, board_key) DO UPDATE SET
      name = EXCLUDED.name,
      deletion_token_hash = EXCLUDED.deletion_token_hash,
      score = GREATEST(leaderboard.score, EXCLUDED.score),
      completed_at = CASE WHEN EXCLUDED.score > leaderboard.score THEN now() ELSE leaderboard.completed_at END`;
  const [row] = await query`
    SELECT 1 + count(*)::int AS rank
    FROM leaderboard
    WHERE board_key = ${key} AND completed_at > now() - ${RETENTION}::interval
      AND score > (SELECT score FROM leaderboard WHERE visitor_id = ${payload.visitorId} AND board_key = ${key})`;
  const rank = row ? Number(row.rank) : null;
  return {
    ok: true,
    rank: rank !== null && rank <= LEADERBOARD_SIZE ? rank : null,
    entries: await readLeaderboard(payload),
  };
}

export async function deleteLeaderboardScores(visitorId: string, deletionToken: string): Promise<void> {
  const tokenHash = await sha256(deletionToken);
  await (await db())`DELETE FROM leaderboard WHERE visitor_id = ${visitorId} AND deletion_token_hash = ${tokenHash}`;
}

function allowPost(visitorId: string): boolean {
  const now = Date.now();
  const recent = (recentPosts.get(visitorId) ?? []).filter((at) => now - at < 3_600_000);
  if (recent.length >= POSTS_PER_HOUR) return false;
  recent.push(now);
  recentPosts.set(visitorId, recent);
  return true;
}

async function sha256(value: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value));
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}
