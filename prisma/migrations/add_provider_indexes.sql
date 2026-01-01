-- Add indexes for improved provider query performance

-- Index for filtering tournaments by start time
CREATE INDEX IF NOT EXISTS "Tournament_startTime_idx" ON "Tournament"("startTime");

-- Index for filtering tournaments by buy-in amount
CREATE INDEX IF NOT EXISTS "Tournament_buyinAmount_idx" ON "Tournament"("buyinAmount");

-- Composite index for tournament queries with poker room
CREATE INDEX IF NOT EXISTS "Tournament_pokerRoom_startTime_idx" ON "Tournament"("gameId", "startTime");

-- Index for cash game queries by blinds
CREATE INDEX IF NOT EXISTS "CashGame_blinds_idx" ON "CashGame"("smallBlind", "bigBlind");

-- Index for poker room city/country filtering (already exists but ensure it)
-- @@index([city, country]) - already in schema

-- Index for games by type and room
-- @@index([pokerRoomId, gameType]) - already in schema

-- Index for fast lookups of online vs offline rooms
CREATE INDEX IF NOT EXISTS "PokerRoom_country_idx" ON "PokerRoom"("country");

-- Index for recent tournaments (commonly queried)
CREATE INDEX IF NOT EXISTS "Tournament_startTime_buyinAmount_idx" ON "Tournament"("startTime", "buyinAmount");

-- Index for variant filtering
CREATE INDEX IF NOT EXISTS "Game_variant_idx" ON "Game"("variant");

-- Composite index for common game queries
CREATE INDEX IF NOT EXISTS "Game_pokerRoomId_gameType_variant_idx" ON "Game"("pokerRoomId", "gameType", "variant");
