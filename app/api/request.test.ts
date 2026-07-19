import assert from "node:assert/strict";
import test from "node:test";

import { readJsonRequest } from "./request";

test("reads bounded JSON and rejects malformed or oversized bodies", async () => {
  assert.deepEqual(
    await readJsonRequest(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ status: "ok" }),
      }),
      100,
    ),
    { ok: true, value: { status: "ok" } },
  );
  assert.deepEqual(
    await readJsonRequest(
      new Request("https://example.com", { method: "POST", body: "{" }),
      100,
    ),
    { ok: false, status: 400 },
  );
  assert.deepEqual(
    await readJsonRequest(
      new Request("https://example.com", {
        method: "POST",
        body: JSON.stringify({ data: "x".repeat(200) }),
      }),
      100,
    ),
    { ok: false, status: 413 },
  );
});
