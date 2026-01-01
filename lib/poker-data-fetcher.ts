// lib/poker-data-fetcher.ts

import { PrismaClient, GameVariant } from "@prisma/client";
import { createTournament } from "./services/tournaments";
import { getUpcomingTournaments as getClubGGTournaments } from "./scrapers/clubgg";

const prisma = new PrismaClient();

type ConnectorTournament = {
  variant: GameVariant;
  startTime: Date;
  buyinAmount: number;
  startingStack: number;
  blindLevelMinutes: number;
  estimatedPrizePool?: number;
};

type SiteConnector = () => Promise<ConnectorTournament[]>;

// A map of poker site names to their "connector" functions
const siteConnectors: Record<string, SiteConnector> = {
  // Example for GGpoker
  GGpoker: async () => {
    // In a real implementation, this would fetch data from the GGpoker API or website
    console.log("Fetching data for GGpoker...");
    // For now, we'll just return some dummy data
    return [
      {
        variant: GameVariant.NLHE,
        startTime: new Date(),
        buyinAmount: 150,
        startingStack: 10000,
        blindLevelMinutes: 15,
      },
    ];
  },
  // Example for Pokerstars
  Pokerstars: async () => {
    // In a real implementation, this would fetch data from the Pokerstars API or website
    console.log("Fetching data for Pokerstars...");
    // For now, we'll just return some dummy data
    return [
      {
        variant: GameVariant.NLHE,
        startTime: new Date(),
        buyinAmount: 109,
        startingStack: 10000,
        blindLevelMinutes: 12,
      },
    ];
  },
  // ClubGG connector
  ClubGG: async () => {
    console.log("Fetching data for ClubGG...");
    const tournaments = await getClubGGTournaments();
    return tournaments
      .filter((t) => t.tournament)
      .map((t) => ({
        variant: t.variant,
        startTime: t.tournament!.startTime,
        buyinAmount: t.tournament!.buyIn * 100, // Convert to cents
        startingStack: 10000, // Default starting stack
        blindLevelMinutes: 10, // Default blind level
        estimatedPrizePool: t.tournament!.guaranteedPrize ? t.tournament!.guaranteedPrize * 100 : undefined,
      }));
  },
};

export async function fetchAndStorePokerData(siteName: string) {
  const connector = siteConnectors[siteName];
  if (!connector) {
    throw new Error(`No connector found for site: ${siteName}`);
  }

  const games = await connector();

  for (const game of games) {
    const room = await prisma.pokerRoom.findFirst({
      where: { name: siteName },
    });

    if (!room) {
      console.error(`Poker room not found: ${siteName}`);
      continue;
    }

    await createTournament({
      pokerRoomId: room.id,
      ...game,
    });
  }
}

export async function fetchAllPokerData(provider?: string) {
  if (provider) {
    // Fetch for specific provider
    if (!siteConnectors[provider]) {
      throw new Error(`Unknown provider: ${provider}`);
    }
    await fetchAndStorePokerData(provider);
  } else {
    // Fetch for all providers
    for (const siteName of Object.keys(siteConnectors)) {
      await fetchAndStorePokerData(siteName);
    }
  }
}
