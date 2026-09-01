import assert from "node:assert/strict";
import test from "node:test";

import {
  getSecurityHeaders,
  buildContentSecurityPolicy,
} from "./headers";

test("production CSP allows PostHog ingestion without unsafe eval", () => {
  const policy = buildContentSecurityPolicy(true);
  assert.match(policy, /https:\/\/us\.i\.posthog\.com/);
  assert.match(policy, /frame-ancestors 'none'/);
  assert.match(policy, /script-src[^;]+blob:/);
  assert.doesNotMatch(policy, /unsafe-eval/);
});

test("provides the launch security headers for Next.js responses", () => {
  const headers = new Headers(getSecurityHeaders(true).map(({ key, value }) => [key, value]));
  assert.equal(headers.get("x-content-type-options"), "nosniff");
  assert.equal(headers.get("x-frame-options"), "DENY");
  assert.equal(headers.get("cross-origin-opener-policy"), "same-origin");
  assert.equal(headers.get("strict-transport-security"), "max-age=31536000; includeSubDomains");
});
