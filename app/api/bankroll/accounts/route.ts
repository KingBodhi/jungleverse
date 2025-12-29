import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import {
  createBankrollAccount,
  getBankrollAccounts,
} from "@/lib/services/bankroll";
import { ok, created, error } from "@/lib/http";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const includeInactive = request.nextUrl.searchParams.get("includeInactive") === "true";
    const accounts = await getBankrollAccounts({
      userId: session.user.id,
      includeInactive,
    });
    return ok(accounts);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to fetch bankroll accounts",
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
    const account = await createBankrollAccount({
      ...body,
      userId: session.user.id,
    });
    return created(account);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to create bankroll account",
      400
    );
  }
}
