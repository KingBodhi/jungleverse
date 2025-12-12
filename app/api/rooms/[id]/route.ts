import { NextRequest } from "next/server";
import { getRoomById } from "@/lib/services/rooms";
import { ok, error } from "@/lib/http";

export async function GET(_request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const room = await getRoomById(params.id);
    if (!room) {
      return error("Room not found", 404);
    }
    return ok(room);
  } catch {
    return error("Unable to retrieve room", 500);
  }
}
