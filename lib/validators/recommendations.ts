import { z } from "zod";

export const recommendationQuerySchema = z.object({
  userId: z.string().cuid(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
