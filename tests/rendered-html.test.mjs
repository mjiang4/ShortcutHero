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

test("server-renders the DOM-only Shortcut Hero title screen", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  assert.match(response.headers.get("content-type") ?? "", /^text\/html\b/i);

  const html = await response.text();
  assert.match(html, /Shortcut Hero/i);
  assert.match(html, /Master Linear shortcuts/i);
  assert.match(html, /learn (?:<!-- -->)?Linear(?:<!-- -->)? through play/i);
  assert.match(html, /Linear(?:<!-- -->)? shortcut muscle memory/i);
  assert.match(html, /high scores/i);
  assert.match(html, /how to play/i);
  assert.match(html, /options/i);
  assert.match(html, /start/i);
  assert.match(html, /og\.png/i);
  assert.doesNotMatch(html, /game-canvas|Go to Inbox/i);
  assert.doesNotMatch(html, /Your site is taking shape|codex-preview/i);
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
  assert.match(playPage, /ShortcutHeroGame/);
  assert.match(layout, /Shortcut Hero/);
  assert.match(keyboard, /keyboard-instrument/);
  assert.match(keyboard, /is-hinted/);
  assert.match(packageJson, /@react-three\/fiber/);
  assert.doesNotMatch(packageJson, /react-loading-skeleton/);
  await assert.rejects(
    access(new URL("../app/_sites-preview", import.meta.url)),
  );
});

test("server-renders the configured play route", async () => {
  const response = await render(
    "/play?tool=linear&difficulty=easy&guidance=novice&pace=standard&session=30&sound=off&effects=reduced",
  );
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Shortcut Hero/i);
  assert.match(html, /game-canvas/i);
  assert.doesNotMatch(html, /enter the flow|high scores/i);
});
