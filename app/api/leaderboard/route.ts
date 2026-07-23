import { DatabaseUnavailableError, getD1Database } from "../../../db";
import { fetchLeaderboard } from "../../persistence/server";

export async function GET(request: Request): Promise<Response> {
  const url = new URL(request.url);
  const trackId = url.searchParams.get("track") ?? undefined;
  const runMode = url.searchParams.get("mode") ?? undefined;
  const limitRaw = Number(url.searchParams.get("limit") ?? "25");
  const limit = Number.isFinite(limitRaw) ? limitRaw : 25;

  try {
    const db = await getD1Database();
    const entries = await fetchLeaderboard(db, { trackId, runMode, limit });
    return Response.json(
      { entries },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (error instanceof DatabaseUnavailableError) {
      return Response.json(
        { error: "Leaderboard storage is unavailable.", entries: [] },
        { status: 503, headers: { "cache-control": "no-store" } },
      );
    }
    return Response.json(
      { error: "Leaderboard could not be loaded.", entries: [] },
      { status: 500, headers: { "cache-control": "no-store" } },
    );
  }
}
