"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { GameVariant } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-helpers";
import { hashPassword } from "@/lib/security";
import { createRoom } from "@/lib/services/rooms";
import { createTournament } from "@/lib/services/tournaments";
import { createCashGame } from "@/lib/services/cash-games";

const managerSchema = z.object({
  roomId: z.string().cuid("Invalid room id"),
  email: z.string().email("Valid email required"),
  name: z.string().max(80).optional(),
  password: z.string().min(8).max(128).optional(),
});

const roomSchema = z.object({
  name: z.string().min(1),
  brand: z.string().max(120).optional(),
  address: z.string().max(200).optional(),
  city: z.string().min(1),
  state: z.string().max(80).optional(),
  country: z.string().min(2),
  latitude: z.number().finite().optional(),
  longitude: z.number().finite().optional(),
  timezone: z.string().max(80).optional(),
  website: z.string().url().optional(),
  phone: z.string().max(40).optional(),
});

const tournamentSchema = z.object({
  pokerRoomId: z.string().cuid(),
  variant: z.nativeEnum(GameVariant),
  startTime: z.preprocess((value) => (value instanceof Date ? value : new Date(String(value))), z.date()),
  buyinAmount: z.number().int().positive(),
  rakeAmount: z.number().int().nonnegative().optional(),
  startingStack: z.number().int().positive().optional(),
  blindLevelMinutes: z.number().int().positive().optional(),
  reentryPolicy: z.string().max(160).optional(),
  bountyAmount: z.number().int().nonnegative().optional(),
  recurringRule: z.string().max(120).optional(),
  estimatedPrizePool: z.number().int().nonnegative().optional(),
  typicalFieldSize: z.number().int().positive().optional(),
});

const cashGameSchema = z.object({
  pokerRoomId: z.string().cuid(),
  variant: z.nativeEnum(GameVariant),
  smallBlind: z.number().int().positive(),
  bigBlind: z.number().int().positive(),
  minBuyin: z.number().int().positive(),
  maxBuyin: z.number().int().positive(),
  usualDaysOfWeek: z.array(z.string()).optional(),
  notes: z.string().max(280).optional(),
});

function normalizeOptionalString(value: unknown) {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length ? trimmed : undefined;
}

function normalizeOptionalNumber(value: unknown) {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function createRoomAction(data: unknown) {
  await requireAdmin();
  const input = (typeof data === "object" && data !== null ? data : {}) as Record<string, unknown>;
  const payload = roomSchema.parse({
    ...input,
    brand: normalizeOptionalString(input.brand),
    address: normalizeOptionalString(input.address),
    state: normalizeOptionalString(input.state),
    timezone: normalizeOptionalString(input.timezone),
    website: normalizeOptionalString(input.website),
    phone: normalizeOptionalString(input.phone),
    latitude: normalizeOptionalNumber(input.latitude),
    longitude: normalizeOptionalNumber(input.longitude),
  });
  await createRoom(payload);
  revalidatePath("/admin");
}

export async function createTournamentAction(data: unknown) {
  await requireAdmin();
  const payload = tournamentSchema.parse(data ?? {});
  await createTournament(payload);
  revalidatePath("/admin");
}

export async function createCashGameAction(data: unknown) {
  await requireAdmin();
  const parsed = cashGameSchema.parse(data ?? {});
  const payload = {
    ...parsed,
    usualDaysOfWeek: parsed.usualDaysOfWeek ?? [],
  };
  await createCashGame(payload);
  revalidatePath("/admin");
}

export async function createCasinoManagerAction(formData: FormData) {
  const admin = await requireAdmin();
  try {
    const data = managerSchema.parse({
      roomId: formData.get("roomId"),
      email: formData.get("email"),
      name: formData.get("name") || undefined,
      password: formData.get("password") || undefined,
    });

    const existingUser = await prisma.user.findUnique({
      where: { email: data.email },
      select: { id: true, username: true },
    });

    if (!existingUser && !data.password) {
      throw new Error("Password is required when creating a new casino account");
    }

    const usernameBase = data.email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 20) || "manager";
    const generatedUsername = `${usernameBase}-${Math.random().toString(36).slice(2, 6)}`;

    const updateData: Record<string, unknown> = {
      name: data.name,
      role: "CASINO",
      managedPokerRoomId: data.roomId,
    };

    if (!existingUser) {
      updateData.username = generatedUsername;
    }

    if (data.password) {
      updateData.hashedPassword = await hashPassword(data.password);
    }

    await prisma.user.upsert({
      where: { email: data.email },
      update: updateData,
      create: {
        email: data.email,
        username: (updateData.username as string) ?? generatedUsername,
        name: data.name,
        role: "CASINO",
        managedPokerRoomId: data.roomId,
        hashedPassword: await hashPassword(data.password!),
      },
    });
  } catch (error) {
    console.error("Failed to assign casino manager", { admin: admin.email, error });
    throw error;
  }

  revalidatePath("/admin");
  const roomId = formData.get("roomId");
  if (typeof roomId === "string") {
    revalidatePath(`/casino/${roomId}`);
  }
}

const revokeSchema = z.object({
  userId: z.string().cuid("Invalid user id"),
});

export async function revokeCasinoManagerAction(formData: FormData) {
  await requireAdmin();
  const { userId } = revokeSchema.parse({ userId: formData.get("userId") });
  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      role: "USER",
      managedPokerRoomId: null,
    },
    select: { managedPokerRoomId: true },
  });
  revalidatePath("/admin");
  if (user.managedPokerRoomId) {
    revalidatePath(`/casino/${user.managedPokerRoomId}`);
  }
}
