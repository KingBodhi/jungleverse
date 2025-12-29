import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import {
  createTransaction,
  getTransactions,
  getBankrollAccountById,
} from "@/lib/services/bankroll";
import { ok, created, error } from "@/lib/http";

export async function GET(request: NextRequest) {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const searchParams = request.nextUrl.searchParams;
    const bankrollAccountId = searchParams.get("bankrollAccountId");

    if (!bankrollAccountId) {
      return error("bankrollAccountId is required", 400);
    }

    // Verify ownership
    const account = await getBankrollAccountById(bankrollAccountId);
    if (!account || account.userId !== session.user.id) {
      return error("Forbidden", 403);
    }

    const transactions = await getTransactions({
      bankrollAccountId,
      type: searchParams.get("type") ?? undefined,
      startDate: searchParams.get("startDate") ?? undefined,
      endDate: searchParams.get("endDate") ?? undefined,
      limit: parseInt(searchParams.get("limit") ?? "50"),
      offset: parseInt(searchParams.get("offset") ?? "0"),
    });

    return ok(transactions);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to fetch transactions",
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

    // Verify ownership of the account
    const account = await getBankrollAccountById(body.bankrollAccountId);
    if (!account || account.userId !== session.user.id) {
      return error("Forbidden", 403);
    }

    const transaction = await createTransaction(body);
    return created(transaction);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to create transaction",
      400
    );
  }
}
