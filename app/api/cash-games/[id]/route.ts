import { NextRequest } from "next/server";
import { getCashGameById } from "@/lib/services/cash-games";
import { ok, error } from "@/lib/http";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const cashGame = await getCashGameById(params.id);
    if (!cashGame) {
      return error("Cash game not found", 404);
    }
    return ok(cashGame);
  } catch {
    return error("Unable to retrieve cash game", 500);
  }
}
