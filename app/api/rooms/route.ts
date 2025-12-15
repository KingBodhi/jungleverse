import { NextRequest } from "next/server";
import { ZodError } from "zod";
import { listRooms, createRoom } from "@/lib/services/rooms";
import { ok, created, error } from "@/lib/http";

export async function GET(request: NextRequest) {
  try {
    const search = Object.fromEntries(request.nextUrl.searchParams.entries());
    const result = await listRooms(search);
    return ok(result);
  } catch (err) {
    const message = err instanceof ZodError ? err.issues.map((issue) => issue.message).join(", ") : "Unable to fetch rooms";
    return error(message, err instanceof ZodError ? 422 : 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const room = await createRoom(payload);
    return created(room);
  } catch (err) {
    const message = err instanceof ZodError ? err.issues.map((issue) => issue.message).join(", ") : "Unable to create room";
    return error(message, err instanceof ZodError ? 422 : 500);
  }
}
