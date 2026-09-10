import { deleteLeaderboardScores, isLeaderboardConfigured } from "../../leaderboard/server";
import { parseDeletionRequest } from "../../persistence/round-payload";
import { forwardBackendRequest } from "../backend";
import { invalidJsonResponse, readJsonRequest } from "../request";

export async function DELETE(request: Request): Promise<Response> {
  const body = await readJsonRequest(request, 2_048);
  if (!body.ok) return invalidJsonResponse(body.status);
  const identity = parseDeletionRequest(body.value);
  if (!identity) {
    return Response.json(
      { error: "Invalid deletion request." },
      { status: 400, headers: { "cache-control": "no-store" } },
    );
  }
  if (isLeaderboardConfigured()) {
    try {
      await deleteLeaderboardScores(identity.visitorId, identity.deletionToken);
    } catch {
      return Response.json(
        { error: "Deletion is unavailable right now." },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }
  }
  // Without a separate Sites backend, the public board is the only server-side record.
  if (!process.env.SHORTCUT_HERO_BACKEND_ORIGIN) {
    return new Response(null, { status: 204, headers: { "cache-control": "no-store" } });
  }
  return forwardBackendRequest(request, "/api/progress", identity);
}
