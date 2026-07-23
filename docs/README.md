# Shortcut Hero documentation

Internal product and engineering docs for Shortcut Hero. Start here; keep the root [README](../README.md) short.

## Branch workflow

Active development for this overhaul lives on **`michael`**. Teammates review that branch first. Do **not** merge to `main` until review approval. See [CONTRIBUTING.md](./CONTRIBUTING.md).

## How to navigate

| If you need… | Read |
|---|---|
| What the product is | [PRODUCT_OVERVIEW.md](./PRODUCT_OVERVIEW.md) |
| Shared vocabulary | [GLOSSARY.md](./GLOSSARY.md) |
| Languages, runtimes, hosts | [TECH_STACK.md](./TECH_STACK.md) |
| System + module map | [ARCHITECTURE.md](./ARCHITECTURE.md) |
| Run the app + D1 locally | [LOCAL_DEVELOPMENT.md](./LOCAL_DEVELOPMENT.md) |
| Schema, retention, migrations | [DATABASE.md](./DATABASE.md) |
| HTTP routes | [API.md](./API.md) |
| Session, scoring, tempo | [GAME_ENGINE.md](./GAME_ENGINE.md) |
| Standalone + interlude modes | [MINI_GAMES.md](./MINI_GAMES.md) |
| Shortcut packs + themes | [TOOLS_AND_TRACKS.md](./TOOLS_AND_TRACKS.md) |
| UI / R3F / Golden Signal | [FRONTEND_AND_DESIGN.md](./FRONTEND_AND_DESIGN.md) |
| Web Audio | [AUDIO.md](./AUDIO.md) |
| Client events | [ANALYTICS.md](./ANALYTICS.md) |
| Identity, headers, deletion | [SECURITY_AND_PRIVACY.md](./SECURITY_AND_PRIVACY.md) |
| Unit / render / browser checks | [TESTING.md](./TESTING.md) |
| Cloudflare deploy | [DEPLOYMENT.md](./DEPLOYMENT.md) |
| PR and doc rules | [CONTRIBUTING.md](./CONTRIBUTING.md) |
| Ops incidents | [RUNBOOK.md](./RUNBOOK.md) |
| Modes, feel, clarity goals | [GAME_DESIGN.md](./GAME_DESIGN.md) |
| Visual source of truth | [DESIGN_IDENTITY.md](./DESIGN_IDENTITY.md) |
| Post-MVP roadmap E0–E8 | [EXTENSION_PHASED_PLAN.md](./EXTENSION_PHASED_PLAN.md) |
| Embed route + Codex plugin | [EMBED_AND_CODEX_PLUGIN.md](./EMBED_AND_CODEX_PLUGIN.md) |
| Architecture Decision Records | [DECISIONS.md](./DECISIONS.md) |

## Ownership

- **Product / design:** PRODUCT_OVERVIEW, GAME_DESIGN, DESIGN_IDENTITY, EXTENSION_PHASED_PLAN
- **Platform:** TECH_STACK, ARCHITECTURE, LOCAL_DEVELOPMENT, DATABASE, API, DEPLOYMENT, RUNBOOK
- **Gameplay:** GAME_ENGINE, MINI_GAMES, TOOLS_AND_TRACKS, AUDIO, FRONTEND_AND_DESIGN
- **Trust:** SECURITY_AND_PRIVACY, ANALYTICS, TESTING
- **Process:** CONTRIBUTING, DECISIONS

## Doc hygiene

1. Prefer `docs/` over new root markdown.
2. Ship code and doc updates in the same change set on `michael`.
3. Use Mermaid for architecture, ERD, and session FSM diagrams when they clarify behavior.
4. Prefer accurate “current vs planned” callouts over aspirational claims presented as shipped.
