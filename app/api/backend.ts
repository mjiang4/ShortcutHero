const BACKEND_METHODS = {
  "/api/rounds": "POST",
  "/api/progress": "DELETE",
  "/api/referrals/code": "POST",
} as const;

/** Vercel serves the game; the existing Sites API remains the data owner. */
export async function forwardBackendRequest(
  request: Request,
  path: keyof typeof BACKEND_METHODS,
  payload: unknown,
): Promise<Response> {
  try {
    const origin = new URL(process.env.SHORTCUT_HERO_BACKEND_ORIGIN ?? "");
    if (
      origin.protocol !== "https:" || origin.username || origin.password ||
      origin.pathname !== "/" || origin.search || origin.hash ||
      origin.origin === new URL(request.url).origin
    ) {
      return unavailable();
    }

    const response = await fetch(new URL(path, origin), {
      method: BACKEND_METHODS[path],
      headers: { "content-type": "application/json", accept: "application/json" },
      body: JSON.stringify(payload),
      cache: "no-store",
      redirect: "error",
      signal: AbortSignal.timeout(10_000),
    });
    const headers = new Headers({ "cache-control": "no-store" });
    if (response.status === 204) return new Response(null, { status: 204, headers });

    // A login page or redirect must never masquerade as a successful save.
    const contentType = response.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().startsWith("application/json")) return unavailable();
    headers.set("content-type", contentType);
    const retryAfter = response.headers.get("retry-after");
    if (retryAfter) headers.set("retry-after", retryAfter);
    return new Response(await response.text(), { status: response.status, headers });
  } catch {
    // Never log anonymous deletion secrets, request bodies, or backend errors.
    return unavailable();
  }
}

function unavailable(): Response {
  return Response.json(
    { error: "Progress storage is unavailable." },
    { status: 503, headers: { "cache-control": "no-store" } },
  );
}
