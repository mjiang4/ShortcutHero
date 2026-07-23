import assert from "node:assert/strict";
import test from "node:test";

import { deckForMode } from "./types";
import { getToolTrack, TOOL_CATALOG } from "./registry";

test("keeps Linear shortcut content behind a tool-track boundary", () => {
  const linear = getToolTrack("linear");

  assert.equal(linear.name, "Linear");
  assert.ok(deckForMode(linear, "easy").every((item) => item.difficulty === "easy"));
  assert.ok(
    deckForMode(linear, "medium").every((item) => item.difficulty === "medium"),
  );
  assert.ok(deckForMode(linear, "hard").every((item) => item.difficulty === "hard"));
  assert.ok(deckForMode(linear, "showcase").length > 0);
});

test("advertises future tool packs without exposing unavailable tracks", () => {
  const available = TOOL_CATALOG.filter((tool) => tool.status === "available");
  const planned = TOOL_CATALOG.filter((tool) => tool.status === "coming-soon");

  assert.deepEqual(available.map((tool) => tool.id), [
    "linear",
    "slack",
    "spotify",
  ]);
  assert.ok(planned.some((tool) => tool.id === "notion"));
  assert.ok(planned.some((tool) => tool.id === "jira"));
  assert.ok(planned.some((tool) => tool.id === "superhuman"));
});
