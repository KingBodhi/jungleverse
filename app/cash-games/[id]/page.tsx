import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCashGameById } from "@/lib/services/cash-games";
import type { CashGameWithRoom } from "@/types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type RouteParams = { id: string };
type MaybePromise<T> = T | Promise<T>;

interface Props {
  params: MaybePromise<RouteParams>;
}

export const metadata: Metadata = {
  title: "Cash Game Details — Global TH Index",
};

export default async function CashGameDetailPage({ params }: Props) {
  const resolvedParams = await resolveParams(params);
  const cashGameId = resolvedParams?.id ? decodeURIComponent(resolvedParams.id) : null;

  if (!cashGameId) {
    notFound();
  }

  const cashGame = (await getCashGameById(cashGameId)) as CashGameWithRoom | null;

  if (!cashGame) {
    notFound();
  }

  const room = cashGame.game.pokerRoom;
  const location = [room.city, room.state, room.country].filter(Boolean).join(", ");
  const buyInRange = formatCurrencyRange(cashGame.minBuyin, cashGame.maxBuyin) ?? "TBD";
  const scheduleLabel = cashGame.usualDaysOfWeek.length
    ? cashGame.usualDaysOfWeek.join(", ")
    : "TBD";
  const stakesLabel = formatStakes(cashGame.smallBlind, cashGame.bigBlind);

  return (
    <div className="container space-y-6 py-10">
      <div>
        <h1 className="text-4xl font-bold">
          {`${room.name} · ${stakesLabel}`}
        </h1>
        <p className="text-muted-foreground">{location}</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <Button asChild variant="outline">
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
        <CardContent className="space-y-3 text-sm">
          <DetailRow label="Buy-in range" value={buyInRange} />
          <DetailRow label="Usual days" value={scheduleLabel} />
          {cashGame.notes ? <DetailRow label="Notes" value={cashGame.notes} /> : null}
        </CardContent>
      </Card>
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="text-base font-semibold">{value}</p>
    </div>
  );
}

function formatCurrency(value?: number | null) {
  if (typeof value !== "number") return null;
  return `$${value.toLocaleString()}`;
}

function formatCurrencyRange(min?: number | null, max?: number | null) {
  const minLabel = formatCurrency(min);
  const maxLabel = formatCurrency(max);
  if (minLabel && maxLabel) return `${minLabel} – ${maxLabel}`;
  return minLabel ?? maxLabel;
}

function formatStakes(small: number, big: number) {
  return `$${small.toLocaleString()}/$${big.toLocaleString()}`;
}

async function resolveParams(input: MaybePromise<RouteParams>) {
  if (typeof (input as Promise<RouteParams>).then === "function") {
    return (input as Promise<RouteParams>);
  }

  return input as RouteParams;
}
