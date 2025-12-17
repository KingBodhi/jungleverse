import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import {
  addFavorite,
  removeFavorite,
  getFavorites,
} from "@/lib/services/favorites";
import { ok, created, error } from "@/lib/http";
import { z } from "zod";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const favorites = await getFavorites(session.user.id);
    return ok(favorites);
  } catch {
    return error("Failed to fetch favorites", 500);
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const body = await request.json();
    const { pokerRoomId } = z.object({ pokerRoomId: z.string() }).parse(body);
    const favorite = await addFavorite(session.user.id, pokerRoomId);
    return created(favorite);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to add favorite",
      400
    );
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const pokerRoomId = request.nextUrl.searchParams.get("pokerRoomId");
    if (!pokerRoomId) {
      return error("pokerRoomId is required", 400);
    }
    await removeFavorite(session.user.id, pokerRoomId);
    return ok({ success: true });
  } catch {
    return error("Failed to remove favorite", 500);
  }
}
