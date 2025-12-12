import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { listTournaments, createTournament } from "@/lib/services/tournaments";
import { ok, created, error } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const search = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = await listTournaments(search);
    return ok(result);
  } catch (err) {
    const message = err instanceof ZodError ? err.errors.map((e) => e.message).join(", ") : "Unable to fetch tournaments";
    return error(message, err instanceof ZodError ? 422 : 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const tournament = await createTournament(payload);
    return created(tournament);
  } catch (err) {
    const message = err instanceof ZodError ? err.errors.map((e) => e.message).join(", ") : "Unable to create tournament";
    return error(message, err instanceof ZodError ? 422 : 500);
  }
}
