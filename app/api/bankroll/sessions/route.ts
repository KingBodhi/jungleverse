import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import {
  createGameSession,
  getGameSessions,
} from "@/lib/services/sessions";
import { getBankrollAccountById } from "@/lib/services/bankroll";
import { ok, created, error } from "@/lib/http";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const bankrollAccountId = searchParams.get("bankrollAccountId");

    // If specific account, verify ownership
    if (bankrollAccountId) {
      const account = await getBankrollAccountById(bankrollAccountId);
      if (!account || account.userId !== session.user.id) {
        return error("Forbidden", 403);
      }
    }

    const gameSessions = await getGameSessions({
      bankrollAccountId: bankrollAccountId ?? undefined,
      userId: bankrollAccountId ? undefined : session.user.id,
      sessionType: searchParams.get("sessionType") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50"),
      offset: parseInt(searchParams.get("offset") ?? "0"),
    });

    return ok(gameSessions);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to fetch sessions",
      500
    );
  }
}

export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const body = await request.json();

    // Verify ownership of the bankroll account
    const account = await getBankrollAccountById(body.bankrollAccountId);
    if (!account || account.userId !== session.user.id) {
      return error("Forbidden", 403);
    }

    const gameSession = await createGameSession(body);
    return created(gameSession);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to create session",
      400
    );
  }
}
