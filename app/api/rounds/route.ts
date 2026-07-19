import { DatabaseUnavailableError, getD1Database } from "../../../db";
import {
  parseRoundWritePayload,
  type RoundWritePayload,
} from "../../persistence/round-payload";
import {
  AGGREGATE_RETENTION_MS,
  hashDeletionToken,
  prepareRoundBatch,
  pruneExpiredData,
} from "../../persistence/server";

const MAX_BODY_BYTES = 64 * 1_024;

export async function POST(request: Request): Promise<Response> {
  if (bodyIsTooLarge(request)) {
    return json({ error: "Request is too large." }, 413);
  }

  let payload: RoundWritePayload | null;
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > MAX_BODY_BYTES) {
      return json({ error: "Request is too large." }, 413);
    }
    payload = parseRoundWritePayload(JSON.parse(rawBody));
  } catch {
    payload = null;
  }
  if (!payload) {
    return json({ error: "Invalid round summary." }, 400);
  }

  try {
    const db = await getD1Database();
    const now = Date.now();
    const visitorExpiresAt = now + AGGREGATE_RETENTION_MS;
    const deletionTokenHash = await hashDeletionToken(payload.deletionToken);

    await db
      .prepare(
        `INSERT INTO visitors (
          id, deletion_token_hash, first_referral_code,
          created_at, last_seen_at, expires_at
        ) VALUES (?, ?, NULL, ?, ?, ?)
        ON CONFLICT(id) DO NOTHING`,
      )
      .bind(
        payload.visitorId,
        deletionTokenHash,
        now,
        now,
        visitorExpiresAt,
      )
      .run();

    const visitor = await findVisitor(db, payload.visitorId);
    if (!visitor || visitor.deletion_token_hash !== deletionTokenHash) {
      return json({ error: "Identity could not be verified." }, 403);
    }

    await db
      .prepare(
        "UPDATE visitors SET last_seen_at = ?, expires_at = ? WHERE id = ?",
      )
      .bind(now, visitorExpiresAt, payload.visitorId)
      .run();

    if (await roundExists(db, payload.roundId, payload.visitorId)) {
      return json({ status: "duplicate" }, 200);
    }

    try {
      await db.batch(prepareRoundBatch(db, payload, now));
    } catch {
      if (await roundExists(db, payload.roundId, payload.visitorId)) {
        return json({ status: "duplicate" }, 200);
      }
      return json({ error: "Round could not be saved." }, 500);
    }

    try {
      await pruneExpiredData(db, now);
    } catch {
      // Expiry cleanup is best-effort and must never invalidate a saved round.
    }

    return json({ status: "created" }, 201);
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return json({ error: "Progress storage is unavailable." }, 503);
    }
    return json({ error: "Round could not be saved." }, 500);
  }
}

async function findVisitor(
  db: D1Database,
  visitorId: string,
): Promise<{ readonly deletion_token_hash: string } | null> {
  return db
    .prepare("SELECT deletion_token_hash FROM visitors WHERE id = ?")
    .bind(visitorId)
    .first<{ readonly deletion_token_hash: string }>();
}

async function roundExists(
  db: D1Database,
  roundId: string,
  visitorId: string,
): Promise<boolean> {
  const row = await db
    .prepare("SELECT id FROM rounds WHERE id = ? AND visitor_id = ?")
    .bind(roundId, visitorId)
    .first<{ readonly id: string }>();
  return row !== null;
}

function bodyIsTooLarge(request: Request): boolean {
  const rawLength = request.headers.get("content-length");
  if (!rawLength) return false;
  const length = Number(rawLength);
  return Number.isFinite(length) && length > MAX_BODY_BYTES;
}

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
