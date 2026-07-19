import { DatabaseUnavailableError, getD1Database } from "../../../db";
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
    if (!(await verifyOrCreateVisitor(db, payload, now))) {
      return json({ error: "Identity could not be verified." }, 403);
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
