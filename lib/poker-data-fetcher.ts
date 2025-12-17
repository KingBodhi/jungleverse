// lib/poker-data-fetcher.ts

import { PrismaClient } from '@prisma/client';
import { createTournament } from './services/tournaments';
import { GameVariant } from '@prisma/client';

const prisma = new PrismaClient();

// A map of poker site names to their "connector" functions
const siteConnectors: { [key: string]: () => Promise<any[]> } = {
  // Example for GGpoker
  GGpoker: async () => {
    // In a real implementation, this would fetch data from the GGpoker API or website
    console.log('Fetching data for GGpoker...');
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
    console.log('Fetching data for Pokerstars...');
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

export async function fetchAllPokerData() {
  for (const siteName in siteConnectors) {
    await fetchAndStorePokerData(siteName);
  }
}
