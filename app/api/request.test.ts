import assert from "node:assert/strict";
import test from "node:test";

import { readJsonRequest } from "./request";

test("rejects oversized JSON bodies", async () => {
  const request = new Request("https://example.test", {
    method: "POST",
    body: "x".repeat(200),
    headers: { "content-type": "application/json", "content-length": "200" },
  });
  const result = await readJsonRequest(request, 100);
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.status, 413);
});

test("parses valid JSON bodies", async () => {
  const request = new Request("https://example.test", {
    method: "POST",
    body: JSON.stringify({ ok: true }),
    headers: { "content-type": "application/json" },
  });
  const result = await readJsonRequest(request, 1_024);
  assert.equal(result.ok, true);
  if (result.ok) assert.deepEqual(result.value, { ok: true });
});
