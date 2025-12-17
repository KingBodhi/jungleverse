-- CreateEnum
CREATE TYPE "GameType" AS ENUM ('CASH', 'TOURNAMENT');

-- CreateEnum
CREATE TYPE "GameVariant" AS ENUM ('NLHE', 'PLO', 'PLO5', 'MIXED', 'OTHER');

-- CreateTable
CREATE TABLE "Account" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "refresh_token" TEXT,
    "access_token" TEXT,
    "expires_at" INTEGER,
    "token_type" TEXT,
    "scope" TEXT,
    "id_token" TEXT,
    "session_state" TEXT,

    CONSTRAINT "Account_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Session" (
    "id" TEXT NOT NULL,
    "sessionToken" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Session_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VerificationToken" (
    "identifier" TEXT NOT NULL,
    "token" TEXT NOT NULL,
    "expires" TIMESTAMP(3) NOT NULL
);

-- CreateTable
CREATE TABLE "PokerRoom" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "brand" TEXT,
    "address" TEXT,
    "city" TEXT NOT NULL,
    "state" TEXT,
    "country" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "timezone" TEXT,
    "website" TEXT,
    "phone" TEXT,
    "hoursJson" JSONB,
    "hasFood" BOOLEAN NOT NULL DEFAULT false,
    "hasHotel" BOOLEAN NOT NULL DEFAULT false,
    "hasParking" BOOLEAN NOT NULL DEFAULT false,
    "currentPromo" TEXT,
    "promoExpiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PokerRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" TEXT NOT NULL,
    "pokerRoomId" TEXT NOT NULL,
    "gameType" "GameType" NOT NULL,
    "variant" "GameVariant" NOT NULL DEFAULT 'NLHE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashGame" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "smallBlind" INTEGER NOT NULL,
    "bigBlind" INTEGER NOT NULL,
    "minBuyin" INTEGER NOT NULL,
    "maxBuyin" INTEGER NOT NULL,
    "usualDaysOfWeek" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "usualHours" JSONB,
    "notes" TEXT,
    "rakeCap" INTEGER,
    "rakePercentage" DOUBLE PRECISION,
    "rakeDescription" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Tournament" (
    "id" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "startTime" TIMESTAMP(3) NOT NULL,
    "buyinAmount" INTEGER NOT NULL,
    "rakeAmount" INTEGER,
    "startingStack" INTEGER NOT NULL,
    "blindLevelMinutes" INTEGER NOT NULL,
    "reentryPolicy" TEXT,
    "bountyAmount" INTEGER,
    "recurringRule" TEXT,
    "estimatedPrizePool" INTEGER,
    "typicalFieldSize" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Tournament_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "name" TEXT,
    "image" TEXT,
    "emailVerified" TIMESTAMP(3),
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "hashedPassword" TEXT,
    "homeLat" DOUBLE PRECISION,
    "homeLng" DOUBLE PRECISION,
    "bankrollProfile" TEXT,
    "riskTolerance" TEXT,
    "preferredStakesMin" INTEGER,
    "preferredStakesMax" INTEGER,
    "maxTravelDistance" INTEGER,
    "preferredStartTimes" JSONB,
    "distanceWeight" DOUBLE PRECISION DEFAULT 0.3,
    "bankrollWeight" DOUBLE PRECISION DEFAULT 0.25,
    "preferenceWeight" DOUBLE PRECISION DEFAULT 0.45,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FavoriteRoom" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "pokerRoomId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FavoriteRoom_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "UserPreferenceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "gameId" TEXT NOT NULL,
    "preferenceScore" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserPreferenceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Account_userId_idx" ON "Account"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "Account_provider_providerAccountId_key" ON "Account"("provider", "providerAccountId");

-- CreateIndex
CREATE UNIQUE INDEX "Session_sessionToken_key" ON "Session"("sessionToken");

-- CreateIndex
CREATE INDEX "Session_userId_idx" ON "Session"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_token_key" ON "VerificationToken"("token");

-- CreateIndex
CREATE UNIQUE INDEX "VerificationToken_identifier_token_key" ON "VerificationToken"("identifier", "token");

-- CreateIndex
CREATE INDEX "PokerRoom_city_country_idx" ON "PokerRoom"("city", "country");

-- CreateIndex
CREATE INDEX "PokerRoom_latitude_longitude_idx" ON "PokerRoom"("latitude", "longitude");

-- CreateIndex
CREATE INDEX "Game_gameType_idx" ON "Game"("gameType");

-- CreateIndex
CREATE INDEX "Game_pokerRoomId_gameType_idx" ON "Game"("pokerRoomId", "gameType");

-- CreateIndex
CREATE UNIQUE INDEX "CashGame_gameId_key" ON "CashGame"("gameId");

-- CreateIndex
CREATE UNIQUE INDEX "Tournament_gameId_key" ON "Tournament"("gameId");

-- CreateIndex
CREATE INDEX "Tournament_startTime_idx" ON "Tournament"("startTime");

-- CreateIndex
CREATE INDEX "Tournament_buyinAmount_idx" ON "Tournament"("buyinAmount");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE INDEX "FavoriteRoom_userId_idx" ON "FavoriteRoom"("userId");

-- CreateIndex
CREATE INDEX "FavoriteRoom_pokerRoomId_idx" ON "FavoriteRoom"("pokerRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "FavoriteRoom_userId_pokerRoomId_key" ON "FavoriteRoom"("userId", "pokerRoomId");

-- CreateIndex
CREATE UNIQUE INDEX "UserPreferenceSnapshot_userId_gameId_key" ON "UserPreferenceSnapshot"("userId", "gameId");

-- AddForeignKey
ALTER TABLE "Account" ADD CONSTRAINT "Account_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Session" ADD CONSTRAINT "Session_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_pokerRoomId_fkey" FOREIGN KEY ("pokerRoomId") REFERENCES "PokerRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashGame" ADD CONSTRAINT "CashGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Tournament" ADD CONSTRAINT "Tournament_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteRoom" ADD CONSTRAINT "FavoriteRoom_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FavoriteRoom" ADD CONSTRAINT "FavoriteRoom_pokerRoomId_fkey" FOREIGN KEY ("pokerRoomId") REFERENCES "PokerRoom"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferenceSnapshot" ADD CONSTRAINT "UserPreferenceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserPreferenceSnapshot" ADD CONSTRAINT "UserPreferenceSnapshot_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;
