import Link from "next/link";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireAdminOrCasinoUser } from "@/lib/auth-helpers";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CasinoIndexPage() {
  const user = await requireAdminOrCasinoUser();

  if (user.role === "CASINO" && user.managedPokerRoomId) {
    redirect(`/casino/${user.managedPokerRoomId}`);
  }

  if (user.role !== "ADMIN") {
    redirect("/casino" + (user.managedPokerRoomId ? `/${user.managedPokerRoomId}` : ""));
  }

  const rooms = await prisma.pokerRoom.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      city: true,
      state: true,
      country: true,
      managers: { select: { email: true } },
    },
  });

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {rooms.map((room) => (
        <Card key={room.id}>
          <CardHeader>
            <CardTitle className="text-xl">
              {room.name}
              <span className="block text-sm font-normal text-muted-foreground">
                {room.city}
                {room.state ? `, ${room.state}` : ""} · {room.country}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-between">
            {room.managers.length ? (
              <div className="text-sm text-muted-foreground">
                Delegated to {room.managers.map((m) => m.email).join(", ")}
              </div>
            ) : (
              <div className="text-sm text-muted-foreground">No partner account assigned.</div>
            )}
            <Link href={`/casino/${room.id}`} className="text-sm font-semibold text-primary">
              Manage →
            </Link>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
