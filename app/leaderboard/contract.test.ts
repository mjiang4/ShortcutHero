import assert from "node:assert/strict";
import test from "node:test";

import { GET, POST } from "../api/leaderboard/route";
import { DELETE } from "../api/progress/route";
import {
  boardFromGameSettings,
  boardFromLaunchSettings,
  boardKey,
  boardSearchParams,
  parseLeaderboardBoard,
  parseLeaderboardPost,
} from "./contract";

const VALID_POST = {
  visitorId: `v_${"b".repeat(32)}`,
  deletionToken: `d_${"c".repeat(64)}`,
  trackId: "github",
  difficulty: "medium",
  hints: "near-line",
  pace: "standard",
  sessionSeconds: 30,
  name: "  Ada   Swift  ",
  score: 4_200,
};

test("boards are keyed by launch settings and match between the game and title screen", () => {
  const fromGame = boardFromGameSettings({
    trackId: "github", mode: "medium", assistance: "novice", hints: "near-line", speed: "standard", durationSeconds: 30, platform: "windows",
  });
  const fromTitle = boardFromLaunchSettings({
    tool: "github", difficulty: "medium", hints: "near-line", pace: "standard", session: 30, sound: "on", effects: "system",
  });
  assert.deepEqual(fromGame, fromTitle);
  assert.equal(boardKey(fromGame), "github:medium:near-line:standard:30s");
  assert.deepEqual(parseLeaderboardBoard(boardSearchParams(fromGame)), fromGame);
  assert.equal(parseLeaderboardBoard(new URLSearchParams({ ...Object.fromEntries(boardSearchParams(fromGame)), pace: "ludicrous" })), null);
});

test("accepts only named, positive scores with a valid anonymous identity", () => {
  const parsed = parseLeaderboardPost(VALID_POST);
  assert.ok(parsed);
  assert.equal(parsed.name, "Ada Swift");
  assert.equal(parsed.score, 4_200);
  for (const invalid of [
    { ...VALID_POST, name: "Guest" },
    { ...VALID_POST, name: "   " },
    { ...VALID_POST, name: 42 },
    { ...VALID_POST, score: 0 },
    { ...VALID_POST, score: 12.5 },
    { ...VALID_POST, score: 100_000_001 },
    { ...VALID_POST, visitorId: "v_short" },
    { ...VALID_POST, deletionToken: "nope" },
    { ...VALID_POST, trackId: "../etc" },
    { ...VALID_POST, sessionSeconds: 90 },
    [VALID_POST],
    null,
  ]) {
    assert.equal(parseLeaderboardPost(invalid), null);
  }
  assert.equal(parseLeaderboardPost({ ...VALID_POST, name: "x".repeat(40) })?.name.length, 32);
});

test("API routes reject bad input before touching the database and report an unconfigured board", async () => {
  const previous = process.env.POSTGRES_URL;
  delete process.env.POSTGRES_URL;
  try {
    assert.equal((await GET(new Request("https://example.test/api/leaderboard?trackId=github"))).status, 400);
    assert.equal((await GET(new Request(`https://example.test/api/leaderboard?${boardSearchParams(parseLeaderboardPost(VALID_POST)!)}`))).status, 503);
    const post = (body: unknown) => POST(new Request("https://example.test/api/leaderboard", {
      method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body),
    }));
    assert.equal((await post({ ...VALID_POST, name: "Guest" })).status, 400);
    assert.equal((await post(VALID_POST)).status, 503);
    // Without a Sites backend or a database there is nothing server-side to delete.
    const deletion = await DELETE(new Request("https://example.test/api/progress", {
      method: "DELETE", headers: { "content-type": "application/json" },
      body: JSON.stringify({ visitorId: VALID_POST.visitorId, deletionToken: VALID_POST.deletionToken }),
    }));
    assert.equal(deletion.status, 204);
  } finally {
    if (previous !== undefined) process.env.POSTGRES_URL = previous;
  }
});
