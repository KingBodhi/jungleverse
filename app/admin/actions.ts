"use server";

import { revalidatePath } from "next/cache";
import { roomPayloadSchema } from "@/lib/validators/rooms";
import { cashGamePayloadSchema } from "@/lib/validators/cash-games";
import { tournamentPayloadSchema } from "@/lib/validators/tournaments";
import { createRoom } from "@/lib/services/rooms";
import { createCashGame } from "@/lib/services/cash-games";
import { createTournament } from "@/lib/services/tournaments";

export async function createRoomAction(values: unknown) {
  const payload = roomPayloadSchema.parse(values);
  const room = await createRoom(payload);
  revalidatePath("/rooms");
  return room;
}

export async function createCashGameAction(values: unknown) {
  const payload = cashGamePayloadSchema.parse(values);
  const game = await createCashGame(payload);
  revalidatePath("/cash-games");
  return game;
}

export async function createTournamentAction(values: unknown) {
  const payload = tournamentPayloadSchema.parse(values);
  const tournament = await createTournament(payload);
  revalidatePath("/tournaments");
  return tournament;
}
