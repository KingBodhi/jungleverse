"use client";

import { useState, useCallback, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { format } from "date-fns";
import { MapPin, Phone, Globe, Clock, ExternalLink, Navigation, Building2, Utensils, Car } from "lucide-react";
import type { RoomWithGames } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/rooms/favorite-button";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewList } from "@/components/reviews/review-list";
import { WaitTimeForm } from "@/components/wait-times/wait-time-form";
import { WaitTimeList } from "@/components/wait-times/wait-time-list";
import { getRoomImage } from "@/lib/room-images";

interface RoomDetailClientProps {
  room: RoomWithGames;
  isAuthenticated: boolean;
  initialIsFavorite: boolean;
}

type HoursRecord = Record<string, string>;

function normalizePhone(phone?: string | null) {
  if (!phone) return null;
  return phone.replace(/[^\d+]/g, "");
}

function getHostname(url?: string | null) {
  if (!url) return null;
  try {
    const { hostname } = new URL(url.startsWith("http") ? url : `https://${url}`);
    return hostname.replace(/^www\./, "");
  } catch (error) {
    return url;
  }
}

function formatCurrency(value?: number | null) {
  if (typeof value !== "number") return null;
  return `$${value.toLocaleString()}`;
}

function formatStakes(small?: number | null, big?: number | null) {
  if (typeof small !== "number" || typeof big !== "number") return null;
  return `$${small.toLocaleString()}/$${big.toLocaleString()}`;
}

export function RoomDetailClient({
  room,
  isAuthenticated,
  initialIsFavorite,
}: RoomDetailClientProps) {
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);
  const [waitTimesRefreshKey, setWaitTimesRefreshKey] = useState(0);

  const handleReviewSubmit = useCallback(() => {
    setReviewsRefreshKey((prev) => prev + 1);
  }, []);

  const handleWaitTimeSubmit = useCallback(() => {
    setWaitTimesRefreshKey((prev) => prev + 1);
  }, []);

  const cashGames = room.games.filter((game) => game.cashGame);
  const tournaments = room.games.filter((game) => game.tournament);
  const variantLabels = useMemo(
    () => Array.from(new Set(room.games.map((game) => game.variant))).filter(Boolean),
    [room.games]
  );

  const locationParts = [room.city, room.state, room.country].filter(Boolean);
  const locationString = locationParts.join(", ");
  const fullAddress = room.address ? `${room.address}, ${locationString}` : locationString;
  const mapsHref = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`;

  const hostname = getHostname(room.website);
  const normalizedPhone = normalizePhone(room.phone);
  const heroImage = getRoomImage(room);
  const hours =
    room.hoursJson && typeof room.hoursJson === "object"
      ? (room.hoursJson as HoursRecord)
      : null;

  const statBlocks = [
    { label: "Cash games", value: cashGames.length ? cashGames.length.toString() : "—" },
    { label: "Tournaments", value: tournaments.length ? tournaments.length.toString() : "—" },
    { label: "Variants", value: variantLabels.length ? variantLabels.join(" • ") : "Syncing" },
  ];

  const metaItems = [
    {
      label: "Timezone",
      value: room.timezone ?? "Syncing",
      icon: Clock,
    },
    {
      label: "Phone",
      value: room.phone ?? "Not published",
      icon: Phone,
      href: normalizedPhone ? `tel:${normalizedPhone}` : undefined,
    },
    {
      label: "Website",
      value: hostname ?? "Pending",
      icon: Globe,
      href: room.website ?? undefined,
      external: Boolean(room.website),
    },
  ];

  const amenityFlags = [
    {
      icon: Building2,
      label: "On-site hotel",
      value: room.hasHotel,
    },
    {
      icon: Utensils,
      label: "Dining",
      value: room.hasFood,
    },
    {
      icon: Car,
      label: "Parking",
      value: room.hasParking,
    },
  ];

  const offerings = [
    cashGames.length ? "Cash Games" : null,
    tournaments.length ? "Tournaments" : null,
    variantLabels.length
      ? `${variantLabels.length} Game Variant${variantLabels.length > 1 ? "s" : ""}`
      : null,
  ].filter(Boolean) as string[];

  return (
    <div className="space-y-10">
      <section className="overflow-hidden rounded-3xl border bg-background shadow">
        <div className="relative h-[360px] w-full">
          <Image
            src={heroImage}
            alt={`${room.name} poker room hero`}
            fill
            sizes="(min-width: 1024px) 960px, 100vw"
            className="object-cover"
            priority
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20" />
          <div className="absolute inset-x-6 bottom-6 flex flex-col gap-4 text-white">
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="secondary" className="rounded-full bg-white/90 text-primary">
                {room.brand ?? "Independent"}
              </Badge>
              <span className="text-sm text-white/80">{room.timezone ?? "Timezone syncing"}</span>
            </div>
            <div className="flex flex-wrap items-end gap-4">
              <div>
                <p className="text-sm uppercase tracking-wide text-white/80">Poker room</p>
                <h1 className="text-4xl font-bold leading-tight">{room.name}</h1>
              </div>
              {isAuthenticated ? (
                <div className="ml-auto">
                  <FavoriteButton roomId={room.id} initialIsFavorite={initialIsFavorite} />
                </div>
              ) : null}
            </div>
            <p className="flex items-center gap-2 text-sm text-white/90">
              <MapPin className="h-4 w-4" />
              {fullAddress}
            </p>
            <div className="flex flex-wrap gap-6 text-sm">
              {statBlocks.map((stat) => (
                <div key={stat.label} className="space-y-1">
                  <p className="text-xs uppercase tracking-wide text-white/70">{stat.label}</p>
                  <p className="text-lg font-semibold">{stat.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-6 border-t bg-white/90 p-6 md:grid-cols-3">
          {metaItems.map((item) => (
            <div key={item.label} className="flex items-center gap-3">
              <item.icon className="h-5 w-5 text-muted-foreground" />
              {item.href ? (
                <a
                  href={item.href}
                  target={item.external ? "_blank" : undefined}
                  rel={item.external ? "noreferrer" : undefined}
                  className="text-sm font-semibold text-primary hover:underline"
                >
                  {item.value}
                </a>
              ) : (
                <p className="text-sm font-semibold">{item.value}</p>
              )}
            </div>
          ))}
        </div>
      </section>

      <div className="flex flex-wrap gap-3">
        <Button asChild variant="outline">
          <Link href="/rooms">Back to rooms</Link>
        </Button>
        <Button asChild>
          <Link href="/dashboard">Get recommendations</Link>
        </Button>
        {room.website ? (
          <Button asChild variant="secondary" className="gap-1">
            <a href={room.website} target="_blank" rel="noreferrer">
              Visit website
              <ExternalLink className="h-4 w-4" />
            </a>
          </Button>
        ) : null}
        <Button asChild variant="ghost" className="gap-1">
          <a href={mapsHref} target="_blank" rel="noreferrer">
            View on Maps
            <Navigation className="h-4 w-4" />
          </a>
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[2fr,1fr]">
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Cash games</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {cashGames.length === 0 && (
                <p className="text-sm text-muted-foreground">No cash lineup published.</p>
              )}
              {cashGames.map((game) => {
                const stakesLabel = formatStakes(game.cashGame?.smallBlind, game.cashGame?.bigBlind);
                const minBuyin = formatCurrency(game.cashGame?.minBuyin);
                const maxBuyin = formatCurrency(game.cashGame?.maxBuyin);
                return (
                  <div key={game.id} className="space-y-3 rounded-2xl border bg-muted/30 p-4">
                    <div className="flex flex-wrap items-baseline justify-between gap-2">
                      <div>
                        <p className="text-base font-semibold">
                          {stakesLabel ?? "Stakes TBA"}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Buy-in {minBuyin ?? "TBD"}
                          {maxBuyin ? ` – ${maxBuyin}` : ""}
                        </p>
                      </div>
                    </div>
                    {game.cashGame?.notes ? (
                      <p className="text-sm text-muted-foreground">{game.cashGame.notes}</p>
                    ) : null}
                    <WaitTimeList gameId={game.id} refreshKey={waitTimesRefreshKey} />
                    {isAuthenticated && (
                      <WaitTimeForm gameId={game.id} onSubmitSuccess={handleWaitTimeSubmit} />
                    )}
                  </div>
                );
              })}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>Tournaments</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tournaments.length === 0 && (
                <p className="text-sm text-muted-foreground">No tournaments posted.</p>
              )}
              {tournaments.map((game) => {
                const levelLabel =
                  typeof game.tournament?.blindLevelMinutes === "number"
                    ? `${game.tournament.blindLevelMinutes}m`
                    : "Levels TBD";
                const buyIn = formatCurrency(game.tournament?.buyinAmount);
                return (
                  <div key={game.id} className="space-y-2 rounded-2xl border bg-muted/20 p-4">
                    <p className="text-base font-semibold">
                      {buyIn ?? "Buy-in TBD"} · {levelLabel}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Starts {game.tournament?.startTime ? format(new Date(game.tournament.startTime), "MMM d, p") : "TBA"}
                    </p>
                  </div>
                );
              })}
            </CardContent>
          </Card>
        </div>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Room snapshot</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4 text-sm">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Address</p>
                <p className="font-medium">{fullAddress}</p>
                <a href={mapsHref} target="_blank" rel="noreferrer" className="text-xs font-semibold text-primary hover:underline">
                  Open in Maps
                </a>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Offerings</p>
                <div className="mt-1 flex flex-wrap gap-2">
                  {offerings.length
                    ? offerings.map((label) => (
                        <Badge key={label} variant="outline" className="rounded-full">
                          {label}
                        </Badge>
                      ))
                    : (
                      <p className="text-muted-foreground">Syncing schedule</p>
                      )}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Amenities</p>
                <div className="mt-2 space-y-2">
                  {amenityFlags.map((item) => (
                    <div key={item.label} className="flex items-center gap-2 text-sm">
                      <item.icon className="h-4 w-4 text-muted-foreground" />
                      <span>{item.label}</span>
                      <span className={`ml-auto text-xs font-semibold ${item.value ? "text-emerald-600" : "text-muted-foreground"}`}>
                        {item.value ? "Available" : "TBD"}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Hours</p>
                {hours ? (
                  <div className="mt-2 space-y-1 text-xs">
                    {Object.entries(hours).map(([day, value]) => (
                      <div key={day} className="flex justify-between font-medium">
                        <span className="capitalize text-muted-foreground">{day}</span>
                        <span>{value}</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">Hours syncing.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {isAuthenticated && (
            <ReviewForm pokerRoomId={room.id} onSubmitSuccess={handleReviewSubmit} />
          )}
          <ReviewList pokerRoomId={room.id} refreshKey={reviewsRefreshKey} />
        </CardContent>
      </Card>
    </div>
  );
}
