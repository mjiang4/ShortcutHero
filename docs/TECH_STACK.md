# Tech stack

## Runtime

| Layer | Choice | Notes |
|---|---|---|
| Node | **≥ 22.13.0** | Enforced in `package.json` `engines` |
| Package manager | npm | Lockfile committed |
| Language | TypeScript **5.9** | `tsc --noEmit` via `npm run typecheck` |
| Module system | ESM | `"type": "module"` |

## App framework

| Piece | Package / version | Role |
|---|---|---|
| App Router shape | **Next.js 16** (`next`) | File-based `app/` routes, RSC conventions |
| Bundler / Dev | **Vite 8** + **vinext 0.0.50** | `vinext dev` / `build` / `start` |
| React | **19.2** | UI + client gameplay |
| Cloudflare adapter | `@cloudflare/vite-plugin` | Workers + D1 bindings in Vite |
| Worker entry | `worker/index.ts` | Image optimization + vinext App Router handler |
| Hosting config | `.openai/hosting.json` | Declares D1 binding name `DB` |

Shortcut Hero is **not** a classic `next start` Node server in production. Local and deploy target the **vinext + Cloudflare Workers** path.

## Rendering & gameplay client

| Library | Role |
|---|---|
| **three** | WebGL scene graph |
| **@react-three/fiber** | React renderer for Three |
| **@react-three/drei** | Helpers (controls, text, etc. as used) |
| **@react-three/postprocessing** / **postprocessing** | Bloom and cinematic FX |
| Web Audio API | Procedural music + SFX (`app/audio`) |

## Data

| Piece | Role |
|---|---|
| **Cloudflare D1** | SQLite at the edge; binding `DB` |
| **drizzle-orm** + **drizzle-kit** | Schema in `db/schema.ts`, SQL migrations in `drizzle/` |
| **Wrangler** | Local D1 (`wrangler.local.jsonc`), migrations apply |
| Browser `localStorage` | Anonymous identity, display name, settings, demo flags |

## Styling

- **Tailwind CSS 4** (`@tailwindcss/postcss`)
- Design tokens / Golden Signal documented in [DESIGN_IDENTITY.md](./DESIGN_IDENTITY.md)
- Per-tool accents in `app/tools/themes.ts`

## Quality tooling

| Script | What it runs |
|---|---|
| `npm run lint` | ESLint 9 + `eslint-config-next` |
| `npm run typecheck` | `tsc --noEmit` |
| `npm run test:unit` | Node test runner via `tsx --test` on listed unit files |
| `npm run test:render` | Build + HTML smoke (`tests/rendered-html.test.mjs`) |
| `npm test` | unit + render |
| `npm run check` | lint + typecheck + test |
| Playwright specs | `tests/browser/*.spec.ts` (browser flows) |

## Optional / adjacent

- Referrals / share helpers may be ported from `main` patterns; treat as feature-gated until wired on `michael`.
- Analytics (client event bus / PostHog-style sinks) — see [ANALYTICS.md](./ANALYTICS.md); keep privacy-first.

## What we deliberately do not use (MVP)

- ORM against Postgres/Neon (D1/SQLite only)
- Auth providers (Clerk, etc.) — anonymous visitors only until extension phase E3
- Live Slack/Spotify SDKs — content packs only
