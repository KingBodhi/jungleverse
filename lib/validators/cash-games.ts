import { z } from "zod";
import { GameVariant } from "@prisma/client";

export const cashGameFilterSchema = z.object({
  city: z.string().optional(),
  country: z.string().optional(),
  stakesMin: z.coerce.number().optional(),
  stakesMax: z.coerce.number().optional(),
  roomId: z.string().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const cashGamePayloadSchema = z.object({
  pokerRoomId: z.string().cuid(),
  variant: z.nativeEnum(GameVariant),
  smallBlind: z.number().int().positive(),
  bigBlind: z.number().int().positive(),
  minBuyin: z.number().int().positive(),
  maxBuyin: z.number().int().positive(),
  usualDaysOfWeek: z.array(z.string()).default([]),
  usualHours: z.union([z.array(z.string()), z.record(z.string(), z.string())]).optional(),
  notes: z.string().optional(),
});

export type CashGamePayload = z.infer<typeof cashGamePayloadSchema>;
