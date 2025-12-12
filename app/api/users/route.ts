import { NextRequest } from "next/server";
import { ZodError } from "zod";
import {
  userPostSchema,
  userPreferenceSchema,
} from "@/lib/validators/users";
import {
  registerUser,
  loginUser,
  getUserProfile,
  updateUserPreferences,
} from "@/lib/services/users";
import { ok, created, error } from "@/lib/http";

export async function POST(request: NextRequest) {
  try {
    const payload = await request.json();
    const parsed = userPostSchema.parse(payload);
    if (parsed.intent === "register") {
      const user = await registerUser(parsed.payload);
      return created(user);
    }
    const user = await loginUser(parsed.payload);
    return ok(user);
  } catch (err) {
    const message = err instanceof ZodError ? err.errors.map((e) => e.message).join(", ") : (err as Error).message;
    return error(message, err instanceof ZodError ? 422 : 400);
  }
}

export async function GET(request: NextRequest) {
  const userId = request.nextUrl.searchParams.get("userId");
  if (!userId) {
    return error("userId is required", 400);
  }
  try {
    const user = await getUserProfile(userId);
    if (!user) {
      return error("User not found", 404);
    }
    const { hashedPassword: _hashedPassword, ...safeUser } = user;
    void _hashedPassword;
    return ok(safeUser);
  } catch {
    return error("Unable to fetch profile", 500);
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const payload = userPreferenceSchema.parse(await request.json());
    const user = await updateUserPreferences(payload);
    return ok(user);
  } catch (err) {
    const message = err instanceof ZodError ? err.errors.map((e) => e.message).join(", ") : "Unable to update preferences";
    return error(message, err instanceof ZodError ? 422 : 500);
  }
}
