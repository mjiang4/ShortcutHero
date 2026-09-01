import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import { createServer, get } from "node:http";
import test, { after, before } from "node:test";

let app;
let server;
let origin;

before(async () => {
  // Tests must never send requests to the live persistence backend.
  process.env.SHORTCUT_HERO_BACKEND_ORIGIN = "";
  process.env.NEXT_PUBLIC_SITE_URL = "";
  server = createServer();
  await new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", resolve);
  });
  origin = `http://localhost:${server.address().port}`;
  const { default: next } = await import("next");
  app = next({ dev: false, hostname: "localhost", port: server.address().port });
  await app.prepare();
  server.on("request", app.getRequestHandler());
});

after(async () => {
  if (server) {
    server.closeAllConnections();
    await new Promise((resolve) => server.close(resolve));
  }
  await app?.close();
});

function render(pathname = "/") {
  return fetch(`${origin}${pathname}`, { headers: { accept: "text/html" } });
}

test("server-renders the Shortcut Hero home shell without the game", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Shortcut Hero/i);
  assert.match(html, /Learn keyboard shortcuts through play/i);
  assert.match(html, /Learn keyboard shortcuts for Linear, Notion, and Slack/i);
  const canonical = html.match(/rel="canonical" href="([^"]+)"/i)?.[1];
  assert.ok(canonical);
  assert.equal(new URL(canonical).href, `${origin}/`);
  assert.match(html, /twitter:card[^>]+summary_large_image/i);
  assert.match(html, /og\.png/i);
  assert.match(html, /class="title-menu__items"/i);
  assert.match(html, /aria-label="Learn keyboard shortcuts for Linear, Slack, Notion\."/);
  assert.match(html, />play now<\/button>/);
  assert.doesNotMatch(html, /like guitar hero, but for keyboard shortcuts instead of guitars/i);
  assert.doesNotMatch(html, /Select app|app-picker|app-card/i);
  assert.doesNotMatch(html, /what should we call you|your system|Preview first visit/i);
  assert.doesNotMatch(html, /game-canvas|Go to Inbox/i);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
  assert.match(response.headers.get("content-security-policy") ?? "", /frame-ancestors 'none'/);
  assert.doesNotMatch(response.headers.get("content-security-policy") ?? "", /unsafe-eval/);
  assert.doesNotMatch(response.headers.get("content-security-policy") ?? "", /upgrade-insecure-requests/);
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
});

test("public hosts retain the HTTPS upgrade policy", async () => {
  // Node's fetch replaces Host; use HTTP directly to exercise host matching.
  const response = await new Promise((resolve, reject) => {
    get(`${origin}/`, { headers: { host: "shortcut-hero.example" } }, (incoming) => {
      incoming.resume();
      incoming.on("end", () => resolve(incoming));
      incoming.on("error", reject);
    }).on("error", reject);
  });
  assert.equal(response.statusCode, 200);
  assert.match(response.headers["content-security-policy"] ?? "", /upgrade-insecure-requests/);
  assert.doesNotMatch(response.headers["content-security-policy"] ?? "", /unsafe-eval/);
});

test("serves crawler routes and a correctly sized social card", async () => {
  const [robotsResponse, sitemapResponse, socialImage, favicon] =
    await Promise.all([
      render("/robots.txt"),
      render("/sitemap.xml"),
      readFile(new URL("../public/og.png", import.meta.url)),
      readFile(new URL("../public/favicon.svg", import.meta.url), "utf8"),
    ]);

  assert.equal(robotsResponse.status, 200);
  assert.ok((await robotsResponse.text()).includes(`Sitemap: ${origin}/sitemap.xml`));
  assert.equal(sitemapResponse.status, 200);
  assert.ok((await sitemapResponse.text()).includes(`<loc>${origin}/privacy</loc>`));

  assert.equal(socialImage.subarray(1, 4).toString("ascii"), "PNG");
  assert.equal(socialImage.readUInt32BE(16), 1200);
  assert.equal(socialImage.readUInt32BE(20), 630);
  assert.match(favicon, /<svg[\s>]/);
  assert.match(favicon, /viewBox="0 0 64 64"/);
});

test("separates title and play routes while keeping the 3D dependencies", async () => {
  const [page, playPage, layout, keyboard, packageJson] = await Promise.all([
    readFile(new URL("../app/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/play/page.tsx", import.meta.url), "utf8"),
    readFile(new URL("../app/layout.tsx", import.meta.url), "utf8"),
    readFile(
      new URL("../app/components/game/KeyboardInstrument.tsx", import.meta.url),
      "utf8",
    ),
    readFile(new URL("../package.json", import.meta.url), "utf8"),
  ]);

  assert.match(page, /SettingsScreen/);
  assert.doesNotMatch(page, /ShortcutHeroGame|GameScene/);
  assert.match(playPage, /location\.replace/);
  assert.match(layout, /SITE_TITLE/);
  assert.match(keyboard, /keyboard-instrument/);
  assert.match(keyboard, /is-hinted/);
  assert.match(packageJson, /@react-three\/fiber/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(
    access(new URL("../app/_sites-preview", import.meta.url)),
  );
  await assert.rejects(
    access(new URL("../app/play/loading.tsx", import.meta.url)),
  );
});

test("server-renders the configured play route startup shell", async () => {
  const response = await render(
    "/play?tool=linear&difficulty=easy&guidance=novice&pace=standard&session=30&sound=off&effects=reduced",
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Shortcut Hero/i);
  assert.match(html, /preparing the highway/i);
  assert.doesNotMatch(html, /game-canvas/i);
  assert.doesNotMatch(html, /enter the flow|high scores/i);
});

test("Next.js routes reject invalid API requests without contacting live storage", async () => {
  for (const [path, method] of [
    ["/api/rounds", "POST"],
    ["/api/referrals/code", "POST"],
    ["/api/progress", "DELETE"],
  ]) {
    const response = await fetch(`${origin}${path}`, {
      method,
      headers: { "content-type": "application/json" },
      body: "{}",
    });
    assert.equal(response.status, 400);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  }
});
