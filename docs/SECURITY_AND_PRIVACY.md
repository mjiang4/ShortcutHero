# Security and privacy

## Threat model (MVP)

| Asset | Risk | Mitigation |
|---|---|---|
| Leaderboard integrity | Score spoofing | Payload validation, rate limits, bounded fields; soft anti-cheat later (E3) |
| Visitor data | Impersonation | Deletion-token hash compare on write |
| Availability | Spam writes | D1 rate limits per visitor |
| Browser | XSS / clickjacking | Security headers (`app/security/headers.ts`) |
| Privacy | Tracking surprise | Anonymous ids, privacy page, deletion path |

## Anonymous identity

Client (`app/identity/anonymous-identity.ts`):

- `visitorId` = `v_` + 32 hex
- `deletionToken` = `d_` + 64 hex
- Stored in `localStorage`

Server stores **SHA-256(deletionToken)** only. Possession of the token proves ownership for writes (and future delete-my-data).

Display names default to `Pilot-xxxx` and are pattern-limited.

## API hardening

- JSON body size cap on round write (64 KiB)
- Strict regex/enums in `parseRoundWritePayload`
- Mastery totals must reconcile with round aggregates
- Idempotent round ids
- Rate limit: 20 round writes / 5 minutes / visitor

## Headers

Centralize CSP/frame/referrer policies in security header helpers and keep tests (`headers.test.ts`) green when changing allowlists (R3F/WebGL/unsafe-eval needs are real — tighten carefully).

## Data retention

See [DATABASE.md](./DATABASE.md). Expired rows are pruned best-effort after writes.

## PII rules

- No emails/passwords in MVP
- Do not log deletion tokens
- Do not record raw keystreams in analytics
- Shortcut mastery stores shortcut ids, not free text beyond action names already public in packs

## Privacy UX

- Privacy and terms routes under `app/privacy`, `app/terms`
- Provide a clear path to delete server-side visitor data when the delete API is wired; until then document client-clear (`clearAnonymousIdentity`) vs server delete separately

## Out of scope (for now)

- Full account takeover protection / OAuth
- Cryptographic score attestation
- Enterprise SSO
