import { parseLeaderboardBoard, parseLeaderboardPost } from "../../leaderboard/contract";
import {
  isLeaderboardConfigured,
  postLeaderboardScore,
  readLeaderboard,
} from "../../leaderboard/server";
import { invalidJsonResponse, readJsonRequest } from "../request";

const NO_STORE = { "cache-control": "no-store" };

export async function GET(request: Request): Promise<Response> {
  const board = parseLeaderboardBoard(new URL(request.url).searchParams);
  if (!board) return Response.json({ error: "Invalid board." }, { status: 400, headers: NO_STORE });
  if (!isLeaderboardConfigured()) return unavailable();
  try {
    // Players open the board right after posting; a CDN cache would show them a stale list.
    return Response.json({ entries: await readLeaderboard(board) }, { headers: NO_STORE });
  } catch (error) {
    return unavailable(error);
  }
}

export async function POST(request: Request): Promise<Response> {
  const body = await readJsonRequest(request, 2_048);
  if (!body.ok) return invalidJsonResponse(body.status);
  const payload = parseLeaderboardPost(body.value);
  if (!payload) return Response.json({ error: "Invalid score." }, { status: 400, headers: NO_STORE });
  if (!isLeaderboardConfigured()) return unavailable();
  try {
    const result = await postLeaderboardScore(payload);
    if (!result.ok) {
      return Response.json({ error: "Too many posts. Try again later." }, {
        status: 429,
        headers: { ...NO_STORE, "retry-after": "3600" },
      });
    }
    return Response.json({ rank: result.rank, entries: result.entries }, { headers: NO_STORE });
  } catch (error) {
    return unavailable(error);
  }
}

function unavailable(error?: unknown): Response {
  // Log only the database error text; never request bodies, names, or deletion secrets.
  if (error) console.error("leaderboard unavailable:", error instanceof Error ? error.message : String(error));
  return Response.json({ error: "The public board is unavailable." }, { status: 503, headers: NO_STORE });
}
