-- CreateEnum
CREATE TYPE "Provider" AS ENUM ('POKERSTARS', 'GG_POKER', 'POKER_888', 'PARTY_POKER', 'WPT_GLOBAL', 'WSOP_ONLINE', 'LIVE_ROLL', 'OTHER');

-- CreateEnum
CREATE TYPE "TransactionType" AS ENUM ('DEPOSIT', 'WITHDRAWAL', 'TRANSFER_IN', 'TRANSFER_OUT', 'SESSION_BUYIN', 'SESSION_CASHOUT', 'BONUS', 'RAKEBACK');

-- CreateTable
CREATE TABLE "BankrollAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "Provider" NOT NULL,
    "nickname" TEXT,
    "balance" INTEGER NOT NULL DEFAULT 0,
    "depositTolerance" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'USD',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSyncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BankrollAccount_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameSession" (
    "id" TEXT NOT NULL,
    "bankrollAccountId" TEXT NOT NULL,
    "sessionType" "GameType" NOT NULL,
    "variant" "GameVariant" NOT NULL DEFAULT 'NLHE',
    "buyIn" INTEGER NOT NULL,
    "cashOut" INTEGER NOT NULL DEFAULT 0,
    "result" INTEGER NOT NULL DEFAULT 0,
    "stakesDescription" TEXT,
    "venueName" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "endedAt" TIMESTAMP(3),
    "durationMinutes" INTEGER,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "GameSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BankrollTransaction" (
    "id" TEXT NOT NULL,
    "bankrollAccountId" TEXT NOT NULL,
    "type" "TransactionType" NOT NULL,
    "amount" INTEGER NOT NULL,
    "balanceAfter" INTEGER NOT NULL,
    "sessionId" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BankrollTransaction_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BankrollAccount_userId_idx" ON "BankrollAccount"("userId");

-- CreateIndex
CREATE INDEX "BankrollAccount_provider_idx" ON "BankrollAccount"("provider");

-- CreateIndex
CREATE UNIQUE INDEX "BankrollAccount_userId_provider_key" ON "BankrollAccount"("userId", "provider");

-- CreateIndex
CREATE INDEX "GameSession_bankrollAccountId_idx" ON "GameSession"("bankrollAccountId");

-- CreateIndex
CREATE INDEX "GameSession_startedAt_idx" ON "GameSession"("startedAt");

-- CreateIndex
CREATE INDEX "GameSession_sessionType_idx" ON "GameSession"("sessionType");

-- CreateIndex
CREATE INDEX "BankrollTransaction_bankrollAccountId_idx" ON "BankrollTransaction"("bankrollAccountId");

-- CreateIndex
CREATE INDEX "BankrollTransaction_createdAt_idx" ON "BankrollTransaction"("createdAt");

-- CreateIndex
CREATE INDEX "BankrollTransaction_type_idx" ON "BankrollTransaction"("type");

-- AddForeignKey
ALTER TABLE "BankrollAccount" ADD CONSTRAINT "BankrollAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameSession" ADD CONSTRAINT "GameSession_bankrollAccountId_fkey" FOREIGN KEY ("bankrollAccountId") REFERENCES "BankrollAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankrollTransaction" ADD CONSTRAINT "BankrollTransaction_bankrollAccountId_fkey" FOREIGN KEY ("bankrollAccountId") REFERENCES "BankrollAccount"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BankrollTransaction" ADD CONSTRAINT "BankrollTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "GameSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
