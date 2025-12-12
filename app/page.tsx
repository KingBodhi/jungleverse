import { Hero } from "@/components/home/hero";
import { FeaturedRegions } from "@/components/home/featured-regions";
import { Section } from "@/components/layout/section";
import { RoomCard } from "@/components/rooms/room-card";
import { TournamentCard } from "@/components/tournaments/tournament-card";
import { CashGameCard } from "@/components/cash-games/cash-game-card";
import { listRooms } from "@/lib/services/rooms";
import { listTournaments } from "@/lib/services/tournaments";
import { listCashGames } from "@/lib/services/cash-games";
import type { RoomWithGames, TournamentWithRoom, CashGameWithRoom } from "@/types";

export default async function HomePage() {
  const [rooms, tournaments, cashGames] = await Promise.all([
    listRooms({ limit: 4, page: 1 }),
    listTournaments({ limit: 4, page: 1, startDate: new Date().toISOString() }),
    listCashGames({ limit: 4, page: 1 }),
  ]);

  return (
    <div className="space-y-16">
      <Hero />
      <Section title="Featured regions" description="Pulse-checked metros updated daily.">
        <FeaturedRegions />
      </Section>
      <Section title="Trending rooms" description="Recently active rooms with reliable schedules.">
        <div className="grid gap-6 md:grid-cols-2">
          {(rooms.items as RoomWithGames[]).map((room) => (
            <RoomCard key={room.id} room={room} />
          ))}
        </div>
      </Section>
      <Section title="Upcoming tournaments" description="Time-based list of scheduled majors and dailies.">
        <div className="grid gap-6 md:grid-cols-2">
          {(tournaments.items as TournamentWithRoom[]).map((event) => (
            <TournamentCard key={event.id} tournament={event} />
          ))}
        </div>
      </Section>
      <Section title="Cash games live now" description="Stakes filtered to your region preferences.">
        <div className="grid gap-6 md:grid-cols-2">
          {(cashGames.items as CashGameWithRoom[]).map((game) => (
            <CashGameCard key={game.id} game={game} />
          ))}
        </div>
      </Section>
    </div>
  );
}
