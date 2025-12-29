import { z } from "zod";
import { Provider, TransactionType, GameType, GameVariant } from "@prisma/client";

// Bankroll Account Validators
export const createBankrollAccountSchema = z.object({
  userId: z.string().cuid(),
  provider: z.nativeEnum(Provider),
  nickname: z.string().max(50).optional(),
  balance: z.number().int().nonnegative().default(0), // cents
  depositTolerance: z.number().int().nonnegative().default(0), // cents
  currency: z.string().length(3).default("USD"),
});

export const updateBankrollAccountSchema = z.object({
  id: z.string().cuid(),
  nickname: z.string().max(50).optional(),
  balance: z.number().int().nonnegative().optional(),
  depositTolerance: z.number().int().nonnegative().optional(),
  currency: z.string().length(3).optional(),
  isActive: z.boolean().optional(),
});

// Game Session Validators
export const createGameSessionSchema = z.object({
  bankrollAccountId: z.string().cuid(),
  sessionType: z.nativeEnum(GameType),
  variant: z.nativeEnum(GameVariant).default(GameVariant.NLHE),
  buyIn: z.number().int().positive(), // cents
  cashOut: z.number().int().nonnegative().default(0), // cents
  stakesDescription: z.string().max(50).optional(),
  venueName: z.string().max(100).optional(),
  startedAt: z.coerce.date().optional(),
  endedAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

export const updateGameSessionSchema = z.object({
  id: z.string().cuid(),
  cashOut: z.number().int().nonnegative().optional(),
  endedAt: z.coerce.date().optional(),
  durationMinutes: z.number().int().nonnegative().optional(),
  notes: z.string().max(1000).optional(),
});

// Transaction Validators
export const createTransactionSchema = z.object({
  bankrollAccountId: z.string().cuid(),
  type: z.nativeEnum(TransactionType),
  amount: z.number().int(), // can be negative for withdrawals
  sessionId: z.string().cuid().optional(),
  notes: z.string().max(500).optional(),
});

// Query Validators
export const getBankrollAccountsSchema = z.object({
  userId: z.string().cuid(),
  includeInactive: z.boolean().default(false),
});

export const getGameSessionsSchema = z.object({
  bankrollAccountId: z.string().cuid().optional(),
  userId: z.string().cuid().optional(),
  sessionType: z.nativeEnum(GameType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

export const getTransactionsSchema = z.object({
  bankrollAccountId: z.string().cuid(),
  type: z.nativeEnum(TransactionType).optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
  limit: z.number().int().positive().max(100).default(50),
  offset: z.number().int().nonnegative().default(0),
});

// Aggregation Validators
export const getBankrollSummarySchema = z.object({
  userId: z.string().cuid(),
});

// Types
export type CreateBankrollAccountInput = z.infer<typeof createBankrollAccountSchema>;
export type UpdateBankrollAccountInput = z.infer<typeof updateBankrollAccountSchema>;
export type CreateGameSessionInput = z.infer<typeof createGameSessionSchema>;
export type UpdateGameSessionInput = z.infer<typeof updateGameSessionSchema>;
export type CreateTransactionInput = z.infer<typeof createTransactionSchema>;
