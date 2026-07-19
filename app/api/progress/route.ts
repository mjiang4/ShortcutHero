import { DatabaseUnavailableError, getD1Database } from "../../../db";
import { invalidJsonResponse, readJsonRequest } from "../request";
import { parseDeletionRequest } from "../../persistence/round-payload";
import { hashDeletionToken } from "../../persistence/server";

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

  try {
    const db = await getD1Database();
    const deletionTokenHash = await hashDeletionToken(identity.deletionToken);
    await db
      .prepare(
        "DELETE FROM visitors WHERE id = ? AND deletion_token_hash = ?",
      )
      .bind(identity.visitorId, deletionTokenHash)
      .run();

    return new Response(null, {
      status: 204,
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const status = error instanceof DatabaseUnavailableError ? 503 : 500;
    return Response.json(
      { error: "Progress could not be deleted." },
      { status, headers: { "cache-control": "no-store" } },
    );
  }
}
