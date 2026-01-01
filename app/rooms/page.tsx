import { Suspense } from "react";
import Link from "next/link";
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
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function RoomsPage({ searchParams }: Props) {
  const resolvedSearchParams = await searchParams;
  const sanitizedSearchParams: Record<string, string | string[] | undefined> = {};
  for (const key in resolvedSearchParams) {
    const value = resolvedSearchParams[key];
    // Only include string or string[] values and exclude known problematic keys
    if (
      (typeof value === 'string' || (Array.isArray(value) && value.every(item => typeof item === 'string'))) &&
      !key.startsWith('_debugChunk') && // Exclude internal Next.js debug properties
      key !== 'status' && // Exclude status related to promise resolution
      key !== 'value' &&   // Exclude value related to promise resolution
      key !== 'reason'    // Exclude reason related to promise resolution
    ) {
      sanitizedSearchParams[key] = value;
    }
  }

  const [data, currentUser] = await Promise.all([
    listRooms(sanitizedSearchParams),
    getCurrentUser(),
  ]);
  const rooms = data.items as RoomWithGames[];
  const favoriteRoomIds = currentUser ? await getFavoriteRoomIds(currentUser.id) : [];
  const hasRooms = rooms.length > 0;

  return (
    <div className="container space-y-8 py-10">
      <div className="space-y-4">
        <div>
          <h1 className="text-3xl font-semibold">Rooms Directory</h1>
          <p className="text-muted-foreground">Filter by city, country, or brand. Live pagination and Mapbox view.</p>
        </div>
        <Suspense fallback={<div className="h-12 w-full rounded-full bg-muted" />}>
          <RoomFilters />
        </Suspense>
      </div>
      {hasRooms ? (
        <div className="grid gap-8 lg:grid-cols-1">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {rooms.map((room) => (
              <RoomCard
                key={room.id}
                room={room}
                currentUserId={currentUser?.id}
                initialIsFavorite={favoriteRoomIds.includes(room.id)}
              />
            ))}
          </div>
          <PaginationControls page={data.page} pages={data.pages} searchParams={sanitizedSearchParams} />
          <div>
            <RoomsMap rooms={rooms} />
          </div>
        </div>
      ) : (
        <RoomsEmptyState />
      )}
    </div>
  );
}

function RoomsEmptyState() {
  return (
    <div className="rounded-2xl border border-dashed bg-muted/20 p-12 text-center">
      <p className="text-lg font-semibold">No rooms match those filters—yet.</p>
      <p className="mt-2 text-sm text-muted-foreground">
        Clear filters or search a different city to discover active poker rooms.
      </p>
      <Link
        href="/rooms"
        className="mt-6 inline-flex items-center justify-center rounded-full border border-secondary px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-secondary transition hover:bg-secondary/10"
      >
        Reset filters
      </Link>
    </div>
  );
}
