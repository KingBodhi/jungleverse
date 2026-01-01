"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { format } from "date-fns";
import type { RoomWithGames } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FavoriteButton } from "@/components/rooms/favorite-button";
import { ReviewForm } from "@/components/reviews/review-form";
import { ReviewList } from "@/components/reviews/review-list";
import { WaitTimeForm } from "@/components/wait-times/wait-time-form";
import { WaitTimeList } from "@/components/wait-times/wait-time-list";

interface Props {
  params: { id: string };
}

export default function RoomDetailPage({ params }: Props) {
  const [room, setRoom] = useState<RoomWithGames | null>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [initialIsFavorite, setInitialIsFavorite] = useState(false);
  const [reviewsRefreshKey, setReviewsRefreshKey] = useState(0);
  const [waitTimesRefreshKey, setWaitTimesRefreshKey] = useState(0);

  const handleReviewSubmit = useCallback(() => {
    setReviewsRefreshKey((prev) => prev + 1);
  }, []);

  const handleWaitTimeSubmit = useCallback(() => {
    setWaitTimesRefreshKey((prev) => prev + 1);
  }, []);

  useEffect(() => {
    async function fetchData() {
      try {
        const response = await fetch(`/api/rooms/${params.id}`);
        if (!response.ok) {
          if (response.status === 404) {
            notFound();
          }
          throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();

        setRoom(data.room);
        setCurrentUser(data.currentUser);
        setInitialIsFavorite(data.initialIsFavorite);
      } catch (error) {
        console.error("Failed to fetch room data:", error);
        // Optionally, show an error message to the user
      }
    }

    fetchData();
  }, [params.id]);

  if (!room) {
    return <div>Loading...</div>;
  }

  const cashGames = room.games.filter((game) => game.cashGame);
  const tournaments = room.games.filter((game) => game.tournament);

  return (
    <div className="container space-y-8 py-10">
      <div>
        <h1 className="text-4xl font-bold">{room.name}</h1>
        <p className="text-muted-foreground">
          {room.address ? `${room.address}, ` : ""}
          {room.city}, {room.state ? `${room.state}, ` : ""}
          {room.country}
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          {room.website && (
            <Badge asChild>
              <a href={room.website} target="_blank" rel="noreferrer">
                Website
              </a>
            </Badge>
          )}
          {room.phone && <Badge variant="secondary">{room.phone}</Badge>}
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Button asChild variant="ghost">
            <Link href="/rooms">Back to rooms</Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/dashboard">Get recommendations</Link>
          </Button>
          {currentUser ? (
            <FavoriteButton roomId={room.id} initialIsFavorite={initialIsFavorite} />
          ) : null}
        </div>
      </div>
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Cash games</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {cashGames.length === 0 && <p className="text-sm text-muted-foreground">No cash lineup published.</p>}
            {cashGames.map((game) => (
              <div key={game.id} className="rounded-lg border p-4 space-y-2">
                <div>
                  <p className="font-medium">
                    {game.cashGame?.smallBlind}/{game.cashGame?.bigBlind} blinds
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Buy-in {game.cashGame?.minBuyin}-{game.cashGame?.maxBuyin}
                  </p>
                  {game.cashGame?.notes && <p className="text-sm">{game.cashGame.notes}</p>}
                </div>
                <WaitTimeList gameId={game.id} refreshKey={waitTimesRefreshKey} />
                {currentUser && (
                  <WaitTimeForm gameId={game.id} onSubmitSuccess={handleWaitTimeSubmit} />
                )}
              </div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Tournaments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {tournaments.length === 0 && <p className="text-sm text-muted-foreground">No tournaments posted.</p>}
            {tournaments.map((game) => {
              const levelLabel =
                typeof game.tournament?.blindLevelMinutes === "number"
                  ? `${game.tournament.blindLevelMinutes}m`
                  : "Levels TBD";
              return (
                <div key={game.id} className="rounded-lg border p-4">
                  <p className="font-medium">
                    {"$"}
                    {game.tournament?.buyinAmount?.toLocaleString() ?? "?"} buy-in · {levelLabel}
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
      <Card>
        <CardHeader>
          <CardTitle>Reviews</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {currentUser && (
            <ReviewForm pokerRoomId={room.id} onSubmitSuccess={handleReviewSubmit} />
          )}
          <ReviewList pokerRoomId={room.id} refreshKey={reviewsRefreshKey} />
        </CardContent>
      </Card>
    </div>
  );
}
