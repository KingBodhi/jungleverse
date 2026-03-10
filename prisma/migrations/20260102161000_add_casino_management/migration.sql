-- Add CASINO role
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'Role') THEN
    RAISE NOTICE 'Role enum missing';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'CASINO' AND enumtypid = (
    SELECT oid FROM pg_type WHERE typname = 'Role'
  )) THEN
    ALTER TYPE "Role" ADD VALUE 'CASINO';
  END IF;
END$$;

-- Extend PokerRoom media/source fields
ALTER TABLE "PokerRoom"
  ADD COLUMN IF NOT EXISTS "logoUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "heroImageUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "cashSourceUrl" TEXT,
  ADD COLUMN IF NOT EXISTS "tournamentSourceUrl" TEXT;

-- Allow linking users to a managed poker room
ALTER TABLE "User"
  ADD COLUMN IF NOT EXISTS "managedPokerRoomId" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.table_constraints
    WHERE constraint_name = 'User_managedPokerRoomId_fkey'
  ) THEN
    ALTER TABLE "User"
      ADD CONSTRAINT "User_managedPokerRoomId_fkey"
      FOREIGN KEY ("managedPokerRoomId") REFERENCES "PokerRoom"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END$$;
