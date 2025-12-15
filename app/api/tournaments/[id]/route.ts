import { NextRequest } from "next/server";
import { getTournamentById } from "@/lib/services/tournaments";
import { ok, error } from "@/lib/http";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const tournament = await getTournamentById(id);
    if (!tournament) {
      return error("Tournament not found", 404);
    }
    return ok(tournament);
  } catch {
    return error("Unable to retrieve tournament", 500);
  }
}
