import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { listCashGames, createCashGame } from "@/lib/services/cash-games";
import { ok, created, error } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const search = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = await listCashGames(search);
    return ok(result);
  } catch (err) {
    const message = err instanceof ZodError ? err.issues.map((issue) => issue.message).join(", ") : "Unable to fetch cash games";
    return error(message, err instanceof ZodError ? 422 : 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const cashGame = await createCashGame(payload);
    return created(cashGame);
  } catch (err) {
    const message = err instanceof ZodError ? err.issues.map((issue) => issue.message).join(", ") : "Unable to create cash game";
    return error(message, err instanceof ZodError ? 422 : 500);
  }
}
