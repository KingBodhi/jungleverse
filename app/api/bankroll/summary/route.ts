import { getSession } from "@/lib/auth-helpers";
import { getBankrollSummary } from "@/lib/services/bankroll";
import { getSessionStats, getMonthlyProfitHistory } from "@/lib/services/sessions";
import { ok, error } from "@/lib/http";

export async function GET() {
  const session = await getSession();
  if (!session?.user?.id) {
    return error("Unauthorized", 401);
  }

  try {
    const [summary, stats, history] = await Promise.all([
      getBankrollSummary({ userId: session.user.id }),
      getSessionStats(session.user.id),
      getMonthlyProfitHistory(session.user.id, 12),
    ]);

    return ok({
      ...summary,
      stats,
      monthlyHistory: history,
    });
  } catch (err) {
    return error(
      err instanceof Error ? err.message : "Failed to fetch bankroll summary",
      500
    );
  }
}
