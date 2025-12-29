import { prisma } from "@/lib/prisma";
import { Provider, TransactionType } from "@prisma/client";
import {
  createBankrollAccountSchema,
  updateBankrollAccountSchema,
  getBankrollAccountsSchema,
  createTransactionSchema,
  getTransactionsSchema,
  getBankrollSummarySchema,
} from "@/lib/validators/bankroll";

// ============ Bankroll Account Operations ============

export async function createBankrollAccount(input: unknown) {
  const data = createBankrollAccountSchema.parse(input);

  return prisma.bankrollAccount.create({
    data: {
      userId: data.userId,
      provider: data.provider,
      nickname: data.nickname,
      balance: data.balance,
      depositTolerance: data.depositTolerance,
      currency: data.currency,
    },
  });
}

export async function updateBankrollAccount(input: unknown) {
  const data = updateBankrollAccountSchema.parse(input);
  const { id, ...updateData } = data;

  // Filter out undefined values
  const cleanData = Object.fromEntries(
    Object.entries(updateData).filter(([, v]) => v !== undefined)
  );

  return prisma.bankrollAccount.update({
    where: { id },
    data: {
      ...cleanData,
      lastSyncedAt: new Date(),
    },
  });
}

export async function getBankrollAccounts(input: unknown) {
  const { userId, includeInactive } = getBankrollAccountsSchema.parse(input);

  return prisma.bankrollAccount.findMany({
    where: {
      userId,
      ...(includeInactive ? {} : { isActive: true }),
    },
    orderBy: { provider: "asc" },
  });
}

export async function getBankrollAccountById(id: string) {
  return prisma.bankrollAccount.findUnique({
    where: { id },
    include: {
      gameSessions: {
        orderBy: { startedAt: "desc" },
        take: 10,
      },
      transactions: {
        orderBy: { createdAt: "desc" },
        take: 10,
      },
    },
  });
}

export async function getBankrollAccountByProvider(userId: string, provider: Provider) {
  return prisma.bankrollAccount.findUnique({
    where: {
      userId_provider: { userId, provider },
    },
  });
}

export async function deleteBankrollAccount(id: string) {
  return prisma.bankrollAccount.delete({
    where: { id },
  });
}

// ============ Transaction Operations ============

export async function createTransaction(input: unknown) {
  const data = createTransactionSchema.parse(input);

  // Get current balance
  const account = await prisma.bankrollAccount.findUnique({
    where: { id: data.bankrollAccountId },
  });

  if (!account) {
    throw new Error("Bankroll account not found");
  }

  const newBalance = account.balance + data.amount;

  if (newBalance < 0) {
    throw new Error("Insufficient balance for this transaction");
  }

  // Create transaction and update balance in a transaction
  const [transaction] = await prisma.$transaction([
    prisma.bankrollTransaction.create({
      data: {
        bankrollAccountId: data.bankrollAccountId,
        type: data.type,
        amount: data.amount,
        balanceAfter: newBalance,
        sessionId: data.sessionId,
        notes: data.notes,
      },
    }),
    prisma.bankrollAccount.update({
      where: { id: data.bankrollAccountId },
      data: {
        balance: newBalance,
        lastSyncedAt: new Date(),
      },
    }),
  ]);

  return transaction;
}

export async function getTransactions(input: unknown) {
  const data = getTransactionsSchema.parse(input);

  return prisma.bankrollTransaction.findMany({
    where: {
      bankrollAccountId: data.bankrollAccountId,
      ...(data.type ? { type: data.type } : {}),
      ...(data.startDate || data.endDate
        ? {
            createdAt: {
              ...(data.startDate ? { gte: data.startDate } : {}),
              ...(data.endDate ? { lte: data.endDate } : {}),
            },
          }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: data.limit,
    skip: data.offset,
    include: {
      session: true,
    },
  });
}

// ============ Aggregation & Summary ============

export async function getBankrollSummary(input: unknown) {
  const { userId } = getBankrollSummarySchema.parse(input);

  const accounts = await prisma.bankrollAccount.findMany({
    where: { userId, isActive: true },
    include: {
      gameSessions: {
        select: {
          result: true,
          sessionType: true,
        },
      },
    },
  });

  // Calculate totals
  const totalBalance = accounts.reduce((sum, acc) => sum + acc.balance, 0);
  const totalDepositTolerance = accounts.reduce((sum, acc) => sum + acc.depositTolerance, 0);
  const effectiveBankroll = totalBalance + totalDepositTolerance;

  // Calculate P&L from sessions
  const allSessions = accounts.flatMap((acc) => acc.gameSessions);
  const totalProfit = allSessions.reduce((sum, s) => sum + s.result, 0);
  const cashProfit = allSessions
    .filter((s) => s.sessionType === "CASH")
    .reduce((sum, s) => sum + s.result, 0);
  const tournamentProfit = allSessions
    .filter((s) => s.sessionType === "TOURNAMENT")
    .reduce((sum, s) => sum + s.result, 0);

  // Per-provider breakdown
  const byProvider = accounts.map((acc) => ({
    provider: acc.provider,
    nickname: acc.nickname,
    balance: acc.balance,
    depositTolerance: acc.depositTolerance,
    effectiveBalance: acc.balance + acc.depositTolerance,
    currency: acc.currency,
    sessionCount: acc.gameSessions.length,
    profit: acc.gameSessions.reduce((sum, s) => sum + s.result, 0),
  }));

  return {
    totalBalance,
    totalDepositTolerance,
    effectiveBankroll,
    totalProfit,
    cashProfit,
    tournamentProfit,
    accountCount: accounts.length,
    byProvider,
  };
}

export async function getEffectiveBankrollForProvider(
  userId: string,
  provider: Provider
): Promise<number> {
  const account = await prisma.bankrollAccount.findUnique({
    where: {
      userId_provider: { userId, provider },
    },
  });

  if (!account || !account.isActive) {
    return 0;
  }

  return account.balance + account.depositTolerance;
}

export async function getTotalEffectiveBankroll(userId: string): Promise<number> {
  const accounts = await prisma.bankrollAccount.findMany({
    where: { userId, isActive: true },
    select: { balance: true, depositTolerance: true },
  });

  return accounts.reduce(
    (sum, acc) => sum + acc.balance + acc.depositTolerance,
    0
  );
}

// ============ Provider Mapping Helpers ============

const PROVIDER_TO_ONLINE_SITE: Record<string, Provider> = {
  pokerstars: Provider.POKERSTARS,
  "gg poker": Provider.GG_POKER,
  ggpoker: Provider.GG_POKER,
  "888": Provider.POKER_888,
  "888poker": Provider.POKER_888,
  partypoker: Provider.PARTY_POKER,
  "party poker": Provider.PARTY_POKER,
  wpt: Provider.WPT_GLOBAL,
  "wpt global": Provider.WPT_GLOBAL,
  wsop: Provider.WSOP_ONLINE,
  "wsop online": Provider.WSOP_ONLINE,
};

export function mapSiteNameToProvider(siteName: string): Provider | null {
  const normalized = siteName.toLowerCase().trim();
  return PROVIDER_TO_ONLINE_SITE[normalized] ?? null;
}

export function isLiveGame(pokerRoomName: string | null): boolean {
  // If there's a physical poker room name, it's a live game
  return pokerRoomName !== null;
}
