import { parseRoundWritePayload } from "../../persistence/round-payload";
import { forwardBackendRequest } from "../backend";
import { invalidJsonResponse, readJsonRequest } from "../request";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequest(request, 64 * 1_024);
  if (!body.ok) return invalidJsonResponse(body.status);
  const payload = parseRoundWritePayload(body.value);
  if (!payload) {
    return Response.json(
      { error: "Invalid round summary." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  return forwardBackendRequest(request, "/api/rounds", payload);
}
