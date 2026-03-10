// prisma/seed-clubgg.ts
// Seeds ClubGG as a poker room for the LocalVM provider

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  // Check if ClubGG already exists
  const existing = await prisma.pokerRoom.findFirst({
    where: {
      name: { contains: "ClubGG", mode: "insensitive" },
    },
  });

  if (existing) {
    console.log("ClubGG poker room already exists:", existing.id);
    return existing;
  }

  // Create ClubGG as an online poker room
  const clubgg = await prisma.pokerRoom.create({
    data: {
      name: "ClubGG",
      brand: "GGPoker Network",
      city: "Online",
      country: "Global",
      website: "https://www.clubgg.com",
      imageUrl: null,
      logoUrl: null,
    },
  });

  console.log("Created ClubGG poker room:", clubgg.id);
  return clubgg;
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
