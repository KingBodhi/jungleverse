import { NextRequest } from "next/server";
import { getSession } from "@/lib/auth-helpers";
import {
  getBankrollAccountById,
  updateBankrollAccount,
  deleteBankrollAccount,
} from "@/lib/services/bankroll";
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
    const account = await getBankrollAccountById(id);

    if (!account) {
      return error("Account not found", 404);
    }

    // Verify ownership
    if (account.userId !== session.user.id) {
      return error("Forbidden", 403);
    }

    return ok(account);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to fetch account",
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
    const existing = await getBankrollAccountById(id);
    if (!existing) {
      return error("Account not found", 404);
    }
    if (existing.userId !== session.user.id) {
      return error("Forbidden", 403);
    }

    const body = await request.json();
    const account = await updateBankrollAccount({ id, ...body });
    return ok(account);
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to update account",
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
    const existing = await getBankrollAccountById(id);
    if (!existing) {
      return error("Account not found", 404);
    }
    if (existing.userId !== session.user.id) {
      return error("Forbidden", 403);
    }

    await deleteBankrollAccount(id);
    return ok({ success: true });
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to delete account",
      500
    );
  }
}
