import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const ONLINE_POKER_SITES = [
  { name: "Pokerstars", brand: "Flutter Entertainment" },
  { name: "888Poker", brand: "888 Holdings" },
  { name: "PartyPoker", brand: "Entain" },
  { name: "WPT Global", brand: "WPT Global" },
  { name: "WSOP", brand: "Caesars Entertainment" },
  { name: "GGpoker", brand: "GG International" },
  { name: "Unibet", brand: "Kindred Group" },
  { name: "iPoker Network", brand: "iPoker" },
  { name: "ACR (Americas Cardroom)", brand: "Winning Poker Network" },
  { name: "BetOnline", brand: "BetOnline" },
  { name: "CoinPoker", brand: "CoinPoker" },
  { name: "Phenom Poker", brand: "Phenom" },
  { name: "WeplayPoker", brand: "Weplay" },
  { name: "AApoker", brand: "AA Poker" },
  { name: "Virtue Poker", brand: "Virtue Poker" },
  { name: "Betfair", brand: "Flutter Entertainment" },
  { name: "SWC (SwC Poker)", brand: "SealsWithClubs" },
  { name: "VbetPoker", brand: "Vbet" },
  { name: "Shenpoker", brand: "Shen Poker" },
  { name: "ActionCardz", brand: "ActionCardz" },
  { name: "Intertops", brand: "Intertops" },
  { name: "Everygame", brand: "Everygame" },
  { name: "Pokerking", brand: "Pokerking" },
  { name: "JackPoker", brand: "Jack Poker" },
  { name: "Sportdbetting Poker", brand: "Sportsbetting.ag" },
];

const IRL_POKER_ROOMS = [
  // bestbet locations
  { name: "bestbet Jacksonville", city: "Jacksonville", state: "FL", country: "United States" },
  { name: "bestbet Orange Park", city: "Orange Park", state: "FL", country: "United States" },
  { name: "bestbet St. Augustine", city: "St. Augustine", state: "FL", country: "United States" },
];

async function main() {
  console.log("🎰 Seeding poker providers...");

  // Seed online poker sites
  console.log("\n📡 Adding online poker sites...");
  for (const site of ONLINE_POKER_SITES) {
    const existing = await prisma.pokerRoom.findFirst({
      where: { name: site.name },
    });

    if (existing) {
      console.log(`  ✓ ${site.name} already exists`);
      continue;
    }

    await prisma.pokerRoom.create({
      data: {
        name: site.name,
        brand: site.brand,
        city: "Online",
        country: "Online",
        latitude: null,
        longitude: null,
        timezone: "UTC",
        website: null,
        phone: null,
      },
    });

    console.log(`  + ${site.name} added`);
  }

  // Seed IRL poker rooms
  console.log("\n🏛️  Adding IRL poker rooms...");
  for (const room of IRL_POKER_ROOMS) {
    const existing = await prisma.pokerRoom.findFirst({
      where: { name: room.name },
    });

    if (existing) {
      console.log(`  ✓ ${room.name} already exists`);
      continue;
    }

    await prisma.pokerRoom.create({
      data: {
        name: room.name,
        city: room.city,
        state: room.state,
        country: room.country,
        latitude: null,
        longitude: null,
      },
    });

    console.log(`  + ${room.name} added`);
  }

  // Stats
  const totalRooms = await prisma.pokerRoom.count();
  const onlineRooms = await prisma.pokerRoom.count({
    where: { country: "Online" },
  });
  const irlRooms = totalRooms - onlineRooms;

  console.log("\n✅ Seeding complete!");
  console.log(`\n📊 Database stats:`);
  console.log(`   Total poker rooms: ${totalRooms}`);
  console.log(`   Online sites: ${onlineRooms}`);
  console.log(`   IRL rooms: ${irlRooms}`);
}

main()
  .catch((error) => {
    console.error("❌ Seeding failed:", error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
