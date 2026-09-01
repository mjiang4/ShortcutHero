# Shortcut Hero security and privacy controls

## Launch posture

- Public play is anonymous; no account or server-side name is required.
- D1 writes use a random visitor ID plus a device-held deletion secret. Only a
  SHA-256 hash of that secret is stored server-side.
- Request bodies are size-limited and parsed through one boundary before domain
  validation.
- Round writes are limited to 20 per visitor per five minutes. Referral-code
  requests are limited to 10 per visitor per hour.
- Round IDs are idempotent. Referral conversions reject same-visitor referrals
  and repeated credit.

## Browser protections

Every response receives:

- a Content Security Policy restricted to the app and PostHog US ingestion;
- clickjacking protection;
- MIME sniffing protection;
- strict referrer, permissions, opener, and resource policies;
- one-year HSTS in production-compatible responses.

The CSP allows inline scripts and styles because the current Next.js RSC output
requires them. It permits Blob scripts for Troika's generated 3D text worker and
does not allow `unsafe-eval` in production.
Only the `localhost` host omits the HTTPS-upgrade directive so Safari can load a
local HTTP preview. Public hosts keep the directive and the full production policy.

## Analytics and errors

- Session replay, autocapture, automatic page events, and automatic exception
  capture are off.
- Typed product events exclude names, emails, action text, shortcut text, and
  pressed keys.
- Error boundaries send only a sanitized error type, boundary, route, opaque
  digest, and release. Raw messages, stack inputs, component data, and entered
  values are not sent.
- Set `NEXT_PUBLIC_APP_RELEASE` to the deployed commit SHA and configure
  PostHog error retention to 30 days.
- Application routes return generic failures and must never log request bodies,
  deletion secrets, names, or keystrokes.
- Vercel validates and forwards only the three existing persistence endpoints to
  the HTTPS origin in `SHORTCUT_HERO_BACKEND_ORIGIN`. The Sites backend retains
  D1 identity checks, rate limits, idempotency, retention, and deletion behavior.
- Forwarded requests omit browser cookies, authorization, origin, and forwarded-IP
  headers. Redirects are rejected, responses are not cached, and requests time out
  after ten seconds. Missing configuration or an unavailable backend returns 503.
- No new database credential is required. The PostHog project token and app release
  are intentionally public client configuration; the backend origin stays server-only.

## Retention and deletion

- Raw rounds: 90 days.
- Aggregate mastery and referral attribution: 12 months.
- Product analytics: 12 months.
- Sanitized errors: 30 days.
- The privacy page can delete the current device's anonymous server progress and
  all local `shortcut-hero:` data after explicit confirmation.
- Identities are local to a site origin. A new domain does not automatically gain
  the old domain's deletion secret; old-domain data can still be deleted there.

## Dependency audit

As of July 19, 2026, `npm audit --omit=dev` reports zero production
vulnerabilities. The patched Vite, Wrangler, and Cloudflare plugin releases also
remove all high-severity development advisories.

Four moderate development-only findings remain in Drizzle Kit's legacy
`@esbuild-kit` loader. The affected esbuild development-server behavior is not
used by the application, CI server, or production bundle; Drizzle Kit runs only
as a local schema-to-migration generator. npm offers only a breaking downgrade,
so the exception is documented until Drizzle removes that dependency.

Report a security concern through the public repository without including
secrets, private data, or exploit payloads that affect other users.
