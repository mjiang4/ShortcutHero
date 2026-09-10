import assert from "node:assert/strict";
import test from "node:test";

import { deckForMode } from "./types";
import { appRequestHref, getToolTrack, TOOL_CATALOG, AVAILABLE_TOOL_IDS, SHORTCUT_CATALOG, isAvailableToolId } from "./registry";
import { loadCatalogTrack, validateCatalog } from "./catalog";
import { createPlayHref, parseLaunchSettings } from "../components/settings/settings";
import { createGameSession, startSession, handleSessionKey } from "../game/session";
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
  for (const [id, display] of [["go-my-issues", "G → M"], ["mark-blocked", "M → B"], ["mark-blocking", "M → X"], ["relate-issue", "M → R"]]) {
    assert.equal(deckForMode(linear, "medium").find(shortcut => shortcut.id === id)?.input.display, display);
  }
  assert.equal(catalogData.apps.linear.shortcuts.find(shortcut => shortcut.id === "editor-inline-code")?.bindings.macos.display, "⌘ E");
  assert.ok(!deckForMode(linear, "hard").some(shortcut => shortcut.id === "editor-inline-code" || shortcut.id === "clear-selection"));
  const historical = catalogData.apps.linear.shortcuts.filter(shortcut => shortcut.source.verification === "historical");
  assert.equal(historical.length, 4);
  for (const shortcut of historical) {
    assert.ok(!deckForMode(linear, "hard").some(item => item.id === shortcut.id));
  }
  assert.equal(catalogData.apps.linear.shortcuts.find(shortcut => shortcut.id === "editor-strikethrough")?.bindings.macos.display, "⌘ ⇧ X");
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
        { ...original, id: "mac-only", bindings: { macos: original.bindings.macos, windows: null } },
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
  // Linear's letter shortcuts are OS-independent; the Windows track mirrors the Mac pools.
  assert.deepEqual(
    deckForMode(getToolTrack("linear", "windows"), "hard").map((item) => item.id),
    deckForMode(getToolTrack("linear"), "hard").map((item) => item.id),
  );
  assert.equal(catalogData.apps.linear.shortcuts.find(shortcut => shortcut.id === "command-menu")?.bindings.windows?.display, "Ctrl K");
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
  const badCategory = structuredClone(SHORTCUT_CATALOG);
  Object.assign(badCategory.apps.slack.shortcuts[0], { category: "" });
  assert.throws(() => validateCatalog(badCategory), /category/);
  const badNotes = structuredClone(SHORTCUT_CATALOG);
  Object.assign(badNotes.apps.slack.shortcuts[0], { notes: [false] });
  assert.throws(() => validateCatalog(badNotes), /notes/);
  const missingSourcePlatform = structuredClone(SHORTCUT_CATALOG);
  Object.assign(missingSourcePlatform.apps.slack.shortcuts[0], { sourceBindings: { macos: ["E"] } });
  assert.throws(() => validateCatalog(missingSourcePlatform), /sourceBindings.windows/);
});

test("preserves Slack source categories, alternatives, notes, and OS exceptions through import", () => {
  const imported = validateCatalog(JSON.parse(JSON.stringify(SHORTCUT_CATALOG)));
  const shortcuts = imported.apps.slack.shortcuts;
  assert.deepEqual(shortcuts, SHORTCUT_CATALOG.apps.slack.shortcuts);
  assert.deepEqual(new Set(shortcuts.map(shortcut => shortcut.category)), new Set([
    "Slack basics", "Navigate conversations and messages", "Mark messages read or unread",
    "Navigate unread messages", "Switch workspaces", "Switch tabs", "Take actions on messages",
    "Format messages", "Format text in a canvas", "Navigate a canvas",
  ]));
  const row = (id: string) => shortcuts.find(shortcut => shortcut.id === id)!;
  assert.ok(shortcuts.every(shortcut => shortcut.sourceAction && shortcut.sourceBindings));
  assert.deepEqual(row("new-message").sourceBindings, { macos: ["⌘ N", "⌘ Shift K"], windows: ["Ctrl N", "Ctrl Shift K"] });
  assert.deepEqual(row("history-back").bindings.windows?.steps, [["Alt", "ArrowLeft"]]);
  assert.deepEqual(row("browse-dms").bindings.windows?.steps, [["Control", "Shift", "Digit2"]]);
  assert.deepEqual(row("canvas-context-menu").bindings.windows?.steps, [["Shift", "F10"]]);
  assert.equal(row("underline").bindings.windows, null);
  assert.ok(row("preferences").notes?.includes("Desktop app only."));
  assert.deepEqual(row("specific-tab").sourceBindings?.windows, ["Ctrl Shift [number]"]);
  assert.deepEqual(row("unread-click").sourceBindings, { macos: ["Option Click"], windows: ["Alt Click"] });
  const playable = deckForMode(loadCatalogTrack(imported, "slack", "macos"), "hard");
  for (const id of ["specific-tab", "unread-click", "new-message", "read-all"]) {
    assert.ok(!playable.some(shortcut => shortcut.id === id), id);
  }
  assert.ok(playable.some(shortcut => shortcut.id === "select-line-start"));
});

test("releases source-backed app packs with playable pools and isolated launch settings", () => {
  const available = TOOL_CATALOG.filter((tool) => tool.status === "available");
  assert.deepEqual(available.map((tool) => tool.id), ["linear", "slack", "notion", "github"]);
  assert.deepEqual(TOOL_CATALOG.filter((tool) => tool.status === "coming-soon").map((tool) => tool.id), ["cursor", "chatgpt", "claude", "superhuman"]);
  assert.equal(appRequestHref("Cursor"), "https://github.com/mjiang4/ShortcutHero/issues/new?labels=app-request&title=App+request%3A+Cursor");
  for (const id of ["jira", "superhuman", "excel"] as const) {
    assert.equal(isAvailableToolId(id), false);
    assert.equal(parseLaunchSettings(new URLSearchParams({ tool: id })).tool, "linear");
    assert.ok(catalogData.apps[id].shortcuts.length > 0, "Disabled app data remains stored");
  }
  assert.equal(new Set(TOOL_CATALOG.map(tool => tool.id)).size, TOOL_CATALOG.length);
  for (const tool of AVAILABLE_TOOL_IDS) {
    const launch = parseLaunchSettings(new URLSearchParams({ tool }));
    assert.equal(launch.tool, tool);
    assert.equal(parseLaunchSettings(new URL(createPlayHref(launch), "https://example.test").searchParams).tool, tool);
    for (const platform of ["macos", "windows"] as const) {
      for (const difficulty of ["easy", "medium", "hard"] as const) {
        assert.ok(deckForMode(getToolTrack(tool, platform), difficulty).length > 0, `${tool}/${platform}/${difficulty}`);
      }
      for (const shortcut of deckForMode(getToolTrack(tool, platform), "hard")) {
        let session = startSession(createGameSession({ trackId: tool, platform, mode: "medium", speed: "standard", assistance: "novice" }, { deck: [shortcut] }), 0);
        const strike = session.active!.strikeAtMs;
        const input = shortcut.input;
        const codes = input.kind === "sequence" ? input.codes : [input.code];
        for (let index = 0; index < codes.length; index += 1) {
          const update = handleSessionKey(session, { code: codes[index], shiftKey: input.kind === "chord", ctrlKey: false, metaKey: false, altKey: false }, strike - (codes.length - index - 1) * 500);
          assert.equal(update.preventDefault, true, `${tool}/${platform}/${shortcut.id}`);
          session = update.session;
        }
        assert.equal(session.attempts[0]?.outcome, "clean", `${tool}/${platform}/${shortcut.id}`);
      }
    }
  }
  const github = getToolTrack("github");
  assert.equal(github.decks.easy.length, 18);
  assert.equal(github.decks.medium.length, 9);
  assert.equal(github.decks.hard.length, 6);
  assert.deepEqual(github.decks.easy.slice(0, 2).map(shortcut => shortcut.input.display), ["S", "E"]);
  assert.equal(github.decks.medium.find(shortcut => shortcut.id === "go-pull-requests")?.input.display, "G → P");
  assert.equal(github.decks.hard.find(shortcut => shortcut.id === "mark-unread")?.input.display, "⇧ U");
  assert.deepEqual(getToolTrack("github", "windows").decks.hard.map(shortcut => shortcut.id), github.decks.hard.map(shortcut => shortcut.id));
  for (const shortcut of catalogData.apps.github.shortcuts) {
    assert.equal(shortcut.source.url, "https://docs.github.com/en/get-started/accessibility/keyboard-shortcuts");
  }
  assert.equal(getToolTrack("slack").decks.easy.length, 10);
  assert.equal(getToolTrack("notion").decks.hard.length, 4);
  const notion = getToolTrack("notion");
  for (const id of ["block-left", "block-right", "edit-block", "open-nested-page"]) {
    assert.ok(notion.decks.easy.some(shortcut => shortcut.id === id), id);
  }
  for (const id of ["convert-heading-1", "clear-selection", "block-actions", "emoji-picker"]) {
    assert.ok(!deckForMode(notion, "hard").some(shortcut => shortcut.id === id), id);
  }
  const heading = catalogData.apps.notion.shortcuts.find(shortcut => shortcut.id === "convert-heading-1")!;
  assert.deepEqual(heading.bindings.macos.steps, [["Meta", "Alt", "Digit1"]]);
  assert.deepEqual(heading.bindings.windows.steps, [["Control", "Shift", "Digit1"]]);
});
