import { Suspense } from "react";
import { Metadata } from "next";
import { listRooms } from "@/lib/services/rooms";
import { RoomCard } from "@/components/rooms/room-card";
import { RoomFilters } from "@/components/rooms/room-filters";
import { RoomsMap } from "@/components/maps/rooms-map";
import { PaginationControls } from "@/components/pagination/pagination";
import { getCurrentUser } from "@/lib/auth-helpers";
import { getFavoriteRoomIds } from "@/lib/services/favorites";
import type { RoomWithGames } from "@/types";

export const metadata: Metadata = {
  title: "Poker Rooms Directory — Global TH Index",
};

interface Props {
  searchParams: Record<string, string | string[] | undefined>;
}

export default async function RoomsPage({ searchParams }: Props) {
  const [data, currentUser] = await Promise.all([
    listRooms(searchParams),
    getCurrentUser(),
  ]);
  const rooms = data.items as RoomWithGames[];
  const favoriteRoomIds = currentUser ? await getFavoriteRoomIds(currentUser.id) : [];

  return (
    <div className="container space-y-8 py-10">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">Rooms Directory</h1>
          <p className="text-muted-foreground">Filter by city, country, or brand. Live pagination and Mapbox view.</p>
        </div>
        <Suspense fallback={<div className="h-12 w-full animate-pulse rounded-md bg-muted" />}>
          <RoomFilters />
        </Suspense>
      </div>
      <div className="grid gap-8 lg:grid-cols-[3fr_2fr]">
        <div className="space-y-4">
          {rooms.map((room) => (
            <RoomCard
              key={room.id}
              room={room}
              currentUserId={currentUser?.id}
              initialIsFavorite={favoriteRoomIds.includes(room.id)}
            />
          ))}
          <PaginationControls page={data.page} pages={data.pages} searchParams={searchParams} />
        </div>
        <div>
          <RoomsMap rooms={rooms} />
        </div>
      </div>
    </div>
  );
}
