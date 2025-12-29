import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import {
  getGameSessionById,
  updateGameSession,
  deleteGameSession,
} from "@/lib/services/sessions";
import { ok, error } from "@/lib/http";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const { id } = await params;
    const gameSession = await getGameSessionById(id);

    if (!gameSession) {
      return error("Session not found", 404);
    }

    // Verify ownership through bankroll account
    if (gameSession.bankrollAccount.userId !== session.user.id) {
      return error("Forbidden", 403);
    }

    return ok(gameSession);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to fetch session",
      500
    );
  }
}

export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const { id } = await params;

    // Verify ownership first
    const existing = await getGameSessionById(id);
    if (!existing) {
      return error("Session not found", 404);
    }
    if (existing.bankrollAccount.userId !== session.user.id) {
      return error("Forbidden", 403);
    }

    const body = await request.json();
    const gameSession = await updateGameSession({ id, ...body });
    return ok(gameSession);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to update session",
      400
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const { id } = await params;

    // Verify ownership first
    const existing = await getGameSessionById(id);
    if (!existing) {
      return error("Session not found", 404);
    }
    if (existing.bankrollAccount.userId !== session.user.id) {
      return error("Forbidden", 403);
    }

    const result = await deleteGameSession(id);
    return ok(result);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to delete session",
      500
    );
  }
}
