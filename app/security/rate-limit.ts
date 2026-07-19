export type RateLimitPolicy = {
  readonly scope: "round" | "referral_code";
  readonly maximum: number;
  readonly windowMs: number;
};

export type RateLimitResult = {
  readonly allowed: boolean;
  readonly retryAfterSeconds: number;
};

export const ROUND_WRITE_LIMIT: RateLimitPolicy = {
  scope: "round",
  maximum: 20,
  windowMs: 5 * 60 * 1_000,
};

export const REFERRAL_CODE_LIMIT: RateLimitPolicy = {
  scope: "referral_code",
  maximum: 10,
  windowMs: 60 * 60 * 1_000,
};

export async function consumeRateLimit(
  db: D1Database,
  visitorId: string,
  policy: RateLimitPolicy,
  now: number,
): Promise<RateLimitResult> {
  const key = `${policy.scope}:${visitorId}`;
  const cutoff = now - policy.windowMs;
  const expiresAt = now + policy.windowMs * 2;
  const row = await db
    .prepare(
      `INSERT INTO rate_limits (
        key, window_started_at, count, expires_at
      ) VALUES (?, ?, 1, ?)
      ON CONFLICT(key) DO UPDATE SET
        window_started_at = CASE
          WHEN rate_limits.window_started_at <= ? THEN excluded.window_started_at
          ELSE rate_limits.window_started_at
        END,
        count = CASE
          WHEN rate_limits.window_started_at <= ? THEN 1
          ELSE rate_limits.count + 1
        END,
        expires_at = excluded.expires_at
      RETURNING window_started_at, count`,
    )
    .bind(key, now, expiresAt, cutoff, cutoff)
    .first<{
      readonly window_started_at: number;
      readonly count: number;
    }>();
  if (!row) return { allowed: false, retryAfterSeconds: 1 };
  const retryAfterMs = Math.max(
    1_000,
    row.window_started_at + policy.windowMs - now,
  );
  return {
    allowed: row.count <= policy.maximum,
    retryAfterSeconds: Math.ceil(retryAfterMs / 1_000),
  };
}

export function rateLimitResponse(retryAfterSeconds: number): Response {
  return Response.json(
    { error: "Too many requests. Try again shortly." },
    {
      status: 429,
      headers: {
        "cache-control": "no-store",
        "retry-after": String(retryAfterSeconds),
      },
    },
  );
}
