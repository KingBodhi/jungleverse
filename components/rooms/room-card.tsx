import Image from "next/image";
import Link from "next/link";
import { MapPin, Building2, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { FavoriteButton } from "@/components/rooms/favorite-button";
import type { RoomWithGames } from "@/types";
import { getRoomImage, getRoomLogo } from "@/lib/room-images";

interface Props {
  room: RoomWithGames;
  currentUserId?: string;
  initialIsFavorite?: boolean;
}

function formatStakes(small?: number | null, big?: number | null) {
  if (small == null || big == null) return null;
  return `$${small.toLocaleString()}/$${big.toLocaleString()}`;
}

function formatBuyIn(amount?: number | null) {
  if (amount == null) return null;
  return `$${amount.toLocaleString()}`;
}

function DataPills({
  label,
  values,
  placeholder,
}: {
  label: string;
  values: string[];
  placeholder: string;
}) {
  const hasValues = values.length > 0;

  return (
    <div className="space-y-2">
      <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {hasValues
          ? values.map((value, index) => (
              <Badge
                key={`${label}-${index}-${value}`}
                variant="outline"
                className="rounded-full border-dashed px-2 py-0 text-xs font-medium"
              >
                {value}
              </Badge>
            ))
          : (
            <Badge
              variant="secondary"
              className="rounded-full px-2 py-0 text-xs font-medium text-muted-foreground"
            >
              {placeholder}
            </Badge>
            )}
      </div>
    </div>
  );
}

export function RoomCard({ room, currentUserId, initialIsFavorite = false }: Props) {
  const cashGames = room.games.filter((game) => game.cashGame);
  const tournaments = room.games.filter((game) => game.tournament);
  const cashLabels = cashGames
    .map((game) => formatStakes(game.cashGame?.smallBlind, game.cashGame?.bigBlind))
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);
  const tournamentLabels = tournaments
    .map((game) => formatBuyIn(game.tournament?.buyinAmount))
    .filter((value): value is string => Boolean(value))
    .slice(0, 4);
  const logoSrc = getRoomLogo(room);
  const logoFallback = ((room.brand ?? room.name ?? "").slice(0, 2) || "??").toUpperCase();

  return (
    <Card className="flex h-full min-h-[420px] flex-col overflow-hidden border border-border/70 bg-card shadow-sm">
      <div className="relative h-48 w-full overflow-hidden">
        <Image
          src={getRoomImage(room)}
          alt={`${room.name} poker room`}
          fill
          sizes="(min-width: 1024px) 400px, (min-width: 768px) 50vw, 100vw"
          className="object-cover"
          priority={false}
        />
        <div className="absolute left-4 top-4 z-10">
          <div className="relative h-14 w-14 overflow-hidden rounded-full border border-white/70 bg-white/90 shadow-lg">
            {logoSrc ? (
              <Image
                src={logoSrc}
                alt={`${room.name} logo`}
                fill
                sizes="56px"
                className="object-contain p-1.5"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center text-sm font-semibold text-muted-foreground">
                {logoFallback}
              </div>
            )}
          </div>
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20" />
        <div className="absolute inset-x-4 bottom-3 flex items-end justify-between gap-3 text-white">
          <div>
            <Link href={`/rooms/${room.id}`} className="text-lg font-semibold leading-tight hover:text-primary">
              {room.name}
            </Link>
            <p className="mt-1 flex items-center gap-1 text-xs text-white/80">
              <MapPin className="h-3.5 w-3.5" />
              {room.city}
              {room.state ? `, ${room.state}` : ""}
              {`, ${room.country}`}
            </p>
          </div>
          <Badge variant="outline" className="border-white/40 text-white">
            {room.brand ?? "Independent"}
          </Badge>
        </div>
        {currentUserId ? (
          <div className="absolute right-3 top-3 rounded-full bg-white/90 p-0.5 shadow-md">
            <FavoriteButton roomId={room.id} initialIsFavorite={initialIsFavorite} />
          </div>
        ) : null}
      </div>
      <CardContent className="flex flex-1 flex-col gap-4 p-4 text-sm">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Timezone</p>
            <p className="font-medium">{room.timezone ?? "Syncing"}</p>
          </div>
          <div className="space-y-1">
            <p className="text-xs uppercase tracking-wide text-muted-foreground">Contact</p>
            <p className="font-medium">{room.phone ?? "Not provided"}</p>
          </div>
        </div>
        <DataPills
          label="Cash action"
          values={cashLabels}
          placeholder="Cash lineup syncing"
        />
        <DataPills
          label="Tournaments"
          values={tournamentLabels}
          placeholder="Tournament schedule coming soon"
        />
        <div className="mt-auto flex flex-wrap items-center justify-between gap-3 pt-2 text-sm">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Building2 className="h-4 w-4" />
            <span>
              {room.address?.split(",")[0]?.trim() || `${room.city}, ${room.country}`}
            </span>
          </div>
          {room.website ? (
            <Link
              href={room.website}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-1 text-sm font-semibold text-primary hover:underline"
            >
              Visit site
              <ExternalLink className="h-3.5 w-3.5" />
            </Link>
          ) : (
            <span className="text-xs text-muted-foreground">Website pending</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
