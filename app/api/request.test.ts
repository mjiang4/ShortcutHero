import assert from "node:assert/strict";
import test from "node:test";

import { readJsonRequest } from "./request";
import { forwardBackendRequest } from "./backend";

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

test("forwards only the three persistence endpoints and preserves their response contracts", async (t) => {
  const previousOrigin = process.env.SHORTCUT_HERO_BACKEND_ORIGIN;
  process.env.SHORTCUT_HERO_BACKEND_ORIGIN = "https://storage.example.test";
  t.after(() => {
    if (previousOrigin === undefined) delete process.env.SHORTCUT_HERO_BACKEND_ORIGIN;
    else process.env.SHORTCUT_HERO_BACKEND_ORIGIN = previousOrigin;
  });
  let reply = new Response();
  let sentUrl = "";
  let sentOptions: RequestInit | undefined;
  t.mock.method(globalThis, "fetch", async (url: RequestInfo | URL, options?: RequestInit) => {
    sentUrl = String(url);
    sentOptions = options;
    return reply;
  });
  const cases = [
    { path: "/api/rounds", method: "POST", status: 201, body: { status: "created", referralConverted: false } },
    { path: "/api/rounds", method: "POST", status: 200, body: { status: "duplicate", referralConverted: true } },
    { path: "/api/referrals/code", method: "POST", status: 200, body: { code: "ABCD2345" } },
    { path: "/api/rounds", method: "POST", status: 429, body: { error: "Too many requests." } },
    { path: "/api/progress", method: "DELETE", status: 204, body: null },
  ] as const;
  for (const item of cases) {
    const responseHeaders = { "retry-after": "60", "set-cookie": "backend-cookie=private" };
    reply = item.status === 204
      ? new Response(null, { status: 204, headers: responseHeaders })
      : Response.json(item.body, { status: item.status, headers: responseHeaders });
    const payload = { visitorId: "synthetic-test-visitor", deletionToken: "synthetic-test-secret" };
    const request = new Request(`https://game.example.test${item.path}`, {
      method: item.method,
      headers: { cookie: "browser-cookie=private", authorization: "Bearer private", origin: "https://game.example.test" },
    });
    const response = await forwardBackendRequest(request, item.path, payload);
    assert.equal(sentUrl, `https://storage.example.test${item.path}`);
    assert.equal(sentOptions?.method, item.method);
    assert.equal(sentOptions?.body, JSON.stringify(payload));
    assert.deepEqual(sentOptions?.headers, { "content-type": "application/json", accept: "application/json" });
    assert.equal(sentOptions?.cache, "no-store");
    assert.equal(sentOptions?.redirect, "error");
    assert.ok(sentOptions?.signal instanceof AbortSignal);
    assert.equal(response.status, item.status);
    assert.equal(response.headers.get("cache-control"), "no-store");
    assert.equal(response.headers.get("set-cookie"), null);
    if (item.status === 204) assert.equal(await response.text(), "");
    else {
      assert.deepEqual(await response.json(), item.body);
      assert.equal(response.headers.get("retry-after"), "60");
    }
  }
});

test("fails safely for missing, insecure, or self-referencing backend configuration", async (t) => {
  const previousOrigin = process.env.SHORTCUT_HERO_BACKEND_ORIGIN;
  t.after(() => {
    if (previousOrigin === undefined) delete process.env.SHORTCUT_HERO_BACKEND_ORIGIN;
    else process.env.SHORTCUT_HERO_BACKEND_ORIGIN = previousOrigin;
  });
  const fetchMock = t.mock.method(globalThis, "fetch", async () => {
    throw new Error("Must not contact a backend");
  });
  for (const value of ["", "http://storage.example.test", "https://game.example.test"]) {
    process.env.SHORTCUT_HERO_BACKEND_ORIGIN = value;
    const response = await forwardBackendRequest(
      new Request("https://game.example.test/api/rounds"), "/api/rounds", {},
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Progress storage is unavailable." });
  }
  assert.equal(fetchMock.mock.callCount(), 0);
});

test("backend timeouts, failed requests, and HTML login pages cannot count as saved progress", async (t) => {
  const previousOrigin = process.env.SHORTCUT_HERO_BACKEND_ORIGIN;
  process.env.SHORTCUT_HERO_BACKEND_ORIGIN = "https://storage.example.test";
  t.after(() => {
    if (previousOrigin === undefined) delete process.env.SHORTCUT_HERO_BACKEND_ORIGIN;
    else process.env.SHORTCUT_HERO_BACKEND_ORIGIN = previousOrigin;
  });
  t.mock.method(AbortSignal, "timeout", (milliseconds: number) => {
    assert.equal(milliseconds, 10_000);
    return new AbortController().signal;
  });
  let failure: Error | null = null;
  t.mock.method(globalThis, "fetch", async () => {
    if (failure) throw failure;
    return new Response("<html>Sign in</html>", { headers: { "content-type": "text/html" } });
  });
  for (failure of [null, new Error("network failure"), new DOMException("Timed out", "TimeoutError")]) {
    const response = await forwardBackendRequest(
      new Request("https://game.example.test/api/rounds"), "/api/rounds", {},
    );
    assert.equal(response.status, 503);
    assert.deepEqual(await response.json(), { error: "Progress storage is unavailable." });
  }
});
