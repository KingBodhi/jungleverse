import { RoomCardSkeleton } from "@/components/rooms/room-card-skeleton";

export default function RoomsLoading() {
  return (
    <div className="container space-y-8 py-10">
      <div className="space-y-4">
        <div className="space-y-2">
          <div className="skeleton h-8 w-64 rounded" />
          <div className="skeleton h-4 w-80 rounded" />
        </div>
        <div className="skeleton h-12 w-full rounded-full" />
      </div>
      <div className="grid gap-8 lg:grid-cols-1">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, index) => (
            <RoomCardSkeleton key={index} />
          ))}
        </div>
        <div className="skeleton h-10 w-48 rounded-full" />
        <div className="skeleton h-72 rounded-2xl" />
      </div>
    </div>
  );
}
