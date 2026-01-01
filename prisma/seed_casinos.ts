import { PrismaClient } from '@prisma/client';

export async function seedCasinos(prisma: PrismaClient) {
  const bellagioPokerRoom = await prisma.pokerRoom.upsert({
    where: { name: 'Bellagio Poker Room' },
    update: {},
    create: {
      name: 'Bellagio Poker Room',
      brand: 'Bellagio',
      address: '3600 S Las Vegas Blvd',
      city: 'Las Vegas',
      state: 'Nevada',
      country: 'USA',
      latitude: 36.1126,
      longitude: -115.1767,
      timezone: 'America/Los_Angeles',
      website: 'https://bellagio.mgm.com/en/casino/poker-room.html',
      phone: '+1 888-987-6667',
      imageUrl: 'https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80',
      hasHotel: true,
      hasFood: true,
      hasParking: true,
      hoursJson: {
        monday: '24/7', tuesday: '24/7', wednesday: '24/7',
        thursday: '24/7', friday: '24/7', saturday: '24/7', sunday: '24/7'
      },
      currentPromo: 'High Hand Bonuses Daily',
      promoExpiresAt: new Date('2026-01-31T23:59:59Z'),
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
                notes: 'Popular 1/3 No-Limit Hold\'em',
                rakeCap: 5,
                rakePercentage: 0.10,
              },
            },
          },
          {
            gameType: 'CASH',
            variant: 'NLHE',
            cashGame: {
              create: {
                smallBlind: 2,
                bigBlind: 5,
                minBuyin: 200,
                maxBuyin: 800,
                notes: 'Popular 2/5 No-Limit Hold\'em',
                rakeCap: 5,
                rakePercentage: 0.10,
              },
            },
          },
          {
            gameType: 'TOURNAMENT',
            variant: 'NLHE',
            tournament: {
              create: {
                startTime: new Date('2025-12-17T14:00:00Z'),
                buyinAmount: 250,
                rakeAmount: 50,
                startingStack: 15000,
                blindLevelMinutes: 20,
                reentryPolicy: 'Unlimited Re-entries',
                estimatedPrizePool: 10000,
                recurringRule: 'Daily at 2 PM',
              },
            },
          },
        ],
      },
    },
  });

  const ariaPokerRoom = await prisma.pokerRoom.upsert({
    where: { name: 'Aria Poker Room' },
    update: {},
    create: {
      name: 'Aria Poker Room',
      brand: 'Aria Resort & Casino',
      address: '3730 S Las Vegas Blvd',
      city: 'Las Vegas',
      state: 'Nevada',
      country: 'USA',
      latitude: 36.1066,
      longitude: -115.1764,
      timezone: 'America/Los_Angeles',
      website: 'https://aria.mgm.com/en/casino/poker-room.html',
      phone: '+1 877-270-2742',
      imageUrl: 'https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80',
      hasHotel: true,
      hasFood: true,
      hasParking: true,
      hoursJson: {
        monday: '24/7', tuesday: '24/7', wednesday: '24/7',
        thursday: '24/7', friday: '24/7', saturday: '24/7', sunday: '24/7'
      },
      currentPromo: 'Daily Tournaments',
      promoExpiresAt: new Date('2026-02-28T23:59:59Z'),
      games: {
        create: [
          {
            gameType: 'CASH',
            variant: 'PLO',
            cashGame: {
              create: {
                smallBlind: 1,
                bigBlind: 2,
                minBuyin: 100,
                maxBuyin: 300,
                notes: 'Popular 1/2 Pot-Limit Omaha',
                rakeCap: 5,
                rakePercentage: 0.10,
              },
            },
          },
          {
            gameType: 'TOURNAMENT',
            variant: 'NLHE',
            tournament: {
              create: {
                startTime: new Date('2025-12-18T19:00:00Z'),
                buyinAmount: 150,
                rakeAmount: 30,
                startingStack: 10000,
                blindLevelMinutes: 15,
                reentryPolicy: 'Single Re-entry',
                estimatedPrizePool: 5000,
                recurringRule: 'Daily at 7 PM',
              },
            },
          },
        ],
      },
    },
  });

  const kingsResortPokerRoom = await prisma.pokerRoom.upsert({
    where: { name: "King's Resort Poker Room" },
    update: {},
    create: {
      name: "King's Resort Poker Room",
      brand: 'King\'s Resort',
      address: 'Rozvadov 7, 345 04 Rozvadov',
      city: 'Rozvadov',
      state: null,
      country: 'Czech Republic',
      latitude: 49.6781,
      longitude: 12.5029,
      timezone: 'Europe/Prague',
      website: 'https://kings-resort.com/poker',
      phone: '+420 374 616 050',
      imageUrl: 'https://images.unsplash.com/photo-1521791136064-7986c2920216?auto=format&fit=crop&w=1200&q=80',
      hasHotel: true,
      hasFood: true,
      hasParking: true,
      hoursJson: {
        monday: '24/7', tuesday: '24/7', wednesday: '24/7',
        thursday: '24/7', friday: '24/7', saturday: '24/7', sunday: '24/7'
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
                notes: 'Standard 1/3 No-Limit Hold\'em Euro',
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

  console.log({ bellagioPokerRoom, ariaPokerRoom, kingsResortPokerRoom });
}
