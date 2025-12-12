"use client";

import { useMemo } from "react";
import Map, { Marker, NavigationControl } from "react-map-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import type { RoomWithGames } from "@/types";

interface Props {
  rooms: RoomWithGames[];
}

export default function RoomsMapClient({ rooms }: Props) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const center = useMemo(() => {
    if (!rooms.length || !rooms[0].latitude || !rooms[0].longitude) {
      return { latitude: 36.1147, longitude: -115.1728, zoom: 3.5 };
    }
    const lat = rooms.reduce((sum, room) => sum + (room.latitude ?? 0), 0) / rooms.length;
    const lng = rooms.reduce((sum, room) => sum + (room.longitude ?? 0), 0) / rooms.length;
    return { latitude: lat || 36.1147, longitude: lng || -115.1728, zoom: 3.5 };
  }, [rooms]);

  if (!token) {
    return <div className="rounded-lg border p-6 text-sm text-muted-foreground">Add NEXT_PUBLIC_MAPBOX_TOKEN to enable the interactive map.</div>;
  }

  return (
    <div className="h-[420px] w-full overflow-hidden rounded-xl border">
      <Map
        initialViewState={center}
        mapStyle="mapbox://styles/mapbox/light-v11"
        mapboxAccessToken={token}
        style={{ width: "100%", height: "100%" }}
      >
        <NavigationControl position="top-left" />
        {rooms.map((room) =>
          room.latitude && room.longitude ? (
            <Marker key={room.id} latitude={room.latitude} longitude={room.longitude}>
              <div className="rounded-full bg-primary px-2 py-1 text-xs text-primary-foreground shadow">
                {room.city}
              </div>
            </Marker>
          ) : null
        )}
      </Map>
    </div>
  );
}
