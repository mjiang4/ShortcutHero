export type JsonRequestResult =
  | { readonly ok: true; readonly value: unknown }
  | { readonly ok: false; readonly status: 400 | 413 };

export async function readJsonRequest(
  request: Request,
  maximumBytes: number,
): Promise<JsonRequestResult> {
  const declaredLength = Number(request.headers.get("content-length"));
  if (Number.isFinite(declaredLength) && declaredLength > maximumBytes) {
    return { ok: false, status: 413 };
  }
  try {
    const rawBody = await request.text();
    if (new TextEncoder().encode(rawBody).byteLength > maximumBytes) {
      return { ok: false, status: 413 };
    }
    return { ok: true, value: JSON.parse(rawBody) };
  } catch {
    return { ok: false, status: 400 };
  }
}

export function invalidJsonResponse(status: 400 | 413): Response {
  return Response.json(
    { error: status === 413 ? "Request is too large." : "Invalid request." },
    { status, headers: { "cache-control": "no-store" } },
  );
}
