import { DatabaseUnavailableError, getD1Database } from "../../../db";
import { invalidJsonResponse, readJsonRequest } from "../request";
import {
  parseRoundWritePayload,
  type RoundWritePayload,
} from "../../persistence/round-payload";
import {
  prepareRoundBatch,
  pruneExpiredData,
} from "../../persistence/server";
import {
  claimFirstReferral,
  verifyOrCreateVisitor,
} from "../../referrals/server";
import {
  consumeRateLimit,
  rateLimitResponse,
  ROUND_WRITE_LIMIT,
} from "../../security/rate-limit";

const MAX_BODY_BYTES = 64 * 1_024;

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequest(request, MAX_BODY_BYTES);
  if (!body.ok) return invalidJsonResponse(body.status);
  const payload: RoundWritePayload | null = parseRoundWritePayload(body.value);
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
      return json(
        {
          status: "duplicate",
          referralConverted: await roundHasReferralConversion(
            db,
            payload.roundId,
            payload.visitorId,
          ),
        },
        200,
      );
    }

    const attributedReferralCode = await claimFirstReferral(
      db,
      payload.visitorId,
      payload.referralCode,
      now,
    );
    let referralConverted = false;
    try {
      const results = await db.batch(
        prepareRoundBatch(db, payload, now, attributedReferralCode),
      );
      referralConverted = Boolean(
        attributedReferralCode && results.at(-1)?.meta.changes === 1,
      );
    } catch {
      if (await roundExists(db, payload.roundId, payload.visitorId)) {
        return json(
          {
            status: "duplicate",
            referralConverted: await roundHasReferralConversion(
              db,
              payload.roundId,
              payload.visitorId,
            ),
          },
          200,
        );
      }
      return json({ error: "Round could not be saved." }, 500);
    }

    try {
      await pruneExpiredData(db, now);
    } catch {
      // Expiry cleanup is best-effort and must never invalidate a saved round.
    }

    return json({ status: "created", referralConverted }, 201);
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

async function roundHasReferralConversion(
  db: D1Database,
  roundId: string,
  visitorId: string,
): Promise<boolean> {
  const row = await db
    .prepare(
      `SELECT id FROM referral_conversions
      WHERE completed_round_id = ? AND referred_visitor_id = ?`,
    )
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
