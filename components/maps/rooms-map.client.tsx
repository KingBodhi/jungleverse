"use client";

import type { RoomWithGames } from "@/types";

interface Props {
  rooms: RoomWithGames[];
}

export default function RoomsMapClient({ rooms }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const roomsWithCoords = rooms.filter(r => r.latitude && r.longitude);

  if (!token) {
    return <div className="rounded-lg border p-6 text-sm text-muted-foreground">Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the interactive map.</div>;
  }

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-xl border bg-muted/20 p-6">
      <div className="space-y-4">
        <h3 className="text-sm font-medium">Poker Rooms Locations</h3>
        <div className="space-y-2 text-sm text-muted-foreground">
          {roomsWithCoords.length > 0 ? (
            roomsWithCoords.map((room) => (
              <div key={room.id} className="flex items-center gap-2">
                <div className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground">
                  {room.city}
                </div>
                <span className="text-xs">
                  {room.latitude?.toFixed(4)}, {room.longitude?.toFixed(4)}
                </span>
              </div>
            ))
          ) : (
            <p>No location data available for rooms.</p>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          Note: Interactive map temporarily disabled due to compatibility issues. Location data shown above.
        </p>
      </div>
    </div>
  );
}
