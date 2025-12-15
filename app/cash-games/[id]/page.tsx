import Link from "next/link";
import { notFound } from "next/navigation";
import { getCashGameById } from "@/lib/services/cash-games";
import type { CashGameWithRoom } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface Props {
  params: { id: string };
}

export default async function CashGameDetailPage({ params }: Props) {
  const cashGame = (await getCashGameById(params.id)) as CashGameWithRoom | null;
  if (!cashGame) {
    notFound();
  }
  const room = cashGame.game.pokerRoom;
  return (
    <div className="container space-y-6 py-10">
      <div>
        <h1 className="text-4xl font-bold">
          {room.name} · {cashGame.smallBlind}/{cashGame.bigBlind}
        </h1>
        <p className="text-muted-foreground">
          {room.city}, {room.country}
        </p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="ghost">
            <Link href="/cash-games">Back to cash games</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href={`/rooms/${room.id}`}>Visit room profile</Link>
          </Button>
        </div>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          <p>Buy-in range: {cashGame.minBuyin}-{cashGame.maxBuyin}</p>
          <p>Usual days: {cashGame.usualDaysOfWeek.join(", ") || "TBD"}</p>
          {cashGame.notes && <p>{cashGame.notes}</p>}
        </CardContent>
      </Card>
    </div>
  );
}
