import { DatabaseUnavailableError, getD1Database } from "../../../../db";
import { parseDeletionRequest } from "../../../persistence/round-payload";
import {
  getOrCreateReferralCode,
  verifyOrCreateVisitor,
} from "../../../referrals/server";

export async function POST(request: Request): Promise<Response> {
  let identity: ReturnType<typeof parseDeletionRequest>;
  try {
    identity = parseDeletionRequest(await request.json());
  } catch {
    identity = null;
  }
  if (!identity) return json({ error: "Invalid identity." }, 400);

  try {
    const db = await getD1Database();
    const now = Date.now();
    if (!(await verifyOrCreateVisitor(db, identity, now))) {
      return json({ error: "Identity could not be verified." }, 403);
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
