"use client";

import dynamic from "next/dynamic";
import type { RoomWithGames } from "@/types";

const Map = dynamic(() => import("./rooms-map.client"), { ssr: false });

interface Props {
  rooms: RoomWithGames[];
}

export function RoomsMap(props: Props) {
  return <Map {...props} />;
}
