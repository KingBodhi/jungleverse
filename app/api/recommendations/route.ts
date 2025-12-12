import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { buildRecommendations } from "@/lib/services/recommendations";
import { ok, error } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const search = Object.fromEntries(request.nextUrl.searchParams.entries());
    const recommendations = await buildRecommendations(search);
    return ok(recommendations);
  } catch (err) {
    const message = err instanceof ZodError ? err.errors.map((e) => e.message).join(", ") : (err as Error).message;
    return error(message, err instanceof ZodError ? 422 : 400);
  }
}
