import { prisma } from "@/lib/prisma";
import { TransactionType, GameType, GameVariant } from "@prisma/client";
import {
  createGameSessionSchema,
  updateGameSessionSchema,
  getGameSessionsSchema,
} from "@/lib/validators/bankroll";

// ============ Session CRUD ============

export async function createGameSession(input: unknown) {
  const data = createGameSessionSchema.parse(input);

  // Calculate result
  const result = data.cashOut - data.buyIn;

  // Get account for balance update
  const account = await prisma.bankrollAccount.findUnique({
    where: { id: data.bankrollAccountId },
  });

  if (!account) {
    throw new Error("Bankroll account not found");
  }

  // Check if user can afford the buy-in
  if (account.balance < data.buyIn) {
    throw new Error(
      `Insufficient balance. Account has ${account.balance} cents, buy-in is ${data.buyIn} cents`
    );
  }

  // Create session with transactions in a single transaction
  const [session] = await prisma.$transaction([
    // Create the session
    prisma.gameSession.create({
      data: {
        bankrollAccountId: data.bankrollAccountId,
        sessionType: data.sessionType,
        variant: data.variant,
        buyIn: data.buyIn,
        cashOut: data.cashOut,
        result,
        stakesDescription: data.stakesDescription,
        venueName: data.venueName,
        startedAt: data.startedAt ?? new Date(),
        endedAt: data.endedAt,
        durationMinutes: data.durationMinutes,
        notes: data.notes,
      },
    }),
    // Deduct buy-in from balance
    prisma.bankrollAccount.update({
      where: { id: data.bankrollAccountId },
      data: {
        balance: account.balance - data.buyIn + data.cashOut,
        lastSyncedAt: new Date(),
      },
    }),
  ]);

  // Create transaction records for audit trail
  const balanceAfterBuyIn = account.balance - data.buyIn;
  const balanceAfterCashOut = balanceAfterBuyIn + data.cashOut;

  await prisma.$transaction([
    prisma.bankrollTransaction.create({
      data: {
        bankrollAccountId: data.bankrollAccountId,
        type: TransactionType.SESSION_BUYIN,
        amount: -data.buyIn,
        balanceAfter: balanceAfterBuyIn,
        sessionId: session.id,
        notes: `Buy-in: ${data.stakesDescription || data.sessionType}`,
      },
    }),
    ...(data.cashOut > 0
      ? [
          prisma.bankrollTransaction.create({
            data: {
              bankrollAccountId: data.bankrollAccountId,
              type: TransactionType.SESSION_CASHOUT,
              amount: data.cashOut,
              balanceAfter: balanceAfterCashOut,
              sessionId: session.id,
              notes: `Cash-out: ${data.stakesDescription || data.sessionType}`,
            },
          }),
        ]
      : []),
  ]);

  return session;
}

export async function updateGameSession(input: unknown) {
  const data = updateGameSessionSchema.parse(input);
  const { id, ...updateData } = data;

  // Get current session
  const currentSession = await prisma.gameSession.findUnique({
    where: { id },
    include: { bankrollAccount: true },
  });

  if (!currentSession) {
    throw new Error("Session not found");
  }

  // If cashOut is being updated, we need to adjust the balance
  if (data.cashOut !== undefined && data.cashOut !== currentSession.cashOut) {
    const cashOutDiff = data.cashOut - currentSession.cashOut;
    const newResult = data.cashOut - currentSession.buyIn;
    const newBalance = currentSession.bankrollAccount.balance + cashOutDiff;

    await prisma.$transaction([
      prisma.gameSession.update({
        where: { id },
        data: {
          ...updateData,
          result: newResult,
        },
      }),
      prisma.bankrollAccount.update({
        where: { id: currentSession.bankrollAccountId },
        data: {
          balance: newBalance,
          lastSyncedAt: new Date(),
        },
      }),
      prisma.bankrollTransaction.create({
        data: {
          bankrollAccountId: currentSession.bankrollAccountId,
          type: TransactionType.SESSION_CASHOUT,
          amount: cashOutDiff,
          balanceAfter: newBalance,
          sessionId: id,
          notes: `Cash-out adjustment`,
        },
      }),
    ]);

    return prisma.gameSession.findUnique({ where: { id } });
  }

  // Simple update without balance changes
  return prisma.gameSession.update({
    where: { id },
    data: updateData,
  });
}

export async function getGameSessions(input: unknown) {
  const data = getGameSessionsSchema.parse(input);

  // Build where clause
  const where: Record<string, unknown> = {};

  if (data.bankrollAccountId) {
    where.bankrollAccountId = data.bankrollAccountId;
  }

  if (data.userId) {
    where.bankrollAccount = { userId: data.userId };
  }

  if (data.sessionType) {
    where.sessionType = data.sessionType;
  }

  if (data.startDate || data.endDate) {
    where.startedAt = {
      ...(data.startDate ? { gte: data.startDate } : {}),
      ...(data.endDate ? { lte: data.endDate } : {}),
    };
  }

  return prisma.gameSession.findMany({
    where,
    orderBy: { startedAt: "desc" },
    take: data.limit,
    skip: data.offset,
    include: {
      bankrollAccount: {
        select: {
          provider: true,
          nickname: true,
          currency: true,
        },
      },
    },
  });
}

export async function getGameSessionById(id: string) {
  return prisma.gameSession.findUnique({
    where: { id },
    include: {
      bankrollAccount: true,
      transactions: {
        orderBy: { createdAt: "asc" },
      },
    },
  });
}

export async function deleteGameSession(id: string) {
  // Get session to reverse balance changes
  const session = await prisma.gameSession.findUnique({
    where: { id },
    include: { bankrollAccount: true },
  });

  if (!session) {
    throw new Error("Session not found");
  }

  // Reverse the balance change: add back buyIn, subtract cashOut
  const balanceAdjustment = session.buyIn - session.cashOut;
  const newBalance = session.bankrollAccount.balance + balanceAdjustment;

  await prisma.$transaction([
    prisma.bankrollTransaction.deleteMany({
      where: { sessionId: id },
    }),
    prisma.gameSession.delete({
      where: { id },
    }),
    prisma.bankrollAccount.update({
      where: { id: session.bankrollAccountId },
      data: {
        balance: newBalance,
        lastSyncedAt: new Date(),
      },
    }),
  ]);

  return { deleted: true, balanceRestored: balanceAdjustment };
}

// ============ Session Analytics ============

export async function getSessionStats(userId: string) {
  const sessions = await prisma.gameSession.findMany({
    where: {
      bankrollAccount: { userId },
    },
    select: {
      sessionType: true,
      variant: true,
      buyIn: true,
      cashOut: true,
      result: true,
      durationMinutes: true,
      startedAt: true,
    },
  });

  if (sessions.length === 0) {
    return {
      totalSessions: 0,
      totalProfit: 0,
      winRate: 0,
      avgSessionProfit: 0,
      avgSessionDuration: 0,
      byType: {},
      byVariant: {},
    };
  }

  const totalProfit = sessions.reduce((sum, s) => sum + s.result, 0);
  const winningSessions = sessions.filter((s) => s.result > 0).length;
  const winRate = (winningSessions / sessions.length) * 100;

  const sessionsWithDuration = sessions.filter((s) => s.durationMinutes);
  const avgDuration =
    sessionsWithDuration.length > 0
      ? sessionsWithDuration.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) /
        sessionsWithDuration.length
      : 0;

  // Group by type
  const byType: Record<string, { count: number; profit: number; winRate: number }> = {};
  for (const type of Object.values(GameType)) {
    const typeSessions = sessions.filter((s) => s.sessionType === type);
    if (typeSessions.length > 0) {
      const typeProfit = typeSessions.reduce((sum, s) => sum + s.result, 0);
      const typeWins = typeSessions.filter((s) => s.result > 0).length;
      byType[type] = {
        count: typeSessions.length,
        profit: typeProfit,
        winRate: (typeWins / typeSessions.length) * 100,
      };
    }
  }

  // Group by variant
  const byVariant: Record<string, { count: number; profit: number; winRate: number }> = {};
  for (const variant of Object.values(GameVariant)) {
    const variantSessions = sessions.filter((s) => s.variant === variant);
    if (variantSessions.length > 0) {
      const variantProfit = variantSessions.reduce((sum, s) => sum + s.result, 0);
      const variantWins = variantSessions.filter((s) => s.result > 0).length;
      byVariant[variant] = {
        count: variantSessions.length,
        profit: variantProfit,
        winRate: (variantWins / variantSessions.length) * 100,
      };
    }
  }

  return {
    totalSessions: sessions.length,
    totalProfit,
    winRate,
    avgSessionProfit: totalProfit / sessions.length,
    avgSessionDuration: avgDuration,
    byType,
    byVariant,
  };
}

export async function getMonthlyProfitHistory(userId: string, months: number = 12) {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - months);

  const sessions = await prisma.gameSession.findMany({
    where: {
      bankrollAccount: { userId },
      startedAt: { gte: startDate },
    },
    select: {
      result: true,
      startedAt: true,
    },
    orderBy: { startedAt: "asc" },
  });

  // Group by month
  const monthlyData: Record<string, number> = {};

  for (const session of sessions) {
    const monthKey = session.startedAt.toISOString().slice(0, 7); // "YYYY-MM"
    monthlyData[monthKey] = (monthlyData[monthKey] || 0) + session.result;
  }

  // Convert to array with running total
  let runningTotal = 0;
  const history = Object.entries(monthlyData).map(([month, profit]) => {
    runningTotal += profit;
    return {
      month,
      profit,
      cumulative: runningTotal,
    };
  });

  return history;
}
