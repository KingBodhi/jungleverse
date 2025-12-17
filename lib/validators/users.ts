import { z } from "zod";
import { GameVariant } from "@prisma/client";

export const userRegisterSchema = z.object({
  email: z.string().email(),
  username: z.string().min(3),
  password: z.string().min(8),
  homeLat: z.number().optional(),
  homeLng: z.number().optional(),
  bankrollProfile: z.string().optional(),
  riskTolerance: z.string().optional(),
  preferredStakesMin: z.number().optional(),
  preferredStakesMax: z.number().optional(),
  maxTravelDistance: z.number().optional(),
  preferredStartTimes: z.array(z.number()).optional(),
});

export const userLoginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const userPreferenceSchema = z.object({
  userId: z.string().cuid(),
  bankrollProfile: z.string().optional(),
  riskTolerance: z.string().optional(),
  preferredStakesMin: z.number().int().nonnegative().optional(),
  preferredStakesMax: z.number().int().nonnegative().optional(),
  maxTravelDistance: z.number().int().nonnegative().optional(),
  preferredStartTimes: z.array(z.number()).optional(),
  preferredVariants: z.array(z.nativeEnum(GameVariant)).optional(),
});

export const userPostSchema = z.discriminatedUnion("intent", [
  z.object({ intent: z.literal("register"), payload: userRegisterSchema }),
  z.object({ intent: z.literal("login"), payload: userLoginSchema }),
]);
