// scripts/seed-poker-sites.ts

import { PrismaClient } from '@prisma/client';
import { createRoom } from '../lib/services/rooms';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  const pokerSitesFilePath = path.join(__dirname, 'poker-sites.txt');
  const pokerSites = fs.readFileSync(pokerSitesFilePath, 'utf-8').split('\n');

  for (const siteName of pokerSites) {
    if (siteName.trim() === '') {
      continue;
    }

    // Check if the room already exists
    const existingRoom = await prisma.pokerRoom.findFirst({
      where: { name: siteName.trim() },
    });

    if (!existingRoom) {
      await createRoom({
        name: siteName.trim(),
        city: 'Online',
        country: 'Online',
      });
      console.log(`Created poker room: ${siteName.trim()}`);
    } else {
      console.log(`Poker room already exists: ${siteName.trim()}`);
    }
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
