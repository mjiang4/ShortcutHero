# Shortcut Hero Launch

## One-line pitch

Shortcut Hero turns Linear keyboard shortcuts into a fast 3D rhythm game.

## Launch post

I built Guitar Hero for keyboard shortcuts.

Shortcut Hero helps you learn Linear by striking real commands on a 3D action highway. Build combos, practise from memory, and see exactly which shortcuts you know after every round.

It runs in the browser. Linear is live; Excel, Notion, Jira, Superhuman, and more are next.

Play: **[production URL]**

## 45-second demo

1. **0–5s:** Open on the main menu. Say: “This is Guitar Hero for keyboard shortcuts.”
2. **5–10s:** Show Novice, Learn, and the pace control.
3. **10–30s:** Start a round. Land three clean hits, build a combo, then show one miss.
4. **30–40s:** End on results. Show accuracy and the exact shortcuts learned or missed.
5. **40–45s:** Share the challenge link. Close with the upcoming tool tracks.

Keep the browser full-screen, pointer off-screen, sound on, and recording at 60 fps.

## Production values

Set these for the production build:

```bash
NEXT_PUBLIC_SITE_URL=https://your-domain.example
NEXT_PUBLIC_APP_RELEASE=<git-commit-sha>
NEXT_PUBLIC_POSTHOG_PROJECT_TOKEN=<posthog-project-token>
NEXT_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
NEXT_PUBLIC_POSTHOG_REPLAY_ENABLED=false
```

The canonical URL, social image, robots file, and sitemap use
`NEXT_PUBLIC_SITE_URL`. Leave replay off for launch.

## Social preview

`public/og.png` is generated from the live game at 1200×630. To refresh it:

```bash
npm run dev -- --port 3108
SOCIAL_CARD_BASE_URL=http://localhost:3108 npm run social-card
```

Before posting, validate the deployed URL in X, Slack, iMessage, and LinkedIn.
Each platform caches preview images, so use its refresh tool after replacing the
image.
