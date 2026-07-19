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

The CSP allows inline scripts and styles because the current Vinext RSC output
requires them. It permits Blob scripts for Troika's generated 3D text worker and
does not allow `unsafe-eval` in production.

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
- No private server secret is required for launch. The PostHog project token and
  app release are intentionally public client configuration; D1 is a managed
  runtime binding.

## Retention and deletion

- Raw rounds: 90 days.
- Aggregate mastery and referral attribution: 12 months.
- Product analytics: 12 months.
- Sanitized errors: 30 days.
- The privacy page can delete the current device's anonymous server progress and
  all local `shortcut-hero:` data after explicit confirmation.

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
