import { PrismaClient, GameType } from "@prisma/client";
import bcrypt from "bcryptjs";
import { addDays, addHours } from "date-fns";
import fs from "fs/promises";
import path from "path";
import { parse } from "csv-parse/sync";
import { seedCasinos } from "./seed_casinos";

const prisma = new PrismaClient();
const SALT_ROUNDS = 10;

type RoomSeed = {
  name: string;
  brand: string;
  address: string;
  city: string;
  state: string;
  country: string;
  latitude: number;
  longitude: number;
  timezone: string;
  website: string;
  phone: string;
  imageUrl?: string | null;
};

const ROOM_IMAGE_POOL = [
  "https://images.unsplash.com/photo-1469474968028-56623f02e42e?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1500534314209-a25ddb2bd429?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1477959858617-67f85cf4f1df?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1529688530647-93a1222214e1?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1200&q=80",
  "https://images.unsplash.com/photo-1549921296-3b4a4f3b66fc?auto=format&fit=crop&w=1200&q=80",
];

const roomsSeed: RoomSeed[] = [
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

type ProviderCsvRow = {
  official_name: string;
  brand_name: string;
  hq_address: string;
  municipality: string;
  state_or_region: string;
  country: string;
  latitude: string;
  longitude: string;
  timezone: string;
  website_url: string;
  contact_phone: string;
  logo_url: string;
};

const PROVIDERS_CSV_PATH = path.resolve(__dirname, "..", "data", "providers_physical.csv");

async function loadCsvRooms(): Promise<RoomSeed[]> {
  try {
    const csvRaw = await fs.readFile(PROVIDERS_CSV_PATH, "utf-8");
    const records = parse(csvRaw, {
      columns: true,
      skip_empty_lines: true,
      trim: true,
    }) as ProviderCsvRow[];

    return records.map((row) => ({
      name: row.official_name?.trim() ?? "",
      brand: row.brand_name?.trim() || row.official_name?.trim() || "",
      address: row.hq_address?.trim() ?? "",
      city: row.municipality?.trim() ?? "",
      state: row.state_or_region?.trim() ?? "",
      country: row.country?.trim() ?? "",
      latitude: Number(row.latitude),
      longitude: Number(row.longitude),
      timezone: row.timezone?.trim() ?? "",
      website: row.website_url?.trim() ?? "",
      phone: row.contact_phone?.trim() ?? "",
      imageUrl: row.logo_url && row.logo_url !== "N/A" ? row.logo_url.trim() : null,
    }));
  } catch (error) {
    const err = error as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      console.warn("providers_physical.csv not found; skipping CSV load");
    } else {
      console.warn("Failed to parse providers_physical.csv", error);
    }
    return [];
  }
}

function mergeRoomSeeds(base: RoomSeed[], csvRooms: RoomSeed[]): RoomSeed[] {
  const map = new Map<string, RoomSeed>();
  for (const room of base) {
    map.set(room.name, room);
  }
  for (const room of csvRooms) {
    if (!room.name) continue;
    map.set(room.name, room);
  }
  return Array.from(map.values());
}

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
  const csvRooms = await loadCsvRooms();
  const roomsToSeed = mergeRoomSeeds(roomsSeed, csvRooms);
  const created: Record<string, string> = {};
  for (const [index, room] of roomsToSeed.entries()) {
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
    const payload = {
      ...room,
      imageUrl: room.imageUrl ?? ROOM_IMAGE_POOL[index % ROOM_IMAGE_POOL.length],
      ...amenityDefaults,
    };
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
      rooms: ["ARIA Poker Room", "Bellagio Poker Room", "Wynn Las Vegas Poker Room"],
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
