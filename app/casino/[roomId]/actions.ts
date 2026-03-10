"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireRoomAccess } from "@/lib/auth-helpers";

const brandingSchema = z.object({
  roomId: z.string().cuid(),
  logoUrl: z.string().url().optional(),
  heroImageUrl: z.string().url().optional(),
  imageUrl: z.string().url().optional(),
  cashSourceUrl: z.string().url().optional(),
  tournamentSourceUrl: z.string().url().optional(),
});

function normalizeInput(value: FormDataEntryValue | null) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

export async function updateBrandingAction(formData: FormData) {
  const roomId = normalizeInput(formData.get("roomId"));
  if (!roomId) {
    throw new Error("Room id required");
  }
  await requireRoomAccess(roomId);

  const parsed = brandingSchema.parse({
    roomId,
    logoUrl: normalizeInput(formData.get("logoUrl")),
    heroImageUrl: normalizeInput(formData.get("heroImageUrl")),
    imageUrl: normalizeInput(formData.get("imageUrl")),
    cashSourceUrl: normalizeInput(formData.get("cashSourceUrl")),
    tournamentSourceUrl: normalizeInput(formData.get("tournamentSourceUrl")),
  });

  await prisma.pokerRoom.update({
    where: { id: parsed.roomId },
    data: {
      logoUrl: parsed.logoUrl ?? null,
      heroImageUrl: parsed.heroImageUrl ?? null,
      imageUrl: parsed.imageUrl ?? null,
      cashSourceUrl: parsed.cashSourceUrl ?? null,
      tournamentSourceUrl: parsed.tournamentSourceUrl ?? null,
    },
  });

  revalidatePath(`/casino/${parsed.roomId}`);
  revalidatePath(`/rooms/${parsed.roomId}`);
  revalidatePath("/admin");
}
