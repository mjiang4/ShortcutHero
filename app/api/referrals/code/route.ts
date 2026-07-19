import { DatabaseUnavailableError, getD1Database } from "../../../../db";
import { invalidJsonResponse, readJsonRequest } from "../../request";
import { parseDeletionRequest } from "../../../persistence/round-payload";
import {
  getOrCreateReferralCode,
  verifyOrCreateVisitor,
} from "../../../referrals/server";
import {
  consumeRateLimit,
  rateLimitResponse,
  REFERRAL_CODE_LIMIT,
} from "../../../security/rate-limit";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequest(request, 2_048);
  if (!body.ok) return invalidJsonResponse(body.status);
  const identity = parseDeletionRequest(body.value);
  if (!identity) return json({ error: "Invalid identity." }, 400);

  try {
    const db = await getD1Database();
    const now = Date.now();
    if (!(await verifyOrCreateVisitor(db, identity, now))) {
      return json({ error: "Identity could not be verified." }, 403);
    }
    const rateLimit = await consumeRateLimit(
      db,
      identity.visitorId,
      REFERRAL_CODE_LIMIT,
      now,
    );
    if (!rateLimit.allowed) {
      return rateLimitResponse(rateLimit.retryAfterSeconds);
    }
    const code = await getOrCreateReferralCode(db, identity.visitorId, now);
    return json({ code }, 200);
  } catch (error) {
    const status = error instanceof DatabaseUnavailableError ? 503 : 500;
    return json({ error: "Referral code is unavailable." }, status);
  }
}

function json(body: unknown, status: number): Response {
  return Response.json(body, {
    status,
    headers: { "cache-control": "no-store" },
  });
}
