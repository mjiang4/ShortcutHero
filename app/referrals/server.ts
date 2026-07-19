import type { AnonymousIdentity } from "../identity/anonymous-identity";
import {
  AGGREGATE_RETENTION_MS,
  hashDeletionToken,
} from "../persistence/server";
import { normalizeReferralCode } from "./contract";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 8;
const MAX_CODE_ATTEMPTS = 5;

export async function verifyOrCreateVisitor(
  db: D1Database,
  identity: AnonymousIdentity,
  now: number,
): Promise<boolean> {
  const deletionTokenHash = await hashDeletionToken(identity.deletionToken);
  const expiresAt = now + AGGREGATE_RETENTION_MS;
  await db
    .prepare(
      `INSERT INTO visitors (
        id, deletion_token_hash, first_referral_code,
        created_at, last_seen_at, expires_at
      ) VALUES (?, ?, NULL, ?, ?, ?)
      ON CONFLICT(id) DO NOTHING`,
    )
    .bind(identity.visitorId, deletionTokenHash, now, now, expiresAt)
    .run();

  const visitor = await db
    .prepare("SELECT deletion_token_hash FROM visitors WHERE id = ?")
    .bind(identity.visitorId)
    .first<{ readonly deletion_token_hash: string }>();
  if (!visitor || visitor.deletion_token_hash !== deletionTokenHash) {
    return false;
  }

  await db
    .prepare("UPDATE visitors SET last_seen_at = ?, expires_at = ? WHERE id = ?")
    .bind(now, expiresAt, identity.visitorId)
    .run();
  return true;
}

export async function getOrCreateReferralCode(
  db: D1Database,
  visitorId: string,
  now: number,
): Promise<string> {
  const existing = await findVisitorReferralCode(db, visitorId);
  if (existing) {
    await db
      .prepare(
        "UPDATE referral_codes SET expires_at = ? WHERE visitor_id = ?",
      )
      .bind(now + AGGREGATE_RETENTION_MS, visitorId)
      .run();
    return existing;
  }

  for (let attempt = 0; attempt < MAX_CODE_ATTEMPTS; attempt += 1) {
    const code = generateReferralCode();
    try {
      await db
        .prepare(
          `INSERT INTO referral_codes (
            code, visitor_id, created_at, revoked_at, expires_at
          ) VALUES (?, ?, ?, NULL, ?)`,
        )
        .bind(code, visitorId, now, now + AGGREGATE_RETENTION_MS)
        .run();
      return code;
    } catch {
      const racedCode = await findVisitorReferralCode(db, visitorId);
      if (racedCode) return racedCode;
    }
  }
  throw new Error("A unique referral code could not be allocated.");
}

export async function claimFirstReferral(
  db: D1Database,
  visitorId: string,
  rawCode: string | undefined,
  now: number,
): Promise<string | null> {
  const code = normalizeReferralCode(rawCode);
  if (code) {
    const owner = await db
      .prepare(
        `SELECT visitor_id FROM referral_codes
        WHERE code = ? AND revoked_at IS NULL AND expires_at >= ?`,
      )
      .bind(code, now)
      .first<{ readonly visitor_id: string }>();
    if (owner && owner.visitor_id !== visitorId) {
      const extendedExpiry = now + AGGREGATE_RETENTION_MS;
      await db.batch([
        db
          .prepare(
            `UPDATE visitors SET first_referral_code = ?
            WHERE id = ? AND first_referral_code IS NULL`,
          )
          .bind(code, visitorId),
        db
          .prepare(
            `UPDATE referral_codes SET expires_at = ?
            WHERE code = ? AND expires_at < ?`,
          )
          .bind(extendedExpiry, code, extendedExpiry),
        db
          .prepare(
            `UPDATE visitors SET expires_at = ?
            WHERE id = ? AND expires_at < ?`,
          )
          .bind(extendedExpiry, owner.visitor_id, extendedExpiry),
      ]);
    }
  }

  const attribution = await db
    .prepare(
      `SELECT visitors.first_referral_code AS code
      FROM visitors
      INNER JOIN referral_codes
        ON referral_codes.code = visitors.first_referral_code
      WHERE visitors.id = ?
        AND referral_codes.visitor_id <> visitors.id
        AND referral_codes.revoked_at IS NULL
        AND referral_codes.expires_at >= ?`,
    )
    .bind(visitorId, now)
    .first<{ readonly code: string }>();
  return attribution?.code ?? null;
}

async function findVisitorReferralCode(
  db: D1Database,
  visitorId: string,
): Promise<string | null> {
  const row = await db
    .prepare("SELECT code FROM referral_codes WHERE visitor_id = ?")
    .bind(visitorId)
    .first<{ readonly code: string }>();
  return row?.code ?? null;
}

function generateReferralCode(): string {
  const bytes = new Uint8Array(REFERRAL_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return [...bytes]
    .map((byte) => REFERRAL_ALPHABET[byte % REFERRAL_ALPHABET.length])
    .join("");
}
