import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getRoomById } from "@/lib/services/rooms";
import { getCurrentUser } from "@/lib/auth-helpers";
import { isFavorite } from "@/lib/services/favorites";
import { RoomDetailClient } from "@/components/rooms/room-detail-client";

type RouteParams = { id: string };
type MaybePromise<T> = T | Promise<T>;

interface Props {
  params: MaybePromise<RouteParams>;
}

export const metadata: Metadata = {
  title: "Room Details — Global TH Index",
};

export default async function RoomDetailPage({ params }: Props) {
  const resolvedParams = await resolveParams(params);

  const roomId = resolvedParams?.id ? decodeURIComponent(resolvedParams.id) : null;

  if (!roomId) {
    notFound();
  }

  const [room, currentUser] = await Promise.all([
    getRoomById(roomId),
    getCurrentUser(),
  ]);

  if (!room) {
    notFound();
  }

  const initialIsFavorite = currentUser ? await isFavorite(currentUser.id, room.id) : false;

  return (
    <RoomDetailClient
      room={room}
      isAuthenticated={Boolean(currentUser)}
      initialIsFavorite={initialIsFavorite}
    />
  );
}

async function resolveParams(input: MaybePromise<RouteParams>) {
  if (typeof (input as Promise<RouteParams>).then === "function") {
    return (input as Promise<RouteParams>);
  }

  return input as RouteParams;
}
