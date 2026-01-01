import { PrismaClient, GameType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addHours } from "date-fns";
import { seedCasinos } from './seed_casinos';

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

const roomsSeed = [
  {
    name: "Commerce Casino",
    brand: "Commerce",
    address: "6131 Telegraph Rd",
    city: "Los Angeles",
    state: "CA",
    country: "USA",
    latitude: 34.0087,
    longitude: -118.1487,
    timezone: "America/Los_Angeles",
    website: "https://www.commercecasino.com",
    phone: "(323) 721-2100",
  },
  {
    name: "Wynn Poker Room",
    brand: "Wynn Resorts",
    address: "3131 S Las Vegas Blvd",
    city: "Las Vegas",
    state: "NV",
    country: "USA",
    latitude: 36.1263,
    longitude: -115.1668,
    timezone: "America/Los_Angeles",
    website: "https://www.wynnlasvegas.com",
    phone: "(702) 770-7000",
  },
  {
    name: "Texas Card House Austin",
    brand: "Texas Card House",
    address: "13376 N US 183 Hwy",
    city: "Austin",
    state: "TX",
    country: "USA",
    latitude: 30.4353,
    longitude: -97.7737,
    timezone: "America/Chicago",
    website: "https://texascardhouse.com",
    phone: "(512) 428-6393",
  },
  {
    name: "Shuffle 214",
    brand: "Shuffle",
    address: "910 W Parker Rd",
    city: "Dallas",
    state: "TX",
    country: "USA",
    latitude: 33.0341,
    longitude: -96.7339,
    timezone: "America/Chicago",
    website: "https://shuffle214.com",
    phone: "(469) 609-3065",
  },
  {
    name: "Hard Rock Hollywood",
    brand: "Seminole",
    address: "1 Seminole Way",
    city: "Hollywood",
    state: "FL",
    country: "USA",
    latitude: 26.0512,
    longitude: -80.2110,
    timezone: "America/New_York",
    website: "https://www.seminolehardrockhollywood.com",
    phone: "(866) 502-7529",
  },
  {
    name: "Hippodrome Casino",
    brand: "Hippodrome",
    address: "Leicester Square",
    city: "London",
    state: "",
    country: "United Kingdom",
    latitude: 51.5116,
    longitude: -0.1300,
    timezone: "Europe/London",
    website: "https://www.hippodromecasino.com",
    phone: "+44 20 7769 8888",
  },
  {
    name: "Okada Manila Poker",
    brand: "Okada",
    address: "New Seaside Dr",
    city: "Manila",
    state: "",
    country: "Philippines",
    latitude: 14.5157,
    longitude: 120.9842,
    timezone: "Asia/Manila",
    website: "https://www.okadamanila.com",
    phone: "+63 2 8888 0777",
  },
  {
    name: "bestbet Jacksonville",
    brand: "bestbet",
    address: "201 Monument Road",
    city: "Jacksonville",
    state: "FL",
    country: "USA",
    latitude: 30.324838,
    longitude: -81.546813,
    timezone: "America/New_York",
    website: "https://bestbetjax.com/bestbet-jacksonville",
    phone: "(904) 646-0001",
  },
  {
    name: "bestbet Orange Park",
    brand: "bestbet",
    address: "455 Park Avenue",
    city: "Orange Park",
    state: "FL",
    country: "USA",
    latitude: 30.184187,
    longitude: -81.700155,
    timezone: "America/New_York",
    website: "https://bestbetjax.com/bestbet-orange-park",
    phone: "(904) 646-0001",
  },
  {
    name: "bestbet St. Augustine",
    brand: "bestbet",
    address: "800 Marketplace Drive",
    city: "St. Augustine",
    state: "FL",
    country: "USA",
    latitude: 29.834025,
    longitude: -81.382636,
    timezone: "America/New_York",
    website: "https://bestbetjax.com/bestbet-st-augustine",
    phone: "(904) 646-0001",
  },
  {
    name: "MGM National Harbor Poker Room",
    brand: "MGM Resorts",
    address: "101 MGM National Avenue",
    city: "Oxon Hill",
    state: "MD",
    country: "USA",
    latitude: 38.78595,
    longitude: -77.015505,
    timezone: "America/New_York",
    website: "https://mgmnationalharbor.mgmresorts.com/en/casino/poker-room.html",
    phone: "(844) 346-4664",
  },
  {
    name: "Resorts World Las Vegas Poker Room",
    brand: "Resorts World",
    address: "3000 S Las Vegas Blvd",
    city: "Las Vegas",
    state: "NV",
    country: "USA",
    latitude: 36.133961,
    longitude: -115.163792,
    timezone: "America/Los_Angeles",
    website: "https://www.rwlasvegas.com/casino/poker-room/",
    phone: "(702) 676-7000",
  },
  {
    name: "Live! Casino Philadelphia Poker Room",
    brand: "Live! Casino & Hotel",
    address: "900 Packer Avenue",
    city: "Philadelphia",
    state: "PA",
    country: "USA",
    latitude: 39.910317,
    longitude: -75.164415,
    timezone: "America/New_York",
    website: "https://philadelphia.livecasinohotel.com/casino/poker-room",
    phone: "(267) 682-9700",
  },
  {
    name: "Playground Poker Club",
    brand: "Playground",
    address: "1500 QC-138",
    city: "Kahnawake",
    state: "QC",
    country: "Canada",
    latitude: 45.376763,
    longitude: -73.706322,
    timezone: "America/Toronto",
    website: "https://www.playground.ca/",
    phone: "+1 450-635-7653",
  },
  {
    name: "Banco Casino Bratislava",
    brand: "Banco Casino",
    address: "Hodzovo Namestie 2",
    city: "Bratislava",
    state: "",
    country: "Slovakia",
    latitude: 48.147422,
    longitude: 17.10865,
    timezone: "Europe/Bratislava",
    website: "https://www.bancocasino.sk/",
    phone: "+421 915 510 510",
  },
];

const usersSeed = [
  {
    email: "vegasgrinder@example.com",
    username: "vegasgrinder",
    password: "PlayHard123!",
    homeLat: 36.1699,
    homeLng: -115.1398,
    bankrollProfile: "BALANCED",
    riskTolerance: "MEDIUM",
    preferredStakesMin: 2,
    preferredStakesMax: 5,
    maxTravelDistance: 600,
    preferredStartTimes: [10, 18],
  },
  {
    email: "eurotourist@example.com",
    username: "eurotourist",
    password: "EuroTour456!",
    homeLat: 48.8566,
    homeLng: 2.3522,
    bankrollProfile: "TOURNAMENT_ONLY",
    riskTolerance: "LOW",
    preferredStakesMin: 200,
    preferredStakesMax: 2000,
    maxTravelDistance: 1500,
    preferredStartTimes: [12, 16],
  },
  {
    email: "texascrusher@example.com",
    username: "texascrusher",
    password: "Texas789!",
    homeLat: 30.2672,
    homeLng: -97.7431,
    bankrollProfile: "CASH_ONLY",
    riskTolerance: "HIGH",
    preferredStakesMin: 5,
    preferredStakesMax: 25,
    maxTravelDistance: 400,
    preferredStartTimes: [20],
  },
];

async function seedRooms() {
  const created: Record<string, string> = {};
  for (const room of roomsSeed) {
    const existing = await prisma.pokerRoom.findFirst({
      where: { name: room.name },
    });
    const amenityDefaults = {
      hoursJson: { weekdays: "10a-4a", weekend: "24 hours" },
      hasFood: true,
      hasHotel: Boolean(room.brand?.toLowerCase().includes("resort")),
      hasParking: true,
      currentPromo: `${room.city} high-hand jackpot ${new Date().getFullYear()}`,
      promoExpiresAt: addDays(new Date(), 21 + Math.floor(Math.random() * 14)),
    };
    const payload = { ...room, ...amenityDefaults };
    const result = existing
      ? await prisma.pokerRoom.update({
          where: { id: existing.id },
          data: payload,
        })
      : await prisma.pokerRoom.create({
          data: payload,
        });
    created[room.name] = result.id;
  }
  return created;
}

async function seedUsers() {
  const created: Record<string, string> = {};
  for (const user of usersSeed) {
    const hashedPassword = await bcrypt.hash(user.password, SALT_ROUNDS);
    const record = await prisma.user.upsert({
      where: { email: user.email },
      update: {
        username: user.username,
        hashedPassword,
        homeLat: user.homeLat,
        homeLng: user.homeLng,
        bankrollProfile: user.bankrollProfile,
        riskTolerance: user.riskTolerance,
        preferredStakesMin: user.preferredStakesMin,
        preferredStakesMax: user.preferredStakesMax,
        maxTravelDistance: user.maxTravelDistance,
        preferredStartTimes: user.preferredStartTimes,
      },
      create: {
        email: user.email,
        username: user.username,
        hashedPassword,
        homeLat: user.homeLat,
        homeLng: user.homeLng,
        bankrollProfile: user.bankrollProfile,
        riskTolerance: user.riskTolerance,
        preferredStakesMin: user.preferredStakesMin,
        preferredStakesMax: user.preferredStakesMax,
        maxTravelDistance: user.maxTravelDistance,
        preferredStartTimes: user.preferredStartTimes,
      },
      select: { id: true },
    });
    created[user.email] = record.id;
  }
  return created;
}

async function seedGames(roomMap: Record<string, string>) {
  const now = new Date();
  const roomEntries = Object.entries(roomMap);
  let tournamentCount = 0;
  let cashCount = 0;

  for (const [index, [, roomId]] of roomEntries.entries()) {
    const baseStart = addDays(now, index);

    for (let i = 0; i < 2; i++) {
      const game = await prisma.game.create({
        data: {
          pokerRoomId: roomId,
          gameType: GameType.TOURNAMENT,
        },
      });
      await prisma.tournament.create({
        data: {
          gameId: game.id,
          startTime: addHours(baseStart, i * 6),
          buyinAmount: 300 + index * 50 + i * 100,
          rakeAmount: 30,
          startingStack: 30000,
          blindLevelMinutes: 30,
          reentryPolicy: i % 2 === 0 ? "Unlimited re-entry" : "One re-entry",
          bountyAmount: i === 1 ? 100 : null,
          recurringRule: i === 0 ? "Daily" : "Weekly",
          estimatedPrizePool: 20000 + index * 1000,
          typicalFieldSize: 120 + index * 10,
        },
      });
      tournamentCount++;
    }

    for (let i = 0; i < 2; i++) {
      const game = await prisma.game.create({
        data: {
          pokerRoomId: roomId,
          gameType: GameType.CASH,
        },
      });
      await prisma.cashGame.create({
        data: {
          gameId: game.id,
          smallBlind: 1 + i * 5 + index,
          bigBlind: 2 + i * 10 + index,
          minBuyin: 100 + index * 25,
          maxBuyin: 500 + index * 50,
          usualDaysOfWeek: ["Mon", "Wed", "Fri"],
          usualHours: { start: "12:00", end: "04:00" },
          notes: "Reliable lineup",
          rakeCap: 5 + i,
          rakePercentage: 5.0,
          rakeDescription: "5% up to $5",
        },
      });
      cashCount++;
    }
  }

  console.log(`Seeded ${tournamentCount} tournaments and ${cashCount} cash games`);
}

async function seedFavorites(roomMap: Record<string, string>, userMap: Record<string, string>) {
  const favoritesPlan = [
    {
      email: "vegasgrinder@example.com",
      rooms: ["Aria Poker Room", "Bellagio", "Wynn Poker Room"],
    },
    {
      email: "texascrusher@example.com",
      rooms: ["Texas Card House Austin", "Shuffle 214"],
    },
  ];

  for (const plan of favoritesPlan) {
    const userId = userMap[plan.email];
    if (!userId) continue;
    for (const roomName of plan.rooms) {
      const pokerRoomId = roomMap[roomName];
      if (!pokerRoomId) continue;
      await prisma.favoriteRoom.upsert({
        where: { userId_pokerRoomId: { userId, pokerRoomId } },
        update: {},
        create: { userId, pokerRoomId },
      });
    }
  }
}

async function main() {
  const rooms = await seedRooms();
  await seedCasinos(prisma);
  const users = await seedUsers();
  await seedGames(rooms);
  await seedFavorites(rooms, users);
  console.log("Seed complete");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
