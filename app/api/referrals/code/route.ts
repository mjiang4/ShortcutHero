import { parseDeletionRequest } from "../../../persistence/round-payload";
import { forwardBackendRequest } from "../../backend";
import { invalidJsonResponse, readJsonRequest } from "../../request";

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequest(request, 2_048);
  if (!body.ok) return invalidJsonResponse(body.status);
  const identity = parseDeletionRequest(body.value);
  if (!identity) {
    return Response.json(
      { error: "Invalid identity." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  return forwardBackendRequest(request, "/api/referrals/code", identity);
}
