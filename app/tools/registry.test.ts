import assert from "node:assert/strict";
import test from "node:test";

import { deckForMode } from "./types";
import { getToolTrack, TOOL_CATALOG } from "./registry";
import { loadCatalogTrack, validateCatalog } from "./catalog";
import catalogData from "./catalog-data.json";

test("keeps Linear shortcut content behind a tool-track boundary", () => {
  const linear = getToolTrack("linear");

  assert.equal(linear.name, "Linear");
  assert.ok(deckForMode(linear, "easy").every((item) => item.difficulty === "easy"));
  assert.deepEqual(new Set(deckForMode(linear, "medium").map((item) => item.input.kind)), new Set(["single", "sequence"]));
  assert.deepEqual(new Set(deckForMode(linear, "hard").map((item) => item.input.kind)), new Set(["single", "sequence", "chord"]));
  assert.equal(deckForMode(linear, "easy").length, linear.decks.easy.length);
  assert.equal(deckForMode(linear, "medium").length, linear.decks.easy.length + linear.decks.medium.length);
  assert.equal(deckForMode(linear, "hard").length, Object.values(linear.decks).flat().length);
  assert.ok(deckForMode(linear, "showcase").length > 0);
});

test("loads a new app and distinct OS bindings from data, without inferring missing keys", () => {
  const original = catalogData.apps.linear.shortcuts[0];
  const catalog = validateCatalog({ schemaVersion: 1, apps: {
    "test-app": {
      ...catalogData.apps.linear,
      name: "Test app",
      releasedPlatforms: ["macos", "windows"],
      shortcuts: [
        { ...original, id: "different-keys", bindings: {
          macos: { steps: [["KeyA"]], display: "A" },
          windows: { steps: [["KeyB"]], display: "B" },
        } },
        { ...original, id: "mac-only" },
        { ...original, id: "reserved", bindings: {
          macos: { steps: [["Meta", "KeyW"]], display: "⌘ W" },
          windows: { steps: [["Control", "KeyW"]], display: "Ctrl W" },
        } },
      ],
    },
  } });
  const mac = loadCatalogTrack(catalog, "test-app", "macos");
  const windows = loadCatalogTrack(catalog, "test-app", "windows");
  assert.equal(mac.name, "Test app");
  assert.equal(mac.decks.easy[0].context, "Test app");
  assert.equal(mac.decks.easy[0].input.display, "A");
  assert.equal(windows.decks.easy[0].input.display, "B");
  assert.equal(mac.decks.easy.length, 2);
  assert.equal(windows.decks.easy.length, 1);
  assert.ok(!deckForMode(mac, "hard").some((item) => item.id === "reserved"));
  assert.equal(deckForMode(getToolTrack("linear", "windows"), "hard").length, 0);
});

test("rejects invalid catalog imports before replacing the current data", () => {
  assert.throws(() => validateCatalog({ ...catalogData, schemaVersion: 2 }), /schemaVersion/);
  const duplicate = structuredClone(catalogData);
  duplicate.apps.linear.shortcuts.push(duplicate.apps.linear.shortcuts[0]);
  assert.throws(() => validateCatalog(duplicate), /Duplicate shortcut/);
  const missingPlatform = structuredClone(catalogData);
  delete (missingPlatform.apps.linear.shortcuts[0].bindings as { windows?: unknown }).windows;
  assert.throws(() => validateCatalog(missingPlatform), /windows/);
  const noSource = structuredClone(catalogData);
  noSource.apps.linear.shortcuts[0].source.url = "http://unverified.example/";
  assert.throws(() => validateCatalog(noSource), /HTTPS/);
});

test("advertises future tool packs without exposing unavailable tracks", () => {
  const available = TOOL_CATALOG.filter((tool) => tool.status === "available");
  const planned = TOOL_CATALOG.filter((tool) => tool.status === "coming-soon");

  assert.deepEqual(available.map((tool) => tool.id), ["linear"]);
  assert.ok(planned.some((tool) => tool.id === "notion"));
  assert.ok(planned.some((tool) => tool.id === "jira"));
  assert.ok(planned.some((tool) => tool.id === "superhuman"));
});
