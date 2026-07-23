# Deployment

## Target platform

Shortcut Hero deploys as a **Cloudflare Worker** app built with **vinext**, with:

- Static/asset serving via the worker `ASSETS` binding
- **D1** database binding `DB` (from `.openai/hosting.json`)
- Optional Images binding for `/_vinext/image` optimization (`worker/index.ts`)

## Build

```bash
npm run build
npm run start   # smoke the production build locally via vinext
```

Ensure `npm run check` is green on branch `michael` before promoting a review build.

## D1 production migrations

1. Generate SQL from schema: `npm run db:generate`
2. Apply to **remote** D1 with Wrangler (project-specific database id/name — not the local placeholder UUID)
3. Confirm binding name remains `DB`
4. Smoke `GET /api/leaderboard` and a test `POST /api/rounds` against the deployed URL

Never point production at `wrangler.local.jsonc` placeholder state.

## Environment / secrets

- Prefer platform secret store for any analytics keys
- Do not commit `.env` files with secrets
- Anonymous play needs no auth secrets for MVP

## Rollback

| Layer | Action |
|---|---|
| Worker/assets | Rollback to previous Worker deployment in Cloudflare dashboard/CLI |
| D1 schema | Prefer forward-fix migrations; avoid destructive drops without backup export |
| Client-only bug | Redeploy previous build; D1 data remains |

## Health checks

After deploy:

1. Title screen renders (WebGL context OK)
2. `GET /api/leaderboard` → 200
3. Complete a short run → results → round `201`/`200 duplicate`
4. Security headers present on HTML responses

## Review workflow note

Preview/review builds should be cut from **`michael`** for teammate evaluation. Production cutovers to `main` happen only after explicit approval (see [CONTRIBUTING.md](./CONTRIBUTING.md)).
