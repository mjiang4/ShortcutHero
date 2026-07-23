import { DatabaseUnavailableError, getD1Database } from "../../../db";
import { invalidJsonResponse, readJsonRequest } from "../request";
import { parseRoundWritePayload } from "../../persistence/round-payload";
import {
  prepareRoundBatch,
  pruneExpiredData,
  verifyOrCreateVisitor,
} from "../../persistence/server";
import {
  consumeRateLimit,
  rateLimitResponse,
  ROUND_WRITE_LIMIT,
} from "../../security/rate-limit";

const MAX_BODY_BYTES = 64 * 1_024;

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequest(request, MAX_BODY_BYTES);
  if (!body.ok) return invalidJsonResponse(body.status);
  const payload = parseRoundWritePayload(body.value);
  if (!payload) {
    return json({ error: "Invalid round summary." }, 400);
  }

  try {
    const db = await getD1Database();
    const now = Date.now();
    if (!(await verifyOrCreateVisitor(db, payload, now))) {
      return json({ error: "Identity could not be verified." }, 403);
    }
    const rateLimit = await consumeRateLimit(
      db,
      payload.visitorId,
      ROUND_WRITE_LIMIT,
      now,
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }

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
      // best-effort
    }

    return json({ status: "created" }, 201);
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return json({ error: "Progress storage is unavailable." }, 503);
    }
    return json({ error: "Round could not be saved." }, 500);
  }
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

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
