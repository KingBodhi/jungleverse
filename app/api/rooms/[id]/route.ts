import { NextRequest } from "next/server";
import { getRoomById } from "@/lib/services/rooms";
import { ok, error } from "@/lib/http";

export async function GET(
  _request: NextRequest,
  context: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await context.params;
    const room = await getRoomById(id);
    if (!room) {
      return error("Room not found", 404);
    }
    return ok(room);
  } catch {
    return error("Unable to retrieve room", 500);
  }
}
