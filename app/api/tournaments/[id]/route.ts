import { NextRequest } from "next/server";
import { getTournamentById } from "@/lib/services/tournaments";
import { ok, error } from "@/lib/http";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const tournament = await getTournamentById(params.id);
    if (!tournament) {
      return error("Tournament not found", 404);
    }
    return ok(tournament);
  } catch {
    return error("Unable to retrieve tournament", 500);
  }
}
