import assert from "node:assert/strict";
import test from "node:test";

import { originFromHeaders, resolveSiteOrigin } from "./site-config";

test("a configured production origin takes priority and drops paths", () => {
  assert.equal(
    resolveSiteOrigin("https://preview.example", "https://shortcut.test/play"),
    "https://shortcut.test",
  );
});

test("request headers provide a safe deployment fallback", () => {
  const headers = new Headers({
    host: "preview.example",
    "x-forwarded-proto": "https",
  });
  assert.equal(originFromHeaders(headers), "https://preview.example");
});

test("invalid schemes cannot become canonical origins", () => {
  assert.equal(
    resolveSiteOrigin("https://preview.example", "javascript:alert(1)"),
    "https://preview.example",
  );
});
