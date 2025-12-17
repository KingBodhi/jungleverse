import { z } from "zod";
import { GameVariant } from "@prisma/client";

export const tournamentFilterSchema = z.object({
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  minBuyin: z.coerce.number().optional(),
  maxBuyin: z.coerce.number().optional(),
  region: z.string().optional(),
  radiusKm: z.coerce.number().optional(),
  latitude: z.coerce.number().optional(),
  longitude: z.coerce.number().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});

export const tournamentPayloadSchema = z.object({
  pokerRoomId: z.string().cuid(),
  variant: z.nativeEnum(GameVariant),
  startTime: z.coerce.date(),
  buyinAmount: z.number().int().positive(),
  rakeAmount: z.number().int().nonnegative().optional(),
  startingStack: z.number().int().positive(),
  blindLevelMinutes: z.number().int().positive(),
  reentryPolicy: z.string().optional(),
  bountyAmount: z.number().int().nonnegative().optional(),
  recurringRule: z.string().optional(),
  estimatedPrizePool: z.number().int().nonnegative().optional(),
  typicalFieldSize: z.number().int().positive().optional(),
});

export type TournamentPayload = z.infer<typeof tournamentPayloadSchema>;
