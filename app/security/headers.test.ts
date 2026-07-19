import assert from "node:assert/strict";
import test from "node:test";

import {
  applySecurityHeaders,
  buildContentSecurityPolicy,
} from "./headers";

test("production CSP allows PostHog ingestion without unsafe eval", () => {
  const policy = buildContentSecurityPolicy(true);
  assert.match(policy, /https:\/\/us\.i\.posthog\.com/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /script-src[^;]+blob:/);
  assert.doesNotMatch(policy, /unsafe-eval/);
});

test("adds launch security headers without changing the response body", async () => {
  const response = applySecurityHeaders(new Response("shortcut hero"), true);
  assert.equal(await response.text(), "shortcut hero");
  assert.equal(response.headers.get("x-content-type-options"), "nosniff");
  assert.equal(response.headers.get("x-frame-options"), "DENY");
  assert.equal(response.headers.get("cross-origin-opener-policy"), "same-origin");
});
