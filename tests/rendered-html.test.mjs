import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(pathname = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);

  return worker.fetch(
    new Request(`http://localhost${pathname}`, {
      headers: { accept: "text/html" },
    }),
    {
      ASSETS: {
        fetch: async () => new Response("Not found", { status: 404 }),
      },
    },
    {
      waitUntil() {},
      passThroughOnException() {},
    },
  );
}

test("server-renders the Shortcut Hero home shell without the game", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Shortcut Hero/i);
  assert.match(html, /Learn Linear shortcuts through play/i);
  assert.match(html, /Learn Linear keyboard shortcuts in a fast 3D rhythm game/i);
  assert.match(
    html,
    /rel="canonical" href="http:\/\/localhost:3000\/?"/i,
  );
  assert.match(html, /twitter:card[^>]+summary_large_image/i);
  assert.match(html, /og\.png/i);
  assert.match(html, /what should we call you/i);
  assert.doesNotMatch(html, /game-canvas|Go to Inbox/i);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
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
  assert.match(await robotsResponse.text(), /Sitemap: http:\/\/localhost\/sitemap\.xml/);
  assert.equal(sitemapResponse.status, 200);
  assert.match(await sitemapResponse.text(), /<loc>http:\/\/localhost\/privacy<\/loc>/);

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
  assert.match(html, /__VINEXT_RSC_DONE__/i);
  assert.doesNotMatch(html, /game-canvas/i);
  assert.doesNotMatch(html, /enter the flow|high scores/i);
});
