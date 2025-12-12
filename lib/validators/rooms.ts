import { z } from "zod";

export const roomFilterSchema = z.object({
  search: z.string().trim().optional(),
  city: z.string().trim().optional(),
  country: z.string().trim().optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const roomPayloadSchema = z.object({
  name: z.string().min(2),
  brand: z.string().optional(),
  address: z.string().optional(),
  city: z.string().min(2),
  state: z.string().optional(),
  country: z.string().min(2),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  timezone: z.string().optional(),
  website: z.string().url().optional(),
  phone: z.string().optional(),
});

export type RoomPayload = z.infer<typeof roomPayloadSchema>;
