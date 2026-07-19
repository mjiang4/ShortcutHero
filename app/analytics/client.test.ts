import assert from "node:assert/strict";
import test from "node:test";

import { sanitizeAnalyticsProperties, sanitizeErrorName } from "./client";

test("analytics properties remove personal and shortcut input data", () => {
  assert.deepEqual(
    sanitizeAnalyticsProperties({
      name: "Ada",
      email: "ada@example.com",
      key: "KeyC",
      shortcut: "Command K",
      score: 4200,
      accuracy_pct: 87.5,
      completed: true,
      nested: { unsafe: true },
    }),
    {
      score: 4200,
      accuracy_pct: 87.5,
      completed: true,
    },
  );
});

test("error reporting keeps only a bounded error type", () => {
  const error = new Error("Ada pressed Command K");
  error.name = "TypeError";
  assert.equal(sanitizeErrorName(error), "TypeError");
  error.name = "Ada pressed Command K";
  assert.equal(sanitizeErrorName(error), "Error");
});
