import { PrismaClient } from '@prisma/client';

export async function seedCasinos(prisma: PrismaClient) {
  const kingsResortPokerRoom = await prisma.pokerRoom.upsert({
    where: { name: "King's Resort Poker Room" },
    update: {
      imageUrl: 'https://admin.kings-resort.com/wp-content/uploads/2024/09/kingsbet-banner.jpg',
      heroImageUrl: 'https://admin.kings-resort.com/wp-content/uploads/2024/09/kingsbet-banner.jpg',
      logoUrl: 'https://kings-resort.com/icons/logos/default.png',
    },
    create: {
      name: "King's Resort Poker Room",
      brand: "King's Resort",
      address: 'Rozvadov 7, 345 04 Rozvadov',
      city: 'Rozvadov',
      state: null,
      country: 'Czech Republic',
      latitude: 49.6781,
      longitude: 12.5029,
      timezone: 'Europe/Prague',
      website: 'https://kings-resort.com/poker',
      phone: '+420 374 616 050',
      imageUrl: 'https://admin.kings-resort.com/wp-content/uploads/2024/09/kingsbet-banner.jpg',
      heroImageUrl: 'https://admin.kings-resort.com/wp-content/uploads/2024/09/kingsbet-banner.jpg',
      logoUrl: 'https://kings-resort.com/icons/logos/default.png',
      hasHotel: true,
      hasFood: true,
      hasParking: true,
      hoursJson: {
        monday: '24/7',
        tuesday: '24/7',
        wednesday: '24/7',
        thursday: '24/7',
        friday: '24/7',
        saturday: '24/7',
        sunday: '24/7',
      },
      currentPromo: 'WSOPE Satellites',
      promoExpiresAt: new Date('2026-01-15T23:59:59Z'),
      games: {
        create: [
          {
            gameType: 'CASH',
            variant: 'NLHE',
            cashGame: {
              create: {
                smallBlind: 1,
                bigBlind: 3,
                minBuyin: 100,
                maxBuyin: 300,
                notes: "Standard 1/3 No-Limit Hold'em Euro",
                rakeCap: 5,
                rakePercentage: 0.05,
              },
            },
          },
          {
            gameType: 'TOURNAMENT',
            variant: 'NLHE',
            tournament: {
              create: {
                startTime: new Date('2025-12-19T16:00:00Z'),
                buyinAmount: 100,
                rakeAmount: 20,
                startingStack: 10000,
                blindLevelMinutes: 15,
                reentryPolicy: 'Unlimited Re-entries',
                estimatedPrizePool: 3000,
                recurringRule: 'Daily at 4 PM',
              },
            },
          },
        ],
      },
    },
  });

  console.log({ kingsResortPokerRoom });
}
